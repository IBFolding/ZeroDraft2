// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Jukebox — the public queue, and the $TAPES sink behind it
 *
 * Spend $TAPES to put a tape you own into the world's shared queue.
 *
 * The queue itself is not stored on-chain. Each queue call emits Queued with a
 * monotonic position, and the listening room is rebuilt from that event log. An
 * on-chain array would cost every listener gas to maintain and would need pruning
 * forever; the log gives the same ordering for free and is already indexed.
 *
 * Spent tokens are split between a burn and the treasury, so the sink can be tuned
 * from fully deflationary (burnBps = 10000) to fully revenue-generating.
 */
contract Jukebox is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    uint16 public constant BPS = 10_000;

    IERC20 public immutable tapes;
    IERC721 public immutable mixtape;

    /// $TAPES charged per queue.
    uint256 public queuePrice;
    /// Share of each payment that is burned; the remainder goes to the treasury.
    uint16 public burnBps;
    address public treasury;
    /// When true, you may only queue a copy you hold.
    bool public requireOwnership = true;

    /// Monotonic counter — the position a queued tape takes in the room.
    uint256 public queueLength;

    event Queued(
        address indexed listener,
        uint256 indexed tokenId,
        uint256 indexed tapeId,
        uint256 position,
        uint256 paid,
        uint256 burned
    );
    event QueuePriceChanged(uint256 price);
    event BurnBpsChanged(uint16 bps);
    event TreasuryChanged(address treasury);
    event RequireOwnershipChanged(bool required);

    error NotYourTape();
    error ZeroAddress();
    error BadBps();

    constructor(
        address tapes_,
        address mixtape_,
        address treasury_,
        uint256 queuePrice_,
        uint16 burnBps_,
        address owner_
    ) Ownable(owner_) {
        if (tapes_ == address(0) || mixtape_ == address(0) || treasury_ == address(0) || owner_ == address(0)) {
            revert ZeroAddress();
        }
        if (burnBps_ > BPS) revert BadBps();
        tapes = IERC20(tapes_);
        mixtape = IERC721(mixtape_);
        treasury = treasury_;
        queuePrice = queuePrice_;
        burnBps = burnBps_;
    }

    /// @notice Queue a tape you own. Requires a prior $TAPES approval.
    function queue(uint256 tokenId) external {
        _queue(tokenId);
    }

    /**
     * @notice Queue in one transaction, approving $TAPES with an EIP-2612 signature.
     * @dev The permit is allowed to fail: a front-runner can replay the signature to
     *      grief the caller, and an allowance set by any means is equally valid.
     *      The transfer below is what actually enforces payment.
     */
    function queueWithPermit(
        uint256 tokenId,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        try IERC20Permit(address(tapes)).permit(msg.sender, address(this), value, deadline, v, r, s) {} catch {}
        _queue(tokenId);
    }

    function _queue(uint256 tokenId) private nonReentrant whenNotPaused {
        if (requireOwnership && mixtape.ownerOf(tokenId) != msg.sender) revert NotYourTape();

        uint256 price = queuePrice;
        uint256 burned;

        if (price > 0) {
            burned = (price * burnBps) / BPS;
            uint256 toTreasury = price - burned;

            if (burned > 0) {
                // Route through this contract so one approval covers both legs.
                tapes.safeTransferFrom(msg.sender, address(this), burned);
                ERC20Burnable(address(tapes)).burn(burned);
            }
            if (toTreasury > 0) {
                tapes.safeTransferFrom(msg.sender, treasury, toTreasury);
            }
        }

        uint256 position = ++queueLength;
        // Mirrors MixTape's tokenId packing so indexers can group by release.
        emit Queued(msg.sender, tokenId, tokenId >> 32, position, price, burned);
    }

    // ------------------------------------------------------------------ admin

    function setQueuePrice(uint256 price) external onlyOwner {
        queuePrice = price;
        emit QueuePriceChanged(price);
    }

    function setBurnBps(uint16 bps) external onlyOwner {
        if (bps > BPS) revert BadBps();
        burnBps = bps;
        emit BurnBpsChanged(bps);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasuryChanged(treasury_);
    }

    function setRequireOwnership(bool required) external onlyOwner {
        requireOwnership = required;
        emit RequireOwnershipChanged(required);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
