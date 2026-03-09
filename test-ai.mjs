async function test() {
    const res = await fetch('http://localhost:3000/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages: [
                { role: 'assistant', content: 'Hi I am Xplore AI.' },
                { role: 'user', content: 'Hello' }
            ]
        })
    })

    const data = await res.json()
    console.log('Response:', data)
}

test()
