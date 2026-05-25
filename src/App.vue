<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const currentTab = ref('home')
const isNavVisible = ref(true) // 控制導覽列顯示或隱藏
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
    isNavVisible.value = false // 往下滑 -> 隱藏
  } else {
    isNavVisible.value = true  // 往上滑 -> 出現
  }
  lastScrollY = currentScrollY
}

onMounted(() => { window.addEventListener('scroll', handleScroll) })
onUnmounted(() => { window.removeEventListener('scroll', handleScroll) })
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
            <button :class="{ active: currentTab === 'home' }" @click="changeTab('home')">WORK</button>
            <button :class="{ active: currentTab === 'skills' }" @click="changeTab('skills')">TECH</button>
            <button :class="{ active: currentTab === 'about' }" @click="changeTab('about')">ABOUT</button>
            <button @click.prevent>CONTACT</button>
          </div>
          <div class="nav-social">
            <a href="#" target="_blank"><i class="fab fa-instagram"></i></a>
          </div>
        </div>
      </div>
    </nav>

    <div class="page-banner">
      <div class="banner-overlay"></div>
      <h1 class="banner-title">
        {{ currentTab === 'home' ? 'WORK' : currentTab.toUpperCase() }}
      </h1>
    </div>

    <header v-if="currentTab === 'home'" class="hero-section fade-in">
      <h1 class="hero-title">
        Milton Hsu interacts with digital transformation, logic formulas, and automated web systems.
      </h1>
      <p class="hero-desc">
        專注於 Vue 3、TypeScript 前端架構與自動化控制指令整合，將錯綜複雜的底層邏輯，收斂為極致流暢的數位體驗。
      </p>
    </header>

    <main class="main-content">
      
      <div v-if="currentTab === 'home'" class="tab-content work-grid fade-in">
        
        <div class="work-item">
          <div class="work-preview-box">01</div>
          <div class="work-info">
            <h3>PoE Mana & 時序對齊計算器</h3>
            <div class="work-category">Web Application / Hardcore Game Tool (2026)</div>
            <a href="https://my-exile-tool.pages.dev/" target="_blank" class="work-link">Launch Project ↗</a>
          </div>
        </div>

        <div class="work-item">
          <div class="work-preview-box">02</div>
          <div class="work-info">
            <h3>智慧社區章程管理看板</h3>
            <div class="work-category">Administrative Automation / Planning</div>
            <span class="work-category" style="font-style: italic;">Coming Soon</span>
          </div>
        </div>

      </div>

      <div v-if="currentTab === 'skills'" class="tab-content work-grid fade-in">
        <div class="work-item">
          <div class="work-preview-box">V3</div>
          <div class="work-info">
            <h3>Vue 3 & TypeScript 前端核心</h3>
            <div class="work-category">遵守 Floor ➔ Ceiling ➔ Round 嚴格階梯四捨五入算法，確保數據與伺服器 Tick 絕對同步。</div>
          </div>
        </div>

        <div class="work-item">
          <div class="work-preview-box">AHK</div>
          <div class="work-info">
            <h3>AutoHotKey / 腳本自動化</h3>
            <div class="work-category">開發高靈敏度即時環境偵測與自動化調度程序，消除行政與日常操作中的無效冗餘。</div>
          </div>
        </div>

        <div class="work-item">
          <div class="work-preview-box">CF</div>
          <div class="work-info">
            <h3>Cloudflare Serverless 雲端部署</h3>
            <div class="work-category">熟練運用 Workers 及 Pages 分發靜態與動態邏輯，建構零維護成本的現代化高防禦網站。</div>
          </div>
        </div>
      </div>

      <div v-if="currentTab === 'about'" class="tab-content about-page-wrapper fade-in">
        
        <section class="about-profile-section">
          <div class="profile-left-content">
            <h2 class="about-sub-title">PROFILE</h2>
            <h3 class="profile-name">徐銘儀 <span class="en-name">Milton Hsu</span></h3>
            <div class="profile-description">
              <p>專注於現代前端網頁開發、自動化系統整合與底層數據模型建構。具備獨立專案協調與自定義腳本開發經驗，擅長深入剖析複雜規則，並將其收斂至高效流暢的數位工具中。</p>
              <p>熱衷於流程自動化研究，不論是精確推演硬核遊戲中每 0.033 秒一個 Tick 的數據齒輪咬合（如開發精準對齊的魔力時序計算器），還是協助推動中小型住宅社區的現代化管理章程與行政調度，都是我實踐技術價值的舞台。</p>
            </div>
            
            <div class="profile-meta-grid">
              <div class="meta-label">技術特長</div>
              <div class="meta-value">Vue 3 / TypeScript / Vite<br>Cloudflare Workers & Pages / AHK 自動化腳本</div>
            </div>

            <div class="resume-download-box">
              <h4 class="resume-title">Resume</h4>
              <div class="resume-action-row">
                <span class="resume-lang">個人履歷與技術白皮書（繁體中文）</span>
                <a href="#" class="btn-download" @click.prevent>下載</a>
              </div>
            </div>
          </div>

          <div class="profile-right-image">
            <div class="image-placeholder-box">
              <span>個人照片預留區<br>(1:1.3 完美直式比例)</span>
            </div>
          </div>
        </section>

        <section class="about-grid-section">
          <div class="grid-column">
            <h2 class="about-sub-title">EXPERIENCE</h2>
            <div class="timeline-item">
              <div class="timeline-date">2026 年 - 至今</div>
              <div class="timeline-title">產業數位轉型與自動化系統協調</div>
              <div class="timeline-desc">負責行政自動化調度、專案成員看板建構，專注於消除組織日常營運中的無效冗餘流程。</div>
            </div>
            <div class="timeline-item">
              <div class="timeline-date">2025 年 - 2026 年</div>
              <div class="timeline-title">獨立 Web 工具開發 / 數值模型研究</div>
              <div class="timeline-desc">研析硬核遊戲底層運算時序，獨立打造階梯式算法計算器，並運用 Serverless 雲端無伺服器架構完成部署。</div>
            </div>
          </div>

          <div class="grid-column">
            <h2 class="about-sub-title">EDUCATION & CERTIFICATE</h2>
            <div class="timeline-item">
              <div class="timeline-date">專業認證培訓</div>
              <div class="timeline-title">iPAS AI 應用企劃師</div>
              <div class="timeline-desc">深研結構化數據分析、混淆矩陣指標模型與現代專案管理架構。</div>
            </div>
          </div>
        </section>

        <section class="about-skills-section">
          <h2 class="about-sub-title">SKILLS / 專業技能</h2>
          <div class="skills-detail-grid">
            <div class="skill-detail-card">
              <h4>跨領域協作與介面建構</h4>
              <p>利用 Vue 3 Composition API 與嚴謹的 TypeScript 結構，建立兼具高易用性與極致防呆機制的現代網頁系統。</p>
            </div>
            <div class="skill-detail-card">
              <h4>自動化指令與腳本編寫</h4>
              <p>熟練編寫高靈敏度環境即時偵測與系統調度程序，協助迴避無謂的重複性人工操作，達成環境徹底自動化。</p>
            </div>
          </div>
        </section>

      </div>

    </main>

    <footer class="site-footer">
      <div>© 2026 MILTON HSU.</div>
      <div>Designed via Minimalist Paradigm.</div>
    </footer>
  </div>
</template>