module.exports = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'server-control-panel-secret-key',
  database: {
    path: './data.db'
  },
  defaultAdmin: {
    username: 'admin',
    password: 'admin123'
  }
};
