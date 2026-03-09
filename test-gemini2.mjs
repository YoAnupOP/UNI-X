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

async function test() {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: "You are Xplore AI" }] },
            contents: [{ role: 'user', parts: [{ text: "Hello" }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
    })

    const data = await res.json()
    console.log(JSON.stringify(data, null, 2))
}

test()
