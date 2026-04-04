const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const config = require('./config');
const path = require('path');

const db = new Database(path.join(__dirname, config.database.path));

// 初始化数据库表
function initDatabase() {
  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 服务器表
  db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER DEFAULT 22,
      username TEXT NOT NULL,
      password TEXT,
      private_key TEXT,
      group_name TEXT DEFAULT 'default',
      cpu_cores INTEGER,
      memory TEXT,
      disk TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 检查并添加新列（兼容旧数据库）
  try {
    db.exec(`ALTER TABLE servers ADD COLUMN cpu_cores INTEGER`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE servers ADD COLUMN memory TEXT`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE servers ADD COLUMN disk TEXT`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE servers ADD COLUMN os_name TEXT`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE servers ADD COLUMN os_version TEXT`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE servers ADD COLUMN kernel TEXT`);
  } catch (e) {}

  // 命令模板表
  db.exec(`
    CREATE TABLE IF NOT EXISTS command_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      command TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 执行日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS execution_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER,
      server_name TEXT,
      command TEXT,
      output TEXT,
      status TEXT,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建默认管理员账户
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get(config.defaultAdmin.username);
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync(config.defaultAdmin.password, 10);
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(
      config.defaultAdmin.username,
      hashedPassword
    );
    console.log('默认管理员账户已创建: admin / admin123');
  }
}

// 用户相关操作
const userMethods = {
  findByUsername: (username) => {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  },
  findById: (id) => {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },
  updatePassword: (id, hashedPassword) => {
    return db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id);
  },
  updateUsername: (id, username) => {
    return db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, id);
  }
};

// 服务器相关操作
const serverMethods = {
  getAll: () => {
    return db.prepare('SELECT * FROM servers ORDER BY created_at DESC').all();
  },
  getById: (id) => {
    return db.prepare('SELECT * FROM servers WHERE id = ?').get(id);
  },
  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO servers (name, host, port, username, password, private_key, group_name, cpu_cores, memory, disk, os_name, os_version, kernel)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      data.name, data.host, data.port || 22, data.username,
      data.password, data.private_key, data.group_name || 'default',
      data.cpu_cores || null, data.memory || null, data.disk || null,
      data.os_name || null, data.os_version || null, data.kernel || null
    );
  },
  update: (id, data) => {
    const stmt = db.prepare(`
      UPDATE servers SET name = ?, host = ?, port = ?, username = ?,
      password = ?, private_key = ?, group_name = ?, cpu_cores = ?, memory = ?, disk = ?, os_name = ?, os_version = ?, kernel = ? WHERE id = ?
    `);
    return stmt.run(
      data.name, data.host, data.port, data.username,
      data.password, data.private_key, data.group_name, data.cpu_cores, data.memory, data.disk,
      data.os_name || null, data.os_version || null, data.kernel || null, id
    );
  },
  delete: (id) => {
    return db.prepare('DELETE FROM servers WHERE id = ?').run(id);
  },
  getByGroup: (groupName) => {
    return db.prepare('SELECT * FROM servers WHERE group_name = ?').all(groupName);
  }
};

// 命令模板相关操作
const templateMethods = {
  getAll: () => {
    return db.prepare('SELECT * FROM command_templates ORDER BY created_at DESC').all();
  },
  getById: (id) => {
    return db.prepare('SELECT * FROM command_templates WHERE id = ?').get(id);
  },
  create: (name, command) => {
    return db.prepare('INSERT INTO command_templates (name, command) VALUES (?, ?)').run(name, command);
  },
  update: (id, name, command) => {
    return db.prepare('UPDATE command_templates SET name = ?, command = ? WHERE id = ?').run(name, command, id);
  },
  delete: (id) => {
    return db.prepare('DELETE FROM command_templates WHERE id = ?').run(id);
  }
};

// 执行日志相关操作
const logMethods = {
  create: (data) => {
    return db.prepare(`
      INSERT INTO execution_logs (server_id, server_name, command, output, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.server_id, data.server_name, data.command, data.output, data.status);
  },
  getAll: (limit = 100) => {
    return db.prepare('SELECT * FROM execution_logs ORDER BY executed_at DESC LIMIT ?').all(limit);
  },
  getByServerId: (serverId, limit = 50) => {
    return db.prepare('SELECT * FROM execution_logs WHERE server_id = ? ORDER BY executed_at DESC LIMIT ?').all(serverId, limit);
  }
};

module.exports = {
  initDatabase,
  user: userMethods,
  server: serverMethods,
  template: templateMethods,
  log: logMethods
};
