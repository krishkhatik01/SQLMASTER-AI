/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgPrimary: "var(--bg-primary)",
        bgSecondary: "var(--bg-secondary)",
        bgCard: "var(--bg-card)",
        bgElevated: "var(--bg-elevated)",
        accent: "var(--accent)",
        accentGreen: "var(--accent-green)",
        accentPurple: "var(--accent-purple)",
        accentRed: "var(--accent-red)",
        accentYellow: "var(--accent-yellow)",
        textPrimary: "var(--text-primary)",
        textSecondary: "var(--text-secondary)",
        textMuted: "var(--text-muted)",
        borderLight: "var(--border)",
        borderStrong: "var(--border-strong)",
      },
      fontFamily: {
        syne: ["Syne", "sans-serif"],
        dmsans: ["DM Sans", "sans-serif"],
        jetbrains: ["JetBrains Mono", "monospace"],
      }
    },
  },
  plugins: [],
}
