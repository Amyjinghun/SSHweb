# Linux服务器群控系统

一个基于Web的Linux服务器群控系统，支持批量SSH连接和命令执行。

## 功能特性

- ✅ 用户认证 - 登录/登出/修改密码
- ✅ 服务器管理 - 添加/编辑/删除SSH连接信息
- ✅ 批量控制 - 多选/全选，批量执行命令
- ✅ Web终端 - 单服务器交互式终端 (xterm.js)
- ✅ 文件传输 - 上传/下载文件
- ✅ 状态监控 - CPU/内存/磁盘实时监控
- ✅ 命令模板 - 保存常用命令
- ✅ Ping检测 - 实时延迟显示

## 技术栈

- **后端**: Node.js + Express + Socket.io
- **前端**: Vue 3 + Element Plus + xterm.js
- **数据库**: SQLite3
- **SSH**: ssh2

## 快速开始

### 方式一：直接运行

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

1. 安装后端依赖
```bash
cd server
npm install
```

2. 安装前端依赖并构建
```bash
cd client
npm install
npm run build
```

3. 启动服务器
```bash
cd server
node index.js
```

4. 访问 http://localhost:3000

### 方式三：Docker部署

```bash
# 构建镜像
docker build -t server-control-panel .

# 运行容器
docker run -d -p 3000:3000 -v ./data:/app/server/data server-control-panel
```

或使用docker-compose:
```bash
docker-compose up -d
```

## 默认账户

- 用户名: `admin`
- 密码: `admin123`

**请登录后立即修改密码！**

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

## 项目结构

```
群控面板/
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
├── Dockerfile
├── docker-compose.yml
├── start.bat              # Windows启动脚本
├── start.sh               # Linux/Mac启动脚本
└── README.md
```

## 安全建议

1. 修改默认管理员密码
2. 修改 `server/config.js` 中的 `sessionSecret`
3. 使用HTTPS部署
4. 配置防火墙规则限制访问

## License

MIT
