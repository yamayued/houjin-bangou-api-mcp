import { readFileSync } from "node:fs";

import { HoujinBangouApiClient, getApplicationIdFromEnv } from "../dist/nta-api.js";
import type { CorporationListResponse, RawCorporationApiResponse } from "../dist/types.js";
import { assertCondition } from "./verification-helpers.ts";

type Input = {
  corporateNumber: string;
};

function summarizeStructuredResponse(result: CorporationListResponse) {
  return {
    count: result.metadata.count,
    firstCorporation: result.corporations[0]
      ? {
          corporateNumber: result.corporations[0].corporateNumber,
          name: result.corporations[0].name,
          latest: result.corporations[0].latest,
        }
      : null,
  };
}

function summarizeRawResponse(result: RawCorporationApiResponse) {
  return {
    responseType: result.responseType,
    contentType: result.contentType,
    firstLine: result.raw.split(/\r?\n/u)[0] ?? "",
    secondLine: result.raw.split(/\r?\n/u)[1] ?? "",
    rawLength: result.raw.length,
  };
}

const input = JSON.parse(
  readFileSync("./scripts/response-type-check.json", "utf8"),
) as Input;

const client = new HoujinBangouApiClient(getApplicationIdFromEnv());

const xmlResult = await client.getCorporationByNumber({
  corporateNumber: input.corporateNumber,
  responseType: "12",
});
const unicodeCsvResult = await client.getCorporationByNumber({
  corporateNumber: input.corporateNumber,
  responseType: "02",
});
const shiftJisCsvResult = await client.getCorporationByNumber({
  corporateNumber: input.corporateNumber,
  responseType: "01",
});

assertCondition(
  "corporations" in xmlResult &&
    xmlResult.corporations.some(
      (corporation) => corporation.corporateNumber === input.corporateNumber,
    ),
  "response-type-check failed: XML response did not include the requested corporate number.",
);
assertCondition(
  "raw" in unicodeCsvResult &&
    unicodeCsvResult.responseType === "02" &&
    unicodeCsvResult.raw.includes(input.corporateNumber),
  "response-type-check failed: Unicode CSV response did not include the requested corporate number.",
);
assertCondition(
  "raw" in shiftJisCsvResult &&
    shiftJisCsvResult.responseType === "01" &&
    shiftJisCsvResult.raw.includes(input.corporateNumber) &&
    shiftJisCsvResult.raw.includes("国税庁"),
  "response-type-check failed: Shift-JIS CSV response was not decoded into readable Japanese text.",
);

console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      corporateNumber: input.corporateNumber,
      xml:
        "corporations" in xmlResult
          ? summarizeStructuredResponse(xmlResult)
          : null,
      unicodeCsv:
        "raw" in unicodeCsvResult
          ? summarizeRawResponse(unicodeCsvResult)
          : null,
      shiftJisCsv:
        "raw" in shiftJisCsvResult
          ? summarizeRawResponse(shiftJisCsvResult)
          : null,
    },
    null,
    2,
  ),
);
