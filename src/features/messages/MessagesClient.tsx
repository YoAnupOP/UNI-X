'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CheckCheck, ChevronLeft, Loader2, MessageCircle, Search, Send } from 'lucide-react'
import { Conversation, Message } from '@/lib/types'
import { useAuth } from '@/components/providers/AuthProvider'
import { fetchJson } from '@/lib/query/fetch-json'

interface MessageThreadResponse {
    messages: Message[]
    isOtherTyping: boolean
}

const conversationsKey = ['dm-conversations'] as const
const messagesKey = (conversationId: string | null) => ['dm-messages', conversationId] as const

function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const diff = today.getTime() - messageDate.getTime()
    const dayMs = 86_400_000

    if (diff === 0) return 'Today'
    if (diff === dayMs) return 'Yesterday'
    if (diff < 7 * dayMs) return date.toLocaleDateString([], { weekday: 'long' })

    return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
}

function formatSidebarTime(dateStr: string | null) {
    if (!dateStr) return ''

    const date = new Date(dateStr)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const diff = today.getTime() - messageDate.getTime()

    if (diff === 0) return formatTime(dateStr)
    if (diff === 86_400_000) return 'Yesterday'
    if (diff < 7 * 86_400_000) return date.toLocaleDateString([], { weekday: 'short' })

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function shouldShowDateSeparator(messages: Message[], index: number) {
    if (index === 0) return true

    const previous = new Date(messages[index - 1].created_at)
    const current = new Date(messages[index].created_at)
    return previous.toDateString() !== current.toDateString()
}

function PresenceDot({ online, size = 12, style }: { online: boolean; size?: number; style?: React.CSSProperties }) {
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                backgroundColor: online ? '#22c55e' : '#9ca3af',
                border: '2px solid var(--color-bg-card)',
                ...style,
            }}
        />
    )
}

function TypingIndicator() {
    return (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '4px' }}>
            <div style={{
                padding: '12px 18px',
                borderRadius: '20px',
                borderBottomLeftRadius: '4px',
                backgroundColor: 'var(--color-bg-elevated)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
            }}>
                <span className="typing-dot" style={{ animationDelay: '0s' }} />
                <span className="typing-dot" style={{ animationDelay: '0.15s' }} />
                <span className="typing-dot" style={{ animationDelay: '0.3s' }} />
            </div>
        </div>
    )
}

function MessageStatus({ message }: { message: Message }) {
    if (message.id.startsWith('temp-')) {
        return (
            <span style={{ display: 'inline-flex', marginLeft: '4px', opacity: 0.6 }}>
                <Check size={14} />
            </span>
        )
    }

    if (message.is_read) {
        return (
            <span style={{ display: 'inline-flex', marginLeft: '4px', color: '#34b7f1' }}>
                <CheckCheck size={14} />
            </span>
        )
    }

    return (
        <span style={{ display: 'inline-flex', marginLeft: '4px', opacity: 0.7 }}>
            <CheckCheck size={14} />
        </span>
    )
}

export default function MessagesClient({
    initialConversations,
    initialConversationId,
    initialMessages,
    initialIsOtherTyping,
}: {
    initialConversations: Conversation[]
    initialConversationId: string | null
    initialMessages: Message[]
    initialIsOtherTyping: boolean
}) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { user } = useAuth()
    const [manualSelection, setManualSelection] = useState<string | null | undefined>(undefined)
    const [draft, setDraft] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const typingAtRef = useRef(0)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const conversationsQuery = useQuery({
        queryKey: conversationsKey,
        queryFn: () => fetchJson<Conversation[]>('/api/dm/inbox', {
            method: 'POST',
            body: JSON.stringify({}),
        }),
        initialData: initialConversations,
        staleTime: 30_000,
        refetchInterval: user ? 30_000 : false,
        enabled: Boolean(user),
    })

    const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data])

    const activeConvo = useMemo(() => {
        if (manualSelection !== undefined) {
            if (manualSelection === null) return null
            return conversations.some((conversation) => conversation.id === manualSelection)
                ? manualSelection
                : null
        }

        if (initialConversationId && conversations.some((conversation) => conversation.id === initialConversationId)) {
            return initialConversationId
        }

        return conversations[0]?.id ?? null
    }, [conversations, initialConversationId, manualSelection])

    const filteredConversations = useMemo(() => {
        const needle = searchQuery.trim().toLowerCase()
        if (!needle) return conversations

        return conversations.filter((conversation) => {
            const name = conversation.participant?.full_name || conversation.participant?.username || ''
            return name.toLowerCase().includes(needle) || (conversation.last_message || '').toLowerCase().includes(needle)
        })
    }, [conversations, searchQuery])

    const onlineUserIds = useMemo(
        () => conversations.map((conversation) => conversation.participant?.id).filter(Boolean) as string[],
        [conversations]
    )

    const onlinePresenceQuery = useQuery({
        queryKey: ['dm-online', onlineUserIds.join('|')],
        queryFn: () => fetchJson<{ onlineIds: string[] }>('/api/dm/presence', {
            method: 'POST',
            body: JSON.stringify({ action: 'check-online', userIds: onlineUserIds }),
        }),
        enabled: Boolean(user && onlineUserIds.length),
        staleTime: 30_000,
        refetchInterval: onlineUserIds.length ? 30_000 : false,
    })

    const onlineUsers = useMemo(() => new Set(onlinePresenceQuery.data?.onlineIds ?? []), [onlinePresenceQuery.data])

    const messagesQuery = useQuery({
        queryKey: messagesKey(activeConvo),
        queryFn: () => fetchJson<MessageThreadResponse>('/api/dm/messages', {
            method: 'POST',
            body: JSON.stringify({ action: 'fetch', conversationId: activeConvo }),
        }),
        initialData: activeConvo && activeConvo === initialConversationId
            ? { messages: initialMessages, isOtherTyping: initialIsOtherTyping }
            : undefined,
        staleTime: 5_000,
        refetchInterval: activeConvo ? 5_000 : false,
        enabled: Boolean(activeConvo && user),
    })

    const prefetchConversation = (conversationId: string) => {
        void queryClient.prefetchQuery({
            queryKey: messagesKey(conversationId),
            queryFn: () => fetchJson<MessageThreadResponse>('/api/dm/messages', {
                method: 'POST',
                body: JSON.stringify({ action: 'fetch', conversationId }),
            }),
            staleTime: 5_000,
        })
    }

    const markReadMutation = useMutation({
        mutationFn: (conversationId: string) => fetchJson<{ success: boolean }>('/api/dm/messages', {
            method: 'POST',
            body: JSON.stringify({ action: 'read', conversationId }),
        }),
        onSuccess: (_result, conversationId) => {
            queryClient.setQueryData(conversationsKey, (current: Conversation[] | undefined) =>
                (current ?? []).map((conversation) =>
                    conversation.id === conversationId
                        ? { ...conversation, unread_count: 0 }
                        : conversation
                )
            )
        },
    })

    useEffect(() => {
        if (activeConvo) {
            markReadMutation.mutate(activeConvo)
        }
    }, [activeConvo, markReadMutation])

    useEffect(() => {
        if (!user) return

        const sendHeartbeat = () => {
            void fetchJson<{ ok: boolean }>('/api/dm/presence', {
                method: 'POST',
                body: JSON.stringify({ action: 'heartbeat' }),
            }).catch(() => ({ ok: false }))
        }

        sendHeartbeat()
        const interval = window.setInterval(sendHeartbeat, 30_000)
        return () => window.clearInterval(interval)
    }, [user])

    const sendTypingHeartbeat = () => {
        if (!activeConvo) return

        const now = Date.now()
        if (now - typingAtRef.current < 2_000) return

        typingAtRef.current = now
        void fetchJson<{ ok: boolean }>('/api/dm/presence', {
            method: 'POST',
            body: JSON.stringify({ action: 'typing', conversationId: activeConvo }),
        }).catch(() => ({ ok: false }))
    }

    const sendMutation = useMutation({
        mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) => fetchJson<{ message: Message }>('/api/dm/messages', {
            method: 'POST',
            body: JSON.stringify({ action: 'send', conversationId, content }),
        }),
        onMutate: async (payload) => {
            const tempId = `temp-${Date.now()}`
            const previousThread = queryClient.getQueryData<MessageThreadResponse>(messagesKey(payload.conversationId))
            const previousConversations = queryClient.getQueryData<Conversation[]>(conversationsKey)
            const tempMessage: Message = {
                id: tempId,
                conversation_id: payload.conversationId,
                sender_id: user?.id || '',
                content: payload.content,
                is_read: false,
                created_at: new Date().toISOString(),
            }

            queryClient.setQueryData(messagesKey(payload.conversationId), {
                messages: [...(previousThread?.messages ?? []), tempMessage],
                isOtherTyping: false,
            })

            queryClient.setQueryData(conversationsKey, (current: Conversation[] | undefined) => {
                const next = (current ?? []).map((conversation) =>
                    conversation.id === payload.conversationId
                        ? {
                            ...conversation,
                            last_message: payload.content,
                            last_message_at: tempMessage.created_at,
                        }
                        : conversation
                )

                next.sort((left, right) => new Date(right.last_message_at || 0).getTime() - new Date(left.last_message_at || 0).getTime())
                return next
            })

            return { previousThread, previousConversations, tempId }
        },
        onError: (_error, payload, context) => {
            if (context?.previousThread) {
                queryClient.setQueryData(messagesKey(payload.conversationId), context.previousThread)
            }

            if (context?.previousConversations) {
                queryClient.setQueryData(conversationsKey, context.previousConversations)
            }
        },
        onSuccess: (result, payload, context) => {
            queryClient.setQueryData(messagesKey(payload.conversationId), (current: MessageThreadResponse | undefined) => ({
                messages: (current?.messages ?? []).map((message) =>
                    message.id === context?.tempId ? result.message : message
                ),
                isOtherTyping: current?.isOtherTyping ?? false,
            }))
        },
        onSettled: (_result, _error, payload) => {
            void queryClient.invalidateQueries({ queryKey: messagesKey(payload.conversationId) })
            void queryClient.invalidateQueries({ queryKey: conversationsKey })
        },
    })

    const thread = messagesQuery.data ?? { messages: [], isOtherTyping: false }
    const messages = thread.messages
    const activeConversation = conversations.find((conversation) => conversation.id === activeConvo) ?? null
    const activeParticipant = activeConversation?.participant ?? null
    const isParticipantOnline = activeParticipant ? onlineUsers.has(activeParticipant.id) : false
    const lastMessageByMe = [...messages].reverse().find((message) => message.sender_id === user?.id) ?? null

    useEffect(() => {
        if (!messages.length) return

        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        })
    }, [messages.length, activeConvo, thread.isOtherTyping])

    const handleSelectConversation = (conversationId: string) => {
        setManualSelection(conversationId)
        router.replace(`/messages?convo=${conversationId}`, { scroll: false })
    }

    const handleBack = () => {
        setManualSelection(null)
        router.replace('/messages', { scroll: false })
    }

    const handleSend = () => {
        if (!activeConvo || !draft.trim() || sendMutation.isPending) return

        const content = draft.trim()
        setDraft('')
        sendMutation.mutate({ conversationId: activeConvo, content })
    }

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '18px',
                flexWrap: 'wrap',
            }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: 0 }}>Messages</h1>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '6px 0 0 0' }}>
                        Inbox loads on the server. Threads stay warm in cache while you move around the app.
                    </p>
                </div>
                {activeParticipant && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        borderRadius: '999px',
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                        fontSize: '13px',
                    }}>
                        <PresenceDot online={isParticipantOnline} size={10} />
                        {isParticipantOnline ? 'Active now' : 'Recent conversation'}
                    </div>
                )}
            </div>

            <div className="messages-shell" style={{ flex: 1, minHeight: 0, display: 'grid', gap: '20px' }}>
                <aside className={activeConvo ? 'hide-on-mobile' : ''} style={{
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <div style={{ padding: '18px', borderBottom: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg-elevated)', borderRadius: '14px', padding: '10px 12px' }}>
                            <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
                            <input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search conversations"
                                style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text-primary)' }}
                            />
                        </div>
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {filteredConversations.length === 0 ? (
                            <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                <MessageCircle size={26} style={{ marginBottom: '10px' }} />
                                No conversations yet.
                            </div>
                        ) : (
                            filteredConversations.map((conversation) => {
                                const participant = conversation.participant
                                const participantOnline = participant ? onlineUsers.has(participant.id) : false
                                const active = conversation.id === activeConvo

                                return (
                                    <button
                                        key={conversation.id}
                                        onClick={() => handleSelectConversation(conversation.id)}
                                        onMouseEnter={() => prefetchConversation(conversation.id)}
                                        onFocus={() => prefetchConversation(conversation.id)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '14px 16px',
                                            textAlign: 'left',
                                            border: 'none',
                                            borderBottom: '1px solid var(--color-border)',
                                            cursor: 'pointer',
                                            backgroundColor: active ? 'var(--color-bg-elevated)' : 'transparent',
                                        }}
                                    >
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <div style={{
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: participant?.avatar_url
                                                    ? `url(${participant.avatar_url}) center/cover`
                                                    : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                                color: 'white',
                                                fontSize: '16px',
                                                fontWeight: 600,
                                            }}>
                                                {!participant?.avatar_url && (participant?.full_name?.[0] || participant?.username?.[0] || '?')}
                                            </div>
                                            <PresenceDot online={participantOnline} size={14} style={{ position: 'absolute', bottom: '-1px', right: '-1px' }} />
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                <p style={{
                                                    fontSize: '15px',
                                                    fontWeight: 600,
                                                    color: 'var(--color-text-primary)',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    margin: 0,
                                                }}>
                                                    {participant?.full_name || participant?.username || 'User'}
                                                </p>
                                                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                    {formatSidebarTime(conversation.last_message_at || null)}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '3px' }}>
                                                <p style={{
                                                    fontSize: '13px',
                                                    color: (conversation.unread_count ?? 0) > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                                                    fontWeight: (conversation.unread_count ?? 0) > 0 ? 600 : 400,
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    margin: 0,
                                                }}>
                                                    {conversation.last_message || 'No messages yet'}
                                                </p>
                                                {(conversation.unread_count ?? 0) > 0 && (
                                                    <div style={{
                                                        minWidth: '20px',
                                                        height: '20px',
                                                        borderRadius: '10px',
                                                        padding: '0 6px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        backgroundColor: 'var(--color-primary)',
                                                        color: 'white',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        flexShrink: 0,
                                                        lineHeight: 1,
                                                    }}>
                                                        {conversation.unread_count}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })
                        )}
                    </div>
                </aside>

                <section className={!activeConvo ? 'hide-on-mobile' : ''} style={{
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '24px',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}>
                    {!activeConversation ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                            <div style={{ textAlign: 'center' }}>
                                <MessageCircle size={34} style={{ marginBottom: '12px' }} />
                                Select a conversation
                            </div>
                        </div>
                    ) : (
                        <>
                            <header style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '14px 20px',
                                borderBottom: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-bg-card)',
                            }}>
                                <button
                                    className="mobile-back-btn"
                                    onClick={handleBack}
                                    style={{
                                        padding: '6px',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--color-text-muted)',
                                        display: 'none',
                                        borderRadius: '8px',
                                    }}
                                >
                                    <ChevronLeft size={22} />
                                </button>
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: activeParticipant?.avatar_url
                                            ? `url(${activeParticipant.avatar_url}) center/cover`
                                            : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                        color: 'white',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                    }}>
                                        {!activeParticipant?.avatar_url && (activeParticipant?.full_name?.[0] || activeParticipant?.username?.[0] || '?')}
                                    </div>
                                    <PresenceDot online={isParticipantOnline} size={12} style={{ position: 'absolute', bottom: '-1px', right: '-1px' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 1px 0' }}>
                                        {activeParticipant?.full_name || activeParticipant?.username || 'User'}
                                    </p>
                                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                                        {thread.isOtherTyping
                                            ? 'typing...'
                                            : isParticipantOnline
                                                ? 'Online'
                                                : activeParticipant?.username
                                                    ? `@${activeParticipant.username}`
                                                    : 'Offline'}
                                    </p>
                                </div>
                            </header>

                            <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {messages.length === 0 && messagesQuery.isFetching ? (
                                    <div style={{ display: 'grid', gap: '10px' }}>
                                        <div className="skeleton" style={{ width: '36%', height: '44px', borderRadius: '18px' }} />
                                        <div className="skeleton" style={{ width: '54%', height: '44px', borderRadius: '18px', justifySelf: 'end' }} />
                                        <div className="skeleton" style={{ width: '42%', height: '44px', borderRadius: '18px' }} />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        <MessageCircle size={26} style={{ marginBottom: '10px' }} />
                                        No messages yet.
                                    </div>
                                ) : (
                                    messages.map((message, index) => {
                                        const isMe = message.sender_id === user?.id
                                        const showDate = shouldShowDateSeparator(messages, index)
                                        const nextMessage = messages[index + 1]
                                        const isLastInGroup = !nextMessage || nextMessage.sender_id !== message.sender_id || shouldShowDateSeparator(messages, index + 1)
                                        const isLastByMe = message.id === lastMessageByMe?.id

                                        return (
                                            <div key={message.id}>
                                                {showDate && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: index === 0 ? '4px 0 12px' : '16px 0 12px',
                                                    }}>
                                                        <span style={{
                                                            fontSize: '11px',
                                                            color: 'var(--color-text-muted)',
                                                            backgroundColor: 'var(--color-bg-elevated)',
                                                            padding: '4px 12px',
                                                            borderRadius: '10px',
                                                            fontWeight: 500,
                                                        }}>
                                                            {formatDateLabel(message.created_at)}
                                                        </span>
                                                    </div>
                                                )}

                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                                                    marginBottom: isLastInGroup ? '8px' : '2px',
                                                }}>
                                                    <div style={{ maxWidth: '75%' }}>
                                                        <div style={{
                                                            padding: '10px 14px',
                                                            fontSize: '14px',
                                                            lineHeight: 1.5,
                                                            backgroundColor: isMe ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                                                            color: isMe ? 'white' : 'var(--color-text-primary)',
                                                            borderRadius: '18px',
                                                            borderBottomRightRadius: isMe && isLastInGroup ? '4px' : '18px',
                                                            borderBottomLeftRadius: !isMe && isLastInGroup ? '4px' : '18px',
                                                            wordBreak: 'break-word',
                                                            overflowWrap: 'break-word',
                                                        }}>
                                                            <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
                                                        </div>
                                                        {isLastInGroup && (
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: isMe ? 'flex-end' : 'flex-start',
                                                                gap: '2px',
                                                                marginTop: '3px',
                                                                padding: isMe ? '0 4px 0 0' : '0 0 0 4px',
                                                            }}>
                                                                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', opacity: 0.8 }}>
                                                                    {formatTime(message.created_at)}
                                                                </span>
                                                                {isMe && isLastByMe && <MessageStatus message={message} />}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                                {thread.isOtherTyping && <TypingIndicator />}
                                <div ref={messagesEndRef} />
                            </div>

                            <div style={{
                                padding: '12px 20px',
                                borderTop: '1px solid var(--color-border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                backgroundColor: 'var(--color-bg-card)',
                            }}>
                                <input
                                    type="text"
                                    value={draft}
                                    onChange={(event) => {
                                        setDraft(event.target.value)
                                        if (event.target.value.trim()) {
                                            sendTypingHeartbeat()
                                        }
                                    }}
                                    placeholder="Type a message..."
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        borderRadius: '24px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        backgroundColor: 'var(--color-bg-elevated)',
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-text-primary)',
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && !event.shiftKey) {
                                            event.preventDefault()
                                            handleSend()
                                        }
                                    }}
                                    disabled={sendMutation.isPending}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!draft.trim() || sendMutation.isPending}
                                    className="hover-lift"
                                    style={{
                                        padding: '12px',
                                        borderRadius: '50%',
                                        border: 'none',
                                        cursor: (!draft.trim() || sendMutation.isPending) ? 'not-allowed' : 'pointer',
                                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                        color: 'white',
                                        opacity: (!draft.trim() || sendMutation.isPending) ? 0.5 : 1,
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '44px',
                                        height: '44px',
                                        flexShrink: 0,
                                    }}
                                >
                                    {sendMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </div>
                        </>
                    )}
                </section>
            </div>

            <style>{`
                .messages-shell { grid-template-columns: 1fr; }
                @media (min-width: 960px) {
                    .messages-shell { grid-template-columns: 340px minmax(0, 1fr); }
                }
                @media (max-width: 959px) {
                    .hide-on-mobile { display: none !important; }
                    .mobile-back-btn { display: flex !important; }
                }
                @keyframes typingBounce {
                    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                    30% { transform: translateY(-4px); opacity: 1; }
                }
                .typing-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background-color: var(--color-text-muted);
                    display: inline-block;
                    animation: typingBounce 1.2s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}
