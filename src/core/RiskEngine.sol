//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LendingPool.sol";
import "../interfaces/IPriceOracle.sol";
import "../libraries/Constants.sol";
import "../libraries/Math.sol";

/**
 * @title RiskEngine
 * @notice Advanced risk assessment and management for the lending protocol
 */
contract RiskEngine {
    using Math for uint256;

    LendingPool public immutable lendingPool;
    IPriceOracle public oracle;

    struct RiskParameters {
        uint256 maxLTV; // Maximum Loan-to-Value ratio
        uint256 liquidationThreshold;
        uint256 liquidationPenalty;
        uint256 volatilityIndex; // 0-100 scale
        bool isActive;
    }

    struct UserRiskProfile {
        uint256 riskScore; // 0-1000 scale
        uint256 borrowingPower;
        uint256 lastAssessment;
        bool restricted;
    }

    // Mappings
    mapping(address => RiskParameters) public assetRiskParams;
    mapping(address => UserRiskProfile) public userProfiles;

    // Risk thresholds
    uint256 public constant HIGH_RISK_THRESHOLD = 750;
    uint256 public constant MEDIUM_RISK_THRESHOLD = 500;
    uint256 public constant LOW_RISK_THRESHOLD = 250;

    // Events
    event RiskParametersUpdated(address indexed asset, RiskParameters params);
    event RiskAssessmentCompleted(address indexed user, uint256 riskScore);
    event UserRestricted(address indexed user, string reason);
    event UserUnrestricted(address indexed user);
    event VolatilityAlertTriggered(
        address indexed asset,
        uint256 volatilityIndex
    );

    constructor(address _lendingPool, address _oracle) {
        require(_lendingPool != address(0), "Invalid pool");
        require(_oracle != address(0), "Invalid oracle");

        lendingPool = LendingPool(_lendingPool);
        oracle = IPriceOracle(_oracle);
    }

    /**
     * @notice Assess risk for a user's position
     * @param user Address to assess
     * @return uint256 Risk score (0-1000)
     */
    function assessUserRisk(address user) external returns (uint256) {
        uint256 healthFactor = lendingPool.getHealthFactor(user);
        uint256 utilizationRate = lendingPool.getUtilizationRate();

        // Calculate base risk score
        uint256 riskScore = calculateRiskScore(
            user,
            healthFactor,
            utilizationRate
        );

        // Update user profile
        UserRiskProfile storage profile = userProfiles[user];
        profile.riskScore = riskScore;
        profile.lastAssessment = block.timestamp;
        profile.borrowingPower = calculateBorrowingPower(user, riskScore);

        // Check if user should be restricted
        if (riskScore >= HIGH_RISK_THRESHOLD && !profile.restricted) {
            profile.restricted = true;
            emit UserRestricted(user, "High risk score");
        } else if (riskScore < MEDIUM_RISK_THRESHOLD && profile.restricted) {
            profile.restricted = false;
            emit UserUnrestricted(user);
        }

        emit RiskAssessmentCompleted(user, riskScore);
        return riskScore;
    }

    /**
     * @notice Calculate risk score for a user
     * @param user User address
     * @param healthFactor User's health factor
     * @param utilizationRate Pool utilization rate
     * @return uint256 Risk score
     */
    function calculateRiskScore(
        address user,
        uint256 healthFactor,
        uint256 utilizationRate
    ) public view returns (uint256) {
        uint256 score = 0;

        // Health factor component (40% weight)
        if (healthFactor < (Constants.PRECISION * 120) / 100) {
            score += 400; // Critical
        } else if (healthFactor < (Constants.PRECISION * 150) / 100) {
            score += 300; // High risk
        } else if (healthFactor < (Constants.PRECISION * 200) / 100) {
            score += 200; // Medium risk
        } else {
            score += 100; // Low risk
        }

        // Utilization component (30% weight)
        if (utilizationRate > (90 * Constants.PRECISION) / 100) {
            score += 300;
        } else if (utilizationRate > (80 * Constants.PRECISION) / 100) {
            score += 200;
        } else if (utilizationRate > (70 * Constants.PRECISION) / 100) {
            score += 100;
        }

        // Borrow size component (30% weight)
        uint256 borrowValue = lendingPool.getBorrowValue(user);
        if (borrowValue > 1000000 * Constants.PRECISION) {
            score += 300; // Large position
        } else if (borrowValue > 100000 * Constants.PRECISION) {
            score += 200; // Medium position
        } else {
            score += 100; // Small position
        }

        return score;
    }

    /**
     * @notice Calculate borrowing power for a user
     * @param user User address
     * @param riskScore User's risk score
     * @return uint256 Borrowing power
     */
    function calculateBorrowingPower(
        address user,
        uint256 riskScore
    ) public view returns (uint256) {
        uint256 collateralValue = lendingPool.getCollateralValue(user);

        // Reduce borrowing power based on risk score
        uint256 multiplier;
        if (riskScore < LOW_RISK_THRESHOLD) {
            multiplier = 80; // 80% of collateral
        } else if (riskScore < MEDIUM_RISK_THRESHOLD) {
            multiplier = 70; // 70% of collateral
        } else if (riskScore < HIGH_RISK_THRESHOLD) {
            multiplier = 60; // 60% of collateral
        } else {
            multiplier = 50; // 50% of collateral
        }

        return (collateralValue * multiplier) / 100;
    }

    /**
     * @notice Set risk parameters for an asset
     * @param asset Asset address
     * @param params Risk parameters
     */
    function setRiskParameters(
        address asset,
        RiskParameters calldata params
    ) external {
        require(asset != address(0), "Invalid asset");
        require(params.maxLTV <= 100, "Invalid LTV");
        require(params.liquidationThreshold <= 100, "Invalid threshold");

        assetRiskParams[asset] = params;

        emit RiskParametersUpdated(asset, params);
    }

    /**
     * @notice Check if a user can borrow
     * @param user User address
     * @param amount Amount to borrow
     * @return bool True if allowed
     */
    function canBorrow(
        address user,
        uint256 amount
    ) external view returns (bool) {
        UserRiskProfile memory profile = userProfiles[user];

        // Check if user is restricted
        if (profile.restricted) {
            return false;
        }

        // Check if within borrowing power
        uint256 currentBorrow = lendingPool.getBorrowValue(user);
        uint256 newTotalBorrow = currentBorrow + amount;

        return newTotalBorrow <= profile.borrowingPower;
    }

    /**
     * @notice Calculate Value at Risk (VaR) for a position
     * @param user User address
     * @param confidenceLevel Confidence level (90, 95, 99)
     * @return uint256 VaR amount
     */
    function calculateVaR(
        address user,
        uint256 confidenceLevel
    ) external view returns (uint256) {
        require(
            confidenceLevel == 90 ||
                confidenceLevel == 95 ||
                confidenceLevel == 99,
            "Invalid confidence level"
        );

        uint256 collateralValue = lendingPool.getCollateralValue(user);

        // Simplified VaR calculation
        // In production, use historical volatility data
        uint256 volatilityFactor;
        if (confidenceLevel == 90) {
            volatilityFactor = 13; // 13% for 90% confidence
        } else if (confidenceLevel == 95) {
            volatilityFactor = 16; // 16% for 95% confidence
        } else {
            volatilityFactor = 23; // 23% for 99% confidence
        }

        return (collateralValue * volatilityFactor) / 100;
    }

    /**
     * @notice Calculate expected shortfall (CVaR)
     * @param user User address
     * @return uint256 Expected shortfall
     */
    function calculateCVaR(address user) external view returns (uint256) {
        uint256 collateralValue = lendingPool.getCollateralValue(user);

        // Simplified CVaR (typically 20-30% for crypto)
        return (collateralValue * 25) / 100;
    }

    /**
     * @notice Monitor volatility for an asset
     * @param asset Asset address
     * @return uint256 Volatility index
     */
    function monitorVolatility(address asset) external returns (uint256) {
        // In production, calculate from historical price data
        // This is a simplified implementation
        uint256 volatilityIndex = 50; // Medium volatility

        RiskParameters storage params = assetRiskParams[asset];
        params.volatilityIndex = volatilityIndex;

        if (volatilityIndex > 75) {
            emit VolatilityAlertTriggered(asset, volatilityIndex);
        }

        return volatilityIndex;
    }

    /**
     * @notice Get comprehensive risk report for a user
     * @param user User address
     * @return score Risk score
     * @return healthFactor Health factor
     * @return borrowingPower Available borrowing power
     * @return isRestricted Whether user is restricted
     */
    function getRiskReport(
        address user
    )
        external
        view
        returns (
            uint256 score,
            uint256 healthFactor,
            uint256 borrowingPower,
            bool isRestricted
        )
    {
        UserRiskProfile memory profile = userProfiles[user];

        score = profile.riskScore;
        healthFactor = lendingPool.getHealthFactor(user);
        borrowingPower = profile.borrowingPower;
        isRestricted = profile.restricted;
    }

    /**
     * @notice Calculate stress test scenario
     * @param user User address
     * @param priceDropPercentage Simulated price drop %
     * @return bool Whether position survives stress test
     */
    function stressTest(
        address user,
        uint256 priceDropPercentage
    ) external view returns (bool) {
        require(priceDropPercentage <= 100, "Invalid percentage");

        uint256 collateralValue = lendingPool.getCollateralValue(user);
        uint256 borrowValue = lendingPool.getBorrowValue(user);

        // Simulate price drop
        uint256 stressedCollateral = (collateralValue *
            (100 - priceDropPercentage)) / 100;

        // Check if position would remain healthy
        return stressedCollateral * 100 >= borrowValue * 120;
    }

    /**
     * @notice Update oracle address
     * @param _oracle New oracle address
     */
    function setOracle(address _oracle) external {
        require(_oracle != address(0), "Invalid oracle");
        oracle = IPriceOracle(_oracle);
    }
}
