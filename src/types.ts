export type CompetitorImage = {
  id: string;
  file?: File;
  previewUrl?: string;
  dataUrl?: string;
  title: string;
};

export type ReferenceImage = {
  file?: File;
  previewUrl?: string;
  dataUrl?: string;
  title: string;
};

export type ClassifyStatus =
  | "pending"
  | "analyzing"
  | "matched"
  | "excluded"
  | "error";

export type ClassifyResult = {
  id: string;
  status: ClassifyStatus;
  isSameProductType?: boolean;
  matchScore?: number;
  referenceProductType?: string;
  competitorProductType?: string;
  reason?: string;
  error?: string;
};

export type ParsedClassification = {
  is_same_product_type: boolean;
  match_score: number;
  reference_product_type: string;
  competitor_product_type: string;
  reason: string;
};
