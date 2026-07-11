// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockERC20
/// @notice A simple ERC20 token with public mint for testing purposes.
/// @dev Supports configurable decimals to test USDC (6) vs WETH (18) scenarios.
contract MockERC20 is ERC20 {
    uint8 private immutable _decimals;

    /// @notice Deploys a mock ERC20 with configurable name, symbol, and decimals.
    /// @param name_     Token name.
    /// @param symbol_   Token symbol.
    /// @param decimals_ Number of decimals (e.g. 18 for WETH, 6 for USDC).
    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        _decimals = decimals_;
    }

    /// @notice Returns the number of decimals used by this token.
    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /// @notice Mints `amount` tokens to `to`. Unrestricted for testing.
    /// @param to     Recipient address.
    /// @param amount Amount of tokens to mint.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice Burns `amount` tokens from `from`. Unrestricted for testing.
    /// @param from   Address to burn from.
    /// @param amount Amount of tokens to burn.
    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}
