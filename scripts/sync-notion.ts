import { Client } from '@notionhq/client'
import { NotionToMarkdown } from 'notion-to-md'
import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import dotenv from 'dotenv'

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

// 建立存放圖片、PDF 與資料檔的資料夾路徑
const IMAGE_DIR = path.resolve(process.cwd(), 'public/images/notion')
const PROJECTS_DIR = path.resolve(process.cwd(), 'public/projects')
const DATA_DIR = path.resolve(process.cwd(), 'src/data')

if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true })
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true })
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

import * as Canvas from '@napi-rs/canvas'
import moduleAlias from 'module'

// 1. 補充 Node.js 缺失的瀏覽器繪圖全域物件 (DOMMatrix, Path2D)
// @ts-ignore
if (!global.DOMMatrix) global.DOMMatrix = Canvas.DOMMatrix
// @ts-ignore
if (!global.Path2D) global.Path2D = Canvas.Path2D

// 2. 告訴 Node.js 把找不到的 'canvas' 導向到 '@napi-rs/canvas'
// @ts-ignore
const originalRequire = moduleAlias.prototype.require
// @ts-ignore
moduleAlias.prototype.require = function (id: string, ...args: any[]) {
    if (id === 'canvas') return Canvas
    // @ts-ignore
    return originalRequire.apply(this, [id, ...args])
}

const { createCanvas } = Canvas

// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js'

const PREVIEWS_DIR = path.resolve(process.cwd(), 'public/previews')
if (!fs.existsSync(PREVIEWS_DIR)) fs.mkdirSync(PREVIEWS_DIR, { recursive: true })

// 通用工具函式：下載網路檔案存入本機
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

// 自動解析 PDF 前兩頁並儲存為 PNG 圖片
async function generatePdfPreviews(pdfFilePath: string, baseName: string): Promise<string[]> {
    const previewUrls: string[] = []

    try {
        const data = new Uint8Array(fs.readFileSync(pdfFilePath))
        const loadingTask = pdfjsLib.getDocument({ data })
        const pdfDoc = await loadingTask.promise

        const pagesToExtract = Math.min(pdfDoc.numPages, 2)

        for (let i = 1; i <= pagesToExtract; i++) {
            const previewFileName = `${baseName}-p${i}.png`
            const previewFilePath = path.join(PREVIEWS_DIR, previewFileName)
            const publicUrl = `/previews/${previewFileName}`

            if (fs.existsSync(previewFilePath)) {
                previewUrls.push(publicUrl)
                continue
            }

            const page = await pdfDoc.getPage(i)
            const viewport = page.getViewport({ scale: 1.5 })
            const canvas = createCanvas(viewport.width, viewport.height)
            const context = canvas.getContext('2d')

            await page.render({
                canvasContext: context as any,
                viewport: viewport
            }).promise

            const buffer = canvas.toBuffer('image/png')
            fs.writeFileSync(previewFilePath, buffer)
            console.log(`    🖼️ 自動生成預覽圖: ${previewFileName}`)
            previewUrls.push(publicUrl)
        }
    } catch (err) {
        console.error(`    ⚠️ 生成 PDF 預覽圖失敗 (${baseName}):`, err)
    }

    return previewUrls
}

// 任務一：同步 Notion 文章 (支援 Subtitle 副標題/摘要)
async function syncNotionPosts() {
    if (!NOTION_DATABASE_ID) {
        console.log('⚠️ 未設定 NOTION_DATABASE_ID，跳過文章同步。')
        return
    }

    console.log('🔄 開始同步 Notion 文章內容...')

    const response = await notion.databases.query({
        database_id: NOTION_DATABASE_ID as string,
    })

    const posts = []

    for (const page of response.results as any[]) {
        const pageId = page.id
        const title = page.properties.Title?.title?.[0]?.plain_text || page.properties.Name?.title?.[0]?.plain_text || '未命名文章'
        const subtitle = page.properties.Subtitle?.rich_text?.[0]?.plain_text || ''
        const category = page.properties.Category?.select?.name || '未分類'
        const date = page.properties.Date?.date?.start || new Date().toISOString().split('T')[0]
        const status = page.properties.Status?.status?.name || page.properties.Status?.select?.name || 'Done'

        console.log(`📄 正在處理文章: ${title} [${status}]`)

        const mdBlocks = await n2m.pageToMarkdown(pageId)
        let mdString = n2m.toMarkdownString(mdBlocks).parent

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
                    console.log(`  📸 正在下載圖片: ${filename}`)
                    await downloadFile(imgUrl, localFilePath)
                    mdString = mdString.replace(imgUrl, publicUrl)
                } catch (error) {
                    console.error(`  ⚠️ 圖片下載失敗: ${imgUrl}`, error)
                }
            }
        }

        posts.push({
            id: pageId,
            title,
            subtitle,
            category,
            date,
            status,
            content: mdString
        })
    }

    const outputPath = path.join(DATA_DIR, 'posts.json')
    fs.writeFileSync(outputPath, JSON.stringify(posts, null, 2), 'utf-8')
    console.log(`🎉 文章同步完成！共下載 ${posts.length} 篇文章，已儲存至 src/data/posts.json`)
}

// 任務二：同步 Notion Projects 作品集
async function syncNotionProjects() {
    if (!NOTION_PROJECTS_DATABASE_ID) {
        console.log('⚠️ 未設定 NOTION_PROJECTS_DATABASE_ID，跳過作品集同步。')
        return
    }

    console.log('\n🔄 開始同步 Notion Projects 作品集...')

    const response = await notion.databases.query({
        database_id: NOTION_PROJECTS_DATABASE_ID as string,
        filter: {
            property: 'Published',
            checkbox: {
                equals: true,
            },
        },
    })

    const projects = []

    for (const page of response.results as any[]) {
        const pageId = page.id
        const shortId = pageId.replace(/-/g, '').slice(0, 8)
        const props = page.properties

        const title = props.Title?.title?.[0]?.plain_text || '未命名作品'
        const summary = props.Summary?.rich_text?.[0]?.plain_text || ''
        const tags = props.Tags?.multi_select?.map((t: any) => t.name) || []
        const beforeTitle = props['Before Title']?.rich_text?.[0]?.plain_text || ''
        const afterTitle = props['After Title']?.rich_text?.[0]?.plain_text || ''

        console.log(`📁 正在處理專案: ${title}`)

        let beforePdfUrl = ''
        let beforePreviews: string[] = []
        const beforeFiles = props['Before File']?.files
        if (beforeFiles && beforeFiles.length > 0) {
            const rawUrl = beforeFiles[0].file?.url || beforeFiles[0].external?.url
            if (rawUrl) {
                const safeFileName = `project-${shortId}-before.pdf`
                const localFilePath = path.join(PROJECTS_DIR, safeFileName)
                try {
                    if (fs.existsSync(localFilePath)) {
                        console.log(`  ⚡ 本機已存在，跳過下載: ${safeFileName}`)
                    } else {
                        console.log(`  📥 下載 Before PDF 並自動更名: ${safeFileName}`)
                        await downloadFile(rawUrl, localFilePath)
                    }
                    beforePdfUrl = `/projects/${safeFileName}`
                    beforePreviews = await generatePdfPreviews(localFilePath, `project-${shortId}-before`)
                } catch (err) {
                    console.error(`  ⚠️ Before 檔案下載失敗:`, err)
                }
            }
        }

        let afterPdfUrl = ''
        let afterPreviews: string[] = []
        const afterFiles = props['After File']?.files
        if (afterFiles && afterFiles.length > 0) {
            const rawUrl = afterFiles[0].file?.url || afterFiles[0].external?.url
            if (rawUrl) {
                const safeFileName = `project-${shortId}-after.pdf`
                const localFilePath = path.join(PROJECTS_DIR, safeFileName)
                try {
                    if (fs.existsSync(localFilePath)) {
                        console.log(`  ⚡ 本機已存在，跳過下載: ${safeFileName}`)
                    } else {
                        console.log(`  📥 下載 After PDF 並自動更名: ${safeFileName}`)
                        await downloadFile(rawUrl, localFilePath)
                    }
                    afterPdfUrl = `/projects/${safeFileName}`
                    afterPreviews = await generatePdfPreviews(localFilePath, `project-${shortId}-after`)
                } catch (err) {
                    console.error(`  ⚠️ After 檔案下載失敗:`, err)
                }
            }
        }

        projects.push({
            id: shortId,
            title,
            summary,
            tags,
            before: {
                title: beforeTitle,
                pdfUrl: beforePdfUrl,
                previews: beforePreviews,
            },
            after: {
                title: afterTitle,
                pdfUrl: afterPdfUrl,
                previews: afterPreviews,
            },
        })
    }

    const outputPath = path.join(DATA_DIR, 'projects.json')
    fs.writeFileSync(outputPath, JSON.stringify(projects, null, 2), 'utf-8')
    console.log(`🎉 作品集同步完成！共下載 ${projects.length} 筆專案，已儲存至 src/data/projects.json`)
}

// 任務三：同步 Notion Timeline 時間軸
async function syncNotionTimeline() {
    if (!NOTION_TIMELINE_DATABASE_ID) {
        console.log('⚠️ 未設定 NOTION_TIMELINE_DATABASE_ID，跳過時間軸同步。')
        return
    }

    console.log('\n🔄 開始同步 Notion Timeline 時間軸資料...')

    const response = await notion.databases.query({
        database_id: NOTION_TIMELINE_DATABASE_ID as string,
        filter: {
            property: 'Published',
            checkbox: {
                equals: true,
            },
        },
    })

    const timelineItems: any[] = []

    for (const page of response.results as any[]) {
        const props = page.properties

        const title = props.Title?.title?.[0]?.plain_text || '未命名事件'
        const subtitle = props.Subtitle?.rich_text?.[0]?.plain_text || ''
        const rawType = props.Type?.select?.name?.toLowerCase() || 'point'
        const type = rawType.includes('range') ? 'range' : 'point'

        // 1. 讀取 Notion 的 Color (支援 Text 或 Select 格式)
        const color = props.Color?.rich_text?.[0]?.plain_text?.trim()
            || props.Color?.select?.name?.trim()
            || ''

        // 2. 讀取 Notion 的 Track (支援 Text, Number 或 Select 格式)
        const rawTrack = props.Track?.rich_text?.[0]?.plain_text
            ?? props.Track?.number
            ?? props.Track?.select?.name
            ?? 1
        const track = Number(rawTrack) || 1

        // 3. 備援相容 Category (若有的話)
        const category = props.Category?.select?.name
            || props.Category?.rich_text?.[0]?.plain_text
            || ''

        // 處理日期與區間
        const dateObj = props.Date?.date
        const startDate = dateObj?.start || '2026-01-01'
        const endDate = dateObj?.end || null
        const isOngoing = type === 'range' && !endDate

        // 格式化顯示字串 (例：2022.2、2022.2 - 至今)
        const formatYM = (dStr: string) => {
            const parts = dStr.split('-')
            return parts.length >= 2 ? `${parts[0]}.${parseInt(parts[1], 10)}` : dStr
        }

        const startDisplay = formatYM(startDate)
        let dateDisplay = startDisplay

        if (type === 'range') {
            if (isOngoing) {
                dateDisplay = `${startDisplay} - 至今`
            } else if (endDate) {
                dateDisplay = `${startDisplay} - ${formatYM(endDate)}`
            }
        }

        // 解析多行重點 (換行切分成陣列)
        const rawPoints = props.Points?.rich_text?.[0]?.plain_text || ''
        const points = rawPoints
            .split('\n')
            .map((line: string) => line.replace(/^[•\-\*]\s*/, '').trim())
            .filter((line: string) => line.length > 0)

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

    // 依開始日期由新到舊排序 (降冪)
    timelineItems.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

    const outputPath = path.join(DATA_DIR, 'timeline.json')
    fs.writeFileSync(outputPath, JSON.stringify(timelineItems, null, 2), 'utf-8')
    console.log(`🎉 時間軸同步完成！共下載 ${timelineItems.length} 筆資料，已儲存至 src/data/timeline.json`)
}

// 主執行流程
async function main() {
    await syncNotionPosts()
    await syncNotionProjects()
    await syncNotionTimeline()
}

main().catch((err) => {
    console.error('❌ 同步執行中斷:', err)
})