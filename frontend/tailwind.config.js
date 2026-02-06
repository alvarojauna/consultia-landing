/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores exactos de Trillet.ai
        primary: {
          DEFAULT: '#1060FF', // rgb(16, 96, 255) - Azul principal de botones
          50: '#E6F0FF',
          100: '#CCE1FF',
          200: '#99C3FF',
          300: '#66A5FF',
          400: '#3387FF',
          500: '#1060FF',
          600: '#0050E6',
          700: '#003CB3',
          800: '#002880',
          900: '#00144D',
        },
        dark: {
          DEFAULT: '#0A0A0A', // rgb(10, 10, 10) - Fondo oscuro
          lighter: '#1A1A1A',
          light: '#2A2A2A',
        },
        text: {
          primary: '#EDEDED', // rgb(237, 237, 237) - Texto principal
          secondary: '#A0A0A0',
          muted: '#666666',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-urbanist)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'hero': ['3.75rem', { lineHeight: '1.1', fontWeight: '700' }], // ~60px
        'section': ['2.5rem', { lineHeight: '1.2', fontWeight: '700' }], // ~40px
      },
    },
  },
  plugins: [],
}
