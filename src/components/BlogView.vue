<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import postsIndexData from '../data/posts-index.json'

// 通知外層父容器 (App.vue) 是否需要鎖定/解鎖水平切換
const emit = defineEmits<{
  (e: 'toggle-lock-scroll', locked: boolean): void
}>()

interface PostMeta {
  id: string
  title: string
  subtitle?: string
  category: string
  date: string
  status: string
  color?: string
}

interface TocItem {
  id: string
  text: string
  level: number
}

interface PostDetail extends PostMeta {
  toc: TocItem[]
  htmlContent: string
}

// 嚴格依照日期 (Date) 由新到舊排序（讀取輕量索引檔）
const posts = ref<PostMeta[]>(
  [...(postsIndexData as PostMeta[])].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
)

// 分類篩選狀態
const activeCategory = ref<string>('全部')

// 動態提取所有分類 (依資料自動擴充)
const categories = computed(() => {
  const catSet = new Set<string>()
  posts.value.forEach((p) => {
    if (p.category && p.category.trim() !== '') {
      catSet.add(p.category.trim())
    }
  })
  return ['全部', ...Array.from(catSet)]
})

// 建立分類名稱與顏色的對應字典
const categoryColorMap = computed(() => {
  const map: Record<string, string> = {
    '全部': '#ea580c'
  }
  posts.value.forEach((p) => {
    if (p.category && p.color && !map[p.category]) {
      map[p.category] = p.color
    }
  })
  return map
})

function getCategoryColor(cat: string): string {
  return categoryColorMap.value[cat] || '#ea580c'
}

// 依選取分類篩選
const filteredPosts = computed(() => {
  if (activeCategory.value === '全部') {
    return posts.value
  }
  return posts.value.filter((p) => p.category === activeCategory.value)
})

// 當前點選閱讀的文章 ID 與載入狀態
const selectedPostId = ref<string | null>(null)
const currentDetail = ref<PostDetail | null>(null)
const isLoadingPost = ref<boolean>(false)

// 記憶體快取：已點擊閱讀過的文章直接快取，重複點開零網路延遲
const detailCache = new Map<string, PostDetail>()

// 當前選中的索引 (依全體文章計算前後篇)
const currentIndex = computed(() => {
  return posts.value.findIndex((p) => p.id === selectedPostId.value)
})

// 列表基本資料（載入內文瞬間也能先顯示標題與分類）
const currentMeta = computed(() => {
  if (currentIndex.value === -1) return null
  return posts.value[currentIndex.value]
})

// 上一篇：歷史較早文章 (Index + 1)
const prevPost = computed(() => {
  if (currentIndex.value !== -1 && currentIndex.value < posts.value.length - 1) {
    return posts.value[currentIndex.value + 1]
  }
  return null
})

// 下一篇：時間較新文章 (Index - 1)
const nextPost = computed(() => {
  if (currentIndex.value > 0) {
    return posts.value[currentIndex.value - 1]
  }
  return null
})

// 直接讀取預渲染好的目錄與 HTML
const tocList = computed<TocItem[]>(() => {
  return currentDetail.value?.toc || []
})

const renderedContent = computed(() => {
  return currentDetail.value?.htmlContent || ''
})

// 點選文章：按需動態載入 public/posts/[id].json
async function selectPost(id: string) {
  selectedPostId.value = id
  isBlogVisible.value = true
  emit('toggle-lock-scroll', true)
  window.scrollTo({ top: 0, behavior: 'instant' })
  requestAnimationFrame(() => {
    updateSidebarPosition()
  })

  // 若記憶體已有快取，直接秒開
  if (detailCache.has(id)) {
    currentDetail.value = detailCache.get(id)!
    return
  }

  currentDetail.value = null
  // 🌟 若在 150ms 內就抓完資料，就不顯示「載入中」避免畫面閃爍
  const loadingTimer = setTimeout(() => {
    if (!currentDetail.value) isLoadingPost.value = true
  }, 150)

  try {
    const res = await fetch(`/posts/${id}.json`)
    if (!res.ok) throw new Error(`無法載入文章內容 (HTTP ${res.status})`)
    const data: PostDetail = await res.json()
    detailCache.set(id, data)
    // 確認使用者目前仍停留在同一篇文章
    if (selectedPostId.value === id) {
      currentDetail.value = data
    }
  } catch (err) {
    console.error('載入文章失敗:', err)
  } finally {
    if (selectedPostId.value === id) {
      isLoadingPost.value = false
    }
  }
}

function backToList() {
  selectedPostId.value = null
  currentDetail.value = null
  emit('toggle-lock-scroll', false)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 手勢向右滑動返回文章列表 (Swipe to Back)
let touchStartX = 0
let touchStartY = 0

function handleTouchStart(e: TouchEvent) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}

function handleTouchEnd(e: TouchEvent) {
  const touchEndX = e.changedTouches[0].clientX
  const touchEndY = e.changedTouches[0].clientY

  const diffX = touchEndX - touchStartX
  const diffY = touchEndY - touchStartY

  if (diffX > 70 && Math.abs(diffY) < 60) {
    backToList()
  }
}

function scrollToHeading(id: string) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

// 動態計算左側目錄的頂部距離，並偵測 Blog 分頁是否在目前螢幕中
const sidebarTop = ref<number>(360)
const isBlogVisible = ref<boolean>(true)
let visibilityObserver: IntersectionObserver | null = null
let isTicking = false

function updateSidebarPosition() {
  if (window.innerWidth <= 900 || isTicking) return
  isTicking = true
  requestAnimationFrame(() => {
    const container = document.querySelector('.blog-container')
    if (container) {
      const rectTop = container.getBoundingClientRect().top
      sidebarTop.value = Math.max(100, rectTop + 40)
    }
    isTicking = false
  })
}

onMounted(() => {
  updateSidebarPosition()
  window.addEventListener('scroll', updateSidebarPosition, { passive: true })
  window.addEventListener('resize', updateSidebarPosition, { passive: true })

  // 監聽 Blog 區塊是否還在目前視窗內（切換去別的分頁時自動隱藏目錄）
  const container = document.querySelector('.blog-container')
  if (container) {
    visibilityObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        const inHorizontalView =
          entry.boundingClientRect.right > 50 &&
          entry.boundingClientRect.left < window.innerWidth - 50
        isBlogVisible.value = entry.isIntersecting && inHorizontalView
      },
      { threshold: 0 }
    )
    visibilityObserver.observe(container)
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateSidebarPosition)
  window.removeEventListener('resize', updateSidebarPosition)
  if (visibilityObserver) {
    visibilityObserver.disconnect()
  }
})
</script>

<template>
  <div class="blog-container">
    <!-- 1. 文章列表畫面 -->
    <div v-if="!selectedPostId" class="posts-list-view">
      <div class="blog-list-header">
        <h2 class="section-title">全部文章</h2>
        <div class="header-count">共 {{ filteredPosts.length }} 篇，新的在上面</div>
      </div>

      <!-- 自動擴充分類切換列 -->
      <div class="category-tabs-bar">
        <button
          v-for="cat in categories"
          :key="cat"
          class="cat-tab-btn"
          :class="{ active: activeCategory === cat }"
          :style="activeCategory === cat ? {
            backgroundColor: getCategoryColor(cat),
            boxShadow: `0 2px 8px ${getCategoryColor(cat)}40`
          } : {}"
          @click="activeCategory = cat"
        >
          {{ cat }}
        </button>
      </div>

      <div v-if="filteredPosts.length === 0" class="empty-state">
        此分類目前尚無文章。
      </div>

      <!-- 緊湊型高密度文章列表 -->
      <div class="dense-posts-list">
        <article
          v-for="post in filteredPosts"
          :key="post.id"
          class="dense-post-row"
          @click="selectPost(post.id)"
        >
          <div class="row-left-col">
            <span
              class="row-category"
              :style="{ color: post.color || '#ea580c' }"
            >
              {{ post.category }}
            </span>
            <span class="row-date">{{ post.date }}</span>
          </div>

          <div class="row-main-col">
            <h3 class="row-title">{{ post.title }}</h3>
            <p v-if="post.subtitle" class="row-subtitle">
              {{ post.subtitle }}
            </p>
          </div>
        </article>
      </div>
    </div>

    <!-- 2. 文章閱讀內頁 -->
    <div
      v-else
      class="post-detail-layout"
      @touchstart.passive="handleTouchStart"
      @touchend.passive="handleTouchEnd"
    >
      <!-- 左側固定目錄欄 -->
      <aside
        v-show="isBlogVisible"
        class="detail-sidebar"
        :style="{
          top: `${sidebarTop}px`,
          maxHeight: `calc(100vh - ${sidebarTop + 30}px)`
        }"
      >
        <button class="back-link-btn" @click="backToList">
          ← 回所有文章
        </button>

        <div v-if="tocList.length > 0" class="toc-wrapper">
          <div class="toc-heading">這篇的段落</div>
          <nav class="toc-nav">
            <a
              v-for="(item, idx) in tocList"
              :key="idx"
              :class="['toc-item', `toc-level-${item.level}`]"
              @click.prevent="scrollToHeading(item.id)"
            >
              {{ item.text }}
            </a>
          </nav>
        </div>
      </aside>

      <!-- 右側文章主體 -->
      <main class="detail-main-content">
        <header class="detail-header">
          <div class="post-meta">
            <span
              class="post-category-tag"
              :style="{
                backgroundColor: `${currentMeta?.color || '#ea580c'}18`,
                color: currentMeta?.color || '#ea580c'
              }"
            >
              {{ currentMeta?.category }}
            </span>
            <span class="post-date">{{ currentMeta?.date }}</span>
          </div>
          <h1 class="detail-title">{{ currentMeta?.title }}</h1>
          <p v-if="currentMeta?.subtitle" class="detail-subtitle">
            {{ currentMeta.subtitle }}
          </p>
        </header>

        <!-- 載入中提示 -->
        <div v-if="isLoadingPost" class="loading-post-state">
          文章內容載入中...
        </div>

        <!-- 預渲染 HTML 內文 -->
        <article
          v-else
          class="markdown-body"
          v-html="renderedContent"
        ></article>

        <!-- 底部上一篇 / 下一篇 -->
        <nav class="post-pagination-section">
          <div class="pagination-col prev-col">
            <div
              v-if="prevPost"
              class="pagination-card"
              @click="selectPost(prevPost.id)"
            >
              <span class="nav-direction">← 上一篇</span>
              <span class="nav-title">{{ prevPost.title }}</span>
            </div>
          </div>

          <div class="pagination-col next-col">
            <div
              v-if="nextPost"
              class="pagination-card"
              @click="selectPost(nextPost.id)"
            >
              <span class="nav-direction">下一篇 →</span>
              <span class="nav-title">{{ nextPost.title }}</span>
            </div>
          </div>
        </nav>
      </main>
    </div>
  </div>
</template>

<style scoped>
.blog-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 80px;
}

/* ==================== 頂部標題與分類 ==================== */
.blog-list-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  max-width: 960px;
  margin: 0 auto 1.5rem;
}

.section-title {
  font-size: 2.2rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin: 0;
}

.header-count {
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
}

.category-tabs-bar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  max-width: 960px;
  margin: 0 auto 2.5rem;
}

.cat-tab-btn {
  background: #f1f5f9;
  border: 1px solid transparent;
  color: #475569;
  padding: 6px 18px;
  border-radius: 9999px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cat-tab-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.cat-tab-btn.active {
  background: #ea580c;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(234, 88, 12, 0.25);
}

.empty-state,
.loading-post-state {
  color: #64748b;
  padding: 60px 0;
  text-align: center;
  font-size: 0.95rem;
}

/* ==================== 緊湊型文章列表 ==================== */
.dense-posts-list {
  display: flex;
  flex-direction: column;
  max-width: 960px;
  margin: 0 auto;
  border-top: 1px solid #e2e8f0;
}

.dense-post-row {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  padding: 20px 12px;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-radius: 6px;
}

.dense-post-row:hover {
  background-color: rgba(248, 250, 252, 0.8);
}

.dense-post-row:hover .row-title {
  color: #ea580c;
}

.row-left-col {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  align-self: center;
  gap: 40px;
}

.row-category {
  width: 80px;
  text-align: center;
  flex-shrink: 0;
  font-size: 0.85rem;
  color: #ea580c;
  font-weight: 700;
  white-space: nowrap;
}

.row-date {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
}

.row-main-col {
  flex: 1;
  min-width: 0;
}

.row-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 6px 0;
  line-height: 1.45;
  transition: color 0.15s ease;
}

.row-subtitle {
  font-size: 0.92rem;
  line-height: 1.6;
  color: #64748b;
  margin: 0;
}

/* ==================== 閱讀內頁兩欄 Fixed 配置 ==================== */
.post-detail-layout {
  display: block;
  position: relative;
  width: 100%;
  padding-left: 340px;
  box-sizing: border-box;
  overscroll-behavior-x: contain;
  touch-action: pan-y;
}

.detail-sidebar {
  position: fixed;
  top: 100px;
  left: max(24px, calc((100vw - 1200px) / 2 + 24px));
  width: 290px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: calc(100vh - 130px);
  overflow-y: auto;
  padding-right: 12px;
  z-index: 20;
}

.back-link-btn {
  background: transparent;
  border: none;
  font-size: 15px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  text-align: left;
  transition: color 0.15s ease;
}

.back-link-btn:hover {
  color: #0f172a;
}

.toc-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
}

.toc-heading {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #94a3b8;
  text-transform: uppercase;
}

.toc-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toc-item {
  line-height: 1.5;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s ease;
  word-break: break-word;
}

.toc-level-1 {
  font-size: 14.5px;
  font-weight: 700;
  color: #0f172a;
  margin-top: 6px;
}

.toc-level-2 {
  font-size: 13.5px;
  font-weight: 400;
  color: #64748b;
  padding-left: 14px;
  border-left: 2px solid #e2e8f0;
}

.toc-item:hover {
  color: #ea580c;
}

/* ==================== 內文樣式 ==================== */
.detail-main-content {
  flex: 1 1 0%;
  width: 100%;
  min-width: 0 !important;
  max-width: 100%;
  box-sizing: border-box;
}

.detail-header {
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 24px;
  margin-bottom: 32px;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.post-category-tag {
  background: #f1f5f9;
  color: #0f172a;
  padding: 2px 10px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 12px;
}

.detail-title {
  font-size: 34px;
  font-weight: 800;
  line-height: 1.35;
  margin: 0 0 12px 0;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.detail-subtitle {
  font-size: 1.05rem;
  line-height: 1.6;
  color: #64748b;
  margin: 0;
}

:deep(.article-h1) {
  scroll-margin-top: 110px;
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  margin-top: 52px;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e2e8f0;
}

:deep(.article-h2) {
  scroll-margin-top: 110px;
  font-size: 21px;
  font-weight: 700;
  color: #1e293b;
  margin-top: 36px;
  margin-bottom: 16px;
}

:deep(.markdown-body p) {
  line-height: 1.85;
  color: #334155;
  font-size: 16.5px;
  margin-bottom: 20px;
}

:deep(.markdown-body ul),
:deep(.markdown-body ol) {
  margin: 16px 0;
  padding-left: 24px;
  color: #334155;
  line-height: 1.85;
}

:deep(.markdown-body li) {
  margin-bottom: 8px;
}

:deep(.markdown-body img) {
  max-width: 100%;
  border-radius: 10px;
  margin: 24px 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

:deep(.markdown-body) {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-wrap: break-word;
  word-break: break-word;
}

:deep(.markdown-body pre) {
  background: #0f172a;
  color: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  max-width: 100% !important;
  overflow-x: auto !important;
  box-sizing: border-box !important;
  margin: 24px 0;
}

:deep(.markdown-body :not(pre) > code) {
  background: #f1f5f9;
  color: #0f172a;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  white-space: normal !important;
  word-break: break-all !important;
}

:deep(.markdown-body pre code) {
  background: transparent;
  color: inherit;
  padding: 0;
}

:deep(.markdown-body table) {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: auto !important;
  box-sizing: border-box !important;
  border-collapse: collapse;
  margin: 24px 0;
}

:deep(.markdown-body th),
:deep(.markdown-body td) {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
}

:deep(.markdown-body blockquote) {
  max-width: 100%;
  box-sizing: border-box;
  margin: 20px 0;
  padding: 12px 18px;
  border-left: 4px solid #ea580c;
  background: #f8fafc;
}

/* ==================== 底部：上一篇 / 下一篇 ==================== */
.post-pagination-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 60px;
  padding-top: 32px;
  border-top: 1px solid #e2e8f0;
}

.pagination-col {
  display: flex;
}

.next-col {
  justify-content: flex-end;
}

.pagination-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  cursor: pointer;
  width: 100%;
  max-width: 340px;
  transition: all 0.2s ease;
}

.pagination-card:hover {
  transform: translateY(-2px);
  border-color: #cbd5e1;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.05);
}

.next-col .pagination-card {
  align-items: flex-end;
  text-align: right;
}

.nav-direction {
  font-size: 12px;
  font-weight: 700;
  color: #059669;
}

.nav-title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.4;
}

/* ==================== 行動端響應式降級 ==================== */
@media (max-width: 900px) {
  .blog-container {
    padding: 20px 16px 120px !important;
    overflow-x: hidden !important;
  }

  .detail-title {
    font-size: clamp(1.4rem, 5.5vw, 2rem) !important;
    line-height: 1.35 !important;
    word-break: break-word !important;
  }

  .dense-post-row {
    flex-direction: column;
    gap: 8px;
  }

  .row-left-col {
    width: 100%;
    justify-content: flex-start;
    align-self: auto;
    gap: 16px;
  }

  .post-detail-layout {
    flex-direction: column;
    gap: 24px;
    padding-left: 0 !important;
  }

  .detail-sidebar {
    position: static;
    width: 100%;
    max-height: none;
    overflow-y: visible;
  }

  .toc-wrapper {
    display: none;
  }

  .post-pagination-section {
    grid-template-columns: 1fr;
  }

  .pagination-card {
    max-width: 100%;
  }

  .next-col {
    justify-content: flex-start;
  }

  .next-col .pagination-card {
    align-items: flex-start;
    text-align: left;
  }
}
</style>