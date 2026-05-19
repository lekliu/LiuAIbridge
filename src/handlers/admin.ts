import { jsonRes } from "../utils/helpers";
import { adminListModelsGoogle } from "./admin/list_models_google";
import { adminListModelsOpenAI } from "./admin/list_models_openai";
import { adminListModelsAnthropic } from "./admin/list_models_anthropic";
import { createLiuKVFromEnv, LiuKVClient } from "../utils/liukv";

async function mergeStatsFromLiuKV(env: any, config: Record<string, any[]>): Promise<Record<string, any[]>> {
  const liukv = createLiuKVFromEnv(env);
  if (!liukv.isEnabled()) return config;

  try {
    const allStats = await liukv.getAll();

    for (const [service, keys] of Object.entries(config)) {
      const serviceUpper = service.toUpperCase();
      
      keys.forEach((key: any) => {
        const keyId = LiuKVClient.safeKeyId(key.name, key.key);
        const baseKey = `${serviceUpper}_${keyId}`;
        
        key.successCount = parseInt(allStats[`${baseKey}_success`] || "0");
        key.failCount = parseInt(allStats[`${baseKey}_fail`] || "0");
        key.last = allStats[`${baseKey}_last`] || "";
      });
    }
  } catch (e) {
    console.error("[Stats] Failed to merge stats from LiuKV:", e);
  }

  return config;
}

export async function handleAdminAPI(request: Request, env: any) {
  const token = request.headers.get("X-Bridge-Token");
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN)
    return jsonRes({ error: "Unauthorized" }, 401);

  const url = new URL(request.url);

  if (url.pathname === "/admin/api/models/google") {
    return adminListModelsGoogle(env);
  }
  if (url.pathname === "/admin/api/models/openai") {
    return adminListModelsOpenAI(env);
  }
  if (url.pathname === "/admin/api/models/anthropic") {
    return adminListModelsAnthropic(env);
  }
  /** 兼容旧书签：等同于 google */
  if (url.pathname === "/admin/api/models") {
    return adminListModelsGoogle(env);
  }
  if (url.pathname.startsWith("/admin/api/models")) {
    return jsonRes(
      {
        error: "LiuAIbridge: 无效的模型列表路径",
        hint: "请使用 /admin/api/models/google、/openai 或 /anthropic",
      },
      404,
    );
  }

  const services = ["GOOGLE", "OPENAI", "ANTHROPIC"];
  const normalizedPath = url.pathname.replace(/\/$/, '');
    
  if (normalizedPath === "/admin/api/stats") {
    if (request.method === "GET") {
      const liukv = createLiuKVFromEnv(env);
      const allStats: Record<string, string> = liukv.isEnabled() 
        ? await liukv.getAll() 
        : {};
      
      const stats: any = { keyStats: {} };
      for (const s of services) {
        const raw = await env.LIU_BRIDGE_KV.get(`${s}_CONFIG`);
        if (raw) {
          const keys = JSON.parse(raw);
          keys.forEach((k: any) => {
            const keyId = LiuKVClient.safeKeyId(k.name, k.key);
            const baseKey = `${s}_${keyId}`;
            const keyId16 = k.key.substring(0, 16);
            stats.keyStats[keyId16] = {
              successCount: parseInt(allStats[`${baseKey}_success`] || "0"),
              failCount: parseInt(allStats[`${baseKey}_fail`] || "0"),
              last: allStats[`${baseKey}_last`] || "",
            };
          });
        }
      }
      return jsonRes({ stats: { ALL: stats } });
    }
    return jsonRes({ error: "Method Not Allowed" }, 405);
  }
  
  if (normalizedPath === "/admin/api/default-models") {
    console.log(`[DEBUG] default-models route matched, method: ${request.method}`);
    
    if (request.method === "GET") {
      try {
        const raw = await env.LIU_BRIDGE_KV.get("DEFAULT_MODELS_CONFIG");
        const config = raw ? JSON.parse(raw) : {};
        return jsonRes({
          google: config.google || [],
          openai: config.openai || [],
          anthropic: config.anthropic || [],
        });
      } catch (e: any) {
        console.error(`[ERROR] GET default-models: ${e?.message || String(e)}`);
        return jsonRes({ error: "Failed to load default models config" }, 500);
      }
    }
    
    if (request.method === "POST") {
      try {
        console.log("[DEBUG] POST default-models: reading body");
        
        const contentType = request.headers.get("content-type");
        console.log(`[DEBUG] POST default-models Content-Type: ${contentType}`);
        
        if (!contentType || !contentType.includes("application/json")) {
          return jsonRes({ 
            error: "Invalid Content-Type", 
            expected: "application/json",
            received: contentType
          }, 400);
        }
        
        const body = (await request.json()) as { google?: any[]; openai?: any[]; anthropic?: any[] };
        console.log(`[DEBUG] POST default-models body: ${JSON.stringify(body)}`);
        const google = Array.isArray(body.google) ? body.google : [];
        const openai = Array.isArray(body.openai) ? body.openai : [];
        const anthropic = Array.isArray(body.anthropic) ? body.anthropic : [];
        const config = { google, openai, anthropic };
        
        console.log(`[DEBUG] POST default-models saving: ${JSON.stringify(config)}`);
        
        if (!env.LIU_BRIDGE_KV) {
          throw new Error("KV storage not available");
        }
        
        await env.LIU_BRIDGE_KV.put("DEFAULT_MODELS_CONFIG", JSON.stringify(config));
        console.log("[DEBUG] POST default-models saved successfully");
        
        return jsonRes({ success: true, config });
      } catch (e: any) {
        console.error(`[ERROR] POST default-models: ${e?.message || String(e)}`);
        console.error(`[ERROR] Stack: ${e?.stack || "No stack"}`);
        
        const errorType = e?.message?.toLowerCase() || "unknown";
        let status = 500;
        
        if (errorType.includes("kv") || errorType.includes("storage")) {
          return jsonRes({ 
            error: "KV storage error", 
            details: e?.message || String(e),
            hint: "Please check KV namespace binding in Cloudflare Dashboard",
            path: normalizedPath,
            method: request.method
          }, 500);
        }
        
        if (errorType.includes("syntax") || errorType.includes("json")) {
          status = 400;
        }
        
        return jsonRes({ 
          error: "Failed to save default models config", 
          details: e?.message || String(e),
          path: normalizedPath,
          method: request.method,
          timestamp: new Date().toISOString()
        }, status);
      }
    }
    return jsonRes({ error: "Method Not Allowed" }, 405);
  }

  if (request.method === "GET") {
    const config: any = {};
    for (const s of services) {
      const kvKey = s + "_CONFIG";
      let data = [];
      const raw = await env.LIU_BRIDGE_KV.get(kvKey);

      if (raw) {
        data = JSON.parse(raw);
        let needsUpdate = false;
        data.forEach((item: any, index: number) => {
          if (!item.name) { item.name = `Key #${index + 1}`; needsUpdate = true; }
          if (item.count !== undefined) {
            item.successCount = item.count;
            item.failCount = 0;
            delete item.count;
            needsUpdate = true;
          }
        });
        if (needsUpdate) {
          await env.LIU_BRIDGE_KV.put(kvKey, JSON.stringify(data));
        }
      }

      config[s.toLowerCase()] = data;
    }

    const configWithStats = await mergeStatsFromLiuKV(env, config);
    return jsonRes({ config: configWithStats });
  }

  if (request.method === "POST") {
    const { service, data } = (await request.json()) as any;
    await env.LIU_BRIDGE_KV.put(
      service.toUpperCase() + "_CONFIG",
      JSON.stringify(data),
    );
    return jsonRes({ success: true });
  }

  return jsonRes({ error: "Method Not Allowed" }, 405);
}
