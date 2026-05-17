// src/adapters/gemini.ts

export class GeminiAdapter {
  /** Build parts from OpenAI content (string or array) */
  private static buildParts(content: string | any[]): any[] {
    if (typeof content === "string") {
      return [{ text: content }];
    }
    if (Array.isArray(content)) {
      return content.map((item: any) => {
        if (item.type === "text") {
          return { text: item.text };
        }
        if (item.type === "image_url") {
          const url = item.image_url?.url || "";
          if (url.startsWith("data:")) {
            const [header, base64] = url.split(",");
            const mimeType = header.match(/data:(.*?);/)?.[1] || "image/png";
            return {
              inline_data: {
                mime_type: mimeType,
                data: base64,
              },
            };
          }
          return {
            file_data: {
              mime_type: "image/*",
              file_uri: url,
            },
          };
        }
        return { text: JSON.stringify(item) };
      });
    }
    return [{ text: String(content) }];
  }

  /** Convert OpenAI tool_calls to Gemini parts */
  private static buildPartsFromToolCalls(toolCalls: any[]): any[] {
    return toolCalls.map((tc: any) => ({
      functionCall: {
        name: tc.function?.name || "",
        args: this.safeParseJSON(tc.function?.arguments || "{}"),
      },
    }));
  }

  /** Convert OpenAI tool message to Gemini parts */
  private static buildPartsFromToolMessage(message: any): any[] {
    return [
      {
        functionResponse: {
          name: message.name || "",
          response: {
            content: message.content,
          },
        },
      },
    ];
  }

  /** Safe JSON parse with fallback */
  private static safeParseJSON(str: string): any {
    try {
      return JSON.parse(str);
    } catch {
      return {};
    }
  }

  /** Clean JSON Schema for Gemini (remove unsupported fields) */
  private static cleanSchemaForGemini(schema: any): any {
    if (!schema || typeof schema !== "object") return schema;

    if (Array.isArray(schema)) {
      return schema.map((item) => this.cleanSchemaForGemini(item));
    }

    const unsupportedFields = new Set([
      "$schema",
      "additionalProperties",
      "propertyNames",
      "exclusiveMinimum",
      "exclusiveMaximum",
      "const",
      "patternProperties",
      "dependencies",
      "examples",
      "default",
    ]);

    const cleaned: any = {};
    for (const [key, value] of Object.entries(schema)) {
      if (unsupportedFields.has(key)) {
        continue;
      }
      if (typeof value === "object" && value !== null) {
        cleaned[key] = this.cleanSchemaForGemini(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  /** Convert OpenAI tools to Gemini tools */
  private static convertTools(openAITools: any[]): any[] | undefined {
    if (!Array.isArray(openAITools) || openAITools.length === 0) return undefined;

    const functionDeclarations = openAITools
      .filter((t) => t.type === "function" && t.function)
      .map((t) => ({
        name: t.function.name,
        description: t.function.description || "",
        parameters: this.cleanSchemaForGemini(t.function.parameters || {}),
      }));

    if (functionDeclarations.length === 0) return undefined;

    return [{ functionDeclarations }];
  }

  /** Convert OpenAI tool_choice to Gemini toolConfig */
  private static convertToolChoice(toolChoice: any): any | undefined {
    if (!toolChoice) return undefined;

    let mode: string;
    let allowedFunctionNames: string[] | undefined;

    if (typeof toolChoice === "string") {
      if (toolChoice === "auto") {
        mode = "AUTO";
      } else if (toolChoice === "none") {
        mode = "NONE";
      } else {
        return undefined;
      }
    } else if (toolChoice.type === "function" && toolChoice.function?.name) {
      mode = "ANY";
      allowedFunctionNames = [toolChoice.function.name];
    } else {
      return undefined;
    }

    const config: any = { mode };
    if (allowedFunctionNames) {
      config.allowedFunctionNames = allowedFunctionNames;
    }

    return { functionCallingConfig: config };
  }

  /** OpenAI Chat -> Gemini Content */
  static toGemini(body: any) {
    const messages = body.messages || [];

    const contents: any[] = [];
    const systemParts: any[] = [];

    for (const m of messages) {
      if (m.role === "system") {
        const parts = this.buildParts(m.content);
        systemParts.push(...parts);
        continue;
      }

      if (m.role === "tool") {
        contents.push({
          role: "user",
          parts: this.buildPartsFromToolMessage(m),
        });
        continue;
      }

      if (m.role === "assistant" && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
        const parts: any[] = [];
        if (m.content) {
          parts.push(...this.buildParts(m.content));
        }
        parts.push(...this.buildPartsFromToolCalls(m.tool_calls));
        contents.push({
          role: "model",
          parts,
        });
        continue;
      }

      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: this.buildParts(m.content),
      });
    }

    const generationConfig: any = {
      maxOutputTokens: body.max_tokens ?? 16384,
      temperature: body.temperature ?? 0.3,
      topP: body.top_p,
      topK: body.top_k,
    };

    if (body.seed !== undefined) {
      generationConfig.seed = body.seed;
    }

    if (body.stop) {
      generationConfig.stopSequences = Array.isArray(body.stop) ? body.stop : [body.stop];
    }

    if (body.response_format?.type === "json_object") {
      generationConfig.responseMimeType = "application/json";
    }

    const result: any = {
      contents,
      generationConfig,
    };

    if (systemParts.length > 0) {
      result.systemInstruction = { parts: systemParts };
    }

    result.safetySettings = [
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    ];

    const tools = this.convertTools(body.tools);
    if (tools) {
      result.tools = tools;
    }

    const toolConfig = this.convertToolChoice(body.tool_choice);
    if (toolConfig) {
      result.toolConfig = toolConfig;
    }

    return result;
  }

  /** Extract text from Gemini parts array */
  private static extractTextFromParts(parts: any[]): string {
    if (!Array.isArray(parts)) return "";
    return parts
      .filter((p) => typeof p.text === "string")
      .map((p) => p.text)
      .join("");
  }

  /** Extract function calls from Gemini parts array */
  private static extractToolCallsFromParts(parts: any[]): any[] | undefined {
    if (!Array.isArray(parts)) return undefined;

    const functionCalls = parts.filter((p) => p.functionCall);
    if (functionCalls.length === 0) return undefined;

    return functionCalls.map((p, idx) => ({
      id: `call_${crypto.randomUUID().slice(0, 9)}_${idx}`,
      type: "function",
      function: {
        name: p.functionCall.name || "",
        arguments: JSON.stringify(p.functionCall.args || {}),
      },
    }));
  }

  /** Gemini Response -> OpenAI Response (非流式) */
  static toOpenAI(gemini: any, model: string) {
    const parts = gemini.candidates?.[0]?.content?.parts || [];
    const content = this.extractTextFromParts(parts);
    const toolCalls = this.extractToolCallsFromParts(parts);

    const message: any = {
      role: "assistant",
      content: content || null,
    };

    if (toolCalls && toolCalls.length > 0) {
      message.tool_calls = toolCalls;
    }

    return {
      id: `chatcmpl-${crypto.randomUUID()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          message,
          finish_reason: toolCalls && toolCalls.length > 0
            ? "tool_calls"
            : this.mapFinishReason(gemini.candidates?.[0]?.finishReason),
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
    const parts = gemini.candidates?.[0]?.content?.parts || [];
    const text = this.extractTextFromParts(parts);
    const toolCalls = this.extractToolCallsFromParts(parts);
    const finishReason = gemini.candidates?.[0]?.finishReason;

    const delta: any = isFirst ? { role: "assistant" } : {};

    if (text) {
      delta.content = text;
    } else if (!toolCalls || toolCalls.length === 0) {
      delta.content = "";
    }

    if (toolCalls && toolCalls.length > 0) {
      delta.tool_calls = toolCalls;
    }

    const mappedFinishReason = toolCalls && toolCalls.length > 0
      ? "tool_calls"
      : this.mapFinishReason(finishReason);

    const chunk = {
      id: `chatcmpl-${model}`,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          delta,
          finish_reason: mappedFinishReason,
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
