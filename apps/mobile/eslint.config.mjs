import { config } from "@repo/eslint-config/react-internal";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    // On ignore les dossiers de build natifs et le cache Expo
    ignores: [
      "android/**",
      "ios/**",
      ".expo/**",
      "node_modules/**",
      "web-build/**",
    ],
  },
];
