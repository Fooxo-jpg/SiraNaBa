/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#EEF4F0',
          100: '#D9E6DD',
          200: '#B3CDBB',
          400: '#5C8C6E',
          500: '#2F6844',
          600: '#245536',
          700: '#1B4229',
          800: '#15351F',
          900: '#0F2717',
        },
        ink: {
          900: '#101826',
          800: '#16202E',
          700: '#1E2A3A',
        },
        sand: {
          50: '#FAFAF8',
          100: '#F4F4F1',
        },
        status: {
          success: '#2F6844',
          successBg: '#E4F1E7',
          progress: '#B7791F',
          progressBg: '#FCF0DB',
          low: '#4A6572',
          lowBg: '#EAEFF1',
          high: '#B3261E',
          highBg: '#FBE8E7',
        },
      },
      fontFamily: {
        sans: ['"Public Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 38, 0.06), 0 1px 1px rgba(16, 24, 38, 0.04)',
      },
    },
  },
  plugins: [],
};
