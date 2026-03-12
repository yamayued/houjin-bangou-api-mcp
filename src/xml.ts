import { XMLParser } from "fast-xml-parser";

import type { CorporationListResponse, CorporationRecord, CorporationResponseMeta } from "./types.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true,
});
const BODY_PREVIEW_LENGTH = 160;

type XmlNode = Record<string, unknown>;
type ParseXmlOptions = {
  contentType?: string | null;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  const text = asString(value);
  if (text === null) {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function asBooleanFlag(value: unknown): boolean | null {
  const text = asString(value);
  if (text === null) {
    return null;
  }

  if (text === "1") {
    return true;
  }

  if (text === "0") {
    return false;
  }

  return null;
}

function asCorporationArray(value: unknown): XmlNode[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is XmlNode => item !== null && typeof item === "object");
  }

  if (value !== null && typeof value === "object") {
    return [value as XmlNode];
  }

  return [];
}

function formatPreview(value: string): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (normalized.length <= BODY_PREVIEW_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, BODY_PREVIEW_LENGTH)}...`;
}

function buildUnexpectedXmlErrorMessage(
  xml: string,
  options: ParseXmlOptions,
  detail?: string,
): string {
  const diagnostics: string[] = [];

  if (options.contentType) {
    diagnostics.push(`content-type: ${options.contentType}`);
  }

  const preview = formatPreview(xml);
  if (preview.length > 0) {
    diagnostics.push(`preview: ${preview}`);
  }

  if (detail) {
    diagnostics.push(`detail: ${detail}`);
  }

  if (diagnostics.length === 0) {
    return "Unexpected XML response from the Corporate Number API.";
  }

  return `Unexpected XML response from the Corporate Number API (${diagnostics.join(", ")}).`;
}

function requireCorporationField(
  node: XmlNode,
  fieldName: "corporateNumber" | "name",
  index: number,
): string {
  const value = asString(node[fieldName]);
  if (value === null) {
    throw new Error(
      `Corporation record ${index + 1} is missing required field "${fieldName}".`,
    );
  }

  return value;
}

function parseMetadata(root: XmlNode): CorporationResponseMeta {
  return {
    lastUpdateDate: asString(root.lastUpdateDate),
    count: asNumber(root.count) ?? 0,
    divideNumber: asNumber(root.divideNumber),
    divideSize: asNumber(root.divideSize),
  };
}

function parseCorporation(node: XmlNode, index: number): CorporationRecord {
  const corporateNumber = requireCorporationField(node, "corporateNumber", index);
  const name = requireCorporationField(node, "name", index);

  return {
    sequenceNumber: asNumber(node.sequenceNumber),
    corporateNumber,
    process: asString(node.process),
    correct: asBooleanFlag(node.correct),
    updateDate: asString(node.updateDate),
    changeDate: asString(node.changeDate),
    name,
    nameImageId: asString(node.nameImageId),
    kind: asString(node.kind),
    prefectureName: asString(node.prefectureName),
    cityName: asString(node.cityName),
    streetNumber: asString(node.streetNumber),
    addressImageId: asString(node.addressImageId),
    prefectureCode: asString(node.prefectureCode),
    cityCode: asString(node.cityCode),
    postCode: asString(node.postCode),
    addressOutside: asString(node.addressOutside),
    addressOutsideImageId: asString(node.addressOutsideImageId),
    closeDate: asString(node.closeDate),
    closeCause: asString(node.closeCause),
    successorCorporateNumber: asString(node.successorCorporateNumber),
    changeCause: asString(node.changeCause),
    assignmentDate: asString(node.assignmentDate),
    latest: asBooleanFlag(node.latest),
    enName: asString(node.enName),
    enPrefectureName: asString(node.enPrefectureName),
    enCityName: asString(node.enCityName),
    enAddressOutside: asString(node.enAddressOutside),
    furigana: asString(node.furigana),
    hidden: asBooleanFlag(node.hihyoji),
  };
}

export function parseCorporationListXml(
  xml: string,
  options: ParseXmlOptions = {},
): CorporationListResponse {
  let parsed: { corporations?: XmlNode };

  try {
    parsed = parser.parse(xml) as { corporations?: XmlNode };
  } catch (error) {
    throw new Error(
      buildUnexpectedXmlErrorMessage(
        xml,
        options,
        error instanceof Error ? error.message : String(error),
      ),
    );
  }

  const root = parsed.corporations;

  if (!root || typeof root !== "object") {
    throw new Error(buildUnexpectedXmlErrorMessage(xml, options));
  }

  return {
    metadata: parseMetadata(root),
    corporations: asCorporationArray(root.corporation).map(parseCorporation),
  };
}
