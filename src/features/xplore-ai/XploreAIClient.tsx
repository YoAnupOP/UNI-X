'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Bot, Loader2, Send, Sparkles, Trash2, User } from 'lucide-react'
import { fetchJson } from '@/lib/query/fetch-json'

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

const STORAGE_KEY = 'unix.xplore-ai.messages'
const starterMessages: ChatMessage[] = [
    {
        role: 'assistant',
        content: [
            'XPLORE AI is ready.',
            '',
            'I can help with:',
            '- study plans and exam prep',
            '- club and event suggestions',
            '- career direction and skill building',
            '- campus life questions',
            '',
            'Ask me anything to get started.',
        ].join('\n'),
    },
]

const quickActions = [
    'Help me build a study plan for finals week',
    'Recommend clubs for a computer science student',
    'What campus events should I check this week?',
    'Give me career advice for internships',
]

export default function XploreAIClient() {
    const [messages, setMessages] = useState<ChatMessage[]>(starterMessages)
    const [input, setInput] = useState('')
    const [hasHydrated, setHasHydrated] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const askAiMutation = useMutation({
        mutationFn: (nextMessages: ChatMessage[]) => fetchJson<{ response: string }>('/api/ai', {
            method: 'POST',
            body: JSON.stringify({ messages: nextMessages }),
        }),
        onSuccess: (result) => {
            setMessages((current) => [
                ...current,
                { role: 'assistant', content: result.response || 'I could not generate a response just now.' },
            ])
        },
        onError: () => {
            setMessages((current) => [
                ...current,
                { role: 'assistant', content: 'Something went wrong. Please try again in a moment.' },
            ])
        },
    })

    useEffect(() => {
        try {
            const stored = window.sessionStorage.getItem(STORAGE_KEY)
            if (stored) {
                const parsed = JSON.parse(stored) as ChatMessage[]
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setMessages(parsed)
                }
            }
        } catch {
            window.sessionStorage.removeItem(STORAGE_KEY)
        } finally {
            setHasHydrated(true)
        }
    }, [])

    useEffect(() => {
        if (!hasHydrated) return
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    }, [hasHydrated, messages])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, askAiMutation.isPending])

    const submitPrompt = (value: string) => {
        const trimmed = value.trim()
        if (!trimmed || askAiMutation.isPending) return

        const nextMessages = [...messages, { role: 'user' as const, content: trimmed }]
        setMessages(nextMessages)
        setInput('')
        askAiMutation.mutate(nextMessages)
    }

    const clearChat = () => {
        askAiMutation.reset()
        setMessages(starterMessages)
        setInput('')
        window.sessionStorage.removeItem(STORAGE_KEY)
    }

    const hasUserMessages = messages.some((message) => message.role === 'user')

    return (
        <div style={{ maxWidth: '920px', margin: '0 auto', display: 'grid', gap: '20px' }}>
            <section style={{
                background: 'rgba(139, 92, 246, 0.16)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '28px',
                padding: '24px',
                display: 'grid',
                gap: '18px',
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '16px',
                            background: 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Sparkles size={22} color="white" />
                        </div>
                        <div>
                            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: 0 }}>XPLORE AI</h1>
                            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '6px 0 0 0' }}>
                                Gemini-powered help that loads after the page is visible, so navigation stays fast.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={clearChat}
                        style={{
                            border: '1px solid var(--color-border)',
                            background: 'rgba(9, 9, 11, 0.35)',
                            color: 'var(--color-text-secondary)',
                            borderRadius: '14px',
                            padding: '10px 12px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}
                    >
                        <Trash2 size={16} /> Clear chat
                    </button>
                </div>

                <div className="xplore-overview" style={{ display: 'grid', gap: '12px' }}>
                    {['Study smarter', 'Find communities', 'Plan your week'].map((label, index) => (
                        <div key={label} style={{
                            padding: '14px 16px',
                            borderRadius: '18px',
                            background: index === 0 ? 'rgba(15, 23, 42, 0.42)' : 'rgba(15, 23, 42, 0.24)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}>
                            <div style={{ fontSize: '14px', fontWeight: 600 }}>{label}</div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                {index === 0 && 'Summaries, revision plans, and clearer next steps.'}
                                {index === 1 && 'Discover clubs, events, and campus opportunities faster.'}
                                {index === 2 && 'Use AI for decisions without blocking the rest of the app.'}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {!hasUserMessages && (
                <section style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Try one of these prompts</div>
                    <div className="xplore-actions" style={{ display: 'grid', gap: '12px' }}>
                        {quickActions.map((action) => (
                            <button
                                key={action}
                                onClick={() => setInput(action)}
                                style={{
                                    textAlign: 'left',
                                    padding: '14px 16px',
                                    borderRadius: '18px',
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-bg-card)',
                                    color: 'var(--color-text-primary)',
                                    cursor: 'pointer',
                                }}
                            >
                                {action}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <section style={{
                minHeight: '60vh',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '26px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
            }}>
                {messages.map((message, index) => (
                    <div key={`${message.role}-${index}`} style={{ display: 'flex', flexDirection: message.role === 'user' ? 'row-reverse' : 'row', gap: '12px' }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '14px',
                            background: message.role === 'user'
                                ? 'var(--color-primary)'
                                : 'rgba(59, 130, 246, 0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            {message.role === 'user'
                                ? <User size={18} color="white" />
                                : <Bot size={18} style={{ color: 'var(--color-primary)' }} />}
                        </div>
                        <div style={{
                            maxWidth: '82%',
                            background: message.role === 'user'
                                ? 'var(--color-primary)'
                                : 'var(--color-bg-elevated)',
                            color: message.role === 'user' ? 'white' : 'var(--color-text-primary)',
                            borderRadius: '20px',
                            padding: '14px 16px',
                            lineHeight: 1.7,
                            whiteSpace: 'pre-wrap',
                        }}>
                            {message.content}
                        </div>
                    </div>
                ))}

                {askAiMutation.isPending && (
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '14px',
                            background: 'rgba(59, 130, 246, 0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Bot size={18} style={{ color: 'var(--color-primary)' }} />
                        </div>
                        <div style={{
                            background: 'var(--color-bg-elevated)',
                            borderRadius: '20px',
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--color-text-muted)',
                        }}>
                            <Loader2 size={16} className="animate-spin" /> Thinking...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </section>

            <section style={{
                display: 'grid',
                gap: '12px',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                alignItems: 'end',
            }}>
                <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask XPLORE AI anything..."
                    rows={3}
                    style={{
                        width: '100%',
                        padding: '16px 18px',
                        borderRadius: '20px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-card)',
                        color: 'var(--color-text-primary)',
                        outline: 'none',
                        resize: 'vertical',
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault()
                            submitPrompt(input)
                        }
                    }}
                    disabled={askAiMutation.isPending}
                />
                <button
                    onClick={() => submitPrompt(input)}
                    disabled={!input.trim() || askAiMutation.isPending}
                    style={{
                        border: 'none',
                        borderRadius: '18px',
                        padding: '0 18px',
                        height: '56px',
                        background: 'var(--color-primary)',
                        color: 'white',
                        cursor: 'pointer',
                        opacity: !input.trim() || askAiMutation.isPending ? 0.6 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {askAiMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </section>

            <style>{`
                .xplore-overview,
                .xplore-actions {
                    grid-template-columns: 1fr;
                }

                @media (min-width: 900px) {
                    .xplore-overview {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }

                    .xplore-actions {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }
            `}</style>
        </div>
    )
}
