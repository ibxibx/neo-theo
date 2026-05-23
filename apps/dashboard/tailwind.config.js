/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Apple-inspired system palette
        ink: {
          DEFAULT: "#1d1d1f",
          soft: "#6e6e73",
          subtle: "#86868b",
          muted: "#a1a1a6",
        },
        paper: {
          DEFAULT: "#fbfbfd",
          card: "#ffffff",
          rail: "#f5f5f7",
          line: "#d2d2d7",
        },
        accent: {
          green: "#34c759",
          orange: "#ff9500",
          red: "#ff3b30",
          blue: "#0071e3",
          indigo: "#5856d6",
        },
        urgency: {
          low: "#34c759",
          medium: "#ff9500",
          high: "#ff3b30",
          emergency: "#ff2d55",
        },
      },
      fontFamily: {
        sans: [
          "SF Pro Display",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "SF Mono",
          "ui-monospace",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        // SF Pro-aligned type scale
        micro: ["10px", { lineHeight: "14px", letterSpacing: "0.04em" }],
        caption: ["12px", { lineHeight: "16px", letterSpacing: "-0.005em" }],
        body: ["14px", { lineHeight: "20px", letterSpacing: "-0.008em" }],
        callout: ["16px", { lineHeight: "22px", letterSpacing: "-0.012em" }],
        title: ["22px", { lineHeight: "28px", letterSpacing: "-0.018em" }],
        headline: ["28px", { lineHeight: "34px", letterSpacing: "-0.022em" }],
        display: ["48px", { lineHeight: "52px", letterSpacing: "-0.028em" }],
        hero: ["72px", { lineHeight: "76px", letterSpacing: "-0.035em" }],
      },
      borderRadius: {
        soft: "10px",
        card: "18px",
        pill: "999px",
        iphone: "44px",
      },
      boxShadow: {
        hair: "0 0 0 1px rgba(0,0,0,0.06)",
        card: "0 1px 2px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.06)",
        elev: "0 8px 32px rgba(0,0,0,0.12)",
        iphone:
          "0 0 0 8px #1d1d1f, 0 0 0 9px #3a3a3c, 0 40px 80px -20px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.18)",
        glow_green:
          "0 0 0 8px rgba(52,199,89,0.18), 0 20px 40px -10px rgba(52,199,89,0.55)",
        glow_red:
          "0 0 0 8px rgba(255,59,48,0.20), 0 20px 40px -10px rgba(255,59,48,0.55)",
      },
      keyframes: {
        pulse_ring: {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
        wave_bar: {
          "0%,100%": { transform: "scaleY(0.35)" },
          "50%": { transform: "scaleY(1)" },
        },
        slide_up: {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        glow_breathe: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(52,199,89,0.5)" },
          "50%": { boxShadow: "0 0 0 14px rgba(52,199,89,0)" },
        },
      },
      animation: {
        pulse_ring: "pulse_ring 1.5s ease-out infinite",
        wave_bar: "wave_bar 0.9s ease-in-out infinite",
        slide_up: "slide_up 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        glow_breathe: "glow_breathe 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
