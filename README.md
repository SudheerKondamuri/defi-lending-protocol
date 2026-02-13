## Lending Risk Engine

A minimal lending protocol prototype focused on risk assessment and liquidation logic. The project includes:

- A lending pool with interest accrual and collateral checks.
- A risk engine that scores positions and enforces borrowing power.
- A liquidation module for undercollateralized positions.
- Mock ERC20 and mock oracle contracts for local testing.

> This repository is a learning and experimentation scaffold. It is **not audited** and should not be used in production.

## Architecture Overview

### Core Contracts

- **LendingPool**: Handles deposits, withdrawals, collateral management, borrowing, repayment, and interest accrual.
  - Collateral ratio: 150%.
  - Liquidation threshold: 120%.
  - Interest model: base rate + utilization-based slopes.
- **RiskEngine**: Computes risk scores, borrowing power, and offers risk analytics (VaR, CVaR, stress tests).
  - Risk score range: 0–1000.
  - Borrowing power scaled by risk score tiers.
- **Liquidation**: Allows full or partial liquidations when a position is unhealthy.
  - Max 50% debt per partial liquidation.
  - Liquidation bonus: 5%.

### Libraries

- **Constants**: Protocol parameters (precision, interest model, risk thresholds, limits).
- **Math**: Utility math helpers (percentages, sqrt, weighted average, etc.).

### Interfaces

- **IERC20**: Standard ERC20 interface.
- **IPriceOracle**: Price oracle interface with staleness checks.

### Mocks

- **MockERC20**: Mintable/burnable ERC20 for testing.
- **MockOracle**: Settable oracle with staleness and historical price storage.

## Key Flows

### Deposit & Borrow

1. User deposits assets to the pool.
2. User deposits collateral.
3. User borrows against collateral if position remains healthy.
4. Interest accrues over time based on utilization.

### Liquidation

1. If collateral value falls below the liquidation threshold, the position becomes liquidatable.
2. A liquidator repays debt and receives collateral plus bonus.

### Risk Assessment

1. RiskEngine calculates a risk score using health factor, utilization, and borrow size.
2. Borrowing power is adjusted by risk tier.
3. High-risk users can be restricted.

## Setup

### Prerequisites

- Foundry (forge/cast/anvil)

Install Foundry:

```shell
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Build

```shell
forge build
```

### Test

```shell
forge test
```

### Format

```shell
forge fmt
```

## Project Structure

```
src/
	core/
		LendingPool.sol
		RiskEngine.sol
		Liquidation.sol
	interfaces/
		IERC20.sol
		IPriceOracle.sol
	libraries/
		Constants.sol
		Math.sol
	mocks/
		MockERC20.sol
		MockOracle.sol
script/
	Deploy.s.sol
test/
	LendingPool.t.sol
	RiskEngine.t.sol
	Liquidation.t.sol
	Invariants.t.sol
```

## Contract Notes & Limitations

- **Access control is not implemented** for administrative functions (e.g., setting oracle or risk parameters).
- **Liquidation execution is stubbed** (the internal `_executeLiquidation` is a placeholder).
- **No production-grade accounting** for reserves, fees, or accrued interest distribution.
- **No asset listing/whitelisting**, pausability, or governance controls.
- **Oracle checks are simplified** in the pool (no staleness validation in core flows).

These are intentional gaps to keep the code focused and easy to explore.

## Security

This project is for educational use only. It has not been audited. Do not use in production or with real funds.

## License

MIT
