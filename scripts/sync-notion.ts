import { Client } from '@notionhq/client'
import { NotionToMarkdown } from 'notion-to-md'
import { marked } from 'marked'
import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import dotenv from 'dotenv'
import puppeteer from 'puppeteer'

dotenv.config()

const NOTION_API_KEY = process.env.NOTION_API_KEY
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID
const NOTION_PROJECTS_DATABASE_ID = process.env.NOTION_PROJECTS_DATABASE_ID
const NOTION_TIMELINE_DATABASE_ID = process.env.NOTION_TIMELINE_DATABASE_ID

if (!NOTION_API_KEY) {
    console.error('❌ 請在 .env 檔案中確認 NOTION_API_KEY 是否正確設定')
    process.exit(1)
}

const notion = new Client({ auth: NOTION_API_KEY })
const n2m = new NotionToMarkdown({ notionClient: notion })

// Notion 顏色對應表（支援文字顏色與底色）
const NOTION_COLOR_MAP: Record<string, string> = {
    gray: 'color: #787774;',
    brown: 'color: #9F6B53;',
    orange: 'color: #D9730D;',
    yellow: 'color: #CB912F;',
    green: 'color: #448361;',
    blue: 'color: #337EA9;',
    purple: 'color: #9065B0;',
    pink: 'color: #C14C8A;',
    red: 'color: #D44C47;',
    gray_background: 'background-color: #F1F1EF; padding: 2px 4px; border-radius: 4px;',
    brown_background: 'background-color: #F4EEEE; padding: 2px 4px; border-radius: 4px;',
    orange_background: 'background-color: #FBECDD; padding: 2px 4px; border-radius: 4px;',
    yellow_background: 'background-color: #FBF3DB; padding: 2px 4px; border-radius: 4px;',
    green_background: 'background-color: #EDF3EC; padding: 2px 4px; border-radius: 4px;',
    blue_background: 'background-color: #E7F3F8; padding: 2px 4px; border-radius: 4px;',
    purple_background: 'background-color: #F4F0F7; padding: 2px 4px; border-radius: 4px;',
    pink_background: 'background-color: #F9F0F5; padding: 2px 4px; border-radius: 4px;',
    red_background: 'background-color: #FDEBEC; padding: 2px 4px; border-radius: 4px;'
}

// 將 Notion rich_text 轉為精準 HTML（同時解決顏色、** 粗體卡住與 HTML 標籤衝突問題）
function richTextToHtml(richTexts: any[]): string {
    if (!richTexts || !Array.isArray(richTexts)) return ''
    return richTexts.map((rt) => {
        let text = rt.plain_text || ''
        if (!text) return ''

        // 🌟 核心修復：先將原始純文字中的 < > & 跳脫，防止 <iframe> 等程式碼文字被瀏覽器誤判為真實 HTML 標籤
        text = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')

        const ann = rt.annotations || {}
        if (ann.bold) text = `<strong>${text}</strong>`
        if (ann.italic) text = `<em>${text}</em>`
        if (ann.strikethrough) text = `<del>${text}</del>`
        if (ann.underline) text = `<u>${text}</u>`
        if (ann.code) text = `<code>${text}</code>`
        if (rt.href) text = `<a href="${rt.href}" target="_blank" rel="noopener noreferrer">${text}</a>`
        if (ann.color && ann.color !== 'default' && NOTION_COLOR_MAP[ann.color]) {
            text = `<span style="${NOTION_COLOR_MAP[ann.color]}">${text}</span>`
        }
        return text
    }).join('')
}

// 🌟 輔助函式：遞迴取得並縮排所有巢狀子區塊（解決「怎麼克服」底下空心圓點子項目消失的問題）
async function renderChildrenWithIndent(block: any): Promise<string> {
    if (!block.has_children) return ''
    const childBlocks = await n2m.pageToMarkdown(block.id)
    const childMd = n2m.toMarkdownString(childBlocks).parent
    if (!childMd) return ''
    return '\n' + childMd
        .split('\n')
        .map((line: string) => (line.trim() ? `  ${line}` : line))
        .join('\n')
}

// 覆寫常見區塊的轉換邏輯，保留顏色、樣式與所有巢狀子項目
n2m.setCustomTransformer('paragraph', async (block: any) => {
    const text = richTextToHtml(block.paragraph?.rich_text)
    const children = await renderChildrenWithIndent(block)
    return `${text}${children}`
})
n2m.setCustomTransformer('bulleted_list_item', async (block: any) => {
    const text = richTextToHtml(block.bulleted_list_item?.rich_text)
    const children = await renderChildrenWithIndent(block)
    return `- ${text}${children}`
})
n2m.setCustomTransformer('numbered_list_item', async (block: any) => {
    const text = richTextToHtml(block.numbered_list_item?.rich_text)
    const children = await renderChildrenWithIndent(block)
    return `1. ${text}${children}`
})
n2m.setCustomTransformer('heading_1', async (block: any) => {
    return `# ${richTextToHtml(block.heading_1?.rich_text)}`
})
n2m.setCustomTransformer('heading_2', async (block: any) => {
    return `## ${richTextToHtml(block.heading_2?.rich_text)}`
})
n2m.setCustomTransformer('heading_3', async (block: any) => {
    return `### ${richTextToHtml(block.heading_3?.rich_text)}`
})
n2m.setCustomTransformer('quote', async (block: any) => {
    const text = richTextToHtml(block.quote?.rich_text)
    const children = await renderChildrenWithIndent(block)
    return `> ${text}${children}`
})

const IMAGE_DIR = path.resolve(process.cwd(), 'public/images/notion')
const PROJECTS_DIR = path.resolve(process.cwd(), 'public/projects')
const DATA_DIR = path.resolve(process.cwd(), 'src/data')
const PREVIEWS_DIR = path.resolve(process.cwd(), 'public/previews')
const POSTS_DETAIL_DIR = path.resolve(process.cwd(), 'public/posts')

if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true })
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true })
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
if (!fs.existsSync(PREVIEWS_DIR)) fs.mkdirSync(PREVIEWS_DIR, { recursive: true })
if (!fs.existsSync(POSTS_DETAIL_DIR)) fs.mkdirSync(POSTS_DETAIL_DIR, { recursive: true })

function downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath)
        const client = url.startsWith('https') ? https : http

        client.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                if (response.headers.location) {
                    downloadFile(response.headers.location, destPath).then(resolve).catch(reject)
                    return
                }
            }

            if (response.statusCode !== 200) {
                reject(new Error(`下載檔案失敗，HTTP 狀態碼: ${response.statusCode}`))
                return
            }

            response.pipe(file)
            file.on('finish', () => {
                file.close()
                resolve()
            })
        }).on('error', (err) => {
            fs.unlink(destPath, () => { })
            reject(err)
        })
    })
}

// 使用 Chrome + 瀏覽器內建 PDF.js 進行精確「單頁」繪製與截圖
async function generatePdfPreviews(pdfFilePath: string, baseName: string): Promise<string[]> {
    const previewUrls: string[] = []
    const p1File = `${baseName}-p1.png`
    const p2File = `${baseName}-p2.png`
    const p1Path = path.join(PREVIEWS_DIR, p1File)
    const p2Path = path.join(PREVIEWS_DIR, p2File)

    if (fs.existsSync(p1Path) && fs.existsSync(p2Path)) {
        return [`/previews/${p1File}`, `/previews/${p2File}`]
    }

    let browser = null
    try {
        console.log(`    🚀 啟動 Chrome 精準渲染單頁縮圖: ${baseName}...`)
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })
        const page = await browser.newPage()

        const pdfBase64 = fs.readFileSync(pdfFilePath).toString('base64')

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: transparent; }
            canvas { display: block; }
          </style>
        </head>
        <body>
          <canvas id="pdf-canvas"></canvas>
          <script>
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            let pdfDoc = null;

            async function initPdf(base64Data) {
              const raw = atob(base64Data);
              const uint8Array = new Uint8Array(raw.length);
              for (let i = 0; i < raw.length; i++) {
                uint8Array[i] = raw.charCodeAt(i);
              }
              pdfDoc = await pdfjsLib.getDocument({
                data: uint8Array,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                cMapPacked: true
              }).promise;
              return pdfDoc.numPages;
            }

            async function renderSinglePage(pageNum) {
              const page = await pdfDoc.getPage(pageNum);
              const rotation = page.rotate || 0;
              const viewport = page.getViewport({ scale: 2.0, rotation });
              const canvas = document.getElementById('pdf-canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              await page.render({ canvasContext: ctx, viewport: viewport }).promise;
              return { width: viewport.width, height: viewport.height };
            }
          </script>
        </body>
        </html>
        `

        await page.setContent(htmlContent, { waitUntil: 'load' })
        const totalPages = await page.evaluate((b64) => (window as any).initPdf(b64), pdfBase64)
        const pagesToExtract = Math.min(totalPages, 2)

        for (let pageNum = 1; pageNum <= pagesToExtract; pageNum++) {
            const currentFileName = `${baseName}-p${pageNum}.png`
            const currentFilePath = path.join(PREVIEWS_DIR, currentFileName)
            const publicUrl = `/previews/${currentFileName}`

            if (fs.existsSync(currentFilePath)) {
                previewUrls.push(publicUrl)
                continue
            }

            await page.evaluate((p) => (window as any).renderSinglePage(p), pageNum)

            const canvasElement = await page.$('#pdf-canvas')
            if (canvasElement) {
                await canvasElement.screenshot({
                    path: currentFilePath,
                    type: 'png'
                })
                console.log(`    🖼️ 成功產生精準單頁截圖: ${currentFileName} (第 ${pageNum} 頁)`)
                previewUrls.push(publicUrl)
            }
        }
    } catch (err) {
        console.error(`    ⚠️ Chrome 截圖失敗 (${baseName}):`, err)
    } finally {
        if (browser) {
            await browser.close()
        }
    }

    return previewUrls
}

// 輔助函式：解析並下載 Notion File / Link
async function handleFileProperty(files: any[], prefix: string) {
    if (!files || files.length === 0) return { mediaUrl: '', previews: [] }
    const rawUrl = files[0].file?.url || files[0].external?.url
    if (!rawUrl) return { mediaUrl: '', previews: [] }

    if (/youtube\.com|youtu\.be/i.test(rawUrl)) {
        console.log(`  🎬 識別為 YouTube: ${rawUrl}`)
        return { mediaUrl: rawUrl, previews: [] }
    }

    const cleanUrl = rawUrl.split('?')[0].toLowerCase()
    let ext = 'pdf'
    if (cleanUrl.endsWith('.png')) ext = 'png'
    else if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) ext = 'jpg'
    else if (cleanUrl.endsWith('.webp')) ext = 'webp'

    const fileName = `${prefix}.${ext}`
    const localFilePath = path.join(PROJECTS_DIR, fileName)
    const publicUrl = `/projects/${fileName}`

    try {
        if (!fs.existsSync(localFilePath)) {
            console.log(`  📥 下載檔案: ${fileName}`)
            await downloadFile(rawUrl, localFilePath)
        } else {
            console.log(`  ⚡ 本機已存在，跳過下載: ${fileName}`)
        }

        let previews: string[] = []
        if (ext === 'pdf') {
            previews = await generatePdfPreviews(localFilePath, prefix)
        }
        return { mediaUrl: publicUrl, previews }
    } catch (err) {
        console.error(`  ⚠️ 下載檔案失敗 (${fileName}):`, err)
        return { mediaUrl: '', previews: [] }
    }
}

// 輔助函式：清除標題內的 HTML 標籤並產生錨點 ID
function createHeadingId(rawText: string): { cleanText: string; id: string } {
    const cleanText = rawText.replace(/<[^>]*>/g, '').trim()
    const id = cleanText
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-+|-+$/g, '')
    return { cleanText, id }
}

// 設定 marked 自訂渲染器（建置期預先為 H1 / H2 加上錨點 ID）
const buildRenderer = new marked.Renderer()
buildRenderer.heading = ({ text, depth }: { text: string; depth: number }) => {
    if (depth === 1 || depth === 2) {
        const { id } = createHeadingId(text)
        return `<h${depth} id="${id}" class="article-h${depth}">${text}</h${depth}>`
    }
    return `<h${depth}>${text}</h${depth}>`
}

async function syncNotionPosts() {
    if (!NOTION_DATABASE_ID) return
    console.log('🔄 開始同步 Notion 文章內容（建置期預渲染模式）...')
    const response = await notion.databases.query({
        database_id: NOTION_DATABASE_ID as string,
        filter: {
            property: 'Status',
            status: {
                equals: '完成'
            }
        }
    })

    const postsIndex = []
    const activePostIds = new Set<string>()

    for (const page of response.results as any[]) {
        const pageId = page.id
        activePostIds.add(pageId)

        const title = page.properties.Title?.title?.[0]?.plain_text || page.properties.Name?.title?.[0]?.plain_text || '未命名文章'
        const subtitle = page.properties.Subtitle?.rich_text?.[0]?.plain_text || ''
        const category = page.properties.Category?.select?.name || '未分類'
        const date = page.properties.Date?.date?.start || new Date().toISOString().split('T')[0]
        const status = page.properties.Status?.status?.name || page.properties.Status?.select?.name || 'Done'
        const color = page.properties.Color?.select?.name || page.properties.Color?.rich_text?.[0]?.plain_text || '#ea580c'

        const mdBlocks = await n2m.pageToMarkdown(pageId)
        let mdString = n2m.toMarkdownString(mdBlocks).parent

        // 下載並替換文章內圖片
        const imgRegex = /!\[(.*?)\]\((.*?)\)/g
        let match
        let imgIndex = 0

        while ((match = imgRegex.exec(mdString)) !== null) {
            const imgUrl = match[2]
            if (imgUrl.includes('amazonaws.com') || imgUrl.includes('notion.so')) {
                imgIndex++
                const ext = imgUrl.split('?')[0].split('.').pop() || 'png'
                const filename = `${pageId}-${imgIndex}.${ext}`
                const localFilePath = path.join(IMAGE_DIR, filename)
                const publicUrl = `/images/notion/${filename}`

                try {
                    await downloadFile(imgUrl, localFilePath)
                    mdString = mdString.replace(imgUrl, publicUrl)
                } catch (error) {
                    console.error(`  ⚠️ 圖片下載失敗: ${imgUrl}`, error)
                }
            }
        }

        // 1. 提取階層目錄 (H1 與 H2)
        const toc: { id: string; text: string; level: number }[] = []
        mdString.split('\n').forEach((line) => {
            const hMatch = line.match(/^(#{1,2})\s+(.+)$/)
            if (hMatch) {
                const level = hMatch[1].length
                const { cleanText, id } = createHeadingId(hMatch[2])
                toc.push({ id, text: cleanText, level })
            }
        })

        // 2. 預先將 Markdown 轉成最終 HTML
        const htmlContent = marked.parse(mdString, { renderer: buildRenderer }) as string

        // 3. 產生乾淨無 HTML 標籤的純文字版本（專供後端 RAG AI 助理檢索用）
        const plainText = htmlContent
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, ' ')
            .trim()

        // 4. 寫入單篇文章獨立檔案：public/posts/[pageId].json
        const postDetail = {
            id: pageId,
            title,
            subtitle,
            category,
            date,
            status,
            color,
            toc,
            htmlContent,
            plainText
        }
        fs.writeFileSync(
            path.join(POSTS_DETAIL_DIR, `${pageId}.json`),
            JSON.stringify(postDetail, null, 2),
            'utf-8'
        )

        // 5. 加入輕量索引陣列（不含龐大內文）
        postsIndex.push({ id: pageId, title, subtitle, category, date, status, color })
    }

    // 清理已在 Notion 刪除或取消「完成」狀態的舊文章 JSON 檔
    const existingFiles = fs.readdirSync(POSTS_DETAIL_DIR)
    for (const file of existingFiles) {
        if (file.endsWith('.json')) {
            const fileId = file.replace('.json', '')
            if (!activePostIds.has(fileId)) {
                fs.unlinkSync(path.join(POSTS_DETAIL_DIR, file))
                console.log(`  🗑️ 已清理過期文章檔案: ${file}`)
            }
        }
    }

    // 寫入輕量索引檔：src/data/posts-index.json
    fs.writeFileSync(path.join(DATA_DIR, 'posts-index.json'), JSON.stringify(postsIndex, null, 2), 'utf-8')
    console.log(`🎉 文章同步完成！共 ${postsIndex.length} 篇（已產出輕量索引與獨立文章檔）`)
}

async function syncNotionProjects() {
    if (!NOTION_PROJECTS_DATABASE_ID) return
    console.log('\n🔄 開始同步 Notion Projects 作品集...')

    const response = await notion.databases.query({
        database_id: NOTION_PROJECTS_DATABASE_ID as string,
        filter: { property: 'Published', checkbox: { equals: true } },
    })

    const projects = []

    for (const page of response.results as any[]) {
        const uniqueId = page.id.replace(/-/g, '')
        const props = page.properties

        const title = props.Title?.title?.[0]?.plain_text || '未命名作品'
        const summary = props.Summary?.rich_text?.[0]?.plain_text || ''
        const tags = props.Tags?.multi_select?.map((t: any) => t.name) || []
        const beforeTitle = props['Before Title']?.rich_text?.[0]?.plain_text || ''
        const afterTitle = props['After Title']?.rich_text?.[0]?.plain_text || ''

        console.log(`📁 正在處理專案: ${title}`)

        const beforeData = await handleFileProperty(props['Before File']?.files, `project-${uniqueId}-before`)
        const afterData = await handleFileProperty(props['After File']?.files, `project-${uniqueId}-after`)

        projects.push({
            id: uniqueId,
            title,
            summary,
            tags,
            before: {
                title: beforeTitle,
                pdfUrl: beforeData.mediaUrl,
                url: beforeData.mediaUrl,
                image: beforeData.mediaUrl,
                previews: beforeData.previews,
            },
            after: {
                title: afterTitle,
                pdfUrl: afterData.mediaUrl,
                url: afterData.mediaUrl,
                image: afterData.mediaUrl,
                previews: afterData.previews,
            },
        })
    }

    fs.writeFileSync(path.join(DATA_DIR, 'projects.json'), JSON.stringify(projects, null, 2), 'utf-8')
    console.log(`🎉 作品集同步完成！共 ${projects.length} 筆專案`)
}

async function syncNotionTimeline() {
    if (!NOTION_TIMELINE_DATABASE_ID) return
    console.log('\n🔄 開始同步 Notion Timeline 時間軸資料...')

    const response = await notion.databases.query({
        database_id: NOTION_TIMELINE_DATABASE_ID as string,
        filter: { property: 'Published', checkbox: { equals: true } },
    })

    const timelineItems: any[] = []

    for (const page of response.results as any[]) {
        const props = page.properties
        const title = props.Title?.title?.[0]?.plain_text || '未命名事件'
        const subtitle = props.Subtitle?.rich_text?.[0]?.plain_text || ''
        const rawType = props.Type?.select?.name?.toLowerCase() || 'point'
        const type = rawType.includes('range') ? 'range' : 'point'
        const color = props.Color?.rich_text?.[0]?.plain_text?.trim() || props.Color?.select?.name?.trim() || ''
        const rawTrack = props.Track?.rich_text?.[0]?.plain_text ?? props.Track?.number ?? props.Track?.select?.name ?? 1
        const track = Number(rawTrack) || 1
        const category = props.Category?.select?.name || props.Category?.rich_text?.[0]?.plain_text || ''

        const dateObj = props.Date?.date
        const startDate = dateObj?.start || '2026-01-01'
        const endDate = dateObj?.end || null
        const isOngoing = type === 'range' && !endDate

        const formatYM = (dStr: string) => {
            const parts = dStr.split('-')
            return parts.length >= 2 ? `${parts[0]}.${parseInt(parts[1], 10)}` : dStr
        }

        const startDisplay = formatYM(startDate)
        let dateDisplay = startDisplay

        if (type === 'range') {
            if (isOngoing) dateDisplay = `${startDisplay} - 至今`
            else if (endDate) dateDisplay = `${startDisplay} - ${formatYM(endDate)}`
        }

        const rawPoints = props.Points?.rich_text?.[0]?.plain_text || ''
        const points = rawPoints.split('\n').map((line: string) => line.replace(/^[•\-\*]\s*/, '').trim()).filter((line: string) => line.length > 0)

        timelineItems.push({
            id: page.id,
            type,
            color,
            track,
            category,
            title,
            subtitle,
            startDate,
            endDate,
            isOngoing,
            dateDisplay,
            points
        })
    }

    timelineItems.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    fs.writeFileSync(path.join(DATA_DIR, 'timeline.json'), JSON.stringify(timelineItems, null, 2), 'utf-8')
    console.log(`🎉 時間軸同步完成！共 ${timelineItems.length} 筆資料`)
}

async function main() {
    await syncNotionPosts()
    await syncNotionProjects()
    await syncNotionTimeline()
}

main().catch((err) => {
    console.error('❌ 同步執行中斷:', err)
})