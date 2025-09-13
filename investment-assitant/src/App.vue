<template>
  <div class='container'>
    <header class="app-header fade-in">
      <h1 class='app-title slide-in-down'>🚗 吉利汽车智能助手</h1>
      <p class="app-desc slide-in-up">基于RAG技术的汽车知识问答平台</p>
      <!-- 连接状态指示器 -->
      <div class="connection-status" :class="{ connected: isConnected }">
        {{ connectionStatus }}
      </div>
    </header>

    <main class="main-content">
      <!-- 智能问答 -->
      <section class="section card-enter" style="animation-delay: 0.2s;">
        <div class="section-header">
          <div class="section-icon bounce-in">🤖</div>
          <div>
            <h2 class="section-title">智能问答助手</h2>
            <p class="section-subtitle">询问关于吉利汽车的任何问题，获得专业解答</p>
          </div>
        </div>

        <!-- 检索策略选择 -->
        <div class="strategy-selector">
          <label class="input-label">检索策略</label>
          <el-select
            v-model="selectedStrategy"
            class="strategy-select"
            size="large"
          >
            <el-option
              v-for="(desc, key) in strategies"
              :key="key"
              :label="`${desc} (${key})`"
              :value="key"
            />
          </el-select>
        </div>

        <div class="input-group">
          <label class="input-label">您的问题</label>
          <el-input
            v-model="question"
            class="strategy-input animate-input"
            :rows="4"
            type="textarea"
            placeholder="例如：如何更换机油？轮胎气压标准是什么？保养周期是多久？"
            @keyup.ctrl.enter="askQuestion"
          />
        </div>

        <!-- 快速问题按钮 -->
        <div class="quick-questions">
          <div class="quick-label">💡 快速问题：</div>
          <div class="quick-buttons">
            <el-button
              v-for="q in quickQuestions"
              :key="q"
              size="small"
              type="info"
              plain
              @click="askQuickQuestion(q)"
              :disabled="generating"
              class="quick-btn"
            >
              {{ q }}
            </el-button>
          </div>
        </div>

        <el-button
          type="primary"
          class="action-btn primary-btn pulse-btn"
          @click="askQuestion"
          :loading="generating"
          :disabled="!question.trim() || !isConnected"
        >
          <span class="btn-text">🔍 智能问答</span>
          <span class="btn-loading" v-if="generating">
            <span class="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </span>
        </el-button>

        <!-- 问答历史 -->
        <transition name="chat-reveal" appear>
          <div class="chat-history" v-if="chatHistory.length > 0">
            <div class="chat-header">
              <span class="chat-title">📚 问答记录</span>
              <el-button
                size="small"
                type="danger"
                plain
                @click="clearHistory"
                class="clear-btn"
              >
                🗑️ 清空记录
              </el-button>
            </div>
            <div class="chat-messages" ref="chatMessagesRef">
              <div
                v-for="(item, index) in chatHistory"
                :key="index"
                class="chat-item"
                :class="`chat-item-${item.type}`"
              >
                <div class="chat-content">
                  <div class="chat-question" v-if="item.type === 'qa'">
                    <strong>🙋 问题：</strong>{{ item.question }}
                  </div>
                  <div class="chat-answer" v-if="item.type === 'qa'">
                    <strong>🤖 回答：</strong>
                    <div class="answer-text" v-html="formatAnswer(item.answer)"></div>
                  </div>
                  <div class="chat-meta" v-if="item.type === 'qa'">
                    <span class="meta-item">📊 策略: {{ item.strategy }}</span>
                    <span class="meta-item">🎯 置信度: {{ item.confidence }}</span>
                    <span class="meta-item">⚡ 得分: {{ item.score?.toFixed(2) }}</span>
                    <span class="meta-item">📄 检索: {{ item.docsCount?.faiss }}+{{ item.docsCount?.bm25 }}篇</span>
                  </div>
                  <div class="system-message" v-if="item.type === 'system'">
                    {{ item.message }}
                  </div>
                </div>
                <div class="chat-time">
                  {{ formatTime(item.timestamp) }}
                </div>
              </div>
            </div>
          </div>
        </transition>
      </section>

      <!-- 系统状态 -->
      <section class="section card-enter" style="animation-delay: 0.4s;">
        <div class="section-header">
          <div class="section-icon bounce-in" style="animation-delay: 0.5s;">📊</div>
          <div>
            <h2 class="section-title">系统状态</h2>
            <p class="section-subtitle">RAG服务运行状态和性能指标</p>
          </div>
        </div>

        <div class="status-grid">
          <div class="status-card">
            <div class="status-icon">🔌</div>
            <div class="status-info">
              <div class="status-label">连接状态</div>
              <div class="status-value" :class="{ connected: isConnected }">
                {{ isConnected ? '已连接' : '连接中' }}
              </div>
            </div>
          </div>

          <div class="status-card">
            <div class="status-icon">📚</div>
            <div class="status-info">
              <div class="status-label">知识库</div>
              <div class="status-value">吉利用户手册</div>
            </div>
          </div>

          <div class="status-card">
            <div class="status-icon">🤖</div>
            <div class="status-info">
              <div class="status-label">AI模型</div>
              <div class="status-value">Qwen-7B-Chat</div>
            </div>
          </div>

          <div class="status-card">
            <div class="status-icon">💬</div>
            <div class="status-info">
              <div class="status-label">问答次数</div>
              <div class="status-value">{{ chatHistory.filter(item => item.type === 'qa').length }}</div>
            </div>
          </div>
        </div>

        <el-button
          type="success"
          class="action-btn success-btn pulse-btn"
          @click="checkSystemStatus"
          :loading="checking"
          size="large"
        >
          <span class="btn-text">🔄 检查系统状态</span>
        </el-button>
      </section>
    </main>

    <!-- 浮动粒子背景 -->
    <div class="particles">
      <div class="particle" v-for="n in 15" :key="n" :style="getParticleStyle(n)"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import ragService from './services/ragApi.js'

// RAG API配置
const API_BASE_URL = 'http://58.198.176.133:5000/api'

// 响应式数据
const question = ref('')
const chatHistory = ref([])
const generating = ref(false)
const checking = ref(false)
const isConnected = ref(false)
const connectionStatus = ref('🔄 正在连接RAG服务...')
const selectedStrategy = ref('merge')
const chatMessagesRef = ref(null)

// 策略配置
const strategies = ref({
  merge: '合并FAISS和BM25检索结果',
  faiss: '仅使用FAISS向量检索',
  bm25: '仅使用BM25关键词检索',
  rerank: '使用重排序优化检索结果'
})

// 快速问题
const quickQuestions = ref([
  '如何更换机油？',
  '轮胎气压标准是什么？',
  '车辆保养周期是多久？',
  '如何检查制动液？',
  '空调滤清器多久更换？'
])

// RAG API 服务

// 检查RAG服务连接状态
const checkConnection = async () => {
  try {
    const result = await ragService.checkHealth()
    if (result.healthy) {
      isConnected.value = true
      connectionStatus.value = '🟢 RAG系统运行正常'

      // 获取可用策略
      const availableStrategies = await ragService.getStrategies()
      strategies.value = { ...strategies.value, ...availableStrategies }

      addSystemMessage('✅ RAG系统已连接，请输入您的问题')
    } else {
      isConnected.value = false
      connectionStatus.value = `🔴 ${result.message}`
      addSystemMessage('❌ 无法连接到RAG服务，请检查网络连接')
    }
  } catch (error) {
    isConnected.value = false
    connectionStatus.value = '🔴 RAG服务连接失败'
    addSystemMessage(`❌ 连接错误: ${error.message}`)
  }
}

// 发送问题
const askQuestion = async () => {
  if (!question.value.trim()) {
    ElMessage.warning('请先输入您的问题')
    return
  }

  if (!isConnected.value) {
    ElMessage.error('RAG服务未连接，请检查网络')
    return
  }

  generating.value = true
  const currentQuestion = question.value.trim()

  try {
    addSystemMessage(`🔍 正在为您查找答案...`)

    const result = await ragService.sendQuestion(currentQuestion, selectedStrategy.value)

    if (result.success) {
      // 添加问答记录
      addChatItem({
        type: 'qa',
        question: currentQuestion,
        answer: result.answer,
        strategy: result.strategy_used,
        confidence: result.confidence,
        score: result.faiss_score,
        docsCount: result.retrieved_docs_count,
        timestamp: new Date()
      })

      if (result.warning) {
        addSystemMessage(`⚠️ ${result.warning}`)
      }

      ElMessage.success('问题回答完成！')

      // 清空问题输入
      question.value = ''

    } else {
      addSystemMessage(`❌ 错误: ${result.error}`)
      ElMessage.error('获取答案失败')
    }

  } catch (error) {
    addSystemMessage(`❌ 网络错误: ${error.message}`)
    ElMessage.error('网络连接失败')
  } finally {
    generating.value = false
  }
}

// 快速提问
const askQuickQuestion = (q) => {
  question.value = q
  askQuestion()
}

// 检查系统状态
const checkSystemStatus = async () => {
  checking.value = true
  try {
    await checkConnection()
    ElMessage.success('系统状态检查完成')
  } finally {
    checking.value = false
  }
}

// 添加聊天记录
const addChatItem = (item) => {
  chatHistory.value.push(item)
  nextTick(() => {
    scrollToBottom()
  })
}

// 添加系统消息
const addSystemMessage = (message) => {
  addChatItem({
    type: 'system',
    message,
    timestamp: new Date()
  })
}

// 滚动到底部
const scrollToBottom = () => {
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
  }
}

// 清空历史记录
const clearHistory = () => {
  chatHistory.value = []
  ElMessage.success('历史记录已清空')
}

// 格式化答案（支持换行）
const formatAnswer = (answer) => {
  return answer.replace(/\n/g, '<br>')
}

// 格式化时间
const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString()
}

// 生成粒子样式
const getParticleStyle = (index) => {
  const delay = Math.random() * 20
  const duration = 15 + Math.random() * 10
  const size = 2 + Math.random() * 4
  const leftPosition = Math.random() * 100

  return {
    left: `${leftPosition}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    width: `${size}px`,
    height: `${size}px`,
  }
}

// 组件挂载时检查连接
onMounted(() => {
  checkConnection()
  // 每30秒检查一次连接状态
  setInterval(checkConnection, 30000)
})
</script>

<style scoped>
/* 继承原有的所有动画和基础样式 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInDown {
  from { opacity: 0; transform: translateY(-30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes cardEnter {
  from { opacity: 0; transform: translateY(50px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes bounceIn {
  0% { opacity: 0; transform: scale(0.3) rotate(0deg); }
  50% { opacity: 1; transform: scale(1.1) rotate(180deg); }
  100% { opacity: 1; transform: scale(1) rotate(360deg); }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

@keyframes loadingDots {
  0%, 80%, 100% { opacity: 0; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

@keyframes floatUp {
  0% { opacity: 0.7; transform: translateY(100vh) rotate(0deg); }
  100% { opacity: 0; transform: translateY(-100px) rotate(360deg); }
}

/* 应用动画类 */
.fade-in { animation: fadeIn 1s ease-out; }
.slide-in-down { animation: slideInDown 0.8s ease-out; }
.slide-in-up { animation: slideInUp 0.8s ease-out 0.2s both; }
.card-enter { animation: cardEnter 0.6s ease-out both; }
.bounce-in { animation: bounceIn 1s ease-out; }
.pulse-btn:hover { animation: pulse 0.6s ease-in-out infinite; }

/* 全局容器 */
.container {
  min-height: 100vh;
  background: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', system-ui, sans-serif;
  position: relative;
  overflow-x: hidden;
}

/* 粒子背景 */
.particles {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.particle {
  position: absolute;
  background: rgba(34, 197, 94, 0.3);
  border-radius: 50%;
  animation: floatUp linear infinite;
}

/* 头部样式 - 改为汽车主题色 */
.app-header {
  text-align: center;
  padding: 60px 20px 40px;
  background: linear-gradient(135deg, #065f46 0%, #10b981 100%);
  color: white;
  margin-bottom: 40px;
  position: relative;
  z-index: 2;
  overflow: hidden;
}

.app-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  letter-spacing: -0.025em;
  position: relative;
  z-index: 3;
}

.app-desc {
  font-size: 1.1rem;
  opacity: 0.9;
  margin: 0 0 12px 0;
  font-weight: 400;
  position: relative;
  z-index: 3;
}

/* 连接状态指示器 */
.connection-status {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.3);
  transition: all 0.3s ease;
}

.connection-status.connected {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.3);
}

/* 主内容区域 */
.main-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px 60px;
  position: relative;
  z-index: 2;
}

/* 区块样式 */
.section {
  background: white;
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  position: relative;
  transition: all 0.3s ease;
}

.section:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 28px;
}

.section-icon {
  font-size: 2rem;
  flex-shrink: 0;
  margin-top: 4px;
  transition: all 0.3s ease;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 4px 0;
}

.section-subtitle {
  color: #6b7280;
  font-size: 0.95rem;
  margin: 0;
}

/* 策略选择器 */
.strategy-selector {
  margin-bottom: 24px;
}

:deep(.strategy-select) {
  width: 100%;
}

:deep(.strategy-select .el-input__wrapper) {
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  transition: all 0.3s ease;
}

:deep(.strategy-select .el-input__wrapper:hover) {
  border-color: #10b981;
}

/* 输入组样式 */
.input-group {
  margin-bottom: 24px;
}

.input-label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
  font-size: 0.95rem;
}

/* 快速问题 */
.quick-questions {
  margin-bottom: 24px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.quick-label {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 12px;
}

.quick-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.quick-btn {
  font-size: 12px;
  height: 28px;
  padding: 0 12px;
  transition: all 0.3s ease;
}

.quick-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

/* 自定义输入框 */
:deep(.animate-input .el-textarea__inner) {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  transition: all 0.3s ease;
  resize: vertical;
}

:deep(.animate-input .el-textarea__inner:focus) {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

/* 按钮样式 */
.action-btn {
  width: 100%;
  height: 48px;
  font-size: 15px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.primary-btn {
  background: linear-gradient(135deg, #10b981 0%, #065f46 100%);
  border: none;
}

.primary-btn:hover {
  background: linear-gradient(135deg, #059669 0%, #064e3b 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
}

.success-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
  border: none;
}

.success-btn:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
}

/* 加载动画 */
.loading-dots {
  display: inline-flex;
  gap: 4px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: loadingDots 1.4s ease-in-out infinite both;
}

.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }
.loading-dots span:nth-child(3) { animation-delay: 0s; }

/* 聊天历史 */
.chat-reveal-enter-active {
  transition: all 0.8s ease;
}

.chat-reveal-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
}

.chat-history {
  margin-top: 28px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.chat-title {
  font-weight: 500;
  color: #374151;
}

.chat-messages {
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
}

.chat-item {
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.chat-item-qa {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border-left: 4px solid #10b981;
}

.chat-item-system {
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
  font-style: italic;
}

.chat-question {
  margin-bottom: 12px;
  color: #1f2937;
}

.chat-answer {
  margin-bottom: 12px;
  color: #374151;
}

.answer-text {
  margin-top: 8px;
  line-height: 1.6;
  padding-left: 16px;
}

.chat-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #6b7280;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.chat-time {
  text-align: right;
  font-size: 11px;
  color: #9ca3af;
  margin-top: 8px;
}

/* 系统状态网格 */
.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
}

.status-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.status-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.status-info {
  flex: 1;
}

.status-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 2px;
}

.status-value {
  font-weight: 600;
  color: #ef4444;
}

.status-value.connected {
  color: #10b981;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-header {
    padding: 40px 20px 30px;
  }

  .app-title {
    font-size: 2rem;
  }

  .section {
    padding: 24px 20px;
    margin-bottom: 24px;
  }

  .quick-buttons {
    flex-direction: column;
  }

  .status-grid {
    grid-template-columns: 1fr;
  }

  .chat-meta {
    flex-direction: column;
    gap: 8px;
  }
}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #10b981, #065f46);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #059669, #064e3b);
}
</style>
