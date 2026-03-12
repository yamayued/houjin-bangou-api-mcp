import type {
  CorporationListResponse,
  GetCorporationByNumberParams,
  GetCorporationUpdatesParams,
  SearchCorporationsByNameParams,
} from "./types.js";
import { parseCorporationListXml } from "./xml.js";

const DEFAULT_BASE_URL = "https://api.houjin-bangou.nta.go.jp/4";
const DEFAULT_RESPONSE_TYPE = "12";
const CORPORATION_KIND_DELIMITER = ",";

function appendOptionalParam(params: URLSearchParams, key: string, value: string | number | null | undefined): void {
  if (value === null || value === undefined) {
    return;
  }

  const text = String(value).trim();
  if (text.length === 0) {
    return;
  }

  params.set(key, text);
}

function appendBooleanFlag(params: URLSearchParams, key: string, value: boolean | undefined): void {
  if (value === undefined) {
    return;
  }

  params.set(key, value ? "1" : "0");
}

function appendKinds(params: URLSearchParams, kinds: string[] | undefined): void {
  if (!kinds || kinds.length === 0) {
    return;
  }

  params.set("kind", kinds.join(CORPORATION_KIND_DELIMITER));
}

function formatApiError(status: number, body: string): string {
  const trimmedBody = body.trim();
  const match = trimmedBody.match(/^(\d{3}),(.*)$/s);

  if (match) {
    const [, code, message] = match;
    return `Corporate Number API request failed with ${status} (code ${code}): ${message.trim()}`;
  }

  return `Corporate Number API request failed with ${status}: ${trimmedBody}`;
}

export class HoujinBangouApiClient {
  constructor(
    private readonly applicationId: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly baseUrl: string = DEFAULT_BASE_URL,
  ) {}

  async getCorporationByNumber(
    params: GetCorporationByNumberParams,
  ): Promise<CorporationListResponse> {
    const numbers =
      params.corporateNumbers?.map((value) => value.trim()).filter((value) => value.length > 0) ??
      (params.corporateNumber ? [params.corporateNumber.trim()] : []);
    const query = new URLSearchParams({
      number: numbers.join(","),
      history: params.history ? "1" : "0",
      type: DEFAULT_RESPONSE_TYPE,
    });

    return this.requestXml("/num", query);
  }

  async searchCorporationsByName(
    params: SearchCorporationsByNameParams,
  ): Promise<CorporationListResponse> {
    const query = new URLSearchParams({
      name: params.name.trim(),
      type: DEFAULT_RESPONSE_TYPE,
    });
    appendOptionalParam(query, "mode", params.mode);
    appendOptionalParam(query, "target", params.target);
    appendOptionalParam(query, "address", params.address);
    appendKinds(query, params.kinds);
    appendBooleanFlag(query, "change", params.change);
    appendBooleanFlag(query, "close", params.close);
    appendOptionalParam(query, "from", params.assignmentFrom);
    appendOptionalParam(query, "to", params.assignmentTo);
    appendOptionalParam(query, "divide", params.divide);

    return this.requestXml("/name", query);
  }

  async getCorporationUpdates(
    params: GetCorporationUpdatesParams,
  ): Promise<CorporationListResponse> {
    const query = new URLSearchParams({
      from: params.from.trim(),
      to: params.to.trim(),
      type: DEFAULT_RESPONSE_TYPE,
    });
    appendOptionalParam(query, "address", params.address);
    appendKinds(query, params.kinds);
    appendOptionalParam(query, "divide", params.divide);

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
      throw new Error(formatApiError(response.status, body));
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

export { formatApiError };
