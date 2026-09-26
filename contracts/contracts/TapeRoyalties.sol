// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title TapeRoyalties — the resale split for a single tape
 *
 * EIP-2981 names one receiver per token, so splitting a resale between the creator
 * and the platform needs an address that knows whose tape it is. One of these is
 * cloned per tape at publish time (EIP-1167 minimal proxy, ~40k gas, once per
 * release) and named as that tape's royalty receiver.
 *
 * Marketplaces just send ETH here. `release()` books it to the two parties and each
 * withdraws their own — pulled, not pushed, so a recipient whose address reverts on
 * receive cannot block the other from being paid.
 */
contract TapeRoyalties {
    uint16 private constant BPS = 10_000;

    address public creator;
    address public treasury;
    uint16 public platformBps;
    bool private _initialized;

    /// Already split and waiting to be withdrawn.
    mapping(address account => uint256 amount) public pending;
    /// Total booked so far, so `release()` knows what is new.
    uint256 public released;

    event Released(uint256 amount, uint256 toCreator, uint256 toTreasury);
    event Withdrawn(address indexed account, uint256 amount);

    error AlreadyInitialized();
    error ZeroAddress();
    error BadBps();
    error NothingToRelease();
    error NothingToWithdraw();
    error TransferFailed();

    /// @dev Called once by MixTape immediately after cloning.
    function initialize(address creator_, address treasury_, uint16 platformBps_) external {
        if (_initialized) revert AlreadyInitialized();
        if (creator_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        if (platformBps_ > BPS) revert BadBps();
        _initialized = true;
        creator = creator_;
        treasury = treasury_;
        platformBps = platformBps_;
    }

    receive() external payable {}

    /// @notice Book whatever has arrived since the last call. Callable by anyone.
    function release() public {
        uint256 unbooked = address(this).balance - _owed();
        if (unbooked == 0) revert NothingToRelease();

        uint256 toTreasury = (unbooked * platformBps) / BPS;
        uint256 toCreator = unbooked - toTreasury;

        unchecked {
            pending[creator] += toCreator;
            pending[treasury] += toTreasury;
        }
        released += unbooked;

        emit Released(unbooked, toCreator, toTreasury);
    }

    /// @notice Withdraw an account's share. Books any new arrivals first.
    function withdraw(address account) public {
        if (address(this).balance > _owed()) release();

        uint256 amount = pending[account];
        if (amount == 0) revert NothingToWithdraw();
        pending[account] = 0;

        (bool ok, ) = account.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(account, amount);
    }

    function withdraw() external {
        withdraw(msg.sender);
    }

    /// @notice Royalties received but not yet withdrawn.
    function _owed() private view returns (uint256) {
        return pending[creator] + pending[treasury];
    }

    function owed() external view returns (uint256) {
        return _owed();
    }

    /// @notice Balance that `release()` would book right now.
    function releasable() external view returns (uint256) {
        return address(this).balance - _owed();
    }
}
