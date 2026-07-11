// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {InterestRateModel} from "../src/core/InterestRateModel.sol";

/// @title InterestRateModelTest
/// @notice Comprehensive tests for the kinked interest rate model.
contract InterestRateModelTest is Test {
    InterestRateModel public model;

    uint256 constant WAD = 1e18;

    // Parameters: annualized rates converted to per-block
    // ~2,102,400 blocks/year (12s block time)
    uint256 constant BLOCKS_PER_YEAR = 2_102_400;
    uint256 constant BASE_RATE = (2e18) / BLOCKS_PER_YEAR; // ~2% annual
    uint256 constant MULTIPLIER = (20e18) / BLOCKS_PER_YEAR; // ~20% annual
    uint256 constant JUMP_MULTIPLIER = (200e18) / BLOCKS_PER_YEAR; // ~200% annual
    uint256 constant KINK = 0.8e18; // 80% utilization

    function setUp() public {
        model = new InterestRateModel(address(this), BASE_RATE, MULTIPLIER, JUMP_MULTIPLIER, KINK);
    }

    /* ------------------------------------------------------------------ */
    /*                      Utilization Rate Tests                        */
    /* ------------------------------------------------------------------ */

    function test_utilizationRate_ZeroPercent() public view {
        // No borrows => 0% utilization
        uint256 util = model.utilizationRate(1000e18, 0, 0);
        assertEq(util, 0, "Utilization should be 0 when no borrows");
    }

    function test_utilizationRate_FiftyPercent() public view {
        // borrows = 500, liquidity = 500, reserves = 0
        // U = 500 / (500 + 500 - 0) = 0.5e18
        uint256 util = model.utilizationRate(500e18, 500e18, 0);
        assertEq(util, 0.5e18, "Utilization should be 50%");
    }

    function test_utilizationRate_AtKink() public view {
        // borrows = 800, liquidity = 200, reserves = 0
        // U = 800 / (200 + 800 - 0) = 0.8e18
        uint256 util = model.utilizationRate(200e18, 800e18, 0);
        assertEq(util, 0.8e18, "Utilization should be 80% (kink)");
    }

    function test_utilizationRate_NinetyPercent() public view {
        // borrows = 900, liquidity = 100, reserves = 0
        // U = 900 / (100 + 900) = 0.9e18
        uint256 util = model.utilizationRate(100e18, 900e18, 0);
        assertEq(util, 0.9e18, "Utilization should be 90%");
    }

    function test_utilizationRate_HundredPercent() public view {
        // borrows = 1000, liquidity = 0, reserves = 0
        // U = 1000 / (0 + 1000) = 1e18
        uint256 util = model.utilizationRate(0, 1000e18, 0);
        assertEq(util, WAD, "Utilization should be 100%");
    }

    function test_utilizationRate_WithReserves() public view {
        // borrows = 500, liquidity = 500, reserves = 100
        // U = 500 / (500 + 500 - 100) = 500/900
        uint256 util = model.utilizationRate(500e18, 500e18, 100e18);
        uint256 expected = (500e18 * WAD) / 900e18;
        assertEq(util, expected, "Utilization with reserves");
    }

    function test_utilizationRate_ZeroDenominator() public view {
        // totalSupply <= totalReserves => 0
        uint256 util = model.utilizationRate(0, 0, 100e18);
        assertEq(util, 0, "Utilization should be 0 when denominator is zero");
    }

    /* ------------------------------------------------------------------ */
    /*                        Borrow Rate Tests                           */
    /* ------------------------------------------------------------------ */

    function test_borrowRate_BelowKink() public view {
        // At 50% utilization (below 80% kink)
        // rate = baseRate + multiplier * 0.5
        uint256 rate = model.getBorrowRate(500e18, 500e18, 0);
        uint256 expected = BASE_RATE + (MULTIPLIER * 0.5e18) / WAD;
        assertEq(rate, expected, "Borrow rate below kink");
    }

    function test_borrowRate_AtKink() public view {
        // At 80% utilization (exactly at kink)
        // rate = baseRate + multiplier * 0.8
        uint256 rate = model.getBorrowRate(200e18, 800e18, 0);
        uint256 expected = BASE_RATE + (MULTIPLIER * 0.8e18) / WAD;
        assertEq(rate, expected, "Borrow rate at kink");
    }

    function test_borrowRate_AboveKink() public view {
        // At 90% utilization (above kink)
        // rate = baseRate + multiplier * kink + jumpMultiplier * (0.9 - 0.8)
        uint256 rate = model.getBorrowRate(100e18, 900e18, 0);
        uint256 normalRate = BASE_RATE + (MULTIPLIER * KINK) / WAD;
        uint256 excessUtil = 0.1e18;
        uint256 expected = normalRate + (JUMP_MULTIPLIER * excessUtil) / WAD;
        assertEq(rate, expected, "Borrow rate above kink");
    }

    function test_borrowRate_AtZeroUtilization() public view {
        // At 0% utilization
        // rate = baseRate
        uint256 rate = model.getBorrowRate(1000e18, 0, 0);
        assertEq(rate, BASE_RATE, "Borrow rate at 0% util should be base rate");
    }

    function test_borrowRate_AtFullUtilization() public view {
        // At 100% utilization
        // rate = baseRate + multiplier * kink + jumpMultiplier * (1.0 - 0.8)
        uint256 rate = model.getBorrowRate(0, 1000e18, 0);
        uint256 normalRate = BASE_RATE + (MULTIPLIER * KINK) / WAD;
        uint256 excessUtil = 0.2e18;
        uint256 expected = normalRate + (JUMP_MULTIPLIER * excessUtil) / WAD;
        assertEq(rate, expected, "Borrow rate at 100% utilization");
    }

    /* ------------------------------------------------------------------ */
    /*                        Supply Rate Tests                           */
    /* ------------------------------------------------------------------ */

    function test_supplyRate() public view {
        // At 50% utilization, 10% reserve factor
        // supplyRate = borrowRate * U * (1 - reserveFactor) / WAD^2
        uint256 reserveFactor = 0.1e18;
        uint256 rate = model.getSupplyRate(500e18, 500e18, 0, reserveFactor);

        uint256 borrowRate = model.getBorrowRate(500e18, 500e18, 0);
        uint256 util = 0.5e18;
        uint256 expected = (borrowRate * util * (WAD - reserveFactor)) / (WAD * WAD);

        assertEq(rate, expected, "Supply rate calculation");
    }

    function test_supplyRate_ZeroReserveFactor() public view {
        // At 50% utilization, 0% reserve factor
        uint256 rate = model.getSupplyRate(500e18, 500e18, 0, 0);
        uint256 borrowRate = model.getBorrowRate(500e18, 500e18, 0);
        uint256 util = 0.5e18;
        uint256 expected = (borrowRate * util * WAD) / (WAD * WAD);
        assertEq(rate, expected, "Supply rate with zero reserve factor");
    }

    function test_supplyRate_FullReserveFactor() public view {
        // At 50% utilization, 100% reserve factor => supply rate = 0
        uint256 rate = model.getSupplyRate(500e18, 500e18, 0, WAD);
        assertEq(rate, 0, "Supply rate should be 0 with 100% reserve factor");
    }

    /* ------------------------------------------------------------------ */
    /*                      Parameter Validation Tests                    */
    /* ------------------------------------------------------------------ */

    function test_revert_BaseRateOutOfBounds() public {
        vm.expectRevert(
            abi.encodeWithSelector(InterestRateModel.ParameterOutOfBounds.selector, "baseRatePerBlock", WAD + 1, WAD)
        );
        new InterestRateModel(address(this), WAD + 1, MULTIPLIER, JUMP_MULTIPLIER, KINK);
    }

    function test_revert_MultiplierOutOfBounds() public {
        vm.expectRevert(
            abi.encodeWithSelector(InterestRateModel.ParameterOutOfBounds.selector, "multiplierPerBlock", WAD + 1, WAD)
        );
        new InterestRateModel(address(this), BASE_RATE, WAD + 1, JUMP_MULTIPLIER, KINK);
    }

    function test_revert_JumpMultiplierOutOfBounds() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                InterestRateModel.ParameterOutOfBounds.selector, "jumpMultiplierPerBlock", WAD + 1, WAD
            )
        );
        new InterestRateModel(address(this), BASE_RATE, MULTIPLIER, WAD + 1, KINK);
    }

    function test_revert_KinkZero() public {
        vm.expectRevert(abi.encodeWithSelector(InterestRateModel.ParameterOutOfBounds.selector, "kink", 0, WAD));
        new InterestRateModel(address(this), BASE_RATE, MULTIPLIER, JUMP_MULTIPLIER, 0);
    }

    function test_revert_KinkAboveWad() public {
        vm.expectRevert(abi.encodeWithSelector(InterestRateModel.ParameterOutOfBounds.selector, "kink", WAD + 1, WAD));
        new InterestRateModel(address(this), BASE_RATE, MULTIPLIER, JUMP_MULTIPLIER, WAD + 1);
    }

    function test_setParams_UpdatesValues() public {
        uint256 newBase = BASE_RATE * 2;
        uint256 newMultiplier = MULTIPLIER * 2;
        uint256 newJump = JUMP_MULTIPLIER * 2;
        uint256 newKink = 0.9e18;

        model.setParams(newBase, newMultiplier, newJump, newKink);

        assertEq(model.baseRatePerBlock(), newBase);
        assertEq(model.multiplierPerBlock(), newMultiplier);
        assertEq(model.jumpMultiplierPerBlock(), newJump);
        assertEq(model.kink(), newKink);
    }

    function test_revert_setParams_NotOwner() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        model.setParams(BASE_RATE, MULTIPLIER, JUMP_MULTIPLIER, KINK);
    }

    /* ------------------------------------------------------------------ */
    /*                           Fuzz Tests                               */
    /* ------------------------------------------------------------------ */

    /// @notice Fuzz test: getBorrowRate should never revert for any valid inputs.
    function testFuzz_borrowRateNeverReverts(uint256 liquidity, uint256 borrows, uint256 reserves) public view {
        // Bound inputs to realistic ranges to avoid overflows
        liquidity = bound(liquidity, 0, type(uint128).max);
        borrows = bound(borrows, 0, type(uint128).max);
        reserves = bound(reserves, 0, liquidity + borrows);

        // This should never revert
        model.getBorrowRate(liquidity, borrows, reserves);
    }

    /// @notice Fuzz test: utilization rate should be between 0 and 1e18 when reserves are 0.
    function testFuzz_utilizationRateBounded(uint256 liquidity, uint256 borrows) public view {
        liquidity = bound(liquidity, 0, type(uint128).max);
        borrows = bound(borrows, 0, type(uint128).max);

        uint256 util = model.utilizationRate(liquidity, borrows, 0);
        assertLe(util, WAD, "Utilization rate should not exceed 100% when reserves are 0");
    }

    /// @notice Fuzz test: supply rate should always be <= borrow rate.
    function testFuzz_supplyRateLeBorrowRate(uint256 liquidity, uint256 borrows, uint256 reserveFactor) public view {
        liquidity = bound(liquidity, 0, type(uint128).max);
        borrows = bound(borrows, 0, type(uint128).max);
        reserveFactor = bound(reserveFactor, 0, WAD);

        uint256 supplyRate = model.getSupplyRate(liquidity, borrows, 0, reserveFactor);
        uint256 borrowRate = model.getBorrowRate(liquidity, borrows, 0);

        assertLe(supplyRate, borrowRate, "Supply rate should not exceed borrow rate");
    }
}
