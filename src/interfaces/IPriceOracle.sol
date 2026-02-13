//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPriceOracle
 * @notice Interface for price oracle to fetch asset prices
 */
interface IPriceOracle {
    /**
     * @notice Get the current price of an asset in USD
     * @param asset Address of the asset
     * @return uint256 Price scaled by 1e18
     */
    function getPrice(address asset) external view returns (uint256);

    /**
     * @notice Get historical price of an asset
     * @param asset Address of the asset
     * @param timestamp Historical timestamp
     * @return uint256 Historical price scaled by 1e18
     */
    function getHistoricalPrice(
        address asset,
        uint256 timestamp
    ) external view returns (uint256);

    /**
     * @notice Get the latest price update timestamp
     * @param asset Address of the asset
     * @return uint256 Timestamp of last update
     */
    function getLastUpdateTime(address asset) external view returns (uint256);

    /**
     * @notice Check if price data is stale
     * @param asset Address of the asset
     * @return bool True if price is stale
     */
    function isPriceStale(address asset) external view returns (bool);

    /**
     * @notice Get price with staleness check
     * @param asset Address of the asset
     * @return price Current price
     * @return isStale Whether the price is stale
     */
    function getPriceWithStalenessCheck(
        address asset
    ) external view returns (uint256 price, bool isStale);

    /**
     * @notice Emitted when a price is updated
     * @param asset Address of the asset
     * @param price New price
     * @param timestamp Update timestamp
     */
    event PriceUpdated(address indexed asset, uint256 price, uint256 timestamp);

    /**
     * @notice Emitted when price staleness threshold is updated
     * @param oldThreshold Old staleness threshold
     * @param newThreshold New staleness threshold
     */
    event StalenessThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
}
