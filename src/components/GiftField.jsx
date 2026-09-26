import { Gift } from 'lucide-react';

/**
 * Toggle + address input for sending a mint straight to someone else. Purely
 * controlled by the `gift` object from useGiftRecipient — this component holds
 * no state of its own, so there is exactly one place validity can go stale.
 */
export default function GiftField({ gift, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => gift.setEnabled((v) => !v)}
        className={`btn btn-xs ${gift.enabled ? 'btn-pink' : 'btn-steel'}`}
      >
        <Gift size={12} /> {gift.enabled ? 'GIFTING TO A FRIEND' : 'GIFT TO A FRIEND'}
      </button>
      {gift.enabled && (
        <input
          className={`field !py-[7px] min-w-[220px] flex-1 text-[12px] ${
            gift.address && !gift.valid ? '!border-[var(--pink)]' : ''
          }`}
          placeholder="0x… recipient wallet"
          value={gift.address}
          onChange={(e) => gift.setAddress(e.target.value.trim())}
        />
      )}
    </div>
  );
}
