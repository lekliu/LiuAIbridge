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
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. 处理 CORS 预检
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...CORS_HEADERS,
          "Access-Control-Allow-Headers": "*"
        }
      });
    }

    // 2. 管理界面
    if (url.pathname === "/admin") {
      return new Response(ADMIN_HTML, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    // 3. 管理 API (使用 ADMIN_TOKEN)
    if (url.pathname.startsWith("/admin/api/")) {
      return handleAdminAPI(request, env);
    }

    // 4. 代理转发路由
    const prefix = ["/google/", "/openai/", "/anthropic/"].find(p => url.pathname.startsWith(p));
    if (prefix) {
      // --- 🔥 兼容性鉴权开始 ---
      let incomingToken = request.headers.get("X-Bridge-Token");

      // 如果没有自定义头，尝试从标准 Authorization: Bearer 获取 (OpenClaw 会走这里)
      if (!incomingToken) {
        const authHeader = request.headers.get("Authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
          incomingToken = authHeader.substring(7);
        }
      }

      // 🔥 优化点 1：使用 .trim() 强行去掉可能存在的空格或换行符
      const sanitizedReceived = (incomingToken || "").trim();
      const sanitizedExpected = (env.BRIDGE_TOKEN || "").trim();

      if (!sanitizedExpected || sanitizedReceived !== sanitizedExpected) {
        // 🔥 优化点 2：明确区分这是“网关”报的错
        return jsonRes({ error: "LiuAIbridge: Invalid Bridge Token" }, 401);
      }

      return handleProxy(request, env, prefix, ctx);
    }
    return jsonRes({ error: "LiuAIbridge: Not Found" }, 404);
  },
};
