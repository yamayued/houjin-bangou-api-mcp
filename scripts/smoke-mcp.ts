import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFileSync } from "node:fs";

type LiveCheckInput = {
  corporateNumber: string;
  name: string;
  from: string;
  to: string;
};

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
  const input = JSON.parse(readFileSync("./scripts/live-check.json", "utf8")) as LiveCheckInput;
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
      const numberResult = await client.callTool({
        name: "get_corporation_by_number",
        arguments: {
          corporateNumber: input.corporateNumber,
        },
      });
      const nameResult = await client.callTool({
        name: "search_corporations_by_name",
        arguments: {
          name: input.name,
        },
      });
      const updatesResult = await client.callTool({
        name: "get_corporation_updates",
        arguments: {
          from: input.from,
          to: input.to,
        },
      });

      const numberText = numberResult.content.find(isTextBlock)?.text ?? "";
      const nameText = nameResult.content.find(isTextBlock)?.text ?? "";
      const updatesText = updatesResult.content.find(isTextBlock)?.text ?? "";
      const numberParsed = JSON.parse(numberText) as {
        corporations?: Array<{ corporateNumber?: string; name?: string }>;
      };
      const nameParsed = JSON.parse(nameText) as {
        metadata?: { count?: number };
        corporations?: Array<{ corporateNumber?: string; name?: string }>;
      };
      const updatesParsed = JSON.parse(updatesText) as {
        metadata?: { count?: number };
      };

      console.log(
        JSON.stringify(
          {
            liveCheck: {
              byNumber: {
                corporateNumber: numberParsed.corporations?.[0]?.corporateNumber ?? null,
                name: numberParsed.corporations?.[0]?.name ?? null,
              },
              byName: {
                count: nameParsed.metadata?.count ?? null,
                firstCorporateNumber: nameParsed.corporations?.[0]?.corporateNumber ?? null,
                firstName: nameParsed.corporations?.[0]?.name ?? null,
              },
              updates: {
                count: updatesParsed.metadata?.count ?? null,
              },
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
