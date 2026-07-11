// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ILendingPool} from "../interfaces/ILendingPool.sol";
import {IInterestRateModel} from "../interfaces/IInterestRateModel.sol";
import {IPriceOracleRegistry} from "../interfaces/IPriceOracleRegistry.sol";

/// @title LendingPool
/// @author DeFi Lending Protocol
/// @notice Core lending pool supporting deposit, withdraw, borrow, repay, and liquidation.
/// @dev UUPS-upgradeable, uses CEI pattern, ReentrancyGuard, and OwnableUpgradeable.
///      All rate/ratio calculations use 18-decimal fixed point (WAD = 1e18).
contract LendingPool is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuard, ILendingPool {
    using SafeERC20 for IERC20;

    /* ------------------------------------------------------------------ */
    /*                              Constants                             */
    /* ------------------------------------------------------------------ */

    /// @dev 18-decimal fixed-point scaling factor (1.0).
    uint256 internal constant WAD = 1e18;

    /* ------------------------------------------------------------------ */
    /*                              Storage                               */
    /* ------------------------------------------------------------------ */

    /// @notice The oracle registry for fetching asset prices.
    IPriceOracleRegistry public oracle;

    /// @notice The interest rate model for computing borrow/supply rates.
    IInterestRateModel public interestRateModel;

    /// @notice List of all supported asset addresses.
    address[] public supportedAssets;

    /// @notice Asset address => configuration.
    mapping(address => AssetConfig) public assetConfigs;

    /// @dev Per-asset global market state.
    struct AssetData {
        uint256 totalDeposits;
        uint256 totalBorrows;
        uint256 totalReserves;
        uint256 borrowIndex; // Cumulative borrow index (WAD)
        uint256 lastUpdateTimestamp; // block.number of last accrual
    }

    /// @notice Asset address => global market data.
    mapping(address => AssetData) public assetData;

    /// @dev Per-user per-asset position.
    struct UserPosition {
        uint256 collateralBalance; // Deposited collateral amount (in token decimals)
        uint256 borrowBalance; // Principal borrow amount at time of borrow
        uint256 borrowIndex; // User's snapshot of the global borrowIndex
    }

    /// @notice User => asset => position data.
    mapping(address => mapping(address => UserPosition)) public userPositions;

    /* ------------------------------------------------------------------ */
    /*                            Constructor                             */
    /* ------------------------------------------------------------------ */

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /* ------------------------------------------------------------------ */
    /*                            Initializer                             */
    /* ------------------------------------------------------------------ */

    /// @notice Initializes the lending pool proxy.
    /// @param owner_ The owner/admin of the protocol.
    /// @param oracle_ The price oracle registry address.
    /// @param interestRateModel_ The interest rate model address.
    function initialize(address owner_, address oracle_, address interestRateModel_) external initializer {
        if (owner_ == address(0) || oracle_ == address(0) || interestRateModel_ == address(0)) {
            revert ZeroAddress();
        }

        __Ownable_init(owner_);

        oracle = IPriceOracleRegistry(oracle_);
        interestRateModel = IInterestRateModel(interestRateModel_);
    }

    /* ------------------------------------------------------------------ */
    /*                          Admin Functions                           */
    /* ------------------------------------------------------------------ */

    /// @inheritdoc ILendingPool
    function addAsset(address asset, AssetConfig calldata config) external onlyOwner {
        if (asset == address(0)) revert ZeroAddress();
        if (assetConfigs[asset].isActive) revert AssetNotSupported(asset); // Already exists

        assetConfigs[asset] = config;
        assetData[asset].borrowIndex = WAD; // Initialize borrow index to 1.0
        assetData[asset].lastUpdateTimestamp = block.number;
        supportedAssets.push(asset);

        emit AssetAdded(asset, config);
    }

    /// @inheritdoc ILendingPool
    function updateAssetConfig(address asset, AssetConfig calldata config) external onlyOwner {
        if (!assetConfigs[asset].isActive) revert AssetNotSupported(asset);

        assetConfigs[asset] = config;

        emit AssetConfigUpdated(asset, config);
    }

    /* ------------------------------------------------------------------ */
    /*                          Core Functions                            */
    /* ------------------------------------------------------------------ */

    /// @inheritdoc ILendingPool
    function deposit(address asset, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (!assetConfigs[asset].isActive) revert AssetNotSupported(asset);

        // Effects
        userPositions[msg.sender][asset].collateralBalance += amount;
        assetData[asset].totalDeposits += amount;

        emit Deposit(msg.sender, asset, amount);

        // Interactions
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @inheritdoc ILendingPool
    function withdraw(address asset, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (!assetConfigs[asset].isActive) revert AssetNotSupported(asset);

        UserPosition storage position = userPositions[msg.sender][asset];
        if (amount > position.collateralBalance) revert InsufficientCollateral();

        // Check available liquidity in the pool
        uint256 availableLiquidity = IERC20(asset).balanceOf(address(this));
        if (amount > availableLiquidity) revert InsufficientLiquidity();

        // Effects — update state before health check
        position.collateralBalance -= amount;
        assetData[asset].totalDeposits -= amount;

        // Check health factor after withdrawal
        uint256 hf = _calculateHealthFactor(msg.sender);
        if (hf < WAD) {
            revert HealthFactorTooLow();
        }

        emit Withdraw(msg.sender, asset, amount);

        // Interactions
        IERC20(asset).safeTransfer(msg.sender, amount);
    }

    /// @inheritdoc ILendingPool
    function borrow(address asset, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (!assetConfigs[asset].isActive) revert AssetNotSupported(asset);

        // Accrue interest first
        _accrueInterest(asset);

        // Check available liquidity
        uint256 availableLiquidity = IERC20(asset).balanceOf(address(this));
        if (amount > availableLiquidity) revert InsufficientLiquidity();

        AssetData storage data = assetData[asset];
        UserPosition storage position = userPositions[msg.sender][asset];

        // Effects — settle any existing debt at current index, then add new borrow
        uint256 existingDebt = _getUserDebt(msg.sender, asset);
        position.borrowBalance = existingDebt + amount;
        position.borrowIndex = data.borrowIndex;
        data.totalBorrows += amount;

        // Check health factor after borrow
        uint256 hf = _calculateHealthFactor(msg.sender);
        if (hf < WAD) {
            revert HealthFactorTooLow();
        }

        emit Borrow(msg.sender, asset, amount);

        // Interactions
        IERC20(asset).safeTransfer(msg.sender, amount);
    }

    /// @inheritdoc ILendingPool
    function repay(address asset, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (!assetConfigs[asset].isActive) revert AssetNotSupported(asset);

        // Accrue interest first
        _accrueInterest(asset);

        AssetData storage data = assetData[asset];
        UserPosition storage position = userPositions[msg.sender][asset];

        // Calculate actual debt
        uint256 actualDebt = _getUserDebt(msg.sender, asset);
        if (actualDebt == 0) revert InvalidAmount();

        // Cap repayment at actual debt
        uint256 repayAmount = amount > actualDebt ? actualDebt : amount;

        // Effects
        if (repayAmount >= actualDebt) {
            // Full repayment
            position.borrowBalance = 0;
            position.borrowIndex = 0;
        } else {
            // Partial repayment
            position.borrowBalance = actualDebt - repayAmount;
            position.borrowIndex = data.borrowIndex;
        }
        data.totalBorrows = data.totalBorrows > repayAmount ? data.totalBorrows - repayAmount : 0;

        emit Repay(msg.sender, asset, repayAmount);

        // Interactions
        IERC20(asset).safeTransferFrom(msg.sender, address(this), repayAmount);
    }

    /// @inheritdoc ILendingPool
    function liquidate(address user, address debtAsset, address collateralAsset, uint256 debtToCover)
        external
        nonReentrant
    {
        if (debtToCover == 0) revert InvalidAmount();
        if (user == address(0)) revert ZeroAddress();
        if (!assetConfigs[debtAsset].isActive) revert AssetNotSupported(debtAsset);
        if (!assetConfigs[collateralAsset].isActive) revert AssetNotSupported(collateralAsset);

        // Verify user is liquidatable
        // Must accrue interest first to get accurate health factor
        _accrueInterest(debtAsset);
        _accrueInterest(collateralAsset);

        uint256 hf = _calculateHealthFactor(user);
        if (hf >= WAD) revert PositionHealthy();

        AssetData storage debtData = assetData[debtAsset];
        UserPosition storage debtPosition = userPositions[user][debtAsset];
        UserPosition storage collateralPosition = userPositions[user][collateralAsset];

        // Calculate actual debt for the user
        uint256 actualDebt = _getUserDebt(user, debtAsset);
        uint256 actualDebtToCover = debtToCover > actualDebt ? actualDebt : debtToCover;

        // Calculate collateral to seize:
        // collateralToSeize = (debtToCover * debtPrice / collateralPrice) * (1 + liquidationBonus)
        // All prices are in 18 decimals, amounts are in token decimals
        uint256 debtPrice = oracle.getAssetPrice(debtAsset);
        uint256 collateralPrice = oracle.getAssetPrice(collateralAsset);
        uint8 debtDecimals = assetConfigs[debtAsset].decimals;
        uint8 collDecimals = assetConfigs[collateralAsset].decimals;
        uint256 liquidationBonus = assetConfigs[collateralAsset].liquidationBonus;

        // Normalize debt value to 18-decimal USD:
        // debtValueUSD = actualDebtToCover * debtPrice / 10^debtDecimals
        uint256 debtValueUSD = (actualDebtToCover * debtPrice) / (10 ** debtDecimals);

        // Add liquidation bonus: debtValueWithBonus = debtValueUSD * (WAD + bonus) / WAD
        uint256 debtValueWithBonus = (debtValueUSD * (WAD + liquidationBonus)) / WAD;

        // Convert to collateral amount:
        // collateralToSeize = debtValueWithBonus * 10^collDecimals / collateralPrice
        uint256 collateralToSeize = (debtValueWithBonus * (10 ** collDecimals)) / collateralPrice;

        // Ensure we don't seize more collateral than the user has
        if (collateralToSeize > collateralPosition.collateralBalance) {
            collateralToSeize = collateralPosition.collateralBalance;
        }

        // Effects — update borrower's positions
        if (actualDebtToCover >= actualDebt) {
            debtPosition.borrowBalance = 0;
            debtPosition.borrowIndex = 0;
        } else {
            debtPosition.borrowBalance = actualDebt - actualDebtToCover;
            debtPosition.borrowIndex = debtData.borrowIndex;
        }
        debtData.totalBorrows =
            debtData.totalBorrows > actualDebtToCover ? debtData.totalBorrows - actualDebtToCover : 0;

        collateralPosition.collateralBalance -= collateralToSeize;
        assetData[collateralAsset].totalDeposits -= collateralToSeize;

        emit Liquidation(msg.sender, user, debtAsset, collateralAsset, actualDebtToCover, collateralToSeize);

        // Interactions — liquidator pays debt, receives collateral
        IERC20(debtAsset).safeTransferFrom(msg.sender, address(this), actualDebtToCover);
        IERC20(collateralAsset).safeTransfer(msg.sender, collateralToSeize);
    }

    /* ------------------------------------------------------------------ */
    /*                          View Functions                            */
    /* ------------------------------------------------------------------ */

    /// @inheritdoc ILendingPool
    function getUserHealthFactor(address user) external view returns (uint256) {
        return _calculateHealthFactor(user);
    }

    /// @notice Returns the number of supported assets.
    function getSupportedAssetsCount() external view returns (uint256) {
        return supportedAssets.length;
    }

    /// @notice Returns the current debt of a user for a specific asset.
    /// @param user The user address.
    /// @param asset The asset address.
    /// @return debt The user's current debt including accrued interest.
    function getUserDebt(address user, address asset) external view returns (uint256 debt) {
        return _getUserDebt(user, asset);
    }

    /* ------------------------------------------------------------------ */
    /*                        Internal Functions                          */
    /* ------------------------------------------------------------------ */

    /// @dev Accrues interest for a given asset by updating the cumulative borrow index.
    /// @param asset The asset to accrue interest for.
    function _accrueInterest(address asset) internal {
        AssetData storage data = assetData[asset];

        uint256 blocksElapsed = block.number - data.lastUpdateTimestamp;
        if (blocksElapsed == 0) return;
        if (data.totalBorrows == 0) {
            data.lastUpdateTimestamp = block.number;
            return;
        }

        // Get current borrow rate from the interest rate model
        // totalLiquidity = pool balance (liquid cash available, not including borrowed)
        uint256 totalLiquidity = IERC20(asset).balanceOf(address(this));
        uint256 borrowRate = interestRateModel.getBorrowRate(totalLiquidity, data.totalBorrows, data.totalReserves);

        // Update cumulative borrow index:
        // newIndex = oldIndex * (1 + borrowRate * blocksElapsed)
        uint256 interestFactor = borrowRate * blocksElapsed;
        uint256 newBorrowIndex = (data.borrowIndex * (WAD + interestFactor)) / WAD;

        // Calculate new interest accrued
        uint256 interestAccrued = (data.totalBorrows * interestFactor) / WAD;

        // Update reserves: reserveAmount = interestAccrued * reserveFactor
        uint256 reserveFactor = assetConfigs[asset].reserveFactor;
        uint256 reservesAdded = (interestAccrued * reserveFactor) / WAD;

        // Update state
        data.borrowIndex = newBorrowIndex;
        data.totalBorrows += interestAccrued;
        data.totalReserves += reservesAdded;
        data.lastUpdateTimestamp = block.number;

        emit InterestAccrued(asset, newBorrowIndex, data.totalBorrows, reservesAdded);
    }

    /// @dev Calculates a user's current debt for an asset including accrued interest.
    /// @param user The user address.
    /// @param asset The asset address.
    /// @return debt The user's current debt.
    function _getUserDebt(address user, address asset) internal view returns (uint256 debt) {
        UserPosition storage position = userPositions[user][asset];
        if (position.borrowBalance == 0) return 0;
        if (position.borrowIndex == 0) return 0;

        // debt = userBorrowBalance * currentBorrowIndex / userBorrowIndex
        return (position.borrowBalance * assetData[asset].borrowIndex) / position.borrowIndex;
    }

    /// @dev Calculates the health factor for a user across all assets.
    /// @param user The user address.
    /// @return healthFactor The health factor in 18 decimals. type(uint256).max if no debt.
    function _calculateHealthFactor(address user) internal view returns (uint256) {
        uint256 totalCollateralUSD = 0; // Weighted by liquidation threshold, in WAD
        uint256 totalDebtUSD = 0; // In WAD

        uint256 length = supportedAssets.length;
        for (uint256 i = 0; i < length;) {
            address asset = supportedAssets[i];
            AssetConfig storage config = assetConfigs[asset];
            UserPosition storage position = userPositions[user][asset];

            if (position.collateralBalance > 0) {
                // Collateral value in USD (18 decimals)
                // collateralUSD = collateralBalance * price / 10^tokenDecimals
                uint256 price = oracle.getAssetPrice(asset);
                uint256 collateralUSD = (position.collateralBalance * price) / (10 ** config.decimals);

                // Apply liquidation threshold
                totalCollateralUSD += (collateralUSD * config.liquidationThreshold) / WAD;
            }

            // Calculate debt value
            uint256 userDebt = _getUserDebt(user, asset);
            if (userDebt > 0) {
                uint256 price = oracle.getAssetPrice(asset);
                uint256 debtUSD = (userDebt * price) / (10 ** config.decimals);
                totalDebtUSD += debtUSD;
            }

            unchecked {
                ++i;
            }
        }

        if (totalDebtUSD == 0) return type(uint256).max;

        // healthFactor = totalCollateralUSD (weighted) / totalDebtUSD
        return (totalCollateralUSD * WAD) / totalDebtUSD;
    }

    /// @dev Required override for UUPS proxy authorization.
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
