#!/usr/bin/env python3
"""
测试脚本：通过 podcast episode id 获取对应的演讲稿每页 PPT 图片和音频 clips
使用 HTTP API 接口调用

使用方法:
python test_podcast_slides_clips.py <episode_id> [base_url] [token]

参数:
- episode_id: podcast episode 的 ID
- base_url: API 服务器地址 (默认: http://localhost:8000)
- token: 认证 token (可选)

示例:
python test_podcast_slides_clips.py episode:123456789
python test_podcast_slides_clips.py episode:123456789 http://localhost:8000
python test_podcast_slides_clips.py episode:123456789 http://localhost:8000 your_token
"""

import asyncio
import sys
import os
import json
from typing import Optional

try:
    import httpx
except ImportError:
    print("错误: 需要安装 httpx 库")
    print("请运行: pip install httpx")
    sys.exit(1)


async def test_get_episode_slides_and_clips_via_api(episode_id: str, base_url: str = "http://localhost:5055", token: Optional[str] = None):
    """通过 API 接口测试获取 podcast episode 的 slides 和 clips 信息"""
    try:
        print(f"正在调用 API 获取 podcast episode {episode_id} 的 slides 和 clips 信息...")
        print(f"API URL: {base_url}/api/podcasts/episodes/{episode_id}/slides-clips")

        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{base_url}/api/podcasts/episodes/{episode_id}/slides-clips",
                headers=headers
            )

            if response.status_code == 200:
                slides_clips = response.json()

                print(f"成功获取到 {len(slides_clips)} 个 slides 和 clips 信息：")
                print("-" * 80)

                for item in slides_clips:
                    print(f"页码: {item['page_number']}")
                    print(f"标题: {item['title']}")
                    print(f"Clips 文件名: {item['clip_filename']}")
                    print(f"PPT 图片下载 URL: {item.get('ppt_image_url') or '无'}")
                    print(f"音频 clips 下载 URL: {item.get('clip_url') or '无'}")
                    outline = item['outline']
                    print(f"大纲: {outline[:100]}{'...' if len(outline) > 100 else ''}")
                    script = item['script']
                    print(f"讲稿: {script[:100]}{'...' if len(script) > 100 else ''}")
                    print("-" * 80)

                return slides_clips
            else:
                print(f"API 调用失败: HTTP {response.status_code}")
                print(f"响应内容: {response.text}")
                return None

    except httpx.RequestError as e:
        print(f"网络请求错误: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"JSON 解析错误: {e}")
        return None
    except Exception as e:
        print(f"测试失败: {e}")
        return None


async def main():
    """主函数"""
    if len(sys.argv) < 2 or len(sys.argv) > 4:
        print("用法: python test_podcast_slides_clips.py <episode_id> [base_url] [token]")
        print("示例: python test_podcast_slides_clips.py episode:123456789")
        print("示例: python test_podcast_slides_clips.py episode:123456789 http://localhost:5055")
        print("示例: python test_podcast_slides_clips.py episode:123456789 http://localhost:5055 your_token_here")
        sys.exit(1)

    episode_id = sys.argv[1]
    base_url = sys.argv[2] if len(sys.argv) >= 3 else "http://localhost:5055"
    token = sys.argv[3] if len(sys.argv) >= 4 else None


    await test_get_episode_slides_and_clips_via_api(episode_id, base_url, token)


if __name__ == "__main__":
    asyncio.run(main())
