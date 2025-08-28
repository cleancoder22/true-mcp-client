/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VS Code inspired theme colors
        vscode: {
          // Background colors
          bg: {
            primary: '#1e1e1e',    // Main background
            secondary: '#252526',   // Secondary background
            elevated: '#2d2d30',    // Elevated surfaces (cards, modals)
            input: '#1e1e1e',      // Input backgrounds
          },
          // Border colors
          border: {
            primary: '#3e3e42',     // Primary borders
            focus: '#007acc',       // Focus states
            subtle: '#404040',      // Subtle borders
          },
          // Text colors
          text: {
            primary: '#cccccc',     // Primary text
            secondary: '#8c8c8c',   // Secondary text
            muted: '#6a6a6a',      // Muted text
            inverse: '#ffffff',     // White text for dark backgrounds
          },
          // Accent colors
          accent: {
            primary: '#007acc',     // Primary accent (VS Code blue)
            hover: '#1177bb',       // Hover state
            success: '#10b981',     // Success states
            warning: '#f59e0b',     // Warning states
            error: '#ef4444',       // Error states
          },
          // AI/Chat specific colors
          ai: {
            primary: '#8b5cf6',     // AI avatar primary
            secondary: '#3b82f6',   // AI avatar secondary
            gradient: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
          }
        }
      },
      fontFamily: {
        'mono': ['Consolas', 'Monaco', 'Menlo', 'monospace'],
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-dot': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
