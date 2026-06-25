import type { ClassifyResult, ParsedClassification } from "../types";
import { callVisionApi } from "./visionApi";

const SYSTEM_PROMPT = `你是一位 Amazon 电商品类分析专家。你的任务是判断两张商品主图是否属于同一产品类型（可作为对标竞品）。

判断标准：
- 关注产品品类/功能类型，而非品牌、颜色、包装细节
- 同一产品类型：例如 slow cooker（慢炖锅）与另一款 slow cooker，即使外观不同也应判定为同一类型
- 不同产品类型：例如 slow cooker 与 liner（内胆/衬垫）、pressure cooker（压力锅）、配件、盖子单独售卖等，应判定为不同类型

请仅输出纯 JSON，不要包含 markdown 代码块或其他文字。JSON 格式：
{
  "is_same_product_type": true或false,
  "reference_product_type": "参考图产品类型（中文简述）",
  "competitor_product_type": "竞品图产品类型（中文简述）",
  "reason": "判断理由（中文，一句话）"
}`;

const USER_PROMPT =
  "第一张图片是我的商品主图（参考图），第二张图片是竞品主图。请判断竞品是否与我的商品属于同一产品类型。";

export function parseClassificationResponse(
  raw: string,
): ParsedClassification {
  const trimmed = raw.trim();

  try {
    return validateParsed(JSON.parse(trimmed));
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("无法解析模型返回的 JSON");
    }
    return validateParsed(JSON.parse(match[0]));
  }
}

function validateParsed(data: unknown): ParsedClassification {
  if (!data || typeof data !== "object") {
    throw new Error("模型返回格式无效");
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.is_same_product_type !== "boolean") {
    throw new Error("缺少 is_same_product_type 字段");
  }

  return {
    is_same_product_type: obj.is_same_product_type,
    reference_product_type: String(obj.reference_product_type ?? ""),
    competitor_product_type: String(obj.competitor_product_type ?? ""),
    reason: String(obj.reason ?? ""),
  };
}

export async function classifySingleCompetitor(
  referenceDataUrl: string,
  competitorId: string,
  competitorDataUrl: string,
  signal?: AbortSignal,
): Promise<ClassifyResult> {
  try {
    const raw = await callVisionApi(
      SYSTEM_PROMPT,
      USER_PROMPT,
      referenceDataUrl,
      competitorDataUrl,
      signal,
    );

    const parsed = parseClassificationResponse(raw);

    return {
      id: competitorId,
      status: parsed.is_same_product_type ? "matched" : "excluded",
      isSameProductType: parsed.is_same_product_type,
      referenceProductType: parsed.reference_product_type,
      competitorProductType: parsed.competitor_product_type,
      reason: parsed.reason,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    return {
      id: competitorId,
      status: "error",
      error: err instanceof Error ? err.message : "分析失败",
    };
  }
}

export type ClassifyProgressCallback = (
  current: number,
  total: number,
  result: ClassifyResult,
) => void;

export async function classifyCompetitors(
  referenceDataUrl: string,
  competitors: Array<{ id: string; dataUrl: string }>,
  onProgress: ClassifyProgressCallback,
  signal?: AbortSignal,
): Promise<ClassifyResult[]> {
  const results: ClassifyResult[] = [];
  const total = competitors.length;

  for (let i = 0; i < competitors.length; i++) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const comp = competitors[i];
    onProgress(i + 1, total, {
      id: comp.id,
      status: "analyzing",
    });

    const result = await classifySingleCompetitor(
      referenceDataUrl,
      comp.id,
      comp.dataUrl,
      signal,
    );

    results.push(result);
    onProgress(i + 1, total, result);
  }

  return results;
}
