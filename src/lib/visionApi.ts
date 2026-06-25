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
  referenceDataUrl: string,
  competitorDataUrl: string,
  signal?: AbortSignal,
): Promise<string> {
  const body = {
    model: MODEL_NAME,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          {
            type: "image_url",
            image_url: { url: referenceDataUrl },
          },
          {
            type: "image_url",
            image_url: { url: competitorDataUrl },
          },
        ] satisfies VisionMessageContent[],
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

  const data = (await response.json()) as ChatCompletionResponse;

  if (!response.ok) {
    const msg = data.error?.message ?? `API 请求失败 (${response.status})`;
    throw new Error(msg);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error("模型返回内容为空");
  }

  return content.trim();
}
