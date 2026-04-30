import { GeminiAdapter } from "../adapters/gemini";
import { jsonRes, stripHeaders, CORS_HEADERS } from "../utils/helpers";

const UPSTREAM_MAP: Record<string, string> = {
  "/google/": "https://generativelanguage.googleapis.com",
  "/openai/": "https://api.openai.com",
  "/anthropic/": "https://api.anthropic.com",
};

async function logUsage(env: any, service: string) {
  const activeKey = `LAST_ACTIVE:${service}`;
  await env.LIU_BRIDGE_KV.put(
    activeKey, 
    new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
  );
}

export async function handleProxy(request: Request, env: any, prefix: string, ctx: ExecutionContext) {
  const url = new URL(request.url);
  const isOpenAIStyle = url.pathname.includes("/v1/chat/completions");
  const serviceName = prefix.replace(/\//g, "").toUpperCase(); // 如 "GOOGLE"
  
  const kvKey = prefix.toUpperCase().replace(/\//g, "") + "_API_KEY";
  const rawKeys = await env.LIU_BRIDGE_KV.get(kvKey);

  if (!rawKeys) return jsonRes({ error: "No Keys" }, 404);
  const keyPool = rawKeys.split(/[\s,\n]+/).filter(k => k.trim().length > 0);

  if (keyPool.length === 0) return jsonRes({ error: "API Key pool is empty" }, 404);

  // --- 🔥 核心修改：从随机改为轮询 ---
  
  const statsKey = `STATS:${serviceName}`;
  // 1. 先从 KV 获取当前总请求数并 +1
  const prevCount = parseInt(await env.LIU_BRIDGE_KV.get(statsKey) || "0");
  const newCount = prevCount + 1;

  // 2. 立即存回 KV（提前占位，防止并发冲突）
  await env.LIU_BRIDGE_KV.put(statsKey, newCount.toString());

  // 3. 用最新的计数取模，算出本次该用哪个 Key
  const keyIndex = newCount % keyPool.length;
  const apiKey = keyPool[keyIndex];

  console.log(`[LiuAIbridge] Service: ${serviceName} | Pool: ${keyPool.length} | Round-Robin Index: ${keyIndex}`);

  let targetUrl: string;
  let fetchOptions: any = {
    method: request.method,
    headers: stripHeaders(request.headers),
    body: request.body,
    redirect: "follow"
  };

  if (prefix === "/google/") {
    if (isOpenAIStyle && request.method === "POST") {
      const body = await request.clone().json();
      const model = body.model || "gemini-1.5-flash";
      targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      fetchOptions.body = JSON.stringify(GeminiAdapter.toGemini(body));
    } else {
      targetUrl = `https://generativelanguage.googleapis.com${url.pathname.slice(prefix.length - 1)}${url.search}`;
      targetUrl += (url.search ? "&" : "?") + `key=${apiKey}`;
    }
  } else {
    const host = UPSTREAM_MAP[prefix].replace("https://", "");
    targetUrl = `https://${host}${url.pathname.slice(prefix.length - 1)}${url.search}`;
    if (prefix === "/anthropic/") {
      fetchOptions.headers.set("x-api-key", apiKey);
      fetchOptions.headers.set("anthropic-version", "2023-06-01");
    } else {
      fetchOptions.headers.set("Authorization", `Bearer ${apiKey}`);
    }
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);
    if (response.ok) ctx.waitUntil(logUsage(env, prefix.replace(/\//g, "").toUpperCase()));

    if (prefix === "/google/" && isOpenAIStyle && response.ok && !response.headers.get("content-type")?.includes("text/event-stream")) {
      const data = await response.json();
      const body = await request.clone().json();
      return jsonRes(GeminiAdapter.toOpenAI(data, body.model || "gemini-pro"));
    }

    const newHeaders = new Headers(response.headers);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => newHeaders.set(k, v));
    return new Response(response.body, { status: response.status, headers: newHeaders });
  } catch (e: any) {
    return jsonRes({ error: e.message }, 502);
  }
}