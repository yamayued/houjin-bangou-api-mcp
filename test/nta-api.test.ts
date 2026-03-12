import test from "node:test";
import assert from "node:assert/strict";

import { formatApiError, HoujinBangouApiClient, getApplicationIdFromEnv } from "../src/nta-api.js";
import { parseCorporationListXml } from "../src/xml.js";

const NATIONAL_TAX_AGENCY_NAME = "\u56fd\u7a0e\u5e81";
const TOKYO = "\u6771\u4eac\u90fd";
const CHIYODA = "\u5343\u4ee3\u7530\u533a";
const KASUMIGASEKI = "\u971e\u304c\u95a2\u0033\u4e01\u76ee\u0031\u002d\u0031";
const FURIGANA = "\u30b3\u30af\u30bc\u30a4\u30c1\u30e7\u30a6";

const singleCorporationXml =
  `<?xml version="1.0" encoding="UTF-8"?>` +
  `<corporations><lastUpdateDate>2026-03-11</lastUpdateDate><count>1</count>` +
  `<divideNumber>1</divideNumber><divideSize>1</divideSize><corporation>` +
  `<sequenceNumber>1</sequenceNumber><corporateNumber>7000012050002</corporateNumber>` +
  `<process>01</process><correct>1</correct><updateDate>2018-04-02</updateDate>` +
  `<changeDate>2015-10-05</changeDate><name>${NATIONAL_TAX_AGENCY_NAME}</name>` +
  `<nameImageId/><kind>101</kind><prefectureName>${TOKYO}</prefectureName>` +
  `<cityName>${CHIYODA}</cityName><streetNumber>${KASUMIGASEKI}</streetNumber>` +
  `<addressImageId/><prefectureCode>13</prefectureCode><cityCode>101</cityCode>` +
  `<postCode>1000013</postCode><addressOutside/><addressOutsideImageId/>` +
  `<closeDate/><closeCause/><successorCorporateNumber/><changeCause/>` +
  `<assignmentDate>2015-10-05</assignmentDate><latest>1</latest>` +
  `<enName>National Tax Agency</enName><enPrefectureName>Tokyo</enPrefectureName>` +
  `<enCityName>3-1-1 Kasumigaseki, Chiyoda-ku</enCityName><enAddressOutside/>` +
  `<furigana>${FURIGANA}</furigana><hihyoji>0</hihyoji></corporation></corporations>`;

const emptyDiffXml =
  `<?xml version="1.0" encoding="UTF-8"?>` +
  `<corporations><lastUpdateDate>2026-03-11</lastUpdateDate><count>0</count>` +
  `<divideNumber>1</divideNumber><divideSize>1</divideSize></corporations>`;

test("parseCorporationListXml normalizes a single corporation response", () => {
  const parsed = parseCorporationListXml(singleCorporationXml);

  assert.equal(parsed.metadata.count, 1);
  assert.equal(parsed.corporations.length, 1);
  assert.equal(parsed.corporations[0]?.corporateNumber, "7000012050002");
  assert.equal(parsed.corporations[0]?.name, NATIONAL_TAX_AGENCY_NAME);
  assert.equal(parsed.corporations[0]?.nameImageId, null);
  assert.equal(parsed.corporations[0]?.addressImageId, null);
  assert.equal(parsed.corporations[0]?.addressOutsideImageId, null);
  assert.equal(parsed.corporations[0]?.correct, true);
  assert.equal(parsed.corporations[0]?.hidden, false);
});

test("parseCorporationListXml handles empty responses", () => {
  const parsed = parseCorporationListXml(emptyDiffXml);

  assert.equal(parsed.metadata.count, 0);
  assert.deepEqual(parsed.corporations, []);
});

test("getApplicationIdFromEnv returns a trimmed application id", () => {
  const applicationId = getApplicationIdFromEnv({
    HOUJIN_BANGOU_API_APPLICATION_ID: "  example-id  ",
  });

  assert.equal(applicationId, "example-id");
});

test("getApplicationIdFromEnv throws when the application id is missing", () => {
  assert.throws(
    () => getApplicationIdFromEnv({}),
    /Missing HOUJIN_BANGOU_API_APPLICATION_ID/,
  );
});

test("formatApiError normalizes code-prefixed API responses", () => {
  const message = formatApiError(400, "030,invalid request date");

  assert.equal(
    message,
    "Corporate Number API request failed with 400 (code 030): invalid request date",
  );
});

test("HoujinBangouApiClient builds the number endpoint request", async () => {
  let capturedUrl = "";

  const client = new HoujinBangouApiClient(
    "example-id",
    async (input) => {
      capturedUrl = String(input);
      return new Response(singleCorporationXml, {
        status: 200,
        headers: {
          "Content-Type": "application/xml",
        },
      });
    },
    "https://example.test/4",
  );

  const result = await client.getCorporationByNumber({
    corporateNumber: "7000012050002",
    history: true,
  });

  assert.match(
    capturedUrl,
    /^https:\/\/example\.test\/4\/num\?number=7000012050002&history=1&type=12&id=example-id$/,
  );
  assert.equal("corporations" in result ? result.corporations[0]?.name : null, NATIONAL_TAX_AGENCY_NAME);
});

test("HoujinBangouApiClient builds the number endpoint request for multiple numbers", async () => {
  let capturedUrl = "";

  const client = new HoujinBangouApiClient(
    "example-id",
    async (input) => {
      capturedUrl = String(input);
      return new Response(emptyDiffXml, { status: 200 });
    },
    "https://example.test/4",
  );

  await client.getCorporationByNumber({
    corporateNumbers: ["7000012050002", "1130001011420"],
  });

  assert.match(
    capturedUrl,
    /^https:\/\/example\.test\/4\/num\?number=7000012050002%2C1130001011420&history=0&type=12&id=example-id$/,
  );
});

test("HoujinBangouApiClient returns raw CSV when responseType is 01", async () => {
  let capturedUrl = "";
  let capturedAccept = "";
  const shiftJisCsv = Buffer.concat([
    Buffer.from("header\n\""),
    Buffer.from([0x8d, 0x91, 0x90, 0xc5, 0x92, 0xa1]),
    Buffer.from("\"\n"),
  ]);

  const client = new HoujinBangouApiClient(
    "example-id",
    async (input, init) => {
      capturedUrl = String(input);
      capturedAccept = String((init?.headers as Record<string, string> | undefined)?.Accept ?? "");
      return new Response(shiftJisCsv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=Shift_JIS",
        },
      });
    },
    "https://example.test/4",
  );

  const result = await client.getCorporationByNumber({
    corporateNumber: "7000012050002",
    responseType: "01",
  });

  assert.match(
    capturedUrl,
    /^https:\/\/example\.test\/4\/num\?number=7000012050002&history=0&type=01&id=example-id$/,
  );
  assert.equal(capturedAccept, "text/csv");
  assert.deepEqual(result, {
    responseType: "01",
    contentType: "text/csv; charset=Shift_JIS",
    raw: `header\n"${NATIONAL_TAX_AGENCY_NAME}"\n`,
  });
});

test("HoujinBangouApiClient builds the name endpoint request", async () => {
  let capturedUrl = "";

  const client = new HoujinBangouApiClient(
    "example-id",
    async (input) => {
      capturedUrl = String(input);
      return new Response(emptyDiffXml, { status: 200 });
    },
    "https://example.test/4",
  );

  await client.searchCorporationsByName({
    name: ` ${NATIONAL_TAX_AGENCY_NAME} `,
    mode: 2,
    target: 3,
    address: "13",
    kinds: ["01", "03"],
    change: true,
    close: false,
    assignmentFrom: "2026-03-01",
    assignmentTo: "2026-03-10",
    divide: 2,
  });

  assert.match(
    capturedUrl,
    new RegExp(
      `^https://example\\.test/4/name\\?name=${encodeURIComponent(NATIONAL_TAX_AGENCY_NAME)}&type=12&mode=2&target=3&address=13&kind=01%2C03&change=1&close=0&from=2026-03-01&to=2026-03-10&divide=2&id=example-id$`,
    ),
  );
});

test("HoujinBangouApiClient builds the diff endpoint request", async () => {
  let capturedUrl = "";

  const client = new HoujinBangouApiClient(
    "example-id",
    async (input) => {
      capturedUrl = String(input);
      return new Response(emptyDiffXml, { status: 200 });
    },
    "https://example.test/4",
  );

  await client.getCorporationUpdates({
    from: " 2026-03-01 ",
    to: " 2026-03-02 ",
    address: "13101",
    kinds: ["02"],
    divide: 3,
  });

  assert.match(
    capturedUrl,
    /^https:\/\/example\.test\/4\/diff\?from=2026-03-01&to=2026-03-02&type=12&address=13101&kind=02&divide=3&id=example-id$/,
  );
});

test("HoujinBangouApiClient can request Unicode CSV for diff responses", async () => {
  let capturedUrl = "";

  const client = new HoujinBangouApiClient(
    "example-id",
    async (input) => {
      capturedUrl = String(input);
      return new Response("corporateNumber,name\n7000012050002,National Tax Agency\n", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=UTF-8",
        },
      });
    },
    "https://example.test/4",
  );

  const result = await client.getCorporationUpdates({
    from: "2026-03-01",
    to: "2026-03-02",
    responseType: "02",
  });

  assert.match(
    capturedUrl,
    /^https:\/\/example\.test\/4\/diff\?from=2026-03-01&to=2026-03-02&type=02&id=example-id$/,
  );
  assert.deepEqual(result, {
    responseType: "02",
    contentType: "text/csv; charset=UTF-8",
    raw: "corporateNumber,name\n7000012050002,National Tax Agency\n",
  });
});

test("HoujinBangouApiClient builds a clearer API error message", async () => {
  const client = new HoujinBangouApiClient(
    "example-id",
    async () =>
      new Response("100,missing name parameter", {
        status: 400,
      }),
    "https://example.test/4",
  );

  await assert.rejects(
    () => client.searchCorporationsByName({ name: "   " }),
    /Corporate Number API request failed with 400 \(code 100\): missing name parameter/,
  );
});
