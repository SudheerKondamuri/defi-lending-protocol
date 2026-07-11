// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {PriceOracleRegistry} from "../src/oracles/PriceOracleRegistry.sol";
import {MockChainlinkAggregator} from "../src/mocks/MockChainlinkAggregator.sol";

/// @title PriceOracleRegistryTest
/// @notice Comprehensive tests for the price oracle registry.
contract PriceOracleRegistryTest is Test {
    PriceOracleRegistry public registry;
    MockChainlinkAggregator public ethFeed;
    MockChainlinkAggregator public usdcFeed;

    address constant WETH = address(0x1111);
    address constant USDC = address(0x2222);
    address constant UNSUPPORTED = address(0x9999);

    uint256 constant WAD = 1e18;

    function setUp() public {
        vm.warp(3600 * 24);
        registry = new PriceOracleRegistry(address(this));

        // ETH/USD feed: 8 decimals, $2000
        ethFeed = new MockChainlinkAggregator(8, 2000e8);
        // USDC/USD feed: 8 decimals, $1
        usdcFeed = new MockChainlinkAggregator(8, 1e8);

        // Register feeds
        registry.setPriceFeed(WETH, address(ethFeed), 3600);
        registry.setPriceFeed(USDC, address(usdcFeed), 3600);
    }

    /* ------------------------------------------------------------------ */
    /*                     Setting and Removing Feeds                     */
    /* ------------------------------------------------------------------ */

    function test_setPriceFeed() public view {
        assertTrue(registry.isAssetSupported(WETH), "WETH should be supported");
        assertTrue(registry.isAssetSupported(USDC), "USDC should be supported");
    }

    function test_removePriceFeed() public {
        registry.removePriceFeed(WETH);
        assertFalse(registry.isAssetSupported(WETH), "WETH should no longer be supported");
    }

    function test_revert_removePriceFeed_Unsupported() public {
        vm.expectRevert(abi.encodeWithSelector(PriceOracleRegistry.AssetNotSupported.selector, UNSUPPORTED));
        registry.removePriceFeed(UNSUPPORTED);
    }

    function test_revert_setPriceFeed_ZeroAssetAddress() public {
        vm.expectRevert(abi.encodeWithSelector(PriceOracleRegistry.ZeroAddress.selector));
        registry.setPriceFeed(address(0), address(ethFeed), 3600);
    }

    function test_revert_setPriceFeed_ZeroAggregatorAddress() public {
        vm.expectRevert(abi.encodeWithSelector(PriceOracleRegistry.ZeroAddress.selector));
        registry.setPriceFeed(WETH, address(0), 3600);
    }

    function test_revert_setPriceFeed_NotOwner() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        registry.setPriceFeed(WETH, address(ethFeed), 3600);
    }

    /* ------------------------------------------------------------------ */
    /*                        getAssetPrice Tests                         */
    /* ------------------------------------------------------------------ */

    function test_getAssetPrice_ValidData() public view {
        // ETH at $2000 with 8-decimal feed => normalized to 18 decimals
        uint256 price = registry.getAssetPrice(WETH);
        assertEq(price, 2000e18, "ETH price should be $2000 in 18 decimals");
    }

    function test_getAssetPrice_USDC() public view {
        uint256 price = registry.getAssetPrice(USDC);
        assertEq(price, 1e18, "USDC price should be $1 in 18 decimals");
    }

    /* ------------------------------------------------------------------ */
    /*                        Stale Price Tests                           */
    /* ------------------------------------------------------------------ */

    function test_revert_StalePrice() public {
        // Set updatedAt to more than heartbeat (3600s) ago
        ethFeed.setUpdatedAt(block.timestamp - 3601);

        vm.expectRevert(
            abi.encodeWithSelector(
                PriceOracleRegistry.StalePriceFeed.selector, WETH, block.timestamp - 3601, block.timestamp, 3600
            )
        );
        registry.getAssetPrice(WETH);
    }

    /* ------------------------------------------------------------------ */
    /*                      Negative Price Tests                          */
    /* ------------------------------------------------------------------ */

    function test_revert_NegativePrice() public {
        ethFeed.setPrice(-1);

        vm.expectRevert(abi.encodeWithSelector(PriceOracleRegistry.InvalidOraclePrice.selector, WETH, int256(-1)));
        registry.getAssetPrice(WETH);
    }

    function test_revert_ZeroPrice() public {
        ethFeed.setPrice(0);

        vm.expectRevert(abi.encodeWithSelector(PriceOracleRegistry.InvalidOraclePrice.selector, WETH, int256(0)));
        registry.getAssetPrice(WETH);
    }

    /* ------------------------------------------------------------------ */
    /*                    Unsupported Asset Tests                         */
    /* ------------------------------------------------------------------ */

    function test_revert_UnsupportedAsset() public {
        vm.expectRevert(abi.encodeWithSelector(PriceOracleRegistry.AssetNotSupported.selector, UNSUPPORTED));
        registry.getAssetPrice(UNSUPPORTED);
    }

    function test_isAssetSupported_False() public view {
        assertFalse(registry.isAssetSupported(UNSUPPORTED), "Unsupported asset should return false");
    }

    /* ------------------------------------------------------------------ */
    /*                   Decimal Normalization Tests                      */
    /* ------------------------------------------------------------------ */

    function test_decimalNormalization_8to18() public view {
        // Feed reports 2000e8 (8 decimals), should normalize to 2000e18
        uint256 price = registry.getAssetPrice(WETH);
        assertEq(price, 2000e18, "8-decimal feed should normalize to 18 decimals");
    }

    function test_decimalNormalization_18DecimalFeed() public {
        // Create an 18-decimal feed
        MockChainlinkAggregator feed18 = new MockChainlinkAggregator(18, 2000e18);
        address asset18 = address(0x3333);
        registry.setPriceFeed(asset18, address(feed18), 3600);

        uint256 price = registry.getAssetPrice(asset18);
        assertEq(price, 2000e18, "18-decimal feed should return as-is");
    }

    /* ------------------------------------------------------------------ */
    /*                       Stale Round Tests                            */
    /* ------------------------------------------------------------------ */

    function test_revert_StaleRound() public {
        // answeredInRound < roundId indicates incomplete round
        ethFeed.setRoundId(5);
        ethFeed.setAnsweredInRound(4);

        vm.expectRevert(abi.encodeWithSelector(PriceOracleRegistry.StaleRound.selector, WETH, uint80(5), uint80(4)));
        registry.getAssetPrice(WETH);
    }

    /* ------------------------------------------------------------------ */
    /*                     Invalid Timestamp Tests                        */
    /* ------------------------------------------------------------------ */

    function test_revert_ZeroTimestamp() public {
        ethFeed.setUpdatedAt(0);

        vm.expectRevert(abi.encodeWithSelector(PriceOracleRegistry.InvalidTimestamp.selector, WETH, 0, block.timestamp));
        registry.getAssetPrice(WETH);
    }

    function test_revert_FutureTimestamp() public {
        ethFeed.setUpdatedAt(block.timestamp + 100);

        vm.expectRevert(
            abi.encodeWithSelector(
                PriceOracleRegistry.InvalidTimestamp.selector, WETH, block.timestamp + 100, block.timestamp
            )
        );
        registry.getAssetPrice(WETH);
    }

    /* ------------------------------------------------------------------ */
    /*                        getFeed Tests                               */
    /* ------------------------------------------------------------------ */

    function test_getFeed() public view {
        (, uint8 decimals, uint256 heartbeat) = registry.getFeed(WETH);
        assertEq(decimals, 8, "Feed decimals should be 8");
        assertEq(heartbeat, 3600, "Feed heartbeat should be 3600");
    }

    function test_revert_getFeed_Unsupported() public {
        vm.expectRevert(abi.encodeWithSelector(PriceOracleRegistry.AssetNotSupported.selector, UNSUPPORTED));
        registry.getFeed(UNSUPPORTED);
    }

    /* ------------------------------------------------------------------ */
    /*                       Default Heartbeat Test                       */
    /* ------------------------------------------------------------------ */

    function test_defaultHeartbeat() public {
        MockChainlinkAggregator newFeed = new MockChainlinkAggregator(8, 100e8);
        address newAsset = address(0x4444);
        // Pass heartbeat = 0 to use default
        registry.setPriceFeed(newAsset, address(newFeed), 0);

        (,, uint256 heartbeat) = registry.getFeed(newAsset);
        assertEq(heartbeat, registry.DEFAULT_HEARTBEAT(), "Should use default heartbeat");
    }
}
