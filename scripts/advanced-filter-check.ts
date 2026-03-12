import { readFileSync } from "node:fs";

import { HoujinBangouApiClient, getApplicationIdFromEnv } from "../dist/nta-api.js";

type Input = {
  multiNumberQuery: string[];
  nameSearch: {
    name: string;
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
    from: string;
    to: string;
    address?: string;
    kinds?: Array<"01" | "02" | "03" | "04">;
    divide?: number;
  };
};

const input = JSON.parse(
  readFileSync("./scripts/advanced-filter-check.json", "utf8"),
) as Input;

const client = new HoujinBangouApiClient(getApplicationIdFromEnv());

const multiNumberResult = await client.getCorporationByNumber({
  corporateNumbers: input.multiNumberQuery,
});
const nameSearchResult = await client.searchCorporationsByName(input.nameSearch);
const diffSearchResult = await client.getCorporationUpdates(input.diffSearch);

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
