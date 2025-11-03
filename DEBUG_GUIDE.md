# 🔍 Open Notebook 调试完全指南

## 📋 目录

1. [快速开始](#快速开始)
2. [查看日志](#查看日志)
3. [VSCode 断点调试](#vscode-断点调试)
4. [API 调试](#api-调试)
5. [前端调试](#前端调试)
6. [Worker 调试](#worker-调试)
7. [数据库调试](#数据库调试)
8. [常见问题排查](#常见问题排查)
9. [性能分析](#性能分析)

---

## 🚀 快速开始

### 1. 检查服务状态

```bash
# 查看所有服务状态
make status

# 查看运行中的进程
pgrep -fl "run_api|surreal-commands-worker|next"
```

### 2. 查看实时日志

```bash
# API 后端日志（如果在终端运行）
# 日志会直接输出到启动 API 的终端

# Worker 日志
tail -f logs/worker.log  # 如果配置了日志文件

# 前端日志
# 查看启动前端的终端输出
```

---

## 📝 查看日志

### API 后端日志

**方法 1: 终端直接输出**

```bash
# 停止后台运行的 API
pkill -f "run_api.py"

# 前台运行 API，查看实时日志
cd /Users/yuhucheng/ray/code/github/open-notebook
uv run run_api.py
```

**方法 2: 设置日志级别**

```bash
# 修改 .env 文件
echo "LOG_LEVEL=DEBUG" >> .env

# 重启 API
pkill -f "run_api.py"
uv run run_api.py
```

**查看 Loguru 日志输出**

```python
# 在代码中添加调试日志
from loguru import logger

logger.debug("这是调试信息")
logger.info("这是普通信息")
logger.warning("这是警告信息")
logger.error("这是错误信息")
logger.exception("这是异常信息，会包含堆栈跟踪")
```

### Worker 日志

```bash
# 前台运行 Worker 查看日志
cd /Users/yuhucheng/ray/code/github/open-notebook
uv run --env-file .env surreal-commands-worker --import-modules commands
```

### 前端日志

```bash
# 查看 Next.js 开发服务器日志
cd frontend
npm run dev

# 浏览器控制台
# 打开 Chrome DevTools (F12)
# 查看 Console 标签
```

### 数据库日志

```bash
# 如果使用本地 Docker 数据库
docker compose logs -f surrealdb

# 查看最近 100 行日志
docker compose logs --tail=100 surrealdb
```

---

## 🐛 VSCode 断点调试

### 配置已创建

我已经为您创建了 `.vscode/launch.json` 配置文件，包含以下调试配置：

1. **🚀 调试 API 后端** - 调试 FastAPI 应用
2. **🔧 调试 Worker** - 调试后台任务处理
3. **🧪 运行单元测试** - 调试测试代码
4. **🎯 调试当前 Python 文件** - 调试任意 Python 文件
5. **🌐 调试全栈** - 同时调试 API 和 Worker

### 使用步骤

#### 方法 1: 使用 VSCode 调试面板

1. **打开 VSCode**

   ```bash
   cd /Users/yuhucheng/ray/code/github/open-notebook
   code .
   ```

2. **设置断点**

   - 在代码行号左侧点击，添加红色断点
   - 例如：`api/routers/notebooks.py` 的某个函数内

3. **启动调试**

   - 按 `F5` 或点击调试面板的绿色三角
   - 选择 "🚀 调试 API 后端"
   - 或使用 `Cmd+Shift+D` 打开调试面板

4. **调试操作**
   - `F5`: 继续执行
   - `F10`: 单步跳过
   - `F11`: 单步进入
   - `Shift+F11`: 单步跳出
   - `Cmd+Shift+F5`: 重启调试
   - `Shift+F5`: 停止调试

#### 方法 2: 在代码中添加断点

```python
# 在任何 Python 文件中添加
import pdb; pdb.set_trace()  # Python 内置调试器

# 或使用
breakpoint()  # Python 3.7+ 推荐方式

# 或使用 ipdb (更友好的界面)
import ipdb; ipdb.set_trace()
```

### 调试 API 端点示例

1. **在路由处理函数设置断点**

```python
# api/routers/notebooks.py
@router.get("/notebooks/{notebook_id}")
async def get_notebook(notebook_id: str):
    # 在这里设置断点 ←
    notebook = await notebook_service.get_notebook(notebook_id)
    return notebook
```

2. **启动调试** (F5 → 选择 "🚀 调试 API 后端")

3. **触发断点**

   - 在浏览器访问: `http://localhost:5055/api/notebooks/some-id`
   - 或使用 curl: `curl http://localhost:5055/api/notebooks/some-id`

4. **检查变量**
   - 在 VSCode 左侧面板查看变量值
   - 在调试控制台输入变量名查看值
   - 鼠标悬停在变量上查看值

---

## 🔌 API 调试

### 使用 FastAPI 内置文档

```bash
# 访问 Swagger UI
open http://localhost:5055/docs

# 访问 ReDoc
open http://localhost:5055/redoc
```

**功能:**

- 查看所有 API 端点
- 在线测试 API 调用
- 查看请求/响应模型
- 查看参数说明

### 使用 curl 调试

```bash
# 健康检查
curl http://localhost:5055/health

# 获取所有笔记本
curl http://localhost:5055/api/notebooks

# 获取特定笔记本（带详细输出）
curl -v http://localhost:5055/api/notebooks/notebook-id

# POST 请求创建笔记本
curl -X POST http://localhost:5055/api/notebooks \
  -H "Content-Type: application/json" \
  -d '{"title": "测试笔记本", "description": "调试用"}'

# 带认证的请求（如果配置了密码）
curl -H "Authorization: Bearer your_password" \
  http://localhost:5055/api/notebooks
```

### 使用 HTTPie (更友好)

```bash
# 安装 HTTPie
brew install httpie

# GET 请求
http http://localhost:5055/api/notebooks

# POST 请求
http POST http://localhost:5055/api/notebooks \
  title="测试笔记本" \
  description="调试用"

# 带认证
http http://localhost:5055/api/notebooks \
  Authorization:"Bearer your_password"
```

### 使用 Python 脚本调试

```python
# debug_api.py
import httpx
import asyncio
from loguru import logger

async def test_api():
    async with httpx.AsyncClient() as client:
        # 测试健康检查
        response = await client.get("http://localhost:5055/health")
        logger.info(f"Health check: {response.json()}")

        # 测试获取笔记本
        response = await client.get("http://localhost:5055/api/notebooks")
        logger.info(f"Notebooks: {response.json()}")

if __name__ == "__main__":
    asyncio.run(test_api())
```

```bash
# 运行调试脚本
uv run python debug_api.py
```

---

## 🌐 前端调试

### Chrome DevTools 调试

1. **打开开发者工具**

   - 按 `F12` 或 `Cmd+Option+I` (Mac)
   - 或右键点击页面 → "检查"

2. **Console 标签**

   - 查看 console.log 输出
   - 查看 JavaScript 错误
   - 执行 JavaScript 代码

3. **Network 标签**

   - 查看所有网络请求
   - 检查 API 请求和响应
   - 查看请求耗时
   - 检查请求头和响应头

4. **Sources 标签**
   - 设置 JavaScript 断点
   - 单步调试
   - 查看调用堆栈

### Next.js 调试

**查看构建错误**

```bash
cd frontend
npm run dev 2>&1 | tee frontend.log
```

**检查环境变量**

```bash
# 在 Next.js 中打印环境变量
# pages/_app.tsx 或 app/layout.tsx
console.log('API_URL:', process.env.NEXT_PUBLIC_API_URL)
```

**React DevTools**

```bash
# 安装 React DevTools 浏览器扩展
# Chrome: https://chrome.google.com/webstore
# 搜索 "React Developer Tools"
```

### 前端日志

```typescript
// 在任何 TypeScript/JavaScript 文件中
console.log("调试信息:", data);
console.error("错误信息:", error);
console.warn("警告信息:", warning);
console.table(arrayData); // 表格形式显示数组
console.dir(object); // 显示对象的所有属性
```

---

## ⚙️ Worker 调试

### 查看 Worker 任务

```python
# 在代码中添加调试日志
# commands/podcast_commands.py
from loguru import logger

async def generate_podcast(notebook_id: str):
    logger.debug(f"开始生成播客: {notebook_id}")
    # ... 业务逻辑 ...
    logger.info(f"播客生成完成: {notebook_id}")
```

### 手动触发任务

```python
# debug_worker.py
from surreal_commands import CommandClient
import asyncio

async def test_worker():
    client = CommandClient()

    # 触发播客生成任务
    result = await client.execute_command(
        "generate_podcast",
        notebook_id="test-notebook-id"
    )
    print(f"任务结果: {result}")

if __name__ == "__main__":
    asyncio.run(test_worker())
```

### 调试异步任务

```bash
# 使用 VSCode 调试配置
# 选择 "🔧 调试 Worker"
# 在 commands/ 目录下的函数设置断点
```

---

## 💾 数据库调试

### 使用 SurrealDB CLI

```bash
# 连接到数据库
surreal sql \
  --endpoint ws://172.20.11.168:8001/rpc \
  --namespace open_notebook \
  --database development \
  --username root \
  --password Mind88**0
```

**常用查询**

```sql
-- 查看所有表
INFO FOR DB;

-- 查看表结构
INFO FOR TABLE notebooks;

-- 查询数据
SELECT * FROM notebooks LIMIT 10;

-- 查询特定笔记本
SELECT * FROM notebooks WHERE id = "notebook:xxx";

-- 统计记录数
SELECT count() FROM notebooks GROUP ALL;

-- 查看最近创建的笔记本
SELECT * FROM notebooks ORDER BY created_at DESC LIMIT 5;
```

### Python 数据库调试

```python
# debug_db.py
from open_notebook.database.client import get_db_client
import asyncio

async def debug_database():
    db = await get_db_client()

    # 查询所有笔记本
    notebooks = await db.select("notebooks")
    print(f"笔记本数量: {len(notebooks)}")

    # 查询特定记录
    notebook = await db.select(f"notebooks:{notebook_id}")
    print(f"笔记本详情: {notebook}")

if __name__ == "__main__":
    asyncio.run(debug_database())
```

---

## 🔍 常见问题排查

### 1. API 无法启动

**检查端口占用**

```bash
# 查看端口 5055 是否被占用
lsof -i :5055

# 杀死占用进程
kill -9 <PID>
```

**检查依赖**

```bash
# 重新安装依赖
cd /Users/yuhucheng/ray/code/github/open-notebook
uv sync
```

**检查数据库连接**

```bash
# 测试数据库连接
curl -X POST http://172.20.11.168:8001/sql \
  -u "root:Mind88**0" \
  -d "INFO FOR DB;"
```

### 2. 前端无法访问 API

**检查 API 是否运行**

```bash
curl http://localhost:5055/health
```

**检查 CORS 配置**

```python
# api/main.py 中检查 CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发环境允许所有来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**检查浏览器控制台错误**

- 打开浏览器 DevTools (F12)
- 查看 Console 和 Network 标签
- 查找红色错误信息

### 3. Worker 任务不执行

**检查 Worker 是否运行**

```bash
pgrep -fl surreal-commands-worker
```

**查看任务队列**

```sql
-- 在 SurrealDB 中查询
SELECT * FROM commands WHERE status = 'pending';
```

**重启 Worker**

```bash
make worker-restart
```

### 4. 数据库连接失败

**检查网络连接**

```bash
# Ping 数据库服务器
ping 172.20.11.168

# 测试端口连通性
nc -zv 172.20.11.168 8001
```

**检查环境变量**

```bash
cat .env | grep SURREAL
```

**验证凭证**

```bash
# 使用 curl 测试
curl -X POST http://172.20.11.168:8001/sql \
  -u "root:Mind88**0" \
  -d "SELECT * FROM notebooks LIMIT 1;"
```

### 5. AI 模型调用失败

**检查 Ollama 连接**

```bash
curl http://172.20.11.168:11434/api/tags
```

**检查模型是否可用**

```bash
curl http://172.20.11.168:11434/api/generate \
  -d '{
    "model": "llama2",
    "prompt": "Hello",
    "stream": false
  }'
```

**查看模型配置**

```bash
# 访问设置页面
open http://localhost:3000/settings
```

---

## 📊 性能分析

### API 性能分析

```python
# 添加计时装饰器
import time
from functools import wraps
from loguru import logger

def timing_decorator(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start = time.time()
        result = await func(*args, **kwargs)
        duration = time.time() - start
        logger.info(f"{func.__name__} 执行耗时: {duration:.2f}秒")
        return result
    return wrapper

# 使用
@router.get("/notebooks")
@timing_decorator
async def get_notebooks():
    # ... 业务逻辑 ...
    pass
```

### 使用 cProfile

```bash
# 运行性能分析
python -m cProfile -o profile.stats run_api.py

# 分析结果
python -m pstats profile.stats
```

### 数据库查询优化

```python
# 使用 loguru 记录慢查询
from loguru import logger
import time

async def query_with_timing(db, query):
    start = time.time()
    result = await db.query(query)
    duration = time.time() - start

    if duration > 1.0:  # 超过 1 秒的查询
        logger.warning(f"慢查询 ({duration:.2f}s): {query}")

    return result
```

---

## 🛠️ 实用调试命令

```bash
# === 服务管理 ===

# 查看所有服务状态
make status

# 停止所有服务
make stop-all

# 重启 API
pkill -f "run_api.py" && uv run run_api.py &

# 重启 Worker
make worker-restart

# 重启前端
pkill -f "next dev" && cd frontend && npm run dev &

# === 日志查看 ===

# 实时查看 API 日志
tail -f api.log  # 如果配置了日志文件

# 查看进程列表
ps aux | grep -E "run_api|surreal-commands|next"

# === 网络调试 ===

# 查看端口监听
lsof -i :3000 -i :5055 -i :8001

# 测试端口连接
nc -zv localhost 5055

# 查看网络请求
tcpdump -i any port 5055

# === 数据库操作 ===

# 导出数据库
surreal export \
  --endpoint ws://172.20.11.168:8001/rpc \
  --namespace open_notebook \
  --database development \
  --username root \
  --password Mind88**0 \
  backup.sql

# 导入数据库
surreal import \
  --endpoint ws://172.20.11.168:8001/rpc \
  --namespace open_notebook \
  --database development \
  --username root \
  --password Mind88**0 \
  backup.sql
```

---

## 📚 进阶调试技巧

### 1. 远程调试

```python
# 安装 debugpy
# 在代码中添加
import debugpy
debugpy.listen(("0.0.0.0", 5678))
print("等待调试器连接...")
debugpy.wait_for_client()
```

### 2. 条件断点

在 VSCode 中：

- 右键点击断点 → "编辑断点"
- 添加条件，如: `notebook_id == "specific-id"`

### 3. 日志点 (Logpoint)

在 VSCode 中：

- 右键点击行号 → "添加日志点"
- 输入表达式，如: `"notebook_id = {notebook_id}"`

### 4. 异常断点

在 VSCode 调试面板：

- 点击 "断点" 面板
- 勾选 "Raised Exceptions" 或 "Uncaught Exceptions"

---

## 💡 调试最佳实践

1. **从日志开始** - 先查看日志，了解问题范围
2. **逐步缩小范围** - 从大到小定位问题
3. **复现问题** - 确保能稳定复现
4. **单步调试** - 使用断点追踪执行流程
5. **检查输入输出** - 验证数据是否符合预期
6. **查看堆栈跟踪** - 了解错误来源
7. **使用版本控制** - 对比代码变更
8. **记录调试过程** - 便于后续参考

---

## 🆘 获取帮助

- **Discord 社区**: https://discord.gg/37XJPXfz2w
- **GitHub Issues**: https://github.com/lfnovo/open-notebook/issues
- **项目文档**: `/docs` 目录

祝调试顺利! 🚀

