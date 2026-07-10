import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Prelegal brand palette (see CLAUDE.md → Color Scheme).
      colors: {
        brand: {
          yellow: "#ecad0a", // accent
          blue: "#209dd7", // primary
          purple: "#753991", // submit buttons
          navy: "#032147", // headings
          gray: "#888888", // muted text
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
