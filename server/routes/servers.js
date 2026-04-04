const express = require('express');
const db = require('../db');
const ssh = require('../utils/ssh');
const router = express.Router();

// 获取所有服务器
router.get('/', (req, res) => {
  try {
    const servers = db.server.getAll();
    // 隐藏敏感信息
    const safeServers = servers.map(s => ({
      ...s,
      password: s.password ? '******' : null,
      private_key: s.private_key ? '******' : null
    }));
    res.json(safeServers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取单个服务器（包含真实密码，用于密码切换)
router.get('/:id/full', (req, res) => {
  try {
    const server = db.server.getById(req.params.id);
    if (!server) {
      return res.status(404).json({ error: '服务器不存在' });
    }
    res.json(server);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 添加服务器
router.post('/', (req, res) => {
  try {
    const { name, host, port, username, password, private_key, group_name, cpu_cores, memory, disk, os_name, os_version, kernel } = req.body;

    if (!name || !host || !username) {
      return res.status(400).json({ error: '名称、主机和用户名不能为空' });
    }

    if (!password && !private_key) {
      return res.status(400).json({ error: '密码或私钥必须提供一个' });
    }

    const result = db.server.create({
      name, host, port: port || 22, username, password, private_key, group_name: group_name || 'default',
      cpu_cores, memory, disk, os_name, os_version, kernel
    });

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新服务器
router.put('/:id', (req, res) => {
  try {
    const { name, host, port, username, password, private_key, group_name, cpu_cores, memory, disk, os_name, os_version, kernel } = req.body;
    const serverId = req.params.id;

    const existingServer = db.server.getById(serverId);
    if (!existingServer) {
      return res.status(404).json({ error: '服务器不存在' });
    }

    // 如果密码是******、空字符串或未提供，保留原密码
    const finalPassword = (!password || password === '******') ? existingServer.password : password;
    const finalKey = (!private_key || private_key === '******') ? existingServer.private_key : private_key;

    db.server.update(serverId, {
      name, host, port, username,
      password: finalPassword,
      private_key: finalKey,
      group_name: group_name || 'default',
      cpu_cores: cpu_cores || null,
      memory: memory || '',
      disk: disk || '',
      os_name: os_name || null,
      os_version: os_version || null,
      kernel: kernel || null
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除服务器
router.delete('/:id', (req, res) => {
  try {
    db.server.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 导出服务器配置（包含真实密码）
router.get('/export/full', (req, res) => {
  try {
    const servers = db.server.getAll();
    const config = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      servers: servers.map(s => ({
        name: s.name,
        host: s.host,
        port: s.port,
        username: s.username,
        password: s.password || '',
        private_key: s.private_key || '',
        group_name: s.group_name || 'default',
        cpu_cores: s.cpu_cores || null,
        memory: s.memory || '',
        disk: s.disk || ''
      }))
    };
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 导入服务器配置
router.post('/import', (req, res) => {
  try {
    const { servers } = req.body;

    if (!servers || !Array.isArray(servers)) {
      return res.status(400).json({ error: '无效的服务器配置' });
    }

    // 清空现有服务器
    const existingServers = db.server.getAll();
    existingServers.forEach(s => db.server.delete(s.id));

    // 导入新服务器
    let count = 0;
    servers.forEach(server => {
      try {
        db.server.create({
          name: server.name,
          host: server.host,
          port: server.port || 22,
          username: server.username,
          password: server.password || '',
          private_key: server.private_key || '',
          group_name: server.group_name || 'default',
          cpu_cores: server.cpu_cores || null,
          memory: server.memory || '',
          disk: server.disk || ''
        });
        count++;
      } catch (e) {
        console.error('导入服务器失败:', server.name, e.message);
      }
    });

    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 测试连接
router.post('/:id/test', async (req, res) => {
  try {
    const result = await ssh.testConnection(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Ping测试
router.get('/:id/ping', async (req, res) => {
  try {
    const target = req.query.target || '8.8.8.8';
    const result = await ssh.pingServer(req.params.id, target);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 自动检测服务器信息
router.get('/:id/detect', async (req, res) => {
  try {
    const result = await ssh.getServerInfo(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
