<template>
  <div class="terminal-container">
    <div class="terminal-header">
      <span class="server-name">{{ serverName || '连接中...' }}</span>
      <el-button size="small" @click="goBack">返回</el-button>
    </div>
    <div ref="terminalRef" class="terminal"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { io } from 'socket.io-client'
import 'xterm/css/xterm.css'
import { serverApi } from '../api'

const route = useRoute()
const router = useRouter()
const terminalRef = ref(null)
const serverName = ref('')

let terminal = null
let fitAddon = null
let socket = null

const initTerminal = () => {
  terminal = new Terminal({
    fontSize: 14,
    fontFamily: 'Consolas, Monaco, monospace',
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#ffffff',
      selection: 'rgba(255, 255, 255, 0.3)',
      black: '#000000',
      red: '#e44857',
      green: '#50a14f',
      yellow: '#c45c00',
      blue: '#4078f2',
      magenta: '#a626a4',
      cyan: '#0184bc',
      white: '#ffffff',
      brightBlack: '#5c6370',
      brightRed: '#e44857',
      brightGreen: '#50a14f',
      brightYellow: '#c45c00',
      brightBlue: '#4078f2',
      brightMagenta: '#a626a4',
      brightCyan: '#0184bc',
      brightWhite: '#ffffff'
    },
    cursorBlink: true,
    cursorStyle: 'block',
    scrollback: 5000
  })

  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.loadAddon(new WebLinksAddon())

  terminal.open(terminalRef.value)
  fitAddon.fit()

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    fitAddon.fit()
    if (socket) {
      socket.emit('terminal:resize', {
        cols: terminal.cols,
        rows: terminal.rows
      })
    }
  })

  // 监听终端输入
  terminal.onData((data) => {
    if (socket) {
      socket.emit('terminal:input', data)
    }
  })

  // 连接WebSocket
  socket = io()

  socket.on('connect', () => {
    socket.emit('terminal:create', {
      serverId: route.params.id,
      cols: terminal.cols,
      rows: terminal.rows
    })
  })

  socket.on('terminal:ready', (data) => {
    serverName.value = data.serverName
    terminal.write('\x1b[32m[已连接到 ' + data.serverName + ']\x1b[0m\r\n')
  })

  socket.on('terminal:data', (data) => {
    terminal.write(data)
  })

  socket.on('terminal:close', () => {
    terminal.write('\r\n\x1b[33m[连接已关闭]\x1b[0m\r\n')
  })

  socket.on('terminal:error', (error) => {
    terminal.write('\r\n\x1b[31m[错误: ' + error + ']\x1b[0m\r\n')
    ElMessage.error(error)
  })
}

const goBack = () => {
  router.push('/')
}

onMounted(async () => {
  // 获取服务器信息
  try {
    const server = await serverApi.getById(route.params.id)
    serverName.value = server.name
    document.title = `终端 - ${server.name}`
  } catch (error) {
    ElMessage.error('获取服务器信息失败')
  }

  initTerminal()
})

onUnmounted(() => {
  if (socket) {
    socket.disconnect()
  }
  if (terminal) {
    terminal.dispose()
  }
  window.removeEventListener('resize', () => {})
})
</script>

<style scoped>
.terminal-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}

.terminal-header {
  height: 40px;
  background: #252526;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  border-bottom: 1px solid #3c3c3c;
}

.server-name {
  color: #e0e0e0;
  font-weight: bold;
}

.terminal {
  flex: 1;
  padding: 10px;
}
</style>
