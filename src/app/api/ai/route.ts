import { NextRequest, NextResponse } from 'next/server'

// Models to try in order of preference — if one hits quota limits, the next is tried
const GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
]

const SYSTEM_PROMPT = `You are XPLORE AI, a friendly and helpful AI assistant embedded in UNI-X, a university social platform. 
You help students with:
- Academic questions and study tips
- Campus event recommendations
- Club suggestions based on interests  
- Career advice and skill development
- General knowledge queries
- University life tips

Be concise, friendly, and encouraging. Use emojis occasionally. Keep responses short and helpful (2-3 paragraphs max).
If you don't know something specific about the user's university, give general advice.`

async function callGemini(apiKey: string, model: string, geminiMessages: Array<{role: string; parts: Array<{text: string}>}>) {
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: geminiMessages,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                },
            }),
        }
    )
    const data = await res.json()
    return { ok: res.ok, status: res.status, data }
}

export async function POST(request: NextRequest) {
    try {
        const { messages } = await request.json()

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ response: "AI service is not configured yet. Please add your GEMINI_API_KEY to .env.local" }, { status: 200 })
        }

        // Gemini strictly requires alternating user/model turns, starting with user.
        const geminiMessages: Array<{role: string; parts: Array<{text: string}>}> = []
        let expectedRole = 'user'

        for (const m of messages) {
            const role = m.role === 'assistant' ? 'model' : 'user'
            if (role === expectedRole) {
                geminiMessages.push({ role, parts: [{ text: m.content }] })
                expectedRole = role === 'user' ? 'model' : 'user'
            }
        }

        // If the array ended up empty, push a fallback user message
        if (geminiMessages.length === 0) {
            geminiMessages.push({ role: 'user', parts: [{ text: "Hello" }] })
        }

        // Try each model in order — fallback on quota/rate-limit errors
        let lastError = null
        for (const model of GEMINI_MODELS) {
            const { ok, status, data } = await callGemini(apiKey, model, geminiMessages)

            if (ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                const response = data.candidates[0].content.parts[0].text
                return NextResponse.json({ response })
            }

            // If quota exhausted (429) or model unavailable, try next model
            if (status === 429 || status === 404) {
                console.warn(`Gemini model ${model} unavailable (${status}), trying next...`)
                lastError = data.error?.message || `Model ${model} returned ${status}`
                continue
            }

            // For other errors (400 invalid key, 500 server error, etc.) don't retry
            if (data.error) {
                console.error(`Gemini API Error (${model}):`, data.error.message)
                return NextResponse.json({
                    response: `AI encountered an error: ${data.error.message || 'Unknown error'}. Please try again later.`
                }, { status: 200 })
            }
        }

        // All models exhausted
        console.error('All Gemini models exhausted. Last error:', lastError)
        return NextResponse.json({
            response: "All AI models are currently at capacity. Please try again in a few minutes! ⏳"
        }, { status: 200 })

    } catch (error) {
        console.error('AI API error:', error)
        return NextResponse.json({ response: "Oops! Something went wrong. Please try again." }, { status: 200 })
    }
}
