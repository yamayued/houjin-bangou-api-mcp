import test from "node:test";
import assert from "node:assert/strict";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", "src/server.ts"],
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOUJIN_BANGOU_API_APPLICATION_ID: "placeholder",
    } as Record<string, string>,
    stderr: "pipe",
  });

  const client = new Client({
    name: "houjin-bangou-api-test-client",
    version: "0.1.0",
  });

  try {
    await client.connect(transport);
    return await run(client);
  } finally {
    await client.close();
  }
}

test("server exposes the expected MCP tools", async () => {
  await withClient(async (client) => {
    const tools = await client.listTools();
    const names = tools.tools.map((tool) => tool.name).sort();

    assert.deepEqual(names, [
      "get_corporation_by_number",
      "get_corporation_updates",
      "search_corporations_by_name",
    ]);
  });
});

test("server rejects whitespace-only corporation name input", async () => {
  await withClient(async (client) => {
    const result = await client.callTool({
      name: "search_corporations_by_name",
      arguments: {
        name: "   ",
      },
    });

    assert.equal(result.isError, true);
    assert.match(
      result.content[0]?.type === "text" ? result.content[0].text : "",
      /name is required\./,
    );
  });
});

test("server rejects reversed update date ranges", async () => {
  await withClient(async (client) => {
    const result = await client.callTool({
      name: "get_corporation_updates",
      arguments: {
        from: "2026-03-11",
        to: "2026-03-01",
      },
    });

    assert.equal(result.isError, true);
    assert.match(
      result.content[0]?.type === "text" ? result.content[0].text : "",
      /from must be on or before to\./,
    );
  });
});

test("server rejects impossible calendar dates", async () => {
  await withClient(async (client) => {
    const result = await client.callTool({
      name: "get_corporation_updates",
      arguments: {
        from: "2026-02-30",
        to: "2026-03-01",
      },
    });

    assert.equal(result.isError, true);
    assert.match(
      result.content[0]?.type === "text" ? result.content[0].text : "",
      /from must be a real calendar date\./,
    );
  });
});
