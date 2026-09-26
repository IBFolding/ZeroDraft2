import { useState } from 'react';
import { ExternalLink, Lock, ShieldAlert } from 'lucide-react';
import { Panel } from './ui';
import TxButton from './TxButton';
import {
  useCreatedTapes, useTapeURI, useSetTapePrice, useCloseTape, useSetTapeURI, useFreezeTapeURI,
} from '../web3/hooks';
import { ipfsToHttp } from '../web3/ipfs';

/**
 * Tape management for the wallet's own releases: reprice, close the edition, fix
 * metadata, or freeze it. Everything here maps to a MixTape function that already
 * exists on-chain but had no UI — publishing a tape was a one-way trip until now.
 */
export default function CreatorTapes({ address }) {
  const { tapes, isLoading } = useCreatedTapes(address);

  if (!address) return null;

  return (
    <Panel title="⚙ MY RELEASES" tone="pink" bodyClass="!p-2">
      {isLoading && (
        <p className="mono px-2 py-4 text-center text-[12px] uppercase tracking-wider text-[var(--dim)]">
          Reading your releases…
        </p>
      )}
      {!isLoading && tapes.length === 0 && (
        <p className="mono px-2 py-4 text-center text-[12px] uppercase tracking-wider text-[var(--dim)]">
          You haven't published a tape yet.
        </p>
      )}
      <div className="space-y-2">
        {tapes.map((tape) => <CreatorTapeRow key={tape.id} tape={tape} />)}
      </div>
    </Panel>
  );
}

function CreatorTapeRow({ tape }) {
  const [open, setOpen] = useState(false);
  const [priceInput, setPriceInput] = useState(tape.price);
  const [uriInput, setUriInput] = useState('');
  const [confirmFreeze, setConfirmFreeze] = useState(false);

  const { uri: currentUri } = useTapeURI(tape.id);
  const priceTx = useSetTapePrice();
  const closeTx = useCloseTape();
  const uriTx = useSetTapeURI();
  const freezeTx = useFreezeTapeURI();

  const startUriEdit = () => { setUriInput(currentUri); setOpen('uri'); };

  return (
    <div className="border border-white/10 bg-white/[.02] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="mono text-[13px] text-white">TAPE #{tape.id}</span>
          <span className="mono ml-2 text-[11px] uppercase tracking-wider text-[var(--dim)]">
            {tape.minted} / {tape.editionSize} minted · {tape.rights}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {tape.closed && <span className="chip pink">CLOSED</span>}
          {tape.uriFrozen && <span className="chip green"><Lock size={9} className="inline -mt-[1px]" /> FROZEN</span>}
          <span className="mono text-[13px] text-white">{tape.price} ETH</span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button className="btn btn-steel btn-xs" onClick={() => setOpen(open === 'price' ? null : 'price')}>
          REPRICE
        </button>
        <button
          className="btn btn-steel btn-xs disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => setOpen(open === 'close' ? null : 'close')}
          disabled={tape.closed}
        >
          CLOSE EDITION
        </button>
        <button
          className="btn btn-steel btn-xs disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => (open === 'uri' ? setOpen(null) : startUriEdit())}
          disabled={tape.uriFrozen}
        >
          FIX METADATA
        </button>
        <button
          className="btn btn-steel btn-xs disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => setOpen(open === 'freeze' ? null : 'freeze')}
          disabled={tape.uriFrozen}
        >
          FREEZE METADATA
        </button>
        {currentUri && (
          <a href={ipfsToHttp(currentUri)} target="_blank" rel="noreferrer"
            className="mono ml-auto flex items-center gap-1 text-[11px] uppercase tracking-wider text-[var(--cyan)] hover:underline">
            VIEW METADATA <ExternalLink size={11} />
          </a>
        )}
      </div>

      {open === 'price' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          <input
            className="field !py-[7px] w-32 text-[12px]"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
          />
          <span className="mono text-[11px] text-[var(--dim)]">ETH per copy — unminted copies only</span>
          <div className="w-full sm:w-auto sm:flex-1">
            <TxButton tx={priceTx} onClick={() => priceTx.setPrice(tape.id, priceInput)}>
              UPDATE PRICE
            </TxButton>
          </div>
        </div>
      )}

      {open === 'close' && (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          <p className="mono flex items-start gap-2 text-[11px] uppercase leading-snug text-[var(--pink)]">
            <ShieldAlert size={14} className="mt-[1px] shrink-0" />
            Permanent. The remaining {tape.editionSize - tape.minted} copies can never be minted after this.
          </p>
          <TxButton tx={closeTx} onClick={() => closeTx.close(tape.id)}>
            CONFIRM CLOSE
          </TxButton>
        </div>
      )}

      {open === 'uri' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          <input
            className="field !py-[7px] min-w-[220px] flex-1 text-[12px]"
            placeholder="ipfs://…"
            value={uriInput}
            onChange={(e) => setUriInput(e.target.value)}
          />
          <div className="w-full sm:w-auto sm:flex-1">
            <TxButton tx={uriTx} onClick={() => uriTx.setUri(tape.id, uriInput)}>
              UPDATE METADATA
            </TxButton>
          </div>
        </div>
      )}

      {open === 'freeze' && (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          <p className="mono flex items-start gap-2 text-[11px] uppercase leading-snug text-[var(--pink)]">
            <ShieldAlert size={14} className="mt-[1px] shrink-0" />
            Permanent. You will never be able to change this tape's art or metadata
            again, for any reason.
          </p>
          <label className="mono flex items-center gap-2 text-[11px] uppercase tracking-wider text-white">
            <input type="checkbox" checked={confirmFreeze} onChange={(e) => setConfirmFreeze(e.target.checked)} />
            I understand this cannot be undone
          </label>
          <TxButton
            tx={freezeTx}
            onClick={() => freezeTx.freeze(tape.id)}
            disabled={!confirmFreeze}
          >
            FREEZE PERMANENTLY
          </TxButton>
        </div>
      )}
    </div>
  );
}
