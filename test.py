"""
LiuAIbridge 本地测试脚本
运行前确保 wrangler dev 已经启动（端口 8787）
依赖：pip install requests
"""

import json
import requests

# ──────────────────────────────────────────────
# 配置区 — 按需修改
# ──────────────────────────────────────────────
BASE_URL   = "https://ai.baidu.xyz" # 你的域名地址
# BASE_URL   = "http://127.0.0.1:8787"  # 本地测试地址
BRIDGE_TOKEN = "ai1234"

COMMON_HEADERS = {
    "Content-Type": "application/json",
    "X-Bridge-Token": BRIDGE_TOKEN,
}

# ──────────────────────────────────────────────
# 测试用例
# ──────────────────────────────────────────────

def test_google_gemini():
    print("\n" + "=" * 55)
    print("【测试】Google Gemini — gemini-3.1-flash-lite-preview")
    print("=" * 55)

    url = f"{BASE_URL}/google/v1beta/models/gemini-3.1-flash-lite-preview:generateContent"

    payload = {
        "contents": [
            {"parts": [{"text": "你好，请介绍一下你自己。"}]}
        ]
    }

    try:
        resp = requests.post(url, json=payload, headers=COMMON_HEADERS, timeout=30)
        print(f"Status Code : {resp.status_code}")
        try:
            data = resp.json()
            print("Response JSON:")
            print(json.dumps(data, ensure_ascii=False, indent=2))
        except Exception:
            print("Response Text (not JSON):")
            print(resp.text)
    except Exception as e:
        print(f"请求异常: {e}")


def test_openai():
    print("\n" + "=" * 55)
    print("【测试】OpenAI — gpt-4o-mini")
    print("=" * 55)

    url = f"{BASE_URL}/openai/v1/chat/completions"
    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": "你好，请用一句话自我介绍"}],
        "max_tokens": 100,
    }

    try:
        resp = requests.post(url, json=payload, headers=COMMON_HEADERS, timeout=30)
        print(f"Status Code : {resp.status_code}")
        try:
            data = resp.json()
            print("Response JSON:")
            print(json.dumps(data, ensure_ascii=False, indent=2))
        except Exception:
            print("Response Text (not JSON):")
            print(resp.text)
    except Exception as e:
        print(f"请求异常: {e}")


def test_anthropic():
    print("\n" + "=" * 55)
    print("【测试】Anthropic — claude-3-haiku-20240307")
    print("=" * 55)

    url = f"{BASE_URL}/anthropic/v1/messages"
    payload = {
        "model": "claude-3-haiku-20240307",
        "max_tokens": 100,
        "messages": [{"role": "user", "content": "你好，请用一句话自我介绍"}],
    }
    headers = {
        **COMMON_HEADERS,
        "anthropic-version": "2023-06-01",
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        print(f"Status Code : {resp.status_code}")
        try:
            data = resp.json()
            print("Response JSON:")
            print(json.dumps(data, ensure_ascii=False, indent=2))
        except Exception:
            print("Response Text (not JSON):")
            print(resp.text)
    except Exception as e:
        print(f"请求异常: {e}")


def test_auth_rejection():
    print("\n" + "=" * 55)
    print("【测试】鉴权拦截 — 错误 Token 应返回 401")
    print("=" * 55)

    url = f"{BASE_URL}/google/v1beta/models/gemini-1.5-flash:generateContent"
    bad_headers = {**COMMON_HEADERS, "X-Bridge-Token": "wrong_token"}
    payload = {"contents": [{"parts": [{"text": "test"}]}]}

    try:
        resp = requests.post(url, json=payload, headers=bad_headers, timeout=10)
        print(f"Status Code : {resp.status_code}  (期望 401)")
        print(resp.json())
    except Exception as e:
        print(f"请求异常: {e}")


# ──────────────────────────────────────────────
# 入口
# ──────────────────────────────────────────────
if __name__ == "__main__":
    print("LiuAIbridge 本地测试脚本")
    print("确保 `wrangler dev` 已在另一个终端启动\n")

    # 只跑 Google，其余按需取消注释
    test_google_gemini()
    # test_openai()
    # test_anthropic()
    test_auth_rejection()

    print("\n✅ 测试完毕")
