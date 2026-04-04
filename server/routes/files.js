const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ssh = require('../utils/ssh');
const router = express.Router();

// 配置文件上传
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Buffer.from(file.originalname, 'latin1').toString('utf8'));
  }
});

const upload = multer({ storage });

// 列出远程目录
router.get('/list/:serverId', async (req, res) => {
  try {
    const remotePath = req.query.path || '/';
    console.log(`列出目录: serverId=${req.params.serverId}, path=${remotePath}`);
    const files = await ssh.listRemoteDir(req.params.serverId, remotePath);
    res.json(files || []);
  } catch (err) {
    console.error('列出目录失败:', err);
    res.status(400).json({ error: err.message });
  }
});

// 上传文件
router.post('/upload/:serverId', upload.single('file'), async (req, res) => {
  try {
    console.log('上传请求:', {
      serverId: req.params.serverId,
      file: req.file ? req.file.originalname : 'no file',
      remotePath: req.body.remotePath
    });

    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' });
    }

    const remotePath = req.body.remotePath || `/tmp/${req.file.originalname}`;

    await ssh.uploadFile(req.params.serverId, req.file.path, remotePath);

    // 删除临时文件
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      console.error('删除临时文件失败:', e.message);
    }

    console.log('上传成功:', remotePath);
    res.json({ success: true, remotePath });
  } catch (err) {
    console.error('上传失败:', err);
    // 删除临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    res.status(500).json({ error: err.message });
  }
});

// 下载文件
router.get('/download/:serverId', async (req, res) => {
  try {
    const remotePath = req.query.path;
    console.log(`下载文件: serverId=${req.params.serverId}, path=${remotePath}`);

    if (!remotePath) {
      return res.status(400).json({ error: '请指定文件路径' });
    }

    const fileName = path.basename(remotePath);
    const localPath = path.join(uploadDir, `download-${Date.now()}-${fileName}`);

    await ssh.downloadFile(req.params.serverId, remotePath, localPath);

    // 检查文件是否下载成功
    if (!fs.existsSync(localPath)) {
      return res.status(500).json({ error: '文件下载失败' });
    }

    res.download(localPath, fileName, (err) => {
      // 下载完成后删除临时文件
      try {
        fs.unlinkSync(localPath);
      } catch (e) {
        console.error('删除临时文件失败:', e.message);
      }
      if (err) {
        console.error('下载错误:', err);
      }
    });
  } catch (err) {
    console.error('下载失败:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
