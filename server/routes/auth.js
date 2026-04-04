const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const router = express.Router();

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const user = db.user.findByUsername(username);
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const isValid = bcrypt.compareSync(password, user.password);
  if (!isValid) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  req.session.userId = user.id;
  req.session.username = user.username;

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username
    }
  });
});

// 登出
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: '登出失败' });
    }
    res.json({ success: true });
  });
});

// 检查登录状态
router.get('/check', (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        username: req.session.username
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// 修改密码
router.post('/change-password', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: '未登录' });
  }

  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '旧密码和新密码不能为空' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码长度至少6位' });
  }

  const user = db.user.findById(req.session.userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const isValid = bcrypt.compareSync(oldPassword, user.password);
  if (!isValid) {
    return res.status(400).json({ error: '旧密码错误' });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  db.user.updatePassword(user.id, hashedPassword);

  res.json({ success: true, message: '密码修改成功' });
});

// 修改用户名
router.post('/change-username', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: '未登录' });
  }

  const { newUsername, password } = req.body;

  if (!newUsername || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  if (newUsername.length < 3) {
    return res.status(400).json({ error: '用户名长度至少3位' });
  }

  const user = db.user.findById(req.session.userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const isValid = bcrypt.compareSync(password, user.password);
  if (!isValid) {
    return res.status(400).json({ error: '密码错误' });
  }

  // 检查用户名是否已存在
  const existingUser = db.user.findByUsername(newUsername);
  if (existingUser && existingUser.id !== user.id) {
    return res.status(400).json({ error: '用户名已存在' });
  }

  db.user.updateUsername(user.id, newUsername);
  req.session.username = newUsername;

  res.json({ success: true, message: '用户名修改成功', username: newUsername });
});

module.exports = router;
