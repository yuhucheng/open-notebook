#!/usr/bin/env python3
"""
正确的worker启动脚本，确保commands模块被导入
"""
import sys
import os

# 确保在正确的虚拟环境中
if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
    print("警告: 可能没有在虚拟环境中运行")

print("启动演讲稿worker进程...")

try:
    # 手动导入所有commands模块，确保它们被注册
    print("1. 导入commands模块...")
    import commands.embedding_commands
    import commands.podcast_commands
    import commands.source_commands
    import commands.speech_commands
    print("   ✅ 所有commands模块导入成功")
    
    # 验证命令注册
    from surreal_commands.core.registry import CommandRegistry
    registry = CommandRegistry()
    commands_list = registry.list_commands()
    
    speech_found = False
    for app, app_commands in commands_list.items():
        for cmd_name in app_commands.keys():
            if 'speech' in cmd_name:
                print(f"   ✅ 演讲稿命令已注册: {app}.{cmd_name}")
                speech_found = True
    
    if not speech_found:
        print("   ❌ 演讲稿命令未注册")
        sys.exit(1)
    
    print("2. 启动worker...")
    # 使用surreal-commands的worker
    from surreal_commands.core.worker import Worker
    import asyncio
    
    async def run_worker():
        worker = Worker()
        await worker.run()
    
    asyncio.run(run_worker())
    
except Exception as e:
    print(f"❌ Worker启动失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
