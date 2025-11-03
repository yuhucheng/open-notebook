#!/usr/bin/env python3
"""
数据库调试工具脚本
用于快速查询和调试 SurrealDB 数据库
"""

import asyncio
import os
from loguru import logger
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console()


async def show_database_info():
    """显示数据库基本信息"""
    console.print("\n[bold cyan]数据库信息[/bold cyan]\n")
    
    try:
        from open_notebook.database.repository import db_connection
        
        async with db_connection() as db:
            # 查询各个表的记录数
            tables = ["notebooks", "sources", "notes", "embeddings", "commands"]
            
            table = Table(title="数据库表统计")
            table.add_column("表名", style="cyan")
            table.add_column("记录数", style="magenta")
            
            for table_name in tables:
                try:
                    result = await db.query(f"SELECT count() FROM {table_name} GROUP ALL")
                    count = result[0].get("count", 0) if result and result[0] else 0
                    table.add_row(table_name, str(count))
                except Exception as e:
                    table.add_row(table_name, f"[red]错误[/red]")
            
            console.print(table)
            return True
        
    except Exception as e:
        console.print(f"[red]✗[/red] 连接数据库失败: {e}")
        return False


async def show_recent_notebooks():
    """显示最近的笔记本"""
    console.print("\n[bold cyan]最近的笔记本[/bold cyan]\n")
    
    try:
        from open_notebook.database.repository import db_connection
        
        async with db_connection() as db:
            result = await db.query(
                "SELECT * FROM notebooks ORDER BY created_at DESC LIMIT 5"
            )
            
            if not result:
                console.print("[yellow]暂无笔记本[/yellow]")
                return True
        
            table = Table(title="最近创建的笔记本")
            table.add_column("ID", style="cyan")
            table.add_column("标题", style="magenta")
            table.add_column("描述", style="green")
            table.add_column("创建时间", style="blue")
            
            for notebook in result:
                table.add_row(
                    str(notebook.get("id", "N/A")),
                    notebook.get("title", "N/A"),
                    str(notebook.get("description", "N/A"))[:40],
                    str(notebook.get("created_at", "N/A"))[:19]
                )
            
            console.print(table)
            return True
        
    except Exception as e:
        console.print(f"[red]✗[/red] 查询失败: {e}")
        return False


async def show_pending_commands():
    """显示待处理的命令"""
    console.print("\n[bold cyan]待处理的命令[/bold cyan]\n")
    
    try:
        from open_notebook.database.repository import db_connection
        
        async with db_connection() as db:
            result = await db.query(
                "SELECT * FROM commands WHERE status = 'pending' LIMIT 10"
            )
            
            if not result:
                console.print("[green]✓ 没有待处理的命令[/green]")
                return True
            
            table = Table(title="待处理命令")
            table.add_column("ID", style="cyan")
            table.add_column("命令", style="magenta")
            table.add_column("状态", style="yellow")
            table.add_column("创建时间", style="blue")
            
            for command in result:
                table.add_row(
                    str(command.get("id", "N/A")),
                    command.get("command_name", "N/A"),
                    command.get("status", "N/A"),
                    str(command.get("created_at", "N/A"))[:19]
                )
            
            console.print(table)
            console.print(f"\n[yellow]共有 {len(result)} 个待处理命令[/yellow]")
            return True
        
    except Exception as e:
        console.print(f"[red]✗[/red] 查询失败: {e}")
        return False


async def check_database_health():
    """检查数据库健康状态"""
    console.print("\n[bold cyan]数据库健康检查[/bold cyan]\n")
    
    checks = []
    
    try:
        from open_notebook.database.repository import db_connection
        
        async with db_connection() as db:
            # 检查连接
            checks.append(("数据库连接", True, "成功连接到 SurrealDB"))
            
            # 检查配置
            surreal_url = os.getenv("SURREAL_URL", "未配置")
            checks.append(("数据库地址", True, surreal_url))
            
            surreal_namespace = os.getenv("SURREAL_NAMESPACE", "未配置")
            checks.append(("命名空间", True, surreal_namespace))
            
            surreal_database = os.getenv("SURREAL_DATABASE", "未配置")
            checks.append(("数据库名", True, surreal_database))
            
            # 检查表是否存在
            tables = ["notebooks", "sources", "notes"]
            for table_name in tables:
                try:
                    result = await db.query(f"SELECT * FROM {table_name} LIMIT 1")
                    checks.append((f"表 {table_name}", True, "存在"))
                except Exception as e:
                    checks.append((f"表 {table_name}", False, str(e)[:40]))
        
    except Exception as e:
        checks.append(("数据库连接", False, str(e)[:40]))
    
    # 显示结果
    table = Table(title="健康检查结果")
    table.add_column("检查项", style="cyan")
    table.add_column("状态", style="magenta")
    table.add_column("详情", style="green")
    
    all_passed = True
    for check_name, passed, detail in checks:
        status = "[green]✓[/green]" if passed else "[red]✗[/red]"
        table.add_row(check_name, status, detail[:60])
        if not passed:
            all_passed = False
    
    console.print(table)
    
    if all_passed:
        console.print("\n[green]✓ 数据库健康状态良好[/green]")
    else:
        console.print("\n[red]✗ 发现数据库问题，请检查配置[/red]")
    
    return all_passed


async def main():
    """主函数"""
    console.print(Panel.fit(
        "[bold magenta]Open Notebook 数据库调试工具[/bold magenta]",
        border_style="cyan"
    ))
    
    # 执行各项检查
    await check_database_health()
    await show_database_info()
    await show_recent_notebooks()
    await show_pending_commands()
    
    console.print("\n[bold green]调试完成![/bold green]\n")
    console.print("[yellow]提示: 您可以修改此脚本添加更多自定义查询[/yellow]")


if __name__ == "__main__":
    asyncio.run(main())
