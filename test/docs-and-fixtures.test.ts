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
const NATIONAL_TAX_AGENCY_NAME = "\u56fd\u7a0e\u5e81";
const NINTENDO_NAME = "\u4efb\u5929\u5802\u682a\u5f0f\u4f1a\u793e";
const TOYOTA_NAME = "\u30c8\u30e8\u30bf\u81ea\u52d5\u8eca\u682a\u5f0f\u4f1a\u793e";
const SONY_GROUP_NAME = "\u30bd\u30cb\u30fc\u30b0\u30eb\u30fc\u30d7";

test("README documents first-time setup, verification, package imports, and readable examples", () => {
  const readme = readFileSync(README_PATH, "utf8");

  assert.ok(readme.includes("$env:HOUJIN_BANGOU_API_APPLICATION_ID = \"YOUR_APPLICATION_ID\""));
  assert.ok(readme.includes(`"name": "${NATIONAL_TAX_AGENCY_NAME}"`));
  assert.ok(readme.includes(`{ "name": "${NINTENDO_NAME}" }`));
  assert.ok(readme.includes("## Package Imports"));
  assert.ok(readme.includes('from "houjin-bangou-api-mcp";'));
  assert.ok(readme.includes("HoujinBangouApiClient"));
  assert.ok(readme.includes('import { parseCorporationListXml } from "houjin-bangou-api-mcp/xml";'));
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

test("package.json exposes the sequential live verification script and side-effect-free exports", () => {
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")) as {
    scripts?: Record<string, string>;
    main?: string;
    exports?: Record<string, unknown>;
  };

  assert.equal(packageJson.scripts?.["verify:live"], "tsx scripts/verify-live.ts");
  assert.equal(packageJson.main, "dist/index.js");
  assert.ok(packageJson.exports?.["."]);
  assert.ok(packageJson.exports?.["./nta-api"]);
  assert.ok(packageJson.exports?.["./xml"]);
  assert.ok(packageJson.exports?.["./types"]);
});

test("manual company fixture uses readable company names", () => {
  const fixture = JSON.parse(
    readFileSync(MANUAL_FIXTURE_PATH, "utf8"),
  ) as ManualCompanyCheck;

  assert.deepEqual(
    fixture.companies.map((company) => company.name),
    [
      NATIONAL_TAX_AGENCY_NAME,
      NINTENDO_NAME,
      TOYOTA_NAME,
      SONY_GROUP_NAME,
    ],
  );
});
