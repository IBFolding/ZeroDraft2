# MIX TAPE OS — deploy runbook

Everything here has been rehearsed end to end against a local node. The
`contracts/scripts/smoke.js` script drives the exact flows the frontend drives.

---

## 0. Rehearse locally first (5 min, no money)

```bash
cd contracts
npm install
npx hardhat node                                          # terminal 1

# terminal 2
TREASURY=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/smoke.js --network localhost      # publish → mint → gift → queue
```

To drive the real UI against that node, put the printed addresses in `.env.local`
at the repo root with `VITE_CHAIN=localhost`, then `npm run dev`. Import a hardhat
test key into MetaMask and you can click the whole flow.

---

## 0.5 What has and hasn't actually run

Worth knowing before you spend anything, because these are where a first deploy
usually goes wrong:

- **The wagmi → wallet → transaction path has been driven end to end**, not just
  compiled: a local rehearsal signed real transactions through the actual UI (an
  injected wallet whose `eth_sendTransaction` proxies to a real node) for publish,
  mint, gift, reprice, close, fix-metadata and freeze — every write path in the app.
- **`./deploy.sh` itself has been run against a local node**, including the
  zero-balance abort and the "config rejects a placeholder key" guard — not just
  read, run.
- **IPFS pinning has never touched real Pinata.** Newest code, no key ever used
  against it. Publish one tape locally with your key before trusting it on mainnet.
- **Blockscout verification** — `deploy.sh` calls it automatically, but it has
  never actually succeeded against Robinhood Chain's real explorer. If it fails,
  the script prints the retry command; that command itself is untried too.

Deploying costs well under a dollar (see below), so finding a bug and redeploying is
cheap. Finding it *after* someone mints is not — an orphaned first edition cannot be
moved to the new contract.

## 0.6 What a deploy actually costs

Measured against Robinhood Chain mainnet with `scripts/estimate.js`, not guessed:

```bash
npx hardhat run scripts/estimate.js      # re-run any time; costs nothing
```

At 0.051 gwei:

| | Gas | Cost |
| --- | --- | --- |
| Deploy all three contracts | 4.9M | **0.00025 ETH** |
| Publish a tape | 77k | 0.0000039 ETH |
| Mint one copy | 96k | 0.0000049 ETH |
| Queue in the jukebox | 120k | 0.0000061 ETH |

Under a dollar to deploy; about a cent to mint. Cost is not the constraint here.

You do need **ETH bridged to chain 4663** to pay it.

## 0.7 Launch-night order

1. Local rehearsal with MetaMask pointed at the hardhat node — exercises the signing
   path with nothing at risk.
2. Add your Pinata key, publish a tape locally, confirm the CID resolves in a browser.
3. Deploy to mainnet, verify on Blockscout.
4. Publish one **free, single-copy** test tape and mint it yourself.
5. Confirm it renders on OpenSea. **This is the gate** — metadata problems only show
   up here.
6. Only then announce.

## 1. Decide your numbers

| Value | Default | Notes |
| --- | --- | --- |
| `PUBLISH_FEE` | `0` | ETH to publish a tape — "buying a blank". Charged once per release, to you. |
| `PLATFORM_ROYALTY_BPS` | `0` | Your share of each tape's **resale royalty**, in bps *of the royalty*. `3000` = 30% of it. Capped at 5000. |
| `PLATFORM_FEE_BPS` | `500` | Your cut of each primary mint. Hard-capped at 1000. |
| `QUEUE_PRICE` | `100` $TAPES | Cost to queue a tape in the jukebox. |
| `BURN_BPS` | `7000` | Share of queue payments burned; rest to treasury. |
| `TAPES_CAP` | `1000000000` | Total $TAPES that can ever exist. **Cannot be raised.** |

All except the cap are changeable after deploy. `PLATFORM_ROYALTY_BPS` changes apply
to *future* tapes only — a tape's split is fixed at publish, so its terms cannot move
under its creator afterwards.

### The one thing to understand about resale fees

**EIP-2981 royalties are a request, not a rule.** The standard tells a marketplace
what the creator would like paid; it cannot make them pay it. Marketplaces have made
royalties optional, and a plain ERC-721 transfer bypasses them entirely — anyone can
sell a tape peer-to-peer and no royalty is ever triggered.

So your resale cut is real revenue where it is honoured and zero where it is not, and
you do not control which. Enforcing it would mean restricting transfers to approved
marketplaces, which breaks the OpenSea-first posture in the handoff and is hostile to
collectors. Not recommended.

The practical read: `PUBLISH_FEE` is money you actually control — charged by your own
contract, every time, no third party involved. Treat the resale share as upside rather
than the plan.

### Three ways the platform earns

1. **Publish fee** — charged when a creator buys a blank. Reliable.
2. **Primary mint cut** — `PLATFORM_FEE_BPS` of each sale. Reliable, but this is the
   model that did not sustain Sound.xyz.
3. **Resale share** — a slice of each tape's royalty, via its own splitter. Best
   margin, least certain.

## 2. Deploy

One command does the whole thing — checks your `.env`, runs the test suite,
compiles, deploys, verifies on Blockscout, and refreshes the frontend's ABIs:

```bash
cd contracts
cp .env.example .env
# fill in: DEPLOYER_KEY, TREASURY, RPC_URL
./deploy.sh              # Robinhood Chain mainnet (default)
./deploy.sh baseSepolia  # or the testnet, to rehearse with real funds first
./deploy.sh localhost    # or a local node, if one is already running
```

It stops and asks you to type `DEPLOY` before touching a real network, and it
refuses to run at all if the test suite is red. Writes
`contracts/deployments/<network>.json` with every address, constructor
argument and setting, and prints the exact `.env.local` block to paste at the
repo root.

Verification is automatic but best-effort — a brand new contract sometimes
isn't indexed yet, so a failed attempt doesn't fail the deploy. If it doesn't
verify, the script prints the exact retry command:

```bash
npx hardhat verify --network robinhood <address> <constructor args...>
```

Prefer to run each step yourself? `scripts/deploy.js` is the one `deploy.sh`
calls — `npx hardhat run scripts/deploy.js --network robinhood` does the same
thing minus the guard rails.

---

## 3. Point the frontend at it

Create `.env.local` in the repo root from `contracts/deployments/robinhood.json`:

```
VITE_MIXTAPE_ADDRESS=0x...
VITE_TAPES_ADDRESS=0x...
VITE_JUKEBOX_ADDRESS=0x...
VITE_RPC_URL=https://robinhood-mainnet.g.alchemy.com/v2/YOUR_KEY
VITE_DEPLOY_BLOCK=<block number from the deploy tx>
```

`VITE_DEPLOY_BLOCK` matters: My Room scans `Transfer` logs from that block, and
most RPCs cap how far back a single query may reach. Set it or the scan gets slow
and may fail outright.

Until `VITE_MIXTAPE_ADDRESS` is set the site runs in **preview mode** on sample
data, with a banner saying so. That is the safe default — a demo can't be mistaken
for live inventory.

---

## 4. Metadata — IPFS, not a server

**You do not need to run a metadata server.** OpenSea reads metadata, it does not host
it: it calls `tokenURI(tokenId)`, fetches whatever JSON is at that URL and caches it.
If nothing serves that URL, tapes are blank everywhere.

So the Tape Shop pins instead. On publish it draws the tape the creator designed,
pins the PNG and the metadata JSON to IPFS, and stores `ipfs://…` on-chain as that
tape's URI. Nothing to host, nothing to run, no monthly bill until you outgrow
[Pinata's free 1GB](https://pinata.cloud/pricing) — JSON is bytes, art is the bulk,
and a tape's PNG is around 300KB.

The durability difference matters for a collectible: if an API 404s, tapes are blank
forever. If a pin lapses, the CID is content-addressed — you, the creator, or a
collector can re-pin it and it comes back.

### One file per release, not per copy

`tokenURI` returns a tape's own URI for **every copy** of that edition. A 777-copy
edition pins one JSON, not 777. The edition number stays readable on-chain via
`serialOf(tokenId)` and is shown throughout the UI.

### Keys

Creators paste their own Pinata JWT in the Tape Shop (stored in their browser, never
sent to us). Set `VITE_PINATA_JWT` if you'd rather supply one for everybody.

There is no upload endpoint of ours in this design, which means no server key that can
pin on everyone's behalf and nothing of ours to abuse. If you later want creators not
to bring their own key, replace it with a signed-upload endpoint — the contract does
not change.

### The fallback path

A tape published with an empty URI falls back to `{baseURI}{tapeId}/{serial}`. That
leaves room for a service serving per-copy traits later. You only need to build that
if you want it — the IPFS path is complete on its own.

### Frozen metadata

A creator can call `freezeTapeURI(tapeId)` to permanently give up the ability to change
their tape's art. Worth surfacing to collectors: it is the difference between "this art
is guaranteed" and "the creator could swap it".

## 5. Keys, for a one-person project

You are the only operator, so this is not about governance — it is about what happens
if a key is stolen or lost. Worth knowing exactly what an owner key can do, because
the answer is narrower than it looks.

**An owner key cannot touch the money that matters.** Mint proceeds accrue per-address
and are pulled by whoever earned them, so nobody — including you — can redirect
another creator's earnings. It also cannot change a tape's price or metadata (those
are creator-only) or move anyone's NFTs.

**What an owner key can do:**

| Contract | Exposure if the key is stolen |
| --- | --- |
| `TapesToken` | **Mint the entire remaining $TAPES supply.** The real risk. |
| `MixTape` | Redirect *future* platform fees, change the fee (≤10% cap), pause. |
| `Jukebox` | Redirect $TAPES revenue, change price and burn split, pause. |

So the damage is bounded, and concentrated in one contract.

### What actually helps

1. **Own the contracts from a hardware wallet.** Set `OWNER` in `.env` to that address
   and deploy from a throwaway hot key. The key you use day to day then is not the key
   that controls anything. This is the single highest-value step and costs you nothing.

2. **Losing the key is as bad as losing it to someone else.** If it's gone you can
   never unpause, never change the treasury, never authorise a minter. A 2-of-3 Safe
   where *you hold all three keys* in three places is a backup, not a committee — that
   is the only sense in which a "multisig" is worth your time as one person.

3. **Retire the dangerous key when it's done its job.** Once `$TAPES` is distributed
   through the launchpad, call `tapes.renounceOwnership()`. Supply becomes permanently
   fixed and the highest-value key in the system stops existing. You cannot mint more
   after that, so do it deliberately — but if the distribution is final anyway, it
   removes your biggest single point of failure and collectors can verify it.

`MixTape` and `Jukebox` ownership is worth keeping, since pause and treasury are
operationally useful.

## 6. Post-deploy checklist

- [ ] Verify all three contracts on Blockscout
- [ ] `OWNER` is a hardware wallet, not the deploy key
- [ ] Pinata key working — publish a tape and confirm the CID resolves
- [ ] `contractURI()` returns collection metadata
- [ ] Authorise the launchpad: `tapes.setMinter(<launchpad>, true)`
- [ ] **Publish one cheap test tape and mint a copy yourself before announcing**
- [ ] Confirm it renders on OpenSea
- [ ] Update `OPENSEA_URL` in `src/data.js` to the real collection
- [ ] After `$TAPES` distribution: consider `tapes.renounceOwnership()`

## The one thing to weigh

**The contracts are not audited.** 73 tests and 99% coverage say they do what
they're meant to; they cannot say nobody has found something nobody thought to
test for. These hold mint proceeds.

If you're launching before an audit, the cheap mitigations are:

1. First release is **low value** — prove the flow with something you can afford to lose.
2. Owner key on hardware, separate from your deploy key (see above).
3. `pause()` stops minting without trapping anyone's tokens or funds.

None of that substitutes for an audit; it just bounds the damage while you get one.

Worth keeping in proportion: the pull-payment design means a bug in *this* code cannot
drain creator earnings the way a contract holding pooled funds could. The money sits in
per-address balances that only their owner can withdraw.
