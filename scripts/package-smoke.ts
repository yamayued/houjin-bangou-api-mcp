import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, execSync, spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const tempDir = mkdtempSync(join(tmpdir(), "houjin-bangou-api-mcp-"));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function buildWindowsCommand(command: string, args: string[]): string {
  return [
    /\s/.test(command) ? `"${command.replace(/"/g, '\\"')}"` : command,
    ...args.map((arg) => (/\s/.test(arg) ? `"${arg.replace(/"/g, '""')}"` : arg)),
  ].join(" ");
}

function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env): string {
  if (process.platform === "win32") {
    const commandLine = buildWindowsCommand(command, args);

    return execSync(commandLine, {
      cwd,
      encoding: "utf8",
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  }

  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function spawnWithStatus(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    shell: process.platform === "win32" && command.endsWith(".cmd"),
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

try {
  const tarballName = run(npmCommand, ["pack"], repoRoot).trim().split(/\r?\n/).pop();
  if (!tarballName) {
    throw new Error("npm pack did not produce a tarball name.");
  }

  const tarballPath = join(repoRoot, tarballName);
  try {
    run(npmCommand, ["init", "-y"], tempDir);
    run(npmCommand, ["install", tarballPath], tempDir);

    const smokeScriptPath = join(tempDir, "package-smoke.mjs");
    const binPath =
      process.platform === "win32"
        ? ".\\node_modules\\.bin\\houjin-bangou-api-mcp.cmd"
        : "node_modules/.bin/houjin-bangou-api-mcp";

    writeFileSync(
      smokeScriptPath,
      [
        'import { Client } from "@modelcontextprotocol/sdk/client/index.js";',
        'import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";',
        "",
        "async function listTools(command, args) {",
        "  const transport = new StdioClientTransport({",
        "    command,",
        "    args,",
        "    cwd: process.cwd(),",
        "    env: {",
        "      ...process.env,",
        '      HOUJIN_BANGOU_API_APPLICATION_ID: "placeholder"',
        "    },",
        '    stderr: "inherit"',
        "  });",
        '  const client = new Client({ name: "package-smoke-client", version: "0.1.0" });',
        "  await client.connect(transport);",
        "  try {",
        "    const tools = await client.listTools();",
        "    return tools.tools.map((tool) => tool.name).sort();",
        "  } finally {",
        "    await client.close();",
        "  }",
        "}",
        "",
        "const directToolNames = await listTools(process.execPath, [\"node_modules/houjin-bangou-api-mcp/dist/server.js\"]);",
        `const binToolNames = await listTools(${JSON.stringify(binPath)}, []);`,
        "console.log(JSON.stringify({ directToolNames, binToolNames }, null, 2));",
        "",
      ].join("\n"),
      "utf8",
    );

    const output = run(process.execPath, [smokeScriptPath], tempDir);
    process.stdout.write(output);

    const envWithoutAppId = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key !== "HOUJIN_BANGOU_API_APPLICATION_ID"),
    );
    const directFailure = spawnWithStatus(
      process.execPath,
      ["node_modules/houjin-bangou-api-mcp/dist/server.js"],
      tempDir,
      envWithoutAppId,
    );
    const binFailure = spawnWithStatus(binPath, [], tempDir, envWithoutAppId);

    console.log(
      JSON.stringify(
        {
          directFailure: {
            status: directFailure.status,
            mentionsMissingAppId: /Missing HOUJIN_BANGOU_API_APPLICATION_ID/.test(
              `${directFailure.stdout}\n${directFailure.stderr}`,
            ),
            outputPreview: `${directFailure.stdout}\n${directFailure.stderr}`.slice(0, 160),
          },
          binFailure: {
            status: binFailure.status,
            mentionsMissingAppId: /Missing HOUJIN_BANGOU_API_APPLICATION_ID/.test(
              `${binFailure.stdout}\n${binFailure.stderr}`,
            ),
            outputPreview: `${binFailure.stdout}\n${binFailure.stderr}`.slice(0, 160),
          },
        },
        null,
        2,
      ),
    );
  } finally {
    rmSync(resolve(tarballPath), { force: true });
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
