<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { marked } from 'marked' 
import AboutView from './components/AboutView.vue'
import SolutionsView from './components/SolutionsView.vue'
import PortfolioView from './components/PortfolioView.vue'
import PersonalPortfolioView from './components/Personal-PortfolioView.vue'
import BlogView from './components/BlogView.vue'

function renderMarkdown(content: string) {
  return marked.parse(content)
}

// 預設首頁為 WORK PORTFOLIO
const currentTab = ref('home')
const isNavVisible = ref(true)
let lastScrollY = 0

function changeTab(tabName: string) {
  currentTab.value = tabName
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 智慧偵測滾輪方向
function handleScroll() {
  const currentScrollY = window.scrollY
  if (currentScrollY < 50) {
    isNavVisible.value = true
  } else if (currentScrollY > lastScrollY) {
    isNavVisible.value = false
  } else {
    isNavVisible.value = true
  }
  lastScrollY = currentScrollY
}

onMounted(() => { 
  window.addEventListener('scroll', handleScroll) 
  
  // 網頁載入時，背景偷偷發送輕量請求喚醒 Render 伺服器（不消耗 Gemini API 額度）
  fetch('https://milton-rag-api.onrender.com/').catch(() => {
    // 靜默處理，不中斷任何前端運作、不跳錯誤提示
  })
})
onUnmounted(() => { window.removeEventListener('scroll', handleScroll) })

function getBannerTitle(tab: string) {
  if (tab === 'home') return 'WORK PORTFOLIO'
  if (tab === 'portfolio') return 'PERSONAL PORTFOLIO'
  if (tab === 'solutions') return 'SOLUTIONS & SERVICES'
  return tab.toUpperCase()
}

// ==================== Milton AI 助理互動邏輯 ====================
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const isChatOpen = ref(false)
const inputMessage = ref('')
const isLoading = ref(false)
const chatMessagesRef = ref<HTMLElement | null>(null)

const messages = ref<ChatMessage[]>([
  {
    role: 'assistant',
    content: '您好！我是 Milton 的個人AI助理。您可以詢問我關於 Milton 的學歷、工作經歷、專業專案等問題！\n\n*(💡 提示：若雲端伺服器處於待機狀態，首次發問需等待約 30~50 秒喚醒，感謝您的耐心等候！)*'
  }
])

let hasPrewarmed = false

function toggleChat() {
  isChatOpen.value = !isChatOpen.value
  if (isChatOpen.value) {
    scrollToBottom()

    if (!hasPrewarmed) {
      hasPrewarmed = true
      fetch('https://milton-rag-api.onrender.com/').catch(() => {})
    }
  }
}

async function scrollToBottom() {
  await nextTick()
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
  }
}

async function handleSendMessage() {
  const query = inputMessage.value.trim()
  if (!query || isLoading.value) return

  messages.value.push({ role: 'user', content: query })
  inputMessage.value = ''
  isLoading.value = true
  scrollToBottom()

  try {
    const res = await fetch('https://milton-rag-api.onrender.com/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: query })
    })

    if (!res.ok) {
      throw new Error(`伺服器回應錯誤 (${res.status})`)
    }

    const data = await res.json()
    messages.value.push({
      role: 'assistant',
      content: data.answer || '抱歉，目前暫時無法取得回答。'
    })
  } catch (err: any) {
    messages.value.push({
      role: 'assistant',
      content: '目前與雲端 AI 助理連線逾時或失敗，請稍候片刻重新整理後再試一次。'
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}
</script>

<template>
  <div class="designer-layout">
    
    <nav class="navbar" :class="{ 'nav-hidden': !isNavVisible, 'nav-scrolled': lastScrollY > 20 }">
      <div class="nav-container">
        <div class="nav-logo" @click="changeTab('home')">
          MILTON HSU
        </div>
        <div class="nav-right-side">
          <div class="nav-menu-horizontal">
            <button :class="{ active: currentTab === 'about' }" @click="changeTab('about')">ABOUT</button>
            <button :class="{ active: currentTab === 'solutions' }" @click="changeTab('solutions')">SOLUTIONS</button>
            <button :class="{ active: currentTab === 'home' }" @click="changeTab('home')">WORK PORTFOLIO</button>
            <button :class="{ active: currentTab === 'portfolio' }" @click="changeTab('portfolio')">PERSONAL PORTFOLIO</button>
            <button :class="{ active: currentTab === 'blog' }" @click="changeTab('blog')">BLOG</button>
          </div>
          <div class="nav-social">
            <a href="https://www.instagram.com/chengyi_hsich" target="_blank"><i class="fab fa-instagram"></i></a>
          </div>
        </div>
      </div>
    </nav>

    <div class="page-banner">
      <div class="banner-overlay"></div>
      <h1 class="banner-title">
        {{ getBannerTitle(currentTab) }}
      </h1>
    </div>

    <main class="main-content">
      
      <!-- 1. ABOUT 頁面 -->
      <div v-if="currentTab === 'about'" class="tab-content">
        <AboutView />
      </div>

      <!-- 2. SOLUTIONS 頁面 -->
      <div v-if="currentTab === 'solutions'" class="tab-content">
        <SolutionsView />
      </div>

      <!-- 3. WORK PORTFOLIO 頁面 -->
      <div v-if="currentTab === 'home'" class="tab-content fade-in">
        <PortfolioView />
      </div>

      <!-- 4. PERSONAL PORTFOLIO 頁面 (獨立元件引入) -->
      <div v-if="currentTab === 'portfolio'" class="tab-content">
        <PersonalPortfolioView />
      </div>

      <!-- 5. BLOG 頁面 -->
      <div v-if="currentTab === 'blog'" class="tab-content blog-page-wrapper fade-in">
        <BlogView />
      </div>

    </main>

    <footer class="site-footer">
      <div>© 2026 MILTON-HSU All Rights Reserved. 聯絡信箱：m8682906@gmail.com</div>
    </footer>

    <!-- ==================== Milton AI 懸浮對話助理元件 ==================== -->
    <div class="milton-ai-widget">
      <transition name="chat-slide">
        <div v-if="isChatOpen" class="milton-chat-card">
          <div class="chat-header">
            <div class="chat-header-title">
              <span class="chat-status-dot"></span>
              <div>
                <div class="title-main">Milton AI 助理</div>
                <div class="title-sub">RAG 履歷即時知識庫</div>
              </div>
            </div>
            <button class="chat-close-btn" @click="toggleChat" title="關閉視窗">✕</button>
          </div>

          <div ref="chatMessagesRef" class="chat-messages-container">
            <div 
              v-for="(msg, mIdx) in messages" 
              :key="mIdx" 
              :class="['chat-bubble-wrapper', msg.role === 'user' ? 'bubble-user-wrap' : 'bubble-bot-wrap']"
            >
              <div class="chat-bubble markdown-body" v-html="renderMarkdown(msg.content)"></div>
            </div>

            <div v-if="isLoading" class="chat-bubble-wrapper bubble-bot-wrap">
              <div class="chat-bubble chat-loading">
                <span class="loading-dot"></span>
                <span class="loading-dot"></span>
                <span class="loading-dot"></span>
              </div>
            </div>
          </div>

          <div class="chat-input-area">
            <input 
              v-model="inputMessage" 
              type="text" 
              placeholder="詢問 Milton 的學歷、經歷、作品..." 
              :disabled="isLoading"
              @keyup.enter="handleSendMessage"
            />
            <button 
              class="chat-send-btn" 
              :disabled="isLoading || !inputMessage.trim()" 
              @click="handleSendMessage"
            >
              發送
            </button>
          </div>
        </div>
      </transition>

      <button class="ai-launcher-btn" :class="{ 'btn-active': isChatOpen }" @click="toggleChat">
        <span v-if="!isChatOpen" class="launcher-icon">💬</span>
        <span v-else class="launcher-icon">✕</span>
        <span v-if="!isChatOpen" class="launcher-label">詢問 AI 助理</span>
      </button>
    </div>

  </div>
</template>

<style scoped>

/* ==================== 全域版面與防溢出保護 ==================== */
.designer-layout {
  width: 100%;
  /* 🌟 修正 1：移除 max-width: 100vw，改用 100%，避免 vw 計算包含滾輪寬度導致右側溢出 */
  max-width: 100%;
  /* 🌟 修正 2：明確限制 overflow-y 不生成滾動條，讓整頁垂直滾輪統一由 window 控管 */
  overflow-x: clip; /* 現代瀏覽器防橫向溢出首選，不觸發多餘 scroll container */
  box-sizing: border-box;
}

.main-content {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: clip;
}

/* ==================== 頂部導覽列手機適配 ==================== */
@media (max-width: 768px) {
  .navbar {
    width: 100% !important;
    max-width: 100vw !important;
    padding: 10px 0 6px 0 !important;
    box-sizing: border-box !important;
  }

  .nav-container {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;        /* 清除桌機版留下的邊界偏移 */
    padding: 0 !important;       /* 清除桌機版留下的左右內距 */
    gap: 8px !important;
    box-sizing: border-box !important;
  }

  .nav-logo {
    display: block !important;
    width: 100% !important;
    text-align: center !important; /* 確保文本以整螢幕寬度為基準居中 */
    margin: 0 auto !important;
    padding: 0 !important;
    font-size: 1.15rem !important;
    font-weight: 800 !important;
    letter-spacing: 0.05em;
  }

  .nav-right-side {
    width: 100%;
    display: flex;
    justify-content: flex-start;
  }

  /* 核心 3：左右兩側都有舒適的邊界，開頭 ABOUT 不會被截掉，結尾也不貼邊 */
  .nav-menu-horizontal {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    white-space: nowrap;
    width: 100%;
    padding: 0 22px 4px 22px; /* 上 0, 右 22px, 下 4px, 左 22px */
    box-sizing: border-box;
    -webkit-overflow-scrolling: touch;
  }

  /* 隱藏滾動條維持簡潔 */
  .nav-menu-horizontal::-webkit-scrollbar {
    display: none;
  }

  .nav-menu-horizontal button {
    font-size: 0.82rem;
    padding: 4px 6px;
    flex-shrink: 0;
  }
}

/* ==================== Milton AI 浮動按鈕與聊天視窗樣式 ==================== */
.milton-ai-widget {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-family: inherit;
}

.ai-launcher-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #123247;
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 9999px;
  padding: 12px 20px;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(18, 50, 71, 0.28);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.ai-launcher-btn:hover {
  background: #15803d;
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(21, 128, 61, 0.35);
}

.ai-launcher-btn.btn-active {
  background: #475569;
  padding: 12px 16px;
}

.launcher-icon {
  font-size: 1.1rem;
}

.milton-chat-card {
  width: 380px;
  height: 520px;
  max-width: calc(100vw - 48px);
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.16);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-bottom: 14px;
}

.chat-header {
  background: #123247;
  color: #ffffff;
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #15803d;
}

.chat-header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-status-dot {
  width: 9px;
  height: 9px;
  background: #22c55e;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.35);
}

.title-main {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
}

.title-sub {
  font-size: 0.72rem;
  color: #cbd5e1;
  letter-spacing: 0.02em;
}

.chat-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  transition: color 0.15s ease;
}

.chat-close-btn:hover {
  color: #ffffff;
}

.chat-messages-container {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f8fafc;
}

.chat-bubble-wrapper {
  display: flex;
  width: 100%;
}

.bubble-user-wrap {
  justify-content: flex-end;
}

.bubble-bot-wrap {
  justify-content: flex-start;
}

.chat-bubble {
  max-width: 82%;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: normal;
  word-break: break-word;
}

.bubble-user-wrap .chat-bubble {
  background: #123247;
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.bubble-bot-wrap .chat-bubble {
  background: #ffffff;
  color: #1e293b;
  border: 1px solid #e2e8f0;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.chat-bubble.markdown-body :deep(p) {
  margin: 0 0 0.1rem 0;
}

.chat-bubble.markdown-body :deep(p:last-child) {
  margin-bottom: 0 !important;
}

.chat-bubble.markdown-body :deep(ul),
.chat-bubble.markdown-body :deep(ol) {
  margin: 0.3rem 0;
  padding-left: 1.2rem;
}

.chat-bubble.markdown-body :deep(ul:last-child),
.chat-bubble.markdown-body :deep(ol:last-child) {
  margin-bottom: 0 !important;
}

.chat-bubble.markdown-body :deep(li) {
  margin-bottom: 0.1rem;
}

.chat-bubble.markdown-body :deep(strong) {
  font-weight: 700;
  color: #0f172a;
}

.bubble-user-wrap .chat-bubble.markdown-body :deep(strong) {
  color: #ffffff;
}

.chat-loading {
  display: flex;
  gap: 5px;
  padding: 12px 16px;
  align-items: center;
}

.loading-dot {
  width: 6px;
  height: 6px;
  background: #15803d;
  border-radius: 50%;
  animation: typingBounce 1.4s infinite ease-in-out both;
}

.loading-dot:nth-child(1) { animation-delay: -0.32s; }
.loading-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes typingBounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.chat-input-area {
  display: flex;
  gap: 8px;
  padding: 12px 14px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
}

.chat-input-area input {
  flex: 1;
  padding: 9px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.88rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.chat-input-area input:focus {
  border-color: #15803d;
}

.chat-send-btn {
  background: #15803d;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0 16px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease;
}

.chat-send-btn:hover:not(:disabled) {
  background: #166534;
}

.chat-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-slide-enter-active,
.chat-slide-leave-active {
  transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.chat-slide-enter-from,
.chat-slide-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}

@media (max-width: 480px) {
  .milton-chat-card {
    width: calc(100vw - 32px);
    height: 75vh;
  }
}
</style>