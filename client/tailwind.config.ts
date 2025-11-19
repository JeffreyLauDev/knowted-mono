
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        eggshell: '#FAF5EE',
        emerald: '#1D503A',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      borderWidth: {
        DEFAULT: '0.5px',
        '0': '0',
        '2': '2px',
      },
      boxShadow: {
        'soft': '0 4px 12px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'card': '0 10px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
        'elevation': '0px 2px 8px 0px rgba(0, 0, 0, 0.06)',
        'elevated': '0 10px 30px -5px rgba(0, 0, 0, 0.1)',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],      // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
        'base': ['0.875rem', { lineHeight: '1.25rem' }], // 14px (reduced from 16px)
        'lg': ['1rem', { lineHeight: '1.5rem' }],       // 16px
        'xl': ['1.125rem', { lineHeight: '1.5rem' }],   // 18px
        '2xl': ['1.25rem', { lineHeight: '1.75rem' }],  // 20px
        '3xl': ['1.5rem', { lineHeight: '2rem' }],      // 24px
        '4xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
        '5xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0'
          },
          to: {
            height: 'var(--radix-accordion-content-height)'
          }
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
          },
          to: {
            height: '0'
          }
        },
        'fade-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'fade-out': {
          '0%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
          '100%': {
            opacity: '0',
            transform: 'translateY(10px)'
          }
        },
        'slide-in': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        'slide-out': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'slide-out': 'slide-out 0.3s ease-out'
      }
    }
  },
  plugins: [
    require("tailwindcss-animate"),
    function({ addUtilities, addComponents, e, config }) {
      const newUtilities = {
        // Disable all green text colors by default
        '.text-green-50, .text-green-100, .text-green-200, .text-green-300, .text-green-400, .text-green-500, .text-green-600, .text-green-700, .text-green-800, .text-green-900': {
          '@apply text-gray-900': {} // Force them to be black instead
        },
        '.text-emerald-50, .text-emerald-100, .text-emerald-200, .text-emerald-300, .text-emerald-400, .text-emerald-500, .text-emerald-600, .text-emerald-700, .text-emerald-800, .text-emerald-900': {
          '@apply text-gray-900': {}
        },
      };

      // Allow green text colors only within buttons
      const buttonComponents = {
        'button, .btn, [type="button"], [type="submit"], [type="reset"]': {
          '&.text-green-50, &.text-green-100, &.text-green-200, &.text-green-300, &.text-green-400, &.text-green-500, &.text-green-600, &.text-green-700, &.text-green-800, &.text-green-900': {
            color: 'inherit'
          },
          '&.text-emerald-50, &.text-emerald-100, &.text-emerald-200, &.text-emerald-300, &.text-emerald-400, &.text-emerald-500, &.text-emerald-600, &.text-emerald-700, &.text-emerald-800, &.text-emerald-900': {
            color: 'inherit'
          }
        }
      };

      addUtilities(newUtilities);
      addComponents(buttonComponents);
    }
  ]
} satisfies Config;
