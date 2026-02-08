import path from "node:path";

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: path.join(__dirname, "tests", "e2e"),
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
});
