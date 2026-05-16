import { jsonRes } from "../../utils/helpers";

/** 管理端：拉取 OpenAI `GET /v1/models` */
export async function adminListModelsOpenAI(env: any): Promise<Response> {
  const raw = await env.LIU_BRIDGE_KV.get("OPENAI_CONFIG");
  const keys = raw ? JSON.parse(raw) : [];
  const availableKey = keys.find((k: any) => k.status === "enabled");

  if (!availableKey) {
    return jsonRes({ error: "没有可用的 OpenAI API Key" }, 400);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${availableKey.key}` },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return jsonRes(
        {
          error: `API 错误: ${(err as any).error?.message || response.statusText}`,
        },
        400,
      );
    }

    const data = (await response.json()) as { data?: any[] };
    const models = (data.data || []).map((m: any) => ({
      name: m.id,
      displayName: m.id,
      version: m.owned_by || "-",
      description: `object: ${m.object || ""} · created: ${m.created ?? "-"}`,
      inputTokenLimit: null as number | null,
      outputTokenLimit: null as number | null,
    }));

    return jsonRes({
      models,
      source: availableKey.name,
      total: models.length,
      platform: "openai",
    });
  } catch (error: any) {
    return jsonRes({ error: `获取模型列表失败: ${error.message}` }, 500);
  }
}
