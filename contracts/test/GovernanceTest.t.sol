// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {GovernanceToken} from "../src/core/GovernanceToken.sol";
import {ProtocolGovernor} from "../src/core/ProtocolGovernor.sol";

contract GovernanceTest is Test {
    GovernanceToken public token;
    ProtocolGovernor public governor;

    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);

    function setUp() public {
        vm.startPrank(owner);
        token = new GovernanceToken(1000000 * 10**18, owner);
        governor = new ProtocolGovernor(token);

        token.transfer(user1, 100000 * 10**18);
        token.transfer(user2, 100000 * 10**18);
        vm.stopPrank();

        vm.prank(user1);
        token.delegate(user1);

        vm.prank(user2);
        token.delegate(user2);
    }

    function test_InitialState() public view {
        assertEq(token.name(), "Protocol Token");
        assertEq(token.symbol(), "PRT");
        assertEq(governor.name(), "ProtocolGovernor");
    }

    function test_VotingPower() public {
        vm.roll(block.number + 1);
        assertEq(token.getVotes(user1), 100000 * 10**18);
        assertEq(token.getVotes(user2), 100000 * 10**18);
    }
}
