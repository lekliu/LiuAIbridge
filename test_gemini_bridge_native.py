#!/usr/bin/env python3
"""
通过 LiuAIbridge 代理测试 Gemini 原生 API (直接透传模式)
请求直接发送 Gemini 原生格式，代理只做路径转发和 Key 注入
"""

import os
import json
import requests
from typing import Optional, List, Dict, Any


class GeminiBridgeNativeTester:
    """通过 LiuAIbridge 测试 Gemini 原生 API 的类"""

    def __init__(
        self,
        bridge_url: str,
        bridge_token: str,
        model: str = "gemini-1.5-flash",
    ):
        """
        Args:
            bridge_url: LiuAIbridge 的地址，如 http://localhost:8787
            bridge_token: BRIDGE_TOKEN 配置的令牌
            model: 使用的模型名称
        """
        self.bridge_url = bridge_url.rstrip("/")
        self.bridge_token = bridge_token
        self.model = model
        # Gemini 原生格式端点（代理直接透传到 Google）
        self.base_endpoint = f"{self.bridge_url}/google/v1beta/models"

    def _make_request(
        self,
        contents: List[Dict[str, Any]],
        system_instruction: Optional[Dict[str, Any]] = None,
        generation_config: Optional[Dict[str, Any]] = None,
        safety_settings: Optional[List[Dict[str, Any]]] = None,
        stream: bool = False,
    ) -> Dict[str, Any]:
        """发送 Gemini 原生格式请求到 LiuAIbridge"""

        action = "streamGenerateContent" if stream else "generateContent"
        alt_param = "&alt=sse" if stream else ""
        url = f"{self.base_endpoint}/{self.model}:{action}{alt_param}"

        payload: Dict[str, Any] = {
            "contents": contents,
        }

        if system_instruction:
            payload["systemInstruction"] = system_instruction

        if generation_config:
            payload["generationConfig"] = generation_config

        if safety_settings:
            payload["safetySettings"] = safety_settings

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.bridge_token}",
        }

        print(f"\n{'='*60}")
        print(f"请求 URL: {url}")
        print(f"请求体 (Gemini 原生格式):\n{json.dumps(payload, indent=2, ensure_ascii=False)}")
        print(f"{'='*60}\n")

        try:
            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=60,
            )
            print(f"状态码: {response.status_code}")

            if response.status_code != 200:
                try:
                    error_data = response.json()
                    print(f"错误响应:\n{json.dumps(error_data, indent=2, ensure_ascii=False)}")
                except:
                    print(f"错误响应: {response.text}")
                return {"error": response.text}

            return response.json()

        except Exception as e:
            print(f"请求异常: {e}")
            return {"error": str(e)}

    def test_basic_chat(self) -> None:
        """测试 1: 基础聊天"""
        print("\n" + "="*60)
        print("测试 1: 基础聊天")
        print("="*60)

        contents = [
            {
                "role": "user",
                "parts": [{"text": "你好，请介绍一下你自己。"}]
            }
        ]

        result = self._make_request(contents)
        self._print_response(result)

    def test_code_generation(self) -> None:
        """测试 2: 代码生成（无 System Prompt）"""
        print("\n" + "="*60)
        print("测试 2: 代码生成（无 System Prompt）")
        print("="*60)

        contents = [
            {
                "role": "user",
                "parts": [{"text": "写一个 Python 快速排序算法，包含类型注解和详细注释。"}]
            }
        ]

        generation_config = {
            "temperature": 0.3,
            "maxOutputTokens": 2048,
        }

        result = self._make_request(contents, generation_config=generation_config)
        self._print_response(result)

    def test_code_generation_with_system_instruction(self) -> None:
        """测试 3: 代码生成（带 System Instruction）- 正确方式"""
        print("\n" + "="*60)
        print("测试 3: 代码生成（带 systemInstruction - 正确方式）")
        print("="*60)

        system_instruction = {
            "parts": [
                {
                    "text": (
                        "你是一个资深的 Python 开发工程师。"
                        "请遵循以下原则编写代码：\n"
                        "1. 使用 Python 3.10+ 语法\n"
                        "2. 包含完整的类型注解\n"
                        "3. 遵循 PEP 8 规范\n"
                        "4. 添加详细的 docstring 和行内注释\n"
                        "5. 代码要简洁高效\n"
                        "请直接输出代码，不要有多余的解释。"
                    )
                }
            ]
        }

        contents = [
            {
                "role": "user",
                "parts": [{"text": "写一个快速排序算法的实现。"}]
            }
        ]

        generation_config = {
            "temperature": 0.3,
            "maxOutputTokens": 2048,
        }

        result = self._make_request(
            contents,
            system_instruction=system_instruction,
            generation_config=generation_config,
        )
        self._print_response(result)

    def test_code_generation_merged_prompt(self) -> None:
        """测试 4: 代码生成（System Prompt 合并到 user 中 - 错误方式对比）"""
        print("\n" + "="*60)
        print("测试 4: 代码生成（System 合并到 user 中 - 对比测试）")
        print("="*60)

        contents = [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            "System Instruction: 你是一个资深的 Python 开发工程师。"
                            "请遵循以下原则编写代码：\n"
                            "1. 使用 Python 3.10+ 语法\n"
                            "2. 包含完整的类型注解\n"
                            "3. 遵循 PEP 8 规范\n"
                            "4. 添加详细的 docstring 和行内注释\n"
                            "5. 代码要简洁高效\n"
                            "请直接输出代码，不要有多余的解释。\n\n"
                            "User: 写一个快速排序算法的实现。"
                        )
                    }
                ]
            }
        ]

        generation_config = {
            "temperature": 0.3,
            "maxOutputTokens": 2048,
        }

        result = self._make_request(
            contents,
            generation_config=generation_config,
        )
        self._print_response(result)

    def test_safety_settings(self) -> None:
        """测试 5: 安全设置"""
        print("\n" + "="*60)
        print("测试 5: 安全设置（放宽限制）")
        print("="*60)

        safety_settings = [
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
        ]

        system_instruction = {
            "parts": [
                {
                    "text": (
                        "你是一个专业的安全研究员。"
                        "请提供一个用于教育目的的 SQL 注入示例代码，"
                        "并说明如何防范。"
                    )
                }
            ]
        }

        contents = [
            {
                "role": "user",
                "parts": [{"text": "演示一个 SQL 注入的例子。"}]
            }
        ]

        result = self._make_request(
            contents,
            system_instruction=system_instruction,
            safety_settings=safety_settings,
        )
        self._print_response(result)

    def test_stop_sequences(self) -> None:
        """测试 6: Stop Sequences"""
        print("\n" + "="*60)
        print("测试 6: Stop Sequences 控制输出边界")
        print("="*60)

        contents = [
            {
                "role": "user",
                "parts": [{"text": "列出 5 个 Python 内置函数，每个函数一行说明。"}]
            }
        ]

        generation_config = {
            "maxOutputTokens": 1024,
            "stopSequences": ["3.", "```"],
        }

        result = self._make_request(
            contents,
            generation_config=generation_config,
        )
        self._print_response(result)

    def test_json_mode(self) -> None:
        """测试 7: JSON 模式输出"""
        print("\n" + "="*60)
        print("测试 7: JSON 模式输出")
        print("="*60)

        system_instruction = {
            "parts": [{"text": "你是一个数据处理助手，始终以 JSON 格式输出结果。"}]
        }

        contents = [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            "生成一个包含 3 个用户的 JSON 数组，"
                            "每个用户有 id, name, email 字段。"
                        )
                    }
                ]
            }
        ]

        generation_config = {
            "responseMimeType": "application/json",
            "maxOutputTokens": 512,
        }

        result = self._make_request(
            contents,
            system_instruction=system_instruction,
            generation_config=generation_config,
        )
        self._print_response(result)

    def test_seed_reproducibility(self) -> None:
        """测试 8: Seed 参数可复现性"""
        print("\n" + "="*60)
        print("测试 8: Seed 参数可复现性测试（调用 2 次，使用相同 seed）")
        print("="*60)

        generation_config = {
            "temperature": 0.7,
            "maxOutputTokens": 256,
            "seed": 42,
        }

        contents = [
            {
                "role": "user",
                "parts": [{"text": "生成一个 10 个单词的随机列表。"}]
            }
        ]

        responses = []
        for i in range(2):
            print(f"\n--- 第 {i+1} 次调用 ---")
            result = self._make_request(
                contents,
                generation_config=generation_config,
            )
            if "candidates" in result:
                text = result["candidates"][0]["content"]["parts"][0]["text"]
                responses.append(text.strip())
                print(f"输出: {text.strip()}")

        if len(responses) == 2:
            print(f"\n两次输出是否相同: {responses[0] == responses[1]}")
            if responses[0] == responses[1]:
                print("✅ Seed 参数工作正常，输出可复现")
            else:
                print("⚠️  输出不同，可能是模型内部随机性导致")

    def test_multi_turn_chat(self) -> None:
        """测试 9: 多轮对话"""
        print("\n" + "="*60)
        print("测试 9: 多轮对话（模拟真实编程场景）")
        print("="*60)

        system_instruction = {
            "parts": [
                {"text": "你是一个资深的全栈开发工程师，擅长代码审查和重构。"}
            ]
        }

        contents = [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            "这段代码有什么问题？\n"
                            "```python\n"
                            "def calculate_sum(numbers):\n"
                            "    total = 0\n"
                            "    for n in numbers:\n"
                            "        total = total + n\n"
                            "    return total\n"
                            "```"
                        )
                    }
                ]
            },
            {
                "role": "model",
                "parts": [
                    {
                        "text": (
                            "这段代码功能上是正确的，但可以优化：\n"
                            "1. 可以使用内置的 sum() 函数\n"
                            "2. 缺少类型注解\n"
                            "3. 可以添加 docstring"
                        )
                    }
                ]
            },
            {
                "role": "user",
                "parts": [{"text": "请给出优化后的版本。"}]
            }
        ]

        generation_config = {
            "temperature": 0.3,
            "maxOutputTokens": 1024,
        }

        result = self._make_request(
            contents,
            system_instruction=system_instruction,
            generation_config=generation_config,
        )
        self._print_response(result)

    def _print_response(self, result: Dict[str, Any]) -> None:
        """打印 Gemini 响应"""
        if "candidates" in result:
            candidate = result["candidates"][0]
            finish_reason = candidate.get("finishReason", "UNKNOWN")
            parts = candidate.get("content", {}).get("parts", [])

            print(f"\n完成原因: {finish_reason}")
            print(f"\n响应内容:")
            print("-" * 60)
            for part in parts:
                if "text" in part:
                    print(part["text"])
                elif "functionCall" in part:
                    print(f"[Function Call] {part['functionCall']}")
            print("-" * 60)

            # Token 使用
            usage = result.get("usageMetadata", {})
            if usage:
                print(f"\nToken 使用:")
                print(f"  Prompt: {usage.get('promptTokenCount', 0)}")
                print(f"  Completion: {usage.get('candidatesTokenCount', 0)}")
                print(f"  Total: {usage.get('totalTokenCount', 0)}")


def main():
    """主函数"""
    # 从环境变量获取配置
    bridge_url = "https://ai.703803.xyz"
    bridge_token = "ai123456"
    model = "gemini-3.1-flash-lite"

    print(f"\n使用模型: {model}")
    print(f"代理地址: {bridge_url}")
    print(f"API 模式: Gemini 原生格式 (直接透传)")

    tester = GeminiBridgeNativeTester(bridge_url, bridge_token, model)

    # 运行所有测试
    tests = [
        ("基础聊天", tester.test_basic_chat),
        ("代码生成（无 System Prompt）", tester.test_code_generation),
        ("代码生成（带 systemInstruction - 正确）", tester.test_code_generation_with_system_instruction),
        ("代码生成（System 合并到 user - 对比）", tester.test_code_generation_merged_prompt),
        ("安全设置测试", tester.test_safety_settings),
        ("Stop Sequences 测试", tester.test_stop_sequences),
        ("JSON 模式测试", tester.test_json_mode),
        ("Seed 可复现性测试", tester.test_seed_reproducibility),
        ("多轮对话测试", tester.test_multi_turn_chat),
    ]

    print("\n" + "="*60)
    print("LiuAIbridge Gemini 原生 API 测试套件")
    print("="*60)
    print("\n可用测试:")
    for i, (name, _) in enumerate(tests, 1):
        print(f"  {i}. {name}")
    print("  0. 运行所有测试")

    choice = input("\n请选择测试编号 (默认 0): ").strip() or "0"

    try:
        choice_idx = int(choice)
        if choice_idx == 0:
            for name, test_func in tests:
                try:
                    test_func()
                except Exception as e:
                    print(f"\n❌ 测试 '{name}' 失败: {e}")
        elif 1 <= choice_idx <= len(tests):
            name, test_func = tests[choice_idx - 1]
            print(f"\n运行测试: {name}")
            test_func()
        else:
            print("无效的选择")
    except ValueError:
        print("请输入有效的数字")

    print("\n" + "="*60)
    print("测试完成")
    print("="*60)


if __name__ == "__main__":
    main()
