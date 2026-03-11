import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

type TextBlock = {
  type: "text";
  text: string;
};

function isTextBlock(value: unknown): value is TextBlock {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "text" in value &&
    (value as { type?: unknown }).type === "text" &&
    typeof (value as { text?: unknown }).text === "string"
  );
}

async function main(): Promise<void> {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/server.js"],
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOUJIN_BANGOU_API_APPLICATION_ID:
        process.env.HOUJIN_BANGOU_API_APPLICATION_ID ?? "smoke-test-placeholder",
    } as Record<string, string>,
    stderr: "inherit",
  });

  const client = new Client({
    name: "houjin-bangou-api-smoke-client",
    version: "0.1.0",
  });

  try {
    await client.connect(transport);
    const toolsResult = await client.listTools();
    const toolNames = toolsResult.tools.map((tool) => tool.name).sort();

    console.log(JSON.stringify({ toolNames }, null, 2));

    if (process.env.HOUJIN_BANGOU_API_APPLICATION_ID) {
      const callResult = await client.callTool({
        name: "get_corporation_by_number",
        arguments: {
          corporateNumber: "7000012050002",
        },
      });

      const firstText = callResult.content.find(isTextBlock)?.text ?? "";
      const parsed = JSON.parse(firstText) as {
        corporations?: Array<{ corporateNumber?: string; name?: string }>;
      };

      console.log(
        JSON.stringify(
          {
            liveCheck: {
              corporateNumber: parsed.corporations?.[0]?.corporateNumber ?? null,
              name: parsed.corporations?.[0]?.name ?? null,
            },
          },
          null,
          2,
        ),
      );
    } else {
      console.log(
        JSON.stringify(
          {
            liveCheck: "Skipped because HOUJIN_BANGOU_API_APPLICATION_ID is not set.",
          },
          null,
          2,
        ),
      );
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
