<template>
  <div class="solutions-page-wrapper fade-in">
    <div class="solutions-header-block">
      <h2 class="solutions-main-title">我能解決: 專業內容被讀懂、使用者體驗更流暢</h2>
      <p class="solutions-sub-desc">
        結合嚴謹的資訊架構重組、視覺引導與現代前端工程，專注為複雜簡報、學術報告與個人專案<br>打造兼具美感與高效能的解答。
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
          <span>✦ 出版級向量檔/PDF/PPT/WORD等</span>
        </div>
      </div>

      <div class="solution-card">
        <div class="card-num">02</div>
        <h3 class="solution-card-title">現代全端與雲端 AI 架構</h3>
        <p class="solution-card-desc">
          精準善用開源工具與免費雲端層（Cloudflare / Render / GitHub），結合 Vue 3 前端工程與 RAG AI 助理。不需額外支付伺服器月租，即可享受全自動同步、極速載入與智慧對話的現代化體驗。
        </p>
        <div class="solution-points">
          <span>✦ 零主機月費 / 零營運成本架構</span>
          <span>✦ GitHub Actions + Cloudflare 免費整合</span>
          <span>✦ 輕量級雲端 RAG AI 免費託管實踐</span>
        </div>
      </div>

      <div class="solution-card">
        <div class="card-num">03</div>
        <h3 class="solution-card-title">Notion自動化工作流</h3>
        <p class="solution-card-desc">
          打造「專注創作、無痛發布」的現代化個人內容生態系。透過 Notion API 與自動化工作流，讓高價值內容的產出與維護毫不費力。簡單來說，只要在Notion撰寫新文章，便會自動更新。
        </p>
        <div class="solution-points">
          <span>✦ Notion API 自動化同步</span>
          <span>✦ 輕量敏捷個人工作流建置</span>
          <span>✦ 免碰程式碼的發布體驗</span>
        </div>
      </div>
    </div>

    <section class="process-section">
      <h3 class="process-title">COLLABORATION PROCESS / 合作流程</h3>
      <div class="process-steps">
        <div class="step-item">
          <div class="step-badge">STEP 1</div>
          <h4>需求診斷</h4>
          <p>盤點現有檔案、目標受眾<br>與核心痛點</p>
        </div>
        <div class="step-item">
          <div class="step-badge">STEP 2</div>
          <h4>架構規劃</h4>
          <p>梳理資訊層級、視覺規範<br>或系統架構原型</p>
        </div>
        <div class="step-item">
          <div class="step-badge">STEP 3</div>
          <h4>精修實作</h4>
          <p>落實排版打磨、效能調校<br>與邊界測試</p>
        </div>
        <div class="step-item">
          <div class="step-badge">STEP 4</div>
          <h4>驗收交付</h4>
          <p>完整檔案交付、原始碼部署<br>與後續支援</p>
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
</template>

<style scoped>
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
  font-size: 2.2rem;
  font-weight: 800;
  color: #15803d;
  margin-bottom: 0.1rem;
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

.contact-cards-container {
  display: flex;
  justify-content: center;
}

.contact-card {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 1.8rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  text-decoration: none;
  color: #1e293b;
  transition: all 0.2s ease;
}

.contact-card:hover {
  background: #123247;
  color: #ffffff;
  border-color: #123247;
  transform: translateY(-2px);
}

.contact-card:hover .card-details p {
  color: #e2e8f0;
}

.card-icon {
  font-size: 1.4rem;
}

.card-details h3 {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
}

.card-details p {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0;
  transition: color 0.2s ease;
}
</style>