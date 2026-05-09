// src/adapters/gemini.ts

export class GeminiAdapter {
  /** OpenAI Chat -> Gemini Content */
  static toGemini(body: any) {
    const messages = body.messages || [];
    return {
      contents: messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      // 传递安全设置等可选参数
      generationConfig: {
        maxOutputTokens: body.max_tokens,
        temperature: body.temperature,
        topP: body.top_p,
      },
    };
  }

  /** Gemini Response -> OpenAI Response (非流式) */
  static toOpenAI(gemini: any, model: string) {
    return {
      id: `chatcmpl-${crypto.randomUUID()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: gemini.candidates?.[0]?.content?.parts?.[0]?.text || "",
          },
          finish_reason: this.mapFinishReason(
            gemini.candidates?.[0]?.finishReason,
          ),
        },
      ],
      usage: {
        prompt_tokens: gemini.usageMetadata?.promptTokenCount || 0,
        completion_tokens: gemini.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: gemini.usageMetadata?.totalTokenCount || 0,
      },
    };
  }

  /** Gemini Chunk -> OpenAI Chunk (流式) */
  static toOpenAIStreamChunk(gemini: any, model: string, isFirst: boolean) {
    const text = gemini.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const finishReason = this.mapFinishReason(
      gemini.candidates?.[0]?.finishReason,
    );

    const chunk = {
      id: `chatcmpl-${model}`,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          delta: isFirst
            ? { role: "assistant", content: text }
            : { content: text },
          finish_reason: finishReason,
        },
      ],
    };

    return `data: ${JSON.stringify(chunk)}\n\n`;
  }

  private static mapFinishReason(reason: string) {
    const map: Record<string, string> = {
      STOP: "stop",
      MAX_TOKENS: "length",
      SAFETY: "content_filter",
      RECITATION: "content_filter",
      OTHER: "stop",
    };
    return map[reason] || null;
  }
}
