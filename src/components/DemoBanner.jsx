import { Info } from 'lucide-react';
import { isLive, activeChain } from '../web3/config';

/**
 * Says plainly that the world is running on sample data. Without this, a demo of
 * the mock record store is indistinguishable from a live one — which is exactly
 * the kind of thing that gets mistaken for real inventory.
 */
export default function DemoBanner() {
  if (isLive) return null;
  return (
    <div className="flex items-center justify-center gap-3 border-b-2 border-black bg-gradient-to-r from-[#3a0f28] via-[#2a0a1c] to-[#3a0f28] px-4 py-2">
      <Info size={14} className="shrink-0 text-[var(--pink)]" />
      <p className="mono text-center text-[12px] uppercase tracking-[.14em] text-white/80">
        Preview mode — sample tapes, no contracts connected.
        <span className="hidden sm:inline"> Set VITE_MIXTAPE_ADDRESS to go live on {activeChain.name}.</span>
      </p>
    </div>
  );
}
