/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./auth.html",
    "./dashboard.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        scsBlue: '#0d3b8e',
        scsGold: '#cfa941',
      }
    },
  },
  plugins: [],
}
