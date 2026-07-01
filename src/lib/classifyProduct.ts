import type { ClassifyResult, ParsedClassification } from "../types";
import { callVisionApi } from "./visionApi";

export type ProductClassifyInput = {
  dataUrl?: string;
  title?: string;
};

const SYSTEM_PROMPT = `你是一位 Amazon 电商视觉竞品筛选专家。你的任务是判断竞品是否适合作为“外观对标竞品”。

每个商品可能提供商品主图、商品标题，或两者同时提供。请综合所有可用信息判断，但有图片时必须优先看图片里的真实售卖商品和关键外观结构，标题只用于补充品类、尺寸、功能、材质等信息。

判断标准：
- 第一优先级是“跟我的商品长得一样或高度相似”：整体形状、外轮廓、结构、关键部件/附件、开合方式、纹理/表面处理、展示的使用方式要接近
- 如果找不到完全一样的，可接受相似款；颜色不同可以算竞品，不要因为颜色不同排除
- 材质不再一票否决：只要外形和核心功能基本一致，材质略有差异也可以算；但材质差异导致外观结构或使用方式明显不同，则不算
- 功能必须相近：功能完全不同不算；外观材质相近且功能只多或少 1～2 个小功能，可以算竞品
- 参考商品图片里出现的关键外观结构必须重点匹配。例如参考图是“带皮套/外罩/保护套/包边/套筒/外壳”的商品，竞品也应展示或标题明确包含同类皮套/外罩/保护结构；只有普通垫子、裸品、无皮套款，不算竞品
- 标题同品类但图片外观明显不像，优先按图片判定为不算；图片像但标题补充信息显示功能完全不同，也不算
- 如果某一侧只提供标题或只提供图片，也需要基于已有信息尽量判断；信息不足以确认关键外观结构时，应谨慎判定为不同并说明原因
- 必须给出 0～100 的匹配度分数：90～100 表示外观结构和功能高度接近；70～89 表示相似但有少量结构/功能差异；40～69 表示同大类但关键结构差异明显；0～39 表示外观或功能不适合作为对标竞品

床垫垫/床垫 topper 场景示例：
- 我的商品主图如果是带可见皮套/外罩的 mattress topper，则只有同样展示或明确描述带外罩/套子的 topper 才算竞品
- 普通波浪纹、蛋托纹、裸露海绵、只展示床上铺垫效果但没有皮套/外罩的 topper，即使标题也叫 mattress topper，也不算竞品

请仅输出纯 JSON，不要包含 markdown 代码块或其他文字。JSON 格式：
{
  "is_same_product_type": true或false,
  "match_score": 0到100之间的整数,
  "reference_product_type": "参考商品外观/功能简述（中文，包括关键结构）",
  "competitor_product_type": "竞品外观/功能简述（中文，包括关键结构）",
  "reason": "判断理由（中文，一句话，说明外观结构和功能是否匹配）"
}`;

function formatTitle(title?: string): string {
  const trimmed = title?.trim();
  return trimmed ? trimmed : "未提供";
}

function buildUserPrompt(
  reference: ProductClassifyInput,
  competitor: ProductClassifyInput,
): string {
  return `请判断竞品是否适合作为我的商品的外观对标竞品。优先看主图是否长得一样或高度相似；颜色不同可以；材质仅辅助；功能完全不同不算，功能只多或少 1～2 个小功能可以算。

特别注意：如果我的商品主图有皮套、外罩、保护套、包边、套筒、外壳等关键外观结构，竞品也必须有同类关键结构才算；只有同品类标题但外观结构不一致，应判定为不算。

我的商品标题：${formatTitle(reference.title)}
我的商品主图：${reference.dataUrl ? "已提供" : "未提供"}

竞品标题：${formatTitle(competitor.title)}
竞品主图：${competitor.dataUrl ? "已提供" : "未提供"}`;
}

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

  const rawMatchScore = Number(obj.match_score);
  const fallbackScore = obj.is_same_product_type ? 80 : 20;
  const matchScore = Number.isFinite(rawMatchScore)
    ? Math.round(Math.min(100, Math.max(0, rawMatchScore)))
    : fallbackScore;

  return {
    is_same_product_type: obj.is_same_product_type,
    match_score: matchScore,
    reference_product_type: String(obj.reference_product_type ?? ""),
    competitor_product_type: String(obj.competitor_product_type ?? ""),
    reason: String(obj.reason ?? ""),
  };
}

export async function classifySingleCompetitor(
  reference: ProductClassifyInput,
  competitorId: string,
  competitor: ProductClassifyInput,
  signal?: AbortSignal,
): Promise<ClassifyResult> {
  try {
    const raw = await callVisionApi(
      SYSTEM_PROMPT,
      buildUserPrompt(reference, competitor),
      reference.dataUrl,
      competitor.dataUrl,
      signal,
    );

    const parsed = parseClassificationResponse(raw);

    return {
      id: competitorId,
      status: parsed.is_same_product_type ? "matched" : "excluded",
      isSameProductType: parsed.is_same_product_type,
      matchScore: parsed.match_score,
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
  reference: ProductClassifyInput,
  competitors: Array<{ id: string } & ProductClassifyInput>,
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
      reference,
      comp.id,
      comp,
      signal,
    );

    results.push(result);
    onProgress(i + 1, total, result);
  }

  return results;
}
