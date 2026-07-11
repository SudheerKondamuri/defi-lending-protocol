// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title IInterestRateModel
/// @notice Interface for the kinked interest rate model used by the lending pool.
/// @dev All rates and utilization values use 18-decimal fixed point (WAD, 1e18 = 1.0).
interface IInterestRateModel {
    /// @notice Computes the current utilization rate.
    /// @param totalLiquidity Liquid asset held by the pool (excluding borrows).
    /// @param totalBorrows   Total outstanding borrows.
    /// @param totalReserves  Accumulated protocol reserves.
    /// @return utilization Utilization rate in 18 decimals (0..1e18).
    function utilizationRate(uint256 totalLiquidity, uint256 totalBorrows, uint256 totalReserves)
        external
        pure
        returns (uint256 utilization);

    /// @notice Computes the per-block borrow rate at a given pool state.
    /// @param totalLiquidity Liquid asset held by the pool.
    /// @param totalBorrows   Total outstanding borrows.
    /// @param totalReserves  Accumulated protocol reserves.
    /// @return rate Per-block borrow rate in 18 decimals.
    function getBorrowRate(uint256 totalLiquidity, uint256 totalBorrows, uint256 totalReserves)
        external
        view
        returns (uint256 rate);

    /// @notice Computes the per-block supply rate at a given pool state.
    /// @param totalLiquidity        Liquid asset held by the pool.
    /// @param totalBorrows          Total outstanding borrows.
    /// @param totalReserves         Accumulated protocol reserves.
    /// @param reserveFactorMantissa Reserve factor in 18 decimals (0..1e18).
    /// @return rate Per-block supply rate in 18 decimals.
    function getSupplyRate(
        uint256 totalLiquidity,
        uint256 totalBorrows,
        uint256 totalReserves,
        uint256 reserveFactorMantissa
    ) external view returns (uint256 rate);
}
