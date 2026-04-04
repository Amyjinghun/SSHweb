const express = require('express');
const db = require('../db');
const router = express.Router();

// 导出备份
router.get('/export', (req, res) => {
  try {
    const servers = db.server.getAll();
    const templates = db.template.getAll();
    const logs = db.log.getAll(1000);

    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        servers: servers.map(s => ({
          ...s,
          password: s.password ? '******' : null,
          private_key: s.private_key ? '******' : null
        })),
        templates,
        logs
      }
    };

    res.json(backup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 导入备份
router.post('/import', (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !data.servers) {
      return res.status(400).json({ error: '无效的备份数据' });
    }

    // 清空现有数据
    const servers = db.server.getAll();
    servers.forEach(s => db.server.delete(s.id));

    const templates = db.template.getAll();
    templates.forEach(t => db.template.delete(t.id));

    // 导入服务器
    let importedServers = 0;
    data.servers.forEach(server => {
      try {
        db.server.create({
          name: server.name,
          host: server.host,
          port: server.port,
          username: server.username,
          password: server.password === '******' ? '' : server.password,
          private_key: server.private_key === '******' ? '' : server.private_key,
          group_name: server.group_name
        });
        importedServers++;
      } catch (e) {
        console.error('导入服务器失败:', server.name, e.message);
      }
    });

    // 导入模板
    let importedTemplates = 0;
    if (data.templates) {
      data.templates.forEach(template => {
        try {
          db.template.create(template.name, template.command);
          importedTemplates++;
        } catch (e) {
          console.error('导入模板失败:', template.name, e.message);
        }
      });
    }

    res.json({
      success: true,
      message: `导入完成: ${importedServers} 台服务器, ${importedTemplates} 个模板`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
