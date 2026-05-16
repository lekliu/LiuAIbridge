import { jsonRes } from "../utils/helpers";
import { adminListModelsGoogle } from "./admin/list_models_google";
import { adminListModelsOpenAI } from "./admin/list_models_openai";
import { adminListModelsAnthropic } from "./admin/list_models_anthropic";

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
          if (item.successCount === undefined) item.successCount = 0;
          if (item.failCount === undefined) item.failCount = 0;
        });
        if (needsUpdate) {
          await env.LIU_BRIDGE_KV.put(kvKey, JSON.stringify(data));
        }
      }
      config[s.toLowerCase()] = data;
    }
    return jsonRes({ config });
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
