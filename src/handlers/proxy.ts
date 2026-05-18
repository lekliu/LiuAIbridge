// src/handlers/proxy.ts
/// <reference types="@cloudflare/workers-types" />
import { GeminiAdapter } from "../adapters/gemini";
import { AnthropicAdapter, ANTHROPIC_UPSTREAM_ORIGIN } from "../adapters/anthropic";
import { jsonRes, stripHeaders, CORS_HEADERS, createStreamErrorEvent, formatSSE } from "../utils/helpers";

const UPSTREAM_MAP: Record<string, string> = {
  "/google/": "https://generativelanguage.googleapis.com",
  "/openai/": "https://api.openai.com",
  "/anthropic/": ANTHROPIC_UPSTREAM_ORIGIN,
};

export async function handleProxy(
  request: Request,
  env: any,
  prefix: string,
  ctx: ExecutionContext,
) {
  const url = new URL(request.url);
  const serviceName = prefix.replace(/\//g, "").toUpperCase();
  const isOpenAIStyle = url.pathname.includes("/v1/chat/completions");

  let isStream = false;
  let requestBody: any = null;
  if (request.method === "POST") {
    requestBody = await request
      .clone()
      .json()
      .catch(() => ({}));
    isStream = requestBody.stream === true;
  }

  const rawConfig = await env.LIU_BRIDGE_KV.get(serviceName + "_CONFIG");
  if (!rawConfig)
    return jsonRes({ error: `Service ${serviceName} not configured` }, 404);

  const allKeys = JSON.parse(rawConfig);
  const activeKeys = allKeys.filter((k: any) => k.status === "enabled");
  if (activeKeys.length === 0)
    return jsonRes({ error: "No enabled keys available" }, 404);

  const randomIndex = Math.floor(Math.random() * activeKeys.length);
  const pickedKeyObj = activeKeys[randomIndex];
  const apiKey = pickedKeyObj.key;

  let targetUrl: string;
  let fetchOptions: any = {
    method: request.method,
    headers: stripHeaders(request.headers),
    body:
      request.method === "GET" || request.method === "HEAD"
        ? null
        : request.body,
    redirect: "follow",
  };

  if (prefix === "/google/") {
    if (isOpenAIStyle && request.method === "POST") {
      const action = isStream ? "streamGenerateContent" : "generateContent";
      const model = requestBody.model || "gemini-1.5-flash";
      targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}?key=${apiKey}`;
      fetchOptions.body = JSON.stringify(GeminiAdapter.toGemini(requestBody));
    } else {
      targetUrl = `https://generativelanguage.googleapis.com${url.pathname.slice(prefix.length - 1)}${url.search}`;
      const connector = url.search ? "&" : "?";
      targetUrl += `${connector}key=${apiKey}`;
    }
  } else {
    const host = UPSTREAM_MAP[prefix].replace("https://", "");
    const upstreamPath = `${url.pathname.slice(prefix.length - 1)}${url.search}`;

    if (
      prefix === "/anthropic/" &&
      AnthropicAdapter.isOpenAICompatPath(request.method, url.pathname)
    ) {
      targetUrl = `https://${host}${upstreamPath}`;
      fetchOptions.body = AnthropicAdapter.serializeOpenAICompatBody(requestBody);
      AnthropicAdapter.applyOpenAICompatAuth(fetchOptions.headers, apiKey);
    } else {
      targetUrl = `https://${host}${upstreamPath}`;
      if (prefix === "/anthropic/") {
        AnthropicAdapter.applyNativeAuth(fetchOptions.headers, apiKey);
      } else {
        fetchOptions.headers.set("Authorization", `Bearer ${apiKey}`);
      }
    }
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);

    if (response.status === 401) {
      console.error(
        `[Upstream Error] ${serviceName} API Key might be invalid (401)`,
      );
    }

    if (prefix === "/google/" && isOpenAIStyle && isStream) {
      const modelName = requestBody.model || "gemini-pro";
      
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ error: "Upstream service error" }))) as { error?: { message?: string } };
        const errorMessage = errorData.error?.message || `Upstream error: ${response.status}`;
        const errorEvent = createStreamErrorEvent(modelName, errorMessage, "upstream_error");
        return new Response(
          formatSSE(errorEvent) + formatSSE("[DONE]"),
          {
            headers: { ...CORS_HEADERS, "Content-Type": "text/event-stream" },
            status: response.status,
          }
        );
      }

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      (async () => {
        const reader = response.body?.getReader();
        let buffer = "";
        let isFirstChunk = true;
        try {
          while (reader) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let start;
            while ((start = buffer.indexOf("{")) !== -1) {
              let balance = 0;
              let end = -1;
              for (let i = start; i < buffer.length; i++) {
                if (buffer[i] === "{") balance++;
                if (buffer[i] === "}") balance--;
                if (balance === 0) {
                  end = i;
                  break;
                }
              }
              if (end !== -1) {
                const jsonStr = buffer.substring(start, end + 1);
                try {
                  const json = JSON.parse(jsonStr);
                  
                  if (json.error) {
                    const errorEvent = createStreamErrorEvent(
                      modelName,
                      json.error.message || "Stream processing error",
                      "stream_error"
                    );
                    await writer.write(encoder.encode(formatSSE(errorEvent)));
                    break;
                  }
                  
                  const openaiChunk = GeminiAdapter.toOpenAIStreamChunk(
                    json,
                    modelName,
                    isFirstChunk,
                  );
                  if (openaiChunk) {
                    await writer.write(encoder.encode(openaiChunk));
                    isFirstChunk = false;
                  }
                } catch (e: any) {
                  const errorEvent = createStreamErrorEvent(
                    modelName,
                    e.message || "JSON parse error",
                    "parse_error"
                  );
                  await writer.write(encoder.encode(formatSSE(errorEvent)));
                  console.error("Stream Parse Error:", e);
                  break;
                }
                buffer = buffer.substring(end + 1);
              } else break;
            }
          }
          await writer.write(encoder.encode(formatSSE("[DONE]")));
        } catch (e: any) {
          const errorEvent = createStreamErrorEvent(
            modelName,
            e.message || "Stream transform error",
            "transform_error"
          );
          try {
            await writer.write(encoder.encode(formatSSE(errorEvent) + formatSSE("[DONE]")));
          } catch (writeErr) {
            console.error("Failed to send error event:", writeErr);
          }
          console.error("Stream Transform Error:", e);
        } finally {
          writer.close();
        }
      })();

      return new Response(readable, {
        headers: { ...CORS_HEADERS, "Content-Type": "text/event-stream" },
      });
    }

    if (prefix === "/google/" && isOpenAIStyle && response.ok && !isStream) {
      const rawData = await response.json();
      return jsonRes(
        GeminiAdapter.toOpenAI(rawData, requestBody.model || "gemini-pro"),
      );
    }

    const responseHeaders = new Headers(response.headers);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => responseHeaders.set(k, v));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (e: any) {
    return jsonRes({ error: "LiuAIbridge Proxy Error: " + e.message }, 502);
  }
}
