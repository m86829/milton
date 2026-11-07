<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
import postsData from '../data/posts.json'

interface Post {
  id: string
  title: string
  subtitle?: string
  category: string
  date: string
  status: string
  content: string
}

interface TocItem {
  id: string
  text: string
}

// 嚴格依照日期 (Date) 由新到舊排序
const posts = ref<Post[]>(
  [...(postsData as Post[])].sort((a, b) => {
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

// 依選取分類篩選
const filteredPosts = computed(() => {
  if (activeCategory.value === '全部') {
    return posts.value
  }
  return posts.value.filter((p) => p.category === activeCategory.value)
})

// 當前點選閱讀的文章 ID
const selectedPostId = ref<string | null>(null)

// 當前選中的索引 (依全體文章計算前後篇)
const currentIndex = computed(() => {
  return posts.value.findIndex((p) => p.id === selectedPostId.value)
})

const currentPost = computed(() => {
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

// 解析 Markdown H2 標題產生目錄 (TOC)
const tocList = computed<TocItem[]>(() => {
  if (!currentPost.value) return []
  const headings: TocItem[] = []
  const lines = currentPost.value.content.split('\n')

  lines.forEach((line) => {
    const match = line.match(/^##\s+(.+)$/)
    if (match) {
      const text = match[1].trim()
      const id = text
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-+|-+$/g, '')
      headings.push({ id, text })
    }
  })
  return headings
})

// 將 Markdown 轉為 HTML，並為 H2 加上 id 供錨點跳轉
const renderedContent = computed(() => {
  if (!currentPost.value) return ''

  const renderer = new marked.Renderer()
  renderer.heading = ({ text, depth }: { text: string; depth: number }) => {
    if (depth === 2) {
      const id = text
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-+|-+$/g, '')
      return `<h2 id="${id}" class="article-h2">${text}</h2>`
    }
    return `<h${depth}>${text}</h${depth}>`
  }

  return marked.parse(currentPost.value.content, { renderer })
})

function selectPost(id: string) {
  selectedPostId.value = id
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function backToList() {
  selectedPostId.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function scrollToHeading(id: string) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}
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
          <!-- 左側欄：適度拉開間距並收窄欄位 -->
          <div class="row-left-col">
            <span class="row-category">{{ post.category }}</span>
            <span class="row-date">{{ post.date }}</span>
          </div>

          <!-- 中間欄：主標題 + 副標題摘要 -->
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
    <div v-else class="post-detail-layout">
      <!-- 左側固定目錄欄 (Sticky Sidebar) -->
      <aside class="detail-sidebar">
        <!-- 置頂返回按鈕 -->
        <button class="back-link-btn" @click="backToList">
          ← 回所有文章
        </button>

        <!-- 這篇的段落目錄 -->
        <div v-if="tocList.length > 0" class="toc-wrapper">
          <div class="toc-heading">這篇的段落</div>
          <nav class="toc-nav">
            <a
              v-for="(item, idx) in tocList"
              :key="idx"
              class="toc-item"
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
            <span class="post-category-tag">{{ currentPost?.category }}</span>
            <span class="post-date">{{ currentPost?.date }}</span>
          </div>
          <h1 class="detail-title">{{ currentPost?.title }}</h1>
          <p v-if="currentPost?.subtitle" class="detail-subtitle">
            {{ currentPost.subtitle }}
          </p>
        </header>

        <!-- Markdown 內文 -->
        <article class="markdown-body" v-html="renderedContent"></article>

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

.empty-state {
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
  border-top: 1px solid #e2e8f0; /* 第一篇文章上方增加一條頂部界線 */
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

/* 左側欄：固定分類欄位寬度，確保所有日期的起點絕對垂直切齊 */
.row-left-col {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
 justify-content: center;     /* 改回水平置中 */
  align-self: center;
  gap: 40px;                   /* 分類與日期之間的固定間距 */
}

/* 分類：固定 64px 寬度並靠右對齊（或 text-align: left） */
.row-category {
  width: 80px;                 /* 固定寬度，不論 2 字或 4 字都不影響後方日期的位置 */
  text-align: center;           /* 靠右對齊日期，形成規整邊界 */
  flex-shrink: 0;
  font-size: 0.85rem;
  color: #ea580c;
  font-weight: 700;
  white-space: nowrap;
}

/* 日期：次要灰字 */
.row-date {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
}

/* 中間欄：標題與副標題 */
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

/* ==================== 閱讀內頁兩欄 Sticky 配置 ==================== */
.post-detail-layout {
  display: flex;
  align-items: flex-start;
  gap: 56px;
  position: relative;
  width: 100%;
}

.detail-sidebar {
  position: -webkit-sticky;
  position: sticky;
  top: 100px;
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  padding-right: 12px;
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
  padding-top: 20px;
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
  gap: 12px;
}

.toc-item {
  font-size: 14px;
  line-height: 1.55;
  color: #475569;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s ease;
  word-break: break-word;
}

.toc-item:hover {
  color: #059669;
}

/* ==================== 內文樣式 ==================== */
.detail-main-content {
  flex: 1;
  min-width: 0;
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

:deep(.article-h2) {
  scroll-margin-top: 110px;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin-top: 48px;
  margin-bottom: 18px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
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

:deep(.markdown-body pre) {
  background: #0f172a;
  color: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 24px 0;
}

:deep(.markdown-body code) {
  background: #f1f5f9;
  color: #0f172a;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}

:deep(.markdown-body pre code) {
  background: transparent;
  color: inherit;
  padding: 0;
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