import { readFileSync } from "node:fs";

import { HoujinBangouApiClient, getApplicationIdFromEnv } from "../dist/nta-api.js";

type CompanyCheck = {
  label: string;
  name: string;
  expectedCorporateNumber: string;
};

type CheckInput = {
  companies: CompanyCheck[];
};

const input = JSON.parse(
  readFileSync("./scripts/manual-company-check.json", "utf8"),
) as CheckInput;

const client = new HoujinBangouApiClient(getApplicationIdFromEnv());

const results = await Promise.all(
  input.companies.map(async (company) => {
    const byName = await client.searchCorporationsByName({ name: company.name });
    const matched =
      byName.corporations.find(
        (corporation) => corporation.corporateNumber === company.expectedCorporateNumber,
      ) ?? null;

    const byNumber = await client.getCorporationByNumber({
      corporateNumber: company.expectedCorporateNumber,
      history: true,
    });

    return {
      label: company.label,
      queryName: company.name,
      expectedCorporateNumber: company.expectedCorporateNumber,
      searchCount: byName.metadata.count,
      matchedByName: matched
        ? {
            corporateNumber: matched.corporateNumber,
            name: matched.name,
            prefectureName: matched.prefectureName,
            cityName: matched.cityName,
            latest: matched.latest,
          }
        : null,
      byNumberCount: byNumber.metadata.count,
      byNumberLatestStates: byNumber.corporations.map((corporation) => ({
        corporateNumber: corporation.corporateNumber,
        name: corporation.name,
        latest: corporation.latest,
        closeDate: corporation.closeDate,
      })),
    };
  }),
);

console.log(JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
