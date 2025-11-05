#!/bin/bash
# Open Notebook API 调试准备脚本
# 用于在 Cursor 中调试 Python API (端口 5055)

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐛 准备调试 API 后端 (端口 5055)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 步骤 1: 检查环境
echo "步骤 1: 检查环境..."
if [ ! -f ".env" ]; then
    echo "❌ 错误: 未找到 .env 文件"
    echo "   请先复制 .env.example 并配置"
    exit 1
fi

if [ ! -f ".vscode/launch.json" ]; then
    echo "⚠️  警告: 未找到 .vscode/launch.json"
    echo "   调试配置可能未设置"
fi

echo "✅ 环境检查通过"
echo ""
echo ""
echo ""

# 步骤 2: 停止后台 API 服务（避免端口冲突）
echo "步骤 2: 清理端口 5055..."

# 查找并显示占用端口的进程
if lsof -i :5055 &> /dev/null; then
    echo "  发现占用端口 5055 的进程:"
    lsof -i :5055 | grep LISTEN | sed 's/^/    /'
    echo ""
    echo "  正在停止..."
    pkill -f "run_api.py" 2>/dev/null && echo "  ✅ 已停止 run_api.py" || true
    pkill -f "uvicorn.*open_notebook" 2>/dev/null && echo "  ✅ 已停止 uvicorn" || true
    lsof -ti :5055 | xargs kill -9 2>/dev/null && echo "  ✅ 端口 5055 已清理" || true
    sleep 1
else
    echo "  ✅ 端口 5055 空闲"
fi

echo ""

# 步骤 3: 显示调试说明
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 准备就绪！在 Cursor 中开始调试:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  设置断点（可选）:"
echo "   • 打开文件: api/routers/notebooks.py"
echo "   • 点击行号左侧添加红色断点 🔴"
echo "   • 或打开任何你想调试的 Python 文件"
echo ""
echo "2️⃣  启动调试:"
echo "   • 按 F5 (或 Cmd+Shift+D 打开调试面板)"
echo "   • 选择调试配置: '调试 API 后端'"
echo "   • 点击绿色播放按钮 ▶️"
echo ""
echo "3️⃣  等待启动:"
echo "   • 调试控制台会显示: 'Application startup complete.'"
echo "   • API 将运行在: http://localhost:5055"
echo ""
echo "4️⃣  测试 API:"
echo "   • 打开文档: http://localhost:5055/docs"
echo "   • 测试端点: curl http://localhost:5055/health"
echo "   • 触发断点: 访问你设置断点的接口"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 调试技巧:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  • F10:      单步跳过 (Step Over)"
echo "  • F11:      单步进入 (Step Into)"
echo "  • Shift+F11: 单步退出 (Step Out)"
echo "  • F5:       继续执行 (Continue)"
echo "  • Shift+F5: 停止调试 (Stop)"
echo "  • Cmd+K Cmd+I: 查看变量悬停提示"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 更多帮助:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  • DEBUG_EXAMPLE.md        - 完整调试教程"
echo "  • DEBUGGING_QUICKSTART.md - 快速参考"
echo "  • DEBUG_GUIDE.md          - 详细指南"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 现在按 F5 开始调试！"
echo ""

