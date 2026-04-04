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
          <el-icon><Server /></el-icon>
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
        <h3>服务器管理</h3>
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon> 添加服务器
        </el-button>
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
                    <el-icon><Cpu /></el-icon> {{ row.kernel }}
                  </div>
                  <span v-if="!row.os_name && !row.kernel" class="no-config">未检测</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="配置" width="200">
              <template #default="{ row }">
                <div class="config-info">
                  <el-tag v-if="row.cpu_cores" size="small" type="info" class="config-tag">
                    <el-icon><Cpu /></el-icon> {{ row.cpu_cores }}核
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
</style>
