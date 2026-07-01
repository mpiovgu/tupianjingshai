import { API_BASE_URL, API_KEY, MODEL_NAME } from "../config";

type VisionMessageContent =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string };
};

function parseJsonResponse(raw: string): ChatCompletionResponse | null {
  if (!raw.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw) as ChatCompletionResponse;
  } catch {
    return null;
  }
}

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (API_KEY) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }
  return headers;
}

function resolveEndpoint(): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  if (base.endsWith("/chat/completions")) {
    return base;
  }
  return `${base}/chat/completions`;
}

export async function callVisionApi(
  systemPrompt: string,
  userText: string,
  referenceDataUrl?: string,
  competitorDataUrl?: string,
  signal?: AbortSignal,
): Promise<string> {
  const messageContent: VisionMessageContent[] = [
    { type: "text", text: userText },
  ];

  if (referenceDataUrl) {
    messageContent.push(
      { type: "text", text: "我的商品主图：" },
      {
        type: "image_url",
        image_url: { url: referenceDataUrl },
      },
    );
  }

  if (competitorDataUrl) {
    messageContent.push(
      { type: "text", text: "竞品主图：" },
      {
        type: "image_url",
        image_url: { url: competitorDataUrl },
      },
    );
  }

  const body = {
    model: MODEL_NAME,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: messageContent,
      },
    ],
    temperature: 0.1,
    max_tokens: 256,
  };

  let response: Response;
  try {
    response = await fetch(resolveEndpoint(), {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    throw new Error("网络连接失败，请检查网络或 API 地址");
  }

  const responseText = await response.text();
  const data = parseJsonResponse(responseText);

  if (!response.ok) {
    const fallbackMessage =
      responseText.trim() || `API 请求失败 (${response.status})`;
    const msg = data?.error?.message ?? fallbackMessage;
    throw new Error(msg);
  }

  if (!data) {
    throw new Error("API 返回内容为空或不是 JSON，请检查 API 地址与本地代理配置");
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error("模型返回内容为空");
  }

  return content.trim();
}
