#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { getApplicationIdFromEnv, HoujinBangouApiClient } from "./nta-api.js";

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

async function main(): Promise<void> {
  const applicationId = getApplicationIdFromEnv();
  const apiClient = new HoujinBangouApiClient(applicationId);

  const server = new McpServer({
    name: "houjin-bangou-api-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "get_corporation_by_number",
    {
      title: "Get Corporation By Number",
      description: "Fetch corporation details from the National Tax Agency Corporate Number API.",
      inputSchema: {
        corporateNumber: z
          .string()
          .regex(/^\d{13}$/, "corporateNumber must be a 13-digit Japanese corporate number."),
        history: z
          .boolean()
          .optional()
          .describe("Include historical records when true."),
      },
    },
    async ({ corporateNumber, history }) => {
      try {
        const result = await apiClient.getCorporationByNumber({
          corporateNumber,
          history,
        });

        return {
          content: [
            {
              type: "text",
              text: formatJson(result),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : "Unknown error.",
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    "search_corporations_by_name",
    {
      title: "Search Corporations By Name",
      description: "Search corporations by name using the official Corporate Number API.",
      inputSchema: {
        name: z.string().min(1, "name is required."),
      },
    },
    async ({ name }) => {
      try {
        const result = await apiClient.searchCorporationsByName({ name });

        return {
          content: [
            {
              type: "text",
              text: formatJson(result),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : "Unknown error.",
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    "get_corporation_updates",
    {
      title: "Get Corporation Updates",
      description: "Fetch corporations updated within a date range from the Corporate Number API.",
      inputSchema: {
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD."),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD."),
      },
    },
    async ({ from, to }) => {
      try {
        const result = await apiClient.getCorporationUpdates({ from, to });

        return {
          content: [
            {
              type: "text",
              text: formatJson(result),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : "Unknown error.",
            },
          ],
        };
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
