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

test("server rejects using both corporateNumber and corporateNumbers", async () => {
  await withClient(async (client) => {
    const result = await client.callTool({
      name: "get_corporation_by_number",
      arguments: {
        corporateNumber: "7000012050002",
        corporateNumbers: ["1130001011420"],
      },
    });

    assert.equal(result.isError, true);
    assert.match(
      result.content[0]?.type === "text" ? result.content[0].text : "",
      /Use either corporateNumber or corporateNumbers, not both\./,
    );
  });
});

test("server rejects invalid address filters", async () => {
  await withClient(async (client) => {
    const result = await client.callTool({
      name: "search_corporations_by_name",
      arguments: {
        name: "国税",
        address: "1",
      },
    });

    assert.equal(result.isError, true);
    assert.match(
      result.content[0]?.type === "text" ? result.content[0].text : "",
      /address must be a 2-digit prefecture code or 5-digit city code\./,
    );
  });
});

test("server rejects assignment dates before the supported minimum", async () => {
  await withClient(async (client) => {
    const result = await client.callTool({
      name: "search_corporations_by_name",
      arguments: {
        name: "国税",
        assignmentFrom: "2015-10-01",
      },
    });

    assert.equal(result.isError, true);
    assert.match(
      result.content[0]?.type === "text" ? result.content[0].text : "",
      /assignmentFrom must be on or after 2015-10-05\./,
    );
  });
});

test("server rejects diff ranges older than the supported minimum", async () => {
  await withClient(async (client) => {
    const result = await client.callTool({
      name: "get_corporation_updates",
      arguments: {
        from: "2015-11-30",
        to: "2015-12-01",
      },
    });

    assert.equal(result.isError, true);
    assert.match(
      result.content[0]?.type === "text" ? result.content[0].text : "",
      /from must be on or after 2015-12-01\./,
    );
  });
});

test("server rejects diff ranges longer than 50 days", async () => {
  await withClient(async (client) => {
    const result = await client.callTool({
      name: "get_corporation_updates",
      arguments: {
        from: "2026-01-01",
        to: "2026-02-20",
      },
    });

    assert.equal(result.isError, true);
    assert.match(
      result.content[0]?.type === "text" ? result.content[0].text : "",
      /from and to must be within 50 days\./,
    );
  });
});

test("server rejects unsupported response types", async () => {
  await withClient(async (client) => {
    const result = await client.callTool({
      name: "get_corporation_by_number",
      arguments: {
        corporateNumber: "7000012050002",
        responseType: "99",
      },
    });

    assert.equal(result.isError, true);
    assert.match(
      result.content[0]?.type === "text" ? result.content[0].text : "",
      /Invalid input/,
    );
  });
});
