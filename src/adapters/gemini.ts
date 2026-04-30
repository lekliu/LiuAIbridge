export class GeminiAdapter {
  /** OpenAI Chat -> Gemini Content */
  static toGemini(body: any) {
    const messages = body.messages || [];
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
    return { contents };
  }

  /** Gemini Response -> OpenAI Response */
  static toOpenAI(gemini: any, model: string) {
    const text = gemini.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: "stop"
      }],
      usage: gemini.usageMetadata || {}
    };
  }
}