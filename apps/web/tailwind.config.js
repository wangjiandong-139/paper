/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#07c160',
        'primary-dark': '#06ae56',
      },
    },
  },
  plugins: [],
}
