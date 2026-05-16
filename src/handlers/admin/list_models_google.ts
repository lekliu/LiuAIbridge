import { jsonRes } from "../../utils/helpers";

/** 管理端：拉取 Google Gemini 可用模型（Generative Language `v1beta/models`） */
export async function adminListModelsGoogle(env: any): Promise<Response> {
  const raw = await env.LIU_BRIDGE_KV.get("GOOGLE_CONFIG");
  const googleKeys = raw ? JSON.parse(raw) : [];

  const availableKey = googleKeys.find((k: any) => k.status === "enabled");

  if (!availableKey) {
    return jsonRes({ error: "没有可用的 Google API Key" }, 400);
  }

  try {
    const allModels: any[] = [];
    let nextPageToken = "";
    let pageCount = 0;
    const maxPages = 10;

    do {
      pageCount++;
      let url = `https://generativelanguage.googleapis.com/v1beta/models?key=${availableKey.key}&pageSize=100`;
      if (nextPageToken) {
        url += `&pageToken=${encodeURIComponent(nextPageToken)}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        if (pageCount === 1) {
          return jsonRes(
            { error: `API 错误: ${(error as any).error?.message || response.statusText}` },
            400,
          );
        }
        break;
      }

      const data = await response.json();

      if (data.models) {
        allModels.push(...data.models);
      }

      nextPageToken = data.nextPageToken || "";
    } while (nextPageToken && pageCount < maxPages);

    const models = allModels
      .filter((m: any) =>
        m.supportedGenerationMethods?.includes("generateContent"),
      )
      .map((m: any) => ({
        name: m.name,
        displayName: m.displayName || m.name.split("/").pop(),
        version: m.version,
        description: m.description,
        inputTokenLimit: m.inputTokenLimit,
        outputTokenLimit: m.outputTokenLimit,
        supportedMethods: m.supportedGenerationMethods,
      }));

    return jsonRes({
      models,
      source: availableKey.name,
      total: models.length,
      totalFetched: allModels.length,
      apiVersion: "v1beta",
      pagesFetched: pageCount,
      platform: "google",
    });
  } catch (error: any) {
    return jsonRes({ error: `获取模型列表失败: ${error.message}` }, 500);
  }
}
