const {
  colors,
  radius,
  sizing,
  typography,
} = require("./src/components/ui/theme/tokens");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        /* --- Brand --- */
        // On mappe les couleurs primaires aux tokens
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
        red: colors.red,
        green: colors.green,
        blue: colors.blue,

        /* --- Feedback --- */
        focus: colors.focus,
        error: {
          100: colors.error.strong,
          30: colors.error.soft,
        },
        success: {
          100: colors.success.strong,
          30: colors.success.soft,
        },

        /* --- Badge colors --- */
        badge: {
          // Orange (causes)
          orange: {
            bg: colors.white.active,
            text: colors.primary.default,
          },
          // Vert (environnement, nature)
          green: {
            bg: colors.green[50],
            text: colors.green[700],
          },
          // Bleu (info, tech)
          blue: {
            bg: colors.blue[50],
            text: colors.blue[700],
          },
          // Rouge (urgent, santé)
          red: {
            bg: colors.red[50],
            text: colors.red[700],
          },
          // Gris (neutre, compétences)
          surface: {
            bg: colors.grey[100],
            text: colors.grey[800],
          },
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
