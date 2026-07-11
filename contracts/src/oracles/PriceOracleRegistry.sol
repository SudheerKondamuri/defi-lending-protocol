// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/// @title PriceOracleRegistry
/// @author DeFi Lending Protocol
/// @notice Centralized price oracle registry that maps asset addresses to Chainlink
///         `AggregatorV3Interface` feeds and exposes a single, hardened price accessor.
/// @dev All prices returned by this contract are normalized to **18 decimals** (WAD),
///      regardless of the underlying feed's decimals (Chainlink USD feeds are typically
///      8 decimals). Every call to {getAssetPrice} validates the round data to protect
///      the protocol against stale, incomplete, or manipulated feed responses.
///
///      Security guarantees enforced on every read:
///        1. `price > 0`                 — rejects zero/negative prices.
///        2. `answeredInRound >= roundId`— rejects rounds whose answer has not yet been
///                                          finalized by an oracle transmission.
///        3. `updatedAt != 0`            — rejects never-updated feeds.
///        4. `updatedAt <= block.timestamp`— rejects feeds reporting future timestamps.
///        5. `block.timestamp - updatedAt <= heartbeat` — rejects stale feeds.
contract PriceOracleRegistry is Ownable {
    /* ------------------------------------------------------------------ */
    /*                              Constants                             */
    /* ------------------------------------------------------------------ */

    /// @dev Target decimals for all normalized prices returned by the registry.
    uint8 public constant TARGET_DECIMALS = 18;

    /// @dev Maximum feed decimals accepted (feeds with more decimals would require
    ///      down-scaling, which is intentionally unsupported to avoid precision loss).
    uint8 public constant MAX_FEED_DECIMALS = 18;

    /// @dev Default staleness window (seconds) applied when a feed is registered without
    ///      an explicit heartbeat. Chainlink ETH/USD on Ethereum mainnet updates ~3600s.
    uint256 public constant DEFAULT_HEARTBEAT = 3600;

    /* ------------------------------------------------------------------ */
    /*                              Custom Errors                         */
    /* ------------------------------------------------------------------ */

    /// @notice Reverted when reading a feed whose latest round was never answered.
    /// @param asset            The asset whose price was requested.
    /// @param roundId          The round id returned by the feed.
    /// @param answeredInRound  The round id in which the answer was finalized.
    error StaleRound(address asset, uint80 roundId, uint80 answeredInRound);

    /// @notice Reverted when the feed's `updatedAt` is stale beyond the heartbeat.
    /// @param asset          The asset whose price was requested.
    /// @param updatedAt      Timestamp of the feed's last update.
    /// @param blockTimestamp Current block timestamp.
    /// @param heartbeat      Maximum allowed staleness (seconds).
    error StalePriceFeed(address asset, uint256 updatedAt, uint256 blockTimestamp, uint256 heartbeat);

    /// @notice Reverted when the feed returns a non-positive price.
    /// @param asset The asset whose price was requested.
    /// @param price The invalid (<= 0) signed price returned by the feed.
    error InvalidOraclePrice(address asset, int256 price);

    /// @notice Reverted when the feed reports an impossible timestamp.
    /// @param asset          The asset whose price was requested.
    /// @param updatedAt      Timestamp of the feed's last update.
    /// @param blockTimestamp Current block timestamp.
    error InvalidTimestamp(address asset, uint256 updatedAt, uint256 blockTimestamp);

    /// @notice Reverted when interacting with an asset that has no registered feed.
    /// @param asset The unsupported asset.
    error AssetNotSupported(address asset);

    /// @notice Reverted when registering a feed whose decimals exceed {MAX_FEED_DECIMALS}.
    /// @param asset    The asset being registered.
    /// @param decimals Decimals reported by the aggregator.
    error InvalidFeedDecimals(address asset, uint8 decimals);

    /// @notice Reverted when a zero address is supplied where a valid address is required.
    error ZeroAddress();

    /* ------------------------------------------------------------------ */
    /*                              Storage                               */
    /* ------------------------------------------------------------------ */

    /// @dev Per-asset feed configuration. Stored as a struct to keep the read path to a
    ///      single SLOAD and to allow per-asset heartbeats (different feeds update at
    ///      different cadences).
    struct PriceFeed {
        AggregatorV3Interface aggregator;
        uint8 decimals; // decimals reported by the aggregator (e.g. 8 for USD feeds)
        uint256 heartbeat; // maximum acceptable staleness, in seconds
        bool isSet; // existence flag (address(0) is a valid aggregator in theory)
    }

    /// @notice Asset address => feed configuration.
    mapping(address => PriceFeed) public feeds;

    /* ------------------------------------------------------------------ */
    /*                               Events                               */
    /* ------------------------------------------------------------------ */

    /// @notice Emitted when a price feed is registered or updated.
    /// @param asset      The asset address.
    /// @param aggregator The Chainlink aggregator address.
    /// @param decimals   Decimals reported by the aggregator.
    /// @param heartbeat  Staleness threshold (seconds) applied to this feed.
    event PriceFeedSet(address indexed asset, address indexed aggregator, uint8 decimals, uint256 heartbeat);

    /// @notice Emitted when a price feed is removed.
    /// @param asset The asset address whose feed was removed.
    event PriceFeedRemoved(address indexed asset);

    /* ------------------------------------------------------------------ */
    /*                             Constructor                            */
    /* ------------------------------------------------------------------ */

    /// @param owner The address granted permission to manage feed registrations.
    constructor(address owner) Ownable(owner) {}

    /* ------------------------------------------------------------------ */
    /*                              Admin                                 */
    /* ------------------------------------------------------------------ */

    /// @notice Registers or updates the Chainlink feed for an asset.
    /// @dev Decimals and heartbeat are read/derived once at registration time to keep the
    ///      hot read path (`getAssetPrice`) gas-light and avoid repeated external calls.
    /// @param asset      The asset address (e.g. WETH).
    /// @param aggregator The Chainlink `AggregatorV3Interface` address.
    /// @param heartbeat  Maximum acceptable staleness in seconds. Pass `0` to use the
    ///                   {DEFAULT_HEARTBEAT}.
    function setPriceFeed(address asset, address aggregator, uint256 heartbeat) external onlyOwner {
        if (asset == address(0) || aggregator == address(0)) revert ZeroAddress();

        uint8 decimals = AggregatorV3Interface(aggregator).decimals();
        if (decimals > MAX_FEED_DECIMALS) revert InvalidFeedDecimals(asset, decimals);

        if (heartbeat == 0) heartbeat = DEFAULT_HEARTBEAT;

        feeds[asset] = PriceFeed({
            aggregator: AggregatorV3Interface(aggregator), decimals: decimals, heartbeat: heartbeat, isSet: true
        });

        emit PriceFeedSet(asset, aggregator, decimals, heartbeat);
    }

    /// @notice Removes the price feed for an asset, making it un-collateralizable.
    /// @param asset The asset address whose feed should be removed.
    function removePriceFeed(address asset) external onlyOwner {
        if (!feeds[asset].isSet) revert AssetNotSupported(asset);
        delete feeds[asset];
        emit PriceFeedRemoved(asset);
    }

    /* ------------------------------------------------------------------ */
    /*                            Read API                                */
    /* ------------------------------------------------------------------ */

    /// @notice Returns the USD price of an asset, normalized to 18 decimals.
    /// @dev Reverts with a descriptive custom error if the feed is missing, stale,
    ///      incomplete, or non-positive. Callers may safely multiply this price by an
    ///      18-decimal token amount and divide by `1e18` to obtain a 18-decimal USD value.
    /// @param asset The asset address.
    /// @return price The asset price in USD with 18 decimals.
    function getAssetPrice(address asset) external view returns (uint256 price) {
        PriceFeed storage feed = feeds[asset];
        if (!feed.isSet) revert AssetNotSupported(asset);

        (uint256 rawPrice,,,) = _getFreshRoundData(asset, feed);

        // Normalize feed decimals (e.g. 8) up to TARGET_DECIMALS (18).
        // `feed.decimals <= MAX_FEED_DECIMALS == TARGET_DECIMALS` is enforced on
        // registration, so the exponent is always in [0, 18] and never underflows.
        // slither-disable-next-line divide-before-multiply
        price = rawPrice * (10 ** (TARGET_DECIMALS - feed.decimals));
    }

    /// @notice Returns whether an asset has a registered price feed.
    /// @param asset The asset address.
    /// @return True if a feed is registered and active.
    function isAssetSupported(address asset) external view returns (bool) {
        return feeds[asset].isSet;
    }

    /// @notice Returns the full feed configuration for an asset.
    /// @param asset The asset address.
    /// @return aggregator The Chainlink aggregator.
    /// @return decimals   The aggregator's decimals.
    /// @return heartbeat  The staleness threshold (seconds).
    function getFeed(address asset)
        external
        view
        returns (AggregatorV3Interface aggregator, uint8 decimals, uint256 heartbeat)
    {
        PriceFeed storage feed = feeds[asset];
        if (!feed.isSet) revert AssetNotSupported(asset);
        return (feed.aggregator, feed.decimals, feed.heartbeat);
    }

    /* ------------------------------------------------------------------ */
    /*                            Internals                               */
    /* ------------------------------------------------------------------ */

    /// @dev Fetches and validates the latest round data for a feed. Returns the unsigned
    ///      price, `updatedAt` timestamp, and round ids. Reverts on any integrity failure.
    function _getFreshRoundData(address asset, PriceFeed storage feed)
        internal
        view
        returns (uint256 rawPrice, uint256 updatedAt, uint80 roundId, uint80 answeredInRound)
    {
        int256 signedPrice;
        (roundId, signedPrice,, updatedAt, answeredInRound) = feed.aggregator.latestRoundData();

        // (1) Price must be strictly positive.
        if (signedPrice <= 0) revert InvalidOraclePrice(asset, signedPrice);

        // (2) The answer must have been finalized in a round >= the requested round id.
        //     Chainlink guarantees `answeredInRound >= roundId` for completed rounds; a
        //     violation indicates an incomplete/stale round.
        if (answeredInRound < roundId) {
            revert StaleRound(asset, roundId, answeredInRound);
        }

        // (3) `updatedAt` must be a plausible, non-future timestamp.
        if (updatedAt == 0 || updatedAt > block.timestamp) {
            revert InvalidTimestamp(asset, updatedAt, block.timestamp);
        }

        // (4) The feed must have updated within the configured heartbeat window.
        //     `updatedAt <= block.timestamp` is guaranteed by the check above, so the
        //     subtraction cannot underflow.
        // slither-disable-next-line timestamp
        if (block.timestamp - updatedAt > feed.heartbeat) {
            revert StalePriceFeed(asset, updatedAt, block.timestamp, feed.heartbeat);
        }

        // Safe cast: `signedPrice <= 0` is reverted above, so the value is strictly
        // positive and fits in uint256.
        // forge-lint: disable-next-line(unsafe-typecast)
        rawPrice = uint256(signedPrice);
    }
}
