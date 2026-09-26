# MIX TAPE OS — front end

A high-fidelity, responsive front end for **MIX TAPE OS**, built to match the handoff
reference images: a gritty neon boombox UI, pixel type, cassette culture, sticky notes,
neon pink + acid green, and a CRT-textured arcade mood.

> This is the visual/UX layer only. Nothing is wired to audio, wallets, chain or APIs yet —
> the player, mint flow, jukebox queue, vending machine and arcade game are presentational.

## Pages

| Route | Page | Matches |
| --- | --- | --- |
| `#/home` | Home / landing — the boombox shell | `01_home_boombox.png` |
| `#/tape-shop` | Create & decorate a tape | `02_tape_shop.png` |
| `#/record-store` | Discovery, featured tape, shelves | `03_record_store.png` |
| `#/vending` | Vending machine + creator controls | `04_vending.png` |
| `#/jukebox` | Communal listening room + queues | `05_jukebox.png` |
| `#/arcade` | Beat Runner cabinet, leaderboard | `06_arcade.png` |
| `#/my-room` | Profile, shelves, gifts, modules | `07_my_room.png` |
| `#/about` | What MIX TAPE OS owns vs OpenSea | — |

Routing is hash-based (`#/route`) so the build deploys as a static site anywhere.

## Structure

```
src/
  App.jsx              shell: nav, routing, world bar, footer, persistent player
  data.js              all mock content (tapes, queues, leaderboard, copy)
  index.css            the design system — metal, chrome, grills, knobs, LCD, stickies
  components/
    ui.jsx             Panel, Sticky, Scribble, CassetteBig, TapeCard, TopNav, WorldNav, footer
    MiniPlayer.jsx     persistent player (bar + panel variants)
  pages/               one file per page
public/art/            artwork extracted from the reference images (webp)
```

## Design system

Defined as CSS custom properties and utility classes in `src/index.css`:

- **Colour** — charcoal/steel base, `--pink` `#ff2fa0` primary accent, `--green` `#b6ff2e`
  CTA accent, plus cyan/purple/amber highlights.
- **Type** — `Press Start 2P` for pixel display headers, `Share Tech Mono` for controls
  and labels, `VT323` for terminal readouts.
- **Surfaces** — `.metal`, `.chrome`, `.panel`, `.lcd`, `.grill`, `.knob`, `.fader`,
  `.spine`, `.sticky`, `.scribble`, `.cassette`, `.world-tile`.
- **Texture** — a fixed grain layer, CRT scanlines and a vignette sit above the whole app.

## OpenSea-first

Per the handoff, the site is the brand, creation, player and social layer; OpenSea is the
marketplace. Every buy/dispense/collection action links out via `OPENSEA_URL` in
`src/data.js` — change that one constant to point at the real collection.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build      # output in dist/
```

## Where to edit

- Content and copy — `src/data.js`
- Collection link — `OPENSEA_URL` in `src/data.js`
- Styling and surfaces — `src/index.css`
- Artwork — `public/art/`

## Not built yet

Audio playback, wallet connect, minting, ownership indexing, live queue state and the
arcade game loop. The UI has the seams for each of these where the handoff calls for them.
