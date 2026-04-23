import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'media',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0f3460',
          foreground: '#ffffff',
        },
        accent: {
          DEFAULT: '#e94560',
          foreground: '#ffffff',
        },
      },
    },
  },
  plugins: [],
}

export default config
