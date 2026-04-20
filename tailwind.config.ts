import type { Config } from 'tailwindcss'

export default {
  content: ['./inertia/**/*.{vue,ts}', './resources/views/**/*.edge'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
