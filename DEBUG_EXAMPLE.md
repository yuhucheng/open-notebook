# 🐛 VSCode 本地调试实战指南

## 🎯 调试场景示例

假设我们要调试 "获取笔记本列表" 的 API 端点。

---

## 📝 方法 1: VSCode 断点调试（推荐）

### 步骤 1: 打开 VSCode

```bash
cd /Users/yuhucheng/ray/code/github/open-notebook
code .
```

### 步骤 2: 停止后台服务

```bash
# 停止后台运行的 API（调试时由 VSCode 管理）
pkill -f "run_api.py"
pkill -f "surreal-commands-worker"
```

### 步骤 3: 在代码中设置断点

打开文件: `api/routers/notebooks.py`

找到获取笔记本列表的端点（大约在第 30-40 行）：

```python
@router.get("/notebooks")
async def get_notebooks():
    # 👈 在这里点击行号左侧，添加红色断点
    notebooks = await notebook_service.get_all_notebooks()
    return notebooks
```

### 步骤 4: 启动调试

1. 按 `F5` 或点击左侧调试图标
2. 选择 **"🚀 调试 API 后端"**
3. 看到终端输出: `Starting Open Notebook API server...`
4. 等待显示: `Application startup complete.`

### 步骤 5: 触发断点

在浏览器或终端触发 API 请求：

```bash
# 方法 1: 使用 curl
curl http://localhost:5055/api/notebooks

# 方法 2: 在浏览器打开
open http://localhost:5055/docs
# 然后在 Swagger UI 中测试 GET /api/notebooks
```

### 步骤 6: 调试操作

当程序在断点处暂停时，您可以：

**查看变量:**

- 左侧面板显示所有局部变量
- 鼠标悬停在变量上查看值
- 在调试控制台输入变量名查看

**单步执行:**

- `F10` - 单步跳过（执行当前行，不进入函数）
- `F11` - 单步进入（进入函数内部）
- `Shift+F11` - 单步跳出（从当前函数返回）
- `F5` - 继续执行到下一个断点

**调试控制台:**

- 按 `Cmd+Shift+Y` 打开调试控制台
- 输入 Python 表达式查看结果

```python
# 在调试控制台中尝试:
len(notebooks)
type(notebooks)
notebooks[0] if notebooks else None
```

---

## 🎯 方法 2: 条件断点

### 场景: 只在特定条件下暂停

1. **右键点击断点** → "编辑断点"
2. **添加条件表达式**:
   ```python
   len(notebooks) > 5
   ```
3. 程序只会在笔记本数量大于 5 时暂停

### 实际例子:

```python
@router.get("/notebooks/{notebook_id}")
async def get_notebook(notebook_id: str):
    # 条件断点: notebook_id == "特定ID"
    notebook = await notebook_service.get_notebook(notebook_id)
    return notebook
```

---

## 🎯 方法 3: 日志点（Logpoint）

### 场景: 不暂停程序，只打印信息

1. **右键点击行号** → "添加日志点"
2. **输入表达式**:
   ```python
   "笔记本数量: {len(notebooks)}, 第一个: {notebooks[0].get('title') if notebooks else 'None'}"
   ```
3. 程序执行时会在调试控制台输出信息，但不会暂停

---

## 🎯 方法 4: 调试数据库查询

### 步骤 1: 在数据库操作设置断点

打开 `open_notebook/database/repository.py`:

```python
async def query(self, sql: str, params: Optional[List] = None):
    # 👈 在这里设置断点
    logger.debug(f"执行查询: {sql}")
    result = await self.db.query(sql, params)
    # 👈 或在这里设置断点，查看查询结果
    return result
```

### 步骤 2: 启动调试并触发查询

```bash
# 触发一个会查询数据库的 API
curl http://localhost:5055/api/notebooks
```

### 步骤 3: 检查查询

在断点处，您可以：

- 查看 SQL 语句: `sql`
- 查看参数: `params`
- 查看结果: `result`
- 在调试控制台执行: `len(result)`

---

## 🎯 方法 5: 调试异步代码

### 异步函数的调试要点:

```python
async def process_notebook(notebook_id: str):
    # 断点 1: 函数入口
    notebook = await get_notebook(notebook_id)  # F11 可以进入这个函数

    # 断点 2: 获取数据后
    sources = await get_sources(notebook_id)  # 检查 notebook

    # 断点 3: 处理完成
    return process_data(notebook, sources)  # 检查 sources
```

**注意事项:**

- 异步函数的调试和普通函数一样
- `await` 语句可以正常单步执行
- VSCode 会自动处理异步上下文

---

## 🎯 方法 6: 调试 Worker 任务

### 步骤 1: 选择 Worker 调试配置

1. 按 `F5`
2. 选择 **"🔧 调试 Worker"**

### 步骤 2: 在命令处理器设置断点

打开 `commands/podcast_commands.py`:

```python
async def generate_podcast(notebook_id: str, **kwargs):
    # 👈 在这里设置断点
    logger.info(f"开始生成播客: {notebook_id}")

    # 获取笔记本内容
    notebook = await get_notebook(notebook_id)  # 👈 或这里

    # 生成播客脚本
    script = await generate_script(notebook)  # 👈 或这里

    return {"status": "success"}
```

### 步骤 3: 触发任务

```python
# 在另一个终端或通过 API 触发
from surreal_commands import CommandClient

client = CommandClient()
await client.execute_command(
    "generate_podcast",
    notebook_id="test-id"
)
```

---

## 🎯 方法 7: 调试前端 API 调用

### 场景: 前端调用 API 失败

#### 步骤 1: 在 API 端点设置断点

```python
@router.post("/notebooks")
async def create_notebook(notebook: NotebookCreate):
    # 👈 断点: 检查接收到的数据
    logger.info(f"创建笔记本: {notebook.title}")
    result = await notebook_service.create_notebook(notebook)
    # 👈 断点: 检查返回结果
    return result
```

#### 步骤 2: 在浏览器触发

1. 打开前端: http://localhost:3000
2. 点击 "Create Notebook"
3. 填写表单并提交

#### 步骤 3: 调试

程序会在断点处暂停，您可以：

- 检查 `notebook` 对象的内容
- 查看 `notebook.title`, `notebook.description` 等
- 单步执行到 `create_notebook` 内部
- 检查返回的 `result`

---

## 🎯 实战案例: 调试 "笔记本创建失败" 问题

### 问题描述

用户报告创建笔记本时失败，没有错误提示。

### 调试步骤

#### 1. 在 API 端点设置断点

```python
# api/routers/notebooks.py
@router.post("/notebooks")
async def create_notebook(notebook: NotebookCreate):
    # 断点 1: 检查输入
    logger.debug(f"接收到的数据: {notebook}")

    try:
        result = await notebook_service.create_notebook(notebook)
        # 断点 2: 检查创建结果
        return result
    except Exception as e:
        # 断点 3: 捕获异常
        logger.error(f"创建失败: {e}")
        raise
```

#### 2. 在服务层设置断点

```python
# api/notebook_service.py
async def create_notebook(self, notebook: NotebookCreate):
    # 断点 4: 服务层入口
    data = {
        "title": notebook.title,
        "description": notebook.description
    }

    # 断点 5: 数据库操作前
    result = await db.create("notebooks", data)

    # 断点 6: 检查数据库返回
    return result
```

#### 3. 启动调试并测试

```bash
# 使用 curl 模拟前端请求
curl -X POST http://localhost:5055/api/notebooks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试笔记本",
    "description": "这是一个测试"
  }'
```

#### 4. 分析结果

通过逐步调试，可能发现：

- ✅ 断点 1: 数据接收正确
- ✅ 断点 4: 服务层接收正确
- ❌ 断点 5: 数据库连接失败
- → **根因**: 数据库配置错误

---

## 📊 调试快捷键速查

| 快捷键         | 功能            | 说明                       |
| -------------- | --------------- | -------------------------- |
| `F5`           | 开始调试 / 继续 | 启动调试或继续到下一个断点 |
| `Shift+F5`     | 停止调试        | 终止调试会话               |
| `Cmd+Shift+F5` | 重启调试        | 重新启动调试会话           |
| `F9`           | 切换断点        | 在当前行添加/删除断点      |
| `F10`          | 单步跳过        | 执行当前行，不进入函数     |
| `F11`          | 单步进入        | 进入函数内部               |
| `Shift+F11`    | 单步跳出        | 从当前函数返回             |

---

## 🔧 调试控制台常用命令

```python
# 查看变量类型
type(notebook)

# 查看变量内容
print(notebook)
notebook.__dict__

# 查看对象属性
dir(notebook)

# 检查是否为 None
notebook is None

# 获取长度
len(notebooks) if notebooks else 0

# 条件检查
any(nb.get('title') == '测试' for nb in notebooks)

# 格式化输出
import json
print(json.dumps(notebook, indent=2))
```

---

## 🚨 常见调试问题

### 问题 1: 断点不生效

**原因:** 代码已经被执行过，断点添加太晚

**解决:**

1. 重启调试 (`Cmd+Shift+F5`)
2. 或在启动前就设置好断点

### 问题 2: 无法查看变量值

**原因:** 变量不在当前作用域

**解决:**

1. 检查变量是否已定义
2. 使用 `F11` 进入函数内部查看
3. 在调试控制台使用 `globals()` 或 `locals()`

### 问题 3: 调试器启动失败

**原因:** 端口被占用

**解决:**

```bash
# 杀死占用端口的进程
lsof -ti :5055 | xargs kill -9
```

---

## 💡 调试最佳实践

1. **从外到内**

   - 先在 API 端点设置断点
   - 确认数据正确接收
   - 再深入到服务层和数据层

2. **使用日志点**

   - 对于不需要暂停的地方使用日志点
   - 可以记录更多执行流程信息

3. **条件断点**

   - 当循环次数多时使用条件断点
   - 避免反复暂停不相关的执行

4. **调试控制台**

   - 充分利用调试控制台测试表达式
   - 可以临时修改变量值进行测试

5. **异常断点**
   - 在调试面板勾选 "Raised Exceptions"
   - 自动在抛出异常处暂停

---

## 📚 进阶技巧

### 1. 远程调试

如果 API 运行在远程服务器：

```python
# 在代码中添加
import debugpy
debugpy.listen(("0.0.0.0", 5678))
print("等待调试器连接...")
debugpy.wait_for_client()
```

VSCode 配置:

```json
{
  "name": "远程调试",
  "type": "debugpy",
  "request": "attach",
  "connect": {
    "host": "172.20.11.168",
    "port": 5678
  }
}
```

### 2. 多进程调试

调试 API + Worker 同时运行：

1. 使用 Compound 配置: **"🌐 调试全栈"**
2. 两个调试会话同时运行
3. 可以在不同进程中设置断点

### 3. 性能分析

结合 cProfile 和断点：

```python
import cProfile
import pstats

profiler = cProfile.Profile()
profiler.enable()

# 在这里设置断点，执行要分析的代码

profiler.disable()
stats = pstats.Stats(profiler)
stats.sort_stats('cumulative')
stats.print_stats(10)  # 显示前10个最耗时的函数
```

---

## 🎓 实践练习

### 练习 1: 调试 API 端点

1. 在 `api/routers/notebooks.py` 设置断点
2. 使用 curl 触发 API
3. 查看接收到的数据
4. 单步执行到服务层

### 练习 2: 调试数据库查询

1. 在 `open_notebook/database/repository.py` 设置断点
2. 触发需要查询数据库的 API
3. 查看 SQL 语句和参数
4. 检查查询结果

### 练习 3: 调试异常

1. 故意在代码中制造一个错误
2. 在调试面板勾选 "Uncaught Exceptions"
3. 触发错误
4. 查看异常堆栈和变量状态

---

**准备好开始调试了吗？** 🚀

1. 打开 VSCode: `code .`
2. 按 `F5` 选择调试配置
3. 在代码中设置断点
4. 开始探索！
