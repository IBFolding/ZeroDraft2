#!/usr/bin/env bash
#
# One-command deploy for the MIX TAPE OS contracts.
#
#   ./deploy.sh                 deploys to Robinhood Chain mainnet (default)
#   ./deploy.sh baseSepolia     deploys to Base Sepolia testnet instead
#   ./deploy.sh localhost       deploys to a local hardhat node (needs `npm run node` running)
#
# Walks through: checking .env is filled in, installing deps, running the full
# test suite, compiling, deploying, and (on a real network) verifying on the
# block explorer. Stops and asks before spending real money.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

NETWORK="${1:-robinhood}"
REAL_NETWORKS="robinhood baseSepolia"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
red()  { printf '\033[31m%s\033[0m\n' "$1"; }
green(){ printf '\033[32m%s\033[0m\n' "$1"; }

case " $REAL_NETWORKS localhost hardhat " in
  *" $NETWORK "*) ;;
  *)
    red "Unknown network: $NETWORK"
    echo "Expected one of: robinhood, baseSepolia, localhost, hardhat"
    exit 1
    ;;
esac

bold "=== MIX TAPE OS — deploying to $NETWORK ==="
echo

# ---- 1. .env must exist and be filled in -----------------------------------
if [ ! -f .env ]; then
  cp .env.example .env
  red "No .env found — created one from .env.example."
  echo "Open contracts/.env and fill in DEPLOYER_KEY, TREASURY and RPC_URL,"
  echo "then run this script again."
  exit 1
fi

# shellcheck disable=SC1091
set -a; source .env; set +a

is_real_key() { [[ "${1:-}" =~ ^0x[0-9a-fA-F]{64}$ ]]; }

if [[ " $REAL_NETWORKS " == *" $NETWORK "* ]]; then
  MISSING=()
  if [ -z "${TREASURY:-}" ] || [ "${TREASURY:-}" = "0x..." ]; then
    MISSING+=("TREASURY")
  fi
  if [ "${#MISSING[@]}" -gt 0 ]; then
    red "Missing or unfilled in .env: ${MISSING[*]}"
    echo "Edit contracts/.env and set these, then run this script again."
    exit 1
  fi
fi

# ---- 1b. private key — from .env if it's really there, otherwise ask --------
# Either way this stays local: nothing here uploads or transmits the key
# anywhere except signing the deploy transaction itself.
if [[ " $REAL_NETWORKS " == *" $NETWORK "* ]]; then
  if is_real_key "${DEPLOYER_KEY:-}"; then
    bold "Using DEPLOYER_KEY from .env"
  else
    echo "DEPLOYER_KEY in .env is missing or still the placeholder."
    echo "You can paste it here instead — hidden input, kept only in memory:"
    read -rs -p "Paste deployer private key (0x..., input hidden): " DEPLOYER_KEY
    echo
    if ! is_real_key "${DEPLOYER_KEY:-}"; then
      red "That doesn't look like a private key (expected 0x + 64 hex chars)."
      exit 1
    fi
    export DEPLOYER_KEY
    trap 'unset DEPLOYER_KEY' EXIT
  fi
  echo
fi

# ---- 2. install deps if needed ----------------------------------------------
if [ ! -d node_modules ]; then
  bold "Installing dependencies..."
  npm install
  echo
fi

# ---- 3. show who's deploying and what it costs, before doing anything -------
bold "Checking the deployer account..."
npx hardhat run scripts/check-balance.js --network "$NETWORK"
echo

if [[ " $REAL_NETWORKS " == *" $NETWORK "* ]]; then
  bold "Estimated cost on $NETWORK (live gas price, nothing spent yet):"
  npx hardhat run scripts/estimate.js --network "$NETWORK" 2>&1 | grep -v "^◇" || true
  echo
fi

# ---- 4. tests — a red suite should never reach mainnet ----------------------
bold "Running the test suite..."
npm test
echo

# ---- 5. compile --------------------------------------------------------------
bold "Compiling..."
npm run build
echo

# ---- 6. confirm before spending real money ----------------------------------
if [[ " $REAL_NETWORKS " == *" $NETWORK "* ]]; then
  red "About to deploy to $NETWORK. This spends real ETH and cannot be undone."
  read -r -p "Type DEPLOY to continue: " CONFIRM
  if [ "$CONFIRM" != "DEPLOY" ]; then
    echo "Cancelled — nothing was deployed."
    exit 1
  fi
  echo
fi

# ---- 7. deploy (also verifies on real networks; see scripts/deploy.js) ------
bold "Deploying..."
npm run deploy -- --network "$NETWORK"
echo

# ---- 8. refresh the frontend's copy of the ABIs -----------------------------
bold "Refreshing frontend ABIs..."
npm run export-abis
echo

green "Done. Addresses are in contracts/deployments/$NETWORK.json"
echo "Paste the VITE_* block printed above into .env.local at the repo root, then:"
echo "  npm run dev"
