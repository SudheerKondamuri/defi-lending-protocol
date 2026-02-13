//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "../interfaces/IERC20.sol";
import "../interfaces/IPriceOracle.sol";
import "../libraries/Constants.sol";
import "../libraries/Math.sol";

/**
 * @title LendingPool
 * @notice Core lending pool contract that handles deposits, borrows, and interest calculations
 */
contract LendingPool {
    using Math for uint256;

    struct UserAccount {
        uint256 collateralAmount;
        uint256 borrowAmount;
        uint256 lastUpdateTimestamp;
    }

    struct PoolState {
        uint256 totalDeposits;
        uint256 totalBorrows;
        uint256 totalReserves;
        uint256 interestRate;
        uint256 lastUpdateTimestamp;
    }

    // State variables
    IERC20 public immutable asset;
    IPriceOracle public oracle;
    PoolState public poolState;

    mapping(address => UserAccount) public accounts;
    mapping(address => uint256) public deposits;

    uint256 public constant COLLATERAL_RATIO = 150; // 150% collateralization
    uint256 public constant LIQUIDATION_THRESHOLD = 120; // 120% liquidation threshold
    uint256 public constant LIQUIDATION_BONUS = 5; // 5% bonus

    // Events
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Borrow(address indexed user, uint256 amount);
    event Repay(address indexed user, uint256 amount);
    event CollateralDeposited(address indexed user, uint256 amount);
    event CollateralWithdrawn(address indexed user, uint256 amount);
    event InterestAccrued(uint256 totalInterest);

    constructor(address _asset, address _oracle) {
        require(_asset != address(0), "Invalid asset");
        require(_oracle != address(0), "Invalid oracle");

        asset = IERC20(_asset);
        oracle = IPriceOracle(_oracle);
        poolState.lastUpdateTimestamp = block.timestamp;
        poolState.interestRate = Constants.BASE_INTEREST_RATE;
    }

    /**
     * @notice Deposit assets into the pool
     * @param amount Amount to deposit
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");

        accrueInterest();

        require(
            asset.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        deposits[msg.sender] += amount;
        poolState.totalDeposits += amount;

        emit Deposit(msg.sender, amount);
    }

    /**
     * @notice Withdraw assets from the pool
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(deposits[msg.sender] >= amount, "Insufficient balance");

        accrueInterest();

        deposits[msg.sender] -= amount;
        poolState.totalDeposits -= amount;

        require(asset.transfer(msg.sender, amount), "Transfer failed");

        emit Withdraw(msg.sender, amount);
    }

    /**
     * @notice Deposit collateral
     * @param amount Amount of collateral to deposit
     */
    function depositCollateral(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");

        require(
            asset.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        accounts[msg.sender].collateralAmount += amount;
        accounts[msg.sender].lastUpdateTimestamp = block.timestamp;

        emit CollateralDeposited(msg.sender, amount);
    }

    /**
     * @notice Withdraw collateral
     * @param amount Amount of collateral to withdraw
     */
    function withdrawCollateral(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");

        UserAccount storage account = accounts[msg.sender];
        require(account.collateralAmount >= amount, "Insufficient collateral");

        account.collateralAmount -= amount;

        // Check health factor after withdrawal
        require(isHealthy(msg.sender), "Unhealthy position");

        require(asset.transfer(msg.sender, amount), "Transfer failed");

        emit CollateralWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Borrow assets against collateral
     * @param amount Amount to borrow
     */
    function borrow(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(
            poolState.totalDeposits >= poolState.totalBorrows + amount,
            "Insufficient liquidity"
        );

        accrueInterest();

        UserAccount storage account = accounts[msg.sender];
        account.borrowAmount += amount;
        account.lastUpdateTimestamp = block.timestamp;

        poolState.totalBorrows += amount;

        require(isHealthy(msg.sender), "Insufficient collateral");

        require(asset.transfer(msg.sender, amount), "Transfer failed");

        emit Borrow(msg.sender, amount);
    }

    /**
     * @notice Repay borrowed assets
     * @param amount Amount to repay
     */
    function repay(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");

        accrueInterest();

        UserAccount storage account = accounts[msg.sender];
        require(account.borrowAmount >= amount, "Repay amount exceeds debt");

        require(
            asset.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        account.borrowAmount -= amount;
        poolState.totalBorrows -= amount;

        emit Repay(msg.sender, amount);
    }

    /**
     * @notice Accrue interest on borrows
     */
    function accrueInterest() public {
        uint256 timeElapsed = block.timestamp - poolState.lastUpdateTimestamp;

        if (timeElapsed > 0 && poolState.totalBorrows > 0) {
            uint256 interestAccrued = (poolState.totalBorrows *
                poolState.interestRate *
                timeElapsed) /
                (Constants.SECONDS_PER_YEAR * Constants.PRECISION);

            poolState.totalBorrows += interestAccrued;
            poolState.totalReserves += interestAccrued / 10; // 10% to reserves
            poolState.lastUpdateTimestamp = block.timestamp;

            emit InterestAccrued(interestAccrued);
        } else {
            poolState.lastUpdateTimestamp = block.timestamp;
        }

        updateInterestRate();
    }

    /**
     * @notice Update interest rate based on utilization
     */
    function updateInterestRate() internal {
        if (poolState.totalDeposits == 0) {
            poolState.interestRate = Constants.BASE_INTEREST_RATE;
            return;
        }

        uint256 utilizationRate = (poolState.totalBorrows *
            Constants.PRECISION) / poolState.totalDeposits;

        if (utilizationRate <= Constants.OPTIMAL_UTILIZATION) {
            poolState.interestRate =
                Constants.BASE_INTEREST_RATE +
                (utilizationRate * Constants.SLOPE1) /
                Constants.PRECISION;
        } else {
            uint256 excessUtilization = utilizationRate -
                Constants.OPTIMAL_UTILIZATION;
            poolState.interestRate =
                Constants.BASE_INTEREST_RATE +
                (Constants.OPTIMAL_UTILIZATION * Constants.SLOPE1) /
                Constants.PRECISION +
                (excessUtilization * Constants.SLOPE2) /
                Constants.PRECISION;
        }
    }

    /**
     * @notice Check if a position is healthy
     * @param user Address to check
     * @return bool True if healthy
     */
    function isHealthy(address user) public view returns (bool) {
        UserAccount memory account = accounts[user];

        if (account.borrowAmount == 0) {
            return true;
        }

        uint256 collateralValue = getCollateralValue(user);
        uint256 borrowValue = getBorrowValue(user);

        return collateralValue * 100 >= borrowValue * COLLATERAL_RATIO;
    }

    /**
     * @notice Check if a position can be liquidated
     * @param user Address to check
     * @return bool True if liquidatable
     */
    function isLiquidatable(address user) public view returns (bool) {
        UserAccount memory account = accounts[user];

        if (account.borrowAmount == 0) {
            return false;
        }

        uint256 collateralValue = getCollateralValue(user);
        uint256 borrowValue = getBorrowValue(user);

        return collateralValue * 100 < borrowValue * LIQUIDATION_THRESHOLD;
    }

    /**
     * @notice Get collateral value in USD
     * @param user User address
     * @return uint256 Collateral value
     */
    function getCollateralValue(address user) public view returns (uint256) {
        uint256 collateralAmount = accounts[user].collateralAmount;
        uint256 price = oracle.getPrice(address(asset));
        return (collateralAmount * price) / Constants.PRECISION;
    }

    /**
     * @notice Get borrow value in USD
     * @param user User address
     * @return uint256 Borrow value
     */
    function getBorrowValue(address user) public view returns (uint256) {
        uint256 borrowAmount = accounts[user].borrowAmount;
        uint256 price = oracle.getPrice(address(asset));
        return (borrowAmount * price) / Constants.PRECISION;
    }

    /**
     * @notice Get health factor for a user
     * @param user User address
     * @return uint256 Health factor (scaled by PRECISION)
     */
    function getHealthFactor(address user) external view returns (uint256) {
        uint256 borrowValue = getBorrowValue(user);

        if (borrowValue == 0) {
            return type(uint256).max;
        }

        uint256 collateralValue = getCollateralValue(user);
        return (collateralValue * Constants.PRECISION) / borrowValue;
    }

    /**
     * @notice Get utilization rate
     * @return uint256 Utilization rate (scaled by PRECISION)
     */
    function getUtilizationRate() external view returns (uint256) {
        if (poolState.totalDeposits == 0) {
            return 0;
        }
        return
            (poolState.totalBorrows * Constants.PRECISION) /
            poolState.totalDeposits;
    }

    /**
     * @notice Update oracle address (admin function)
     * @param _oracle New oracle address
     */
    function setOracle(address _oracle) external {
        require(_oracle != address(0), "Invalid oracle");
        oracle = IPriceOracle(_oracle);
    }
}
