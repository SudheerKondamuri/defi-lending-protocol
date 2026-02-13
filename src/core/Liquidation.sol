//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LendingPool.sol";
import "../interfaces/IERC20.sol";
import "../libraries/Constants.sol";

/**
 * @title Liquidation
 * @notice Handles liquidation of undercollateralized positions
 */
contract Liquidation {
    LendingPool public immutable lendingPool;
    IERC20 public immutable asset;

    uint256 public constant LIQUIDATION_BONUS = 5; // 5% bonus
    uint256 public constant MAX_LIQUIDATION_DISCOUNT = 10; // 10% max discount

    // Events
    event Liquidated(
        address indexed liquidator,
        address indexed borrower,
        uint256 debtRepaid,
        uint256 collateralSeized
    );
    event PartialLiquidation(
        address indexed liquidator,
        address indexed borrower,
        uint256 debtRepaid,
        uint256 collateralSeized
    );

    constructor(address _lendingPool) {
        require(_lendingPool != address(0), "Invalid pool address");
        lendingPool = LendingPool(_lendingPool);
        asset = IERC20(lendingPool.asset());
    }

    /**
     * @notice Liquidate an undercollateralized position
     * @param borrower Address of the borrower to liquidate
     * @param debtToCover Amount of debt to repay
     */
    function liquidate(address borrower, uint256 debtToCover) external {
        require(borrower != address(0), "Invalid borrower");
        require(debtToCover > 0, "Debt must be > 0");
        require(lendingPool.isLiquidatable(borrower), "Position is healthy");

        // Get borrower's account info
        (uint256 collateralAmount, uint256 borrowAmount, ) = lendingPool
            .accounts(borrower);

        require(borrowAmount > 0, "No debt to liquidate");
        require(
            debtToCover <= borrowAmount,
            "Debt to cover exceeds total debt"
        );

        // Calculate collateral to seize
        uint256 collateralToSeize = calculateCollateralToSeize(
            debtToCover,
            borrower
        );
        require(
            collateralToSeize <= collateralAmount,
            "Insufficient collateral"
        );

        // Transfer repayment from liquidator
        require(
            asset.transferFrom(msg.sender, address(lendingPool), debtToCover),
            "Transfer failed"
        );

        // Execute liquidation through lending pool
        _executeLiquidation(borrower, debtToCover, collateralToSeize);

        // Transfer seized collateral to liquidator with bonus
        uint256 bonusAmount = (collateralToSeize * LIQUIDATION_BONUS) / 100;
        uint256 totalCollateral = collateralToSeize + bonusAmount;

        if (totalCollateral > collateralAmount) {
            totalCollateral = collateralAmount;
        }

        require(asset.transfer(msg.sender, totalCollateral), "Transfer failed");

        emit Liquidated(msg.sender, borrower, debtToCover, totalCollateral);
    }

    /**
     * @notice Partially liquidate a position
     * @param borrower Address of the borrower
     * @param percentage Percentage of debt to liquidate (0-100)
     */
    function partialLiquidate(address borrower, uint256 percentage) external {
        require(borrower != address(0), "Invalid borrower");
        require(percentage > 0 && percentage <= 50, "Invalid percentage"); // Max 50% at a time
        require(lendingPool.isLiquidatable(borrower), "Position is healthy");

        (uint256 collateralAmount, uint256 borrowAmount, ) = lendingPool
            .accounts(borrower);
        require(borrowAmount > 0, "No debt to liquidate");

        uint256 debtToCover = (borrowAmount * percentage) / 100;
        uint256 collateralToSeize = calculateCollateralToSeize(
            debtToCover,
            borrower
        );

        require(
            collateralToSeize <= collateralAmount,
            "Insufficient collateral"
        );

        // Transfer repayment from liquidator
        require(
            asset.transferFrom(msg.sender, address(lendingPool), debtToCover),
            "Transfer failed"
        );

        _executeLiquidation(borrower, debtToCover, collateralToSeize);

        // Transfer seized collateral with bonus
        uint256 bonusAmount = (collateralToSeize * LIQUIDATION_BONUS) / 100;
        uint256 totalCollateral = collateralToSeize + bonusAmount;

        require(asset.transfer(msg.sender, totalCollateral), "Transfer failed");

        emit PartialLiquidation(
            msg.sender,
            borrower,
            debtToCover,
            totalCollateral
        );
    }

    /**
     * @notice Calculate collateral to seize for a given debt amount
     * @param debtAmount Amount of debt being repaid
     * @param borrower Address of the borrower
     * @return uint256 Amount of collateral to seize
     */
    function calculateCollateralToSeize(
        uint256 debtAmount,
        address borrower
    ) public view returns (uint256) {
        uint256 price = lendingPool.oracle().getPrice(address(asset));
        require(price > 0, "Invalid price");

        // Calculate base collateral amount
        uint256 collateralValue = (debtAmount * Constants.PRECISION) / price;

        // Add liquidation bonus
        uint256 bonus = (collateralValue * LIQUIDATION_BONUS) / 100;

        return collateralValue + bonus;
    }

    /**
     * @notice Execute the liquidation by updating pool state
     * @param borrower Address of the borrower
     * @param debtToCover Amount of debt being repaid
     * @param collateralToSeize Amount of collateral to seize
     */
    function _executeLiquidation(
        address borrower,
        uint256 debtToCover,
        uint256 collateralToSeize
    ) internal {
        // Note: This would need to call into the lending pool to update state
        // For now, this is a simplified implementation
        // In production, you'd need proper state management functions in LendingPool
    }

    /**
     * @notice Check if a liquidation is profitable
     * @param borrower Address to check
     * @param debtToCover Amount of debt to cover
     * @return bool True if profitable
     */
    function isLiquidationProfitable(
        address borrower,
        uint256 debtToCover
    ) external view returns (bool) {
        if (!lendingPool.isLiquidatable(borrower)) {
            return false;
        }

        uint256 collateralToSeize = calculateCollateralToSeize(
            debtToCover,
            borrower
        );
        (uint256 collateralAmount, , ) = lendingPool.accounts(borrower);

        return collateralToSeize <= collateralAmount;
    }

    /**
     * @notice Get maximum liquidatable debt for a position
     * @param borrower Address of the borrower
     * @return uint256 Maximum debt that can be liquidated
     */
    function getMaxLiquidatableDebt(
        address borrower
    ) external view returns (uint256) {
        (, uint256 borrowAmount, ) = lendingPool.accounts(borrower);

        if (!lendingPool.isLiquidatable(borrower)) {
            return 0;
        }

        // Allow up to 50% of debt to be liquidated at once
        return borrowAmount / 2;
    }

    /**
     * @notice Calculate liquidation health score
     * @param borrower Address to check
     * @return uint256 Health score (0-100, lower is worse)
     */
    function getLiquidationHealthScore(
        address borrower
    ) external view returns (uint256) {
        uint256 collateralValue = lendingPool.getCollateralValue(borrower);
        uint256 borrowValue = lendingPool.getBorrowValue(borrower);

        if (borrowValue == 0) {
            return 100;
        }

        uint256 ratio = (collateralValue * 100) / borrowValue;

        if (ratio >= 150) {
            return 100; // Healthy
        } else if (ratio >= 120) {
            return 50; // Warning zone
        } else {
            return 0; // Liquidatable
        }
    }
}
