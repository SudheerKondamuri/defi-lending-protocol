# DeFi Lending Protocol

A production-grade, upgradeable decentralized lending and borrowing protocol built with Solidity, Foundry, React, and Tailwind CSS. The protocol implements dynamic interest rate curves, automated liquidations, and robust Chainlink price registry validation.

## Key Features
- **Collateralized Lending & Borrowing**: Support for WETH and USDC with custom asset configurations (liquidation threshold, bonus, reserve factor).
- **Kinked Interest Rate Curve**: Dynamic, block-based compounding interest rates calculated using a piecewise-linear utilization model.
- **Robust Price Oracle Registry**: Chainlink Price Feed integration with decimal normalization, stale price checks, and heartbeat failsafes.
- **Liquidations**: Secure liquidation mechanism for insolvent positions ($HF < 1.0$) with a liquidation bonus.
- **UUPS Upgradeability**: Contracts are upgradeable via the UUPS proxy pattern to support future optimization and feature additions.
- **Premium Dark UI**: Sleek, glassmorphic React dApp with wallet integration, interactive health factor meters, and comprehensive transaction status notifications.

## Project Structure
- `/contracts`: Core smart contracts, interfaces, mocks, script deployments, and forge tests.
- `/frontend`: Vite React + TypeScript Web3 dApp utilizing Tailwind CSS, Framer Motion, and Wagmi/Viem.
- `docker-compose.yml`: Local multi-container orchestration.
- `ARCHITECTURE.md`: Technical system design and mathematical models.
- `submission.yml`: Automated evaluation configuration.

---

## Getting Started

### 1. Prerequisites
Ensure you have the following installed:
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- [Foundry (Forge/Anvil)](https://book.getfoundry.sh/getting-started/installation)
- [Node.js v18+](https://nodejs.org/)

### 2. Run the Entire System Locally (Docker)
To start the Anvil local blockchain, deploy the contracts, and start the frontend dApp:
```bash
docker-compose up --build
```
Once initialized:
- The frontend will be available at [http://localhost:5173](http://localhost:5173)
- Anvil RPC node will be accessible at `http://127.0.0.1:8545`

### 3. Smart Contracts (Foundry)
Navigate to the `contracts` directory:
```bash
cd contracts
```

#### Compile contracts
```bash
forge build
```

#### Run tests (unit + fuzz + upgrade validation)
```bash
forge test -vvv
```

#### Run static analysis (Slither)
```bash
slither .
```

### 4. Frontend Application (Vite + React)
Navigate to the `frontend` directory:
```bash
cd frontend
```

#### Install dependencies
```bash
npm install
```

#### Compile and run dev server
```bash
npm run dev
```

---

## System Design and Math
For full details on the mathematical models, piecewise interest rate curves, health factor calculations, and security mechanics, please review the [ARCHITECTURE.md](ARCHITECTURE.md) documentation.
