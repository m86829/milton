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

const IMAGE_DIR = path.resolve(process.cwd(), 'public/images/notion')
const PROJECTS_DIR = path.resolve(process.cwd(), 'public/projects')
const DATA_DIR = path.resolve(process.cwd(), 'src/data')
const PREVIEWS_DIR = path.resolve(process.cwd(), 'public/previews')

if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true })
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true })
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
if (!fs.existsSync(PREVIEWS_DIR)) fs.mkdirSync(PREVIEWS_DIR, { recursive: true })

import * as Canvas from '@napi-rs/canvas'
import moduleAlias from 'module'

// @ts-ignore
if (!global.DOMMatrix) global.DOMMatrix = Canvas.DOMMatrix
// @ts-ignore
if (!global.Path2D) global.Path2D = Canvas.Path2D

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
            previewUrls.push(publicUrl)
        }
    } catch (err) {
        console.error(`    ⚠️ 生成 PDF 預覽圖失敗 (${baseName}):`, err)
    }
    return previewUrls
}

// 輔助函式：解析並下載 Notion File / Link
async function handleFileProperty(files: any[], prefix: string) {
    if (!files || files.length === 0) return { mediaUrl: '', previews: [] }
    const rawUrl = files[0].file?.url || files[0].external?.url
    if (!rawUrl) return { mediaUrl: '', previews: [] }

    // 1. YouTube 外部連結
    if (/youtube\.com|youtu\.be/i.test(rawUrl)) {
        console.log(`  🎬 識別為 YouTube: ${rawUrl}`)
        return { mediaUrl: rawUrl, previews: [] }
    }

    // 2. 判斷副檔名
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

async function syncNotionPosts() {
    if (!NOTION_DATABASE_ID) return
    console.log('🔄 開始同步 Notion 文章內容...')
    const response = await notion.databases.query({ database_id: NOTION_DATABASE_ID as string })
    const posts = []

    for (const page of response.results as any[]) {
        const pageId = page.id
        const title = page.properties.Title?.title?.[0]?.plain_text || page.properties.Name?.title?.[0]?.plain_text || '未命名文章'
        const subtitle = page.properties.Subtitle?.rich_text?.[0]?.plain_text || ''
        const category = page.properties.Category?.select?.name || '未分類'
        const date = page.properties.Date?.date?.start || new Date().toISOString().split('T')[0]
        const status = page.properties.Status?.status?.name || page.properties.Status?.select?.name || 'Done'

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
                    await downloadFile(imgUrl, localFilePath)
                    mdString = mdString.replace(imgUrl, publicUrl)
                } catch (error) {
                    console.error(`  ⚠️ 圖片下載失敗: ${imgUrl}`, error)
                }
            }
        }

        posts.push({ id: pageId, title, subtitle, category, date, status, content: mdString })
    }

    fs.writeFileSync(path.join(DATA_DIR, 'posts.json'), JSON.stringify(posts, null, 2), 'utf-8')
    console.log(`🎉 文章同步完成！共 ${posts.length} 篇`)
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
        // 使用完整無連字號的 page.id 確保每一筆卡片 id 絕對唯一
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