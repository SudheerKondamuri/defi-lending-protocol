// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {InterestRateModel} from "../src/core/InterestRateModel.sol";
import {PriceOracleRegistry} from "../src/oracles/PriceOracleRegistry.sol";
import {LendingPool} from "../src/core/LendingPool.sol";
import {ILendingPool} from "../src/interfaces/ILendingPool.sol";

/// @title Deploy
/// @notice Foundry deployment script for the DeFi Lending Protocol.
/// @dev Deploys InterestRateModel, PriceOracleRegistry, and LendingPool (via UUPS proxy).
contract Deploy is Script {
    /// @dev Approximate blocks per year on Ethereum (~12s block time).
    uint256 constant BLOCKS_PER_YEAR = 2_102_400;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // ----- 1. Deploy InterestRateModel -----
        // Parameters (annualized):
        //   Base rate:       2% per year  => 2e18 / BLOCKS_PER_YEAR ≈ 0.951e12 per block
        //   Multiplier:      20% per year => 20e18 / BLOCKS_PER_YEAR ≈ 9.512e12 per block
        //   Jump multiplier: 200% per year => 200e18 / BLOCKS_PER_YEAR ≈ 95.12e12 per block
        //   Kink:            80% utilization = 0.8e18
        uint256 baseRatePerBlock = (2e18) / BLOCKS_PER_YEAR;
        uint256 multiplierPerBlock = (20e18) / BLOCKS_PER_YEAR;
        uint256 jumpMultiplierPerBlock = (200e18) / BLOCKS_PER_YEAR;
        uint256 kink = 0.8e18;

        InterestRateModel irm =
            new InterestRateModel(deployer, baseRatePerBlock, multiplierPerBlock, jumpMultiplierPerBlock, kink);
        console.log("InterestRateModel deployed at:", address(irm));

        // ----- 2. Deploy PriceOracleRegistry -----
        PriceOracleRegistry oracleRegistry = new PriceOracleRegistry(deployer);
        console.log("PriceOracleRegistry deployed at:", address(oracleRegistry));

        // ----- 3. Deploy LendingPool (UUPS proxy) -----
        LendingPool implementation = new LendingPool();
        console.log("LendingPool implementation deployed at:", address(implementation));

        bytes memory initData =
            abi.encodeWithSelector(LendingPool.initialize.selector, deployer, address(oracleRegistry), address(irm));

        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        LendingPool pool = LendingPool(address(proxy));
        console.log("LendingPool proxy deployed at:", address(proxy));

        // ----- 4. Register assets -----
        // WETH config: 85% LT, 5% bonus, 10% reserve factor, 18 decimals
        pool.addAsset(
            vm.envAddress("WETH_ADDRESS"),
            ILendingPool.AssetConfig({
                liquidationThreshold: 0.85e18,
                liquidationBonus: 0.05e18,
                reserveFactor: 0.1e18,
                decimals: 18,
                isActive: true
            })
        );

        // USDC config: 90% LT, 5% bonus, 10% reserve factor, 6 decimals
        pool.addAsset(
            vm.envAddress("USDC_ADDRESS"),
            ILendingPool.AssetConfig({
                liquidationThreshold: 0.9e18,
                liquidationBonus: 0.05e18,
                reserveFactor: 0.1e18,
                decimals: 6,
                isActive: true
            })
        );

        vm.stopBroadcast();

        console.log("Deployment complete!");
    }
}
