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
  retries: 2,
  workers: 1,
  reporter: "html",
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
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "npx expo start --web",
      port: 8081,
      reuseExistingServer: !process.env.CI,
      timeout: 300000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        EXPO_ROUTER_APP_ROOT: "app",
        NODE_ENV: "development",
      },
    },
  ],
});
