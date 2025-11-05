# 🔧 修复 "Unable to Connect to API Server" 错误

## 🎯 错误原因

前端显示 **"Unable to Connect to API Server"** 通常是因为：

1. ❌ **API 服务器未运行**（最常见）
2. ⚠️ API 在断点处暂停（调试模式）
3. ⚠️ API_URL 配置错误
4. ⚠️ 端口被其他进程占用

---

## ⚡ 快速诊断

### 步骤 1: 检查 API 是否运行

```bash
# 方法 1: 健康检查
curl http://localhost:5055/health

# 方法 2: 检查进程
pgrep -fl "run_api\|uvicorn"

# 方法 3: 检查端口
lsof -i :5055
```

**结果判断:**

- ✅ 返回 `{"status":"healthy"}` → API 正常，检查前端配置
- ❌ 连接被拒绝 → API 未运行，需要启动
- ⏸️ 无响应但进程存在 → 可能在调试断点处暂停

---

## 💡 解决方案

### 方案 1: 正常启动 API（推荐）

**如果 API 完全没有运行:**

```bash
cd /Users/yuhucheng/ray/code/github/open-notebook

# 停止所有可能的旧进程
pkill -f "run_api.py"
pkill -f "uvicorn"

# 后台启动 API
uv run run_api.py &

# 等待启动完成（约 5-10 秒）
sleep 5

# 验证
curl http://localhost:5055/health
```

**预期输出:**

```json
{ "status": "healthy" }
```

---

### 方案 2: 修复调试模式问题

**如果在 Cursor/VSCode 调试中:**

#### 情况 A: 调试器在断点处暂停

**现象:**

- 看到 Cursor 底部有调试控制栏
- 代码在某一行高亮暂停

**解决:**

1. 按 `F5` 继续执行
2. 或按 `Shift+F5` 停止调试
3. 删除所有断点
4. 按 `F5` 重新启动

#### 情况 B: 调试器启动失败

**现象:**

- 调试器显示错误
- 或一直卡在 "Starting..."

**解决:**

```bash
# 1. 在 Cursor 中停止调试 (Shift+F5)

# 2. 清理调试进程
pkill -f "debugpy"
pkill -f "run_api.py"

# 3. 检查端口
lsof -ti :5055 | xargs kill -9

# 4. 重新启动调试 (F5)
```

---

### 方案 3: 使用 make 命令

**最简单的方法:**

```bash
# 停止所有服务
make stop-all

# 等待 2 秒
sleep 2

# 启动所有服务
make start-all
```

这会启动：

- ✅ 数据库（如果使用本地 Docker）
- ✅ API 后端
- ✅ Worker
- ✅ 前端

---

### 方案 4: 检查 API_URL 配置

**前端连接不到 API 也可能是配置问题:**

#### 检查前端环境变量

```bash
# 查看前端配置
cat frontend/.env.local 2>/dev/null || echo "未找到 .env.local"
```

#### 正确的配置

**本地开发:**

```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5055
```

**远程服务器:**

```env
# 如果 API 在远程服务器
NEXT_PUBLIC_API_URL=http://your-server-ip:5055
```

#### 应用配置更改

```bash
cd frontend

# 重启前端
pkill -f "next dev"
npm run dev
```

---

## 🔍 详细故障排查

### 检查清单

- [ ] **API 进程是否运行?**

  ```bash
  pgrep -fl "run_api\|uvicorn"
  ```

- [ ] **端口 5055 是否监听?**

  ```bash
  lsof -i :5055
  ```

- [ ] **API 健康检查是否通过?**

  ```bash
  curl http://localhost:5055/health
  ```

- [ ] **前端配置是否正确?**

  ```bash
  cat frontend/.env.local
  ```

- [ ] **是否有防火墙阻止?**
  ```bash
  # macOS
  sudo pfctl -s all | grep 5055
  ```

---

## 🐛 特殊情况

### 情况 1: 端口被占用

**检查:**

```bash
lsof -i :5055
```

**解决:**

```bash
# 查看是什么占用
lsof -i :5055

# 如果是旧的 API 进程
pkill -f "run_api.py"

# 如果是其他进程
lsof -ti :5055 | xargs kill -9
```

### 情况 2: 数据库连接失败

**现象:** API 启动后立即崩溃

**检查日志:**

```bash
# 查看 API 日志
tail -f /tmp/api.log

# 或直接运行查看
uv run run_api.py
```

**常见错误:**

```
Failed to connect to database
SURREAL_URL is not set
```

**解决:**

```bash
# 检查 .env 配置
cat .env | grep SURREAL

# 确保配置正确
SURREAL_URL=ws://172.20.11.168:8001/rpc
SURREAL_USER=root
SURREAL_PASSWORD=Mind88**0
```

### 情况 3: 依赖问题

**现象:** API 启动报错 "No module named ..."

**解决:**

```bash
# 重新安装依赖
cd /Users/yuhucheng/ray/code/github/open-notebook
uv sync

# 或
uv pip install -r requirements.txt
```

---

## 🚀 快速启动脚本

创建一个快速修复脚本：

```bash
#!/bin/bash
# quick_fix_api.sh

echo "🔧 快速修复 API 连接..."

# 1. 停止所有相关进程
echo "1. 停止旧进程..."
pkill -f "run_api.py" 2>/dev/null
pkill -f "uvicorn" 2>/dev/null
pkill -f "debugpy.*run_api" 2>/dev/null

# 2. 清理端口
echo "2. 清理端口..."
lsof -ti :5055 | xargs kill -9 2>/dev/null

# 3. 等待
sleep 2

# 4. 启动 API
echo "3. 启动 API..."
cd /Users/yuhucheng/ray/code/github/open-notebook
uv run run_api.py > /tmp/api.log 2>&1 &

# 5. 等待启动
echo "4. 等待启动完成..."
for i in {1..10}; do
    sleep 1
    if curl -s http://localhost:5055/health > /dev/null 2>&1; then
        echo "✅ API 启动成功!"
        echo "访问: http://localhost:3000"
        exit 0
    fi
    echo "   等待中... ($i/10)"
done

echo "❌ API 启动失败，查看日志:"
echo "   tail -f /tmp/api.log"
exit 1
```

**使用:**

```bash
chmod +x quick_fix_api.sh
./quick_fix_api.sh
```

---

## 📊 完整的系统检查

```bash
#!/bin/bash
# system_check.sh

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Open Notebook 系统检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. 检查进程
echo ""
echo "1️⃣  进程状态:"
echo "API: $(pgrep -f 'run_api.py' > /dev/null && echo '✅ 运行中' || echo '❌ 未运行')"
echo "Worker: $(pgrep -f 'surreal-commands-worker' > /dev/null && echo '✅ 运行中' || echo '❌ 未运行')"
echo "前端: $(pgrep -f 'next dev' > /dev/null && echo '✅ 运行中' || echo '❌ 未运行')"

# 2. 检查端口
echo ""
echo "2️⃣  端口监听:"
echo "5055 (API): $(lsof -i :5055 > /dev/null 2>&1 && echo '✅ 监听中' || echo '❌ 未监听')"
echo "3000 (前端): $(lsof -i :3000 > /dev/null 2>&1 && echo '✅ 监听中' || echo '❌ 未监听')"

# 3. 健康检查
echo ""
echo "3️⃣  健康检查:"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5055/health 2>/dev/null)
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)

echo "API: $([ "$API_STATUS" = "200" ] && echo '✅ 正常' || echo "❌ 异常 ($API_STATUS)")"
echo "前端: $([ "$FRONTEND_STATUS" = "200" -o "$FRONTEND_STATUS" = "307" ] && echo '✅ 正常' || echo "❌ 异常 ($FRONTEND_STATUS)")"

# 4. 配置检查
echo ""
echo "4️⃣  配置检查:"
echo ".env 文件: $([ -f .env ] && echo '✅ 存在' || echo '❌ 缺失')"
echo "SURREAL_URL: $(grep SURREAL_URL .env 2>/dev/null | cut -d'=' -f2 || echo '❌ 未配置')"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

---

## 💡 预防措施

### 1. 使用系统服务管理

创建 systemd 服务（Linux）或 launchd（macOS）自动管理 API。

### 2. 使用进程管理器

```bash
# 安装 pm2
npm install -g pm2

# 启动 API
pm2 start "uv run run_api.py" --name open-notebook-api

# 查看状态
pm2 status

# 查看日志
pm2 logs open-notebook-api
```

### 3. 添加健康检查监控

```bash
# 添加到 crontab
*/5 * * * * curl -s http://localhost:5055/health || systemctl restart open-notebook-api
```

---

## 🆘 仍然无法解决？

### 收集诊断信息

```bash
# 运行完整检查
bash system_check.sh > diagnosis.txt

# 查看 API 日志
tail -100 /tmp/api.log >> diagnosis.txt

# 查看环境
env | grep -E "SURREAL|API" >> diagnosis.txt
```

### 获取帮助

- **Discord**: https://discord.gg/37XJPXfz2w
- **GitHub Issues**: https://github.com/lfnovo/open-notebook/issues
- **文档**: `DEBUG_GUIDE.md`

---

**最后更新**: 2025-11-04
