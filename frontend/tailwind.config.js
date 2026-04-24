export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 30px 80px rgba(15, 23, 42, 0.12)',
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(circle at top left, rgba(56, 189, 248, 0.17), transparent 35%), radial-gradient(circle at bottom right, rgba(34, 197, 94, 0.14), transparent 30%)',
      },
    },
  },
  plugins: [],
};
