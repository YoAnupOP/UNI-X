import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
        let key = match[1]
        let value = match[2] || ''
        value = value.replace(/^['"]|['"]$/g, '').trim()
        envVars[key] = value
    }
})

const apiKey = envVars['GEMINI_API_KEY']

const messages = [
    { role: 'assistant', content: 'Hi I am Xplore AI.' },
    { role: 'user', content: 'Hello' }
]

const geminiMessages = []
let expectedRole = 'user'
for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user'
    if (role === expectedRole) {
        geminiMessages.push({ role, parts: [{ text: m.content }] })
        expectedRole = role === 'user' ? 'model' : 'user'
    }
}
if (geminiMessages.length === 0) {
    geminiMessages.push({ role: 'user', parts: [{ text: "Hello" }] })
}

const systemPrompt = `You are XPLORE AI...`

async function test() {
    console.log("Sending:", JSON.stringify(geminiMessages, null, 2))
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: geminiMessages,
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
    })

    const data = await res.json()
    console.log("Response:", JSON.stringify(data, null, 2))
}

test()
