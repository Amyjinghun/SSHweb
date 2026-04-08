<template>
  <el-container class="servers-container">
    <!-- 侧边栏 -->
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <el-icon size="24"><Monitor /></el-icon>
        <span>群控系统</span>
      </div>

      <el-menu
        default-active="/servers"
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
          <el-icon><Monitor /></el-icon>
          <span>服务器管理</span>
        </el-menu-item>
        <el-menu-item index="/templates">
          <el-icon><Document /></el-icon>
          <span>命令模板</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <h3>
          <el-icon class="header-icon"><Monitor /></el-icon>
          服务器管理
        </h3>
        <div class="header-actions">
          <el-button @click="showImportDialog = true">
            <el-icon><Upload /></el-icon> 导入配置
          </el-button>
          <el-button @click="exportServerConfig" :loading="exporting">
            <el-icon><Download /></el-icon> 导出配置
          </el-button>
          <el-button type="warning" @click="detectAllServers" :loading="detectingAll">
            <el-icon><SetUp /></el-icon> 一键获取配置
          </el-button>
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon> 添加服务器
          </el-button>
        </div>
      </el-header>

      <el-main class="main">
        <el-card>
          <el-table :data="servers" v-loading="loading" stripe>
            <el-table-column prop="name" label="名称" width="120" />
            <el-table-column prop="host" label="主机" width="140" />
            <el-table-column label="系统" width="180">
              <template #default="{ row }">
                <div class="os-info">
                  <div v-if="row.os_name" class="os-name">
                    <el-icon><Monitor /></el-icon> {{ row.os_name }} {{ row.os_version }}
                  </div>
                  <div v-if="row.kernel" class="os-kernel">
                    <el-icon><SetUp /></el-icon> {{ row.kernel }}
                  </div>
                  <span v-if="!row.os_name && !row.kernel" class="no-config">未检测</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="配置" width="200">
              <template #default="{ row }">
                <div class="config-info">
                  <el-tag v-if="row.cpu_cores" size="small" type="info" class="config-tag">
                    <el-icon><SetUp /></el-icon> {{ row.cpu_cores }}核
                  </el-tag>
                  <el-tag v-if="row.memory" size="small" type="warning" class="config-tag">
                    <el-icon><Coin /></el-icon> {{ row.memory }}
                  </el-tag>
                  <el-tag v-if="row.disk" size="small" type="success" class="config-tag">
                    <el-icon><FolderOpened /></el-icon> {{ row.disk }}
                  </el-tag>
                  <span v-if="!row.cpu_cores && !row.memory && !row.disk" class="no-config">未配置</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="group_name" label="分组" width="100">
              <template #default="{ row }">
                <el-tag size="small">{{ row.group_name || 'default' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag v-if="statusMap[row.id] === 'success'" type="success" size="small">在线</el-tag>
                <el-tag v-else-if="statusMap[row.id] === 'error'" type="danger" size="small">离线</el-tag>
                <el-tag v-else type="info" size="small">-</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button-group>
                  <el-button size="small" @click="testConnection(row)" title="测试连接">
                    <el-icon><Connection /></el-icon>
                  </el-button>
                  <el-button size="small" @click="editServer(row)" title="编辑">
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <el-button size="small" type="danger" @click="deleteServer(row)" title="删除">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 添加/编辑对话框 -->
        <el-dialog
          v-model="dialogVisible"
          :title="isEdit ? '编辑服务器' : '添加服务器'"
          width="550px"
        >
          <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="名称" prop="name">
                  <el-input v-model="form.name" placeholder="服务器名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="分组" prop="group_name">
                  <el-select v-model="form.group_name" placeholder="选择分组" allow-create filterable style="width: 100%">
                    <el-option v-for="g in groups" :key="g" :label="g" :value="g" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="16">
                <el-form-item label="主机" prop="host">
                  <el-input v-model="form.host" placeholder="IP地址或域名" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="端口" prop="port">
                  <el-input-number v-model="form.port" :min="1" :max="65535" :controls="false" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="用户名" prop="username">
                  <el-input v-model="form.username" placeholder="SSH用户名" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="密码" prop="password">
                  <div class="password-input-wrapper">
                    <el-input v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="SSH密码" class="flex-1" />
                    <el-button link size="small" @click="togglePassword">
                      {{ showPassword ? '隐藏' : '显示' }}
                    </el-button>
                  </div>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="私钥" prop="private_key">
              <el-input v-model="form.private_key" type="textarea" :rows="3" placeholder="SSH私钥 (可选，与密码二选一)" />
            </el-form-item>

            <el-divider content-position="left">
              系统与硬件配置
              <el-button v-if="isEdit" type="primary" link size="small" @click="autoDetect" :loading="detecting" style="margin-left: 10px">
                <el-icon><Search /></el-icon> 自动检测
              </el-button>
            </el-divider>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="系统" prop="os_name">
                  <el-input v-model="form.os_name" placeholder="如: Ubuntu" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="版本" prop="os_version">
                  <el-input v-model="form.os_version" placeholder="如: 22.04" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="内核" prop="kernel">
                  <el-input v-model="form.kernel" placeholder="如: 5.15.0" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="CPU核心" prop="cpu_cores">
                  <el-input-number v-model="form.cpu_cores" :min="1" :max="256" placeholder="核心数" style="width: 100%" :controls="false" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="内存" prop="memory">
                  <el-input v-model="form.memory" placeholder="如: 16GB" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="硬盘" prop="disk">
                  <el-input v-model="form.disk" placeholder="如: 500GB SSD" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
          <template #footer>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="submitting" @click="submitForm">确定</el-button>
          </template>
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

        <!-- 批量检测结果对话框 -->
        <el-dialog v-model="showDetectResultDialog" title="批量检测结果" width="600px">
          <div class="detect-results">
            <div v-for="result in detectResults" :key="result.id" class="detect-result-item">
              <div class="detect-result-header">
                <el-icon v-if="result.success" color="#67C23A"><SuccessFilled /></el-icon>
                <el-icon v-else color="#F56C6C"><CircleCloseFilled /></el-icon>
                <span class="server-name">{{ result.name }}</span>
                <el-tag :type="result.success ? 'success' : 'danger'" size="small">
                  {{ result.success ? '成功' : '失败' }}
                </el-tag>
              </div>
              <div v-if="result.success && result.info" class="detect-result-info">
                <el-tag size="small" type="info">{{ result.info.os_name }} {{ result.info.os_version }}</el-tag>
                <el-tag size="small" type="warning">{{ result.info.memory }}</el-tag>
                <el-tag size="small">{{ result.info.cpu_cores }}核</el-tag>
              </div>
              <div v-else class="detect-result-error">
                {{ result.error }}
              </div>
            </div>
          </div>
          <template #footer>
            <el-button type="primary" @click="showDetectResultDialog = false">确定</el-button>
          </template>
        </el-dialog>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { serverApi } from '../api'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const servers = ref([])
const statusMap = ref({})
const formRef = ref(null)
const editId = ref(null)
const detecting = ref(false)
const detectedInfo = ref(null)
const showPassword = ref(false)
const realPassword = ref('')

// 导入导出相关
const showImportDialog = ref(false)
const importing = ref(false)
const exporting = ref(false)
const importFile = ref(null)

// 批量检测相关
const detectingAll = ref(false)
const showDetectResultDialog = ref(false)
const detectResults = ref([])

const form = reactive({
  name: '',
  host: '',
  port: 22,
  username: '',
  password: '',
  private_key: '',
  group_name: 'default',
  os_name: '',
  os_version: '',
  kernel: '',
  cpu_cores: null,
  memory: '',
  disk: ''
})

const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  host: [{ required: true, message: '请输入主机地址', trigger: 'blur' }],
  port: [{ required: true, message: '请输入端口', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }]
}

const groups = computed(() => {
  const groupSet = new Set(['default'])
  servers.value.forEach(s => {
    if (s.group_name) groupSet.add(s.group_name)
  })
  return Array.from(groupSet)
})

const loadServers = async () => {
  loading.value = true
  try {
    servers.value = await serverApi.getAll()
  } catch (error) {
    ElMessage.error(error || '加载服务器失败')
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  isEdit.value = false
  editId.value = null
  detectedInfo.value = null
  showPassword.value = false
  realPassword.value = ''
  Object.assign(form, {
    name: '',
    host: '',
    port: 22,
    username: '',
    password: '',
    private_key: '',
    group_name: 'default',
    os_name: '',
    os_version: '',
    kernel: '',
    cpu_cores: null,
    memory: '',
    disk: ''
  })
  dialogVisible.value = true
}

const editServer = async (server) => {
  isEdit.value = true
  editId.value = server.id
  detectedInfo.value = null
  showPassword.value = false
  realPassword.value = ''
  Object.assign(form, {
    name: server.name,
    host: server.host,
    port: server.port,
    username: server.username,
    password: server.password || '',
    private_key: server.private_key || '',
    group_name: server.group_name || 'default',
    os_name: server.os_name || '',
    os_version: server.os_version || '',
    kernel: server.kernel || '',
    cpu_cores: server.cpu_cores || null,
    memory: server.memory || '',
    disk: server.disk || ''
  })
  dialogVisible.value = true
}

// 切换显示/隐藏密码
const togglePassword = async () => {
  if (!editId.value) {
    ElMessage.warning('请先保存服务器后再查看密码')
    return
  }

  if (!showPassword.value) {
    try {
      // 获取真实密码
      const fullServer = await serverApi.getByIdFull(editId.value)
      console.log('获取到的服务器信息:', fullServer)
      if (fullServer.password) {
        form.password = fullServer.password
        showPassword.value = true
      } else {
        ElMessage.warning('该服务器未设置密码')
      }
    } catch (error) {
      ElMessage.error('获取密码失败: ' + error)
    }
  } else {
    showPassword.value = false
    form.password = '******'
  }
}

const submitForm = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true

    const data = { ...form }
    // 编辑模式下，如果密码/私钥是掩码或空，不发送这些字段（后端会保留原值）
    if (isEdit.value) {
      if (!data.password || data.password === '******') delete data.password
      if (!data.private_key || data.private_key === '******') delete data.private_key
    }

    if (isEdit.value) {
      await serverApi.update(editId.value, data)
      ElMessage.success('更新成功')
    } else {
      await serverApi.create(data)
      ElMessage.success('添加成功')
    }

    dialogVisible.value = false
    loadServers()
  } catch (error) {
    ElMessage.error(error || '操作失败')
  } finally {
    submitting.value = false
  }
}

const testConnection = async (server) => {
  try {
    await serverApi.test(server.id)
    statusMap.value[server.id] = 'success'
    ElMessage.success(`${server.name} 连接成功`)
  } catch (error) {
    statusMap.value[server.id] = 'error'
    ElMessage.error(`${server.name}: ${error}`)
  }
}

const autoDetect = async () => {
  if (!editId.value) return

  detecting.value = true
  try {
    const info = await serverApi.detect(editId.value)

    // 自动填充系统信息
    if (info.os_name) {
      form.os_name = info.os_name
    }
    if (info.os_version) {
      form.os_version = info.os_version
    }
    if (info.kernel) {
      form.kernel = info.kernel
    }
    if (info.cpu_cores) {
      form.cpu_cores = info.cpu_cores
    }
    if (info.memory) {
      form.memory = info.memory
    }
    if (info.disk) {
      form.disk = info.disk
    }

    ElMessage.success('检测成功')
  } catch (error) {
    ElMessage.error(`检测失败: ${error}`)
  } finally {
    detecting.value = false
  }
}

const deleteServer = async (server) => {
  try {
    await ElMessageBox.confirm(`确定要删除服务器 "${server.name}" 吗?`, '确认删除', {
      type: 'warning'
    })

    await serverApi.delete(server.id)
    ElMessage.success('删除成功')
    loadServers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error || '删除失败')
    }
  }
}

// 导出服务器配置
const exportServerConfig = async () => {
  exporting.value = true
  try {
    const config = await serverApi.exportFull()
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `servers-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('配置导出成功')
  } catch (error) {
    ElMessage.error('导出失败: ' + error)
  } finally {
    exporting.value = false
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

    await serverApi.import(config.servers)
    ElMessage.success(`导入成功: ${config.servers.length} 台服务器`)
    showImportDialog.value = false
    importFile.value = null
    loadServers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('导入失败: ' + error)
    }
  } finally {
    importing.value = false
  }
}

// 批量检测所有服务器
const detectAllServers = async () => {
  if (servers.value.length === 0) {
    ElMessage.warning('暂无服务器')
    return
  }

  try {
    await ElMessageBox.confirm(
      `将检测所有 ${servers.value.length} 台服务器的系统与硬件配置，是否继续？`,
      '批量检测',
      { type: 'info' }
    )

    detectingAll.value = true
    detectResults.value = []

    const res = await serverApi.detectAll()
    detectResults.value = res.results.map(r => ({
      id: r.id,
      name: r.name,
      success: r.success,
      info: r.info,
      error: r.error
    }))

    const successCount = res.results.filter(r => r.success).length
    ElMessage.success(`检测完成: ${successCount}/${res.results.length} 成功`)

    // 刷新服务器列表
    loadServers()

    // 显示结果对话框
    showDetectResultDialog.value = true
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量检测失败: ' + error)
    }
  } finally {
    detectingAll.value = false
  }
}

onMounted(() => {
  loadServers()
})
</script>

<style scoped>
.servers-container {
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

.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.main {
  background: #f0f2f5;
  padding: 20px;
}

.config-info {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.config-info .config-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.config-info .config-tag .el-icon {
  font-size: 12px;
}

.config-info .no-config {
  color: #909399;
  font-size: 12px;
}

.os-info {
  font-size: 12px;
}

.os-info .os-name {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #409EFF;
  margin-bottom: 4px;
}

.os-info .os-kernel {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  font-size: 11px;
}

.os-info .no-config {
  color: #909399;
}

.detected-info {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #606266;
  background: #f5f7fa;
  padding: 10px 12px;
  border-radius: 4px;
  width: 100%;
}

.detected-info span {
  white-space: nowrap;
}

.detected-info strong {
  color: #303133;
}

.password-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.password-input-wrapper .el-input {
  flex: 1;
}

.password-toggle {
  padding: 4px 8px;
}

.el-divider {
  margin: 15px 0;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.header-icon {
  color: #409EFF;
  font-size: 22px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.detect-results {
  max-height: 400px;
  overflow-y: auto;
}

.detect-result-item {
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 10px;
  background: #fafafa;
}

.detect-result-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.detect-result-header .server-name {
  font-weight: 600;
  flex: 1;
}

.detect-result-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detect-result-error {
  color: #F56C6C;
  font-size: 13px;
}
</style>
