/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['SST Arabic', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#e6f0f7',
          100: '#cce1ef',
          200: '#99c3df',
          300: '#66a5cf',
          400: '#458ac9',
          500: '#336ba3',
          600: '#2a5682',
          700: '#214262',
          800: '#182d41',
          900: '#003361',
        },
        secondary: {
          50: '#e6f5ed',
          100: '#ccebdb',
          200: '#99d7b7',
          300: '#66c393',
          400: '#33af6f',
          500: '#008a40',
          600: '#007236',
          700: '#005a2b',
          800: '#004221',
          900: '#002a16',
        },
        accent: {
          50: '#f0f9f1',
          100: '#e1f3e3',
          200: '#c3e7c7',
          300: '#a5dbab',
          400: '#87cf8f',
          500: '#61bf69',
          600: '#4d9954',
          700: '#3a733f',
          800: '#264d2a',
          900: '#132615',
        },
      },
    },
  },
  plugins: [],
};
