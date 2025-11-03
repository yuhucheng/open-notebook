# 🔍 Open Notebook 调试快速参考

## ⚡ 快速命令

```bash
# 1. 查看服务状态
make status

# 2. 查看详细日志
make debug-logs

# 3. 运行 API 调试工具
make debug-api

# 4. 运行数据库调试工具
make debug-db

# 5. 测试 Ollama 模型服务
make debug-ollama

# 6. 运行所有调试检查
make debug-all
```

---

## 🎯 VSCode 调试 (推荐)

### 启动调试

1. 打开 VSCode: `code .`
2. 按 `F5` 选择调试配置
3. 可用配置:
   - **🚀 调试 API 后端** - 断点调试 FastAPI
   - **🔧 调试 Worker** - 断点调试后台任务
   - **🌐 调试全栈** - 同时调试 API + Worker

### 调试快捷键

- `F5` - 开始/继续
- `F10` - 单步跳过
- `F11` - 单步进入
- `Shift+F11` - 单步跳出
- `Shift+F5` - 停止调试

---

## 📝 查看日志

### API 日志

```bash
# 前台运行 (实时查看日志)
uv run run_api.py

# 或查看进程输出
pgrep -fl "run_api"
```

### Worker 日志

```bash
# 前台运行
uv run --env-file .env surreal-commands-worker --import-modules commands
```

### 前端日志

```bash
cd frontend
npm run dev

# 浏览器控制台: F12 → Console
```

---

## 🔌 API 测试

### 在线文档

```bash
# Swagger UI
open http://localhost:5055/docs

# ReDoc
open http://localhost:5055/redoc
```

### Curl 命令

```bash
# 健康检查
curl http://localhost:5055/health

# 获取笔记本列表
curl http://localhost:5055/api/notebooks

# 详细输出
curl -v http://localhost:5055/api/notebooks
```

---

## 💾 数据库调试

### 快速检查

```bash
make debug-db
```

### 手动连接

```bash
surreal sql \
  --endpoint ws://172.20.11.168:8001/rpc \
  --namespace open_notebook \
  --database development \
  --username root \
  --password Mind88**0
```

### 常用查询

```sql
-- 查看所有表
INFO FOR DB;

-- 统计笔记本数量
SELECT count() FROM notebooks GROUP ALL;

-- 查看最近创建的笔记本
SELECT * FROM notebooks ORDER BY created_at DESC LIMIT 5;

-- 查看待处理命令
SELECT * FROM commands WHERE status = 'pending';
```

---

## 🌐 前端调试

### Chrome DevTools

1. 按 `F12` 打开开发者工具
2. **Console** - 查看日志和错误
3. **Network** - 查看 API 请求
4. **Sources** - 设置 JavaScript 断点

### React DevTools

安装浏览器扩展: [React Developer Tools](https://chrome.google.com/webstore)

---

## 🐛 代码断点

### Python 断点

```python
# 方法 1: 使用 breakpoint()
def my_function():
    breakpoint()  # 程序会在这里暂停

# 方法 2: 使用 pdb
import pdb; pdb.set_trace()

# 方法 3: 使用 ipdb (更友好)
import ipdb; ipdb.set_trace()
```

### JavaScript/TypeScript 断点

```typescript
// 在代码中添加
debugger; // 浏览器会在这里暂停

// 或在 Chrome DevTools Sources 标签中点击行号
```

---

## 🤖 Ollama 模型问题

### 模型崩溃错误

```
Error: model runner has unexpectedly stopped (status code: -1)
```

**快速诊断:**

```bash
# 测试 Ollama 服务
make debug-ollama

# 或手动测试
curl http://172.20.11.168:11434/api/tags
```

**常见原因:**

- 模型太大（如 70B 参数）
- 服务器内存不足
- Ollama 服务未运行

**解决方案:**

```bash
# 方案 1: 使用更小的模型 (推荐)
ssh user@172.20.11.168
ollama pull qwen2.5:3b      # 3B 参数，~2GB
ollama pull llama3.1:8b     # 8B 参数，~5GB

# 方案 2: 在 Open Notebook 设置中切换模型
# 访问: http://localhost:3000/settings
```

**详细文档:** `OLLAMA_TROUBLESHOOTING.md`

---

## 🔧 常见问题

### 端口被占用

```bash
# 查看占用进程
lsof -i :5055
lsof -i :3000

# 杀死进程
kill -9 <PID>
```

### 服务无响应

```bash
# 重启 API
pkill -f "run_api" && uv run run_api.py &

# 重启 Worker
make worker-restart

# 重启前端
pkill -f "next dev" && cd frontend && npm run dev &
```

### 数据库连接失败

```bash
# 测试连接
curl -X POST http://172.20.11.168:8001/sql \
  -u "root:Mind88**0" \
  -d "INFO FOR DB;"

# 检查环境变量
cat .env | grep SURREAL
```

### 清除缓存

```bash
# 清除 Python 缓存
make clean-cache

# 清除前端缓存
cd frontend && rm -rf .next node_modules/.cache
```

---

## 📊 性能分析

### API 性能

```python
# 添加计时装饰器
import time
from loguru import logger

async def my_endpoint():
    start = time.time()
    # 业务逻辑
    duration = time.time() - start
    logger.info(f"耗时: {duration:.2f}秒")
```

### 数据库查询优化

```python
# 记录慢查询
if duration > 1.0:
    logger.warning(f"慢查询: {query}")
```

---

## 📚 更多资源

- **完整调试指南**: [DEBUG_GUIDE.md](./DEBUG_GUIDE.md)
- **API 文档**: http://localhost:5055/docs
- **项目文档**: `./docs/`
- **社区支持**: https://discord.gg/37XJPXfz2w

---

## 💡 调试技巧

1. **从日志开始** - 先查看日志了解问题
2. **逐步缩小范围** - 从大到小定位问题
3. **使用断点** - 在关键位置设置断点
4. **检查数据** - 验证输入输出是否正确
5. **隔离问题** - 单独测试有问题的部分
6. **查看堆栈** - 了解错误的完整调用链

---

## 🆘 获取帮助

### 内置工具

```bash
# 检查服务状态
make status

# 运行所有调试检查
make debug-all
```

### 社区资源

- Discord: https://discord.gg/37XJPXfz2w
- GitHub Issues: https://github.com/lfnovo/open-notebook/issues
- 文档: `./docs/`

---

**提示**: 所有调试配置文件都已创建:

- `.vscode/launch.json` - VSCode 调试配置
- `.vscode/settings.json` - VSCode 项目设置
- `scripts/debug_api.py` - API 调试工具
- `scripts/debug_db.py` - 数据库调试工具

祝调试顺利! 🚀
