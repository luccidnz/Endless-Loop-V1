/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cosmic-blue': '#0a0a2a',
        'deep-purple': '#1a103c',
        'nebula-purple': '#4c2a85',
        'star-gold': '#ffc371',
        'glow-cyan': '#76e4f7',
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px #76e4f7, 0 0 10px #76e4f7, 0 0 15px #76e4f7' },
          '50%': { boxShadow: '0 0 10px #76e4f7, 0 0 20px #76e4f7, 0 0 30px #76e4f7' },
        },
        subtleGlow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 2px rgba(118, 228, 247, 0.5))' },
          '50%': { filter: 'drop-shadow(0 0 4px rgba(118, 228, 247, 0.7))' },
        },
      },
      animation: {
        glow: 'glow 3s ease-in-out infinite',
        subtleGlow: 'subtleGlow 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
