// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title IPriceOracleRegistry
/// @notice Interface for the price oracle registry that provides USD prices for assets.
/// @dev All prices returned are normalized to 18 decimals (WAD).
interface IPriceOracleRegistry {
    /// @notice Returns the USD price of an asset, normalized to 18 decimals.
    /// @param asset The asset address.
    /// @return price The asset price in USD with 18 decimals.
    function getAssetPrice(address asset) external view returns (uint256 price);

    /// @notice Returns whether an asset has a registered price feed.
    /// @param asset The asset address.
    /// @return True if a feed is registered and active.
    function isAssetSupported(address asset) external view returns (bool);
}
