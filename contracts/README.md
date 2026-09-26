# MIX TAPE OS — contracts

Three contracts behind the MIX TAPE OS world.

| Contract | What it is |
| --- | --- |
| `MixTape.sol` | ERC-721. Cassette releases as numbered editions — copy 7 of 500 is its own token. |
| `TapesToken.sol` | ERC-20 `$TAPES`. Capped, burnable, permit-enabled in-world currency. |
| `Jukebox.sol` | The public queue, and the `$TAPES` sink behind it. |

Solidity 0.8.28, OpenZeppelin 5.1, Hardhat. **73 tests, 99% statement / 100% function coverage.**

## Target chain

Robinhood Chain — Arbitrum Orbit L2, EVM-equivalent, ETH gas token.

```
chainId    4663
RPC        https://rpc.mainnet.chain.robinhood.com   (public, rate-limited)
explorer   https://robinhoodchain.blockscout.com
```

Use a dedicated RPC for real deploys — Alchemy has a Robinhood Chain endpoint. Nothing here is
chain-specific, so the same build deploys to any EVM network by changing one config entry.

> **Check before mainnet:** the build targets the `cancun` EVM (OpenZeppelin 5.1 emits `mcopy`).
> Arbitrum has supported those opcodes since ArbOS 32. If the chain runs something older,
> drop `evmVersion` to `paris` in `hardhat.config.js` and pin OpenZeppelin to `5.0.x`.

## How a tape works

A **tape** is a release. A creator publishes one with an edition size, a price and a rights
category; collectors mint numbered copies.

```
publishTape(editionSize, price, royaltyBps, rights) -> tapeId
mint(tapeId, quantity)                              // to yourself
gift(tapeId, quantity, to)                          // straight to a friend
```

### tokenId packing

```
tokenId = (tapeId << 32) | serial
```

Both halves come back out of the id, so no per-token storage exists at all — minting a copy
writes the ERC-721 ownership slot and the edition counter, nothing else. `tapeIdOf`,
`serialOf` and `tokenIdFor` are pure helpers.

Serials are 1-indexed, so the first copy really is `1 / 500`.

### Metadata

```
tokenURI(tokenId) = {baseURI}{tapeId}/{serial}
```

e.g. `https://api.mixtape.os/tape/1/7`. Your service serves one JSON per copy, so each edition
number can carry its own traits. `BASE_URI` must end with `/`.

`contractURI()` serves collection-level metadata for marketplaces. Royalties are EIP-2981 and
always resolve to the tape's creator.

### Money

Mint proceeds are **never pushed**. They accrue to `pending[]` and are pulled with `withdraw()`.
A creator whose address reverts on receive cannot block anyone else's mint or withdrawal —
there's a test that proves exactly that.

The platform cut and creator royalties are both capped at **10%**, and the cap is not raisable.

## $TAPES

Capped at construction; the cap can never be raised. Issuance goes through `setMinter()`, so
supply is created by contracts you can point at (the launchpad, reward distributors) rather than
minted straight to an EOA. Burnable, because the sinks burn. EIP-2612 permit for one-transaction
spends.

## Jukebox

```
queue(tokenId)                                 // needs a $TAPES approval
queueWithPermit(tokenId, value, deadline, v, r, s)   // one transaction
```

Costs `queuePrice` in `$TAPES`, split between a burn and the treasury by `burnBps` — tune it
from fully deflationary (10000) to fully revenue-generating (0). By default you may only queue a
copy you hold; `setRequireOwnership(false)` opens that up.

**The queue is not stored on-chain.** Each call emits `Queued` with a monotonic position, and the
listening room is rebuilt from the event log. An on-chain array would cost every listener gas to
maintain and would need pruning forever; the log gives the same ordering for free and is already
indexed.

## Running it

```bash
npm install
npm run build          # compile
npm test               # 73 tests
npm run coverage
REPORT_GAS=1 npm test  # gas table
```

## Deploying

```bash
cp .env.example .env   # fill in DEPLOYER_KEY, TREASURY, RPC_URL
npx hardhat run scripts/deploy.js --network robinhood
```

Writes `deployments/<network>.json` with every address and config value. Deploy to
`--network baseSepolia` first if you want a rehearsal on a public testnet.

Then verify:

```bash
npx hardhat verify --network robinhood <address> <constructor args...>
```

### After deploying

1. Point the frontend at the addresses in `deployments/`.
2. Serve metadata at `{baseURI}{tapeId}/{serial}`.
3. Authorise the launchpad: `tapes.setMinter(<launchpad>, true)`.
4. **Move ownership to a multisig** — `transferOwnership()` then `acceptOwnership()` from the
   multisig. All three contracts use two-step transfer, so a typo can't strand them.

## Gas

On an L2 these are cents.

| Action | Gas |
| --- | --- |
| `publishTape` | ~77k |
| `mint` (1 copy) | ~96k |
| `mint` (3 copies) | ~214k |
| `withdraw` | ~33k |
| `queue` | ~120k |
| Deploy `MixTape` | ~2.48M |

## Two deliberate design choices worth confirming

**Publishing is permissionless.** Anyone can call `publishTape` and appear in your contract.
That matches "users create tapes" in the handoff, but it means spam releases are possible and
your indexer/UI is what curates them. If you'd rather gate it, add an allowlist to
`publishTape` — it's a small change, but it is a change.

**The rights category is self-declared.** `Rights.Original | Licensed | Playlist` is recorded
as the creator states it; nothing on-chain verifies a licence exists. The handoff frames these
as conceptual categories, so that's consistent — but it's a takedown/compliance process you own
off-chain, not something the contract enforces.

## Security posture

Built on audited OpenZeppelin bases, with pull payments, `ReentrancyGuard` on every
state-changing external entry point, two-step ownership, capped fees, and a pause that stops
minting **without** trapping tokens or funds (transfers and withdrawals stay open while paused).

These contracts have **not** been audited by a third party. That is the one thing this test suite
cannot substitute for. They hold mint proceeds, so before you put real volume through them, get
an audit — or at minimum start with a low-value release and a multisig owner.
