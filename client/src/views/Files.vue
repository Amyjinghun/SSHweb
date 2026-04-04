<template>
  <div class="files-container">
    <div class="files-header">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item>
          <el-link @click="navigateTo('/')">根目录</el-link>
        </el-breadcrumb-item>
        <el-breadcrumb-item v-for="(part, index) in pathParts" :key="index">
          <el-link @click="navigateTo(getPathUpTo(index))">{{ part }}</el-link>
        </el-breadcrumb-item>
      </el-breadcrumb>
      <div class="header-actions">
        <el-button size="small" @click="goBack">返回</el-button>
        <el-button size="small" @click="loadFiles">
          <el-icon><Refresh /></el-icon>
        </el-button>
        <el-upload
          ref="uploadRef"
          :show-file-list="false"
          :http-request="handleUpload"
          :auto-upload="true"
        >
          <el-button size="small" type="primary" :loading="uploading">
            <el-icon><Upload /></el-icon> 上传
          </el-button>
        </el-upload>
      </div>
    </div>

    <div class="files-content" v-loading="loading">
      <el-empty v-if="files.length === 0 && !loading" description="目录为空" />
      <el-table v-else :data="files" stripe @row-dblclick="handleRowDblClick">
        <el-table-column label="名称" width="300">
          <template #default="{ row }">
            <div class="file-name">
              <el-icon v-if="row.type === 'directory'" color="#409EFC" size="18"><Folder /></el-icon>
              <el-icon v-else size="18"><Document /></el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="120">
          <template #default="{ row }">
            {{ row.type === 'directory' ? '-' : formatSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column label="修改时间" width="200">
          <template #default="{ row }">
            {{ formatDate(row.modifyTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button
              v-if="row.type === 'file'"
              size="small"
              @click="downloadFile(row)"
              :loading="row.downloading"
            >
              <el-icon><Download /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api, { fileApi } from '../api'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const uploading = ref(false)
const currentPath = ref('/')
const files = ref([])
const serverName = ref('')

const pathParts = computed(() => {
  return currentPath.value.split('/').filter(p => p)
})

const getPathUpTo = (index) => {
  return '/' + pathParts.value.slice(0, index + 1).join('/')
}

const loadFiles = async () => {
  loading.value = true
  try {
    const res = await fileApi.list(route.params.id, currentPath.value)
    files.value = (res || []).map(f => ({ ...f, downloading: false }))
  } catch (error) {
    ElMessage.error(error || '加载文件列表失败')
  } finally {
    loading.value = false
  }
}

const navigateTo = (path) => {
  currentPath.value = path === '/' ? '/' : path
  loadFiles()
}

const handleRowDblClick = (row) => {
  if (row.type === 'directory') {
    if (currentPath.value === '/') {
      navigateTo('/' + row.name)
    } else {
      navigateTo(currentPath.value + '/' + row.name)
    }
  }
}

const handleUpload = async (options) => {
  const { file } = options
  const remotePath = currentPath.value === '/'
    ? `/${file.name}`
    : `${currentPath.value}/${file.name}`

  uploading.value = true

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('remotePath', remotePath)

    await fileApi.upload(route.params.id, formData)

    ElMessage.success('上传成功')
    loadFiles()
  } catch (error) {
    ElMessage.error(error || '上传失败')
  } finally {
    uploading.value = false
  }
}

const downloadFile = async (row) => {
  const filePath = currentPath.value === '/'
    ? `/${row.name}`
    : `${currentPath.value}/${row.name}`

  row.downloading = true

  try {
    // 直接使用fetch下载
    const url = fileApi.downloadUrl(route.params.id, filePath)
    const response = await fetch(url, { credentials: 'include' })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || '下载失败')
    }

    const blob = await response.blob()
    const downloadUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = row.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(downloadUrl)
  } catch (error) {
    ElMessage.error(error || '下载失败')
  } finally {
    row.downloading = false
  }
}

const formatSize = (bytes) => {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB'
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const goBack = () => {
  router.push('/')
}

onMounted(async () => {
  try {
    const server = await api.get(`/servers/${route.params.id}`)
    serverName.value = server.name
    document.title = `文件管理 - ${server.name}`
  } catch (error) {
    ElMessage.error('获取服务器信息失败')
  }

  loadFiles()
})
</script>

<style scoped>
.files-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
}

.files-header {
  height: 50px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid #e4e7ed;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.files-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.file-name {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
