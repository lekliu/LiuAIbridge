export interface LiuKVConfig {
  endpoint: string;
  token?: string;
  namespace: string;
}

export interface LiuKVStats {
  successCount: number;
  failCount: number;
  last: string;
}

export class LiuKVClient {
  private endpoint: string;
  private token: string | null;
  private namespace: string;
  private enabled: boolean;

  constructor(config: LiuKVConfig) {
    this.endpoint = config.endpoint.replace(/\/$/, "");
    this.token = config.token || null;
    this.namespace = config.namespace;
    this.enabled = !!config.endpoint;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers["X-KV-Token"] = this.token;
    }
    return headers;
  }

  private getKeyUrl(key: string): string {
    return `${this.endpoint}/kv/${this.namespace}/${encodeURIComponent(key)}`;
  }

  static hashKeyId(apiKey: string): string {
    let hash = 0;
    for (let i = 0; i < apiKey.length; i++) {
      hash = ((hash << 5) - hash) + apiKey.charCodeAt(i);
      hash |= 0;
    }
    const unsignedHash = hash >>> 0;
    return unsignedHash.toString(16).padStart(8, '0').slice(-8);
  }

  static safeKeyId(name: string | undefined, apiKey: string): string {
    if (name && name.trim()) {
      return name.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    }
    return LiuKVClient.hashKeyId(apiKey);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async get(key: string): Promise<string | null> {
    if (!this.enabled) return null;
    try {
      const response = await fetch(this.getKeyUrl(key), {
        method: "GET",
        headers: this.getHeaders(),
      });
      if (!response.ok) return null;
      return await response.text();
    } catch (e) {
      console.error("[LiuKV] GET error:", e);
      return null;
    }
  }

  async getJSON<T = any>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async put(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      let url = this.getKeyUrl(key);
      if (ttlSeconds) {
        url += `?ttl=${ttlSeconds}`;
      }
      const response = await fetch(url, {
        method: "PUT",
        headers: this.getHeaders(),
        body: value,
      });
      return response.ok;
    } catch (e) {
      console.error("[LiuKV] PUT error:", e);
      return false;
    }
  }

  async putJSON(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    return this.put(key, JSON.stringify(value), ttlSeconds);
  }

  async incr(key: string, amount: number = 1): Promise<number | null> {
    if (!this.enabled) return null;
    try {
      const url = `${this.endpoint}/kv/${this.namespace}/_incr/${encodeURIComponent(key)}?amount=${amount}`;
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.value as number;
    } catch (e) {
      console.error("[LiuKV] INCR error:", e);
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      const response = await fetch(this.getKeyUrl(key), {
        method: "DELETE",
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch (e) {
      console.error("[LiuKV] DELETE error:", e);
      return false;
    }
  }

  async getAll(prefix?: string): Promise<Record<string, string>> {
    if (!this.enabled) return {};
    try {
      let url = `${this.endpoint}/kv/${this.namespace}/_all`;
      if (prefix) {
        url += `?prefix=${encodeURIComponent(prefix)}`;
      }
      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
      });
      if (!response.ok) return {};
      const data = await response.json();
      return data.data || {};
    } catch (e) {
      console.error("[LiuKV] GET_ALL error:", e);
      return {};
    }
  }

  async getMulti(keys: string[]): Promise<Record<string, string>> {
    if (!this.enabled || keys.length === 0) return {};
    try {
      const url = `${this.endpoint}/kv/${this.namespace}/_multi/get`;
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ keys }),
      });
      if (!response.ok) return {};
      return await response.json() as Record<string, string>;
    } catch (e) {
      console.error("[LiuKV] GET_MULTI error:", e);
      return {};
    }
  }

  async listKeys(prefix?: string): Promise<string[]> {
    if (!this.enabled) return [];
    try {
      let url = `${this.endpoint}/kv/${this.namespace}/_keys`;
      if (prefix) {
        url += `?prefix=${encodeURIComponent(prefix)}`;
      }
      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.keys || [];
    } catch (e) {
      console.error("[LiuKV] LIST_KEYS error:", e);
      return [];
    }
  }
}

export function createLiuKVFromEnv(env: any): LiuKVClient {
  return new LiuKVClient({
    endpoint: env.LIUKV_ENDPOINT || "",
    token: env.LIUKV_TOKEN || "",
    namespace: env.LIUKV_NAMESPACE || "liuaibridge",
  });
}
