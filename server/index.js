const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const config = require('./config');
const db = require('./db');

// 初始化数据库
db.initDatabase();

// 创建Express应用
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 中间件
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true
  }
}));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../client/dist')));

// 加载路由
const authRoutes = require('./routes/auth');
const serversRoutes = require('./routes/servers');
const executeRoutes = require('./routes/execute');
const filesRoutes = require('./routes/files');
const templatesRoutes = require('./routes/templates');
const backupRoutes = require('./routes/backup');

// 认证检查中间件
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: '未登录' });
  }
}

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/servers', requireAuth, serversRoutes);
app.use('/api/execute', requireAuth, executeRoutes);
app.use('/api/files', requireAuth, filesRoutes);
app.use('/api/templates', requireAuth, templatesRoutes);
app.use('/api/backup', requireAuth, backupRoutes);

// SPA回退路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// WebSocket终端
io.on('connection', (socket) => {
  console.log('WebSocket连接:', socket.id);

  let sshConnection = null;
  let sshStream = null;

  // 创建终端
  socket.on('terminal:create', (data) => {
    const { serverId, cols = 80, rows = 24 } = data;
    const { Client } = require('ssh2');
    const ssh = require('./utils/ssh');

    try {
      const { config: sshConfig, server } = ssh.getServerConfig(serverId);
      sshConnection = new Client();

      sshConnection.on('ready', () => {
        sshConnection.shell({
          cols: cols,
          rows: rows,
          term: 'xterm-256color'
        }, (err, stream) => {
          if (err) {
            socket.emit('terminal:error', err.message);
            return;
          }

          sshStream = stream;

          stream.on('data', (data) => {
            socket.emit('terminal:data', data.toString());
          });

          stream.on('close', () => {
            socket.emit('terminal:close');
            sshConnection.end();
          });

          stream.stderr.on('data', (data) => {
            socket.emit('terminal:data', data.toString());
          });

          socket.emit('terminal:ready', { serverName: server.name });
        });
      });

      sshConnection.on('error', (err) => {
        socket.emit('terminal:error', err.message);
      });

      sshConnection.connect(sshConfig);
    } catch (err) {
      socket.emit('terminal:error', err.message);
    }
  });

  // 终端输入
  socket.on('terminal:input', (data) => {
    if (sshStream) {
      sshStream.write(data);
    }
  });

  // 终端大小调整
  socket.on('terminal:resize', (data) => {
    if (sshStream) {
      sshStream.setWindow(data.rows, data.cols);
    }
  });

  // 状态监控
  socket.on('monitor:start', async (data) => {
    const { serverId } = data;
    const ssh = require('./utils/ssh');

    const monitorInterval = setInterval(async () => {
      try {
        const status = await ssh.getSystemStatus(serverId);
        const ping = await ssh.pingServer(serverId);
        socket.emit('monitor:data', { ...status, ping: ping.latency });
      } catch (err) {
        socket.emit('monitor:error', err.message);
      }
    }, 3000);

    socket.on('monitor:stop', () => {
      clearInterval(monitorInterval);
    });

    socket.on('disconnect', () => {
      clearInterval(monitorInterval);
    });
  });

  // 断开连接
  socket.on('disconnect', () => {
    if (sshConnection) {
      sshConnection.end();
    }
  });
});

// 启动服务器
httpServer.listen(config.port, () => {
  console.log(`========================================`);
  console.log(`  群控系统已启动`);
  console.log(`  访问地址: http://localhost:${config.port}`);
  console.log(`  默认账户: admin / admin123`);
  console.log(`========================================`);
});
