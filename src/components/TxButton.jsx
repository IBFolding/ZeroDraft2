import { Loader2, Check, AlertTriangle, ExternalLink } from 'lucide-react';
import { explorerTx } from '../web3/config';

const LABELS = {
  signing: 'CHECK YOUR WALLET',
  confirming: 'CONFIRMING...',
  done: 'DONE',
};

/**
 * A CTA that carries its own transaction state. Keeps the boombox look in every
 * state rather than swapping in a generic spinner.
 */
export default function TxButton({
  tx, onClick, children, icon, className = '', disabled, disabledReason,
}) {
  const { status, busy, hash, error } = tx ?? {};
  const label = LABELS[status];

  return (
    <div className={`w-full ${className}`}>
      <button
        className={`btn w-full !py-5 !text-[clamp(12px,1.7vw,19px)] ${
          status === 'error' ? 'btn-steel' : 'btn-green'
        } ${busy || disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        onClick={onClick}
        disabled={busy || disabled}
      >
        {busy ? <Loader2 size={20} className="animate-spin" />
          : status === 'done' ? <Check size={20} />
          : status === 'error' ? <AlertTriangle size={20} />
          : icon}
        {label || children}
      </button>

      {disabled && disabledReason && (
        <p className="mono mt-2 text-center text-[12px] uppercase tracking-wider text-[var(--dim)]">
          {disabledReason}
        </p>
      )}

      {hash && (
        <a href={explorerTx(hash)} target="_blank" rel="noreferrer"
          className="mono mt-2 flex items-center justify-center gap-2 text-[12px] uppercase tracking-wider text-[var(--cyan)] hover:underline">
          View transaction <ExternalLink size={11} />
        </a>
      )}

      {error && (
        <p className="mono mt-2 break-words border border-[var(--pink)]/40 bg-[var(--pink)]/10 px-3 py-2 text-[12px] text-[var(--pink)]">
          {error}
        </p>
      )}
    </div>
  );
}
