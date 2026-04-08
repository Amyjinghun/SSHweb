# Linux服务器群控系统

一个基于Web的Linux服务器群控系统，支持批量SSH连接和命令执行。

## 功能特性

- ✅ 用户认证 - 登录/登出/修改密码/修改用户名
- ✅ 服务器管理 - 添加/编辑/删除SSH连接信息
- ✅ 配置导入导出 - 服务器配置备份与恢复
- ✅ 批量控制 - 多选/全选，批量执行命令
- ✅ Web终端 - 单服务器交互式终端 (xterm.js)
- ✅ 文件传输 - 上传/下载文件
- ✅ 系统检测 - 一键获取所有服务器系统与硬件配置
- ✅ 命令模板 - 保存常用命令，支持导入导出
- ✅ Ping检测 - 实时延迟显示

## 技术栈

- **后端**: Node.js + Express + Socket.io
- **前端**: Vue 3 + Element Plus + xterm.js
- **数据库**: SQLite3
- **SSH**: ssh2

---

## Docker 部署 (推荐)

### 方式一：Docker Compose (推荐)

**1. 克隆项目**
```bash
git clone <repository-url>
cd SSHweb-main
```

**2. 一键启动**
```bash
docker compose up -d
```

**3. 访问系统**
```
http://localhost:3000
```

**4. 查看日志**
```bash
# 查看运行日志
docker compose logs -f

# 查看最近100行日志
docker compose logs --tail=100
```

**5. 停止服务**
```bash
docker compose down
```

**6. 重新构建并启动**
```bash
# 代码更新后重新构建
docker compose up -d --build
```

---

### 方式二：Docker 命令

**1. 构建镜像**
```bash
docker build -t linux-control-panel .
```

**2. 运行容器**
```bash
docker run -d \
  --name linux-control \
  -p 3000:3000 \
  -v $(pwd)/data:/app/server/data \
  linux-control-panel
```

**Windows PowerShell:**
```powershell
docker run -d `
  --name linux-control `
  -p 3000:3000 `
  -v ${PWD}/data:/app/server/data `
  linux-control-panel
```

---

### Docker 配置说明

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 端口 | 3000 | Web服务端口 |
| 数据目录 | ./data | SQLite数据库存储目录 |

**端口修改** (docker-compose.yml):
```yaml
ports:
  - "8080:3000"  # 将外部端口改为8080
```

**数据持久化**:
```yaml
volumes:
  - ./data:/app/server/data  # 数据库文件
```

---

### Docker 常见问题

**Q: 容器启动后无法访问?**
```bash
# 检查容器状态
docker compose ps

# 检查端口占用
netstat -tlnp | grep 3000

# 查看错误日志
docker compose logs
```

**Q: 如何备份数据?**
```bash
# 备份数据目录
cp -r ./data ./data-backup-$(date +%Y%m%d)

# 或导出整个数据卷
docker run --rm -v sshweb-main_data:/data -v $(pwd):/backup alpine tar czf /backup/data-backup.tar.gz /data
```

**Q: 如何更新版本?**
```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker compose up -d --build
```

**Q: 如何重置密码?**
```bash
# 停止服务
docker compose down

# 删除数据库（会丢失所有数据！）
rm -rf ./data/control.db

# 重新启动（会创建新的默认账户）
docker compose up -d
```

---

## 其他部署方式

### 方式一：直接运行脚本

**Windows:**
```bash
# 双击运行 start.bat
# 或在命令行执行:
start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

### 方式二：手动安装

**1. 安装后端依赖**
```bash
cd server
npm install
```

**2. 安装前端依赖并构建**
```bash
cd client
npm install
npm run build
```

**3. 启动服务器**
```bash
cd server
node index.js
```

**4. 访问系统**
```
http://localhost:3000
```

---

## 默认账户

| 项目 | 值 |
|------|-----|
| 用户名 | `admin` |
| 密码 | `admin123` |

> ⚠️ **请登录后立即修改密码！**

---

## 开发模式

如需开发调试，可以分别启动前后端：

```bash
# 终端1 - 启动后端
cd server
npm install
node index.js

# 终端2 - 启动前端开发服务器
cd client
npm install
npm run dev
```

然后访问 http://localhost:5173

---

## 项目结构

```
SSHweb-main/
├── server/                 # 后端代码
│   ├── index.js           # 入口文件
│   ├── config.js          # 配置
│   ├── db.js              # 数据库操作
│   ├── routes/            # API路由
│   │   ├── auth.js        # 认证API
│   │   ├── servers.js     # 服务器管理API
│   │   ├── execute.js     # 命令执行API
│   │   ├── files.js       # 文件传输API
│   │   └── templates.js   # 命令模板API
│   └── utils/
│       └── ssh.js         # SSH连接工具
├── client/                 # 前端代码
│   ├── src/
│   │   ├── views/         # 页面组件
│   │   └── api/           # API调用
│   └── package.json
├── Dockerfile              # Docker镜像构建文件
├── docker-compose.yml      # Docker Compose配置
├── start.bat               # Windows启动脚本
├── start.sh                # Linux/Mac启动脚本
└── README.md
```

---

## 安全建议

1. ✅ 修改默认管理员密码
2. ✅ 修改 `server/config.js` 中的 `sessionSecret`
3. ✅ 使用HTTPS部署 (可配合Nginx反向代理)
4. ✅ 配置防火墙规则限制访问
5. ✅ 定期备份数据库文件

---

## License

MIT
