import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true
})

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data?.error || error.message)
  }
)

// 认证API
export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  check: () => api.get('/auth/check'),
  changePassword: (oldPassword, newPassword) =>
    api.post('/auth/change-password', { oldPassword, newPassword }),
  changeUsername: (newUsername, password) =>
    api.post('/auth/change-username', { newUsername, password })
}

// 服务器API
export const serverApi = {
  getAll: () => api.get('/servers'),
  getById: (id) => api.get(`/servers/${id}`),
  getByIdFull: (id) => api.get(`/servers/${id}/full`),
  create: (data) => api.post('/servers', data),
  update: (id, data) => api.put(`/servers/${id}`, data),
  delete: (id) => api.delete(`/servers/${id}`),
  test: (id) => api.post(`/servers/${id}/test`),
  getStatus: (id) => api.get(`/servers/${id}/status`),
  ping: (id, target) => api.get(`/servers/${id}/ping`, { params: { target } }),
  detect: (id) => api.get(`/servers/${id}/detect`),
  detectAll: () => api.post('/servers/detect-all'),
  exportFull: () => api.get('/servers/export/full'),
  import: (servers) => api.post('/servers/import', { servers })
}

// 执行API
export const executeApi = {
  batch: (serverIds, command) => api.post('/execute', { serverIds, command }),
  single: (id, command) => api.post(`/execute/single/${id}`, { command }),
  getLogs: (limit) => api.get('/execute/logs', { params: { limit } }),
  getServerLogs: (id, limit) => api.get(`/execute/logs/${id}`, { params: { limit } })
}

// 文件API
export const fileApi = {
  list: (serverId, path) => api.get(`/files/list/${serverId}`, { params: { path } }),
  upload: (serverId, formData) => api.post(`/files/upload/${serverId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  downloadUrl: (serverId, path) => `/api/files/download/${serverId}?path=${encodeURIComponent(path)}`
}

// 模板API
export const templateApi = {
  getAll: () => api.get('/templates'),
  create: (name, command) => api.post('/templates', { name, command }),
  update: (id, name, command) => api.put(`/templates/${id}`, { name, command }),
  delete: (id) => api.delete(`/templates/${id}`),
  export: () => api.get('/templates/export'),
  import: (templates) => api.post('/templates/import', { templates })
}

export default api
