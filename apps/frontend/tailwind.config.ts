import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        primary: "var(--primary)",
        danger: "var(--danger)",
        warning: "var(--warning)",
        muted: "var(--muted)",
        body: "var(--body)",
        heading: "var(--heading)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "var(--radius-card)",
        btn: "var(--radius-btn)",
        input: "var(--radius-input)",
      },
    },
  },
  plugins: [],
};
export default config;
