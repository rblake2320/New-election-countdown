import { defineConfig, devices } from "@playwright/test";
import * as fs from "fs";

const env = Object.fromEntries(
  (fs.existsSync(".env.e2e") ? fs.readFileSync(".env.e2e","utf8") : "")
    .split("\n").filter(Boolean).map(l => l.split("=") as [string,string])
);

export default defineConfig({
  testDir: "./",
  timeout: 60_000,
  fullyParallel: true,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "e2e-report.json" }]],
  use: {
    baseURL: env.BASE_URL || "http://localhost:5000",
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "off",
    video: "off"
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } }
  ]
});