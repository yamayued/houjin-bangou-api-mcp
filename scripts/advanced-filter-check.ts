import { readFileSync } from "node:fs";

import { HoujinBangouApiClient, getApplicationIdFromEnv } from "../dist/nta-api.js";
import { assertCondition, getRecentDateRange } from "./verification-helpers.ts";

type Input = {
  multiNumberQuery: string[];
  nameSearch: {
    name: string;
    expectedCorporateNumber?: string;
    mode?: 1 | 2;
    target?: 1 | 2 | 3;
    address?: string;
    kinds?: Array<"01" | "02" | "03" | "04">;
    change?: boolean;
    close?: boolean;
    assignmentFrom?: string;
    assignmentTo?: string;
    divide?: number;
  };
  diffSearch: {
    diffDays?: number;
    address?: string;
    kinds?: Array<"01" | "02" | "03" | "04">;
    divide?: number;
  };
};

const input = JSON.parse(
  readFileSync("./scripts/advanced-filter-check.json", "utf8"),
) as Input;

const client = new HoujinBangouApiClient(getApplicationIdFromEnv());
const dateRange = getRecentDateRange(input.diffSearch.diffDays ?? 10);
const { expectedCorporateNumber, ...nameSearchArgs } = input.nameSearch;
const { diffDays, ...diffSearchArgs } = input.diffSearch;

const multiNumberResult = await client.getCorporationByNumber({
  corporateNumbers: input.multiNumberQuery,
});
const nameSearchResult = await client.searchCorporationsByName(nameSearchArgs);
const diffSearchResult = await client.getCorporationUpdates({
  ...diffSearchArgs,
  from: dateRange.from,
  to: dateRange.to,
});
const multiNumberSet = new Set(multiNumberResult.corporations.map((item) => item.corporateNumber));
const nameMatch = nameSearchResult.corporations.find(
  (item) =>
    item.corporateNumber ===
    (expectedCorporateNumber ?? input.multiNumberQuery[0]),
);

assertCondition(
  input.multiNumberQuery.every((number) => multiNumberSet.has(number)),
  `advanced-filter-check failed: multi-number results did not include all requested corporate numbers.`,
);
assertCondition(
  !!nameMatch,
  "advanced-filter-check failed: filtered name search did not include the expected corporation.",
);
assertCondition(
  diffSearchResult.metadata.count > 0,
  "advanced-filter-check failed: filtered diff search returned no records.",
);

console.log(
  JSON.stringify(
    {
      multiNumberResult: {
        count: multiNumberResult.metadata.count,
        corporateNumbers: multiNumberResult.corporations.map((item) => item.corporateNumber),
      },
      nameSearchResult: {
        count: nameSearchResult.metadata.count,
        corporations: nameSearchResult.corporations.map((item) => ({
          corporateNumber: item.corporateNumber,
          name: item.name,
          kind: item.kind,
          prefectureName: item.prefectureName,
          assignmentDate: item.assignmentDate,
          latest: item.latest,
        })),
      },
      diffSearchResult: {
        dateRange,
        count: diffSearchResult.metadata.count,
        firstFive: diffSearchResult.corporations.slice(0, 5).map((item) => ({
          corporateNumber: item.corporateNumber,
          name: item.name,
          kind: item.kind,
          prefectureName: item.prefectureName,
          updateDate: item.updateDate,
          latest: item.latest,
        })),
      },
    },
    null,
    2,
  ),
);
