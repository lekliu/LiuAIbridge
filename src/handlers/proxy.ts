// src/handlers/proxy.ts
/// <reference types="@cloudflare/workers-types" />
import { GeminiAdapter } from "../adapters/gemini";
import { jsonRes, stripHeaders, CORS_HEADERS } from "../utils/helpers";

const UPSTREAM_MAP: Record<string, string> = {
  "/google/": "https://generativelanguage.googleapis.com",
  "/openai/": "https://api.openai.com",
  "/anthropic/": "https://api.anthropic.com",
};

/**
 * 统计逻辑：更新具体某个 Key 的使用次数和最后活跃时间
 */
async function updateKeyStats(env: any, service: string, keyId: string, isSuccess: boolean) {
  try {
    const kvKey = service + "_CONFIG";
    const raw = await env.LIU_BRIDGE_KV.get(kvKey);
    if (!raw) return;

    let config = JSON.parse(raw);
    const idx = config.findIndex((k: any) => k.id === keyId);
    if (idx !== -1) {
      if (isSuccess) {
        config[idx].successCount = (config[idx].successCount || 0) + 1;
      } else {
        config[idx].failCount = (config[idx].failCount || 0) + 1;
      }
      config[idx].last = new Date().toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
      });
      await env.LIU_BRIDGE_KV.put(kvKey, JSON.stringify(config));
    }

    // 更新全局统计用于轮询计算
    const statsKey = `STATS:${service}`;
    const total = parseInt((await env.LIU_BRIDGE_KV.get(statsKey)) || "0");
    await env.LIU_BRIDGE_KV.put(statsKey, (total + 1).toString());
  } catch (e) {
    console.error("Stats Update Error:", e);
  }
}

export async function handleProxy(
  request: Request,
  env: any,
  prefix: string,
  ctx: ExecutionContext,
) {
  const url = new URL(request.url);
  const serviceName = prefix.replace(/\//g, "").toUpperCase();
  const isOpenAIStyle = url.pathname.includes("/v1/chat/completions");

  // 1. 获取并解析 JSON Key 池
  const rawConfig = await env.LIU_BRIDGE_KV.get(serviceName + "_CONFIG");
  if (!rawConfig)
    return jsonRes({ error: `Service ${serviceName} not configured` }, 404);

  const allKeys = JSON.parse(rawConfig);
  // 筛选启用的 Key
  const activeKeys = allKeys.filter((k: any) => k.status === "enabled");
  if (activeKeys.length === 0)
    return jsonRes({ error: "No enabled keys available" }, 404);

  // 2. 轮询算法
  const globalCount = parseInt(
    (await env.LIU_BRIDGE_KV.get(`STATS:${serviceName}`)) || "0",
  );
  const pickedKeyObj = activeKeys[globalCount % activeKeys.length];
  const apiKey = pickedKeyObj.key;

  // 3. 构造上游请求配置
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
      // OpenAI 协议转 Gemini 协议逻辑
      const body = await request.clone().json();
      const model = body.model || "gemini-1.5-flash";
      targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      fetchOptions.body = JSON.stringify(GeminiAdapter.toGemini(body));
    } else {
      // 原生 Gemini 请求逻辑
      targetUrl = `https://generativelanguage.googleapis.com${url.pathname.slice(prefix.length - 1)}${url.search}`;
      const connector = url.search ? "&" : "?";
      targetUrl += `${connector}key=${apiKey}`;
    }
  } else {
    // OpenAI 或 Anthropic 请求逻辑
    const host = UPSTREAM_MAP[prefix].replace("https://", "");
    targetUrl = `https://${host}${url.pathname.slice(prefix.length - 1)}${url.search}`;
    if (prefix === "/anthropic/") {
      fetchOptions.headers.set("x-api-key", apiKey);
      fetchOptions.headers.set("anthropic-version", "2023-06-01");
    } else {
      fetchOptions.headers.set("Authorization", `Bearer ${apiKey}`);
    }
  }

  // 4. 发起请求并处理响应
  try {
    const response = await fetch(targetUrl, fetchOptions);

    // 成功后异步记录单 Key 统计
    ctx.waitUntil(updateKeyStats(env, serviceName, pickedKeyObj.id, response.ok));

    // 5. 响应处理：处理 Google 的 OpenAI 协议转换（非流式）
    if (prefix === "/google/" && isOpenAIStyle && response.ok) {
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/event-stream")) {
        const rawData = await response.json();
        const originalBody = await request.clone().json();
        // 转换为 OpenAI 兼容格式
        return jsonRes(
          GeminiAdapter.toOpenAI(rawData, originalBody.model || "gemini-pro"),
        );
      }
    }

    // 6. 默认透传响应（支持流式 Streaming）
    const responseHeaders = new Headers(response.headers);
    // 注入全局跨域头
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
