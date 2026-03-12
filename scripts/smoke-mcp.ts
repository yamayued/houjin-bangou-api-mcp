import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFileSync } from "node:fs";

import {
  assertCondition,
  extractToolText,
  getRecentDateRange,
  parseJsonText,
} from "./verification-helpers.ts";

type LiveCheckInput = {
  corporateNumber: string;
  name: string;
  expectedName?: string;
  diffDays?: number;
};

type StructuredCorporationResponse = {
  metadata?: { count?: number };
  corporations?: Array<{ corporateNumber?: string; name?: string }>;
};

const EXPECTED_TOOL_NAMES = [
  "get_corporation_by_number",
  "get_corporation_updates",
  "search_corporations_by_name",
];

async function main(): Promise<void> {
  const input = JSON.parse(readFileSync("./scripts/live-check.json", "utf8")) as LiveCheckInput;
  const dateRange = getRecentDateRange(input.diffDays ?? 10);
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
    assertCondition(
      JSON.stringify(toolNames) === JSON.stringify(EXPECTED_TOOL_NAMES),
      `Unexpected tool list: ${JSON.stringify(toolNames)}`,
    );

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
          from: dateRange.from,
          to: dateRange.to,
        },
      });

      const numberParsed = parseJsonText<StructuredCorporationResponse>(
        extractToolText(numberResult, "get_corporation_by_number"),
        "get_corporation_by_number",
      );
      const nameParsed = parseJsonText<StructuredCorporationResponse>(
        extractToolText(nameResult, "search_corporations_by_name"),
        "search_corporations_by_name",
      );
      const updatesParsed = parseJsonText<StructuredCorporationResponse>(
        extractToolText(updatesResult, "get_corporation_updates"),
        "get_corporation_updates",
      );

      const matchedNumberRecord =
        numberParsed.corporations?.find(
          (corporation) => corporation.corporateNumber === input.corporateNumber,
        ) ?? null;
      const matchedNameRecord =
        nameParsed.corporations?.find((corporation) =>
          input.expectedName
            ? corporation.name === input.expectedName
            : corporation.name === input.name,
        ) ?? null;

      assertCondition(
        matchedNumberRecord,
        `get_corporation_by_number did not return ${input.corporateNumber}.`,
      );
      assertCondition(
        (nameParsed.metadata?.count ?? 0) > 0,
        "search_corporations_by_name returned no records.",
      );
      assertCondition(
        matchedNameRecord,
        `search_corporations_by_name did not include ${
          input.expectedName ?? input.name
        }.`,
      );
      assertCondition(
        typeof updatesParsed.metadata?.count === "number",
        "get_corporation_updates did not return structured metadata.",
      );

      console.log(
        JSON.stringify(
          {
            liveCheck: {
              dateRange,
              byNumber: {
                corporateNumber: matchedNumberRecord.corporateNumber ?? null,
                name: matchedNumberRecord.name ?? null,
              },
              byName: {
                count: nameParsed.metadata?.count ?? null,
                matchedCorporateNumber: matchedNameRecord.corporateNumber ?? null,
                matchedName: matchedNameRecord.name ?? null,
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
