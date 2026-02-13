//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Constants
 * @notice Protocol-wide constants
 */
library Constants {
    // Precision
    uint256 internal constant PRECISION = 1e18;
    uint256 internal constant PERCENTAGE_FACTOR = 1e4; // For percentages with 2 decimals

    // Time constants
    uint256 internal constant SECONDS_PER_YEAR = 365 days;
    uint256 internal constant SECONDS_PER_DAY = 1 days;

    // Interest rate model parameters
    uint256 internal constant BASE_INTEREST_RATE = 2e16; // 2% base rate
    uint256 internal constant SLOPE1 = 4e16; // 4% slope below optimal
    uint256 internal constant SLOPE2 = 75e16; // 75% slope above optimal
    uint256 internal constant OPTIMAL_UTILIZATION = 80e16; // 80% optimal utilization

    // Risk parameters
    uint256 internal constant DEFAULT_COLLATERAL_RATIO = 150; // 150%
    uint256 internal constant DEFAULT_LIQUIDATION_THRESHOLD = 120; // 120%
    uint256 internal constant DEFAULT_LIQUIDATION_PENALTY = 5; // 5%
    uint256 internal constant MIN_HEALTH_FACTOR = 1e18; // 1.0

    // Limits
    uint256 internal constant MAX_UTILIZATION_RATE = 95e16; // 95%
    uint256 internal constant MIN_BORROW_AMOUNT = 1e18; // 1 token minimum
    uint256 internal constant MAX_BORROW_AMOUNT = 1e24; // 1M tokens maximum

    // Oracle parameters
    uint256 internal constant PRICE_STALENESS_THRESHOLD = 1 hours;
    uint256 internal constant MAX_PRICE_DEVIATION = 10e16; // 10% max price change

    // Protocol fees
    uint256 internal constant RESERVE_FACTOR = 10; // 10% of interest to reserves
    uint256 internal constant PROTOCOL_FEE = 5; // 0.05% protocol fee

    // Liquidation parameters
    uint256 internal constant MAX_LIQUIDATION_CLOSE_FACTOR = 50; // 50% max liquidation
    uint256 internal constant LIQUIDATION_BONUS_MIN = 5; // 5% min bonus
    uint256 internal constant LIQUIDATION_BONUS_MAX = 15; // 15% max bonus

    // Risk scores
    uint256 internal constant RISK_SCORE_PRECISION = 1000;
    uint256 internal constant HIGH_RISK_SCORE = 750;
    uint256 internal constant MEDIUM_RISK_SCORE = 500;
    uint256 internal constant LOW_RISK_SCORE = 250;
}
