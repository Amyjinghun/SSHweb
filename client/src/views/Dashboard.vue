<template>
  <el-container class="dashboard-container">
    <!-- 侧边栏 -->
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <el-icon size="24"><Monitor /></el-icon>
        <span>群控系统</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/">
          <el-icon><Odometer /></el-icon>
          <span>控制台</span>
        </el-menu-item>
        <el-menu-item index="/servers">
          <el-icon><Server /></el-icon>
          <span>服务器管理</span>
        </el-menu-item>
        <el-menu-item index="/templates">
          <el-icon><Document /></el-icon>
          <span>命令模板</span>
        </el-menu-item>
      </el-menu>

      <div class="user-info">
        <el-dropdown>
          <span class="user-dropdown">
            <el-icon><User /></el-icon>
            {{ username }}
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="showAccountDialog = true">
                <el-icon><UserFilled /></el-icon>账户设置
              </el-dropdown-item>
              <el-dropdown-item divided @click="handleLogout">
                <el-icon><SwitchButton /></el-icon>退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <el-header class="header">
        <h3>批量控制台</h3>
        <div class="header-actions">
          <el-button @click="showImportDialog = true">
            <el-icon><Upload /></el-icon> 导入配置
          </el-button>
          <el-button @click="exportServerConfig">
            <el-icon><Download /></el-icon> 导出配置
          </el-button>
          <el-button type="primary" @click="refreshServers" :loading="loading">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>
      </el-header>

      <el-main class="main">
        <!-- 服务器列表 - 按分组显示 -->
        <el-card class="server-card">
          <template #header>
            <div class="card-header">
              <span>服务器列表 ({{ selectedServers.length }}/{{ servers.length }} 已选)</span>
              <div>
                <el-button size="small" @click="selectAll">全选</el-button>
                <el-button size="small" @click="clearSelection">取消选择</el-button>
                <el-button size="small" type="primary" @click="testSelectedConnections" :loading="testing">
                  测试连接
                </el-button>
              </div>
            </div>
          </template>

          <div v-for="group in groupedServers" :key="group.name" class="server-group">
            <div class="group-header" @click="toggleGroup(group.name)">
              <div class="group-name">
                <el-icon class="collapse-icon" :class="{ collapsed: !expandedGroups[group.name] }">
                  <ArrowRight />
                </el-icon>
                <el-icon><Folder /></el-icon>
                {{ group.name }}
              </div>
              <span class="group-count">{{ group.servers.length }} 台</span>
              <el-button size="small" @click.stop="selectGroupServers(group.name, group.servers)">选中此组</el-button>
            </div>

            <el-table
              v-show="expandedGroups[group.name]"
              :ref="el => setTableRef(group.name, el)"
              :data="group.servers"
              @selection-change="(selection) => handleGroupSelectionChange(group.name, selection)"
              v-loading="loading"
              stripe
              :row-class-name="getRowClassName"
              row-key="id"
            >
              <el-table-column type="selection" width="50" reserve-selection />
              <el-table-column label="状态" width="80">
                <template #default="{ row }">
                  <el-tooltip :content="serverStatus[row.id]?.message || '检测中...'" placement="top">
                    <div class="status-indicator">
                      <el-icon v-if="serverStatus[row.id]?.status === 'online'" color="#67C23A" size="16">
                        <SuccessFilled />
                      </el-icon>
                      <el-icon v-else-if="serverStatus[row.id]?.status === 'offline'" color="#F56C6C" size="16">
                        <CircleCloseFilled />
                      </el-icon>
                      <el-icon v-else class="is-loading" color="#909399" size="16">
                        <Loading />
                      </el-icon>
                    </div>
                  </el-tooltip>
                </template>
              </el-table-column>
              <el-table-column prop="name" label="名称" width="130">
                <template #default="{ row }">
                  <el-link type="primary" @click="openTerminal(row.id)">{{ row.name }}</el-link>
                </template>
              </el-table-column>
              <el-table-column prop="host" label="主机" width="130" />
              <el-table-column label="系统" width="180">
                <template #default="{ row }">
                  <div class="os-info" v-if="row.os_name || row.kernel">
                    <div class="os-name" v-if="row.os_name">
                      <el-icon><Monitor /></el-icon> {{ row.os_name }} {{ row.os_version }}
                    </div>
                    <div class="os-kernel" v-if="row.kernel">
                      <el-icon><Cpu /></el-icon> {{ row.kernel }}
                    </div>
                  </div>
                  <span v-else class="config-empty">未检测</span>
                </template>
              </el-table-column>
              <el-table-column label="配置" width="220">
                <template #default="{ row }">
                  <el-tooltip v-if="row.cpu_cores || row.memory || row.disk" placement="top" :show-after="500">
                    <template #content>
                      <div>CPU: {{ row.cpu_cores || '-' }} 核</div>
                      <div>内存: {{ row.memory || '-' }}</div>
                      <div>硬盘: {{ row.disk || '-' }}</div>
                    </template>
                    <div class="server-config">
                      <span v-if="row.cpu_cores" class="config-item cpu"><el-icon><Cpu /></el-icon>{{ row.cpu_cores }}核</span>
                      <span v-if="row.memory" class="config-item mem"><el-icon><Coin /></el-icon>{{ row.memory }}</span>
                      <span v-if="row.disk" class="config-item disk"><el-icon><FolderOpened /></el-icon>{{ row.disk }}</span>
                    </div>
                  </el-tooltip>
                  <span v-else class="config-empty">未配置</span>
                </template>
              </el-table-column>
              <el-table-column label="延迟" width="80">
                <template #default="{ row }">
                  <el-tag v-if="pingResults[row.id] !== undefined && pingResults[row.id] >= 0"
                    :type="pingResults[row.id] < 100 ? 'success' : pingResults[row.id] < 300 ? 'warning' : 'danger'"
                    size="small">
                    {{ pingResults[row.id] }}ms
                  </el-tag>
                  <el-tag v-else type="info" size="small">-</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200">
                <template #default="{ row }">
                  <el-button-group>
                    <el-button size="small" @click="openTerminal(row.id)" title="终端">
                      <el-icon><Monitor /></el-icon>
                    </el-button>
                    <el-button size="small" @click="openFiles(row.id)" title="文件">
                      <el-icon><Folder /></el-icon>
                    </el-button>
                  </el-button-group>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <el-empty v-if="servers.length === 0" description="暂无服务器，请先添加" />
        </el-card>

        <!-- 命令执行区 -->
        <el-card class="command-card">
          <template #header>
            <div class="card-header">
              <span>批量命令执行</span>
              <el-select v-model="selectedTemplate" placeholder="选择模板" size="small" style="width: 200px" @change="applyTemplate" clearable>
                <el-option
                  v-for="t in templates"
                  :key="t.id"
                  :label="t.name"
                  :value="t.id"
                />
              </el-select>
            </div>
          </template>

          <el-input
            v-model="command"
            type="textarea"
            :rows="3"
            placeholder="输入要执行的命令... (Ctrl+Enter 执行)"
            @keydown.ctrl.enter="executeCommand"
          />

          <div class="command-actions">
            <el-button type="primary" :disabled="!command || selectedServers.length === 0"
              :loading="executing" @click="executeCommand">
              <el-icon><Position /></el-icon>
              执行到 {{ selectedServers.length }} 台服务器
            </el-button>
            <el-button @click="clearOutput">清空输出</el-button>
          </div>
        </el-card>

        <!-- 执行结果 - 实时状态 -->
        <el-card class="result-card" v-if="executionResults.length > 0">
          <template #header>
            <div class="card-header">
              <span>执行结果</span>
              <el-tag :type="allCompleted ? 'success' : 'warning'">
                {{ completedCount }}/{{ executionResults.length }} 完成
              </el-tag>
            </div>
          </template>

          <div class="execution-status">
            <div v-for="result in executionResults" :key="result.serverId" class="status-item">
              <div class="status-header">
                <el-icon v-if="result.status === 'running'" class="is-loading" color="#409EFF"><Loading /></el-icon>
                <el-icon v-else-if="result.status === 'success'" color="#67C23A"><SuccessFilled /></el-icon>
                <el-icon v-else-if="result.status === 'error'" color="#F56C6C"><CircleCloseFilled /></el-icon>
                <el-icon v-else color="#909399"><WarningFilled /></el-icon>
                <span class="server-name">{{ result.serverName }}</span>
                <el-tag v-if="result.status === 'running'" type="warning" size="small">执行中...</el-tag>
                <el-tag v-else-if="result.status === 'success'" type="success" size="small">成功</el-tag>
                <el-tag v-else-if="result.status === 'error'" type="danger" size="small">失败</el-tag>
                <span v-if="result.exitCode !== undefined" class="exit-code">退出码: {{ result.exitCode }}</span>
              </div>
              <pre class="status-output" v-if="result.output">{{ result.output }}</pre>
            </div>
          </div>
        </el-card>

        <!-- 账户设置对话框 -->
        <el-dialog v-model="showAccountDialog" title="账户设置" width="450px">
          <el-tabs>
            <el-tab-pane label="修改密码">
              <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="80px">
                <el-form-item label="旧密码" prop="oldPassword">
                  <el-input v-model="passwordForm.oldPassword" type="password" show-password />
                </el-form-item>
                <el-form-item label="新密码" prop="newPassword">
                  <el-input v-model="passwordForm.newPassword" type="password" show-password />
                </el-form-item>
                <el-form-item label="确认密码" prop="confirmPassword">
                  <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
                </el-form-item>
              </el-form>
              <el-button type="primary" :loading="passwordLoading" @click="handleChangePassword">修改密码</el-button>
            </el-tab-pane>
            <el-tab-pane label="修改用户名">
              <el-form :model="usernameForm" :rules="usernameRules" ref="usernameFormRef" label-width="80px">
                <el-form-item label="新用户名" prop="newUsername">
                  <el-input v-model="usernameForm.newUsername" placeholder="请输入新用户名" />
                </el-form-item>
                <el-form-item label="确认密码" prop="password">
                  <el-input v-model="usernameForm.password" type="password" show-password placeholder="请输入密码确认" />
                </el-form-item>
              </el-form>
              <el-button type="primary" :loading="usernameLoading" @click="handleChangeUsername">修改用户名</el-button>
            </el-tab-pane>
          </el-tabs>
        </el-dialog>

        <!-- 导入配置对话框 -->
        <el-dialog v-model="showImportDialog" title="导入服务器配置" width="500px">
          <el-alert type="warning" :closable="false" style="margin-bottom: 20px">
            导入将覆盖现有服务器配置，请谨慎操作
          </el-alert>
          <el-upload
            drag
            :show-file-list="true"
            :auto-upload="false"
            :on-change="handleImportFile"
            accept=".json"
            :limit="1"
          >
            <el-icon class="el-icon--upload" size="60"><Upload /></el-icon>
            <div class="el-upload__text">
              拖拽文件到此处或 <em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">只能上传 JSON 格式的配置文件</div>
            </template>
          </el-upload>
          <template #footer>
            <el-button @click="showImportDialog = false">取消</el-button>
            <el-button type="primary" :loading="importing" @click="confirmImport" :disabled="!importFile">
              确认导入
            </el-button>
          </template>
        </el-dialog>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { authApi, serverApi, executeApi, templateApi } from '../api'

const router = useRouter()
const tableRefs = reactive({})
const expandedGroups = reactive({})
const activeMenu = '/'
const loading = ref(false)
const executing = ref(false)
const testing = ref(false)
const servers = ref([])
const templates = ref([])
const selectedServers = ref([])
const command = ref('')
const executionResults = ref([])
const selectedTemplate = ref('')
const pingResults = ref({})
const serverStatus = ref({})
const showAccountDialog = ref(false)
const showImportDialog = ref(false)
const passwordLoading = ref(false)
const usernameLoading = ref(false)
const importing = ref(false)
const importFile = ref(null)
const passwordFormRef = ref(null)
const usernameFormRef = ref(null)

let statusInterval = null
let pingInterval = null

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const usernameForm = reactive({
  newUsername: '',
  password: ''
})

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const usernameRules = {
  newUsername: [
    { required: true, message: '请输入新用户名', trigger: 'blur' },
    { min: 3, message: '用户名长度至少3位', trigger: 'blur' }
  ],
  password: [{ required: true, message: '请输入密码确认', trigger: 'blur' }]
}

const username = computed(() => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  return user.username || 'User'
})

// 按分组排列服务器
const groupedServers = computed(() => {
  const groups = {}
  servers.value.forEach(server => {
    const groupName = server.group_name || 'default'
    if (!groups[groupName]) {
      groups[groupName] = []
    }
    groups[groupName].push(server)
  })

  const result = Object.keys(groups).map(name => ({
    name,
    servers: groups[name]
  }))

  // 初始化展开状态（默认全部展开）
  result.forEach(group => {
    if (expandedGroups[group.name] === undefined) {
      expandedGroups[group.name] = true
    }
  })

  return result
})

// 切换分组展开/折叠
const toggleGroup = (groupName) => {
  expandedGroups[groupName] = !expandedGroups[groupName]
}

// 执行完成数量
const completedCount = computed(() => {
  return executionResults.value.filter(r => r.status !== 'pending' && r.status !== 'running').length
})

const allCompleted = computed(() => {
  return executionResults.value.length > 0 && completedCount.value === executionResults.value.length
})

const getRowClassName = ({ row }) => {
  const status = serverStatus.value[row.id]?.status
  if (status === 'offline') return 'offline-row'
  return ''
}

const loadServers = async () => {
  loading.value = true
  try {
    servers.value = await serverApi.getAll()
    // 立即检测所有服务器状态
    servers.value.forEach(s => {
      checkServerStatus(s.id)
      pingServer(s.id)
    })
  } catch (error) {
    ElMessage.error(error || '加载服务器失败')
  } finally {
    loading.value = false
  }
}

const loadTemplates = async () => {
  try {
    templates.value = await templateApi.getAll()
  } catch (error) {
    console.error('加载模板失败:', error)
  }
}

const pingServer = async (serverId) => {
  try {
    const result = await serverApi.ping(serverId)
    pingResults.value[serverId] = result.latency
    if (result.latency >= 0) {
      serverStatus.value[serverId] = { status: 'online', message: '在线' }
    } else {
      serverStatus.value[serverId] = { status: 'offline', message: '无法连接' }
    }
  } catch {
    pingResults.value[serverId] = -1
    serverStatus.value[serverId] = { status: 'offline', message: '连接失败' }
  }
}

const checkServerStatus = async (serverId) => {
  try {
    await serverApi.test(serverId)
    serverStatus.value[serverId] = { status: 'online', message: '连接正常' }
  } catch (error) {
    serverStatus.value[serverId] = { status: 'offline', message: error || '连接失败' }
  }
}

const refreshServers = () => {
  loadServers()
}

// 设置表格引用
const setTableRef = (groupName, el) => {
  if (el) {
    tableRefs[groupName] = el
  }
}

// 处理分组选择变化
const handleGroupSelectionChange = (groupName, selection) => {
  // 先移除该分组的所有服务器
  const otherGroupIds = new Set(
    servers.value
      .filter(s => {
        const group = groupedServers.value.find(g => g.servers.some(gs => gs.id === s.id))
        return group && group.name !== groupName
      })
      .map(s => s.id)
  )

  // 保留其他分组的选择，加上当前分组的新选择
  selectedServers.value = selectedServers.value.filter(s => otherGroupIds.has(s.id))
  selection.forEach(s => {
    if (!selectedServers.value.find(ss => ss.id === s.id)) {
      selectedServers.value.push(s)
    }
  })
}

const selectAll = () => {
  selectedServers.value = [...servers.value]
  // 通知所有表格更新选择状态
  Object.values(tableRefs).forEach(table => {
    table?.toggleAllSelection()
  })
}

const selectGroupServers = (groupName, groupServers) => {
  // 添加该分组所有服务器到已选列表
  groupServers.forEach(server => {
    if (!selectedServers.value.find(s => s.id === server.id)) {
      selectedServers.value.push(server)
    }
  })
  // 获取表格引用并全选
  const table = tableRefs[groupName]
  if (table) {
    // 使用 setTimeout 确保表格已完全渲染
    setTimeout(() => {
      // 遍历所有行并选中
      groupServers.forEach(row => {
        table.toggleRowSelection(row, true)
      })
    }, 50)
  }
  ElMessage.success(`已选中 ${groupServers.length} 台服务器`)
}

const clearSelection = () => {
  selectedServers.value = []
  // 清除所有表格的选择
  Object.values(tableRefs).forEach(table => {
    table?.clearSelection()
  })
}

const testSelectedConnections = async () => {
  if (selectedServers.value.length === 0) {
    ElMessage.warning('请先选择服务器')
    return
  }

  testing.value = true
  for (const server of selectedServers.value) {
    try {
      await serverApi.test(server.id)
      serverStatus.value[server.id] = { status: 'online', message: '连接成功' }
      ElMessage.success(`${server.name} 连接成功`)
    } catch (error) {
      serverStatus.value[server.id] = { status: 'offline', message: error }
      ElMessage.error(`${server.name}: ${error}`)
    }
  }
  testing.value = false
}

const executeCommand = async () => {
  if (!command.value) {
    ElMessage.warning('请输入命令')
    return
  }

  if (selectedServers.value.length === 0) {
    ElMessage.warning('请选择至少一台服务器')
    return
  }

  executing.value = true
  executionResults.value = selectedServers.value.map(s => ({
    serverId: s.id,
    serverName: s.name,
    status: 'pending',
    output: ''
  }))

  try {
    const serverIds = selectedServers.value.map(s => s.id)
    const res = await executeApi.batch(serverIds, command.value)

    // 更新结果
    res.results.forEach(result => {
      const idx = executionResults.value.findIndex(r => r.serverId === result.serverId)
      if (idx >= 0) {
        executionResults.value[idx] = {
          ...executionResults.value[idx],
          status: result.status,
          output: result.output,
          exitCode: result.exitCode
        }
      }
    })

    ElMessage.success(`命令执行完成: ${res.results.filter(r => r.status === 'success').length}/${res.results.length} 成功`)
  } catch (error) {
    ElMessage.error(error || '命令执行失败')
    executionResults.value.forEach(r => {
      r.status = 'error'
      r.output = error
    })
  } finally {
    executing.value = false
  }
}

const clearOutput = () => {
  executionResults.value = []
}

const applyTemplate = () => {
  if (!selectedTemplate.value) return
  const template = templates.value.find(t => t.id === selectedTemplate.value)
  if (template) {
    command.value = template.command
  }
}

const openTerminal = (id) => {
  window.open(`/terminal/${id}`, '_blank')
}

const openFiles = (id) => {
  window.open(`/files/${id}`, '_blank')
}

const handleChangePassword = async () => {
  try {
    await passwordFormRef.value.validate()
    passwordLoading.value = true

    await authApi.changePassword(passwordForm.oldPassword, passwordForm.newPassword)
    ElMessage.success('密码修改成功，请重新登录')
    showAccountDialog.value = false
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''

    setTimeout(() => {
      handleLogout()
    }, 1500)
  } catch (error) {
    ElMessage.error(error || '密码修改失败')
  } finally {
    passwordLoading.value = false
  }
}

const handleChangeUsername = async () => {
  try {
    await usernameFormRef.value.validate()
    usernameLoading.value = true

    await authApi.changeUsername(usernameForm.newUsername, usernameForm.password)

    // 更新本地存储
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    user.username = usernameForm.newUsername
    localStorage.setItem('user', JSON.stringify(user))

    ElMessage.success('用户名修改成功')
    showAccountDialog.value = false
    usernameForm.newUsername = ''
    usernameForm.password = ''
  } catch (error) {
    ElMessage.error(error || '用户名修改失败')
  } finally {
    usernameLoading.value = false
  }
}

// 导出服务器配置
const exportServerConfig = async () => {
  try {
    // 调用后端API获取完整配置（包含密码）
    const response = await fetch('/api/servers/export/full', {
      credentials: 'include'
    })
    const config = await response.json()

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `servers-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)

    ElMessage.success('配置导出成功（包含密码）')
  } catch (error) {
    ElMessage.error('导出失败: ' + error)
  }
}

// 处理导入文件选择
const handleImportFile = (file) => {
  importFile.value = file.raw
  return false
}

// 确认导入
const confirmImport = async () => {
  if (!importFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  try {
    await ElMessageBox.confirm('导入将覆盖现有服务器配置，是否继续？', '警告', { type: 'warning' })

    importing.value = true
    const text = await importFile.value.text()
    const config = JSON.parse(text)

    if (!config.servers || !Array.isArray(config.servers)) {
      throw new Error('无效的配置文件格式')
    }

    // 调用后端API导入
    const response = await fetch('/api/servers/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ servers: config.servers })
    })

    const result = await response.json()
    if (result.success) {
      ElMessage.success(`导入成功: ${result.count} 台服务器`)
      showImportDialog.value = false
      importFile.value = null
      loadServers()
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('导入失败: ' + error)
    }
  } finally {
    importing.value = false
  }
}

const handleLogout = async () => {
  try {
    await authApi.logout()
    localStorage.removeItem('user')
    router.push('/login')
  } catch (error) {
    ElMessage.error(error || '退出失败')
  }
}

onMounted(() => {
  loadServers()
  loadTemplates()

  // 每10秒自动刷新服务器状态
  statusInterval = setInterval(() => {
    servers.value.forEach(s => checkServerStatus(s.id))
  }, 10000)

  // 每5秒刷新ping
  pingInterval = setInterval(() => {
    servers.value.forEach(s => pingServer(s.id))
  }, 5000)
})

onUnmounted(() => {
  if (statusInterval) clearInterval(statusInterval)
  if (pingInterval) clearInterval(pingInterval)
})
</script>

<style scoped>
.dashboard-container {
  height: 100vh;
}

.sidebar {
  background-color: #304156;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
}

.el-menu {
  border-right: none;
  flex: 1;
}

.user-info {
  padding: 20px;
  border-top: 1px solid #3a4758;
}

.user-dropdown {
  color: #bfcbd9;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.header-actions {
  display: flex;
  gap: 10px;
}

.main {
  background: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}

.server-card, .command-card, .result-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.server-group {
  margin-bottom: 20px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 15px;
  margin-top: 20px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  cursor: pointer;
  user-select: none;
  transition: all 0.3s ease;
}

.group-header:hover {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.group-header:first-child {
  margin-top: 0;
}

.group-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-name .el-icon {
  font-size: 18px;
}

.collapse-icon {
  transition: transform 0.3s ease;
}

.collapse-icon.collapsed {
  transform: rotate(0deg);
}

.collapse-icon:not(.collapsed) {
  transform: rotate(90deg);
}

.group-count {
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 10px;
  border-radius: 12px;
}

.group-header .el-button {
  margin-left: auto;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
}

.group-header .el-button:hover {
  background: rgba(255, 255, 255, 0.3);
  color: #fff;
}

.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
}

.command-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.execution-status {
  max-height: 500px;
  overflow-y: auto;
}

.status-item {
  margin-bottom: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.status-header {
  background: #f5f7fa;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.server-name {
  font-weight: bold;
}

.exit-code {
  margin-left: auto;
  color: #909399;
  font-size: 12px;
}

.status-output {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 15px;
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

:deep(.offline-row) {
  background-color: #fef0f0 !important;
}

.server-config {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
}

.server-config .config-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.server-config .config-item.cpu {
  background: #e6f7ff;
  color: #1890ff;
}

.server-config .config-item.mem {
  background: #fff7e6;
  color: #fa8c16;
}

.server-config .config-item.disk {
  background: #f6ffed;
  color: #52c41a;
}

.server-config .config-item .el-icon {
  font-size: 13px;
}

.server-config .config-empty {
  color: #909399;
  font-size: 12px;
}

.config-empty {
  color: #909399;
  font-size: 12px;
}

.os-info {
  font-size: 12px;
  line-height: 1.6;
}

.os-info .os-name {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #409EFF;
  font-weight: 500;
}

.os-info .os-kernel {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  font-size: 11px;
}
</style>
