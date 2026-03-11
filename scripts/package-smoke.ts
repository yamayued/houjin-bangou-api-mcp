import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, execSync } from "node:child_process";

const repoRoot = process.cwd();
const tempDir = mkdtempSync(join(tmpdir(), "houjin-bangou-api-mcp-"));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command: string, args: string[], cwd: string): string {
  if (process.platform === "win32") {
    const commandLine = [
      /\s/.test(command) ? `"${command.replace(/"/g, '\\"')}"` : command,
      ...args.map((arg) => (/\s/.test(arg) ? `"${arg.replace(/"/g, '""')}"` : arg)),
    ].join(" ");

    return execSync(commandLine, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  }

  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

try {
  const tarballName = run(npmCommand, ["pack"], repoRoot).trim().split(/\r?\n/).pop();
  if (!tarballName) {
    throw new Error("npm pack did not produce a tarball name.");
  }

  const tarballPath = join(repoRoot, tarballName);
  run(npmCommand, ["init", "-y"], tempDir);
  run(npmCommand, ["install", tarballPath], tempDir);

  const smokeScriptPath = join(tempDir, "package-smoke.mjs");
  writeFileSync(
    smokeScriptPath,
    [
      'import { Client } from "@modelcontextprotocol/sdk/client/index.js";',
      'import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";',
      "",
      "const transport = new StdioClientTransport({",
      "  command: process.execPath,",
      '  args: ["node_modules/houjin-bangou-api-mcp/dist/server.js"],',
      "  cwd: process.cwd(),",
      "  env: {",
      "    ...process.env,",
      '    HOUJIN_BANGOU_API_APPLICATION_ID: "placeholder"',
      "  },",
      '  stderr: "inherit"',
      "});",
      "",
      'const client = new Client({ name: "package-smoke-client", version: "0.1.0" });',
      "await client.connect(transport);",
      "try {",
      "  const tools = await client.listTools();",
      "  console.log(JSON.stringify({ toolNames: tools.tools.map((tool) => tool.name).sort() }, null, 2));",
      "} finally {",
      "  await client.close();",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );

  const output = run(process.execPath, [smokeScriptPath], tempDir);
  process.stdout.write(output);

  rmSync(resolve(tarballPath), { force: true });
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
