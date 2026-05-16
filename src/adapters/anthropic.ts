// src/adapters/anthropic.ts
//
// 与 GeminiAdapter 对称：集中 Claude / Anthropic 上游约定。
// OpenAI 形态（/v1/chat/completions）当前为转发 Anthropic 官方 OpenAI SDK 兼容端，
// 请求/响应/SSE 由上游完成，故此处无 toMessages / toOpenAI 等 JSON 转换；若改为走
// 原生 Messages API 再输出 OpenAI 形态，可在此扩展对应静态方法。

/** Anthropic API 根域名（与官方 OpenAI SDK baseURL 一致） */
export const ANTHROPIC_UPSTREAM_ORIGIN = "https://api.anthropic.com";

export class AnthropicAdapter {
  /**
   * 是否使用 Anthropic 官方 **OpenAI 兼容**端点（chat.completions）。
   * 见：https://docs.anthropic.com/en/api/openai-sdk
   */
  static isOpenAICompatPath(method: string, pathname: string): boolean {
    return method === "POST" && pathname.includes("/v1/chat/completions");
  }

  /** 原生 Claude API（如 /v1/messages） */
  static applyNativeAuth(headers: Headers, apiKey: string): void {
    headers.set("x-api-key", apiKey);
    headers.set("anthropic-version", "2023-06-01");
  }

  /**
   * OpenAI 兼容层：与官方 OpenAI SDK 将 baseURL 设为 Anthropic 时一致，
   * 使用 Bearer + Claude API Key（不使用 x-api-key）。
   */
  static applyOpenAICompatAuth(headers: Headers, apiKey: string): void {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }

  /** 兼容层 POST body：与下游 OpenAI Chat 请求 JSON 一致 */
  static serializeOpenAICompatBody(parsedBody: unknown): string {
    return JSON.stringify(parsedBody ?? {});
  }
}
