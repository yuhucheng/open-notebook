#!/usr/bin/env python3
"""
测试worker进程中的commands导入
"""
import sys
import os
sys.path.insert(0, '/Users/janmee/workspace/github/open-notebook')

print("测试worker进程commands导入...")

try:
    # 手动导入commands包
    print("1. 导入commands包...")
    import commands
    print("   ✅ commands包导入成功")
    
    # 导入所有子模块
    print("2. 导入commands子模块...")
    import commands.speech_commands
    print("   ✅ speech_commands导入成功")
    
    # 检查注册表
    print("3. 检查命令注册表...")
    from surreal_commands.core.registry import CommandRegistry
    registry = CommandRegistry()
    commands_list = registry.list_commands()
    
    speech_found = False
    for app, app_commands in commands_list.items():
        for cmd_name in app_commands.keys():
            if 'speech' in cmd_name:
                print(f"   ✅ 找到演讲稿命令: {app}.{cmd_name}")
                speech_found = True
    
    if not speech_found:
        print("   ❌ 未找到演讲稿命令")
        print(f"   注册表总命令数: {sum(len(cmds) for cmds in commands_list.values())}")
    
    print("✅ 测试完成")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
