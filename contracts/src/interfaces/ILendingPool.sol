// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title ILendingPool
/// @notice Interface for the core lending pool contract.
/// @dev Defines all external/public functions, events, custom errors, and structs.
interface ILendingPool {
    /* ------------------------------------------------------------------ */
    /*                              Structs                               */
    /* ------------------------------------------------------------------ */

    /// @notice Configuration parameters for a supported asset.
    struct AssetConfig {
        uint256 liquidationThreshold; // WAD (e.g. 0.85e18 = 85%)
        uint256 liquidationBonus; // WAD (e.g. 0.05e18 = 5% bonus)
        uint256 reserveFactor; // WAD (e.g. 0.10e18 = 10%)
        uint8 decimals; // Token decimals (e.g. 18 for WETH, 6 for USDC)
        bool isActive; // Whether the asset is currently active
    }

    /* ------------------------------------------------------------------ */
    /*                              Events                                */
    /* ------------------------------------------------------------------ */

    /// @notice Emitted when a user deposits collateral.
    event Deposit(address indexed user, address indexed asset, uint256 amount);

    /// @notice Emitted when a user withdraws collateral.
    event Withdraw(address indexed user, address indexed asset, uint256 amount);

    /// @notice Emitted when a user borrows an asset.
    event Borrow(address indexed user, address indexed asset, uint256 amount);

    /// @notice Emitted when a user repays borrowed debt.
    event Repay(address indexed user, address indexed asset, uint256 amount);

    /// @notice Emitted when a liquidator liquidates an undercollateralized position.
    event Liquidation(
        address indexed liquidator,
        address indexed user,
        address debtAsset,
        address collateralAsset,
        uint256 debtCovered,
        uint256 collateralSeized
    );

    /// @notice Emitted when a new asset is added to the protocol.
    event AssetAdded(address indexed asset, AssetConfig config);

    /// @notice Emitted when an asset's configuration is updated.
    event AssetConfigUpdated(address indexed asset, AssetConfig config);

    /// @notice Emitted when interest is accrued for an asset.
    event InterestAccrued(
        address indexed asset, uint256 newBorrowIndex, uint256 newTotalBorrows, uint256 reservesAdded
    );

    /* ------------------------------------------------------------------ */
    /*                           Custom Errors                            */
    /* ------------------------------------------------------------------ */

    /// @notice User's health factor would drop below 1.0 after the operation.
    error HealthFactorTooLow();

    /// @notice The asset is not supported by the protocol.
    error AssetNotSupported(address asset);

    /// @notice Insufficient collateral for the requested operation.
    error InsufficientCollateral();

    /// @notice Insufficient liquidity in the pool for withdrawal or borrowing.
    error InsufficientLiquidity();

    /// @notice Invalid amount (zero or exceeds balance).
    error InvalidAmount();

    /// @notice Liquidation attempted on a healthy position (HF >= 1e18).
    error PositionHealthy();

    /// @notice A zero address was provided where a valid address is required.
    error ZeroAddress();

    /* ------------------------------------------------------------------ */
    /*                          Core Functions                            */
    /* ------------------------------------------------------------------ */

    /// @notice Deposits collateral into the lending pool.
    /// @param asset The ERC20 token address to deposit.
    /// @param amount The amount of tokens to deposit.
    function deposit(address asset, uint256 amount) external;

    /// @notice Withdraws collateral from the lending pool.
    /// @param asset The ERC20 token address to withdraw.
    /// @param amount The amount of tokens to withdraw.
    function withdraw(address asset, uint256 amount) external;

    /// @notice Borrows an asset from the lending pool.
    /// @param asset The ERC20 token address to borrow.
    /// @param amount The amount of tokens to borrow.
    function borrow(address asset, uint256 amount) external;

    /// @notice Repays borrowed debt.
    /// @param asset The ERC20 token address to repay.
    /// @param amount The amount of tokens to repay (use type(uint256).max to repay full debt).
    function repay(address asset, uint256 amount) external;

    /// @notice Liquidates an undercollateralized position.
    /// @param user The address of the user being liquidated.
    /// @param debtAsset The asset used to repay the user's debt.
    /// @param collateralAsset The collateral asset to seize.
    /// @param debtToCover The amount of debt to cover.
    function liquidate(address user, address debtAsset, address collateralAsset, uint256 debtToCover) external;

    /// @notice Returns the health factor of a user's position.
    /// @param user The user address.
    /// @return healthFactor The health factor in 18 decimals (1e18 = 1.0).
    function getUserHealthFactor(address user) external view returns (uint256 healthFactor);

    /* ------------------------------------------------------------------ */
    /*                          Admin Functions                           */
    /* ------------------------------------------------------------------ */

    /// @notice Adds a new asset to the protocol.
    /// @param asset The ERC20 token address to add.
    /// @param config The asset configuration parameters.
    function addAsset(address asset, AssetConfig calldata config) external;

    /// @notice Updates an existing asset's configuration.
    /// @param asset The ERC20 token address to update.
    /// @param config The new asset configuration parameters.
    function updateAssetConfig(address asset, AssetConfig calldata config) external;
}
