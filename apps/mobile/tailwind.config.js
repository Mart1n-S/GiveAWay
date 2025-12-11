/** @type {import('tailwindcss').Config} */
module.exports = {
  // Chemins vers tes fichiers
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
