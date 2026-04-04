const express = require('express');
const db = require('../db');
const router = express.Router();

// 获取所有模板
router.get('/', (req, res) => {
  try {
    const templates = db.template.getAll();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 添加模板
router.post('/', (req, res) => {
  try {
    const { name, command } = req.body;

    if (!name || !command) {
      return res.status(400).json({ error: '名称和命令不能为空' });
    }

    const result = db.template.create(name, command);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新模板
router.put('/:id', (req, res) => {
  try {
    const { name, command } = req.body;

    if (!name || !command) {
      return res.status(400).json({ error: '名称和命令不能为空' });
    }

    db.template.update(req.params.id, name, command);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除模板
router.delete('/:id', (req, res) => {
  try {
    db.template.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 导出模板配置
router.get('/export', (req, res) => {
  try {
    const templates = db.template.getAll();
    const config = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      templates: templates.map(t => ({
        name: t.name,
        command: t.command
      }))
    };
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 导入模板配置
router.post('/import', (req, res) => {
  try {
    const { templates } = req.body;

    if (!templates || !Array.isArray(templates)) {
      return res.status(400).json({ error: '无效的模板配置' });
    }

    // 清空现有模板
    const existingTemplates = db.template.getAll();
    existingTemplates.forEach(t => db.template.delete(t.id));

    // 导入新模板
    let count = 0;
    templates.forEach(template => {
      try {
        db.template.create(template.name, template.command);
        count++;
      } catch (e) {
        console.error('导入模板失败:', template.name, e.message);
      }
    });

    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
