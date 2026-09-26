import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#EEC400',
        secondary: '#1A6FD4',
        accent: '#E07B00',
        dark: '#1A1A1A',
        'admin-dark': '#1a3a1a',
        'admin-green': '#2d6a2d',
        'admin-gold': '#f5c518',
        body: '#565656',
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
