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
            
            <!-- 左側：改之前 (Before) -->
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
                  <!-- 手機版：使用 vue-pdf-embed 畫布與分頁控制器 -->
                  <div v-if="isMobile" class="pdf-render-box">
                    <vue-pdf-embed 
                      v-if="shouldRenderPdf(project.id)"
                      :source="getMediaUrl(project.before)" 
                      :page="pdfPages[project.id + '-before'] || 1"
                      @loaded="onPdfLoaded($event, project.id + '-before')"
                      class="custom-pdf-canvas"
                    />
                    <div class="pdf-pagination-bar" v-if="shouldRenderPdf(project.id) && pdfTotalPages[project.id + '-before'] > 1">
                      <button 
                        class="jump-btn"
                        title="倒退 5 頁"
                        :disabled="(pdfPages[project.id + '-before'] || 1) <= 1"
                        @click.stop="jumpPrev5Pages(project.id + '-before')"
                      >⏪</button>
                      <button 
                        :disabled="(pdfPages[project.id + '-before'] || 1) <= 1"
                        @click.stop="prevPdfPage(project.id + '-before')"
                      >◀</button>
                      <span class="page-indicator">
                        {{ pdfPages[project.id + '-before'] || 1 }} / {{ pdfTotalPages[project.id + '-before'] }}
                      </span>
                      <button 
                        :disabled="(pdfPages[project.id + '-before'] || 1) >= pdfTotalPages[project.id + '-before']"
                        @click.stop="nextPdfPage(project.id + '-before')"
                      >▶</button>
                      <button 
                        class="jump-btn"
                        title="前進 5 頁"
                        :disabled="(pdfPages[project.id + '-before'] || 1) >= pdfTotalPages[project.id + '-before']"
                        @click.stop="jumpNext5Pages(project.id + '-before')"
                      >⏩</button>
                    </div>
                  </div>

                  <!-- 電腦版：維持原生 iframe 預覽 -->
                  <iframe 
                    v-else-if="shouldRenderPdf(project.id)" 
                    :src="formatPdfUrl(getMediaUrl(project.before))"
                    class="doc-preview-frame"
                  ></iframe>

                  <!-- 表層多頁縮圖 (未互動前墊在黑色遮罩底下) -->
                  <div 
                    v-if="!projectStates[project.id]?.isActive && getPreviews(project.before).length > 0"
                    class="preview-images-box"
                  >
                    <img 
                      v-for="(pImg, idx) in getPreviews(project.before)" 
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

            <!-- 右側：改之後 (After) -->
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
                  <!-- 手機版：使用 vue-pdf-embed 畫布與分頁控制器 -->
                  <div v-if="isMobile" class="pdf-render-box">
                    <vue-pdf-embed 
                      v-if="shouldRenderPdf(project.id)"
                      :source="getMediaUrl(project.after)" 
                      :page="pdfPages[project.id + '-after'] || 1"
                      @loaded="onPdfLoaded($event, project.id + '-after')"
                      class="custom-pdf-canvas"
                    />
                    <div class="pdf-pagination-bar" v-if="shouldRenderPdf(project.id) && pdfTotalPages[project.id + '-after'] > 1">
                      <button 
                        class="jump-btn"
                        title="倒退 5 頁"
                        :disabled="(pdfPages[project.id + '-after'] || 1) <= 1"
                        @click.stop="jumpPrev5Pages(project.id + '-after')"
                      >⏪</button>
                      <button 
                        :disabled="(pdfPages[project.id + '-after'] || 1) <= 1"
                        @click.stop="prevPdfPage(project.id + '-after')"
                      >◀</button>
                      <span class="page-indicator">
                        {{ pdfPages[project.id + '-after'] || 1 }} / {{ pdfTotalPages[project.id + '-after'] }}
                      </span>
                      <button 
                        :disabled="(pdfPages[project.id + '-after'] || 1) >= pdfTotalPages[project.id + '-after']"
                        @click.stop="nextPdfPage(project.id + '-after')"
                      >▶</button>
                      <button 
                        class="jump-btn"
                        title="前進 5 頁"
                        :disabled="(pdfPages[project.id + '-after'] || 1) >= pdfTotalPages[project.id + '-after']"
                        @click.stop="jumpNext5Pages(project.id + '-after')"
                      >⏩</button>
                    </div>
                  </div>

                  <!-- 電腦版：維持原生 iframe 預覽 -->
                  <iframe 
                    v-else-if="shouldRenderPdf(project.id)" 
                    :src="formatPdfUrl(getMediaUrl(project.after))"
                    class="doc-preview-frame"
                  ></iframe>

                  <!-- 表層多頁縮圖 (未互動前墊在黑色遮罩底下) -->
                  <div 
                    v-if="!projectStates[project.id]?.isActive && getPreviews(project.after).length > 0"
                    class="preview-images-box"
                  >
                    <img 
                      v-for="(pImg, idx) in getPreviews(project.after)" 
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

          <!-- 遮罩層：防誤觸保護 -->
          <template v-if="hasPdfInProject(project)">
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
import VuePdfEmbed from 'vue-pdf-embed'
import * as pdfjsLib from 'pdfjs-dist'
import rawProjects from '../data/projects.json'

// 配置 pdfjs worker（相容 Vite 本機與打包環境）
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`
}

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

const projects = reactive<ProjectItem[]>(JSON.parse(JSON.stringify(rawProjects)))

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

// 即時判斷螢幕寬度（<= 768px 為手機版）
const isMobile = ref(false)
const checkMobile = () => {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  }
}

// 頁碼管理
const pdfPages = reactive<Record<string, number>>({})
const pdfTotalPages = reactive<Record<string, number>>({})

const onPdfLoaded = (pdfDoc: any, key: string) => {
  pdfTotalPages[key] = pdfDoc.numPages || 1
  if (!pdfPages[key]) pdfPages[key] = 1
}

const prevPdfPage = (key: string) => {
  if ((pdfPages[key] || 1) > 1) {
    pdfPages[key]--
  }
}

const nextPdfPage = (key: string) => {
  if ((pdfPages[key] || 1) < (pdfTotalPages[key] || 1)) {
    pdfPages[key] = (pdfPages[key] || 1) + 1
  }
}

const jumpPrev5Pages = (key: string) => {
  const current = pdfPages[key] || 1
  pdfPages[key] = Math.max(1, current - 5)
}

const jumpNext5Pages = (key: string) => {
  const current = pdfPages[key] || 1
  const total = pdfTotalPages[key] || 1
  pdfPages[key] = Math.min(total, current + 5)
}

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

const hasPdfInProject = (project: ProjectItem): boolean => {
  const afterHasPdf = isPdf(project.after)
  const beforeHasPdf = hasBefore(project) && isPdf(project.before)
  return afterHasPdf || beforeHasPdf
}

const formatPdfUrl = (url?: string) => {
  if (!url) return ''
  return url.includes('#') ? url : `${url}#view=FitH&toolbar=0`
}

// 取得縮圖陣列
const getPreviews = (side?: ComparisonSide): string[] => {
  if (!side) return []
  return side.previews || []
}

// ==================== 自動從 PDF 擷取前 2 頁生成縮圖 ====================
const autoGeneratePdfPreviews = async () => {
  for (const project of projects) {
    const sides: (ComparisonSide | undefined)[] = [project.before, project.after]
    for (const side of sides) {
      if (!side) continue
      // 若已有指定 previews 則跳過，若無且為 PDF 則自動擷取前兩頁
      if ((!side.previews || side.previews.length === 0) && isPdf(side)) {
        const pdfUrl = getMediaUrl(side)
        if (!pdfUrl) continue

        try {
          const loadingTask = pdfjsLib.getDocument(pdfUrl)
          const pdfDoc = await loadingTask.promise
          const maxPages = Math.min(2, pdfDoc.numPages)
          const generatedImages: string[] = []

          for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum)
            const viewport = page.getViewport({ scale: 1.5 })
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            canvas.width = viewport.width
            canvas.height = viewport.height

            if (ctx) {
              await page.render({ canvasContext: ctx, viewport }).promise
              generatedImages.push(canvas.toDataURL('image/jpeg', 0.85))
            }
          }

          if (generatedImages.length > 0) {
            side.previews = generatedImages
          }
        } catch (err) {
          console.warn(`[AutoPreview] 產生縮圖失敗 (${pdfUrl}):`, err)
        }
      }
    }
  }
}

// LRU 記憶池管理
const MAX_SAVED_PROJECTS = 5 
const rememberedProjects = ref<string[]>([])
const visiblePrefetchProjects = ref<Set<string>>(new Set())

// 🌟 核心防護：手機端必須「訪客點擊過按鈕」才掛載 PDF；電腦端維持視窗快取
const shouldRenderPdf = (id: string) => {
  if (isMobile.value) {
    return Boolean(projectStates[id]?.hasInteracted)
  }
  return rememberedProjects.value.includes(id) || visiblePrefetchProjects.value.has(id)
}

const isPdfLoaded = (id: string) => {
  return rememberedProjects.value.includes(id) || visiblePrefetchProjects.value.has(id)
}

const handleClickInitial = (id: string) => {
  if (!projectStates[id]) return

  // 🌟 手機端單一開啟互斥鎖：點擊新專案時，強制關閉並卸載其他所有專案的 PDF
  if (isMobile.value) {
    Object.keys(projectStates).forEach((projId) => {
      if (projId !== id) {
        projectStates[projId].isActive = false
        projectStates[projId].hasInteracted = false
      }
    })
    rememberedProjects.value = [id]
  }

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

// 視窗偵測（加上 300ms 防抖，快速刷過不觸發）
const cardElements = new Map<string, HTMLElement>()
let observer: IntersectionObserver | null = null
const debounceTimers = new Map<string, any>()

const setCardRef = (id: string, el: any) => {
  if (el) {
    cardElements.set(id, el as HTMLElement)
  } else {
    cardElements.delete(id)
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // 網頁載入時啟動背景縮圖自動生成（完全保留）
  autoGeneratePdfPreviews()

  // 🌟 移除 200px 激進預載，只在卡片確實停留時載入
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
        // 清除舊計時器
        if (debounceTimers.has(targetId)) {
          clearTimeout(debounceTimers.get(targetId))
        }
        // 🌟 停留在視窗超過 300ms 才加入預載池，快速滑過直接略過
        const timer = setTimeout(() => {
          if (!rememberedProjects.value.includes(targetId)) {
            visiblePrefetchProjects.value.add(targetId)
          }
          debounceTimers.delete(targetId)
        }, 300)
        debounceTimers.set(targetId, timer)
      } else {
        if (debounceTimers.has(targetId)) {
          clearTimeout(debounceTimers.get(targetId))
          debounceTimers.delete(targetId)
        }
        if (!rememberedProjects.value.includes(targetId)) {
          visiblePrefetchProjects.value.delete(targetId)
        }

        // 🌟 新增：手機端只要卡片一離開可視範圍，立刻關閉該 PDF 並釋放記憶體
        if (isMobile.value && projectStates[targetId]) {
          projectStates[targetId].hasInteracted = false
          projectStates[targetId].isActive = false
          const idx = rememberedProjects.value.indexOf(targetId)
          if (idx !== -1) {
            rememberedProjects.value.splice(idx, 1)
          }
        }
      }
    })
  }, { rootMargin: '0px' })

  cardElements.forEach((el) => observer?.observe(el))
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  observer?.disconnect()
  debounceTimers.forEach((timer) => clearTimeout(timer))
  debounceTimers.clear()
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
  text-align: center;
  max-width: 680px;
  margin: 0 auto 1.5rem;
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

.comparison-grid:not(.single-column-grid) .after-panel {
  background: #f0fdf4;
  border: 1px solid #c8fcdb;
}

.single-column-grid .comparison-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  height: auto;
  min-height: 420px;
  padding: 2rem;
}

/* 電腦端原生向量 PDF iframe */
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

/* 手機端 PDF 自適應渲染容器 */
.pdf-render-box {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.custom-pdf-canvas {
  width: 100% !important;
  max-width: 100% !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  overflow: hidden;
}

.custom-pdf-canvas :deep(canvas) {
  width: 100% !important;
  height: auto !important;
  display: block;
}

/* 翻頁控制器條 */
.pdf-pagination-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 16px;
  background: rgba(18, 50, 71, 0.92);
  color: #ffffff;
  border-radius: 9999px;
  margin-top: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  position: sticky;
  bottom: 8px;
  z-index: 5;
  backdrop-filter: blur(4px);
}

.pdf-pagination-bar button {
  background: #ffffff;
  color: #123247;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 0.95rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, opacity 0.2s ease, background 0.2s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.pdf-pagination-bar button:active:not(:disabled) {
  transform: scale(0.9);
  background: #e2e8f0;
}

.pdf-pagination-bar button.jump-btn {
  font-size: 0.82rem;
  background: #f1f5f9;
}

.pdf-pagination-bar button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pdf-pagination-bar .page-indicator {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0 6px;
  min-width: 64px;
  text-align: center;
}

/* YouTube 影片容器 */
.video-container {
  width: 100%;
  aspect-ratio: 16 / 9;
  height: auto;
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

/* 表層縮圖容器 (雙頁預覽圖垂直排列，墊在黑色遮罩底層) */
.preview-images-box {
  position: absolute;
  top: 1.25rem;
  left: 1.25rem;
  right: 1.25rem;
  bottom: 1.25rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
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

/* ==================== 手機端專屬響應式 (RWD) ==================== */
@media (max-width: 768px) {
  .portfolio-container {
    padding: 1.5rem 1rem 3rem !important;
    overflow-x: hidden !important;
  }

  .section-title {
    font-size: 1.8rem !important;
  }
  .section-desc {
    font-size: 1rem !important;
    padding: 0 0.5rem;
  }

  .project-card {
    padding: 1.25rem 0.75rem !important;
    border-radius: 16px !important;
    overflow: hidden !important;
  }

  .project-title {
    font-size: 1.35rem !important;
    line-height: 1.35;
    word-break: break-word !important;
  }

  /* 雙欄轉橫向軌道：單一卡寬 + 左右滑動 + 自動吸附邊界 */
  .comparison-grid {
    display: flex !important;
    flex-direction: row !important;
    width: 100% !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    scroll-snap-type: x mandatory !important;
    -webkit-overflow-scrolling: touch !important;
    gap: 14px !important;
    padding-bottom: 8px !important;
  }

  .comparison-grid::-webkit-scrollbar {
    display: none;
  }

  .comparison-column {
    flex: 0 0 100% !important;
    width: 100% !important;
    max-width: 100% !important;
    scroll-snap-align: start !important;
    box-sizing: border-box !important;
  }

  .comparison-panel {
    height: 520px !important;
    max-height: 70vh !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    -webkit-overflow-scrolling: touch !important;
    padding: 0.75rem !important;
  }

  /* 🌟 修正：當面板內部包含 YouTube 影片時，取消 520px 固定高度，自適應 16:9 比例 */
  .comparison-panel:has(.video-container) {
    height: auto !important;
    min-height: unset !important;
    max-height: none !important;
    overflow: visible !important;
    padding: 0.5rem !important;
  }

  /* 🌟 修正：單欄無 Before 模式（如精選影片簡報），解除固定高度與置中 */
  .single-column-grid .comparison-panel {
    height: auto !important;
    min-height: unset !important;
    padding: 0.75rem !important;
  }

  .preview-images-box {
    position: relative !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: auto !important;
    height: auto !important;
    overflow: visible !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 10px !important;
  }
}
</style>