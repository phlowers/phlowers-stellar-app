/** @type {import('tailwindcss').Config} */
import PrimeUI from 'tailwindcss-primeui';

export default {
  darkMode: ['selector', '[class="app-dark"]'],
  content: ['./src/**/*.{html,ts,scss,css}', './index.html'],
  plugins: [PrimeUI],
  theme: {
    screens: {
      sm: '36rem',
      md: '48rem',
      lg: '62rem',
      xl: '75rem',
      '2xl': '120rem'
    }
    // colors: {
    //   primary: {}
    // }
  }
};
