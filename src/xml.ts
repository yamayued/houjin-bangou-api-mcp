import { XMLParser } from "fast-xml-parser";

import type { CorporationListResponse, CorporationRecord, CorporationResponseMeta } from "./types.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true,
});

type XmlNode = Record<string, unknown>;

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

function parseMetadata(root: XmlNode): CorporationResponseMeta {
  return {
    lastUpdateDate: asString(root.lastUpdateDate),
    count: asNumber(root.count) ?? 0,
    divideNumber: asNumber(root.divideNumber),
    divideSize: asNumber(root.divideSize),
  };
}

function parseCorporation(node: XmlNode): CorporationRecord {
  return {
    sequenceNumber: asNumber(node.sequenceNumber),
    corporateNumber: asString(node.corporateNumber) ?? "",
    process: asString(node.process),
    correct: asBooleanFlag(node.correct),
    updateDate: asString(node.updateDate),
    changeDate: asString(node.changeDate),
    name: asString(node.name) ?? "",
    kind: asString(node.kind),
    prefectureName: asString(node.prefectureName),
    cityName: asString(node.cityName),
    streetNumber: asString(node.streetNumber),
    prefectureCode: asString(node.prefectureCode),
    cityCode: asString(node.cityCode),
    postCode: asString(node.postCode),
    addressOutside: asString(node.addressOutside),
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

export function parseCorporationListXml(xml: string): CorporationListResponse {
  const parsed = parser.parse(xml) as { corporations?: XmlNode };
  const root = parsed.corporations;

  if (!root || typeof root !== "object") {
    throw new Error("Unexpected XML response from the Corporate Number API.");
  }

  return {
    metadata: parseMetadata(root),
    corporations: asCorporationArray(root.corporation).map(parseCorporation),
  };
}
