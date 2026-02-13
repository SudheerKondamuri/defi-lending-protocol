//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Math
 * @notice Mathematical utility functions
 */
library Math {
    /**
     * @notice Returns the smallest of two numbers
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    /**
     * @notice Returns the largest of two numbers
     */
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }

    /**
     * @notice Returns the average of two numbers
     */
    function average(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a + b) / 2;
    }

    /**
     * @notice Calculate percentage of a value
     * @param value The value to calculate percentage of
     * @param percentage The percentage (scaled by 100)
     * @return uint256 The result
     */
    function percentageOf(
        uint256 value,
        uint256 percentage
    ) internal pure returns (uint256) {
        return (value * percentage) / 100;
    }

    /**
     * @notice Calculate percentage with precision
     * @param value The value
     * @param numerator The numerator
     * @param denominator The denominator
     * @return uint256 The result
     */
    function mulDiv(
        uint256 value,
        uint256 numerator,
        uint256 denominator
    ) internal pure returns (uint256) {
        require(denominator > 0, "Division by zero");
        return (value * numerator) / denominator;
    }

    /**
     * @notice Safe multiplication with overflow check
     */
    function safeMul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) return 0;
        uint256 c = a * b;
        require(c / a == b, "Multiplication overflow");
        return c;
    }

    /**
     * @notice Safe division with zero check
     */
    function safeDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "Division by zero");
        return a / b;
    }

    /**
     * @notice Calculate compound interest
     * @param principal Principal amount
     * @param rate Interest rate per period (scaled by 1e18)
     * @param periods Number of compounding periods
     * @return uint256 Final amount
     */
    function compoundInterest(
        uint256 principal,
        uint256 rate,
        uint256 periods
    ) internal pure returns (uint256) {
        if (periods == 0) return principal;

        uint256 result = principal;
        uint256 ratePerPeriod = rate;

        for (uint256 i = 0; i < periods; i++) {
            result = (result * (1e18 + ratePerPeriod)) / 1e18;
        }

        return result;
    }

    /**
     * @notice Calculate simple interest
     * @param principal Principal amount
     * @param rate Interest rate (scaled by 1e18)
     * @param time Time period
     * @return uint256 Interest amount
     */
    function simpleInterest(
        uint256 principal,
        uint256 rate,
        uint256 time
    ) internal pure returns (uint256) {
        return (principal * rate * time) / 1e18;
    }

    /**
     * @notice Calculate square root using Babylonian method
     * @param x Value to get square root of
     * @return uint256 Square root
     */
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;

        uint256 z = (x + 1) / 2;
        uint256 y = x;

        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }

        return y;
    }

    /**
     * @notice Calculate absolute difference between two numbers
     */
    function absDiff(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : b - a;
    }

    /**
     * @notice Check if value is within a percentage range of target
     * @param value The value to check
     * @param target The target value
     * @param percentage The acceptable percentage deviation
     * @return bool True if within range
     */
    function isWithinPercentage(
        uint256 value,
        uint256 target,
        uint256 percentage
    ) internal pure returns (bool) {
        uint256 diff = absDiff(value, target);
        uint256 maxDiff = (target * percentage) / 100;
        return diff <= maxDiff;
    }

    /**
     * @notice Calculate weighted average
     * @param values Array of values
     * @param weights Array of weights
     * @return uint256 Weighted average
     */
    function weightedAverage(
        uint256[] memory values,
        uint256[] memory weights
    ) internal pure returns (uint256) {
        require(values.length == weights.length, "Arrays length mismatch");
        require(values.length > 0, "Empty arrays");

        uint256 sum = 0;
        uint256 weightSum = 0;

        for (uint256 i = 0; i < values.length; i++) {
            sum += values[i] * weights[i];
            weightSum += weights[i];
        }

        require(weightSum > 0, "Zero weight sum");
        return sum / weightSum;
    }
}
