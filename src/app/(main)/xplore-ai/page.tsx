'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Loader2, Bot, User, Trash2 } from 'lucide-react'

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

export default function XploreAIPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content: "Hey there! 👋 I'm **XPLORE AI**, your campus assistant. I can help you with:\n\n• 📚 Academic questions & study help\n• 📅 Campus events & reminders\n• 🏛 Club recommendations\n• 💡 Career & skill suggestions\n• 🔍 General knowledge\n\nWhat would you like to explore today?",
        },
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || loading) return
        const userMessage = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setLoading(true)

        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, { role: 'user', content: userMessage }],
                }),
            })

            const data = await res.json()
            setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'Sorry, I couldn\'t process that. Try again!' }])
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Oops! Something went wrong. Please try again.' }])
        }
        setLoading(false)
    }

    const quickActions = [
        '📚 Help me study for exams',
        '🏛 Recommend clubs for me',
        '📅 What events are coming up?',
        '💡 Career advice for CS students',
    ]

    return (
        <div style={{
            maxWidth: '768px', margin: '0 auto', display: 'flex', flexDirection: 'column',
            height: 'calc(100vh - 120px)'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{
                    width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                }}>
                    <Sparkles size={22} color="white" />
                </div>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                        XPLORE AI
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                        Powered by Gemini • Your campus assistant
                    </p>
                </div>
                <button
                    onClick={() => setMessages([messages[0]])}
                    className="hover-lift"
                    style={{
                        marginLeft: 'auto', padding: '10px', borderRadius: '12px',
                        color: 'var(--color-text-muted)', background: 'transparent',
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    title="Clear chat"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            {/* Messages */}
            <div className="no-scrollbar" style={{
                flex: 1, overflowY: 'auto', borderRadius: '20px', padding: '20px', marginBottom: '20px',
                backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                display: 'flex', flexDirection: 'column', gap: '20px',
            }}>
                {messages.map((msg, i) => (
                    <div key={i} className="animate-in" style={{
                        display: 'flex', gap: '12px',
                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                    }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                        }}>
                            {msg.role === 'user' ?
                                <User size={16} color="white" /> :
                                <Bot size={16} style={{ color: 'var(--color-primary)' }} />
                            }
                        </div>

                        <div style={{
                            maxWidth: '80%', padding: '12px 16px', borderRadius: '20px', fontSize: '14px', lineHeight: 1.6,
                            backgroundColor: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                            color: msg.role === 'user' ? 'white' : 'var(--color-text-primary)',
                            borderTopRightRadius: msg.role === 'user' ? '4px' : '20px',
                            borderTopLeftRadius: msg.role === 'user' ? '20px' : '4px',
                        }}>
                            {msg.content.split('\n').map((line, j) => (
                                <p key={j} style={{ margin: j > 0 ? '6px 0 0 0' : 0 }}>
                                    {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                                </p>
                            ))}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="animate-in" style={{ display: 'flex', gap: '12px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: 'var(--color-bg-elevated)',
                        }}>
                            <Bot size={16} style={{ color: 'var(--color-primary)' }} />
                        </div>
                        <div style={{
                            padding: '16px 20px', borderRadius: '20px', borderTopLeftRadius: '4px',
                            backgroundColor: 'var(--color-bg-elevated)',
                            display: 'flex', alignItems: 'center',
                        }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <div className="animate-bounce" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', animationDelay: '0ms' }} />
                                <div className="animate-bounce" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', animationDelay: '150ms' }} />
                                <div className="animate-bounce" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions (only show if no user messages yet) */}
            {messages.length <= 1 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                    {quickActions.map((action) => (
                        <button
                            key={action}
                            onClick={() => { setInput(action); }}
                            style={{
                                padding: '8px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 500,
                                backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                                color: 'var(--color-text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
                                e.currentTarget.style.color = 'var(--color-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--color-bg-card)';
                                e.currentTarget.style.color = 'var(--color-text-secondary)';
                            }}
                        >
                            {action}
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask XPLORE AI anything..."
                    style={{
                        flex: 1, padding: '16px 20px', borderRadius: '16px', fontSize: '15px', outline: 'none',
                        backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)'
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    disabled={loading}
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="hover-lift"
                    style={{
                        padding: '16px', borderRadius: '16px', border: 'none', cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                        color: 'white', opacity: (!input.trim() || loading) ? 0.5 : 1, transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
            </div>
        </div>
    )
}
