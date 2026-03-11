import type {
  CorporationListResponse,
  GetCorporationByNumberParams,
  GetCorporationUpdatesParams,
  SearchCorporationsByNameParams,
} from "./types.js";
import { parseCorporationListXml } from "./xml.js";

const DEFAULT_BASE_URL = "https://api.houjin-bangou.nta.go.jp/4";
const DEFAULT_RESPONSE_TYPE = "12";

export class HoujinBangouApiClient {
  constructor(
    private readonly applicationId: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly baseUrl: string = DEFAULT_BASE_URL,
  ) {}

  async getCorporationByNumber(
    params: GetCorporationByNumberParams,
  ): Promise<CorporationListResponse> {
    const query = new URLSearchParams({
      number: params.corporateNumber,
      history: params.history ? "1" : "0",
      type: DEFAULT_RESPONSE_TYPE,
    });

    return this.requestXml("/num", query);
  }

  async searchCorporationsByName(
    params: SearchCorporationsByNameParams,
  ): Promise<CorporationListResponse> {
    const query = new URLSearchParams({
      name: params.name,
      type: DEFAULT_RESPONSE_TYPE,
    });

    return this.requestXml("/name", query);
  }

  async getCorporationUpdates(
    params: GetCorporationUpdatesParams,
  ): Promise<CorporationListResponse> {
    const query = new URLSearchParams({
      from: params.from,
      to: params.to,
      type: DEFAULT_RESPONSE_TYPE,
    });

    return this.requestXml("/diff", query);
  }

  private async requestXml(path: string, params: URLSearchParams): Promise<CorporationListResponse> {
    params.set("id", this.applicationId);

    const url = `${this.baseUrl}${path}?${params.toString()}`;
    const response = await this.fetchImpl(url, {
      headers: {
        Accept: "application/xml",
      },
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`Corporate Number API request failed with ${response.status}: ${body}`);
    }

    return parseCorporationListXml(body);
  }
}

export function getApplicationIdFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  const applicationId = env.HOUJIN_BANGOU_API_APPLICATION_ID?.trim();
  if (!applicationId) {
    throw new Error(
      "Missing HOUJIN_BANGOU_API_APPLICATION_ID. Set it in your environment before starting the MCP server.",
    );
  }

  return applicationId;
}
