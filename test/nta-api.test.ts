import test from "node:test";
import assert from "node:assert/strict";

import { formatApiError, HoujinBangouApiClient, getApplicationIdFromEnv } from "../src/nta-api.js";
import { parseCorporationListXml } from "../src/xml.js";

const singleCorporationXml = `<?xml version="1.0" encoding="UTF-8"?><corporations><lastUpdateDate>2026-03-11</lastUpdateDate><count>1</count><divideNumber>1</divideNumber><divideSize>1</divideSize><corporation><sequenceNumber>1</sequenceNumber><corporateNumber>7000012050002</corporateNumber><process>01</process><correct>1</correct><updateDate>2018-04-02</updateDate><changeDate>2015-10-05</changeDate><name>国税庁</name><nameImageId/><kind>101</kind><prefectureName>東京都</prefectureName><cityName>千代田区</cityName><streetNumber>霞が関３丁目１－１</streetNumber><addressImageId/><prefectureCode>13</prefectureCode><cityCode>101</cityCode><postCode>1000013</postCode><addressOutside/><addressOutsideImageId/><closeDate/><closeCause/><successorCorporateNumber/><changeCause/><assignmentDate>2015-10-05</assignmentDate><latest>1</latest><enName>National Tax Agency</enName><enPrefectureName>Tokyo</enPrefectureName><enCityName>3-1-1 Kasumigaseki, Chiyoda-ku</enCityName><enAddressOutside/><furigana>コクゼイチョウ</furigana><hihyoji>0</hihyoji></corporation></corporations>`;
const emptyDiffXml = `<?xml version="1.0" encoding="UTF-8"?><corporations><lastUpdateDate>2026-03-11</lastUpdateDate><count>0</count><divideNumber>1</divideNumber><divideSize>1</divideSize></corporations>`;

test("parseCorporationListXml normalizes a single corporation response", () => {
  const parsed = parseCorporationListXml(singleCorporationXml);

  assert.equal(parsed.metadata.count, 1);
  assert.equal(parsed.corporations.length, 1);
  assert.equal(parsed.corporations[0]?.corporateNumber, "7000012050002");
  assert.equal(parsed.corporations[0]?.name, "国税庁");
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
  const message = formatApiError(400, "030,取得期間開始日は取得期間終了日以前を指定してください。");

  assert.equal(
    message,
    "Corporate Number API request failed with 400 (code 030): 取得期間開始日は取得期間終了日以前を指定してください。",
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
  assert.equal(result.corporations[0]?.name, "国税庁");
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

  await client.searchCorporationsByName({ name: " 国税 " });

  assert.match(
    capturedUrl,
    /^https:\/\/example\.test\/4\/name\?name=%E5%9B%BD%E7%A8%8E&type=12&id=example-id$/,
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
  });

  assert.match(
    capturedUrl,
    /^https:\/\/example\.test\/4\/diff\?from=2026-03-01&to=2026-03-02&type=12&id=example-id$/,
  );
});

test("HoujinBangouApiClient builds a clearer API error message", async () => {
  const client = new HoujinBangouApiClient(
    "example-id",
    async () =>
      new Response("100,商号又は名称が指定されていません。", {
        status: 400,
      }),
    "https://example.test/4",
  );

  await assert.rejects(
    () => client.searchCorporationsByName({ name: "   " }),
    /Corporate Number API request failed with 400 \(code 100\): 商号又は名称が指定されていません。/,
  );
});
