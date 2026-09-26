// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title $TAPES — the in-world currency of MIX TAPE OS
 *
 * Spent on world actions: queueing a tape in the jukebox, boosting a vending slot,
 * pulling a random tape. Earned back through the arcade and other reward loops.
 *
 * Supply is capped at construction and the cap can never be raised. Issuance is
 * delegated to minter contracts (the launchpad, reward distributors) rather than
 * minted straight to an EOA, so every path that creates supply is itself a
 * contract you can point at and read.
 *
 * Burnable because the sinks burn: see Jukebox.
 */
contract TapesToken is ERC20, ERC20Burnable, ERC20Permit, Ownable2Step {
    /// Hard ceiling on total supply, fixed at deployment.
    uint256 public immutable cap;

    mapping(address account => bool allowed) public isMinter;

    event MinterSet(address indexed account, bool allowed);

    error CapExceeded(uint256 cap, uint256 attempted);
    error NotMinter();
    error ZeroAddress();
    error ZeroCap();

    constructor(string memory name_, string memory symbol_, uint256 cap_, address owner_)
        ERC20(name_, symbol_)
        ERC20Permit(name_)
        Ownable(owner_)
    {
        if (cap_ == 0) revert ZeroCap();
        if (owner_ == address(0)) revert ZeroAddress();
        cap = cap_;
    }

    /// @notice Authorise or revoke a contract that may mint new supply.
    function setMinter(address account, bool allowed) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        isMinter[account] = allowed;
        emit MinterSet(account, allowed);
    }

    /// @notice Mint new supply, up to the cap. Owner or an authorised minter.
    function mint(address to, uint256 amount) external {
        if (msg.sender != owner() && !isMinter[msg.sender]) revert NotMinter();
        uint256 supply = totalSupply();
        if (supply + amount > cap) revert CapExceeded(cap, supply + amount);
        _mint(to, amount);
    }

    /// @notice Supply that has not been issued yet.
    function mintable() external view returns (uint256) {
        return cap - totalSupply();
    }
}
