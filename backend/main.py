import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_community.document_loaders import TextLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from google import genai

# 1. 讀取環境變數
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("⚠️ 警告：找不到 GEMINI_API_KEY 環境變數！")

# 全域變數
retriever = None
full_knowledge_text = ""
client = None

def init_rag_system():
    global retriever, full_knowledge_text, client
    print("正在載入履歷與 Notion 最新文章並建立向量庫...")

    all_documents = []

    # A. 載入基底履歷
    if os.path.exists("milton_knowledge.md"):
        loader = TextLoader("milton_knowledge.md", encoding="utf-8")
        all_documents.extend(loader.load())
        print("✅ 已載入基礎履歷 milton_knowledge.md")

    # B. 載入 posts.json
    posts_json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../src/data/posts.json"))
    if not os.path.exists(posts_json_path):
        posts_json_path = "posts.json"

    if os.path.exists(posts_json_path):
        try:
            with open(posts_json_path, "r", encoding="utf-8") as f:
                posts_data = json.load(f)
                for post in posts_data:
                    title = post.get("title", "")
                    category = post.get("category", "")
                    date = post.get("date", "")
                    content = post.get("content", "")
                    doc_text = f"【Notion部落格文章】\n標題: {title}\n分類: {category}\n日期: {date}\n內容:\n{content}"
                    all_documents.append(Document(page_content=doc_text, metadata={"source": "notion_post", "title": title}))
            print(f"✅ 已成功載入 Notion 最新文章共 {len(posts_data)} 篇！")
        except Exception as e:
            print(f"⚠️ 載入 posts.json 失敗: {e}")

    # C. 載入 projects.json
    projects_json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../src/data/projects.json"))
    if not os.path.exists(projects_json_path):
        projects_json_path = "projects.json"

    if os.path.exists(projects_json_path):
        try:
            with open(projects_json_path, "r", encoding="utf-8") as f:
                projects_data = json.load(f)
                for proj in projects_data:
                    title = proj.get("title", "")
                    summary = proj.get("summary", "")
                    tags = ", ".join(proj.get("tags", []))
                    doc_text = f"【Milton 作品專案】\n名稱: {title}\n標籤: {tags}\n簡介概述: {summary}"
                    all_documents.append(Document(page_content=doc_text, metadata={"source": "notion_project", "title": title}))
            print(f"✅ 已成功載入 Notion 專案作品共 {len(projects_data)} 筆！")
        except Exception as e:
            print(f"⚠️ 載入 projects.json 失敗: {e}")

    full_knowledge_text = "\n\n".join(doc.page_content for doc in all_documents)

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=600,
        chunk_overlap=100
    )
    split_docs = text_splitter.split_documents(all_documents)

    # 改用 Google 官方輕量雲端 Embeddings
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=api_key
    )

    vectorstore = Chroma.from_documents(
        documents=split_docs,
        embedding=embeddings,
        collection_name="milton_portfolio_knowledge"
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
    client = genai.Client(api_key=api_key)
    print("✅ RAG 知識庫初始化完畢！")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 服務啟動時在背景載入知識庫
    init_rag_system()
    yield

app = FastAPI(
    title="Milton Hsu Portfolio RAG API",
    description="專為個人網站打造的 AI 知識庫檢索增強問答服務",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    answer: str

@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    global retriever, full_knowledge_text, client

    user_query = request.message.strip()
    if not user_query:
        raise HTTPException(status_code=400, detail="問題內容不能為空")

    if not retriever or not client:
        raise HTTPException(status_code=503, detail="AI 助理服務正在初始化中，請稍候片刻再試")

    try:
        relevant_docs = retriever.invoke(user_query)
        retrieved_context = "\n\n".join(doc.page_content for doc in relevant_docs)

        context_text = f"{retrieved_context}\n\n【完整背景資料（含最新部落格與作品）】:\n{full_knowledge_text}"

        prompt = f"""你現在是 Milton 的個人數位助理。
請根據下方提供的【參考資料】，用客觀、專業、親切且條理分明的繁體中文回答訪客的問題。

規則：
1. 嚴格依照【參考資料】中的事實回答，請勿捏造未提及的經歷。
2. 若參考資料中完全沒有提及該問題的相關內容，請禮貌回覆「抱歉，這部分內容不在 Milton 目前公開的檔案中，歡迎直接透過網站上的信箱進一步聯絡他」。
3. 訪客若詢問近期發布的新文章、特定主題或專案內容，請依據【Notion部落格文章】與【Milton 作品專案】的內容完整說明。
4. 回答請條理清晰，重點可以使用條列式呈現。

【參考資料】：
{context_text}

問題：{user_query}
回答："""

        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt,
        )

        return ChatResponse(answer=response.text)

    except Exception as e:
        print(f"生成出錯: {e}")
        raise HTTPException(status_code=500, detail=f"AI 生成失敗: {str(e)}")

@app.get("/")
def health_check():
    return {"status": "online", "service": "Milton Portfolio RAG API"}