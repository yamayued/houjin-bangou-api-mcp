import type {
  ApiResponseType,
  CorporationApiResponse,
  CorporationListResponse,
  GetCorporationByNumberParams,
  GetCorporationUpdatesParams,
  RawCorporationApiResponse,
  SearchCorporationsByNameParams,
} from "./types.js";
import { parseCorporationListXml } from "./xml.js";

const DEFAULT_BASE_URL = "https://api.houjin-bangou.nta.go.jp/4";
const DEFAULT_RESPONSE_TYPE: ApiResponseType = "12";
const CORPORATION_KIND_DELIMITER = ",";
const SHIFT_JIS_RESPONSE_TYPE: ApiResponseType = "01";
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

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

function resolveResponseType(value: ApiResponseType | undefined): ApiResponseType {
  return value ?? DEFAULT_RESPONSE_TYPE;
}

function buildRawResponse(
  responseType: Exclude<ApiResponseType, "12">,
  body: string,
  contentType: string | null,
): RawCorporationApiResponse {
  return {
    responseType,
    contentType,
    raw: body,
  };
}

function getDecoderLabel(responseType: ApiResponseType, contentType: string | null): string {
  const charset = contentType?.match(/charset=([^;]+)/i)?.[1]?.trim().toLowerCase();

  if (charset === "shift_jis" || charset === "shift-jis") {
    return "shift_jis";
  }

  if (charset === "utf-8" || charset === "utf8") {
    return "utf-8";
  }

  if (responseType === SHIFT_JIS_RESPONSE_TYPE) {
    return "shift_jis";
  }

  return "utf-8";
}

function decodeResponseBody(
  responseType: ApiResponseType,
  contentType: string | null,
  buffer: ArrayBuffer,
): string {
  const decoder = new TextDecoder(getDecoderLabel(responseType, contentType));
  return decoder.decode(buffer);
}

function createTimeoutError(timeoutMs: number): Error {
  return new Error(`Corporate Number API request timed out after ${timeoutMs} ms.`);
}

export class HoujinBangouApiClient {
  constructor(
    private readonly applicationId: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly baseUrl: string = DEFAULT_BASE_URL,
    private readonly timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
  ) {}

  async getCorporationByNumber(
    params: GetCorporationByNumberParams,
  ): Promise<CorporationApiResponse> {
    const numbers =
      params.corporateNumbers?.map((value) => value.trim()).filter((value) => value.length > 0) ??
      (params.corporateNumber ? [params.corporateNumber.trim()] : []);
    const responseType = resolveResponseType(params.responseType);
    const query = new URLSearchParams({
      number: numbers.join(","),
      history: params.history ? "1" : "0",
      type: responseType,
    });

    return this.request("/num", query, responseType);
  }

  async searchCorporationsByName(
    params: SearchCorporationsByNameParams,
  ): Promise<CorporationApiResponse> {
    const responseType = resolveResponseType(params.responseType);
    const query = new URLSearchParams({
      name: params.name.trim(),
      type: responseType,
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

    return this.request("/name", query, responseType);
  }

  async getCorporationUpdates(
    params: GetCorporationUpdatesParams,
  ): Promise<CorporationApiResponse> {
    const responseType = resolveResponseType(params.responseType);
    const query = new URLSearchParams({
      from: params.from.trim(),
      to: params.to.trim(),
      type: responseType,
    });
    appendOptionalParam(query, "address", params.address);
    appendKinds(query, params.kinds);
    appendOptionalParam(query, "divide", params.divide);

    return this.request("/diff", query, responseType);
  }

  private async request(
    path: string,
    params: URLSearchParams,
    responseType: ApiResponseType,
  ): Promise<CorporationApiResponse> {
    params.set("id", this.applicationId);

    const url = `${this.baseUrl}${path}?${params.toString()}`;
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      const response = await Promise.race([
        this.fetchImpl(url, {
          headers: {
            Accept: responseType === "12" ? "application/xml" : "text/csv",
          },
          signal: controller.signal,
        }),
        new Promise<Response>((_, reject) => {
          timeoutId = setTimeout(() => {
            controller.abort();
            reject(createTimeoutError(this.timeoutMs));
          }, this.timeoutMs);
        }),
      ]);

      const contentType = response.headers.get("content-type");
      const body = decodeResponseBody(responseType, contentType, await response.arrayBuffer());
      if (!response.ok) {
        throw new Error(formatApiError(response.status, body));
      }

      if (responseType === "12") {
        return parseCorporationListXml(body, { contentType });
      }

      return buildRawResponse(responseType, body, contentType);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw createTimeoutError(this.timeoutMs);
      }

      throw error;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
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
