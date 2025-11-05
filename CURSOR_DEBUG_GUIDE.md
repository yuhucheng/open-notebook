# 🐛 Cursor 调试 API 快速指南

## 🎯 问题诊断

如果看到这些错误：

- ❌ `No module named surreal_commands.worker` → **选错了配置**
- ❌ `Address already in use` → **端口被占用，需要清理**

---

## ✅ 正确步骤（5 步）

### Step 1: 清理端口

```bash
./START_DEBUG.sh
```

### Step 2: 打开调试面板

- **快捷键**: `Cmd + Shift + D`
- **或**: 点击左侧 🐛 图标（第四个）

### Step 3: 选择正确的配置 ⭐ 关键！

在调试面板顶部的下拉菜单中：

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🚀 调试 API 后端        ✅ 选这个！   ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 🔧 调试 Worker          ❌ 不要选     ┃
┃ 🧪 运行单元测试         ❌ 不要选     ┃
┃ 🎯 调试当前 Python 文件 ❌ 不要选     ┃
┃ 🌐 调试全栈             ❌ 不要选     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**💡 记忆技巧**: 看到 **🚀 火箭图标** = API 后端 = 正确！

### Step 4: 启动调试

- **按 F5** 或点击绿色播放按钮 ▶️

### Step 5: 等待启动成功

在 **TERMINAL 标签** 中看到：

```
Starting Open Notebook API server on 127.0.0.1:5055
INFO: Application startup complete.  ✅ 成功！
```

---

## 🎮 调试快捷键

| 快捷键      | 功能                 |
| ----------- | -------------------- |
| `F5`        | 继续执行 / 开始调试  |
| `F10`       | 单步跳过 (Step Over) |
| `F11`       | 单步进入 (Step Into) |
| `Shift+F11` | 单步退出 (Step Out)  |
| `Shift+F5`  | 停止调试             |

---

## 🔧 设置断点

1. 打开任何 Python 文件（如 `api/routers/notebooks.py`）
2. 点击行号左侧，出现红色圆点 🔴
3. 访问对应的 API 接口，程序会在断点处暂停

---

## 🌐 测试 API

启动成功后：

- **API 文档**: http://localhost:5055/docs
- **健康检查**: http://localhost:5055/health
- **命令行测试**:
  ```bash
  curl http://localhost:5055/health
  ```

---

## ❓ 常见问题

### Q1: 仍然显示 "Address already in use"

```bash
# 重新运行清理脚本
./START_DEBUG.sh
```

### Q2: 看到 "No module named surreal_commands.worker"

**原因**: 选错了配置  
**解决**: 确保选择的是 **🚀 调试 API 后端**，不是 🔧 调试 Worker

### Q3: 找不到调试控制台

- 在底部面板找 **"DEBUG CONSOLE"** 或 **"TERMINAL"** 标签
- 或按 `Cmd + J` 打开底部面板

### Q4: 前端连不上 API

- 确保 API 调试已启动（端口 5055）
- 刷新浏览器页面

---

## 📋 配置文件说明

### `.vscode/launch.json` 中的配置：

| 配置名称                | 用途                       | 是否使用  |
| ----------------------- | -------------------------- | --------- |
| 🚀 调试 API 后端        | FastAPI 服务器 (端口 5055) | ✅ 使用   |
| 🔧 调试 Worker          | 后台任务处理器             | ❌ 不需要 |
| 🧪 运行单元测试         | 运行 pytest 测试           | ❌ 不需要 |
| 🎯 调试当前 Python 文件 | 调试单个文件               | ❌ 不需要 |
| 🌐 调试全栈             | API + Worker 同时运行      | ❌ 不需要 |

---

## 🎯 记忆要点

1. **清理端口**: `./START_DEBUG.sh`
2. **选配置**: 🚀 火箭图标 = API 后端
3. **启动**: `F5`
4. **断点**: 点击行号左侧
5. **测试**: http://localhost:5055/docs

---

## 📚 更多文档

- **完整调试教程**: `DEBUG_EXAMPLE.md`
- **快速参考**: `DEBUGGING_QUICKSTART.md`
- **详细指南**: `DEBUG_GUIDE.md`
- **API 连接问题**: `FIX_API_CONNECTION.md`

---

**🎉 现在您已经掌握了在 Cursor 中调试 API 的方法！**
