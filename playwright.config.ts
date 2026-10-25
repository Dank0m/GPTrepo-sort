import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:47321",
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:47321",
    reuseExistingServer: !process.env.CI,
  },
});
