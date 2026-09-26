import { useState } from 'react';
import { SkipBack, SkipForward, Play, Pause, Heart, Shuffle, Repeat } from 'lucide-react';
import { NOW_PLAYING } from '../data';
import { Eq } from './ui';

/* Persistent player — visual only, no audio wired up yet. */
export default function MiniPlayer({ variant = 'bar' }) {
  const [playing, setPlaying] = useState(true);
  const t = NOW_PLAYING;

  if (variant === 'panel') {
    return (
      <div className="lcd">
        <div className="mono text-[11px] uppercase tracking-[.22em] text-[var(--green)]/70">Now playing:</div>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <div className="mono text-[19px] leading-tight text-white">{t.title}</div>
            <div className="mono text-[12px] text-[var(--dim)]">by {t.artist}</div>
          </div>
          <Heart size={18} className="shrink-0 text-[var(--pink)]" fill="currentColor" />
        </div>
        <div className="mt-3 flex items-end justify-between gap-4">
          <Eq bars={10} height={26} />
          <span className="mono text-[12px] text-[var(--green)]">{t.elapsed} / {t.total}</span>
        </div>
        <div className="mt-3 h-2 border border-black bg-black/70">
          <div className="h-full bg-[var(--pink)]" style={{ width: '56%', boxShadow: '0 0 12px var(--pink)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="metal fixed bottom-0 left-0 right-0 z-[150] flex flex-wrap items-center gap-4 px-4 py-2">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-14 shrink-0 place-items-center border-2 border-black bg-gradient-to-b from-[#ff77c4] to-[#ff1e96]">
          <span className="flex gap-2">
            <span className="h-3 w-3 rounded-full border border-black bg-[#12000a]" />
            <span className="h-3 w-3 rounded-full border border-black bg-[#12000a]" />
          </span>
        </span>
        <span className="leading-tight">
          <span className="mono block text-[13px] text-white">{t.title}</span>
          <span className="mono block text-[11px] text-[var(--dim)]">by {t.artist}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button className="transport !h-9 !w-14" aria-label="previous"><SkipBack size={16} /></button>
        <button className={`transport !h-9 !w-14 ${playing ? 'on' : ''}`} onClick={() => setPlaying((p) => !p)} aria-label="play/pause">
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button className="transport !h-9 !w-14" aria-label="next"><SkipForward size={16} /></button>
        <button className="transport !h-9 !w-11" aria-label="shuffle"><Shuffle size={14} /></button>
        <button className="transport !h-9 !w-11" aria-label="repeat"><Repeat size={14} /></button>
      </div>

      <div className="flex flex-1 items-center gap-3">
        <span className="mono text-[12px] text-[var(--green)]">{t.elapsed}</span>
        <span className="h-2 flex-1 border border-black bg-black/70">
          <span className="block h-full bg-[var(--pink)]" style={{ width: '56%', boxShadow: '0 0 12px var(--pink)' }} />
        </span>
        <span className="mono text-[12px] text-[var(--dim)]">{t.total}</span>
      </div>

      <Eq bars={7} height={22} />
      <span className="mono hidden text-[11px] uppercase tracking-[.2em] text-[var(--dim)] xl:block">
        Good music · better people
      </span>
    </div>
  );
}
