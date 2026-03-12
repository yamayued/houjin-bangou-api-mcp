import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { getApplicationIdFromEnv } from "../src/nta-api.ts";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const tsxCliPath = new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url);

const STEPS = [
  { label: "MCP connection check", script: new URL("./smoke-mcp.ts", import.meta.url) },
  { label: "Real-company check", script: new URL("./manual-company-check.ts", import.meta.url) },
  { label: "Advanced filter check", script: new URL("./advanced-filter-check.ts", import.meta.url) },
  { label: "Response type check", script: new URL("./response-type-check.ts", import.meta.url) },
] as const;

function run(command: string, args: string[]): void {
  execFileSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
}

function main(): void {
  getApplicationIdFromEnv();

  console.log("==> Building project");
  run(npmCommand, ["run", "build"]);

  for (const step of STEPS) {
    console.log(`==> ${step.label}`);
    run(process.execPath, [fileURLToPath(tsxCliPath), fileURLToPath(step.script)]);
  }

  console.log("verify:live completed successfully");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
