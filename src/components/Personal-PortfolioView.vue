<template>
  <div class="tab-content work-grid fade-in">

    <a href="https://forum.gamer.com.tw/C.php?bsn=18966&snA=142042&tnum=1" target="_blank" class="work-item" style="text-decoration: none;">
      <div class="work-preview-box" style="background-image: url('/巴哈-光環計算機頁面.png'); background-size: cover; background-position: center;"></div>
      <div class="work-info">
        <h3>流亡黯道遊戲 純自製小工具-光環計算機  巴哈姆特論壇</h3>
        <div class="work-category">2026/6 將原本excel的檔案，透過與Gemini協作，包裝成網頁形式，利於公開分享。這篇文章開頭提供此工具的網址，後續為教學如何使用。</div>
        <div class="work-link" style="margin-top: 4px; font-weight: 600; color: #111111;">閱讀文章 ↗</div>
      </div>
    </a>

    <a href="https://contrastchecker.pages.dev/" target="_blank" class="work-item" style="text-decoration: none;">
      <div class="work-preview-box" style="background-image: url('/對比度網站頁面.png'); background-size: cover; background-position: center;"></div>
      <div class="work-info">
        <h3> 純自製小工具-快速取得色碼/顏色對比度</h3>
        <div class="work-category">2026/5 隨著跟Gemini越來越多協作，寫程式或設計常需要使用到6位色碼，乾脆直接做成實用小工具，滴管一點就知道了，快速解決問題。</div>
        <div class="work-link" style="margin-top: 4px; font-weight: 600; color: #111111;">查看網站 ↗</div>
      </div>
    </a>


    <a href="https://forum.gamer.com.tw/C.php?bsn=18966&snA=141076" target="_blank" class="work-item" style="text-decoration: none;">
      <div class="work-preview-box" style="background-image: url('/巴哈-火炮砲塔封面.png'); background-size: cover; background-position: center;"></div>
      <div class="work-info">
        <h3>流亡黯道遊戲 流派發表 獲得552GP(讚)  巴哈姆特論壇</h3>
        <div class="work-category">2026/1 手把手分享如何從0開始遊玩此流派的攻略，網友稱讚像論文一樣!</div>
        <div class="work-link" style="margin-top: 4px; font-weight: 600; color: #111111;">閱讀文章 ↗</div>
      </div>
    </a>

    <div class="work-item">
      <div class="work-preview-box" style="background-image: url('/聯盟戰旗- 菁英.png'); background-size: cover; background-position: center;"></div>
      <div class="work-info">
        <h3>聯盟戰棋遊戲S14賽季「菁英」(前50)</h3>
        <div class="work-category">2025/6 與當初FreeFire朋友，達成雙人搭檔模式「菁英」。</div>
      </div>
    </div>

    <a href="https://forum.gamer.com.tw/C.php?bsn=18966&snA=132958" target="_blank" class="work-item" style="text-decoration: none;">
      <div class="work-preview-box" style="background-image: url('/巴哈-3.21彈片砲塔.png'); background-size: cover; background-position: center;"></div>
      <div class="work-info">
        <h3>流亡黯道遊戲 流派發表 獲得519GP(讚) 巴哈姆特論壇</h3>
        <div class="work-category">2023/8 手把手分享如何從0開始的攻略，廣獲好評。</div>
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
</template>

<style scoped>
.work-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

.work-item {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
}

.work-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.work-preview-box {
  width: 100%;
  aspect-ratio: 16 / 9;
  background-color: #f1f5f9;
}

.work-info {
  padding: 1.25rem 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.work-info h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
  margin: 0;
}

.work-category {
  font-size: 0.88rem;
  color: #64748b;
  line-height: 1.5;
}
</style>