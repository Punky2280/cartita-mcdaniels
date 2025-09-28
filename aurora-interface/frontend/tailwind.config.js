/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Claude Primary
        claude: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FFD6A1', 
          300: '#FFB366',
          400: '#FF8C42',
          500: '#FF6B35',
          600: '#E55A2B',
          700: '#CC4A1F',
          800: '#A63D1A',
          900: '#7C2E13'
        },
        // Microsoft Colors
        'ms-blue': {
          50: '#E6F3FF',
          100: '#CCE7FF',
          200: '#99CFFF',
          300: '#66B7FF', 
          400: '#339FFF',
          500: '#0078D4',
          600: '#106EBE',
          700: '#005A9E',
          800: '#004578',
          900: '#003152'
        },
        'ms-pink': {
          50: '#FDF2F4',
          100: '#FCE7EA',
          200: '#F9BFC7',
          300: '#F596A4',
          400: '#F16E81',
          500: '#E74856',
          600: '#D63644',
          700: '#B52D3A', 
          800: '#941F2E',
          900: '#731822'
        },
        // ChatGPT Purple
        'gpt-purple': {
          50: '#F3F4F6',
          100: '#E5E7EB',
          200: '#D1D5DB',
          300: '#A78BFA',
          400: '#8B5CF6', 
          500: '#6B46C1',
          600: '#553C9A',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'Menlo', 'monospace']
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
