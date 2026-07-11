// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title MockChainlinkAggregator
/// @notice A mock AggregatorV3Interface for testing oracle validation.
/// @dev Allows setting price, updatedAt, roundId, answeredInRound, and decimals.
contract MockChainlinkAggregator {
    int256 private _price;
    uint8 private _decimals;
    uint80 private _roundId;
    uint80 private _answeredInRound;
    uint256 private _updatedAt;
    string private _description;

    /// @notice Deploys the mock with initial configuration.
    /// @param decimals_    Number of decimals for the price feed (e.g. 8 for USD feeds).
    /// @param initialPrice Initial price (signed, in feed decimals).
    constructor(uint8 decimals_, int256 initialPrice) {
        _decimals = decimals_;
        _price = initialPrice;
        _roundId = 1;
        _answeredInRound = 1;
        _updatedAt = block.timestamp;
        _description = "Mock Price Feed";
    }

    /// @notice Returns the feed decimals.
    function decimals() external view returns (uint8) {
        return _decimals;
    }

    /// @notice Returns the feed description.
    function description() external view returns (string memory) {
        return _description;
    }

    /// @notice Returns the feed version.
    function version() external pure returns (uint256) {
        return 1;
    }

    /// @notice Returns round data for a specific round (returns current data for any round).
    function getRoundData(uint80)
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (_roundId, _price, _updatedAt, _updatedAt, _answeredInRound);
    }

    /// @notice Returns the latest round data.
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (_roundId, _price, _updatedAt, _updatedAt, _answeredInRound);
    }

    /* ------------------------------------------------------------------ */
    /*                          Test Helpers                              */
    /* ------------------------------------------------------------------ */

    /// @notice Sets the price returned by the feed.
    /// @param price The new price (signed, in feed decimals).
    function setPrice(int256 price) external {
        _price = price;
    }

    /// @notice Sets the updatedAt timestamp.
    /// @param updatedAt The new updatedAt value.
    function setUpdatedAt(uint256 updatedAt) external {
        _updatedAt = updatedAt;
    }

    /// @notice Sets the roundId.
    /// @param roundId The new roundId.
    function setRoundId(uint80 roundId) external {
        _roundId = roundId;
    }

    /// @notice Sets the answeredInRound value.
    /// @param answeredInRound The new answeredInRound.
    function setAnsweredInRound(uint80 answeredInRound) external {
        _answeredInRound = answeredInRound;
    }

    /// @notice Convenience function to set all round data at once.
    /// @param roundId          The round ID.
    /// @param price            The signed price.
    /// @param updatedAt        The update timestamp.
    /// @param answeredInRound  The round in which the answer was finalized.
    function setRoundData(uint80 roundId, int256 price, uint256 updatedAt, uint80 answeredInRound) external {
        _roundId = roundId;
        _price = price;
        _updatedAt = updatedAt;
        _answeredInRound = answeredInRound;
    }
}
