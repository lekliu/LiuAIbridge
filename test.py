"""
LiuAIbridge 增强版测试脚本
支持：原生流式、OpenAI 协议流式、非流式及鉴权测试
依赖：pip install requests
"""

import json
import requests
import sys

# ──────────────────────────────────────────────
# 配置区
# ──────────────────────────────────────────────
# BASE_URL = "http://127.0.0.1:8787"  # 本地调试时取消注释
BRIDGE_TOKEN = "kpi123456"

# 网关现在同时支持 X-Bridge-Token 和标准的 Authorization: Bearer
COMMON_HEADERS = {
    "Content-Type": "application/json",
    "X-Bridge-Token": BRIDGE_TOKEN,
}

# ──────────────────────────────────────────────
# 辅助函数
# ──────────────────────────────────────────────

def print_divider(title):
    print(f"\n{'='*20} {title} {'='*20}")

# ──────────────────────────────────────────────
# 测试用例
# ──────────────────────────────────────────────

def test_google_native_stream():
    """测试 1: 直接调用 Google 原生流式接口 (透明转发)"""
    print_divider("1. Google 原生流式 (Transparency Proxy)")
    
    url = f"{BASE_URL}/google/v1beta/models/gemini-3.1-flash-lite-preview:streamGenerateContent"
    payload = {
        "contents": [{"parts": [{"text": "用50字介绍倚天剑。"}]}]
    }

    print(f"请求地址: {url}")
    try:
        # 必须设置 stream=True
        resp = requests.post(url, json=payload, headers=COMMON_HEADERS, stream=True)
        print(f"状态码: {resp.status_code}")
        
        print("Raw 流输出：")
        for line in resp.iter_lines():
            if line:
                print(line.decode('utf-8')) # 原生 Google 格式是 JSON 片段
    except Exception as e:
        print(f"异常: {e}")


def test_openai_compatible_stream():
    """测试 2: 使用 OpenAI 协议调用 Gemini 流式 (核心转换逻辑)"""
    print_divider("2. OpenAI 兼容流式 (Protocol Adapter)")
    
    # 路径使用 OpenAI 标准路径
    url = f"{BASE_URL}/google/v1/chat/completions"
    payload = {
        "model": "gemini-3.1-flash-lite-preview", # 网关会自动映射
        "messages": [{"role": "user", "content": "请写一篇关于中国近代史的3000字长文"}],
        "stream": True  # 触发网关的流式转换逻辑
    }

    print(f"请求地址: {url}")
    try:
        resp = requests.post(url, json=payload, headers=COMMON_HEADERS, stream=True)
        print(f"状态码: {resp.status_code}")
        
        print("\n打字机回复：", end="", flush=True)
        for line in resp.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                
                # 检查是否为 OpenAI 的 SSE 格式
                if line_str.startswith("data: "):
                    if line_str == "data: [DONE]":
                        print("\n[流结束]")
                        break
                    
                    try:
                        # 解析 OpenAI 格式的 JSON
                        chunk = json.loads(line_str[6:])
                        content = chunk['choices'][0]['delta'].get('content', '')
                        print(content, end="", flush=True)
                    except Exception:
                        continue
    except Exception as e:
        print(f"异常: {e}")


def test_openai_compatible_json():
    """测试 3: 使用 OpenAI 协议调用 Gemini 非流式 (JSON 转换)"""
    print_divider("3. OpenAI 兼容非流式 (JSON Conversion)")

    url = f"{BASE_URL}/google/v1/chat/completions"
    payload = {
        "model": "gemini-3.1-flash-lite-preview",
        "messages": [{"role": "user", "content": "赵敏和周芷若你选谁？一句话回答。"}],
        "stream": False
    }

    try:
        resp = requests.post(url, json=payload, headers=COMMON_HEADERS)
        print(f"状态码: {resp.status_code}")
        data = resp.json()
        # 打印转换后的标准 OpenAI 格式
        print("转换后的 JSON:")
        print(json.dumps(data, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"异常: {e}")


def test_openai():
    print("\n" + "=" * 55)
    print("【测试】OpenAI — gpt-5.5")
    print("=" * 55)

    url = f"{BASE_URL}/openai/v1/chat/completions"
    payload = {
        "model": "gpt-5.5",
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


def test_auth_failure():
    """测试 4: 鉴权拦截"""
    print_divider("4. 鉴权拦截测试")
    url = f"{BASE_URL}/google/v1/chat/completions"
    bad_headers = {"X-Bridge-Token": "wrong_password"}
    
    resp = requests.post(url, json={}, headers=bad_headers)
    print(f"错误 Token 返回码: {resp.status_code} (期望 401)")
    print(f"返回内容: {resp.text}")

# ──────────────────────────────────────────────
# 主程序
# ──────────────────────────────────────────────
if __name__ == "__main__":
    print(f"🚀 LiuAIbridge 测试启动 | 目标: {BASE_URL}")
    
    # 1. 测试原生流 (看 Google 原生长啥样)
    # test_google_native_stream()
    
    # 2. 测试适配后的 OpenAI 流 (验证打字机效果)
    test_openai_compatible_stream()
    
    # 3. 测试非流式转换
    test_openai_compatible_json()
    
    # 4. 鉴权
    test_auth_failure()

    print("\n✅ 所有测试完成")


    # test_openai()
    # test_anthropic()
