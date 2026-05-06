import { jsonRes } from "../utils/helpers";

export async function handleAdminAPI(request: Request, env: any) {
  const token = request.headers.get("X-Bridge-Token");
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN)
    return jsonRes({ error: "Unauthorized" }, 401);

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
          // 迁移 1: 处理名称
          if (!item.name) { item.name = `Key #${index + 1}`; needsUpdate = true; }
          // 迁移 2: 将旧 count 迁移至 successCount 并初始化 failCount
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
