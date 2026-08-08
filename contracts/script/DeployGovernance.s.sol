// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {GovernanceToken} from "../src/core/GovernanceToken.sol";
import {ProtocolGovernor} from "../src/core/ProtocolGovernor.sol";

contract DeployGovernance is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        GovernanceToken token = new GovernanceToken(10_000_000 * 1e18, deployerAddress);
        ProtocolGovernor governor = new ProtocolGovernor(token);

        vm.stopBroadcast();
    }
}
