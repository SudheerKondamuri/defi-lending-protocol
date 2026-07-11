// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title InterestRateModel
/// @author DeFi Lending Protocol
/// @notice Kinked ("jump") interest rate model inspired by Compound's `JumpRateModel`.
/// @dev All rates and utilization values use **18-decimal fixed point** (WAD, 1e18 = 1.0).
///
///      The borrow rate is a piecewise-linear function of the utilization rate `U`:
///
///          U <= kink :
///              borrowRate = baseRatePerBlock
///                         + multiplierPerBlock * U / 1e18
///          U  > kink :
///              borrowRate = baseRatePerBlock
///                         + multiplierPerBlock * kink / 1e18
///                         + jumpMultiplierPerBlock * (U - kink) / 1e18
///
///      where `U = totalBorrows / (cash + totalBorrows - totalReserves)` (0 when the
///      denominator is zero).
///
///      The supply rate derives from the borrow rate, utilization, and reserve factor:
///
///          supplyRate = borrowRate * U / 1e18 * (1e18 - reserveFactorMantissa) / 1e18
///
///      All multiplications are ordered so that the dividend is maximized before division,
///      preventing precision loss / truncation. Inputs are bounded only by the EVM's
///      256-bit range; no intermediate can overflow for any realistic money-market
///      magnitude (fuzz-tested in Phase 4).
contract InterestRateModel is Ownable {
    /* ------------------------------------------------------------------ */
    /*                              Constants                             */
    /* ------------------------------------------------------------------ */

    /// @dev 18-decimal fixed-point scaling factor (1.0).
    uint256 internal constant WAD = 1e18;

    /* ------------------------------------------------------------------ */
    /*                              Custom Errors                         */
    /* ------------------------------------------------------------------ */

    /// @notice Reverted when a parameter exceeds its allowed bound.
    /// @param param   Human-readable parameter name.
    /// @param value   The offending value.
    /// @param max     The maximum allowed value.
    error ParameterOutOfBounds(string param, uint256 value, uint256 max);

    /// @notice Reverted when a zero address is supplied.
    error ZeroAddress();

    /* ------------------------------------------------------------------ */
    /*                              Parameters                            */
    /* ------------------------------------------------------------------ */

    /// @notice Base borrow rate per block (18 decimals), applied at 0% utilization.
    uint256 public baseRatePerBlock;

    /// @notice Multiplier per block (18 decimals) applied to utilization up to the kink.
    uint256 public multiplierPerBlock;

    /// @notice Jump multiplier per block (18 decimals) applied to utilization above kink.
    uint256 public jumpMultiplierPerBlock;

    /// @notice Utilization point (18 decimals) at which the rate slope steepens.
    uint256 public kink;

    /* ------------------------------------------------------------------ */
    /*                               Events                               */
    /* ------------------------------------------------------------------ */

    /// @notice Emitted when the model parameters are updated.
    /// @param baseRatePerBlock     New base rate per block.
    /// @param multiplierPerBlock   New multiplier per block.
    /// @param jumpMultiplierPerBlock New jump multiplier per block.
    /// @param kink                 New kink utilization.
    event NewInterestParams(
        uint256 baseRatePerBlock, uint256 multiplierPerBlock, uint256 jumpMultiplierPerBlock, uint256 kink
    );

    /* ------------------------------------------------------------------ */
    /*                             Constructor                            */
    /* ------------------------------------------------------------------ */

    /// @notice Deploys the model with an initial parameter set.
    /// @dev Per-block rates are derived from annualized targets. For an Ethereum-like
    ///      chain with ~2,102,400 blocks/year, `perBlock = annual * 1e18 / blocksPerYear`.
    /// @param owner                 Governance/owner address.
    /// @param baseRatePerBlock_     Base borrow rate per block (18 decimals).
    /// @param multiplierPerBlock_   Multiplier per block (18 decimals).
    /// @param jumpMultiplierPerBlock_ Jump multiplier per block (18 decimals).
    /// @param kink_                 Kink utilization (18 decimals), e.g. 0.8e18 for 80%.
    constructor(
        address owner,
        uint256 baseRatePerBlock_,
        uint256 multiplierPerBlock_,
        uint256 jumpMultiplierPerBlock_,
        uint256 kink_
    ) Ownable(owner) {
        _setParams(baseRatePerBlock_, multiplierPerBlock_, jumpMultiplierPerBlock_, kink_);
    }

    /* ------------------------------------------------------------------ */
    /*                              Admin                                 */
    /* ------------------------------------------------------------------ */

    /// @notice Updates the model parameters.
    /// @param baseRatePerBlock_     Base borrow rate per block (18 decimals).
    /// @param multiplierPerBlock_   Multiplier per block (18 decimals).
    /// @param jumpMultiplierPerBlock_ Jump multiplier per block (18 decimals).
    /// @param kink_                 Kink utilization (18 decimals).
    function setParams(
        uint256 baseRatePerBlock_,
        uint256 multiplierPerBlock_,
        uint256 jumpMultiplierPerBlock_,
        uint256 kink_
    ) external onlyOwner {
        _setParams(baseRatePerBlock_, multiplierPerBlock_, jumpMultiplierPerBlock_, kink_);
    }

    /// @dev Validates and stores the four parameters. Rates are bounded at 100% per block
    ///      (1e18) — already far beyond any sane market — purely as an integrity guard.
    function _setParams(
        uint256 baseRatePerBlock_,
        uint256 multiplierPerBlock_,
        uint256 jumpMultiplierPerBlock_,
        uint256 kink_
    ) internal {
        uint256 maxPerBlockRate = WAD; // 100% per block ceiling
        if (baseRatePerBlock_ > maxPerBlockRate) {
            revert ParameterOutOfBounds("baseRatePerBlock", baseRatePerBlock_, maxPerBlockRate);
        }
        if (multiplierPerBlock_ > maxPerBlockRate) {
            revert ParameterOutOfBounds("multiplierPerBlock", multiplierPerBlock_, maxPerBlockRate);
        }
        if (jumpMultiplierPerBlock_ > maxPerBlockRate) {
            revert ParameterOutOfBounds("jumpMultiplierPerBlock", jumpMultiplierPerBlock_, maxPerBlockRate);
        }
        // Kink must be a utilization ratio in (0, 1].
        if (kink_ == 0 || kink_ > WAD) {
            revert ParameterOutOfBounds("kink", kink_, WAD);
        }

        baseRatePerBlock = baseRatePerBlock_;
        multiplierPerBlock = multiplierPerBlock_;
        jumpMultiplierPerBlock = jumpMultiplierPerBlock_;
        kink = kink_;

        emit NewInterestParams(baseRatePerBlock_, multiplierPerBlock_, jumpMultiplierPerBlock_, kink_);
    }

    /* ------------------------------------------------------------------ */
    /*                            Read API                                */
    /* ------------------------------------------------------------------ */

    /// @notice Computes the current utilization rate `U`.
    /// @dev `U = totalBorrows / (totalLiquidity + totalBorrows - totalReserves)`, returned
    ///      in 18 decimals. Returns 0 when the pool is empty (denominator == 0) to avoid
    ///      division by zero. `totalReserves` are part of `totalLiquidity`; the denominator
    ///      is therefore `totalLiquidity + totalBorrows - totalReserves` = the total
    ///      non-reserve liquidity plus borrows.
    /// @param totalLiquidity Liquid asset held by the pool (excluding borrows).
    /// @param totalBorrows   Total outstanding borrows.
    /// @param totalReserves  Accumulated protocol reserves.
    /// @return utilization Utilization rate in 18 decimals (0..1e18).
    function utilizationRate(uint256 totalLiquidity, uint256 totalBorrows, uint256 totalReserves)
        public
        pure
        returns (uint256 utilization)
    {
        // Total supply denominator: liquid + borrowed, less reserves retained.
        // Underflow is structurally impossible in a correct lending pool (reserves <= cash
        // + borrows is an invariant), but we guard defensively for standalone use.
        if (totalBorrows == 0) return 0;

        uint256 totalSupply = totalLiquidity + totalBorrows;
        if (totalSupply <= totalReserves) return 0;

        // Multiply before dividing to preserve precision.
        // slither-disable-next-line divide-before-multiply
        utilization = (totalBorrows * WAD) / (totalSupply - totalReserves);
    }

    /// @notice Computes the per-block borrow rate at a given pool state.
    /// @dev Matches the protocol specification signature exactly.
    /// @param totalLiquidity Liquid asset held by the pool.
    /// @param totalBorrows   Total outstanding borrows.
    /// @param totalReserves  Accumulated protocol reserves.
    /// @return rate Per-block borrow rate in 18 decimals.
    function getBorrowRate(uint256 totalLiquidity, uint256 totalBorrows, uint256 totalReserves)
        external
        view
        returns (uint256 rate)
    {
        uint256 util = utilizationRate(totalLiquidity, totalBorrows, totalReserves);
        return _borrowRate(util);
    }

    /// @notice Computes the per-block supply rate at a given pool state.
    /// @dev `supplyRate = borrowRate * U * (1 - reserveFactor)`. The protocol-wide
    ///      reserve factor is supplied by the caller (the LendingPool) so this model stays
    ///      agnostic to reserve configuration.
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
    ) public view returns (uint256 rate) {
        uint256 util = utilizationRate(totalLiquidity, totalBorrows, totalReserves);
        uint256 borrowRate = _borrowRate(util);

        // (1 - reserveFactor) * borrowRate, then scale by utilization.
        // Reserve factor is bounded [0, 1e18] by the caller; the subtraction cannot
        // underflow given that invariant.
        uint256 fractionKept = WAD - reserveFactorMantissa;
        // slither-disable-next-line divide-before-multiply
        rate = (borrowRate * util * fractionKept) / (WAD * WAD);
    }

    /* ------------------------------------------------------------------ */
    /*                            Internals                               */
    /* ------------------------------------------------------------------ */

    /// @dev Core piecewise-linear borrow rate. Kept internal so {getBorrowRate} and
    ///      {getSupplyRate} share a single, consistent computation.
    function _borrowRate(uint256 util) internal view returns (uint256) {
        uint256 _kink = kink;

        if (util <= _kink) {
            // Region 1: base + multiplier * U.
            // Multiply first to avoid truncation.
            return baseRatePerBlock + (multiplierPerBlock * util) / WAD;
        }

        // Region 2: base + multiplier * kink + jump * (U - kink).
        // `util > _kink` here, so the subtraction cannot underflow.
        uint256 normalRate = baseRatePerBlock + (multiplierPerBlock * _kink) / WAD;
        uint256 excessUtil = util - _kink;
        return normalRate + (jumpMultiplierPerBlock * excessUtil) / WAD;
    }
}
