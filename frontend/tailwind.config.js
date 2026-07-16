export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563eb', 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
        vendor: { DEFAULT: '#7c3aed', 50: '#f5f3ff', 100: '#ede9fe', 600: '#7c3aed', 700: '#6d28d9' },
      },
    },
  },
  plugins: [],
}
