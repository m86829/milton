<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { marked } from 'marked' 
import AboutView from './components/AboutView.vue'
import BlogView from './components/BlogView.vue'
import PortfolioView from './components/PortfolioView.vue'

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

onMounted(() => { window.addEventListener('scroll', handleScroll) })
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
    content: '您好！我是 Milton 的個人AI助理。您可以詢問我關於 Milton 的學歷、工作經歷、專業專案或遊戲成就等任何問題！'
  }
])

function toggleChat() {
  isChatOpen.value = !isChatOpen.value
  if (isChatOpen.value) {
    scrollToBottom()
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
    const res = await fetch('http://127.0.0.1:8000/api/chat', {
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
      content: '目前與 Milton 後端助理連線失敗，請確認後端服務 (Port 8000) 是否已啟動。'
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
      
      <!-- 1. ABOUT 頁面 (獨立元件引入) -->
      <div v-if="currentTab === 'about'" class="tab-content">
        <AboutView />
      </div>

      <!-- 2. SOLUTIONS 頁面 -->
      <div v-if="currentTab === 'solutions'" class="tab-content solutions-page-wrapper fade-in">
        <div class="solutions-header-block">
          <h2 class="solutions-main-title">讓專業內容被讀懂，讓數位體驗更流暢</h2>
          <p class="solutions-sub-desc">
            結合嚴謹的資訊架構重組、視覺引導與現代前端工程，專注為複雜簡報、學術報告與個人專案打造兼具美感與高效能的解答。
          </p>
        </div>

        <div class="solutions-grid">
          <div class="solution-card">
            <div class="card-num">01</div>
            <h3 class="solution-card-title">簡報與技術報告視覺重構</h3>
            <p class="solution-card-desc">
              針對密集的學術論文、科技部計畫、研究報告進行資訊分層重組。去除多餘贅飾，轉化為邏輯嚴謹、具高閱讀說服力的出版級成果。
            </p>
            <div class="solution-points">
              <span>✦ 階層化資訊提煉</span>
              <span>✦ 嚴謹視覺對比與易讀性</span>
              <span>✦ 出版級 PDF / 向量簡報</span>
            </div>
          </div>

          <div class="solution-card">
            <div class="card-num">02</div>
            <h3 class="solution-card-title">高效能互動前端架構</h3>
            <p class="solution-card-desc">
              運用 Vue 3 與現代前端工程實踐，專注處理巨量 DOM、PDF 向量渲染調優、視窗延遲加載（Lazy Load）與滾動流暢度，告別卡頓黑屏。
            </p>
            <div class="solution-points">
              <span>✦ 原生 PDF 嵌入性能優化</span>
              <span>✦ LRU 記憶體控制策略</span>
              <span>✦ 響應式流暢微互動體驗</span>
            </div>
          </div>

          <div class="solution-card">
            <div class="card-num">03</div>
            <h3 class="solution-card-title">自動化工作流與客製工具</h3>
            <p class="solution-card-desc">
              善用 AI 協同開發與自動化腳本，協助打造專屬自用工具、內容管線同步（如 Notion API）或批次資料轉換，將重複繁瑣工作降到最低。
            </p>
            <div class="solution-points">
              <span>✦ Notion API 自動化同步</span>
              <span>✦ 資源批次處理腳本</span>
              <span>✦ AI 協作敏捷實踐</span>
            </div>
          </div>
        </div>

        <section class="process-section">
          <h3 class="process-title">COLLABORATION PROCESS / 合作流程</h3>
          <div class="process-steps">
            <div class="step-item">
              <div class="step-badge">STEP 1</div>
              <h4>需求診斷</h4>
              <p>盤點現有檔案、目標受眾與核心痛點</p>
            </div>
            <div class="step-item">
              <div class="step-badge">STEP 2</div>
              <h4>架構規劃</h4>
              <p>梳理資訊層級、視覺規範或系統架構原型</p>
            </div>
            <div class="step-item">
              <div class="step-badge">STEP 3</div>
              <h4>精修實作</h4>
              <p>落實排版打磨、效能調校與邊界測試</p>
            </div>
            <div class="step-item">
              <div class="step-badge">STEP 4</div>
              <h4>驗收交付</h4>
              <p>完整檔案交付、原始碼部署與後續支援</p>
            </div>
          </div>
        </section>

        <section class="solutions-contact-cta">
          <div class="cta-inner-box">
            <h3>準備好讓你的內容更有影響力了嗎？</h3>
            <p>無論是學術簡報重構、網頁建置諮詢或技術合作，歡迎隨時與我聯繫交流。</p>
            <div class="contact-cards-container">
              <a href="mailto:m8682906@gmail.com" class="contact-card">
                <div class="card-icon"><i class="far fa-envelope"></i></div>
                <div class="card-details">
                  <h3>Mail</h3>
                  <p>m8682906@gmail.com</p>
                </div>
              </a>
            </div>
          </div>
        </section>
      </div>

      <!-- 3. WORK PORTFOLIO 頁面 -->
      <div v-if="currentTab === 'home'" class="tab-content fade-in">
         <PortfolioView />
      </div>

      <!-- 4. PERSONAL PORTFOLIO 頁面 -->
      <div v-if="currentTab === 'portfolio'" class="tab-content work-grid fade-in">
        <div class="work-item">
          <div class="work-preview-box" style="background-image: url('/.png'); background-size: cover; background-position: center;"></div>
          <div class="work-info">
            <h3>透過AI架免費的個人網站</h3>
            <div class="work-category">2026/5/26 透過與Gemini對話，從零開始架構網頁。</div>
          </div>
        </div>

        <a href="https://forum.gamer.com.tw/C.php?bsn=18966&snA=142042&tnum=1" target="_blank" class="work-item" style="text-decoration: none;">
          <div class="work-preview-box" style="background-image: url('/巴哈-火炮砲塔封面.png'); background-size: cover; background-position: center;"></div>
          <div class="work-info">
            <h3>巴哈姆特論壇 / 流亡黯道遊戲分享自製工具(剛發表)</h3>
            <div class="work-category">2026/1 手把手分享如何從0開始的攻略，深獲好評(網友留言稱讚我文章像論文)。</div>
            <div class="work-link" style="margin-top: 4px; font-weight: 600; color: #111111;">閱讀文章 ↗</div>
          </div>
        </a>

        <a href="https://forum.gamer.com.tw/C.php?bsn=18966&snA=141076" target="_blank" class="work-item" style="text-decoration: none;">
          <div class="work-preview-box" style="background-image: url('/巴哈-火炮砲塔封面.png'); background-size: cover; background-position: center;"></div>
          <div class="work-info">
            <h3>巴哈姆特論壇 / 流亡黯道遊戲流派發表 獲得552GP(讚)</h3>
            <div class="work-category">2026/1 手把手分享如何從0開始的攻略(網友稱讚像論文一樣嚴謹)。</div>
            <div class="work-link" style="margin-top: 4px; font-weight: 600; color: #111111;">閱讀文章 ↗</div>
          </div>
        </a>

        <div class="work-item">
          <div class="work-preview-box" style="background-image: url('/聯盟戰旗- 菁英.png'); background-size: cover; background-position: center;"></div>
          <div class="work-info">
            <h3>聯盟戰棋遊戲S14賽季「菁英」(前50玩家)</h3>
            <div class="work-category">2025/6 與當初FreeFire朋友，達成雙人搭檔模式「菁英」。</div>
          </div>
        </div>

        <a href="https://forum.gamer.com.tw/C.php?bsn=18966&snA=132958" target="_blank" class="work-item" style="text-decoration: none;">
          <div class="work-preview-box" style="background-image: url('/巴哈-3.21彈片砲塔.png'); background-size: cover; background-position: center;"></div>
          <div class="work-info">
            <h3>巴哈姆特論壇 / 流亡黯道遊戲流派發表 獲得519GP(讚)</h3>
            <div class="work-category">2023/8 手把手分享如何從0開始的攻略，廣獲網友好評(普遍文章為60GP左右)。</div>
            <div class="work-link" style="margin-top: 4px; font-weight: 600; color: #111111;">閱讀文章 ↗</div>
          </div>
        </a>

        <a href="https://www.youtube.com/@PinPonChuA" target="_blank" class="work-item" style="text-decoration: none;">
          <div class="work-preview-box" style="background-image: url('/桌球欸-1200DPI-橫.png'); background-size: cover; background-position: center;"></div>
          <div class="work-info">
            <h3>YouTuber / 曾多年為FreeFire遊戲官方名人堂之一</h3>
            <div class="work-category">2020/9/21創立頻道，2022/1達成6000訂閱，其中一部教學影片現達10萬觀看次數。此頻道旨在分享遊戲的高端技巧(本人曾台服CS模式百大榜第九/勝率85%)。</div>
            <div class="work-link" style="margin-top: 4px; font-weight: 600; color: #111111;">查看頻道 ↗</div>
          </div>
        </a>
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
      <!-- 展開後的對話面板 -->
      <transition name="chat-slide">
        <div v-if="isChatOpen" class="milton-chat-card">
          <!-- 頂部列 -->
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

          <!-- 對話訊息串流區 -->
          <div ref="chatMessagesRef" class="chat-messages-container">
            <div 
              v-for="(msg, mIdx) in messages" 
              :key="mIdx" 
              :class="['chat-bubble-wrapper', msg.role === 'user' ? 'bubble-user-wrap' : 'bubble-bot-wrap']"
            >
              <div class="chat-bubble markdown-body" v-html="renderMarkdown(msg.content)"></div>
            </div>

            <!-- 載入中動畫 -->
            <div v-if="isLoading" class="chat-bubble-wrapper bubble-bot-wrap">
              <div class="chat-bubble chat-loading">
                <span class="loading-dot"></span>
                <span class="loading-dot"></span>
                <span class="loading-dot"></span>
              </div>
            </div>
          </div>

          <!-- 底部輸入區域 -->
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

      <!-- 右下角觸發圓鈕 -->
      <button class="ai-launcher-btn" :class="{ 'btn-active': isChatOpen }" @click="toggleChat">
        <span v-if="!isChatOpen" class="launcher-icon">💬</span>
        <span v-else class="launcher-icon">✕</span>
        <span v-if="!isChatOpen" class="launcher-label">詢問 AI 助理</span>
      </button>
    </div>

  </div>
</template>

<style scoped>
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

/* ==================== SOLUTIONS 頁面樣式 ==================== */
.solutions-page-wrapper {
  max-width: 1080px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

.solutions-header-block {
  text-align: center;
  margin-bottom: 3.5rem;
}

.solutions-main-title {
  font-size: 2.2rem;
  font-weight: 800;
  color: #123247;
  margin-bottom: 1rem;
  letter-spacing: -0.02em;
}

.solutions-sub-desc {
  font-size: 1.15rem;
  color: #475569;
  line-height: 1.7;
  max-width: 780px;
  margin: 0 auto;
}

.solutions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 4rem;
}

.solution-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 2.2rem 1.8rem;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.solution-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.card-num {
  font-size: 1.2rem;
  font-weight: 800;
  color: #15803d;
  margin-bottom: 0.8rem;
  letter-spacing: 0.05em;
}

.solution-card-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1rem;
}

.solution-card-desc {
  font-size: 0.95rem;
  color: #64748b;
  line-height: 1.65;
  margin-bottom: 1.5rem;
  flex-grow: 1;
}

.solution-points {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding-top: 1rem;
  border-top: 1px dashed #e2e8f0;
}

.solution-points span {
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
}

.process-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 2.5rem 2rem;
  margin-bottom: 4rem;
}

.process-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #123247;
  text-align: center;
  margin-bottom: 2rem;
  letter-spacing: 0.04em;
}

.process-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.step-item {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem 1.25rem;
  text-align: center;
}

.step-badge {
  display: inline-block;
  background: #e2e8f0;
  color: #334155;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  margin-bottom: 0.75rem;
}

.step-item h4 {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.5rem;
}

.step-item p {
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.5;
}

.solutions-contact-cta {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 20px;
  padding: 3rem 2rem;
  text-align: center;
}

.cta-inner-box h3 {
  font-size: 1.7rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 0.6rem;
}

.cta-inner-box p {
  font-size: 1rem;
  color: #475569;
  margin-bottom: 2rem;
}
</style>