import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { parseCorporationListXml } from "../src/xml.js";

const CLOSED_FIXTURE_PATH = new URL("./fixtures/closed-corporation.xml", import.meta.url);
const SUCCESSOR_FIXTURE_PATH = new URL("./fixtures/successor-corporation.xml", import.meta.url);

test("closed corporation fixture preserves lifecycle fields", () => {
  const parsed = parseCorporationListXml(readFileSync(CLOSED_FIXTURE_PATH, "utf8"));
  const corporation = parsed.corporations[0];

  assert.ok(corporation);
  assert.equal(corporation.corporateNumber, "9999999999999");
  assert.equal(corporation.name, "閉鎖法人サンプル株式会社");
  assert.equal(corporation.closeDate, "2021-03-31");
  assert.equal(corporation.closeCause, "01");
  assert.equal(corporation.successorCorporateNumber, "1234567890123");
  assert.equal(corporation.changeCause, "21");
  assert.equal(corporation.correct, false);
  assert.equal(corporation.latest, false);
  assert.equal(corporation.hidden, true);
});

test("successor corporation fixture preserves active successor fields", () => {
  const parsed = parseCorporationListXml(readFileSync(SUCCESSOR_FIXTURE_PATH, "utf8"));
  const corporation = parsed.corporations[0];

  assert.ok(corporation);
  assert.equal(corporation.corporateNumber, "1234567890123");
  assert.equal(corporation.name, "承継法人サンプル株式会社");
  assert.equal(corporation.closeDate, null);
  assert.equal(corporation.successorCorporateNumber, null);
  assert.equal(corporation.addressOutside, "サンプルビル 2F");
  assert.equal(corporation.enAddressOutside, "Sample Building 2F");
  assert.equal(corporation.correct, true);
  assert.equal(corporation.latest, true);
  assert.equal(corporation.hidden, false);
});
