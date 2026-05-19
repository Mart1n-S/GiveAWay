import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

dotenv.config({ path: path.resolve(__dirname, "../../.env.test") });

if (process.env.CI) {
  process.env.NODE_ENV = "development";
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: path.join(__dirname, "tests"),
  /* On cible uniquement les fichiers de tests E2E front */
  testMatch: "**/*.spec.ts",
  /* Sécurité supplémentaire pour ignorer le reste du monorepo */
  testIgnore: ["**/node_modules/**", "**/apps/api/**", "**/packages/shared/**"],
  timeout: 50000,
  expect: { timeout: 8000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "html" : [["list"], ["html", { open: "never" }]],
  globalSetup: require.resolve("./tests/global-setup"),
  globalTeardown: require.resolve("./tests/global-teardown"),

  use: {
    baseURL: "http://localhost:8081",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: "npm run start --prefix ../../ --workspace=api",
      port: 3000,
      // En local : réutilise l'API déjà lancée par le dev via
      // `npm run start:test --workspace=apps/api` (qui charge .env.test).
      // En CI : Playwright démarre l'API lui-même avec `npm run start`,
      // et on injecte ASSOCIATION_API_URL via le bloc `env:` ci-dessous.
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ASSOCIATION_API_URL: "http://localhost:4555/search",
      },
    },
    {
      command: "npx expo start --web --host localhost",
      port: 8081,
      reuseExistingServer: !process.env.CI,
      timeout: 300000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        EXPO_ROUTER_APP_ROOT: "app",
        NODE_ENV: "development",
        EXPO_PUBLIC_API_URL: "http://localhost:3000",
        EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:
          process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
          "fake-client-id-for-ci",
      },
    },
  ],
});
