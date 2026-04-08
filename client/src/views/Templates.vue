<template>
  <el-container class="templates-container">
    <!-- 侧边栏 -->
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <el-icon size="24"><Monitor /></el-icon>
        <span>群控系统</span>
      </div>

      <el-menu
        default-active="/templates"
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
        <h3>命令模板</h3>
        <div class="header-actions">
          <el-button @click="exportTemplates" :loading="exporting">
            <el-icon><Download /></el-icon> 导出
          </el-button>
          <el-button @click="showImportDialog = true">
            <el-icon><Upload /></el-icon> 导入
          </el-button>
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon> 添加
          </el-button>
        </div>
      </el-header>

      <el-main class="main">
        <el-card>
          <el-table :data="templates" v-loading="loading" stripe>
            <el-table-column prop="name" label="名称" width="200" />
            <el-table-column prop="command" label="命令">
              <template #default="{ row }">
                <code class="command-preview">{{ row.command }}</code>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button-group>
                  <el-button size="small" @click="copyCommand(row.command)" title="复制">
                    <el-icon><CopyDocument /></el-icon>
                  </el-button>
                  <el-button size="small" type="danger" @click="deleteTemplate(row)" title="删除">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>

          <el-empty v-if="templates.length === 0 && !loading" description="暂无命令模板" />
        </el-card>

        <!-- 添加模板对话框 -->
        <el-dialog v-model="dialogVisible" title="添加命令模板" width="500px">
          <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
            <el-form-item label="名称" prop="name">
              <el-input v-model="form.name" placeholder="模板名称" />
            </el-form-item>
            <el-form-item label="命令" prop="command">
              <el-input v-model="form.command" type="textarea" :rows="5" placeholder="Shell命令" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="submitting" @click="submitForm">确定</el-button>
          </template>
        </el-dialog>

        <!-- 导入对话框 -->
        <el-dialog v-model="showImportDialog" title="导入命令模板" width="500px">
          <el-alert type="warning" :closable="false" style="margin-bottom: 20px">
            导入将覆盖现有模板配置，请谨慎操作
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { templateApi } from '../api'

const loading = ref(false)
const submitting = ref(false)
const exporting = ref(false)
const importing = ref(false)
const dialogVisible = ref(false)
const showImportDialog = ref(false)
const templates = ref([])
const formRef = ref(null)
const importFile = ref(null)

const form = reactive({
  name: '',
  command: ''
})

const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  command: [{ required: true, message: '请输入命令', trigger: 'blur' }]
}

const loadTemplates = async () => {
  loading.value = true
  try {
    templates.value = await templateApi.getAll()
  } catch (error) {
    ElMessage.error(error || '加载模板失败')
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  form.name = ''
  form.command = ''
  dialogVisible.value = true
}

const submitForm = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true

    await templateApi.create(form.name, form.command)
    ElMessage.success('添加成功')
    dialogVisible.value = false
    loadTemplates()
  } catch (error) {
    ElMessage.error(error || '添加失败')
  } finally {
    submitting.value = false
  }
}

const deleteTemplate = async (template) => {
  try {
    await ElMessageBox.confirm(`确定要删除模板 "${template.name}" 吗?`, '确认删除', {
      type: 'warning'
    })

    await templateApi.delete(template.id)
    ElMessage.success('删除成功')
    loadTemplates()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error || '删除失败')
    }
  }
}

const copyCommand = async (command) => {
  try {
    await navigator.clipboard.writeText(command)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

// 导出模板
const exportTemplates = async () => {
  exporting.value = true
  try {
    const response = await fetch('/api/templates/export', {
      credentials: 'include'
    })
    const config = await response.json()

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `templates-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)

    ElMessage.success('模板导出成功')
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
    await ElMessageBox.confirm('导入将覆盖现有模板配置，是否继续？', '警告', { type: 'warning' })

    importing.value = true
    const text = await importFile.value.text()
    const config = JSON.parse(text)

    if (!config.templates || !Array.isArray(config.templates)) {
      throw new Error('无效的配置文件格式')
    }

    const response = await fetch('/api/templates/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ templates: config.templates })
    })

    const result = await response.json()
    if (result.success) {
      ElMessage.success(`导入成功: ${result.count} 个模板`)
      showImportDialog.value = false
      importFile.value = null
      loadTemplates()
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

onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.templates-container {
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

.header-actions {
  display: flex;
  gap: 10px;
}

.main {
  background: #f0f2f5;
  padding: 20px;
}

.command-preview {
  background: #f5f7fa;
  padding: 5px 10px;
  border-radius: 4px;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  display: block;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
