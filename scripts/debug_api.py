#!/usr/bin/env python3
"""
API 调试工具脚本
用于快速测试和调试 Open Notebook API
"""

import asyncio
import httpx
from loguru import logger
from rich.console import Console
from rich.table import Table
from rich import print as rprint

console = Console()

API_BASE_URL = "http://localhost:5055"


async def test_health():
    """测试健康检查端点"""
    console.print("\n[bold cyan]测试健康检查...[/bold cyan]")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{API_BASE_URL}/health")
            if response.status_code == 200:
                console.print("[green]✓[/green] 健康检查通过")
                return True
            else:
                console.print(f"[red]✗[/red] 健康检查失败: {response.status_code}")
                return False
    except Exception as e:
        console.print(f"[red]✗[/red] 连接失败: {e}")
        return False


async def test_notebooks():
    """测试笔记本 API"""
    console.print("\n[bold cyan]测试笔记本 API...[/bold cyan]")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{API_BASE_URL}/api/notebooks")
            if response.status_code == 200:
                notebooks = response.json()
                console.print(f"[green]✓[/green] 成功获取 {len(notebooks)} 个笔记本")
                
                if notebooks:
                    table = Table(title="笔记本列表")
                    table.add_column("ID", style="cyan")
                    table.add_column("标题", style="magenta")
                    table.add_column("描述", style="green")
                    
                    for nb in notebooks[:5]:  # 只显示前5个
                        table.add_row(
                            nb.get("id", "N/A"),
                            nb.get("title", "N/A"),
                            nb.get("description", "N/A")[:50]
                        )
                    
                    console.print(table)
                return True
            else:
                console.print(f"[red]✗[/red] 获取笔记本失败: {response.status_code}")
                return False
    except Exception as e:
        console.print(f"[red]✗[/red] 请求失败: {e}")
        return False


async def test_models():
    """测试模型配置 API"""
    console.print("\n[bold cyan]测试模型配置 API...[/bold cyan]")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{API_BASE_URL}/api/models/available")
            if response.status_code == 200:
                models = response.json()
                console.print(f"[green]✓[/green] 成功获取 {len(models)} 个可用模型")
                
                if models:
                    table = Table(title="可用模型")
                    table.add_column("提供商", style="cyan")
                    table.add_column("模型数量", style="magenta")
                    
                    provider_counts = {}
                    for model in models:
                        provider = model.get("provider", "unknown")
                        provider_counts[provider] = provider_counts.get(provider, 0) + 1
                    
                    for provider, count in provider_counts.items():
                        table.add_row(provider, str(count))
                    
                    console.print(table)
                return True
            else:
                console.print(f"[red]✗[/red] 获取模型失败: {response.status_code}")
                return False
    except Exception as e:
        console.print(f"[red]✗[/red] 请求失败: {e}")
        return False


async def test_database_connection():
    """测试数据库连接"""
    console.print("\n[bold cyan]测试数据库连接...[/bold cyan]")
    try:
        from open_notebook.database.client import get_db_client
        
        db = await get_db_client()
        result = await db.query("SELECT count() FROM notebooks GROUP ALL")
        
        console.print("[green]✓[/green] 数据库连接成功")
        if result:
            count = result[0].get("count", 0) if result[0] else 0
            console.print(f"[blue]ℹ[/blue] 数据库中有 {count} 个笔记本")
        return True
    except Exception as e:
        console.print(f"[red]✗[/red] 数据库连接失败: {e}")
        return False


async def create_test_notebook():
    """创建测试笔记本"""
    console.print("\n[bold cyan]创建测试笔记本...[/bold cyan]")
    try:
        async with httpx.AsyncClient() as client:
            data = {
                "title": "调试测试笔记本",
                "description": "这是用于调试的测试笔记本"
            }
            response = await client.post(
                f"{API_BASE_URL}/api/notebooks",
                json=data
            )
            if response.status_code in [200, 201]:
                notebook = response.json()
                console.print("[green]✓[/green] 成功创建测试笔记本")
                console.print(f"[blue]ℹ[/blue] 笔记本 ID: {notebook.get('id')}")
                return notebook.get('id')
            else:
                console.print(f"[red]✗[/red] 创建笔记本失败: {response.status_code}")
                console.print(f"[red]响应内容:[/red] {response.text}")
                return None
    except Exception as e:
        console.print(f"[red]✗[/red] 请求失败: {e}")
        return None


async def main():
    """主函数"""
    console.print("\n[bold magenta]===== Open Notebook API 调试工具 =====[/bold magenta]\n")
    
    results = {
        "健康检查": await test_health(),
        "数据库连接": await test_database_connection(),
        "笔记本 API": await test_notebooks(),
        "模型配置 API": await test_models(),
    }
    
    # 显示测试总结
    console.print("\n[bold cyan]===== 测试总结 =====[/bold cyan]\n")
    
    table = Table(title="测试结果")
    table.add_column("测试项", style="cyan")
    table.add_column("结果", style="magenta")
    
    for test_name, result in results.items():
        status = "[green]✓ 通过[/green]" if result else "[red]✗ 失败[/red]"
        table.add_row(test_name, status)
    
    console.print(table)
    
    # 如果所有测试通过，询问是否创建测试笔记本
    if all(results.values()):
        console.print("\n[green]所有测试通过![/green]")
        console.print("[yellow]提示: 您可以取消注释下面的代码来创建测试笔记本[/yellow]")
        # notebook_id = await create_test_notebook()
    else:
        console.print("\n[red]部分测试失败，请检查日志[/red]")


if __name__ == "__main__":
    asyncio.run(main())


