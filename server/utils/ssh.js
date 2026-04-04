const { Client } = require('ssh2');
const db = require('../db');

// SSH连接池
const connections = new Map();

// 获取服务器配置
function getServerConfig(serverId) {
  const server = db.server.getById(serverId);
  if (!server) {
    throw new Error('服务器不存在');
  }

  const config = {
    host: server.host,
    port: server.port,
    username: server.username,
    readyTimeout: 10000
  };

  if (server.private_key) {
    config.privateKey = server.private_key;
  } else if (server.password) {
    config.password = server.password;
  }

  return { config, server };
}

// 测试连接
function testConnection(serverId) {
  return new Promise((resolve, reject) => {
    const { config, server } = getServerConfig(serverId);
    const conn = new Client();

    conn.on('ready', () => {
      conn.end();
      resolve({ success: true, message: `成功连接到 ${server.name}` });
    });

    conn.on('error', (err) => {
      reject(new Error(`连接失败: ${err.message}`));
    });

    conn.connect(config);
  });
}

// 执行单个命令
function executeCommand(serverId, command) {
  return new Promise((resolve, reject) => {
    const { config, server } = getServerConfig(serverId);
    const conn = new Client();

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        let output = '';
        let errorOutput = '';

        stream.on('close', (code, signal) => {
          conn.end();
          const status = code === 0 ? 'success' : 'error';

          // 保存日志
          db.log.create({
            server_id: serverId,
            server_name: server.name,
            command: command,
            output: output + errorOutput,
            status: status
          });

          resolve({
            serverId,
            serverName: server.name,
            output: output + errorOutput,
            exitCode: code,
            status
          });
        });

        stream.on('data', (data) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
      });
    });

    conn.on('error', (err) => {
      reject(new Error(`连接失败: ${err.message}`));
    });

    conn.connect(config);
  });
}

// 批量执行命令
async function executeBatch(serverIds, command) {
  const results = await Promise.allSettled(
    serverIds.map(id => executeCommand(id, command))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      const server = db.server.getById(serverIds[index]);
      return {
        serverId: serverIds[index],
        serverName: server ? server.name : 'Unknown',
        output: result.reason.message,
        exitCode: -1,
        status: 'error'
      };
    }
  });
}

// 获取连接 (用于终端)
function getConnection(serverId, callback) {
  const { config, server } = getServerConfig(serverId);
  const conn = new Client();

  conn.on('ready', () => {
    callback(null, conn, server);
  });

  conn.on('error', (err) => {
    callback(err);
  });

  conn.connect(config);
  return conn;
}

// 获取系统状态
function getSystemStatus(serverId) {
  return new Promise((resolve, reject) => {
    const command = `echo '{"cpu":"'"$(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1)"'","memory":"'"$(free -m | awk '/Mem/{printf("%.1f/%.1f", $3/1024, $2/1024)}")"'","disk":"'"$(df -h / | awk 'NR==2{print $3"/"$2}')"'","uptime":"'"$(uptime -p | sed 's/up //')"'"}'`;

    executeCommand(serverId, command)
      .then(result => {
        try {
          // 尝试解析JSON
          const jsonMatch = result.output.match(/\{[^}]+\}/);
          if (jsonMatch) {
            const status = JSON.parse(jsonMatch[0]);
            resolve(status);
          } else {
            resolve({ raw: result.output });
          }
        } catch (e) {
          resolve({ raw: result.output });
        }
      })
      .catch(reject);
  });
}

// 获取服务器完整信息（系统版本、硬件配置）
function getServerInfo(serverId) {
  return new Promise((resolve, reject) => {
    const { config, server } = getServerConfig(serverId);
    const conn = new Client();

    conn.on('ready', () => {
      // 使用特殊分隔符收集系统信息
      const cmd = `echo "<<<START>>>"; ` +
        `echo "<<<OS_NAME>>>"; cat /etc/os-release 2>/dev/null | grep "^NAME=" | cut -d= -f2 | tr -d '"' || echo "Unknown"; ` +
        `echo "<<<OS_VERSION>>>"; cat /etc/os-release 2>/dev/null | grep "^VERSION=" | cut -d= -f2 | tr -d '"' || echo ""; ` +
        `echo "<<<KERNEL>>>"; uname -r; ` +
        `echo "<<<CPU_CORES>>>"; nproc; ` +
        `echo "<<<CPU_MODEL>>>"; cat /proc/cpuinfo | grep "model name" | head -1 | cut -d: -f2 | xargs; ` +
        `echo "<<<MEMORY>>>"; free -h | grep "^Mem:" | awk '{print $2}'; ` +
        `echo "<<<DISK>>>"; df -h --total 2>/dev/null | grep "^total" | awk '{print $2}' || df -h / | tail -1 | awk '{print $2}'; ` +
        `echo "<<<HOSTNAME>>>"; hostname; ` +
        `echo "<<<END>>>"`;

      conn.exec(cmd, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        let output = '';
        stream.on('data', (data) => { output += data.toString(); });
        stream.stderr.on('data', (data) => { output += data.toString(); });

        stream.on('close', () => {
          conn.end();

          // 解析输出
          const info = {
            os_name: '',
            os_version: '',
            kernel: '',
            cpu_cores: 0,
            cpu_model: '',
            memory: '',
            disk: '',
            hostname: ''
          };

          try {
            const extractValue = (tag) => {
              const regex = new RegExp(`<<<${tag}>>>\\s*\\n?([^<]*)`, 's');
              const match = output.match(regex);
              return match ? match[1].trim() : '';
            };

            info.os_name = extractValue('OS_NAME') || 'Unknown';
            info.os_version = extractValue('OS_VERSION');
            info.kernel = extractValue('KERNEL');
            info.cpu_cores = parseInt(extractValue('CPU_CORES')) || 0;
            info.cpu_model = extractValue('CPU_MODEL');
            info.memory = extractValue('MEMORY');
            info.disk = extractValue('DISK');
            info.hostname = extractValue('HOSTNAME');
          } catch (e) {
            console.error('解析系统信息失败:', e);
          }

          resolve(info);
        });
      });
    });

    conn.on('error', (err) => {
      reject(new Error(`连接失败: ${err.message}`));
    });

    conn.connect(config);
  });
}

// Ping检测 (通过SSH执行ping)
function pingServer(serverId, target = '8.8.8.8') {
  return new Promise((resolve, reject) => {
    const command = `ping -c 1 -W 2 ${target} | grep 'time=' | awk -F'time=' '{print $2}' | cut -d' ' -f1`;

    executeCommand(serverId, command)
      .then(result => {
        const time = parseFloat(result.output.trim());
        if (!isNaN(time)) {
          resolve({ latency: time, unit: 'ms' });
        } else {
          resolve({ latency: -1, unit: 'ms' });
        }
      })
      .catch(() => {
        resolve({ latency: -1, unit: 'ms' });
      });
  });
}

// SFTP操作
function getSFTP(serverId, callback) {
  const { config, server } = getServerConfig(serverId);
  const conn = new Client();

  conn.on('ready', () => {
    conn.sftp((err, sftp) => {
      if (err) {
        conn.end();
        return callback(err);
      }
      callback(null, sftp, conn, server);
    });
  });

  conn.on('error', (err) => {
    callback(err);
  });

  conn.connect(config);
}

// 列出远程目录
function listRemoteDir(serverId, path = '.') {
  return new Promise((resolve, reject) => {
    getSFTP(serverId, (err, sftp, conn) => {
      if (err) return reject(err);

      sftp.readdir(path, (err, list) => {
        conn.end();
        if (err) return reject(err);

        const files = list.map(item => ({
          name: item.filename,
          type: item.attrs.isDirectory() ? 'directory' : 'file',
          size: item.attrs.size,
          modifyTime: new Date(item.attrs.mtime * 1000)
        }));

        resolve(files);
      });
    });
  });
}

// 上传文件
function uploadFile(serverId, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    getSFTP(serverId, (err, sftp, conn) => {
      if (err) return reject(err);

      sftp.fastPut(localPath, remotePath, (err) => {
        conn.end();
        if (err) return reject(err);
        resolve({ success: true, remotePath });
      });
    });
  });
}

// 下载文件
function downloadFile(serverId, remotePath, localPath) {
  return new Promise((resolve, reject) => {
    getSFTP(serverId, (err, sftp, conn) => {
      if (err) return reject(err);

      sftp.fastGet(remotePath, localPath, (err) => {
        conn.end();
        if (err) return reject(err);
        resolve({ success: true, localPath });
      });
    });
  });
}

module.exports = {
  testConnection,
  executeCommand,
  executeBatch,
  getConnection,
  getSystemStatus,
  pingServer,
  listRemoteDir,
  uploadFile,
  downloadFile,
  getServerConfig,
  getServerInfo
};
