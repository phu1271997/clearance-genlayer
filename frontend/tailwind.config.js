/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gen: {
          dark: "#0a0b10",
          card: "#121420",
          border: "#232738",
          purple: "#7c3aed",
          cyan: "#06b6d4",
          amber: "#f59e0b",
          green: "#10b981",
          red: "#ef4444"
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
