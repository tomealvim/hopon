import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      accentColor: {
        'gradient-end': '#D4898A',
      },
      // Cores do projeto
      colors: {
        primary: '#000000',      // Preto principal (conforme design)
        'primary-dark': '#000000',
        'primary-light': '#f3f4f6',
        
        // Gradiente principal (suave, menos brilhante)
        'gradient-start': '#E8D9B5',
        'gradient-mid': '#D4A89F',
        'gradient-end': '#D4898A',
        // Referência original (mais vivo)
        'gradient-start-bright': '#FFE29F',
        'gradient-mid-bright': '#FFA99F',
        'gradient-end-bright': '#FF719A',
        'dark-bg-start': '#0a0611',
        'dark-bg-mid': '#1b0b24',
        'dark-bg-end': '#050308',
        
        // Tons de cinza (já vêm do Tailwind mas podes personalizar)
        gray: {
          50: '#fafafa',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      
      // Espaçamentos personalizados (além dos padrão)
      spacing: {
        '18': '4.5rem',    // 72px
        '112': '28rem',    // 448px (para o padding-bottom da main)
      },
      
      // Border radius
      borderRadius: {
        'xl': '16px',
        '2xl': '24px',
      },
      
      // Sombras
      boxShadow: {
        'sm': '0 1px 2px rgba(16,24,40,.06)',
        'md': '0 6px 20px rgba(16,24,40,.10)',
      },
      
      // Max widths para containers
      maxWidth: {
        'mobile': '440px',
        'tablet': '640px',
        'desktop': '760px',
      },
      
      // Fontes (já usa system fonts)
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
} satisfies Config

