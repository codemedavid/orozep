/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Orozep PH — Pink Clinical Glow ──
        // Pink-first palette with maroon contrast for readable medical commerce UI.
        'theme-bg':   '#FFF7FB',
        'theme-text': '#5B2828',

        // Light Pink (primary brand — blush, sweet, cute)
        'pink': {
          DEFAULT: '#F5A0BE',
          50:  '#FFF7FB',
          100: '#FFEAF3',
          200: '#FCD3E5',
          300: '#F9B7D2',
          400: '#F593BC',
          500: '#F5A0BE',
          600: '#E25C95',
          700: '#C73D7A',
          800: '#9A2A5C',
          900: '#5B1838',
        },

        // Backward-compatible aliases for older components that still use
        // brand/navy utility classes.
        'brand': {
          DEFAULT: '#F5A0BE',
          50:  '#FFF7FB',
          100: '#FFEAF3',
          200: '#FCD3E5',
          300: '#F9B7D2',
          400: '#F593BC',
          500: '#F5A0BE',
          600: '#E25C95',
          700: '#C73D7A',
          800: '#9A2A5C',
          900: '#5B1838',
        },

        // Soft rose secondary. Token name kept as "mint" so existing class references
        // (bg-mint-100, text-mint-700, surface-mint, btn-mint, shadow-mint) still resolve.
        'mint': {
          DEFAULT: '#F9B7D2',
          50:  '#FFF7FB',
          100: '#FFEAF3',
          200: '#FCD3E5',
          300: '#F9B7D2',
          400: '#F593BC',
          500: '#F5A0BE',
          600: '#E25C95',
          700: '#C73D7A',
          800: '#9A2A5C',
          900: '#5B1838',
        },

        // Maroon (text & dark surfaces — matches logo lettering)
        // Token name kept as "charcoal" so existing references continue working.
        'charcoal': {
          DEFAULT: '#5B2828',
          50:  '#FBF5F4',
          100: '#F4E4E4',
          200: '#E5C0C0',
          300: '#D29797',
          400: '#B96A6A',
          500: '#9C4848',
          600: '#7E3434',
          700: '#5E2828',
          800: '#421C1C',
          900: '#2D1212',
        },

        'navy': {
          DEFAULT: '#5B2828',
          50:  '#FBF5F4',
          100: '#F4E4E4',
          200: '#E5C0C0',
          300: '#D29797',
          400: '#B96A6A',
          500: '#9C4848',
          600: '#7E3434',
          700: '#5E2828',
          800: '#421C1C',
          900: '#2D1212',
        },

        // Utility
        'cream':         '#FFF7FB',
        'warm-white':    '#FFF0F7',
        'surface':       '#FFEAF3',
        'surface-mint':  '#FFEAF3',
        'gold':          '#8B4423', // logo copper-maroon accent
        'maroon':        '#6B2C2C',
        'maroon-light':  '#8B3A3A',
        'baby-pink':     '#FCD3E5',
        'blush':         '#FCD3E5',
      },

      fontFamily: {
        sans:    ['"DM Sans"', 'sans-serif'],
        heading: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        serif:   ['"Cormorant Garamond"', 'Georgia', 'serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },

      fontSize: {
        'display-xl': ['clamp(3rem, 7vw, 5.5rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-lg': ['clamp(2.2rem, 5vw, 3.8rem)', { lineHeight: '1.08', letterSpacing: '-0.015em' }],
        'display-md': ['clamp(1.8rem, 3.5vw, 2.8rem)', { lineHeight: '1.12', letterSpacing: '-0.01em' }],
      },

      boxShadow: {
        'xs':      '0 1px 2px rgba(91,40,40,0.05)',
        'sm':      '0 2px 6px rgba(91,40,40,0.07)',
        'DEFAULT': '0 2px 12px rgba(91,40,40,0.08)',
        'md':      '0 4px 20px rgba(91,40,40,0.09)',
        'lg':      '0 8px 36px rgba(91,40,40,0.10)',
        'pink':    '0 6px 24px rgba(245,160,190,0.32)',
        'mint':    '0 6px 24px rgba(226,92,149,0.24)',
        'card':    '0 0 0 1px rgba(91,40,40,0.06), 0 4px 18px rgba(245,160,190,0.10)',
      },

      borderRadius: {
        'none':  '0',
        'sm':    '0.375rem',
        DEFAULT: '0.625rem',
        'md':    '0.875rem',
        'lg':    '1.125rem',
        'xl':    '1.5rem',
        '2xl':   '2rem',
        '3xl':   '2.75rem',
        'full':  '9999px',
      },

      animation: {
        'fadeIn':    'fadeIn 0.8s ease-out',
        'slideUp':   'slideUp 0.7s ease-out',
        'float':     'float 8s ease-in-out infinite',
        'pulse-slow':'pulse 5s cubic-bezier(0.4,0,0.6,1) infinite',
        'shimmer':   'shimmer 6s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-14px)' },
        },
        shimmer: {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%':     { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}
