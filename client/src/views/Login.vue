<template>
  <div class="login-container">
    <!-- 动态背景 -->
    <div class="bg-animation">
      <div class="floating-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
        <div class="shape shape-4"></div>
      </div>
    </div>

    <!-- 登录卡片 -->
    <div class="login-card">
      <!-- Logo 和标题 -->
      <div class="card-header">
        <div class="logo-wrapper">
          <div class="logo-ring"></div>
          <el-icon class="logo-icon" :size="36"><Monitor /></el-icon>
        </div>
        <h1 class="title">Linux服务器群控系统</h1>
        <p class="subtitle">安全 · 高效 · 智能</p>
      </div>

      <!-- 登录表单 -->
      <el-form :model="form" :rules="rules" ref="formRef" class="login-form">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            size="large"
            prefix-icon="User"
            clearable
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item class="remember-item">
          <el-checkbox v-model="rememberMe">记住我</el-checkbox>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleLogin"
            class="login-btn"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 底部 -->
      <div class="card-footer">
        <p>© 2024 Linux Server Management</p>
      </div>
    </div>

    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="showChangePassword"
      title="修改密码"
      width="420px"
      :close-on-click-modal="false"
      class="password-dialog"
    >
      <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-position="top">
        <el-form-item prop="oldPassword" label="旧密码">
          <el-input
            v-model="passwordForm.oldPassword"
            type="password"
            placeholder="请输入旧密码"
            show-password
            size="large"
            prefix-icon="Lock"
          />
        </el-form-item>
        <el-form-item prop="newPassword" label="新密码">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
            size="large"
            prefix-icon="Lock"
          />
        </el-form-item>
        <el-form-item prop="confirmPassword" label="确认新密码">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
            size="large"
            prefix-icon="Lock"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showChangePassword = false" size="large">取消</el-button>
          <el-button type="primary" :loading="passwordLoading" @click="handleChangePassword" size="large">
            确定修改
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi } from '../api'

const router = useRouter()
const formRef = ref(null)
const passwordFormRef = ref(null)
const loading = ref(false)
const passwordLoading = ref(false)
const showChangePassword = ref(false)
const rememberMe = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
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

const handleLogin = async () => {
  try {
    await formRef.value.validate()
    loading.value = true

    const res = await authApi.login(form.username, form.password)
    localStorage.setItem('user', JSON.stringify(res.user))
    ElMessage.success('登录成功')
    router.push('/')
  } catch (error) {
    ElMessage.error(error || '登录失败')
  } finally {
    loading.value = false
  }
}

const handleChangePassword = async () => {
  try {
    await passwordFormRef.value.validate()
    passwordLoading.value = true

    await authApi.changePassword(passwordForm.oldPassword, passwordForm.newPassword)
    ElMessage.success('密码修改成功')
    showChangePassword.value = false
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error) {
    ElMessage.error(error || '密码修改失败')
  } finally {
    passwordLoading.value = false
  }
}

onMounted(() => {
  authApi.check().then(res => {
    if (res.authenticated) {
      localStorage.setItem('user', JSON.stringify(res.user))
      router.push('/')
    }
  })
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  position: relative;
  overflow: hidden;
}

/* 动态背景 */
.bg-animation {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
}

.floating-shapes {
  position: absolute;
  inset: 0;
}

.shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
  animation: float 25s infinite ease-in-out;
}

.shape-1 {
  width: 400px;
  height: 400px;
  background: linear-gradient(45deg, #00d9ff, #00ff88);
  top: -150px;
  left: -150px;
}

.shape-2 {
  width: 300px;
  height: 300px;
  background: linear-gradient(45deg, #ff6b6b, #feca57);
  bottom: -100px;
  right: -100px;
  animation-delay: -8s;
}

.shape-3 {
  width: 200px;
  height: 200px;
  background: linear-gradient(45deg, #a55eea, #5f27cd);
  top: 50%;
  right: 10%;
  animation-delay: -15s;
}

.shape-4 {
  width: 250px;
  height: 250px;
  background: linear-gradient(45deg, #00d9ff, #a55eea);
  bottom: 20%;
  left: 5%;
  animation-delay: -5s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.05);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.95);
  }
}

/* 登录卡片 */
.login-card {
  width: 400px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1;
}

/* 卡片头部 */
.card-header {
  text-align: center;
  margin-bottom: 36px;
}

.logo-wrapper {
  position: relative;
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.logo-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid transparent;
  background: linear-gradient(135deg, #00d9ff, #a55eea, #ff6b6b) border-box;
  -webkit-mask:
    linear-gradient(#fff 0 0) padding-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: ring-rotate 3s linear infinite;
}

@keyframes ring-rotate {
  to { transform: rotate(360deg); }
}

.logo-icon {
  color: #00d9ff;
  filter: drop-shadow(0 0 8px rgba(0, 217, 255, 0.5));
}

.title {
  font-size: 22px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 8px;
  letter-spacing: 1px;
}

.subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
  letter-spacing: 4px;
}

/* 表单样式 */
.login-form {
  width: 100%;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 22px;
}

.login-form :deep(.el-form-item__error) {
  color: #ff6b6b;
  padding-top: 4px;
}

.login-form :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  box-shadow: none;
  transition: all 0.3s;
}

.login-form :deep(.el-input__wrapper:hover) {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
}

.login-form :deep(.el-input__wrapper.is-focus) {
  border-color: #00d9ff;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 0 2px rgba(0, 217, 255, 0.15);
}

.login-form :deep(.el-input__inner) {
  color: #ffffff;
  font-size: 14px;
  height: 44px;
}

.login-form :deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.35);
}

.login-form :deep(.el-input__prefix),
.login-form :deep(.el-input__suffix) {
  color: rgba(255, 255, 255, 0.5);
}

.login-form :deep(.el-input__prefix) {
  font-size: 16px;
}

/* 记住我 */
.remember-item {
  margin-bottom: 18px !important;
}

.remember-item :deep(.el-checkbox__label) {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
}

.remember-item :deep(.el-checkbox__inner) {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.25);
}

.remember-item :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background: #00d9ff;
  border-color: #00d9ff;
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 48px;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 4px;
  border-radius: 10px;
  background: linear-gradient(135deg, #00d9ff 0%, #00b4d8 100%);
  border: none;
  box-shadow: 0 4px 15px rgba(0, 217, 255, 0.25);
  transition: all 0.3s ease;
}

.login-btn:hover {
  background: linear-gradient(135deg, #00e5ff 0%, #00c4e8 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 217, 255, 0.35);
}

.login-btn:active {
  transform: translateY(0);
}

/* 底部 */
.card-footer {
  text-align: center;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.card-footer p {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  margin: 0;
}

/* 对话框样式 */
.password-dialog :deep(.el-dialog) {
  border-radius: 16px;
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.password-dialog :deep(.el-dialog__header) {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.password-dialog :deep(.el-dialog__title) {
  color: #ffffff;
}

.password-dialog :deep(.el-dialog__headerbtn .el-dialog__close) {
  color: rgba(255, 255, 255, 0.5);
}

.password-dialog :deep(.el-dialog__body) {
  padding: 24px;
}

.password-dialog :deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.7);
}

.password-dialog :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: none;
}

.password-dialog :deep(.el-input__wrapper:hover) {
  border-color: rgba(255, 255, 255, 0.2);
}

.password-dialog :deep(.el-input__wrapper.is-focus) {
  border-color: #00d9ff;
}

.password-dialog :deep(.el-input__inner) {
  color: #ffffff;
}

.password-dialog :deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.3);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式 */
@media (max-width: 480px) {
  .login-card {
    width: calc(100% - 32px);
    margin: 16px;
    padding: 32px 24px;
  }

  .title {
    font-size: 18px;
  }

  .subtitle {
    font-size: 11px;
    letter-spacing: 2px;
  }
}
</style>
