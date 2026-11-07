interface Env {
    GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context;

    try {
        const body = (await request.json()) as { message?: string };
        const userMessage = body.message;

        if (!userMessage) {
            return new Response(JSON.stringify({ error: "訊息不能為空" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const systemPrompt = `你現在是 Milton 的個人 AI 助理。請根據 Milton 的背景回答訪客問題，語氣親切專業。如果不知道細節，請建議訪客直接與 Milton 聯絡。`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: `${systemPrompt}\n\n訪客提問：${userMessage}` }]
                        }
                    ]
                })
            }
        );

        const data: any = await response.json();
        const replyText =
            data.candidates?.[0]?.content?.parts?.[0]?.text || "抱歉，目前無法取得回覆。";

        return new Response(JSON.stringify({ reply: replyText }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: "連線異常", details: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};