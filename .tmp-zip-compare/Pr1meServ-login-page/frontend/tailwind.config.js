/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        pru: {
          red: '#E3001B',
          'red-dark': '#A3001A',
          'red-light': '#F8D7DA',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          foreground: 'hsl(var(--surface-foreground))',
        },
        brand: {
          DEFAULT: 'hsl(var(--brand))',
          foreground: 'hsl(var(--brand-foreground))',
          subtle: 'hsl(var(--brand-subtle))',
          border: 'hsl(var(--brand-border))',
        },
        glass: 'hsl(var(--glass))',
        'canvas-start': 'hsl(var(--canvas-start))',
        'canvas-end': 'hsl(var(--canvas-end))',
        'hero-orb-1': 'hsl(var(--hero-orb-1))',
        'hero-orb-2': 'hsl(var(--hero-orb-2))',
        'hero-orb-3': 'hsl(var(--hero-orb-3))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 18px 45px -22px hsl(var(--shadow-color) / 0.32)',
        float: '0 28px 70px -30px hsl(var(--shadow-color) / 0.38)',
        glass: '0 14px 40px -22px hsl(var(--shadow-color) / 0.24)',
      },
      backgroundImage: {
        'pastel-mesh':
          'radial-gradient(circle at top left, hsl(var(--hero-orb-1) / 0.32), transparent 34%), radial-gradient(circle at top right, hsl(var(--hero-orb-2) / 0.28), transparent 30%), radial-gradient(circle at bottom center, hsl(var(--hero-orb-3) / 0.24), transparent 34%), linear-gradient(135deg, hsl(var(--canvas-start)), hsl(var(--canvas-end)))',
        'brand-gradient':
          'linear-gradient(135deg, hsl(var(--brand) / 0.92), hsl(var(--brand-2) / 0.86))',
        'brand-gradient-soft':
          'linear-gradient(135deg, hsl(var(--brand) / 0.14), hsl(var(--brand-2) / 0.08))',
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
