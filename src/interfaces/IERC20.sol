//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IERC20
 * @notice Standard ERC20 interface
 */
interface IERC20 {
    /**
     * @notice Returns the amount of tokens in existence
     */
    function totalSupply() external view returns (uint256);

    /**
     * @notice Returns the amount of tokens owned by `account`
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @notice Moves `amount` tokens from the caller's account to `recipient`
     */
    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool);

    /**
     * @notice Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner`
     */
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    /**
     * @notice Sets `amount` as the allowance of `spender` over the caller's tokens
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @notice Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    /**
     * @notice Returns the number of decimals used to get its user representation
     */
    function decimals() external view returns (uint8);

    /**
     * @notice Returns the name of the token
     */
    function name() external view returns (string memory);

    /**
     * @notice Returns the symbol of the token
     */
    function symbol() external view returns (string memory);

    /**
     * @notice Emitted when `value` tokens are moved from one account to another
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @notice Emitted when the allowance of a `spender` for an `owner` is set
     */
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}
