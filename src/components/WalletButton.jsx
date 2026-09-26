import { Wallet, LogOut, AlertTriangle } from 'lucide-react';
import { useWallet } from '../web3/hooks';
import { activeChain } from '../web3/config';

/** The nav's Connect Wallet control, once it is actually wired to a wallet. */
export default function WalletButton() {
  const w = useWallet();

  if (!w.hasWallet) {
    return (
      <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="nav-link">
        <Wallet size={14} /> GET A WALLET
      </a>
    );
  }

  if (!w.isConnected) {
    return (
      <button className="nav-link" onClick={w.connect} disabled={w.isConnecting}>
        <Wallet size={14} /> {w.isConnecting ? 'CONNECTING…' : 'CONNECT WALLET'}
      </button>
    );
  }

  if (w.wrongChain) {
    return (
      <button className="nav-link !bg-gradient-to-b !from-[#ff77c4] !to-[#ff1e96] !text-[#12000a]"
        onClick={w.switchToActive}>
        <AlertTriangle size={14} /> SWITCH TO {activeChain.name.toUpperCase()}
      </button>
    );
  }

  return (
    <button className="nav-link group" onClick={w.disconnect} title="Disconnect">
      <Wallet size={14} className="text-[var(--green)]" />
      <span className="text-left leading-tight">
        <span className="block">{w.short}</span>
        {w.balance && <span className="mono block text-[9px] text-[var(--dim)]">{w.balance}</span>}
      </span>
      <LogOut size={12} className="opacity-0 transition group-hover:opacity-70" />
    </button>
  );
}
