<script setup lang="ts">
import { ref, computed } from 'vue'
import rawTimeline from '../data/timeline.json'

interface TimelineItem {
  id: string
  type: 'point' | 'range'
  color?: string          // 直接支援自訂色碼 (如 #ea580c 或 teal)
  track?: number | string // 手動指定軌道 (1, 2, 3...)
  title: string
  subtitle?: string
  startDate: string
  endDate?: string | null
  isOngoing?: boolean
  dateDisplay: string
  points: string[]
}

const timelineItems = ref<TimelineItem[]>(rawTimeline as TimelineItem[])
const activeHoverId = ref<string | null>(null)

// 顏色解析：直接讀取自訂色碼，未設定時使用預設深灰色
function resolveItemColor(item: TimelineItem): string {
  if (item.color && item.color.trim()) {
    return item.color.trim()
  }
  return '#475569'
}

// 軌道索引解析：依 track 屬性指定軌道 (1 轉為 index 0)，未設定預設為第 1 軌 (index 0)
function resolveTrackIndex(item: TimelineItem): number {
  if (item.track !== undefined && item.track !== null && item.track !== '') {
    const parsed = typeof item.track === 'number' ? item.track : parseInt(String(item.track).trim(), 10)
    if (!isNaN(parsed) && parsed > 0) {
      return parsed - 1
    }
  }
  return 0
}

function getYearMonthKey(dateStr: string) {
  if (!dateStr) return ''
  const [y, m] = dateStr.split('-')
  return `${y}.${m.padStart(2, '0')}`
}

function getMonthValue(dateStr: string) {
  const [y, m] = dateStr.split('-').map(Number)
  return y * 12 + m
}

// 座標系統常數
const SPINE_X = 320             // 中央綠線 X 座標
const CURRENT_DATE_STR = '2026-11-01'
const CURRENT_MONTH_VAL = getMonthValue(CURRENT_DATE_STR)
const PIXELS_PER_MONTH = 14     // 1 個月 = 14px

function getRawY(dateStr: string) {
  const mVal = getMonthValue(dateStr)
  const diff = CURRENT_MONTH_VAL - mVal
  return Math.max(30, 50 + diff * PIXELS_PER_MONTH)
}

// 1. 中央不重複的年月刻度（防碰撞安全間距 42px）
const tickNodes = computed(() => {
  const set = new Set<string>()
  timelineItems.value.forEach(item => {
    set.add(getYearMonthKey(item.startDate))
    if (item.endDate) set.add(getYearMonthKey(item.endDate))
  })

  const sortedYm = Array.from(set).sort((a, b) => {
    const [y1, m1] = a.split('.').map(Number)
    const [y2, m2] = b.split('.').map(Number)
    return (y2 * 12 + m2) - (y1 * 12 + m1)
  })

  const result: { ymText: string; y: number }[] = []
  let lastY = -999

  sortedYm.forEach(ym => {
    const [y, m] = ym.split('.')
    let currentY = getRawY(`${y}-${m}-01`)
    
    // 安全間隙防重疊
    if (currentY - lastY < 42) {
      currentY = lastY + 42
    }

    result.push({ ymText: ym, y: currentY })
    lastY = currentY
  })

  return result
})

const tickYMap = computed(() => {
  const map = new Map<string, number>()
  tickNodes.value.forEach(t => map.set(t.ymText, t.y))
  return map
})

// 2. 幾何座標與專屬軌道計算
const processedItems = computed(() => {
  const sorted = [...timelineItems.value].sort((a, b) => {
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  })

  return sorted.map(item => {
    const startYm = getYearMonthKey(item.startDate)
    const startY = tickYMap.value.get(startYm) ?? getRawY(item.startDate)
    const color = resolveItemColor(item)
    const trackIndex = resolveTrackIndex(item)

    let endY = 0
    if (item.type === 'range') {
      if (item.isOngoing) {
        endY = 25 // 直接對齊中央綠線頂端 (y1="25")
      } else if (item.endDate) {
        const endYm = getYearMonthKey(item.endDate)
        endY = tickYMap.value.get(endYm) ?? getRawY(item.endDate)
      }
    }

    // 專屬軌道 X 座標：依軌道索引平移，每軌間隔 48px
    const trackX = SPINE_X + 70 + trackIndex * 48

    // 計算卡片最終 Y 軸定位：區間項目取垂直中點，單點項目取開始點
    const cardY = item.type === 'range' ? (startY + endY) / 2 : startY

    // 區間項目中央掛接微引線
    let centerConnectorPath = ''
    if (item.type === 'range') {
      centerConnectorPath = `M ${trackX} ${cardY} L ${trackX + 20} ${cardY}`
    }

    // SVG 路徑建構
    let pathD = ''
    let endArrowPath = ''

    if (item.type === 'point') {
      // 左側單點：自中央綠線水平連到左側卡片邊緣
      pathD = `M ${SPINE_X} ${startY} L ${SPINE_X - 52} ${startY}`
    } else {
      // 右側區間：向上生長
      if (item.isOngoing) {
        // L 型向上
        pathD = `M ${SPINE_X} ${startY} L ${trackX} ${startY} L ${trackX} ${endY}`
      } else {
        const targetSpineEdge = SPINE_X + 44
        // ㄇ 型向上至 endY，向左回切至主幹刻度
        pathD = `M ${SPINE_X} ${startY} L ${trackX} ${startY} L ${trackX} ${endY} L ${targetSpineEdge} ${endY}`
        // 結束向左小箭頭
        endArrowPath = `M ${targetSpineEdge + 8} ${endY - 4} L ${targetSpineEdge} ${endY} L ${targetSpineEdge + 8} ${endY + 4} Z`
      }
    }

    return {
      ...item,
      color,
      startY,
      endY,
      cardY,
      trackX,
      pathD,
      centerConnectorPath,
      endArrowPath,
      ymStartDate: startYm,
      ymEndDate: item.endDate ? getYearMonthKey(item.endDate) : (item.isOngoing ? '至今' : '')
    }
  })
})

const canvasHeight = computed(() => {
  if (processedItems.value.length === 0) return 900
  const maxItemY = Math.max(...processedItems.value.map(i => i.startY))
  const maxTickY = Math.max(...tickNodes.value.map(t => t.y))
  return Math.max(maxItemY, maxTickY) + 160
})
</script>

<template>
  <div class="about-page-wrapper fade-in">
    <!-- 上半層：Hero 核心簡介層 -->
    <section class="about-hero-section">
      <div class="hero-left">
        <div class="hero-tag">Milton Hsu・29・男・台北</div>
        <h1 class="hero-slogan">
          我擅長與Gemini協作，<br />
          實作出符合預期之解決方案!
        </h1>
      </div>

      <div class="hero-right">
        <p class="hero-desc">
          我具備重塑複雜架構讓別人一目了然的能力。在當YouTuber時期，透過教學相長，掌握如何研究機制及簡化呈現，教學影片10萬觀看。
        </p>
        <p class="hero-desc">
          我能高度掌握客戶需求，敏捷交付，客戶也滿意。現在仍協助產學計畫主持人，高效產出其高度認可之對外文件及專案。
        </p>
      </div>
    </section>

    <div class="section-divider-line"></div>

    <!-- 下半層：SVG 向量完美咬合地鐵圖 -->
    <section class="timeline-section">
      <div class="timeline-section-header">
        <h2 class="timeline-section-title">經歷與里程碑</h2>
        <span class="timeline-section-sub">CAREER & MILESTONES</span>
      </div>

      <div class="metro-timeline-container" :style="{ height: `${canvasHeight}px` }">
        
        <!-- ==================== 最底層：SVG 向量幾何繪圖層 (z-index: 1) ==================== -->
        <svg class="metro-svg-canvas" :style="{ height: `${canvasHeight}px` }">
          <!-- 1. 中央主幹綠線 -->
          <line 
            :x1="SPINE_X" 
            y1="25" 
            :x2="SPINE_X" 
            :y2="canvasHeight - 40" 
            class="svg-main-spine" 
          />

          <!-- 2. 所有經歷的軌道路徑線條 -->
          <!-- 區間卡片中央水平掛接引線 -->
          <path
            v-for="item in processedItems.filter(i => i.centerConnectorPath)"
            :key="'center-' + item.id"
            :d="item.centerConnectorPath"
            :stroke="item.color"
            class="svg-timeline-path"
            fill="none"
          />

          <!-- 主軌道路徑線 -->
          <path 
            v-for="item in processedItems" 
            :key="'path-' + item.id"
            :d="item.pathD"
            :stroke="item.color"
            class="svg-timeline-path"
            fill="none"
          />

          <!-- 3. ㄇ字型結束向左小箭頭 -->
          <path
            v-for="item in processedItems.filter(i => i.endArrowPath)"
            :key="'arrow-' + item.id"
            :d="item.endArrowPath"
            :fill="item.color"
          />

          <!-- 4. 進行中項目頂端的端點小圓點 -->
          <circle 
            v-for="item in processedItems.filter(i => i.isOngoing)" 
            :key="'dot-' + item.id"
            :cx="item.trackX" 
            :cy="item.endY" 
            r="3.5" 
            :fill="item.color" 
          />
        </svg>

        <!-- ==================== 中層：中央年月刻度框 (z-index: 5) ==================== -->
        <div 
          v-for="tick in tickNodes" 
          :key="tick.ymText"
          class="metro-spine-anchor"
          :style="{ top: `${tick.y}px`, left: `${SPINE_X}px` }"
        >
          <div class="metro-date-badge">{{ tick.ymText }}</div>
        </div>

        <!-- ==================== 上層：卡片本體 (z-index: 10，懸浮提升至 999) ==================== -->
        <div 
          v-for="item in processedItems" 
          :key="item.id"
          class="metro-card-wrapper"
          :class="[
            item.type === 'point' ? 'align-left' : 'align-right',
            { 'is-hovered-wrapper': activeHoverId === item.id }
          ]"
          :style="{ 
            top: `${item.cardY}px`,
            left: item.type === 'point' ? `${SPINE_X - 52}px` : `${item.trackX + 20}px`
          }"
          @mouseenter="activeHoverId = item.id"
          @mouseleave="activeHoverId = null"
        >
          <div 
            class="metro-card"
            :style="{ borderColor: item.color }"
            :class="{ 
              'is-active': activeHoverId === item.id,
              'is-ongoing-card': item.isOngoing 
            }"
          >
            <!-- 🌟 手機端專屬年份標籤：卡片內嵌展示，替代重疊失效的 SVG 刻度 -->
            <div class="mobile-date-badge" :style="{ color: item.color, borderColor: item.color }">
              {{ item.type === 'point' ? item.ymStartDate : `${item.ymStartDate} ~ ${item.ymEndDate}` }}
            </div>

            <div class="metro-card-title">{{ item.title }}</div>
            <div v-if="item.subtitle" class="metro-card-subtitle">{{ item.subtitle }}</div>

            <!-- 最頂層：懸浮說明詳細彈窗 (z-index: 9999) -->
            <div v-if="activeHoverId === item.id" class="metro-card-popover">
              <div class="popover-tag" :style="{ background: item.color }">
                {{ item.type === 'point' ? item.ymStartDate : `${item.ymStartDate} ~ ${item.ymEndDate}` }}
              </div>
              <ul v-if="item.points && item.points.length">
                <li v-for="(p, pIdx) in item.points" :key="pIdx">{{ p }}</li>
              </ul>
              <div v-else class="popover-empty-desc">{{ item.subtitle || item.title }}</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  </div>
</template>

<style scoped>
.about-page-wrapper {
  max-width: 1140px;
  margin: 0 auto;
  padding: 4rem 1.5rem 6rem;
}

/* ==================== 上半層：Hero 自述區 ==================== */
.about-hero-section {
  display: grid;
  grid-template-columns: 1.45fr 1fr;
  gap: 4rem;
  align-items: start;
  padding-bottom: 3.5rem;
}

.hero-left {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 20px;
}

.hero-tag {
  color: #ea580c;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.hero-slogan {
  font-size: 2.8rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.25;
  letter-spacing: -0.02em;
  margin: 0;
}

.hero-right {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding-top: 0.5rem;
}

.hero-desc {
  font-size: 1.05rem;
  line-height: 1.8;
  color: #334155;
  margin: 0;
}

.section-divider-line {
  width: 100%;
  height: 1px;
  background: #e2e8f0;
  margin-bottom: 4rem;
}

/* ==================== 下半層：地鐵圖時間軸 ==================== */
.timeline-section-header {
  margin-bottom: 3rem;
}

.timeline-section-title {
  font-size: 1.8rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 0.3rem 0;
}

.timeline-section-sub {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

.metro-timeline-container {
  position: relative;
  max-width: 1040px;
  margin: 0 auto;
}

/* 1. 最底層 SVG 畫布 */
.metro-svg-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1;
  pointer-events: none;
}

.svg-main-spine {
  stroke: #3f6212;
  stroke-width: 10px;
  stroke-linecap: round;
}

.svg-timeline-path {
  stroke-width: 2.5px;
  stroke-linejoin: round;
  stroke-linecap: round;
}

/* 2. 中層：中央年月刻度框 */
.metro-spine-anchor {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 5;
  pointer-events: none;
}

.metro-date-badge {
  font-size: 0.78rem;
  font-weight: 800;
  color: #1e293b;
  background: #ffffff;
  border: 1.5px solid #65a30d;
  padding: 3px 8px;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  min-width: 68px;
  text-align: center;
  white-space: nowrap;
}

/* 3. 上層：卡片定位封裝 (懸浮時提升至 999 避免被遮擋) */
.metro-card-wrapper {
  position: absolute;
  transform: translateY(-50%);
  z-index: 10;
}

.metro-card-wrapper.align-left {
  transform: translate(-100%, -50%);
}

.metro-card-wrapper.is-hovered-wrapper {
  z-index: 999;
}

/* 卡片本體 */
.metro-card {
  position: relative;
  background: #ffffff;
  border: 2px solid;
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  min-width: 230px;
  max-width: 280px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.metro-card:hover, 
.metro-card.is-active {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.metro-card-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.35;
}

.metro-card-subtitle {
  font-size: 0.78rem;
  font-weight: 600;
  color: #64748b;
  margin-top: 3px;
}

/* 進行中項目的呼吸光暈動畫 */
.is-ongoing-card {
  animation: ongoingPulse 2.4s infinite ease-in-out;
}

@keyframes ongoingPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.55);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(245, 158, 11, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
  }
}

/* 4. 最頂層：懸浮說明視窗 (z-index: 9999) */
.metro-card-popover {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  width: 310px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 1rem 1.2rem;
  box-shadow: 0 20px 42px rgba(15, 23, 42, 0.25);
  z-index: 9999;
  pointer-events: none;
}

.align-left .metro-card-popover {
  left: auto;
  right: 0;
}

.popover-tag {
  display: inline-block;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 0.6rem;
}

.metro-card-popover ul {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.84rem;
  color: #334155;
  line-height: 1.6;
}

.metro-card-popover li {
  margin-bottom: 0.35rem;
}

.popover-empty-desc {
  font-size: 0.84rem;
  color: #64748b;
  line-height: 1.5;
}

/* 🌟 電腦版預設隱藏手機版專屬年份標籤 */
.mobile-date-badge {
  display: none;
}

/* ==================== 行動端 RWD 完全修復 ==================== */
@media (max-width: 820px) {
  .about-page-wrapper {
    padding: 2.5rem 1rem 120px !important;
    overflow-x: hidden !important;
  }

  .about-hero-section {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  /* 🌟 使用流式字體 clamp()：隨螢幕寬度無段微調，確保第二行不爆出孤字 */
  .hero-slogan {
    font-size: clamp(1.65rem, 6.2vw, 1.95rem);
    line-height: 1.35;
    letter-spacing: -0.01em;
  }

  /* 時間軸容器：左側拉出垂直綠色主幹軸線 */
  .metro-timeline-container {
    height: auto !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 1.25rem !important;
    padding-left: 20px !important;
    border-left: 3px solid #3f6212; /* 時間軸主線 */
    margin-left: 12px !important;
    box-sizing: border-box !important;
  }

  /* 隱藏彈窗內重複出現的日期標籤 */
  .metro-card-popover .popover-tag {
    display: none !important;
  }

  /* 隱藏桌機 SVG 畫布與桌機浮動刻度 */
  .metro-svg-canvas,
  .metro-spine-anchor {
    display: none !important;
  }

  /* 卡片外層解除絕對定位與 left 偏移，消除向右穿刺 */
  .metro-card-wrapper {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    transform: none !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    margin: 0 !important;
  }

  /* 卡片本體充滿螢幕寬度 */
  .metro-card {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    padding: 1rem 1.25rem !important;
    border-radius: 12px !important;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06) !important;
  }

  /* 🌟 手機版專用年份標籤顯示 */
  .mobile-date-badge {
    display: inline-block !important;
    font-size: 0.76rem !important;
    font-weight: 800 !important;
    letter-spacing: 0.04em !important;
    border: 1.5px solid currentColor !important;
    border-radius: 6px !important;
    padding: 2px 8px !important;
    margin-bottom: 0.5rem !important;
    background: #f8fafc !important;
  }

  .metro-card-title {
    font-size: 1.05rem !important;
    word-break: break-word !important;
  }

  .metro-card-subtitle {
    font-size: 0.85rem !important;
    margin-top: 5px !important;
  }

  /* 手機端懸浮彈窗直接平鋪在卡片內部下方 */
  .metro-card-popover {
    position: static !important;
    width: 100% !important;
    box-shadow: none !important;
    border: none !important;
    padding: 0.75rem 0 0 !important;
    margin-top: 0.5rem !important;
    border-top: 1px dashed #e2e8f0 !important;
  }
}
</style>