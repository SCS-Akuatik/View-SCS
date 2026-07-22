/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./*.html", /* 👈 Pakai bintang aja, biar SEMUA file HTML otomatis kebaca! */
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
