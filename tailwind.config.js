/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        audible: {
          orange: '#f7991c',
          orangeHover: '#e08307',
          dark: '#111827',
          card: '#1f2937',
          cardHover: '#374151',
          gold: '#ffa000',
          player: '#181e28'
        }
      }
    },
  },
  plugins: [],
}
