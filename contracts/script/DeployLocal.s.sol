// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {InterestRateModel} from "../src/core/InterestRateModel.sol";
import {PriceOracleRegistry} from "../src/oracles/PriceOracleRegistry.sol";
import {LendingPool} from "../src/core/LendingPool.sol";
import {ILendingPool} from "../src/interfaces/ILendingPool.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockChainlinkAggregator} from "../src/mocks/MockChainlinkAggregator.sol";
import {GovernanceToken} from "../src/core/GovernanceToken.sol";
import {ProtocolGovernor} from "../src/core/ProtocolGovernor.sol";

/// @title DeployLocal
/// @notice Deploy script for local Anvil network, deploying mock tokens, price feeds, and governance.
contract DeployLocal is Script {
    uint256 constant BLOCKS_PER_YEAR = 2_102_400;

    function run() external {
        uint256 deployerPrivateKey =
            vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Mock Tokens
        MockERC20 weth = new MockERC20("Wrapped Ether", "WETH", 18);
        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        console.log("Mock WETH deployed at:", address(weth));
        console.log("Mock USDC deployed at:", address(usdc));

        // 2. Deploy Mock Price Feeds
        MockChainlinkAggregator ethFeed = new MockChainlinkAggregator(8, 2000e8); // $2000
        MockChainlinkAggregator usdcFeed = new MockChainlinkAggregator(8, 1e8); // $1
        console.log("Mock ETH Feed deployed at:", address(ethFeed));
        console.log("Mock USDC Feed deployed at:", address(usdcFeed));

        // 3. Deploy Interest Rate Model
        uint256 baseRatePerBlock = (2e18) / BLOCKS_PER_YEAR;
        uint256 multiplierPerBlock = (20e18) / BLOCKS_PER_YEAR;
        uint256 jumpMultiplierPerBlock = (200e18) / BLOCKS_PER_YEAR;
        uint256 kink = 0.8e18;

        InterestRateModel irm =
            new InterestRateModel(deployer, baseRatePerBlock, multiplierPerBlock, jumpMultiplierPerBlock, kink);
        console.log("InterestRateModel deployed at:", address(irm));

        // 4. Deploy Price Oracle Registry
        PriceOracleRegistry oracleRegistry = new PriceOracleRegistry(deployer);
        console.log("PriceOracleRegistry deployed at:", address(oracleRegistry));

        // Set feeds with generous heartbeat for local testing (1 year)
        oracleRegistry.setPriceFeed(address(weth), address(ethFeed), 31536000);
        oracleRegistry.setPriceFeed(address(usdc), address(usdcFeed), 31536000);

        // 5. Deploy Lending Pool
        LendingPool implementation = new LendingPool();
        bytes memory initData =
            abi.encodeWithSelector(LendingPool.initialize.selector, deployer, address(oracleRegistry), address(irm));
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        LendingPool pool = LendingPool(address(proxy));
        console.log("LendingPool Proxy deployed at:", address(proxy));

        // 6. Register Assets in Lending Pool
        pool.addAsset(
            address(weth),
            ILendingPool.AssetConfig({
                liquidationThreshold: 0.85e18,
                liquidationBonus: 0.05e18,
                reserveFactor: 0.1e18,
                decimals: 18,
                isActive: true
            })
        );

        pool.addAsset(
            address(usdc),
            ILendingPool.AssetConfig({
                liquidationThreshold: 0.9e18,
                liquidationBonus: 0.05e18,
                reserveFactor: 0.1e18,
                decimals: 6,
                isActive: true
            })
        );

        // 7. Seed initial pool liquidity from deployer so borrowing has liquidity ready
        weth.mint(deployer, 50e18);
        weth.approve(address(pool), 50e18);
        pool.deposit(address(weth), 50e18);

        usdc.mint(deployer, 100_000e6);
        usdc.approve(address(pool), 100_000e6);
        pool.deposit(address(usdc), 100_000e6);
        console.log("Seeded initial pool liquidity (50 WETH, 100,000 USDC)");

        // 8. Deploy Governance Token & Governor
        GovernanceToken govToken = new GovernanceToken(10_000_000e18, deployer);
        ProtocolGovernor governor = new ProtocolGovernor(govToken);
        console.log("GovernanceToken deployed at:", address(govToken));
        console.log("ProtocolGovernor deployed at:", address(governor));

        // Mint mock tokens to standard test account (Alice) for testing
        // Alice on Anvil is: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
        address alice = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        weth.mint(alice, 100e18);
        usdc.mint(alice, 100_000e6);
        govToken.transfer(alice, 100_000e18);
        govToken.delegate(deployer);
        console.log("Minted mock WETH, USDC, and PRT to Alice");

        // Seed sample proposals
        address[] memory targets = new address[](1);
        targets[0] = address(pool);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = "";

        governor.propose(
            targets,
            values,
            calldatas,
            "PIP-1: Upgrade WETH Liquidation Threshold to 88%\nIncrease capital efficiency for ETH collateral while maintaining safety margins."
        );

        governor.propose(
            targets,
            values,
            calldatas,
            "PIP-2: Onboard LINK as Collateral Asset\nAdd Chainlink LINK market with 75% LTV and 80% liquidation threshold."
        );
        console.log("Created sample DAO governance proposals (PIP-1, PIP-2)");

        vm.stopBroadcast();
        console.log("Deployment complete!");
    }
}
