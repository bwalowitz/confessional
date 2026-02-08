import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      colors: {
        booth: {
          50: "#f6f4f1",
          100: "#e7e2dc",
          200: "#cfc3b6",
          300: "#b8a08f",
          400: "#a07e6a",
          500: "#7d5e4f",
          600: "#5f4741",
          700: "#433536",
          800: "#2a2328",
          900: "#1b171c"
        },
        ember: {
          300: "#f5b97f",
          400: "#f0a04c",
          500: "#d9822b"
        }
      },
      boxShadow: {
        booth: "0 30px 120px rgba(0,0,0,0.45)",
        insetGlow: "inset 0 0 40px rgba(255,190,120,0.12)"
      },
      fontFamily: {
        display: ["'Bodoni Moda'", "serif"],
        body: ["'IBM Plex Sans'", "sans-serif"]
      },
      backgroundImage: {
        "booth-radial": "radial-gradient(circle at top, rgba(255,200,140,0.08), transparent 55%)",
        "grain": "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\" viewBox=\"0 0 120 120\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"2\" stitchTiles=\"stitch\"/></filter><rect width=\"120\" height=\"120\" filter=\"url(%23n)\" opacity=\"0.06\"/></svg>')"
      }
    }
  },
  plugins: []
};

export default config;
