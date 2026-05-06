export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Bridge-Token, x-api-key, anthropic-version",
  "Access-Control-Max-Age": "86400",
};

export function jsonRes(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export function stripHeaders(headers: Headers): Headers {
  const out = new Headers(headers);
  const toDelete = [
    "cf-connecting-ip",
    "cf-ipcountry",
    "cf-ray",
    "host",
    "x-bridge-token",
    "authorization"
  ];
  for (const h of toDelete) {
    out.delete(h);
    out.delete(h.toLowerCase()); // 双重保险
  }
  return out;
}