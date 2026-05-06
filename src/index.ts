import { handleAdminAPI } from "./handlers/admin";
import { handleProxy } from "./handlers/proxy";
import { ADMIN_HTML } from "./templates/admin_ui";
import { jsonRes, CORS_HEADERS } from "./utils/helpers";

export interface Env {
  LIU_BRIDGE_KV: KVNamespace;
  ADMIN_TOKEN: string;
  BRIDGE_TOKEN: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS")
      return new Response(null, { headers: CORS_HEADERS });

    if (url.pathname === "/admin")
      return new Response(ADMIN_HTML, {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    if (url.pathname.startsWith("/admin/api/"))
      return handleAdminAPI(request, env);

    const prefix = ["/google/", "/openai/", "/anthropic/"].find((p) =>
      url.pathname.startsWith(p),
    );
    if (prefix) {
      const token = request.headers.get("X-Bridge-Token");
      if (!env.BRIDGE_TOKEN || token !== env.BRIDGE_TOKEN)
        return jsonRes({ error: "Unauthorized Bridge" }, 401);
      return handleProxy(request, env, prefix, ctx);
    }
    return jsonRes({ error: "LiuAIbridge: Not Found" }, 404);
  },
};
