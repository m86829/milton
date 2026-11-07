<template>
  <section class="portfolio-container fade-in">
    <div class="portfolio-header">
      <h2 class="section-title">Work & Projects 精選作品</h2>
      <p class="section-desc">好的排版不只好看，更能讓內容被讀懂~</p>
    </div>

    <!-- 作品清單列表 -->
    <div class="projects-list">
      <div 
        v-for="project in projects" 
        :key="project.id" 
        :ref="el => setCardRef(project.id, el)"
        class="project-card"
        @mouseenter="handleMouseEnter(project.id)"
        @mouseleave="handleMouseLeave(project.id)"
      >
        <!-- 作品基本資訊 -->
        <div class="project-meta">
          <div class="project-tags">
            <span v-for="tag in project.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <h3 class="project-title">{{ project.title }}</h3>
          <p class="project-summary">{{ project.summary }}</p>
        </div>

        <!-- Before / After 左右對照包覆容器 -->
        <div class="comparison-wrapper">
          <div class="comparison-grid">
            <!-- 左側：改之前 (Before) -->
            <div class="comparison-column">
              <div class="column-header">
                <span v-if="project.before.title" class="custom-title">{{ project.before.title }}</span>
                <span class="badge badge-before">Before 改造前</span>
              </div>

              <div class="comparison-panel before-panel">
                <!-- 1. 底層：PDF iframe (進入視窗預載或已記錄在 LRU 記憶池中時常駐，保留滾動頁碼) -->
                <iframe 
                  v-if="isPdfLoaded(project.id) && project.before.pdfUrl" 
                  :src="formatPdfUrl(project.before.pdfUrl)"
                  class="doc-preview-frame"
                ></iframe>

                <!-- 2. 表層縮圖：非當前互動狀態時蓋在 iframe 上 -->
                <div 
                  v-if="!projectStates[project.id]?.isActive && project.before.previews && project.before.previews.length > 0"
                  class="preview-images-box"
                >
                  <img 
                    v-for="(pImg, idx) in project.before.previews" 
                    :key="idx" 
                    :src="pImg" 
                    class="preview-img" 
                    alt="Preview" 
                  />
                </div>

                <!-- 單純圖片備援 -->
                <div v-else-if="!project.before.pdfUrl && project.before.image" class="panel-img-box">
                  <img :src="project.before.image" :alt="project.before.title" />
                </div>
              </div>
            </div>

            <!-- 右側：改之後 (After) -->
            <div class="comparison-column">
              <div class="column-header">
                <span v-if="project.after.title" class="custom-title">{{ project.after.title }}</span>
                <span class="badge badge-after">After 修改後</span>
              </div>

              <div class="comparison-panel after-panel">
                <!-- 1. 底層：PDF iframe -->
                <iframe 
                  v-if="isPdfLoaded(project.id) && project.after.pdfUrl" 
                  :src="formatPdfUrl(project.after.pdfUrl)"
                  class="doc-preview-frame"
                ></iframe>

                <!-- 2. 表層縮圖：非當前互動狀態時蓋在 iframe 上 -->
                <div 
                  v-if="!projectStates[project.id]?.isActive && project.after.previews && project.after.previews.length > 0"
                  class="preview-images-box"
                >
                  <img 
                    v-for="(pImg, idx) in project.after.previews" 
                    :key="idx" 
                    :src="pImg" 
                    class="preview-img" 
                    alt="Preview" 
                  />
                </div>

                <!-- 單純圖片備援 -->
                <div v-else-if="!project.after.pdfUrl && project.after.image" class="panel-img-box">
                  <img :src="project.after.image" :alt="project.after.title" />
                </div>
              </div>
            </div>
          </div>

          <!-- 3-A. 初始遮罩：帶按鈕與說明文字 (從未點擊過時顯示) -->
          <div 
            v-if="!projectStates[project.id]?.hasInteracted" 
            class="global-dark-overlay initial-overlay"
            @click="handleClickInitial(project.id)"
          >
            <div class="overlay-btn-box">
              <span class="overlay-btn">點擊開啟左右對照</span>
              <p class="overlay-hint">點擊即可自由對照與翻閱兩份簡報</p>
            </div>
          </div>

          <!-- 3-B. 次級遮罩：滑鼠移出後的純黑 50% 遮罩 (無文字無按鈕，滑鼠一碰就自動消失) -->
          <div 
            v-else-if="!projectStates[project.id]?.isActive" 
            class="global-dark-overlay hover-unlock-overlay"
          ></div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import rawProjects from '../data/projects.json'

interface ComparisonSide {
  title: string
  description?: string
  points?: string[]
  image?: string
  pdfUrl?: string
  previews?: string[]
}

interface ProjectItem {
  id: string
  title: string
  summary: string
  tags: string[]
  before: ComparisonSide
  after: ComparisonSide
}

const projects = rawProjects as ProjectItem[]

// 管理每組卡片的互動狀態
interface ProjectState {
  isActive: boolean      // 當前是否處於「使用者正在互動中」（控制縮圖與遮罩的顯示與隱藏）
  hasInteracted: boolean // 是否已經被使用者首次點擊解鎖過
}

const projectStates = reactive<Record<string, ProjectState>>({})

projects.forEach((proj) => {
  projectStates[proj.id] = {
    isActive: false,
    hasInteracted: false
  }
})

// --- 記憶池與預載管理 ---
// 10 個 PDF 即代表 5 組 Before/After 專案
const MAX_SAVED_PROJECTS = 5 
// 儲存「有點過且最新」的專案佇列 (LRU)
const rememberedProjects = ref<string[]>([])
// 目前視窗內預載中的專案 ID（尚未點擊前暫存）
const visiblePrefetchProjects = ref<Set<string>>(new Set())

// 判斷該專案底層是否需要渲染 PDF iframe
const isPdfLoaded = (id: string) => {
  return rememberedProjects.value.includes(id) || visiblePrefetchProjects.value.has(id)
}

// 首次點擊卡片解鎖：帶有按鈕的遮罩消失，直接自由操作底下的 PDF
const handleClickInitial = (id: string) => {
  if (!projectStates[id]) return
  projectStates[id].isActive = true
  projectStates[id].hasInteracted = true

  // 移出預載暫存區，正式加入「被記住的 10 個 PDF 清單」
  visiblePrefetchProjects.value.delete(id)
  
  const index = rememberedProjects.value.indexOf(id)
  if (index !== -1) {
    rememberedProjects.value.splice(index, 1)
  }
  rememberedProjects.value.push(id)

  // 若記住的專案超過 5 組（10 個 PDF），銷毀最舊的一組
  if (rememberedProjects.value.length > MAX_SAVED_PROJECTS) {
    const evictedId = rememberedProjects.value.shift()
    if (evictedId && projectStates[evictedId]) {
      projectStates[evictedId].hasInteracted = false
      projectStates[evictedId].isActive = false
    }
  }
}

// 滑鼠滑入整張卡片：若以前已經解鎖過，直接自動撤除遮罩與縮圖，不需要點擊
const handleMouseEnter = (id: string) => {
  if (projectStates[id]?.hasInteracted) {
    projectStates[id].isActive = true
  }
}

// 滑鼠移出整張卡片：立刻蓋回次級黑色遮罩與縮圖，但底層 iframe 完好保留剛剛的滾動進度
const handleMouseLeave = (id: string) => {
  if (projectStates[id]) {
    projectStates[id].isActive = false
  }
}

// 格式化 PDF 網址
const formatPdfUrl = (url?: string) => {
  if (!url) return ''
  return url.includes('#') ? url : `${url}#view=FitH&toolbar=0`
}

// --- IntersectionObserver：進入可視範圍自動加載，未點擊離開則刪除 ---
const cardElements = new Map<string, HTMLElement>()
let observer: IntersectionObserver | null = null

const setCardRef = (id: string, el: any) => {
  if (el) {
    cardElements.set(id, el as HTMLElement)
  } else {
    cardElements.delete(id)
  }
}

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      let targetId = ''
      for (const [id, el] of cardElements.entries()) {
        if (el === entry.target) {
          targetId = id
          break
        }
      }
      if (!targetId) return

      if (entry.isIntersecting) {
        // 卡片進入視窗：如果在記憶池外，則加入預載暫存區
        if (!rememberedProjects.value.includes(targetId)) {
          visiblePrefetchProjects.value.add(targetId)
        }
      } else {
        // 卡片離開視窗：若未曾被使用者點進去（不在記憶池中），自動刪除釋放記憶體
        if (!rememberedProjects.value.includes(targetId)) {
          visiblePrefetchProjects.value.delete(targetId)
        }
      }
    })
  }, { rootMargin: '200px 0px' })

  cardElements.forEach((el) => observer?.observe(el))
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<style scoped>
.portfolio-container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

.portfolio-header {
  margin-bottom: 2.5rem;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #123247;
  margin-bottom: 0.5rem;
}

.section-desc {
  color: #144f77;
  font-size: 1.5rem;
  line-height: 1.7;
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.project-card {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 2rem 1.75rem;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.project-meta {
  margin-bottom: 1.5rem;
}

.project-tags {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.tag {
  background: #e2e8f0;
  color: #475569;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.project-title {
  font-size: 2rem;
  text-align: center;
  font-weight: 700;
  color: #1f2638;
  margin-bottom: 2rem;
}

.project-summary {
  color: #475569;
  font-size: 0.95rem;
  line-height: 1.5;
}

/* 雙欄對照整體包覆容器 */
.comparison-wrapper {
  position: relative;
  width: 100%;
}

/* 雙欄對照網格 */
.comparison-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

.column-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  margin-bottom: 0.05rem;
}

.custom-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 1.15rem;
  border-radius: 9999px;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.badge-before {
  background-color: #ffffff;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.badge-after {
  background-color: #ffffff;
  color: #15803d;
  border: 1px solid #15803d;
}

@media (max-width: 768px) {
  .comparison-grid {
    grid-template-columns: 1fr;
  }
}

.comparison-panel {
  border-radius: 12px;
  padding: 1.25rem;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 520px;
  box-sizing: border-box;
  overflow: hidden;
}

.before-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
}

.after-panel {
  background: #f0fdf4;
  border: 1px solid #c8fcdb;
}

/* 原生向量 PDF iframe (底層) */
.doc-preview-frame {
  position: absolute;
  top: 1.25rem;
  left: 1.25rem;
  right: 1.25rem;
  bottom: 1.25rem;
  width: calc(100% - 2.5rem);
  height: calc(100% - 2.5rem);
  border: none;
  display: block;
  background-color: #525659;
  border-radius: 8px;
  z-index: 1;
}

/* 表層前兩頁縮圖 */
.preview-images-box {
  position: absolute;
  top: 1.25rem;
  left: 1.25rem;
  right: 1.25rem;
  bottom: 1.25rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 2;
  background: inherit;
}

.preview-img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.panel-img-box img {
  width: 100%;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  border: 1px solid #e2e8f0;
}

/* ================= 橫跨左右的 50% 黑色半透明遮罩 ================= */
.global-dark-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.5); /* 50% 黑色半透明 */
  backdrop-filter: blur(2px);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  transition: opacity 0.25s ease, background 0.25s ease;
}

/* 初始帶按鈕的遮罩：需要手型游標與懸停反饋 */
.initial-overlay {
  cursor: pointer;
}

.initial-overlay:hover {
  background: rgba(15, 23, 42, 0.4);
}

.overlay-btn-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
}

.overlay-btn {
  background: #ffffff;
  color: #0f172a;
  padding: 0.75rem 1.6rem;
  border-radius: 9999px;
  font-size: 1.05rem;
  font-weight: 700;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease;
}

.initial-overlay:hover .overlay-btn {
  transform: scale(1.06);
}

.overlay-hint {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.85rem;
  letter-spacing: 0.02em;
}

/* 次級純淨遮罩：無任何文字與按鈕，純作為滑出後的保護層 */
.hover-unlock-overlay {
  cursor: default;
}

.fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>