import { jsonRes } from "../../utils/helpers";

const ANTHROPIC_MODELS_URL = "https://api.anthropic.com/v1/models";

/** 管理端：拉取 Anthropic `GET /v1/models`（分页） */
export async function adminListModelsAnthropic(env: any): Promise<Response> {
  const raw = await env.LIU_BRIDGE_KV.get("ANTHROPIC_CONFIG");
  const keys = raw ? JSON.parse(raw) : [];
  const availableKey = keys.find((k: any) => k.status === "enabled");

  if (!availableKey) {
    return jsonRes({ error: "没有可用的 Anthropic API Key" }, 400);
  }

  const headers = {
    "x-api-key": availableKey.key,
    "anthropic-version": "2023-06-01",
  };

  try {
    const all: any[] = [];
    let afterId: string | undefined;
    const maxPages = 20;
    let pageCount = 0;

    for (let i = 0; i < maxPages; i++) {
      pageCount++;
      let url = `${ANTHROPIC_MODELS_URL}?limit=100`;
      if (afterId) {
        url += `&after_id=${encodeURIComponent(afterId)}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (i === 0) {
          return jsonRes(
            {
              error: `API 错误: ${(err as any).error?.message || response.statusText}`,
            },
            400,
          );
        }
        break;
      }

      const data = (await response.json()) as any;
      const chunk = data.data || [];
      all.push(...chunk);

      if (!data.has_more || chunk.length === 0) {
        break;
      }
      afterId = data.last_id;
    }

    const models = all.map((m: any) => ({
      name: m.id,
      displayName: m.display_name || m.id,
      version: m.type || "model",
      description: m.created_at ? `发布: ${m.created_at}` : "",
      inputTokenLimit: m.max_input_tokens ?? null,
      outputTokenLimit: m.max_tokens ?? null,
    }));

    return jsonRes({
      models,
      source: availableKey.name,
      total: models.length,
      totalFetched: all.length,
      pagesFetched: pageCount,
      platform: "anthropic",
    });
  } catch (error: any) {
    return jsonRes({ error: `获取模型列表失败: ${error.message}` }, 500);
  }
}
