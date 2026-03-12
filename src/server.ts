#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { getApplicationIdFromEnv, HoujinBangouApiClient } from "./nta-api.js";

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function isValidIsoDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return false;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    Number.isFinite(date.getTime()) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidAddressCode(value: string): boolean {
  return /^(?:\d{2}|\d{5})$/.test(value);
}

function differenceInDaysInclusive(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const dayMs = 24 * 60 * 60 * 1000;

  return Math.floor((end.getTime() - start.getTime()) / dayMs) + 1;
}

const NAME_ASSIGNMENT_MIN_DATE = "2015-10-05";
const DIFF_MIN_DATE = "2015-12-01";
const DIFF_MAX_RANGE_DAYS = 50;

async function main(): Promise<void> {
  const applicationId = getApplicationIdFromEnv();
  const apiClient = new HoujinBangouApiClient(applicationId);
  const kindEnum = z.enum(["01", "02", "03", "04"]);
  const addressCodeInput = z
    .string()
    .trim()
    .refine(isValidAddressCode, "address must be a 2-digit prefecture code or 5-digit city code.");
  const corporateNumberField = z
    .string()
    .trim()
    .regex(/^\d{13}$/, "corporateNumber must be a 13-digit Japanese corporate number.");
  const divideField = z
    .number()
    .int("divide must be an integer.")
    .min(1, "divide must be at least 1.")
    .max(99999, "divide must be at most 99999.");
  const assignmentDateField = z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "assignment date must be YYYY-MM-DD.")
    .refine(isValidIsoDate, "assignment date must be a real calendar date.");
  const corporateNumberInput = z
    .object({
      corporateNumber: corporateNumberField.optional(),
      corporateNumbers: z
        .array(corporateNumberField)
        .min(1, "corporateNumbers must include at least one number.")
        .max(10, "corporateNumbers can include at most 10 numbers.")
        .optional()
        .describe("Up to 10 corporate numbers in one call."),
      history: z
        .boolean()
        .optional()
        .describe("Include historical records when true."),
    })
    .refine(({ corporateNumber, corporateNumbers }) => {
      const singleCount = corporateNumber ? 1 : 0;
      const listCount = corporateNumbers?.length ?? 0;
      return singleCount + listCount > 0;
    }, {
      message: "Either corporateNumber or corporateNumbers is required.",
      path: ["corporateNumber"],
    })
    .refine(({ corporateNumber, corporateNumbers }) => !(corporateNumber && corporateNumbers), {
      message: "Use either corporateNumber or corporateNumbers, not both.",
      path: ["corporateNumbers"],
    });
  const corporationNameInput = z
    .object({
      name: z.string().trim().min(1, "name is required."),
      mode: z
        .union([z.literal(1), z.literal(2)])
        .optional()
        .describe("1 for prefix match, 2 for partial match."),
      target: z
        .union([z.literal(1), z.literal(2), z.literal(3)])
        .optional()
        .describe("1 for name only, 2 for furigana only, 3 for both."),
      address: addressCodeInput.optional(),
      kinds: z.array(kindEnum).min(1, "kinds must not be empty.").optional(),
      change: z
        .boolean()
        .optional()
        .describe("When true, include changed records. When false, latest only."),
      close: z
        .boolean()
        .optional()
        .describe("When true, include closed corporations. When false, active only."),
      assignmentFrom: assignmentDateField.optional(),
      assignmentTo: assignmentDateField.optional(),
      divide: divideField.optional(),
    })
    .refine(
      ({ assignmentFrom }) => !assignmentFrom || assignmentFrom >= NAME_ASSIGNMENT_MIN_DATE,
      {
        message: `assignmentFrom must be on or after ${NAME_ASSIGNMENT_MIN_DATE}.`,
        path: ["assignmentFrom"],
      },
    )
    .refine(({ assignmentTo }) => !assignmentTo || assignmentTo >= NAME_ASSIGNMENT_MIN_DATE, {
      message: `assignmentTo must be on or after ${NAME_ASSIGNMENT_MIN_DATE}.`,
      path: ["assignmentTo"],
    })
    .refine(
      ({ assignmentFrom, assignmentTo }) =>
        !assignmentFrom || !assignmentTo || assignmentFrom <= assignmentTo,
      {
        message: "assignmentFrom must be on or before assignmentTo.",
        path: ["assignmentTo"],
      },
    );
  const updateRangeInput = z
    .object({
      from: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD.")
        .refine(isValidIsoDate, "from must be a real calendar date."),
      to: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD.")
        .refine(isValidIsoDate, "to must be a real calendar date."),
      address: addressCodeInput.optional(),
      kinds: z.array(kindEnum).min(1, "kinds must not be empty.").optional(),
      divide: divideField.optional(),
    })
    .refine(({ from }) => from >= DIFF_MIN_DATE, {
      message: `from must be on or after ${DIFF_MIN_DATE}.`,
      path: ["from"],
    })
    .refine(({ to }) => to >= DIFF_MIN_DATE, {
      message: `to must be on or after ${DIFF_MIN_DATE}.`,
      path: ["to"],
    })
    .refine(({ from, to }) => from <= to, {
      message: "from must be on or before to.",
      path: ["to"],
    })
    .refine(({ from, to }) => differenceInDaysInclusive(from, to) <= DIFF_MAX_RANGE_DAYS, {
      message: `from and to must be within ${DIFF_MAX_RANGE_DAYS} days.`,
      path: ["to"],
    });

  const server = new McpServer({
    name: "houjin-bangou-api-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "get_corporation_by_number",
    {
      title: "Get Corporation By Number",
      description: "Fetch corporation details from the National Tax Agency Corporate Number API.",
      inputSchema: corporateNumberInput,
    },
    async ({ corporateNumber, corporateNumbers, history }) => {
      try {
        const result = await apiClient.getCorporationByNumber({
          corporateNumber,
          corporateNumbers,
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
      inputSchema: corporationNameInput,
    },
    async ({ name, mode, target, address, kinds, change, close, assignmentFrom, assignmentTo, divide }) => {
      try {
        const result = await apiClient.searchCorporationsByName({
          name,
          mode,
          target,
          address,
          kinds,
          change,
          close,
          assignmentFrom,
          assignmentTo,
          divide,
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
    "get_corporation_updates",
    {
      title: "Get Corporation Updates",
      description: "Fetch corporations updated within a date range from the Corporate Number API.",
      inputSchema: updateRangeInput,
    },
    async ({ from, to, address, kinds, divide }) => {
      try {
        const result = await apiClient.getCorporationUpdates({
          from,
          to,
          address,
          kinds,
          divide,
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

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
