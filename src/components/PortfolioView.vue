<template>
  <section class="portfolio-container fade-in">
    <div class="portfolio-header">
      <h2 class="section-title">精選作品</h2>
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
          <div class="project-tags" v-if="project.tags && project.tags.length">
            <span v-for="tag in project.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <h3 class="project-title">{{ project.title }}</h3>
          <p class="project-summary" v-if="project.summary">{{ project.summary }}</p>
        </div>

        <!-- 內容容器：依據是否有 Before 自動切換單欄/雙欄 -->
        <div class="comparison-wrapper">
          <div class="comparison-grid" :class="{ 'single-column-grid': !hasBefore(project) }">
            
            <!-- 左側：改之前 (Before) - 僅在雙欄時顯示 -->
            <div v-if="hasBefore(project)" class="comparison-column">
              <div class="column-header">
                <span v-if="project.before?.title" class="custom-title">{{ project.before.title }}</span>
                <span class="badge badge-before">Before 改造前</span>
              </div>

              <div class="comparison-panel before-panel">
                <!-- 1. YouTube 影片 -->
                <div v-if="isYoutube(project.before)" class="video-container">
                  <iframe 
                    :src="getYoutubeEmbedUrl(getMediaUrl(project.before))" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowfullscreen
                    class="media-frame"
                  ></iframe>
                </div>

                <!-- 2. PDF 文件預覽 -->
                <template v-else-if="isPdf(project.before)">
                  <iframe 
                    v-if="isPdfLoaded(project.id)" 
                    :src="formatPdfUrl(getMediaUrl(project.before))"
                    class="doc-preview-frame"
                  ></iframe>

                  <!-- 表層多頁縮圖 (未互動時蓋在上方保護效能) -->
                  <div 
                    v-if="!projectStates[project.id]?.isActive && project.before?.previews && project.before.previews.length > 0"
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
                </template>

                <!-- 3. 單張圖片 -->
                <div v-else-if="isImage(project.before)" class="panel-img-box">
                  <img :src="getMediaUrl(project.before)" :alt="project.before?.title || project.title" />
                </div>
              </div>
            </div>

            <!-- 右側：改之後 (After) / 單欄精選成果 -->
            <div class="comparison-column">
              <div class="column-header" v-if="project.after?.title || hasBefore(project)">
                <span v-if="project.after?.title" class="custom-title">{{ project.after.title }}</span>
                <span v-if="hasBefore(project)" class="badge badge-after">After 修改後</span>
              </div>

              <div class="comparison-panel after-panel">
                <!-- 1. YouTube 影片 -->
                <div v-if="isYoutube(project.after)" class="video-container">
                  <iframe 
                    :src="getYoutubeEmbedUrl(getMediaUrl(project.after))" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowfullscreen
                    class="media-frame"
                  ></iframe>
                </div>

                <!-- 2. PDF 文件預覽 -->
                <template v-else-if="isPdf(project.after)">
                  <iframe 
                    v-if="isPdfLoaded(project.id)" 
                    :src="formatPdfUrl(getMediaUrl(project.after))"
                    class="doc-preview-frame"
                  ></iframe>

                  <!-- 表層多頁縮圖 (未互動時蓋在上方保護效能) -->
                  <div 
                    v-if="!projectStates[project.id]?.isActive && project.after?.previews && project.after.previews.length > 0"
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
                </template>

                <!-- 3. 單張圖片 -->
                <div v-else-if="isImage(project.after)" class="panel-img-box">
                  <img :src="getMediaUrl(project.after)" :alt="project.after?.title || project.title" />
                </div>
              </div>
            </div>

          </div>

          <!-- 遮罩層：只要包含 PDF 文件（無論單欄或雙欄）就提供點擊防誤觸保護 -->
          <template v-if="hasPdfInProject(project)">
            <!-- 初始帶按鈕與說明的遮罩 -->
            <div 
              v-if="!projectStates[project.id]?.hasInteracted" 
              class="global-dark-overlay initial-overlay"
              @click="handleClickInitial(project.id)"
            >
              <div class="overlay-btn-box">
                <span class="overlay-btn">
                  {{ hasBefore(project) ? '點擊開啟左右對照' : '點擊開啟文件閱覽' }}
                </span>
                <p class="overlay-hint">
                  {{ hasBefore(project) ? '點擊即可自由對照與翻閱兩份簡報' : '點擊即可自由滾動與翻閱文件' }}
                </p>
              </div>
            </div>

            <!-- 次級純淨 50% 黑色遮罩 (滑鼠滑出時保護) -->
            <div 
              v-else-if="!projectStates[project.id]?.isActive" 
              class="global-dark-overlay hover-unlock-overlay"
            ></div>
          </template>

        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import rawProjects from '../data/projects.json'

interface ComparisonSide {
  title?: string
  description?: string
  points?: string[]
  image?: string
  pdfUrl?: string
  url?: string
  file?: string
  previews?: string[]
}

interface ProjectItem {
  id: string
  title: string
  summary?: string
  tags?: string[]
  before?: ComparisonSide
  after: ComparisonSide
}

const projects = rawProjects as ProjectItem[]

interface ProjectState {
  isActive: boolean
  hasInteracted: boolean
}

const projectStates = reactive<Record<string, ProjectState>>({})

projects.forEach((proj) => {
  projectStates[proj.id] = {
    isActive: false,
    hasInteracted: false
  }
})

const getMediaUrl = (side?: ComparisonSide): string => {
  if (!side) return ''
  return side.url || side.pdfUrl || side.file || side.image || ''
}

const isYoutube = (side?: ComparisonSide): boolean => {
  const url = getMediaUrl(side)
  return /youtube\.com|youtu\.be/i.test(url)
}

const isPdf = (side?: ComparisonSide): boolean => {
  const url = getMediaUrl(side)
  if (!url || isYoutube(side)) return false
  return /\.pdf($|[?#])/i.test(url)
}

const isImage = (side?: ComparisonSide): boolean => {
  const url = getMediaUrl(side)
  if (!url || isYoutube(side) || isPdf(side)) return false
  return /\.(png|jpe?g|webp|gif|svg)($|[?#])/i.test(url) || Boolean(side?.image)
}

const getYoutubeEmbedUrl = (url: string): string => {
  if (!url) return ''
  let videoId = ''
  if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split(/[?#]/)[0]
  } else if (url.includes('watch?v=')) {
    videoId = url.split('watch?v=')[1]?.split(/[&#]/)[0]
  } else if (url.includes('embed/')) {
    videoId = url.split('embed/')[1]?.split(/[?#]/)[0]
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0` : url
}

const hasBefore = (project: ProjectItem): boolean => {
  if (!project.before) return false
  const url = getMediaUrl(project.before)
  const hasPreviews = project.before.previews && project.before.previews.length > 0
  return Boolean(url || hasPreviews || project.before.title)
}

// 判斷該專案中是否含有 PDF（支援單欄與雙欄判斷）
const hasPdfInProject = (project: ProjectItem): boolean => {
  const afterHasPdf = isPdf(project.after)
  const beforeHasPdf = hasBefore(project) && isPdf(project.before)
  return afterHasPdf || beforeHasPdf
}

// LRU 記憶池管理
const MAX_SAVED_PROJECTS = 5 
const rememberedProjects = ref<string[]>([])
const visiblePrefetchProjects = ref<Set<string>>(new Set())

const isPdfLoaded = (id: string) => {
  return rememberedProjects.value.includes(id) || visiblePrefetchProjects.value.has(id)
}

const handleClickInitial = (id: string) => {
  if (!projectStates[id]) return
  projectStates[id].isActive = true
  projectStates[id].hasInteracted = true

  visiblePrefetchProjects.value.delete(id)
  const index = rememberedProjects.value.indexOf(id)
  if (index !== -1) {
    rememberedProjects.value.splice(index, 1)
  }
  rememberedProjects.value.push(id)

  if (rememberedProjects.value.length > MAX_SAVED_PROJECTS) {
    const evictedId = rememberedProjects.value.shift()
    if (evictedId && projectStates[evictedId]) {
      projectStates[evictedId].hasInteracted = false
      projectStates[evictedId].isActive = false
    }
  }
}

const handleMouseEnter = (id: string) => {
  if (projectStates[id]?.hasInteracted) {
    projectStates[id].isActive = true
  }
}

const handleMouseLeave = (id: string) => {
  if (projectStates[id]) {
    projectStates[id].isActive = false
  }
}

const formatPdfUrl = (url?: string) => {
  if (!url) return ''
  return url.includes('#') ? url : `${url}#view=FitH&toolbar=0`
}

// 視窗偵測
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
        if (!rememberedProjects.value.includes(targetId)) {
          visiblePrefetchProjects.value.add(targetId)
        }
      } else {
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
  text-align: center;
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
  margin-bottom: 1rem;
}

.project-summary {
  color: #475569;
  font-size: 0.95rem;
  line-height: 1.7;
  text-align: center;         /* 1. 水平置中對齊標題 */
  max-width: 680px;           /* 2. 限制寬度，避免行太長 */
  margin: 0 auto 1.5rem;      /* 3. 區塊水平置中並保留下方與圖片的間距 */
}

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

/* 單欄模式 */
.comparison-grid.single-column-grid {
  grid-template-columns: 1fr;
  max-width: 860px;
  margin: 0 auto;
}

.column-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
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
  font-size: 1.2rem;
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
    grid-template-columns: 1fr !important;
  }
}

.comparison-panel {
  border-radius: 12px;
  padding: 1.25rem;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 580px;
  box-sizing: border-box;
  overflow: hidden;
  background: #ffffff;
}

.before-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
}

/* 雙欄模式下維持綠色背景與綠框 */
.comparison-grid:not(.single-column-grid) .after-panel {
  background: #f0fdf4;
  border: 1px solid #c8fcdb;
}

/* 單欄模式：預設白底自適應（供圖片、影片使用） */
.single-column-grid .comparison-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  height: auto;
  min-height: 420px;
  padding: 2rem;
}

/* 單欄若包含 PDF 預覽：直接給予舒適的直式閱讀高度 */
.single-column-grid .comparison-panel:has(.doc-preview-frame) {
  height: 760px;
  padding: 1.25rem;
}

/* YouTube 影片容器 */
.video-container {
  width: 100%;
  aspect-ratio: 16 / 9;      /* 鎖定標準 16:9 黃金比例 */
  height: auto;              /* 解除原本 height: 100% 的塌陷問題 */
  border-radius: 8px;
  overflow: hidden;
  background-color: #000000;
}

.media-frame {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

/* 原生向量 PDF iframe */
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

/* 表層縮圖 (未解鎖前覆蓋) */
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

/* 圖片容器 */
.panel-img-box {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.panel-img-box img {
  max-width: 100%;
  height: auto;
  max-height: 650px;
  object-fit: contain;
  border-radius: 8px;
  border: none;
}

/* 遮罩樣式 */
.global-dark-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(2px);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  transition: opacity 0.25s ease, background 0.25s ease;
}

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