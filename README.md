# Zero Draft — Conversion-Focused Creative Technology Studio

A redesigned React/Vite landing page for Zero Draft, positioned as a senior creative technology studio that turns ambitious ideas into interactive first versions.

## What changed

- Clearer, benefit-led hero message
- Interactive "Virality Lab" idea hook generator
- Stronger project proof and outcome metrics
- Cleaner explanation of senior Three.js/WebGL expertise
- Outcome-based service packages
- FAQ and high-contrast project intake CTA
- Responsive mobile navigation and layouts
- Motion built with Framer Motion

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The production output is generated in `dist/`.

## Important edits

- Change project examples in `src/App.jsx`
- Change contact email in `src/App.jsx`
- Change visual styling in `src/index.css`
- Update SEO title/description in `index.html`

## Deploy to Vercel

Import the repository into Vercel. The included `vercel.json` uses:

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
