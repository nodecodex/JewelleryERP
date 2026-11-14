/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        sidebar: {
          bg: "hsl(var(--sidebar-bg))",
          text: "hsl(var(--sidebar-text))",
          hover: "hsl(var(--sidebar-hover))",
          border: "hsl(var(--sidebar-border))",
        },
        gold: {
          50: '#fbf8eb',
          100: '#f5eecc',
          200: '#ebdca0',
          300: '#dec26b',
          400: '#d1a43f',
          500: '#FFC000', // Lamborghini Gold
          600: '#d9a300',
          700: '#917300', // Dark Gold
          800: '#665100',
          900: '#3d3000',
        },
        lambo: {
          black: '#000000',
          iron: '#181818',
          charcoal: '#202020',
          elevated: '#282828',
          gold: '#FFC000',
          darkgold: '#917300',
          cyan: '#29ABE2',
          ash: '#7D7D7D',
          steel: '#969696',
          border: '#2c2c2c',
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        '1.5': '6px',
        '4.5': '18px',
        '18': '72px',
      },
      fontSize: {
        'xxs': '0.625rem', // 10px
        'xs': '0.75rem',    // 12px
        'sm': '0.8125rem',  // 13px (Modern Enterprise Default)
        'base': '0.875rem', // 14px
      },
      boxShadow: {
        'premium': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'elevated': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
}
