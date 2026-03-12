import test from "node:test";
import assert from "node:assert/strict";

import { HoujinBangouApiClient } from "../src/nta-api.js";
import { parseCorporationListXml } from "../src/xml.js";

const xmlWithMissingCorporateNumber = `<?xml version="1.0" encoding="UTF-8"?>
<corporations>
  <lastUpdateDate>2026-03-11</lastUpdateDate>
  <count>1</count>
  <divideNumber>1</divideNumber>
  <divideSize>1</divideSize>
  <corporation>
    <sequenceNumber>1</sequenceNumber>
    <name>\u56fd\u7a0e\u5e81</name>
  </corporation>
</corporations>`;

const xmlWithMissingName = `<?xml version="1.0" encoding="UTF-8"?>
<corporations>
  <lastUpdateDate>2026-03-11</lastUpdateDate>
  <count>1</count>
  <divideNumber>1</divideNumber>
  <divideSize>1</divideSize>
  <corporation>
    <sequenceNumber>1</sequenceNumber>
    <corporateNumber>7000012050002</corporateNumber>
  </corporation>
</corporations>`;

test("parseCorporationListXml rejects missing corporateNumber", () => {
  assert.throws(
    () => parseCorporationListXml(xmlWithMissingCorporateNumber),
    /Corporation record 1 is missing required field "corporateNumber"\./,
  );
});

test("parseCorporationListXml rejects missing name", () => {
  assert.throws(
    () => parseCorporationListXml(xmlWithMissingName),
    /Corporation record 1 is missing required field "name"\./,
  );
});

test("HoujinBangouApiClient reports content type and preview for HTML responses", async () => {
  const client = new HoujinBangouApiClient(
    "example-id",
    async () =>
      new Response("<html>oops</html>", {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
        },
      }),
    "https://example.test/4",
  );

  await assert.rejects(
    () => client.getCorporationByNumber({ corporateNumber: "7000012050002" }),
    /Unexpected XML response from the Corporate Number API \(content-type: text\/html; charset=UTF-8, preview: <html>oops<\/html>\)\./,
  );
});

test("HoujinBangouApiClient reports preview for non-XML 200 responses", async () => {
  const client = new HoujinBangouApiClient(
    "example-id",
    async () =>
      new Response("not xml at all", {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=UTF-8",
        },
      }),
    "https://example.test/4",
  );

  await assert.rejects(
    () => client.getCorporationByNumber({ corporateNumber: "7000012050002" }),
    /Unexpected XML response from the Corporate Number API \(content-type: application\/xml; charset=UTF-8, preview: not xml at all\)\./,
  );
});

test("HoujinBangouApiClient times out hanging requests", async () => {
  const client = new HoujinBangouApiClient(
    "example-id",
    async () => await new Promise<Response>(() => {}),
    "https://example.test/4",
    25,
  );

  await assert.rejects(
    () => client.getCorporationByNumber({ corporateNumber: "7000012050002" }),
    /Corporate Number API request timed out after 25 ms\./,
  );
});
