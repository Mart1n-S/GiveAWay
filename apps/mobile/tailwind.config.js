// On importe tes tokens (le chemin remonte de apps/mobile vers packages/ui)
const {
  colors,
  radius,
  sizing,
  typography,
} = require("../../packages/ui/src/theme/tokens");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "../../packages/ui/src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        /* --- Brand --- */
        // On mappe tes couleurs primaires aux tokens
        primary: {
          DEFAULT: colors.primary.default,
          hover: colors.primary.hover,
          active: colors.primary.active,
        },

        /* --- Whites --- */
        white: {
          DEFAULT: colors.white.default,
          hover: colors.white.hover,
          active: colors.white.active,
        },

        /* --- Greys --- */
        grey: colors.grey,

        /* --- Feedback --- */
        focus: colors.focus,

        // On garde tes classes existantes (error-100) mais on utilise la valeur du token (error.strong)
        error: {
          100: colors.error.strong,
          30: colors.error.soft,
        },
        success: {
          100: colors.success.strong,
          30: colors.success.soft,
        },
      },

      borderRadius: {
        md: `${radius.md}px`,
      },

      /* SIZING TOKENS */
      height: {
        control: `${sizing.controlHeight}px`,
      },

      minHeight: {
        control: `${sizing.controlHeight}px`,
      },

      /* --- Typography --- */
      fontFamily: {
        sans: [
          typography.fontFamily,
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },

      fontWeight: {
        regular: typography.weight.regular.toString(),
        semibold: typography.weight.semibold.toString(),
        bold: typography.weight.bold.toString(),
      },

      fontSize: {
        base: [
          `${typography.baseFontSize}px`,
          typography.lineHeight.toString(),
        ],
      },
    },
  },
  plugins: [],
};
