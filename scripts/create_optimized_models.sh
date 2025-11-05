#!/bin/bash

# 🚀 Ollama 模型优化脚本
# 用于创建不同性能等级的优化模型
# 适配: Intel Arc A770 x4 GPU

set -e

echo "=================================================="
echo "🚀 Ollama 模型优化脚本"
echo "=================================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查 ollama 命令
if ! command -v ollama &> /dev/null; then
    echo -e "${RED}❌ 错误: 找不到 ollama 命令${NC}"
    echo "请确保您在 Ollama 服务器上运行此脚本"
    exit 1
fi

echo -e "${GREEN}✅ 检测到 Ollama${NC}"
echo ""

# 选项菜单
echo "请选择要创建的优化模型:"
echo ""
echo "  ${YELLOW}DeepSeek-R1 32B 系列${NC} (有 Chain of Thought 推理)"
echo "  1) deepseek-r1:32b-ultra-fast  - 4K上下文,最快 (10-45秒)"
echo "  2) deepseek-r1:32b-fast        - 8K上下文,平衡 (20-90秒) [已创建]"
echo ""
echo "  ${YELLOW}DeepSeek-R1 14B 系列${NC} (更快的 CoT 推理)"
echo "  3) deepseek-r1:14b-fast        - 8K上下文,快速 (10-40秒)"
echo ""
echo "  ${YELLOW}Qwen2.5 系列${NC} (无 CoT,响应最快)"
echo "  4) qwen2.5:32b-fast            - 8K上下文,无CoT (5-20秒)"
echo "  5) qwen2.5:14b-fast            - 8K上下文,无CoT (3-10秒,最快)"
echo ""
echo "  ${YELLOW}嵌入模型优化${NC}"
echo "  6) mxbai-embed-large:fast      - 优化嵌入速度"
echo ""
echo "  7) 全部创建 (除了已存在的 32b-fast)"
echo "  0) 退出"
echo ""
read -p "请输入选项 [0-7]: " choice

case $choice in
    1)
        echo -e "\n${GREEN}创建 deepseek-r1:32b-ultra-fast (4K超快版本)${NC}"
        cat > /tmp/Modelfile.deepseek-r1-32b-ultra-fast << 'EOF'
FROM deepseek-r1:32b

# 4K 上下文 - 适合日常对话
PARAMETER num_ctx 4096
PARAMETER num_batch 2048
PARAMETER num_predict 512
PARAMETER temperature 0.7
PARAMETER top_k 40
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1
EOF
        ollama create deepseek-r1:32b-ultra-fast -f /tmp/Modelfile.deepseek-r1-32b-ultra-fast
        echo -e "${GREEN}✅ 创建成功!${NC}"
        echo "测试命令: time ollama run deepseek-r1:32b-ultra-fast '用一句话介绍 Python'"
        ;;
    
    2)
        echo -e "\n${YELLOW}⚠️  deepseek-r1:32b-fast 已经存在${NC}"
        read -p "是否重新创建? [y/N]: " recreate
        if [[ $recreate =~ ^[Yy]$ ]]; then
            echo -e "${GREEN}重新创建 deepseek-r1:32b-fast${NC}"
            cat > /tmp/Modelfile.deepseek-r1-32b-fast << 'EOF'
FROM deepseek-r1:32b

PARAMETER num_ctx 8192
PARAMETER num_batch 1024
PARAMETER num_predict 1024
PARAMETER temperature 0.7
PARAMETER top_k 40
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1
EOF
            ollama create deepseek-r1:32b-fast -f /tmp/Modelfile.deepseek-r1-32b-fast
            echo -e "${GREEN}✅ 重新创建成功!${NC}"
        fi
        ;;
    
    3)
        echo -e "\n${GREEN}下载并创建 deepseek-r1:14b-fast${NC}"
        echo "正在下载 deepseek-r1:14b..."
        ollama pull deepseek-r1:14b
        
        cat > /tmp/Modelfile.deepseek-r1-14b-fast << 'EOF'
FROM deepseek-r1:14b

PARAMETER num_ctx 8192
PARAMETER num_batch 2048
PARAMETER num_predict 1024
PARAMETER temperature 0.7
PARAMETER top_k 40
PARAMETER top_p 0.9
EOF
        ollama create deepseek-r1:14b-fast -f /tmp/Modelfile.deepseek-r1-14b-fast
        echo -e "${GREEN}✅ 创建成功!${NC}"
        echo "测试命令: time ollama run deepseek-r1:14b-fast '用一句话介绍 Python'"
        ;;
    
    4)
        echo -e "\n${GREEN}下载并创建 qwen2.5:32b-fast${NC}"
        echo "正在下载 qwen2.5:32b..."
        ollama pull qwen2.5:32b
        
        cat > /tmp/Modelfile.qwen2.5-32b-fast << 'EOF'
FROM qwen2.5:32b

PARAMETER num_ctx 8192
PARAMETER num_batch 2048
PARAMETER num_predict 1024
PARAMETER temperature 0.7
PARAMETER top_k 40
PARAMETER top_p 0.9
EOF
        ollama create qwen2.5:32b-fast -f /tmp/Modelfile.qwen2.5-32b-fast
        echo -e "${GREEN}✅ 创建成功!${NC}"
        echo "测试命令: time ollama run qwen2.5:32b-fast '用一句话介绍 Python'"
        ;;
    
    5)
        echo -e "\n${GREEN}下载并创建 qwen2.5:14b-fast (最快选项)${NC}"
        echo "正在下载 qwen2.5:14b..."
        ollama pull qwen2.5:14b
        
        cat > /tmp/Modelfile.qwen2.5-14b-fast << 'EOF'
FROM qwen2.5:14b

PARAMETER num_ctx 8192
PARAMETER num_batch 2048
PARAMETER num_predict 1024
PARAMETER temperature 0.7
PARAMETER top_k 40
PARAMETER top_p 0.9
EOF
        ollama create qwen2.5:14b-fast -f /tmp/Modelfile.qwen2.5-14b-fast
        echo -e "${GREEN}✅ 创建成功!${NC}"
        echo "测试命令: time ollama run qwen2.5:14b-fast '用一句话介绍 Python'"
        ;;
    
    6)
        echo -e "\n${GREEN}创建 mxbai-embed-large:fast (嵌入模型优化)${NC}"
        cat > /tmp/Modelfile.mxbai-embed-fast << 'EOF'
FROM mxbai-embed-large

# 嵌入模型专用参数
PARAMETER num_ctx 512
PARAMETER num_batch 512
EOF
        ollama create mxbai-embed-large:fast -f /tmp/Modelfile.mxbai-embed-fast
        echo -e "${GREEN}✅ 创建成功!${NC}"
        echo "在 Open Notebook 中将嵌入模型改为: mxbai-embed-large:fast"
        ;;
    
    7)
        echo -e "\n${GREEN}创建所有优化模型...${NC}\n"
        
        # 1. DeepSeek-R1 32B Ultra Fast
        echo -e "${YELLOW}[1/5]${NC} 创建 deepseek-r1:32b-ultra-fast..."
        cat > /tmp/Modelfile.deepseek-r1-32b-ultra-fast << 'EOF'
FROM deepseek-r1:32b
PARAMETER num_ctx 4096
PARAMETER num_batch 2048
PARAMETER num_predict 512
PARAMETER temperature 0.7
PARAMETER top_k 40
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1
EOF
        ollama create deepseek-r1:32b-ultra-fast -f /tmp/Modelfile.deepseek-r1-32b-ultra-fast
        
        # 2. DeepSeek-R1 14B
        echo -e "${YELLOW}[2/5]${NC} 下载并创建 deepseek-r1:14b-fast..."
        ollama pull deepseek-r1:14b
        cat > /tmp/Modelfile.deepseek-r1-14b-fast << 'EOF'
FROM deepseek-r1:14b
PARAMETER num_ctx 8192
PARAMETER num_batch 2048
PARAMETER num_predict 1024
PARAMETER temperature 0.7
EOF
        ollama create deepseek-r1:14b-fast -f /tmp/Modelfile.deepseek-r1-14b-fast
        
        # 3. Qwen2.5 32B
        echo -e "${YELLOW}[3/5]${NC} 下载并创建 qwen2.5:32b-fast..."
        ollama pull qwen2.5:32b
        cat > /tmp/Modelfile.qwen2.5-32b-fast << 'EOF'
FROM qwen2.5:32b
PARAMETER num_ctx 8192
PARAMETER num_batch 2048
PARAMETER num_predict 1024
PARAMETER temperature 0.7
EOF
        ollama create qwen2.5:32b-fast -f /tmp/Modelfile.qwen2.5-32b-fast
        
        # 4. Qwen2.5 14B
        echo -e "${YELLOW}[4/5]${NC} 下载并创建 qwen2.5:14b-fast..."
        ollama pull qwen2.5:14b
        cat > /tmp/Modelfile.qwen2.5-14b-fast << 'EOF'
FROM qwen2.5:14b
PARAMETER num_ctx 8192
PARAMETER num_batch 2048
PARAMETER num_predict 1024
PARAMETER temperature 0.7
EOF
        ollama create qwen2.5:14b-fast -f /tmp/Modelfile.qwen2.5-14b-fast
        
        # 5. Embedding
        echo -e "${YELLOW}[5/5]${NC} 创建 mxbai-embed-large:fast..."
        cat > /tmp/Modelfile.mxbai-embed-fast << 'EOF'
FROM mxbai-embed-large
PARAMETER num_ctx 512
PARAMETER num_batch 512
EOF
        ollama create mxbai-embed-large:fast -f /tmp/Modelfile.mxbai-embed-fast
        
        echo -e "\n${GREEN}✅ 所有模型创建完成!${NC}"
        ;;
    
    0)
        echo "退出"
        exit 0
        ;;
    
    *)
        echo -e "${RED}无效的选项${NC}"
        exit 1
        ;;
esac

echo ""
echo "=================================================="
echo "📊 当前可用的优化模型:"
echo "=================================================="
ollama list | grep -E "deepseek-r1|qwen2.5|mxbai-embed" || echo "暂无优化模型"

echo ""
echo "=================================================="
echo "🎯 使用建议:"
echo "=================================================="
echo ""
echo "  ${GREEN}日常对话 (最快)${NC}:"
echo "    - qwen2.5:14b-fast"
echo "    - deepseek-r1:32b-ultra-fast"
echo ""
echo "  ${YELLOW}平衡性能和质量${NC}:"
echo "    - qwen2.5:32b-fast"
echo "    - deepseek-r1:14b-fast"
echo ""
echo "  ${RED}复杂推理 (Chain of Thought)${NC}:"
echo "    - deepseek-r1:32b-fast"
echo ""
echo "  ${GREEN}嵌入模型${NC}:"
echo "    - mxbai-embed-large:fast"
echo ""
echo "=================================================="
echo "📝 在 Open Notebook 中配置:"
echo "=================================================="
echo ""
echo "1. 访问: http://YOUR_IP:3000/settings"
echo "2. 修改 Chat Model 为上述优化模型之一"
echo "3. 修改 Embedding Model 为: mxbai-embed-large:fast"
echo "4. 保存并测试"
echo ""
echo "🧪 性能测试命令:"
echo "  time ollama run MODEL_NAME '用一句话介绍 Python'"
echo ""

