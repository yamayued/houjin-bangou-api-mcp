import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type ManualCompanyCheck = {
  companies: Array<{
    label: string;
    name: string;
    expectedCorporateNumber: string;
  }>;
};

const README_PATH = new URL("../README.md", import.meta.url);
const MANUAL_FIXTURE_PATH = new URL("../scripts/manual-company-check.json", import.meta.url);

test("README uses readable Japanese examples and avoids stale fixed dates", () => {
  const readme = readFileSync(README_PATH, "utf8");

  assert.ok(readme.includes("国税庁"));
  assert.ok(readme.includes("任天堂株式会社"));
  assert.ok(!readme.includes("蝗ｽ遞主ｺ"));
  assert.ok(!readme.includes('"lastUpdateDate": "2026-03-11"'));
  assert.ok(!readme.includes('{ "from": "2026-03-01", "to": "2026-03-05" }'));
});

test("manual company fixture uses readable company names", () => {
  const fixture = JSON.parse(
    readFileSync(MANUAL_FIXTURE_PATH, "utf8"),
  ) as ManualCompanyCheck;

  assert.deepEqual(
    fixture.companies.map((company) => company.name),
    [
      "国税庁",
      "任天堂株式会社",
      "トヨタ自動車株式会社",
      "ソニーグループ",
    ],
  );
});
