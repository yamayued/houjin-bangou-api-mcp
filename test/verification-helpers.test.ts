import test from "node:test";
import assert from "node:assert/strict";

import {
  extractToolText,
  getRecentDateRange,
  parseJsonText,
} from "../scripts/verification-helpers.ts";

test("extractToolText preserves MCP error text", () => {
  assert.throws(
    () =>
      extractToolText(
        {
          isError: true,
          content: [
            {
              type: "text",
              text: "Corporate Number API request failed with 401 (code 999): invalid id",
            },
          ],
        },
        "get_corporation_by_number",
      ),
    /get_corporation_by_number failed: Corporate Number API request failed with 401/,
  );
});

test("parseJsonText includes a preview when JSON parsing fails", () => {
  assert.throws(
    () => parseJsonText("Corporate Number API request failed with 401", "live-check"),
    /live-check returned non-JSON text\./,
  );
});

test("getRecentDateRange returns an ordered inclusive window", () => {
  const range = getRecentDateRange(10);
  const from = new Date(`${range.from}T00:00:00Z`);
  const to = new Date(`${range.to}T00:00:00Z`);
  const diffDays = Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  assert.match(range.from, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(range.to, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(diffDays, 10);
  assert.ok(from.getTime() <= to.getTime());
});
