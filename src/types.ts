export type ApiResponseType = "01" | "02" | "12";

export interface CorporationRecord {
  sequenceNumber: number | null;
  corporateNumber: string;
  process: string | null;
  correct: boolean | null;
  updateDate: string | null;
  changeDate: string | null;
  name: string;
  nameImageId: string | null;
  kind: string | null;
  prefectureName: string | null;
  cityName: string | null;
  streetNumber: string | null;
  addressImageId: string | null;
  prefectureCode: string | null;
  cityCode: string | null;
  postCode: string | null;
  addressOutside: string | null;
  addressOutsideImageId: string | null;
  closeDate: string | null;
  closeCause: string | null;
  successorCorporateNumber: string | null;
  changeCause: string | null;
  assignmentDate: string | null;
  latest: boolean | null;
  enName: string | null;
  enPrefectureName: string | null;
  enCityName: string | null;
  enAddressOutside: string | null;
  furigana: string | null;
  hidden: boolean | null;
}

export interface CorporationResponseMeta {
  lastUpdateDate: string | null;
  count: number;
  divideNumber: number | null;
  divideSize: number | null;
}

export interface CorporationListResponse {
  metadata: CorporationResponseMeta;
  corporations: CorporationRecord[];
}

export interface RawCorporationApiResponse {
  responseType: Exclude<ApiResponseType, "12">;
  contentType: string | null;
  raw: string;
}

export type CorporationApiResponse = CorporationListResponse | RawCorporationApiResponse;

export interface GetCorporationByNumberParams {
  corporateNumber?: string;
  corporateNumbers?: string[];
  history?: boolean;
  responseType?: ApiResponseType;
}

export interface SearchCorporationsByNameParams {
  name: string;
  responseType?: ApiResponseType;
  mode?: 1 | 2;
  target?: 1 | 2 | 3;
  address?: string;
  kinds?: Array<"01" | "02" | "03" | "04">;
  change?: boolean;
  close?: boolean;
  assignmentFrom?: string;
  assignmentTo?: string;
  divide?: number;
}

export interface GetCorporationUpdatesParams {
  from: string;
  to: string;
  responseType?: ApiResponseType;
  address?: string;
  kinds?: Array<"01" | "02" | "03" | "04">;
  divide?: number;
}
