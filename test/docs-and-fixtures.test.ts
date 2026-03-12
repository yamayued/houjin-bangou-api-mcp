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
const PACKAGE_JSON_PATH = new URL("../package.json", import.meta.url);
const MANUAL_FIXTURE_PATH = new URL("../scripts/manual-company-check.json", import.meta.url);

test("README documents first-time setup, verification, and readable examples", () => {
  const readme = readFileSync(README_PATH, "utf8");

  assert.ok(readme.includes("$env:HOUJIN_BANGOU_API_APPLICATION_ID = \"YOUR_APPLICATION_ID\""));
  assert.ok(readme.includes("\"name\": \"国税庁\""));
  assert.ok(readme.includes("{ \"name\": \"任天堂株式会社\" }"));
  assert.ok(readme.includes("## Getting an Application ID"));
  assert.ok(readme.includes("https://www.invoice-kohyo.nta.go.jp/app/id_todokede"));
  assert.ok(readme.includes("invoice-webapi@nta.go.jp"));
  assert.ok(readme.includes("## Structured Response Fields"));
  assert.ok(readme.includes("## Pagination"));
  assert.ok(readme.includes("npm run verify:live"));
  assert.ok(readme.includes("Windows installs work even when the repository path contains non-ASCII characters"));

  assert.ok(!readme.includes("蝗ｽ遞主ｺ"));
  assert.ok(!readme.includes("莉ｻ螟ｩ蝣"));
  assert.ok(!readme.includes('"lastUpdateDate": "2026-03-11"'));
});

test("package.json exposes the sequential live verification script", () => {
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")) as {
    scripts?: Record<string, string>;
  };

  assert.equal(packageJson.scripts?.["verify:live"], "tsx scripts/verify-live.ts");
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
