//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IPriceOracle.sol";

/**
 * @title MockOracle
 * @notice Mock price oracle for testing
 */
contract MockOracle is IPriceOracle {
    mapping(address => uint256) private _prices;
    mapping(address => uint256) private _lastUpdateTimes;
    mapping(address => mapping(uint256 => uint256)) private _historicalPrices;

    uint256 public stalenessThreshold = 1 hours;

    /**
     * @notice Set price for an asset
     * @param asset Asset address
     * @param price Price to set (scaled by 1e18)
     */
    function setPrice(address asset, uint256 price) external {
        _prices[asset] = price;
        _lastUpdateTimes[asset] = block.timestamp;
        emit PriceUpdated(asset, price, block.timestamp);
    }

    /**
     * @notice Set historical price
     * @param asset Asset address
     * @param timestamp Historical timestamp
     * @param price Historical price
     */
    function setHistoricalPrice(
        address asset,
        uint256 timestamp,
        uint256 price
    ) external {
        _historicalPrices[asset][timestamp] = price;
    }

    /**
     * @notice Set staleness threshold
     * @param newThreshold New threshold in seconds
     */
    function setStalenessThreshold(uint256 newThreshold) external {
        uint256 oldThreshold = stalenessThreshold;
        stalenessThreshold = newThreshold;
        emit StalenessThresholdUpdated(oldThreshold, newThreshold);
    }

    /**
     * @notice Get the current price of an asset
     * @param asset Asset address
     * @return uint256 Current price
     */
    function getPrice(address asset) external view override returns (uint256) {
        uint256 price = _prices[asset];
        require(price > 0, "Price not set");
        return price;
    }

    /**
     * @notice Get historical price
     * @param asset Asset address
     * @param timestamp Historical timestamp
     * @return uint256 Historical price
     */
    function getHistoricalPrice(
        address asset,
        uint256 timestamp
    ) external view override returns (uint256) {
        uint256 price = _historicalPrices[asset][timestamp];
        require(price > 0, "Historical price not set");
        return price;
    }

    /**
     * @notice Get last update time
     * @param asset Asset address
     * @return uint256 Last update timestamp
     */
    function getLastUpdateTime(
        address asset
    ) external view override returns (uint256) {
        return _lastUpdateTimes[asset];
    }

    /**
     * @notice Check if price is stale
     * @param asset Asset address
     * @return bool True if stale
     */
    function isPriceStale(address asset) public view override returns (bool) {
        uint256 lastUpdate = _lastUpdateTimes[asset];
        if (lastUpdate == 0) return true;
        return block.timestamp - lastUpdate > stalenessThreshold;
    }

    /**
     * @notice Get price with staleness check
     * @param asset Asset address
     * @return price Current price
     * @return isStale Whether price is stale
     */
    function getPriceWithStalenessCheck(
        address asset
    ) external view override returns (uint256 price, bool isStale) {
        price = _prices[asset];
        isStale = isPriceStale(asset);
        require(price > 0, "Price not set");
    }

    /**
     * @notice Simulate price movement (for testing)
     * @param asset Asset address
     * @param percentageChange Percentage change (can be negative)
     */
    function simulatePriceChange(
        address asset,
        int256 percentageChange
    ) external {
        uint256 currentPrice = _prices[asset];
        require(currentPrice > 0, "Price not set");

        if (percentageChange >= 0) {
            uint256 increase = (currentPrice * uint256(percentageChange)) / 100;
            _prices[asset] = currentPrice + increase;
        } else {
            uint256 decrease = (currentPrice * uint256(-percentageChange)) /
                100;
            require(currentPrice > decrease, "Price would go negative");
            _prices[asset] = currentPrice - decrease;
        }

        _lastUpdateTimes[asset] = block.timestamp;
        emit PriceUpdated(asset, _prices[asset], block.timestamp);
    }

    /**
     * @notice Batch set prices for multiple assets
     * @param assets Array of asset addresses
     * @param prices Array of prices
     */
    function batchSetPrices(
        address[] calldata assets,
        uint256[] calldata prices
    ) external {
        require(assets.length == prices.length, "Arrays length mismatch");

        for (uint256 i = 0; i < assets.length; i++) {
            _prices[assets[i]] = prices[i];
            _lastUpdateTimes[assets[i]] = block.timestamp;
            emit PriceUpdated(assets[i], prices[i], block.timestamp);
        }
    }
}
