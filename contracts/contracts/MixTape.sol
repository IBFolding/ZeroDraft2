// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {TapeRoyalties} from "./TapeRoyalties.sol";

/**
 * @title MIX TAPE OS — cassette tapes as numbered ERC-721 editions
 *
 * A "tape" is a release: a creator publishes one, sets an edition size and a price,
 * and collectors mint numbered copies of it. Every copy is its own ERC-721 token, so
 * copy 7 of 500 has its own tokenId, its own metadata and its own marketplace page.
 *
 * tokenId packing
 *   tokenId = (tapeId << 32) | serial
 * Both halves are recoverable from the id alone, so the contract stores no per-token
 * data at all. Minting a copy writes one storage slot (ERC-721 ownership) plus the
 * edition counter — the serial and its parent tape are free.
 *
 * Money
 *   Mint proceeds are never pushed. They accrue to `pending[]` and are pulled with
 *   withdraw(), so a creator with a reverting receiver can't brick other people's mints.
 */
contract MixTape is ERC721, IERC2981, Ownable2Step, ReentrancyGuard, Pausable {
    using Strings for uint256;

    /// How the underlying music is cleared. Declared by the creator at publish time.
    enum Rights {
        Original,  // creator owns / made the recording
        Licensed,  // cleared with the rights holder
        Playlist   // references externally playable tracks
    }

    struct Tape {
        address creator;      // receives proceeds and royalties
        uint96 price;         // wei per copy; 0 is a legitimate free mint
        uint32 editionSize;   // immutable cap on copies
        uint32 minted;        // copies minted so far
        uint16 royaltyBps;    // creator's secondary royalty
        Rights rights;
        bool closed;          // creator stopped the mint early
        bool uriFrozen;       // creator gave up the right to change metadata
    }

    /// Per-tape metadata URI. Empty falls back to the contract-wide baseURI.
    mapping(uint256 tapeId => string) private _tapeURI;

    /// Per-tape resale split, named as that tape's EIP-2981 receiver.
    mapping(uint256 tapeId => address) public royaltySplitter;

    uint256 private constant SERIAL_BITS = 32;
    uint256 private constant SERIAL_MASK = (1 << SERIAL_BITS) - 1;

    uint16 public constant BPS = 10_000;
    /// Ceiling on both the platform cut and creator royalties. Not raisable.
    uint16 public constant MAX_BPS = 1_000; // 10%
    /// Bounds the gas of a single mint call.
    uint32 public constant MAX_PER_MINT = 50;
    /**
     * Ceiling on the platform's share of a resale royalty. This is a share *of the
     * royalty*, not of the sale price, so MAX_BPS would be the wrong unit — a
     * platform taking 30% of a 7.5% royalty is 2.25% of the sale. Capped at half so
     * a creator always keeps the majority of their own resale royalty.
     */
    uint16 public constant MAX_PLATFORM_ROYALTY_BPS = 5_000;

    uint256 public nextTapeId = 1;
    mapping(uint256 tapeId => Tape) private _tapes;

    /// Withdrawable balances: creators' mint proceeds and the platform's cut.
    mapping(address account => uint256 amount) public pending;

    address public treasury;
    uint16 public platformFeeBps;

    /// Charged to publish a tape — "buying a blank". Paid to the treasury.
    uint256 public publishFee;
    /// The platform's share of each tape's resale royalty.
    uint16 public platformRoyaltyBps;
    /// Implementation the per-tape splitters are cloned from.
    address public immutable royaltiesImplementation;

    string public baseURI;
    string public contractURI; // collection-level metadata for marketplaces

    event TapePublished(
        uint256 indexed tapeId,
        address indexed creator,
        uint32 editionSize,
        uint96 price,
        Rights rights
    );
    event TapeMinted(
        uint256 indexed tapeId,
        address indexed to,
        uint256 indexed tokenId,
        uint32 serial,
        uint256 paid
    );
    event TapeClosed(uint256 indexed tapeId);
    event TapeURIChanged(uint256 indexed tapeId, string uri);
    event TapeURIFrozen(uint256 indexed tapeId);
    event TapePriceChanged(uint256 indexed tapeId, uint96 price);
    event Withdrawn(address indexed account, uint256 amount);
    event TreasuryChanged(address treasury);
    event PlatformFeeChanged(uint16 bps);
    event PublishFeeChanged(uint256 fee);
    event PlatformRoyaltyChanged(uint16 bps);
    event RoyaltySplitterCreated(uint256 indexed tapeId, address splitter);
    event BaseURIChanged(string baseURI);
    event ContractURIChanged(string contractURI);

    error NoSuchTape();
    error EditionSoldOut();
    error MintClosed();
    error BadQuantity();
    error WrongPayment(uint256 expected, uint256 sent);
    error NotTapeCreator();
    error ZeroAddress();
    error FeeTooHigh();
    error EmptyEdition();
    error NothingToWithdraw();
    error TransferFailed();
    error URIFrozen();
    error WrongPublishFee(uint256 expected, uint256 sent);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        string memory contractURI_,
        address treasury_,
        uint16 platformFeeBps_,
        address owner_
    ) ERC721(name_, symbol_) Ownable(owner_) {
        if (treasury_ == address(0) || owner_ == address(0)) revert ZeroAddress();
        if (platformFeeBps_ > MAX_BPS) revert FeeTooHigh();
        baseURI = baseURI_;
        contractURI = contractURI_;
        treasury = treasury_;
        platformFeeBps = platformFeeBps_;
        royaltiesImplementation = address(new TapeRoyalties());
    }

    // ---------------------------------------------------------------- tokenId

    function tapeIdOf(uint256 tokenId) public pure returns (uint256) {
        return tokenId >> SERIAL_BITS;
    }

    function serialOf(uint256 tokenId) public pure returns (uint32) {
        return uint32(tokenId & SERIAL_MASK);
    }

    function tokenIdFor(uint256 tapeId, uint32 serial) public pure returns (uint256) {
        return (tapeId << SERIAL_BITS) | serial;
    }

    // ---------------------------------------------------------------- publish

    /**
     * @notice Publish a tape. Anyone may publish; the caller becomes its creator.
     * @param editionSize Hard cap on copies. Immutable once set.
     * @param price       Wei per copy. May be zero.
     * @param royaltyBps  Creator's EIP-2981 royalty, capped at MAX_BPS.
     * @param uri         Metadata for every copy of this tape, ideally an ipfs:// URI so
     *                    it outlives any server. Empty falls back to the global baseURI.
     */
    function publishTape(
        uint32 editionSize,
        uint96 price,
        uint16 royaltyBps,
        Rights rights,
        string calldata uri
    )
        external
        payable
        whenNotPaused
        returns (uint256 tapeId)
    {
        if (editionSize == 0) revert EmptyEdition();
        if (royaltyBps > MAX_BPS) revert FeeTooHigh();

        uint256 fee = publishFee;
        if (msg.value != fee) revert WrongPublishFee(fee, msg.value);
        if (fee > 0) {
            unchecked { pending[treasury] += fee; }
        }

        tapeId = nextTapeId++;
        _tapes[tapeId] = Tape({
            creator: msg.sender,
            price: price,
            editionSize: editionSize,
            minted: 0,
            royaltyBps: royaltyBps,
            rights: rights,
            closed: false,
            uriFrozen: false
        });

        // Each tape gets its own receiver so a resale can be attributed and split.
        address splitter = Clones.clone(royaltiesImplementation);
        TapeRoyalties(payable(splitter)).initialize(msg.sender, treasury, platformRoyaltyBps);
        royaltySplitter[tapeId] = splitter;
        emit RoyaltySplitterCreated(tapeId, splitter);

        if (bytes(uri).length > 0) {
            _tapeURI[tapeId] = uri;
            emit TapeURIChanged(tapeId, uri);
        }

        emit TapePublished(tapeId, msg.sender, editionSize, price, rights);
    }

    /// @notice Reprice unminted copies. Already-minted copies are unaffected.
    function setTapePrice(uint256 tapeId, uint96 price) external {
        Tape storage t = _tapes[tapeId];
        if (t.creator == address(0)) revert NoSuchTape();
        if (t.creator != msg.sender) revert NotTapeCreator();
        t.price = price;
        emit TapePriceChanged(tapeId, price);
    }

    /// @notice Repoint this tape's metadata. Blocked once frozen.
    function setTapeURI(uint256 tapeId, string calldata uri) external {
        Tape storage t = _tapes[tapeId];
        if (t.creator == address(0)) revert NoSuchTape();
        if (t.creator != msg.sender) revert NotTapeCreator();
        if (t.uriFrozen) revert URIFrozen();
        _tapeURI[tapeId] = uri;
        emit TapeURIChanged(tapeId, uri);
    }

    /**
     * @notice Permanently give up the ability to change this tape's metadata.
     * @dev Collectors can verify a tape's art can never be swapped out from under them.
     */
    function freezeTapeURI(uint256 tapeId) external {
        Tape storage t = _tapes[tapeId];
        if (t.creator == address(0)) revert NoSuchTape();
        if (t.creator != msg.sender) revert NotTapeCreator();
        t.uriFrozen = true;
        emit TapeURIFrozen(tapeId);
    }

    /// @notice End the mint early. Permanent — the remaining supply is never mintable.
    function closeTape(uint256 tapeId) external {
        Tape storage t = _tapes[tapeId];
        if (t.creator == address(0)) revert NoSuchTape();
        if (t.creator != msg.sender) revert NotTapeCreator();
        t.closed = true;
        emit TapeClosed(tapeId);
    }

    // ------------------------------------------------------------------- mint

    /// @notice Mint copies of a tape to yourself.
    function mint(uint256 tapeId, uint32 quantity) external payable {
        _mintCopies(tapeId, quantity, msg.sender);
    }

    /// @notice Mint copies straight to someone else — the gifting flow.
    function gift(uint256 tapeId, uint32 quantity, address to) external payable {
        if (to == address(0)) revert ZeroAddress();
        _mintCopies(tapeId, quantity, to);
    }

    function _mintCopies(uint256 tapeId, uint32 quantity, address to)
        private
        nonReentrant
        whenNotPaused
    {
        Tape storage t = _tapes[tapeId];
        address creator = t.creator;
        if (creator == address(0)) revert NoSuchTape();
        if (t.closed) revert MintClosed();
        if (quantity == 0 || quantity > MAX_PER_MINT) revert BadQuantity();

        uint32 already = t.minted;
        uint32 editionSize = t.editionSize;
        // Checked arithmetic: `already + quantity` cannot silently wrap past the cap.
        if (already + quantity > editionSize) revert EditionSoldOut();

        uint256 due = uint256(t.price) * quantity;
        // Exact payment only. Refunding change would mean sending ETH mid-mint.
        if (msg.value != due) revert WrongPayment(due, msg.value);

        t.minted = already + quantity;

        // Split before minting so the accounting is settled even if a receiver
        // re-enters through onERC721Received.
        if (due > 0) {
            uint256 fee = (due * platformFeeBps) / BPS;
            unchecked {
                if (fee > 0) pending[treasury] += fee;
                pending[creator] += due - fee;
            }
        }

        for (uint32 i = 0; i < quantity; ++i) {
            uint32 serial = already + i + 1; // serials are 1-indexed: 1 of 500
            uint256 tokenId = tokenIdFor(tapeId, serial);
            _safeMint(to, tokenId);
            emit TapeMinted(tapeId, to, tokenId, serial, t.price);
        }
    }

    // -------------------------------------------------------------- withdraw

    /// @notice Pull your accrued proceeds. Anyone may trigger a withdrawal for `account`.
    function withdraw(address account) public nonReentrant {
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

    // ------------------------------------------------------------------ views

    function getTape(uint256 tapeId) external view returns (Tape memory) {
        Tape memory t = _tapes[tapeId];
        if (t.creator == address(0)) revert NoSuchTape();
        return t;
    }

    /// @notice Copies still available, accounting for an early close.
    function remaining(uint256 tapeId) external view returns (uint32) {
        Tape memory t = _tapes[tapeId];
        if (t.creator == address(0)) revert NoSuchTape();
        if (t.closed) return 0;
        return t.editionSize - t.minted;
    }

    /**
     * @dev A tape's own URI wins, shared by every copy of that edition — one pinned
     *      file per release rather than one per copy, which is what makes a 777-copy
     *      edition practical to put on IPFS. Falling back to `{baseURI}{tapeId}/{serial}`
     *      leaves room for a service that wants to serve per-copy traits instead.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory own = _tapeURI[tapeIdOf(tokenId)];
        if (bytes(own).length > 0) return own;

        return string.concat(
            baseURI,
            tapeIdOf(tokenId).toString(),
            "/",
            uint256(serialOf(tokenId)).toString()
        );
    }

    /// @notice This tape's metadata URI, or "" when it falls back to the baseURI.
    function tapeURI(uint256 tapeId) external view returns (string memory) {
        return _tapeURI[tapeId];
    }

    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        returns (address receiver, uint256 amount)
    {
        uint256 tapeId = tapeIdOf(tokenId);
        Tape memory t = _tapes[tapeId];
        if (t.creator == address(0)) revert NoSuchTape();
        // The splitter forwards the creator's share and keeps the platform's.
        return (royaltySplitter[tapeId], (salePrice * t.royaltyBps) / BPS);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }

    // ------------------------------------------------------------------ admin

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasuryChanged(treasury_);
    }

    function setPlatformFee(uint16 bps) external onlyOwner {
        if (bps > MAX_BPS) revert FeeTooHigh();
        platformFeeBps = bps;
        emit PlatformFeeChanged(bps);
    }

    /// @notice Set what it costs to publish a tape. Applies to future publishes only.
    function setPublishFee(uint256 fee) external onlyOwner {
        publishFee = fee;
        emit PublishFeeChanged(fee);
    }

    /**
     * @notice Set the platform's share of resale royalties.
     * @dev Applies to tapes published after this call; existing splitters keep the
     *      share they were created with, so a tape's terms cannot change under its
     *      creator after the fact.
     */
    function setPlatformRoyalty(uint16 bps) external onlyOwner {
        if (bps > MAX_PLATFORM_ROYALTY_BPS) revert FeeTooHigh();
        platformRoyaltyBps = bps;
        emit PlatformRoyaltyChanged(bps);
    }

    function setBaseURI(string calldata baseURI_) external onlyOwner {
        baseURI = baseURI_;
        emit BaseURIChanged(baseURI_);
    }

    function setContractURI(string calldata contractURI_) external onlyOwner {
        contractURI = contractURI_;
        emit ContractURIChanged(contractURI_);
    }

    /// @notice Halt publishing and minting. Transfers and withdrawals stay open.
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
