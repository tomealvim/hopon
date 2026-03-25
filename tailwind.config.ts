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
        // ── HopOn Green Design System ──────────────────────────────
        // Paleta principal verde (usada em todo o novo design)
        'hopon-dark':    '#1B4332',  // verde escuro — headlines, header
        'hopon-medium':  '#52B788',  // verde médio — CTAs, tabs ativos
        'hopon-light':   '#95D5B2',  // verde claro — icon bgs, badges
        'hopon-muted':   '#D0E8DC',  // verde muted — dots inativos
        'hopon-bg':      '#F9FAF5',  // background principal
        'hopon-surface': '#F3F4EF',  // superfície cards
        'hopon-border':  '#E7E9E4',  // bordas suaves

        // ── Tokens Material Design (usados pelo Stitch) ────────────
        'primary':                  '#012d1d',
        'on-primary':               '#ffffff',
        'primary-container':        '#1b4332',
        'on-primary-container':     '#86af99',
        'primary-fixed':            '#c1ecd4',
        'primary-fixed-dim':        '#a5d0b9',
        'on-primary-fixed':         '#002114',
        'on-primary-fixed-variant': '#274e3d',
        'secondary':                '#006c48',
        'on-secondary':             '#ffffff',
        'secondary-container':      '#92f7c3',
        'on-secondary-container':   '#00734d',
        'secondary-fixed':          '#92f7c3',
        'secondary-fixed-dim':      '#75daa8',
        'on-secondary-fixed':       '#002113',
        'on-secondary-fixed-variant':'#005235',
        'tertiary':                 '#002d1b',
        'on-tertiary':              '#ffffff',
        'tertiary-container':       '#00452d',
        'on-tertiary-container':    '#74b392',
        'tertiary-fixed':           '#b0f1cc',
        'tertiary-fixed-dim':       '#94d4b1',
        'on-tertiary-fixed':        '#002113',
        'on-tertiary-fixed-variant':'#0c5136',
        'background':               '#f9faf5',
        'on-background':            '#1a1c19',
        'surface':                  '#f9faf5',
        'on-surface':               '#1a1c19',
        'surface-variant':          '#e2e3de',
        'on-surface-variant':       '#414844',
        'surface-container-lowest': '#ffffff',
        'surface-container-low':    '#f3f4ef',
        'surface-container':        '#edeee9',
        'surface-container-high':   '#e7e9e4',
        'surface-container-highest':'#e2e3de',
        'surface-dim':              '#d9dad6',
        'surface-bright':           '#f9faf5',
        'outline':                  '#717973',
        'outline-variant':          '#c1c8c2',
        'inverse-surface':          '#2e312e',
        'inverse-on-surface':       '#f0f1ec',
        'inverse-primary':          '#a5d0b9',
        'surface-tint':             '#3f6653',
        'error':                    '#ba1a1a',
        'on-error':                 '#ffffff',
        'error-container':          '#ffdad6',
        'on-error-container':       '#93000a',

        // ── Tons de cinza (mantidos para compatibilidade) ──────────
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
      
      // Fontes
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
        headline: ['"Plus Jakarta Sans"', 'sans-serif'],
        'noto-serif': ['"Noto Serif"', 'serif'],
        manrope: ['Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config

