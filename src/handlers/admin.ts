import { jsonRes } from "../utils/helpers";

export async function handleAdminAPI(request: Request, env: any) {
  const token = request.headers.get("X-Bridge-Token");
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) return jsonRes({ error: "Unauthorized" }, 401);

  if (request.method === "GET") {
    const getStats = async (name: string) => {
      const raw = await env.LIU_BRIDGE_KV.get(name + "_API_KEY");
      const count = await env.LIU_BRIDGE_KV.get("STATS:" + name) || "0";
      const lastActive = await env.LIU_BRIDGE_KV.get("LAST_ACTIVE:" + name) || "从未活跃";
      const keyCount = raw ? raw.split(/[\s,\n]+/).filter((k: string) => k.trim().length > 0).length : 0;
      return { keyCount, count, lastActive };
    };
    return jsonRes({
      keys: {
        google: await getStats("GOOGLE"),
        openai: await getStats("OPENAI"),
        anthropic: await getStats("ANTHROPIC"),
      }
    });
  }

  if (request.method === "POST") {
    const { service, key } = await request.json() as any;
    await env.LIU_BRIDGE_KV.put(service.toUpperCase() + "_API_KEY", key);
    return jsonRes({ success: true });
  }
  return jsonRes({ error: "Not Allowed" }, 405);
}