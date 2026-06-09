import { execSync } from "node:child_process";

export default async function globalSetup() {
  execSync("npx tsx scripts/seed-e2e.ts", {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });
}
