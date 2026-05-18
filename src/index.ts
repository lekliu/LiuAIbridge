import { handleAdminAPI } from "./handlers/admin";
import { handleProxy } from "./handlers/proxy";
import { ADMIN_HTML } from "./templates/admin_ui";
import { jsonRes, CORS_HEADERS } from "./utils/helpers";

export interface Env {
  LIU_BRIDGE_KV: KVNamespace;
  ADMIN_TOKEN: string;
  BRIDGE_TOKEN: string;
}

const COMPAT_OPENAI_PREFIX = "/compat/openai/";

function resolveCompatOpenAIRequest(
  request: Request,
  url: URL,
): { request: Request; url: URL } | Response | null {
  if (!url.pathname.startsWith(COMPAT_OPENAI_PREFIX)) return null;

  const rest = url.pathname.slice(COMPAT_OPENAI_PREFIX.length);
  const sep = rest.indexOf("/");
  if (sep <= 0) {
    return jsonRes(
      {
        error:
          "LiuAIbridge: /compat/openai/ 需指定上游路径，例如 /compat/openai/google/v1/chat/completions",
      },
      404,
    );
  }

  const provider = rest.slice(0, sep).toLowerCase();
  const tail = rest.slice(sep);
  if (!tail.startsWith("/")) {
    return jsonRes({ error: "LiuAIbridge: /compat/openai/ 路径无效" }, 400);
  }

  if (provider !== "google" && provider !== "anthropic") {
    return jsonRes(
      {
        error: "LiuAIbridge: /compat/openai/ 仅支持 google 或 anthropic 分流",
        hint: "示例: /compat/openai/google/v1/chat/completions 或 /compat/openai/anthropic/v1/chat/completions",
      },
      400,
    );
  }

  const newUrl = new URL(url.href);
  newUrl.pathname = `/${provider}${tail}`;
  const rewritten = new Request(newUrl.toString(), request);
  return { request: rewritten, url: newUrl };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...CORS_HEADERS,
          "Access-Control-Allow-Headers": "*"
        }
      });
    }

    if (url.pathname === "/admin") {
      return new Response(ADMIN_HTML, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    if (url.pathname.startsWith("/admin/api/")) {
      return handleAdminAPI(request, env);
    }

    let proxyRequest = request;
    let proxyUrl = url;
    const compat = resolveCompatOpenAIRequest(request, url);
    if (compat instanceof Response) return compat;
    if (compat) {
      proxyRequest = compat.request;
      proxyUrl = compat.url;
    }

    const prefix = ["/google/", "/openai/", "/anthropic/"].find(p =>
      proxyUrl.pathname.startsWith(p),
    );
    if (prefix) {
      let incomingToken = proxyRequest.headers.get("X-Bridge-Token");

      if (!incomingToken) {
        const authHeader = proxyRequest.headers.get("Authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
          incomingToken = authHeader.substring(7);
        }
      }

      const sanitizedReceived = (incomingToken || "").trim();
      const sanitizedExpected = (env.BRIDGE_TOKEN || "").trim();

      if (!sanitizedExpected || sanitizedReceived !== sanitizedExpected) {
        return jsonRes({ error: "LiuAIbridge: Invalid Bridge Token" }, 401);
      }

      return handleProxy(proxyRequest, env, prefix, ctx);
    }
    return jsonRes({ error: "LiuAIbridge: Not Found" }, 404);
  },
};
