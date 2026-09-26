/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#06060a',
        panel: '#101218',
        steel: '#2b2f38',
        pink: { DEFAULT: '#ff2fa0', soft: '#ff7cc4' },
        acid: '#b6ff2e',
        cyan: '#49e2ff',
        kraft: '#cbbd91',
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
