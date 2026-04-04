const express = require('express');
const db = require('../db');
const ssh = require('../utils/ssh');
const router = express.Router();

// 批量执行命令
router.post('/', async (req, res) => {
  try {
    const { serverIds, command } = req.body;

    if (!serverIds || !Array.isArray(serverIds) || serverIds.length === 0) {
      return res.status(400).json({ error: '请选择至少一台服务器' });
    }

    if (!command) {
      return res.status(400).json({ error: '命令不能为空' });
    }

    const results = await ssh.executeBatch(serverIds, command);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 单服务器执行命令
router.post('/single/:id', async (req, res) => {
  try {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ error: '命令不能为空' });
    }

    const result = await ssh.executeCommand(req.params.id, command);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取执行日志
router.get('/logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = db.log.getAll(limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取单个服务器的执行日志
router.get('/logs/:serverId', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = db.log.getByServerId(req.params.serverId, limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
