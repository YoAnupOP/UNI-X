'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Conversation, Message, Profile } from '@/lib/types'
import { useCachedQuery } from '@/lib/useCachedQuery'
import { Send, Search, MessageCircle, Check, CheckCheck, ChevronLeft } from 'lucide-react'

// ── Helpers ──
function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const diff = today.getTime() - msgDate.getTime()
    const dayMs = 86400000

    if (diff === 0) return 'Today'
    if (diff === dayMs) return 'Yesterday'
    if (diff < 7 * dayMs) return d.toLocaleDateString([], { weekday: 'long' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

function formatSidebarTime(dateStr: string) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const diff = today.getTime() - msgDate.getTime()
    if (diff === 0) return formatTime(dateStr)
    if (diff === 86400000) return 'Yesterday'
    if (diff < 7 * 86400000) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function shouldShowDateSeparator(messages: Message[], index: number) {
    if (index === 0) return true
    const prev = new Date(messages[index - 1].created_at)
    const curr = new Date(messages[index].created_at)
    return prev.toDateString() !== curr.toDateString()
}

// ── Typing dots animation component ──
function TypingIndicator() {
    return (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '4px' }}>
            <div style={{
                padding: '12px 18px', borderRadius: '20px', borderBottomLeftRadius: '4px',
                backgroundColor: 'var(--color-bg-elevated)', display: 'flex', alignItems: 'center', gap: '4px',
            }}>
                <span className="typing-dot" style={{ animationDelay: '0s' }} />
                <span className="typing-dot" style={{ animationDelay: '0.15s' }} />
                <span className="typing-dot" style={{ animationDelay: '0.3s' }} />
            </div>
        </div>
    )
}

// ── Status icon component ──
function MessageStatus({ msg, isLastByMe, allRead }: { msg: Message; isLastByMe: boolean; allRead: boolean }) {
    const isTemp = msg.id.startsWith('temp-')
    if (isTemp) {
        // Sending...
        return (
            <span style={{ display: 'inline-flex', marginLeft: '4px', opacity: 0.5 }}>
                <Check size={14} />
            </span>
        )
    }
    // Sent & read
    if (msg.is_read || allRead) {
        return (
            <span style={{ display: 'inline-flex', marginLeft: '4px', color: '#34b7f1' }}>
                <CheckCheck size={14} />
            </span>
        )
    }
    // Sent but not read
    return (
        <span style={{ display: 'inline-flex', marginLeft: '4px', opacity: 0.7 }}>
            <CheckCheck size={14} />
        </span>
    )
}

// ── Presence dot ──
function PresenceDot({ online, size = 12, style }: { online: boolean; size?: number; style?: React.CSSProperties }) {
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            backgroundColor: online ? '#22c55e' : '#9ca3af',
            border: '2px solid var(--color-bg-card)',
            ...style,
        }} />
    )
}

function MessagesContent() {
    const { user } = useAuth()
    const searchParams = useSearchParams()
    const supabase = createClient()
    const [activeConvo, setActiveConvo] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [isOtherTyping, setIsOtherTyping] = useState(false)
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
    const activeConvoRef = useRef<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const initialConvoHandled = useRef(false)
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
    const channelReadyRef = useRef(false)
    const lastTypingApi = useRef(0)
    const lastTypingBroadcast = useRef(0)
    const remoteTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => { activeConvoRef.current = activeConvo }, [activeConvo])

    const scrollToBottom = useCallback((instant = false) => {
        if (instant) {
            requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior }))
        } else {
            requestAnimationFrame(() => {
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
            })
        }
    }, [])

    // ── Fetch inbox data ──
    const fetchConversationsData = useCallback(async (): Promise<Conversation[] | null> => {
        if (!user) return null

        const convoParam = searchParams.get('convo')

        const response = await fetch('/api/dm/inbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetConvoId: convoParam })
        }).then(r => r.json())

        if (response.error) {
            console.error('Failed to fetch inbox:', response.error)
            return null
        }

        const { convos, participants, unreadMsgs } = response

        const enriched = convos.map((c: any) => {
            const convoParticipants = participants.filter((p: any) => p.conversation_id === c.id)
            const other = convoParticipants.find((p: any) => p.user_id !== user.id) || convoParticipants[0]
            const profile = Array.isArray(other?.profiles) ? other?.profiles[0] : other?.profiles
            const unreadCount = unreadMsgs.filter((m: any) => m.conversation_id === c.id).length
            return { ...c, participant: profile as Profile, unread_count: unreadCount }
        })

        enriched.sort((a: any, b: any) =>
            new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
        )

        return enriched
    }, [user, searchParams])

    const { data: conversations, setData: setConversations, isLoading: loading, refresh: refreshConversations } = useCachedQuery(
        'dm-conversations',
        fetchConversationsData,
        [] as Conversation[],
        { enabled: !!user }
    )

    // ── Heartbeat: update last_seen_at every 15s ──
    useEffect(() => {
        if (!user) return
        const sendHeartbeat = () => {
            fetch('/api/dm/presence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'heartbeat' })
            }).catch(() => {})
        }
        sendHeartbeat()
        const interval = setInterval(sendHeartbeat, 30000)
        return () => clearInterval(interval)
    }, [user])

    // ── Poll online status for conversation participants ──
    useEffect(() => {
        if (!user || conversations.length === 0) return
        const checkOnline = async () => {
            const userIds = conversations
                .map(c => c.participant?.id)
                .filter(Boolean) as string[]
            if (userIds.length === 0) return
            const res = await fetch('/api/dm/presence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check-online', userIds })
            }).then(r => r.json()).catch(() => ({ onlineIds: [] }))
            if (res.onlineIds) {
                setOnlineUsers(new Set<string>(res.onlineIds))
            }
        }
        checkOnline()
        const interval = setInterval(checkOnline, 30000)
        return () => clearInterval(interval)
    }, [user, conversations.length])

    // ── Fetch messages via API ──
    const fetchMessages = useCallback(async (convoId: string) => {
        setActiveConvo(convoId)
        setIsOtherTyping(false)
        const res = await fetch('/api/dm/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'fetch', conversationId: convoId })
        }).then(r => r.json())

        if (res.messages) setMessages(res.messages)

        // Mark as read
        fetch('/api/dm/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'read', conversationId: convoId })
        })

        setConversations(prev => prev.map(c =>
            c.id === convoId ? { ...c, unread_count: 0 } : c
        ))
        scrollToBottom(true)
    }, [scrollToBottom])

    // Handle URL ?convo= parameter when conversations first load
    useEffect(() => {
        if (!initialConvoHandled.current && conversations.length > 0) {
            initialConvoHandled.current = true
            const convoParam = searchParams.get('convo')
            if (convoParam && conversations.some((c: Conversation) => c.id === convoParam)) {
                fetchMessages(convoParam)
            }
        }
    }, [conversations, searchParams, fetchMessages])

    // Poll inbox every 30s
    useEffect(() => {
        if (!user) return
        const interval = setInterval(() => refreshConversations(true), 30000)
        return () => clearInterval(interval)
    }, [user, refreshConversations])

    // ── Realtime: Broadcast channel per active conversation ──
    useEffect(() => {
        if (!activeConvo || !user) {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
                channelRef.current = null
                channelReadyRef.current = false
            }
            return
        }

        if (channelRef.current) {
            supabase.removeChannel(channelRef.current)
            channelRef.current = null
            channelReadyRef.current = false
        }

        const convoId = activeConvo // capture for closure stability

        const channel = supabase.channel(`dm:convo:${convoId}`, {
            config: { broadcast: { self: false } }
        })
            .on('broadcast', { event: 'new-message' }, ({ payload }) => {
                const msg = payload as Message
                if (!msg || msg.sender_id === user.id) return

                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev
                    return [...prev, msg]
                })
                setIsOtherTyping(false)
                scrollToBottom()

                // Mark as read in DB
                fetch('/api/dm/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'read', conversationId: convoId })
                })
                // Broadcast seen back to sender
                setTimeout(() => {
                    channel.send({ type: 'broadcast', event: 'seen', payload: { userId: user.id, convoId } })
                }, 100)

                setConversations(prev => prev.map(c =>
                    c.id === convoId
                        ? { ...c, last_message: msg.content, last_message_at: msg.created_at, unread_count: 0 }
                        : c
                ).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()))
            })
            .on('broadcast', { event: 'typing' }, ({ payload }) => {
                if (payload?.userId !== user.id) {
                    setIsOtherTyping(true)
                    if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current)
                    remoteTypingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 3000)
                }
            })
            .on('broadcast', { event: 'seen' }, ({ payload }) => {
                if (payload?.userId !== user.id) {
                    setMessages(prev => prev.map(m =>
                        m.sender_id === user.id ? { ...m, is_read: true } : m
                    ))
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    channelReadyRef.current = true
                    // Mark messages as read in DB and notify the other user immediately
                    fetch('/api/dm/messages', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'read', conversationId: convoId })
                    })
                    channel.send({ type: 'broadcast', event: 'seen', payload: { userId: user.id, convoId } })
                }
            })

        channelRef.current = channel

        return () => {
            channelReadyRef.current = false
            supabase.removeChannel(channel)
            channelRef.current = null
        }
    }, [activeConvo, user, supabase, scrollToBottom])

    // ── Poll active conversation every 5s as fallback ──
    useEffect(() => {
        if (!activeConvo || !user) return
        const convoId = activeConvo
        const interval = setInterval(async () => {
            if (activeConvoRef.current !== convoId) return
            const res = await fetch('/api/dm/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'fetch', conversationId: convoId })
            }).then(r => r.json())

            if (activeConvoRef.current !== convoId) return

            // Update typing status from poll response
            if (typeof res.isOtherTyping === 'boolean') {
                setIsOtherTyping(res.isOtherTyping)
            }

            if (res.messages) {
                setMessages(prev => {
                    const tempMsgs = prev.filter(m => m.id.startsWith('temp-'))
                    const realPrev = prev.filter(m => !m.id.startsWith('temp-'))
                    const newMsgs = res.messages as Message[]

                    // Build a signature of current state to detect ANY change
                    const prevSig = realPrev.map(m => m.id + ':' + (m.is_read ? '1' : '0')).join(',')
                    const newSig = newMsgs.map(m => m.id + ':' + (m.is_read ? '1' : '0')).join(',')

                    if (prevSig !== newSig) {
                        const hadNewMessages = newMsgs.length > realPrev.length
                        // Check if there are new messages from the OTHER user
                        const realPrevIds = new Set(realPrev.map(m => m.id))
                        const hasNewFromOther = newMsgs.some(m =>
                            m.sender_id !== user.id && !realPrevIds.has(m.id)
                        )
                        if (hadNewMessages) {
                            setTimeout(() => scrollToBottom(), 100)
                        }
                        // If other user sent new messages, mark as read + broadcast seen
                        if (hasNewFromOther) {
                            fetch('/api/dm/messages', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'read', conversationId: convoId })
                            })
                            if (channelRef.current && channelReadyRef.current) {
                                channelRef.current.send({
                                    type: 'broadcast', event: 'seen',
                                    payload: { userId: user.id, convoId }
                                })
                            }
                            setConversations(prev => prev.map(c =>
                                c.id === convoId ? { ...c, unread_count: 0 } : c
                            ))
                        }
                        return [...newMsgs, ...tempMsgs]
                    }
                    return prev
                })
            }
        }, 5000)
        return () => clearInterval(interval)
    }, [activeConvo, user, scrollToBottom])

    // ── Typing: API (reliable) + Realtime broadcast (bonus) ──
    const broadcastTyping = useCallback(() => {
        if (!user || !activeConvoRef.current) return
        const now = Date.now()
        if (now - lastTypingBroadcast.current < 1500) return
        lastTypingBroadcast.current = now
        // Realtime broadcast (best-effort)
        if (channelRef.current && channelReadyRef.current) {
            channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId: user.id } })
        }
        // API call (reliable, throttled to every 2s)
        if (now - lastTypingApi.current < 2000) return
        lastTypingApi.current = now
        fetch('/api/dm/presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'typing', conversationId: activeConvoRef.current })
        }).catch(() => {})
    }, [user])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value)
        broadcastTyping()
    }

    // ── Send message ──
    const handleSend = async () => {
        if (!newMessage.trim() || !activeConvo || !user) return
        const content = newMessage.trim()
        setNewMessage('')

        // Optimistic UI
        const tempId = `temp-${Date.now()}`
        const tempMsg: Message = {
            id: tempId,
            conversation_id: activeConvo,
            sender_id: user.id,
            content,
            created_at: new Date().toISOString(),
            is_read: false,
            sender: { id: user.id } as Profile
        }
        setMessages(prev => [...prev, tempMsg])
        scrollToBottom()

        setConversations(prev => prev.map(c =>
            c.id === activeConvo ? { ...c, last_message: content, last_message_at: new Date().toISOString() } : c
        ).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()))

        setSending(true)
        const res = await fetch('/api/dm/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'send', conversationId: activeConvo, content })
        }).then(r => r.json())

        if (res.error) {
            setMessages(prev => prev.filter(m => m.id !== tempId))
        } else if (res.message) {
            setMessages(prev => prev.map(m => m.id === tempId ? res.message : m))
            // Broadcast to the other user
            if (channelRef.current && channelReadyRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'new-message',
                    payload: res.message
                })
            }
        }
        setSending(false)
    }

    const activeParticipant = conversations.find(c => c.id === activeConvo)?.participant
    const isParticipantOnline = activeParticipant ? onlineUsers.has(activeParticipant.id) : false

    const filteredConversations = searchQuery.trim()
        ? conversations.filter(c => {
            const name = (c.participant?.full_name || c.participant?.username || '').toLowerCase()
            return name.includes(searchQuery.toLowerCase())
        })
        : conversations

    // Find last message sent by me (for seen status display)
    const lastMsgByMe = [...messages].reverse().find(m => m.sender_id === user?.id)

    return (
        <div style={{ maxWidth: '1024px', margin: '0 auto', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, margin: '0 0 20px 0' }}>
                Messages
            </h1>

            <div className="msg-container" style={{
                display: 'flex', flex: 1, borderRadius: '20px', overflow: 'hidden', minHeight: 0,
                backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
            }}>
                {/* ════ Conversation List ════ */}
                <div className={`msg-sidebar ${activeConvo ? 'hidden-on-mobile' : ''}`} style={{
                    display: 'flex', flexDirection: 'column', flexShrink: 0,
                    borderRight: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)'
                }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px',
                            backgroundColor: 'var(--color-bg-elevated)'
                        }}>
                            <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
                            <input
                                type="text" placeholder="Search messages..."
                                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: '14px', color: 'var(--color-text-primary)' }}
                            />
                        </div>
                    </div>

                    <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
                        {!loading && filteredConversations.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <MessageCircle size={32} style={{ margin: '0 auto 12px', color: 'var(--color-text-muted)' }} />
                                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                                    {searchQuery ? 'No matches found' : 'No conversations yet'}
                                </p>
                            </div>
                        ) : (
                            filteredConversations.map(convo => {
                                const participantOnline = convo.participant ? onlineUsers.has(convo.participant.id) : false
                                return (
                                    <button
                                        key={convo.id}
                                        onClick={() => fetchMessages(convo.id)}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                                            textAlign: 'left', border: 'none', borderBottom: '1px solid var(--color-border)',
                                            cursor: 'pointer', transition: 'background-color 0.2s',
                                            backgroundColor: activeConvo === convo.id ? 'var(--color-bg-elevated)' : 'transparent',
                                        }}
                                        onMouseEnter={(e) => { if (activeConvo !== convo.id) e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)'; }}
                                        onMouseLeave={(e) => { if (activeConvo !== convo.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        {/* Avatar with presence dot */}
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <div style={{
                                                width: '48px', height: '48px', borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: convo.participant?.avatar_url
                                                    ? `url(${convo.participant.avatar_url}) center/cover`
                                                    : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                                color: 'white', fontSize: '16px', fontWeight: 600,
                                            }}>
                                                {!convo.participant?.avatar_url && (convo.participant?.full_name?.[0] || convo.participant?.username?.[0] || '?')}
                                            </div>
                                            <PresenceDot online={participantOnline} size={14}
                                                style={{ position: 'absolute', bottom: '-1px', right: '-1px' }} />
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                <p style={{
                                                    fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0
                                                }}>
                                                    {convo.participant?.full_name || convo.participant?.username || 'User'}
                                                </p>
                                                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                    {formatSidebarTime(convo.last_message_at)}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '3px' }}>
                                                <p style={{
                                                    fontSize: '13px', color: (convo.unread_count ?? 0) > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                                                    fontWeight: (convo.unread_count ?? 0) > 0 ? 600 : 400,
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0
                                                }}>
                                                    {convo.last_message || 'No messages yet'}
                                                </p>
                                                {(convo.unread_count ?? 0) > 0 && (
                                                    <div style={{
                                                        minWidth: '20px', height: '20px', borderRadius: '10px', padding: '0 6px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        backgroundColor: 'var(--color-primary)', color: 'white',
                                                        fontSize: '11px', fontWeight: 700, flexShrink: 0, lineHeight: 1
                                                    }}>
                                                        {convo.unread_count}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* ════ Chat Area ════ */}
                <div className={`msg-chat ${!activeConvo ? 'hidden-on-mobile' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg-card)' }}>
                    {!activeConvo ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '24px', marginBottom: '20px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: 'var(--color-bg-elevated)'
                            }}>
                                <MessageCircle size={36} style={{ color: 'var(--color-primary)' }} />
                            </div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, margin: '0 0 8px 0' }}>
                                Your Messages
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
                                Select a conversation to start chatting
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* ── Chat Header ── */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px',
                                borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)'
                            }}>
                                <button
                                    className="mobile-back-btn"
                                    onClick={() => setActiveConvo(null)}
                                    style={{
                                        padding: '6px', border: 'none', background: 'none', cursor: 'pointer',
                                        color: 'var(--color-text-muted)', display: 'none', marginRight: '2px',
                                        borderRadius: '8px',
                                    }}
                                >
                                    <ChevronLeft size={22} />
                                </button>
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: activeParticipant?.avatar_url
                                            ? `url(${activeParticipant.avatar_url}) center/cover`
                                            : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                        color: 'white', fontSize: '15px', fontWeight: 600,
                                    }}>
                                        {!activeParticipant?.avatar_url && (activeParticipant?.full_name?.[0] || activeParticipant?.username?.[0] || '?')}
                                    </div>
                                    <PresenceDot online={isParticipantOnline} size={12}
                                        style={{ position: 'absolute', bottom: '-1px', right: '-1px' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 1px 0' }}>
                                        {activeParticipant?.full_name || activeParticipant?.username || 'User'}
                                    </p>
                                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {isOtherTyping ? (
                                            <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>typing...</span>
                                        ) : isParticipantOnline ? (
                                            <span style={{ color: '#22c55e' }}>Online</span>
                                        ) : (
                                            activeParticipant?.username ? `@${activeParticipant.username}` : 'Offline'
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* ── Messages Area ── */}
                            <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {messages.map((msg, idx) => {
                                    const isMe = msg.sender_id === user?.id
                                    const showDate = shouldShowDateSeparator(messages, idx)
                                    const isLastByMe = msg.id === lastMsgByMe?.id

                                    // Group: show tail on last consecutive message by same sender
                                    const nextMsg = messages[idx + 1]
                                    const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id ||
                                        shouldShowDateSeparator(messages, idx + 1)

                                    return (
                                        <div key={msg.id}>
                                            {/* Date separator */}
                                            {showDate && (
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    padding: idx === 0 ? '4px 0 12px' : '16px 0 12px',
                                                }}>
                                                    <span style={{
                                                        fontSize: '11px', color: 'var(--color-text-muted)',
                                                        backgroundColor: 'var(--color-bg-elevated)',
                                                        padding: '4px 12px', borderRadius: '10px', fontWeight: 500,
                                                    }}>
                                                        {formatDateLabel(msg.created_at)}
                                                    </span>
                                                </div>
                                            )}
                                            {/* Message bubble */}
                                            <div style={{
                                                display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start',
                                                marginBottom: isLastInGroup ? '8px' : '2px',
                                            }}>
                                                <div style={{ maxWidth: '75%' }}>
                                                    <div style={{
                                                        padding: '10px 14px', fontSize: '14px', lineHeight: 1.5,
                                                        backgroundColor: isMe ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                                                        color: isMe ? 'white' : 'var(--color-text-primary)',
                                                        borderRadius: '18px',
                                                        borderBottomRightRadius: isMe && isLastInGroup ? '4px' : '18px',
                                                        borderBottomLeftRadius: !isMe && isLastInGroup ? '4px' : '18px',
                                                        wordBreak: 'break-word', overflowWrap: 'break-word',
                                                    }}>
                                                        <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                                                    </div>
                                                    {/* Time + status row */}
                                                    {isLastInGroup && (
                                                        <div style={{
                                                            display: 'flex', alignItems: 'center',
                                                            justifyContent: isMe ? 'flex-end' : 'flex-start',
                                                            gap: '2px', marginTop: '3px', padding: isMe ? '0 4px 0 0' : '0 0 0 4px',
                                                        }}>
                                                            <span style={{ fontSize: '11px', color: isMe ? 'var(--color-text-muted)' : 'var(--color-text-muted)', opacity: 0.8 }}>
                                                                {formatTime(msg.created_at)}
                                                            </span>
                                                            {isMe && (
                                                                <MessageStatus msg={msg} isLastByMe={isLastByMe} allRead={msg.is_read} />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {isOtherTyping && <TypingIndicator />}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* ── Chat Input ── */}
                            <div style={{
                                padding: '12px 20px', borderTop: '1px solid var(--color-border)',
                                display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'var(--color-bg-card)'
                            }}>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={handleInputChange}
                                    placeholder="Type a message..."
                                    style={{
                                        flex: 1, padding: '12px 16px', borderRadius: '24px', fontSize: '14px', outline: 'none',
                                        backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                                        color: 'var(--color-text-primary)'
                                    }}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                                    disabled={sending}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!newMessage.trim() || sending}
                                    className="hover-lift"
                                    style={{
                                        padding: '12px', borderRadius: '50%', border: 'none',
                                        cursor: (!newMessage.trim() || sending) ? 'not-allowed' : 'pointer',
                                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                        color: 'white', opacity: (!newMessage.trim() || sending) ? 0.5 : 1, transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: '44px', height: '44px', flexShrink: 0,
                                    }}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style>{`
                .msg-sidebar { width: 340px; }
                @media (max-width: 768px) {
                    .msg-sidebar { width: 100%; }
                    .hidden-on-mobile { display: none !important; }
                    .mobile-back-btn { display: flex !important; }
                }
                @keyframes typingBounce {
                    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                    30% { transform: translateY(-4px); opacity: 1; }
                }
                .typing-dot {
                    width: 7px; height: 7px; border-radius: 50%;
                    background-color: var(--color-text-muted);
                    display: inline-block;
                    animation: typingBounce 1.2s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}

export default function MessagesPage() {
    return (
        <Suspense fallback={
            <div style={{ maxWidth: '1024px', margin: '0 auto', height: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
            </div>
        }>
            <MessagesContent />
        </Suspense>
    )
}
