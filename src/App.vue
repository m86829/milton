<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { marked } from 'marked' 
import AboutView from './components/AboutView.vue'
import SolutionsView from './components/SolutionsView.vue'
import PortfolioView from './components/PortfolioView.vue'
import PersonalPortfolioView from './components/Personal-PortfolioView.vue'
import BlogView from './components/BlogView.vue'

function renderMarkdown(content: string) {
  return marked.parse(content)
}

// 5 個主分頁的順序定義
const tabs = ['about', 'solutions', 'home', 'portfolio', 'blog']
const activeTabIndex = ref(0) // 預設為首頁

const scrollerRef = ref<HTMLElement | null>(null)
const isNavVisible = ref(true)
let lastScrollY = 0
let isClickScrolling = false // 避免點擊按鈕平移時與滾動監聽互相干擾

// 🌟 新增：控制在文章詳情頁時是否凍結橫向滑動
const isScrollLocked = ref(false)
function handleToggleLockScroll(locked: boolean) {
  isScrollLocked.value = locked
}

// 當前頁面的 Banner 標題
const currentBannerTitle = computed(() => {
  const tab = tabs[activeTabIndex.value]
  if (tab === 'home') return 'WORK PORTFOLIO'
  if (tab === 'portfolio') return 'PERSONAL PORTFOLIO'
  if (tab === 'solutions') return 'SOLUTIONS & SERVICES'
  return tab.toUpperCase()
})

// 點擊頂部導覽按鈕
function changeTabByIndex(index: number) {
  activeTabIndex.value = index
  isClickScrolling = true
  
  if (scrollerRef.value) {
    const pageWidth = scrollerRef.value.clientWidth // 🌟 使用 clientWidth 消除滾輪差
    scrollerRef.value.scrollTo({
      left: index * pageWidth,
      behavior: 'smooth'
    })
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })

  setTimeout(() => {
    isClickScrolling = false
  }, 400)
}

// 橫向滑動監聽
function handleHorizontalScroll() {
  if (isClickScrolling || !scrollerRef.value) return
  const scrollLeft = scrollerRef.value.scrollLeft
  const pageWidth = scrollerRef.value.clientWidth // 🌟 使用 clientWidth
  if (pageWidth === 0) return

  const newIndex = Math.round(scrollLeft / pageWidth)
  
  if (newIndex >= 0 && newIndex < tabs.length && newIndex !== activeTabIndex.value) {
    activeTabIndex.value = newIndex
  }
}

// 智慧偵測垂直滾輪方向（向上顯現、向下隱藏導覽列）
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
  
  // 🌟 網頁一打開，定位在最外層的 ABOUT (Left 0)
  if (scrollerRef.value) {
    scrollerRef.value.scrollLeft = 0
  }

  // 背景喚醒 Render 伺服器
  fetch('https://milton-rag-api.onrender.com/').catch(() => {})
})

onUnmounted(() => { 
  window.removeEventListener('scroll', handleScroll) 
})

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
        <div class="nav-logo" @click="changeTabByIndex(0)">
          MILTON HSU
        </div>
        <div class="nav-right-side">
          <div class="nav-menu-horizontal">
            <button :class="{ active: activeTabIndex === 0 }" @click="changeTabByIndex(0)">ABOUT</button>
            <button :class="{ active: activeTabIndex === 1 }" @click="changeTabByIndex(1)">SOLUTIONS</button>
            <button :class="{ active: activeTabIndex === 2 }" @click="changeTabByIndex(2)">WORK PORTFOLIO</button>
            <button :class="{ active: activeTabIndex === 3 }" @click="changeTabByIndex(3)">PERSONAL PORTFOLIO</button>
            <button :class="{ active: activeTabIndex === 4 }" @click="changeTabByIndex(4)">BLOG</button>
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
        {{ currentBannerTitle }}
      </h1>
    </div>

    <!-- 🌟 核心：橫向分頁捲軸容器（平排 5 個頁面） -->
    <main 
      ref="scrollerRef" 
      class="main-scroller-container" 
      :class="{ 'snap-locked': isScrollLocked }"
      @scroll.passive="handleHorizontalScroll"
    >
      <!-- 1. ABOUT -->
      <section class="swipe-page-pane">
        <AboutView />
      </section>

      <!-- 2. SOLUTIONS -->
      <section class="swipe-page-pane">
        <SolutionsView />
      </section>

      <!-- 3. WORK PORTFOLIO -->
      <section class="swipe-page-pane">
        <PortfolioView />
      </section>

      <!-- 4. PERSONAL PORTFOLIO -->
      <section class="swipe-page-pane">
        <PersonalPortfolioView />
      </section>

      <!-- 5. BLOG -->
      <section class="swipe-page-pane blog-page-wrapper">
        <!-- 🌟 接收 BlogView 傳來的鎖定/解鎖通知 -->
        <BlogView @toggle-lock-scroll="handleToggleLockScroll" />
      </section>
    </main>

    <footer class="site-footer">
      <div>© 2026 MILTON-HSU All Rights Reserved. 聯絡信箱：m8682906@gmail.com</div>
    </footer>

    <!-- Milton AI 懸浮對話助理 -->
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
/* 🌟 1. 外層布局限制在 100% 寬度 */
.designer-layout {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

/* 橫向容器預設（桌機） */
.main-scroller-container {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: hidden; /* 電腦版平常不需要拖曳捲軸，靠點擊按鈕平移 */
  overflow-y: visible !important; /* 🌟 核心：桌機版高度隨內容撐開，絕不產生內層垂直滾輪 */
  box-sizing: border-box;
}

.swipe-page-pane {
  flex: 0 0 100% !important;
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box;
  overflow-y: visible !important; /* 🌟 確保分頁內容不產生內部滾輪 */
  overflow-x: hidden;
}

/* 🌟 只在行動端（手機/平板）開啟手勢水平吸附捲動 */
@media (max-width: 900px) {
  .main-scroller-container {
    overflow-x: scroll !important;
    overflow-y: hidden !important;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-x pan-y !important;
    overscroll-behavior-x: contain;
  }

  /* 🌟 新增：當處於文章閱讀狀態時，強制關閉橫向滾動與吸附 */
  .main-scroller-container.snap-locked {
    overflow-x: hidden !important;
    scroll-snap-type: none !important;
    touch-action: pan-y !important;
  }

  .swipe-page-pane {
    scroll-snap-align: start;
    scroll-snap-stop: always;
  }
}

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
    margin: 0 !important;
    padding: 0 !important;
    gap: 8px !important;
    box-sizing: border-box !important;
  }

  .nav-logo {
    display: block !important;
    width: 100% !important;
    text-align: center !important;
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

  .nav-menu-horizontal {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    white-space: nowrap;
    width: 100%;
    padding: 0 22px 4px 22px;
    box-sizing: border-box;
    -webkit-overflow-scrolling: touch;
  }

  .nav-menu-horizontal::-webkit-scrollbar {
    display: none;
  }

  .nav-menu-horizontal button {
    font-size: 0.82rem;
    padding: 4px 6px;
    flex-shrink: 0;
  }
}

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