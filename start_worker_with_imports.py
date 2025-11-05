#!/usr/bin/env python3
"""
手动启动worker进程并导入commands模块
"""
import sys
import os

# 添加项目路径
sys.path.insert(0, '/Users/janmee/workspace/github/open-notebook')

print("启动worker进程并手动导入commands...")

try:
    # 手动导入所有commands模块
    print("导入commands模块...")
    import commands.embedding_commands
    import commands.podcast_commands  
    import commands.source_commands
    import commands.speech_commands
    print("✅ 所有commands模块导入成功")
    
    # 验证命令注册
    from surreal_commands.core.registry import CommandRegistry
    registry = CommandRegistry()
    commands_list = registry.list_commands()
    
    speech_found = False
    for app, app_commands in commands_list.items():
        for cmd_name in app_commands.keys():
            if 'speech' in cmd_name:
                print(f"✅ 演讲稿命令已注册: {app}.{cmd_name}")
                speech_found = True
    
    if not speech_found:
        print("❌ 演讲稿命令未注册")
    
    # 启动worker
    print("启动surreal-commands-worker...")
    from surreal_commands.core.worker import Worker
    import asyncio
    
    async def run_worker():
        worker = Worker()
        await worker.run()
    
    asyncio.run(run_worker())
    
except Exception as e:
    print(f"❌ 启动失败: {e}")
    import traceback
    traceback.print_exc()
