import { WORLD, OPENSEA_URL } from '../data';
import WalletButton from './WalletButton';
import {
  Home as HomeIcon, Disc3, Globe, FileText,
  Heart, ExternalLink,
} from 'lucide-react';

/* ---------- custom icons (brand shapes lucide doesn't carry) ---------- */

export function CassetteIcon({ size = 18, className = '', ...rest }) {
  return (
    <svg width={size} height={size * 0.68} viewBox="0 0 32 22" fill="none"
      stroke="currentColor" strokeWidth="2" className={className} aria-hidden {...rest}>
      <rect x="1" y="1" width="30" height="20" rx="2" />
      <circle cx="11" cy="11" r="3.4" />
      <circle cx="21" cy="11" r="3.4" />
      <path d="M11 14.4h10" />
    </svg>
  );
}

export function EjectIcon({ size = 20, className = '', ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"
      className={className} aria-hidden {...rest}>
      <path d="M12 4 3.5 14h17L12 4Z" />
      <rect x="3.5" y="16.5" width="17" height="3.2" />
    </svg>
  );
}

/* ---------- tiny primitives ---------- */

export function Rivets() {
  return (
    <>
      <span className="rivet tl" /><span className="rivet tr" />
      <span className="rivet bl" /><span className="rivet br" />
    </>
  );
}

export function Eq({ bars = 8, height = 34, colors = ['#b6ff2e', '#ff2fa0'] }) {
  return (
    <div className="eq" style={{ height }}>
      {Array.from({ length: bars }).map((_, i) => (
        <i key={i} style={{
          background: colors[i % colors.length],
          boxShadow: `0 0 8px ${colors[i % colors.length]}`,
          animationDelay: `${(i * 0.13).toFixed(2)}s`,
          animationDuration: `${1 + (i % 4) * 0.22}s`,
        }} />
      ))}
    </div>
  );
}

export function Panel({ title, tone = 'steel', right, children, className = '', bodyClass = '' }) {
  return (
    <section className={`panel metal ${className}`}>
      <header className={`panel-head ${tone === 'pink' ? 'pink' : tone === 'green' ? 'green' : ''}`}>
        <span>{title}</span>
        {right}
      </header>
      <div className={`panel-body ${bodyClass}`}>{children}</div>
    </section>
  );
}

export function WinPanel({ title, children, className = '', bodyClass = '' }) {
  return (
    <section className={`panel metal ${className}`}>
      <header className="panel-head" style={{ background: 'linear-gradient(180deg,#d8dde4,#9aa2ae)' }}>
        <span>+ {title}</span>
        <span className="win-btns">
          <span className="win-btn">_</span><span className="win-btn">▢</span><span className="win-btn">✕</span>
        </span>
      </header>
      <div className={`panel-body ${bodyClass}`}>{children}</div>
    </section>
  );
}

export function Sticky({ children, tone = 'kraft', tilt = 'l', className = '', style }) {
  return (
    <div
      className={`sticky ${tone === 'hot' ? 'hot' : ''} ${tilt === 'l' ? 'tilt-l' : 'tilt-r'} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function Scribble({ children, tone = '', className = '', style }) {
  return <p className={`scribble ${tone} ${className}`} style={style}>{children}</p>;
}

/* ---------- cassette (CSS drawn) ---------- */

export function CassetteBig({ title = 'MIX TAPE', shell = '#ff2fa0', labelBg, side = 'A', minutes = '120', stickers = [] }) {
  return (
    <div className="cassette" style={{ background: `linear-gradient(180deg,${shell}22,#0c0d11)`, borderColor: '#000' }}>
      <Rivets />
      <div className="label" style={labelBg ? { background: labelBg } : undefined}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mono text-xs tracking-widest text-[#12000a]">♛</div>
            <h3 className="display break-words text-[#0f0a0d]"
              style={{ fontSize: 'clamp(24px,9cqw,52px)', lineHeight: 1.05, textShadow: '0 2px 0 rgba(255,255,255,.35)' }}>
              {title}
            </h3>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-black bg-[#b6ff2e] text-base">🙂</span>
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="shrink-0 border-2 border-black bg-[#f6f3ea] px-2 py-1 text-center">
            <div className="pixel text-[10px] text-black">{side}</div>
            <div className="mono text-[9px] leading-tight text-black">{minutes}<br />MIN</div>
          </div>
          {stickers.length > 0 && (
            <div className="flex flex-wrap items-end justify-center gap-1 text-xl leading-none">
              {stickers.map((g, i) => (
                <span key={i} style={{ transform: `rotate(${((i * 37) % 31) - 15}deg)` }}>{g}</span>
              ))}
            </div>
          )}
          <div className="mono shrink-0 text-[10px] uppercase tracking-widest text-[#2a0a1c]">A new kind of music world</div>
        </div>
      </div>
      <div className="window">
        <span className="reel" />
        <span className="tape-ribbon" />
        <span className="reel" style={{ animationDirection: 'reverse' }} />
      </div>
      <div className="mt-2 flex items-center justify-center gap-2 border-t border-white/10 pt-2">
        <Globe size={12} className="text-white/60" />
        <span className="mono text-[10px] uppercase tracking-[.22em] text-white/60">Mix Tape OS</span>
      </div>
    </div>
  );
}

export function TapeCard({ tape, onBuy, showNew, busy }) {
  const soldOut = tape.soldOut;
  return (
    <article className="metal group relative flex flex-col gap-2 rounded-sm p-2">
      <div className="relative overflow-hidden border-2 border-black bg-black">
        <img src={tape.art} alt={tape.title} loading="lazy"
          className={`h-[168px] w-full object-cover transition group-hover:scale-105 ${soldOut ? 'opacity-45 grayscale' : ''}`} />
        {showNew && !soldOut && <span className="tag-new absolute right-1 top-1">NEW</span>}
        {soldOut && (
          <span className="pixel absolute inset-x-0 top-1/2 -translate-y-1/2 bg-black/80 py-2 text-center text-[9px] text-[var(--pink)]">
            SOLD OUT
          </span>
        )}
      </div>
      <div className="min-h-[34px]">
        <h4 className="mono truncate text-[13px] leading-tight text-white">{tape.title}</h4>
        <p className="mono truncate text-[11px] uppercase tracking-wider text-[var(--dim)]">by {tape.artist}</p>
      </div>
      <div className="flex items-center justify-between gap-1">
        <span className="chip">{tape.edition}</span>
        {tape.rights && <span className="chip pink !text-[9px]">{tape.rights}</span>}
      </div>
      <div className="mono text-[12px] leading-tight">
        <div className="text-white">{tape.eth} ETH</div>
        {tape.usd && <div className="neon-green text-[11px]">{tape.usd} USDG</div>}
      </div>
      <div className="flex items-center gap-2">
        <button
          className={`btn btn-green btn-xs flex-1 ${soldOut || busy ? 'cursor-not-allowed opacity-50' : ''}`}
          onClick={onBuy}
          disabled={soldOut || busy}
        >
          <CassetteIcon size={13} /> {busy ? '…' : soldOut ? 'GONE' : 'BUY'}
        </button>
        <button className="grid h-7 w-7 place-items-center border border-black bg-white/5 text-[var(--pink)]" aria-label="favourite">
          <Heart size={12} />
        </button>
      </div>
    </article>
  );
}

/* ---------- navigation ---------- */

const ICONS = { home: HomeIcon, tape: CassetteIcon, disc: Disc3, globe: Globe, file: FileText };

export function TopNav({ route, go }) {
  const links = [
    { route: 'home', label: 'HOME', icon: 'home' },
    { route: 'tape-shop', label: 'TAPE SHOP', icon: 'tape' },
    { route: 'record-store', label: 'RECORD STORE', icon: 'disc' },
    { route: 'jukebox', label: 'WORLD', icon: 'globe' },
    { route: 'about', label: 'ABOUT', icon: 'file' },
  ];
  return (
    <nav className="topnav">
      <button onClick={() => go('home')} className="flex items-center gap-3 pr-3">
        <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-white/70 text-white">
          <Globe size={22} />
        </span>
        <span className="text-left">
          <span className="display block text-[19px] leading-none">MIX TAPE OS</span>
          <span className="mono block text-[10px] uppercase tracking-[.26em] text-[var(--dim)]">A world for music people</span>
        </span>
      </button>

      <div className="flex flex-1 flex-wrap items-center gap-2">
        {links.map((l) => {
          const Icon = ICONS[l.icon];
          return (
            <button key={l.route} onClick={() => go(l.route)}
              className={`nav-link ${route === l.route ? 'active' : ''}`}>
              <Icon size={14} /> {l.label}
            </button>
          );
        })}
      </div>

      <div className="metal flex items-center gap-4 rounded-sm px-4 py-2">
        <span>
          <span className="display block text-[15px] leading-none neon-green">$TAPES</span>
          <span className="mono block text-[10px] uppercase tracking-[.16em] text-[var(--dim)]">Music fuels worlds</span>
        </span>
        <Eq bars={5} height={26} />
      </div>

      <WalletButton />
    </nav>
  );
}

export function WorldNav({ active, go }) {
  return (
    <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-3 lg:grid-cols-6">
      {WORLD.map((w) => (
        <button key={w.id} onClick={() => go(w.route)}
          className={`world-tile text-left ${active === w.route ? 'active' : ''}`}>
          <span className="cap">{w.label} <span>→</span></span>
          <img className="art" src={w.art} alt={w.label} loading="lazy" />
        </button>
      ))}
    </div>
  );
}

export function SiteFooter({ quote }) {
  return (
    <footer className="footer-strip">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🌍</span>
        <span className="mono text-[13px] uppercase leading-tight tracking-[.12em] text-white">
          A more<br />human internet
        </span>
      </div>

      <div className="footer-quote max-w-md">
        {quote[0]}
        {quote[1] && <div className="mt-1 text-[12px] text-white/60">{quote[1]}</div>}
      </div>

      <div className="flex flex-wrap items-center gap-7">
        <span className="flex items-center gap-2">
          <span className="text-2xl">🌺</span>
          <span className="mono text-[12px] uppercase leading-tight tracking-wider text-[var(--dim)]">
            Support<br />independent<br />artists
          </span>
        </span>
        <span className="flex items-center gap-2">
          <CassetteIcon size={30} className="text-white/70" />
          <span className="mono text-[12px] uppercase leading-tight tracking-wider text-[var(--dim)]">
            Own a piece<br />of music<br />culture
          </span>
        </span>
        <a href={OPENSEA_URL} target="_blank" rel="noreferrer"
          className="flex items-center gap-2 border border-white/15 px-3 py-2 hover:border-[var(--cyan)]">
          <Globe size={22} className="text-[var(--cyan)]" />
          <span className="mono text-[12px] uppercase leading-tight tracking-wider text-[var(--dim)]">
            Real people<br />real music<br />onchain
          </span>
          <ExternalLink size={12} className="text-[var(--cyan)]" />
        </a>
      </div>

      <Sticky tone="hot" tilt="r" className="max-w-[150px] text-[12px]">
        Good tapes<br />brighter<br />days ♡
      </Sticky>
    </footer>
  );
}

export function OpenSeaButton({ label = 'VIEW COLLECTION ON OPENSEA', className = '' }) {
  return (
    <a href={OPENSEA_URL} target="_blank" rel="noreferrer" className={`btn btn-steel ${className}`}>
      <Globe size={14} className="text-[var(--cyan)]" /> {label} <ExternalLink size={12} />
    </a>
  );
}
