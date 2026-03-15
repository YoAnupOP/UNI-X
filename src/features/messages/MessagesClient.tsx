'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CheckCheck, ChevronLeft, MessageCircle, Search, Send } from 'lucide-react'
import { Conversation, Message } from '@/lib/types'
import { useAuth } from '@/components/providers/AuthProvider'
import { fetchJson } from '@/lib/query/fetch-json'
import { createClient } from '@/lib/supabase/client'

interface MessageThreadResponse {
    messages: Message[]
    isOtherTyping: boolean
}

const conversationsKey = ['dm-conversations'] as const
const messagesKey = (conversationId: string | null) => ['dm-messages', conversationId] as const
const ONLINE_CHANNEL = 'dm-online-global'
const FIXED_LOCALE = 'en-US'

type BrowserSupabaseClient = ReturnType<typeof createClient>
type BrowserRealtimeChannel = ReturnType<BrowserSupabaseClient['channel']>

const sortConversations = (items: Conversation[]) => [...items].sort(
    (left, right) => new Date(right.last_message_at || 0).getTime() - new Date(left.last_message_at || 0).getTime()
)

function formatTime(value: string) {
    return new Intl.DateTimeFormat(FIXED_LOCALE, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    }).format(new Date(value))
}

function formatSidebarTime(value: string | null) {
    if (!value) return ''
    const date = new Date(value)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const diff = today.getTime() - messageDate.getTime()
    if (diff === 0) return formatTime(value)
    if (diff === 86_400_000) return 'Yesterday'
    if (diff < 7 * 86_400_000) return date.toLocaleDateString(FIXED_LOCALE, { weekday: 'short' })
    return date.toLocaleDateString(FIXED_LOCALE, { month: 'short', day: 'numeric' })
}

function formatDateLabel(value: string) {
    const date = new Date(value)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const diff = today.getTime() - messageDate.getTime()
    if (diff === 0) return 'Today'
    if (diff === 86_400_000) return 'Yesterday'
    if (diff < 7 * 86_400_000) return date.toLocaleDateString(FIXED_LOCALE, { weekday: 'long' })
    return date.toLocaleDateString(FIXED_LOCALE, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
}

function shouldShowDateSeparator(messages: Message[], index: number) {
    if (index === 0) return true
    return new Date(messages[index - 1].created_at).toDateString() !== new Date(messages[index].created_at).toDateString()
}

function markIncomingRead(messages: Message[], viewerId: string | null) {
    if (!viewerId) return messages
    return messages.map((message) => (
        message.sender_id !== viewerId && !message.is_read ? { ...message, is_read: true } : message
    ))
}

function mergeMessage(messages: Message[], incoming: Message) {
    const byId = messages.findIndex((message) => message.id === incoming.id)
    if (byId >= 0) {
        return messages.map((message, index) => (index === byId ? { ...message, ...incoming } : message))
    }

    const optimistic = messages.findIndex((message) =>
        message.id.startsWith('temp-') &&
        message.sender_id === incoming.sender_id &&
        message.content === incoming.content &&
        Math.abs(new Date(message.created_at).getTime() - new Date(incoming.created_at).getTime()) < 30_000
    )

    if (optimistic >= 0) {
        return messages.map((message, index) => (index === optimistic ? incoming : message))
    }

    return [...messages, incoming].sort(
        (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    )
}

function updatePreview(
    conversations: Conversation[],
    message: Pick<Message, 'conversation_id' | 'sender_id' | 'content' | 'created_at'>,
    viewerId: string | null,
    activeConvo: string | null
) {
    if (!conversations.some((conversation) => conversation.id === message.conversation_id)) return conversations

    return sortConversations(conversations.map((conversation) => {
        if (conversation.id !== message.conversation_id) return conversation
        const unread = viewerId && message.sender_id !== viewerId && activeConvo !== message.conversation_id
        return {
            ...conversation,
            last_message: message.content,
            last_message_at: message.created_at,
            unread_count: unread ? (conversation.unread_count ?? 0) + 1 : 0,
        }
    }))
}

function PresenceDot({ online, size = 12, style }: { online: boolean; size?: number; style?: React.CSSProperties }) {
    return <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: online ? '#22c55e' : '#9ca3af', border: '2px solid var(--color-bg-card)', ...style }} />
}

function MessageStatus({ message }: { message: Message }) {
    if (message.id.startsWith('temp-')) return <span style={{ display: 'inline-flex', marginLeft: 4, opacity: 0.6 }}><Check size={14} /></span>
    if (message.is_read) return <span style={{ display: 'inline-flex', marginLeft: 4, color: '#34b7f1' }}><CheckCheck size={14} /></span>
    return <span style={{ display: 'inline-flex', marginLeft: 4, opacity: 0.7 }}><CheckCheck size={14} /></span>
}

function TypingIndicator() {
    return (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>
            <div style={{ padding: '12px 18px', borderRadius: 20, borderBottomLeftRadius: 4, backgroundColor: 'var(--color-bg-elevated)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="typing-dot" style={{ animationDelay: '0s' }} />
                <span className="typing-dot" style={{ animationDelay: '0.15s' }} />
                <span className="typing-dot" style={{ animationDelay: '0.3s' }} />
            </div>
        </div>
    )
}

export default function MessagesClient({
    initialConversations,
    initialConversationId,
    initialMessages,
    initialIsOtherTyping,
    requestedConversationId,
}: {
    initialConversations: Conversation[]
    initialConversationId: string | null
    initialMessages: Message[]
    initialIsOtherTyping: boolean
    requestedConversationId?: string
}) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const supabase = useMemo(() => createClient(), [])
    const { user } = useAuth()
    const [manualSelection, setManualSelection] = useState<string | null | undefined>(undefined)
    const [draft, setDraft] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [onlineIds, setOnlineIds] = useState<string[]>([])
    const [liveTyping, setLiveTyping] = useState(false)
    const typingAtRef = useRef(0)
    const typingTimeoutRef = useRef<number | null>(null)
    const threadChannelRef = useRef<BrowserRealtimeChannel | null>(null)
    const threadReadyRef = useRef(false)
    const presenceChannelRef = useRef<BrowserRealtimeChannel | null>(null)
    const presenceReadyRef = useRef(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const conversationsQuery = useQuery({
        queryKey: conversationsKey,
        queryFn: () => fetchJson<Conversation[]>('/api/dm/inbox', { method: 'POST', body: JSON.stringify({}) }),
        initialData: initialConversations,
        staleTime: 60_000,
        refetchOnWindowFocus: true,
        enabled: Boolean(user),
    })
    const refetchConversations = conversationsQuery.refetch

    const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data])

    useEffect(() => {
        if (!requestedConversationId || !user) return
        if (conversations.some((conversation) => conversation.id === requestedConversationId)) return
        void refetchConversations()
    }, [conversations, refetchConversations, requestedConversationId, user])

    const activeConvo = useMemo(() => {
        if (manualSelection !== undefined) {
            if (manualSelection === null) return null
            return conversations.some((conversation) => conversation.id === manualSelection) ? manualSelection : null
        }
        if (requestedConversationId && conversations.some((conversation) => conversation.id === requestedConversationId)) return requestedConversationId
        if (initialConversationId && conversations.some((conversation) => conversation.id === initialConversationId)) return initialConversationId
        return conversations[0]?.id ?? null
    }, [conversations, initialConversationId, manualSelection, requestedConversationId])

    const filteredConversations = useMemo(() => {
        const needle = searchQuery.trim().toLowerCase()
        if (!needle) return conversations
        return conversations.filter((conversation) => {
            const name = conversation.participant?.full_name || conversation.participant?.username || ''
            return name.toLowerCase().includes(needle) || (conversation.last_message || '').toLowerCase().includes(needle)
        })
    }, [conversations, searchQuery])

    const messagesQuery = useQuery({
        queryKey: messagesKey(activeConvo),
        queryFn: () => fetchJson<MessageThreadResponse>('/api/dm/messages', { method: 'POST', body: JSON.stringify({ action: 'fetch', conversationId: activeConvo }) }),
        initialData: activeConvo && activeConvo === initialConversationId ? { messages: initialMessages, isOtherTyping: initialIsOtherTyping } : undefined,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        enabled: Boolean(activeConvo && user),
    })

    const prefetchConversation = (conversationId: string) => {
        void queryClient.prefetchQuery({
            queryKey: messagesKey(conversationId),
            queryFn: () => fetchJson<MessageThreadResponse>('/api/dm/messages', { method: 'POST', body: JSON.stringify({ action: 'fetch', conversationId }) }),
            staleTime: 60_000,
        })
    }

    useEffect(() => {
        conversations.slice(0, 4).forEach((conversation) => {
            if (conversation.id === activeConvo) return
            void queryClient.prefetchQuery({
                queryKey: messagesKey(conversation.id),
                queryFn: () => fetchJson<MessageThreadResponse>('/api/dm/messages', { method: 'POST', body: JSON.stringify({ action: 'fetch', conversationId: conversation.id }) }),
                staleTime: 60_000,
            })
        })
    }, [activeConvo, conversations, queryClient])

    const markReadMutation = useMutation({
        mutationFn: (conversationId: string) => fetchJson<{ success: boolean }>('/api/dm/messages', { method: 'POST', body: JSON.stringify({ action: 'read', conversationId }) }),
        onSuccess: (_result, conversationId) => {
            queryClient.setQueryData(conversationsKey, (current: Conversation[] | undefined) => (current ?? []).map((conversation) => conversation.id === conversationId ? { ...conversation, unread_count: 0 } : conversation))
            queryClient.setQueryData(messagesKey(conversationId), (current: MessageThreadResponse | undefined) => current ? { ...current, messages: markIncomingRead(current.messages, user?.id ?? null) } : current)
        },
    })
    const markConversationRead = markReadMutation.mutate
    const isMarkingRead = markReadMutation.isPending

    const sendMutation = useMutation({
        mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) => fetchJson<{ message: Message }>('/api/dm/messages', { method: 'POST', body: JSON.stringify({ action: 'send', conversationId, content }) }),
        onMutate: async ({ conversationId, content }) => {
            const tempId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? `temp-${crypto.randomUUID()}` : `temp-${Date.now()}`
            const tempMessage: Message = { id: tempId, conversation_id: conversationId, sender_id: user?.id || '', content, is_read: false, created_at: new Date().toISOString() }
            const previousThread = queryClient.getQueryData<MessageThreadResponse>(messagesKey(conversationId))
            const previousConversations = queryClient.getQueryData<Conversation[]>(conversationsKey)
            queryClient.setQueryData(messagesKey(conversationId), { messages: mergeMessage(previousThread?.messages ?? [], tempMessage), isOtherTyping: false })
            queryClient.setQueryData(conversationsKey, (current: Conversation[] | undefined) => updatePreview(current ?? [], tempMessage, user?.id ?? null, conversationId))
            return { previousThread, previousConversations, tempId }
        },
        onError: (_error, { conversationId, content }, context) => {
            if (context?.previousThread) queryClient.setQueryData(messagesKey(conversationId), context.previousThread)
            if (context?.previousConversations) queryClient.setQueryData(conversationsKey, context.previousConversations)
            setDraft((current) => current || content)
        },
        onSuccess: ({ message }, { conversationId }, context) => {
            queryClient.setQueryData(messagesKey(conversationId), (current: MessageThreadResponse | undefined) => ({
                messages: mergeMessage((current?.messages ?? []).filter((item) => item.id !== context?.tempId), message),
                isOtherTyping: false,
            }))
            queryClient.setQueryData(conversationsKey, (current: Conversation[] | undefined) => updatePreview(current ?? [], message, user?.id ?? null, conversationId))
        },
    })

    const thread = messagesQuery.data ?? { messages: [], isOtherTyping: false }
    const messages = thread.messages
    const activeConversation = conversations.find((conversation) => conversation.id === activeConvo) ?? null
    const activeParticipant = activeConversation?.participant ?? null
    const onlineUsers = useMemo(() => new Set(onlineIds), [onlineIds])
    const isParticipantOnline = activeParticipant ? onlineUsers.has(activeParticipant.id) : false
    const unreadInThread = useMemo(() => messages.some((message) => message.sender_id !== user?.id && !message.is_read), [messages, user?.id])
    const lastMessageByMe = [...messages].reverse().find((message) => message.sender_id === user?.id) ?? null
    const isOtherTyping = liveTyping || thread.isOtherTyping

    useEffect(() => {
        if (!activeConvo || !unreadInThread || isMarkingRead) return
        queryClient.setQueryData(messagesKey(activeConvo), (current: MessageThreadResponse | undefined) => current ? { ...current, messages: markIncomingRead(current.messages, user?.id ?? null) } : current)
        queryClient.setQueryData(conversationsKey, (current: Conversation[] | undefined) => (current ?? []).map((conversation) => conversation.id === activeConvo ? { ...conversation, unread_count: 0 } : conversation))
        markConversationRead(activeConvo)
    }, [activeConvo, isMarkingRead, markConversationRead, queryClient, unreadInThread, user?.id])

    useEffect(() => {
        if (!messages.length) return
        requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: messages.length < 3 ? 'auto' : 'smooth' }))
    }, [activeConvo, isOtherTyping, messages.length])

    useEffect(() => {
        if (!user) return
        const heartbeat = () => { void fetchJson<{ ok: boolean }>('/api/dm/presence', { method: 'POST', body: JSON.stringify({ action: 'heartbeat' }) }).catch(() => ({ ok: false })) }
        heartbeat()
        const intervalId = window.setInterval(heartbeat, 45_000)
        return () => window.clearInterval(intervalId)
    }, [user])

    useEffect(() => {
        if (!user) return
        const channel = supabase.channel(ONLINE_CHANNEL, { config: { presence: { key: user.id } } })
        presenceChannelRef.current = channel
        presenceReadyRef.current = false
        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState() as Record<string, Array<{ userId?: string }>>
            setOnlineIds(Object.keys(state))
        })
        channel.subscribe((status) => {
            if (status !== 'SUBSCRIBED') return
            presenceReadyRef.current = true
            void channel.track({ userId: user.id, activeConversationId: activeConvo, trackedAt: new Date().toISOString() })
        })
        return () => {
            presenceReadyRef.current = false
            presenceChannelRef.current = null
            setOnlineIds([])
            void supabase.removeChannel(channel)
        }
    }, [activeConvo, supabase, user])

    useEffect(() => {
        if (!user || !presenceReadyRef.current || !presenceChannelRef.current) return
        void presenceChannelRef.current.track({ userId: user.id, activeConversationId: activeConvo, trackedAt: new Date().toISOString() })
    }, [activeConvo, user])

    useEffect(() => {
        if (!user) return
        const channel = supabase.channel(`dm-user-${user.id}`)
        channel
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                const incoming = payload.new as Message
                queryClient.setQueryData(conversationsKey, (current: Conversation[] | undefined) => {
                    if (!(current ?? []).some((conversation) => conversation.id === incoming.conversation_id)) void refetchConversations()
                    return updatePreview(current ?? [], incoming, user.id, activeConvo)
                })
                queryClient.setQueryData(messagesKey(incoming.conversation_id), (current: MessageThreadResponse | undefined) => {
                    if (!current && activeConvo !== incoming.conversation_id) return current
                    const nextMessages = mergeMessage(current?.messages ?? [], incoming)
                    return { messages: activeConvo === incoming.conversation_id && incoming.sender_id !== user.id ? markIncomingRead(nextMessages, user.id) : nextMessages, isOtherTyping: false }
                })
                if (incoming.sender_id !== user.id && activeConvo === incoming.conversation_id) markConversationRead(incoming.conversation_id)
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
                const incoming = payload.new as Message
                queryClient.setQueryData(messagesKey(incoming.conversation_id), (current: MessageThreadResponse | undefined) => current ? { ...current, messages: current.messages.map((message) => message.id === incoming.id ? { ...message, ...incoming } : message) } : current)
            })
            .subscribe()
        return () => { void supabase.removeChannel(channel) }
    }, [activeConvo, markConversationRead, queryClient, refetchConversations, supabase, user])

    useEffect(() => {
        if (typingTimeoutRef.current) { window.clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null }
        threadReadyRef.current = false
        if (!user || !activeConvo) {
            if (threadChannelRef.current) void supabase.removeChannel(threadChannelRef.current)
            threadChannelRef.current = null
            return
        }
        const channel = supabase.channel(`dm-thread-${activeConvo}`)
        threadChannelRef.current = channel
        channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
            const typingUserId = typeof payload?.userId === 'string' ? payload.userId : null
            if (!typingUserId || typingUserId === user.id) return
            setLiveTyping(true)
            if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current)
            typingTimeoutRef.current = window.setTimeout(() => setLiveTyping(false), 3_000)
        }).subscribe((status) => {
            if (status === 'SUBSCRIBED') threadReadyRef.current = true
        })
        return () => {
            threadReadyRef.current = false
            threadChannelRef.current = null
            if (typingTimeoutRef.current) { window.clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null }
            setLiveTyping(false)
            void supabase.removeChannel(channel)
        }
    }, [activeConvo, supabase, user])

    const sendTypingSignal = () => {
        if (!activeConvo || !user || !threadChannelRef.current || !threadReadyRef.current) return
        const now = Date.now()
        if (now - typingAtRef.current < 1_200) return
        typingAtRef.current = now
        void threadChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId: user.id, conversationId: activeConvo, sentAt: new Date().toISOString() } })
    }

    const handleSend = () => {
        if (!activeConvo || !draft.trim()) return
        const content = draft.trim()
        setDraft('')
        sendMutation.mutate({ conversationId: activeConvo, content })
    }

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, margin: 0 }}>Messages</h1>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 0 0' }}>Realtime inbox, instant thread sync, and no poll-driven lag.</p>
                </div>
                {activeParticipant && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 999, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 13 }}><PresenceDot online={isParticipantOnline} size={10} />{isOtherTyping ? 'Typing now' : isParticipantOnline ? 'Active now' : 'Chat ready'}</div>}
            </div>

            <div className="messages-shell" style={{ flex: 1, minHeight: 0, display: 'grid', gap: 20 }}>
                <aside className={activeConvo ? 'hide-on-mobile' : ''} style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 24, overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: 18, borderBottom: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-bg-elevated)', borderRadius: 14, padding: '10px 12px' }}>
                            <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
                            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search conversations" style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text-primary)' }} />
                        </div>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {filteredConversations.length === 0 ? (
                            <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}><MessageCircle size={26} style={{ marginBottom: 10 }} />No conversations yet.</div>
                        ) : filteredConversations.map((conversation) => {
                            const participant = conversation.participant
                            const participantOnline = participant ? onlineUsers.has(participant.id) : false
                            const active = conversation.id === activeConvo
                            return (
                                <button key={conversation.id} onClick={() => { setManualSelection(conversation.id); router.replace(`/messages?convo=${conversation.id}`, { scroll: false }) }} onMouseEnter={() => prefetchConversation(conversation.id)} onFocus={() => prefetchConversation(conversation.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', backgroundColor: active ? 'var(--color-bg-elevated)' : 'transparent' }}>
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <div style={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: participant?.avatar_url ? `url(${participant.avatar_url}) center/cover` : 'var(--color-primary)', color: 'white', fontSize: 16, fontWeight: 600 }}>
                                            {!participant?.avatar_url && (participant?.full_name?.[0] || participant?.username?.[0] || '?')}
                                        </div>
                                        <PresenceDot online={participantOnline} size={14} style={{ position: 'absolute', bottom: -1, right: -1 }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{participant?.full_name || participant?.username || 'User'}</p>
                                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{formatSidebarTime(conversation.last_message_at || null)}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 3 }}>
                                            <p style={{ fontSize: 13, color: (conversation.unread_count ?? 0) > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontWeight: (conversation.unread_count ?? 0) > 0 ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{conversation.last_message || 'No messages yet'}</p>
                                            {(conversation.unread_count ?? 0) > 0 && <div style={{ minWidth: 20, height: 20, borderRadius: 10, padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-primary)', color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0, lineHeight: 1 }}>{conversation.unread_count}</div>}
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </aside>

                <section className={!activeConvo ? 'hide-on-mobile' : ''} style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 24, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {!activeConversation ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}><div style={{ textAlign: 'center' }}><MessageCircle size={34} style={{ marginBottom: 12 }} />Select a conversation</div></div>
                    ) : (
                        <>
                            <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}>
                                <button className="mobile-back-btn" onClick={() => { setManualSelection(null); router.replace('/messages', { scroll: false }) }} style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'none', borderRadius: 8 }}><ChevronLeft size={22} /></button>
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: activeParticipant?.avatar_url ? `url(${activeParticipant.avatar_url}) center/cover` : 'var(--color-primary)', color: 'white', fontSize: 15, fontWeight: 600 }}>
                                        {!activeParticipant?.avatar_url && (activeParticipant?.full_name?.[0] || activeParticipant?.username?.[0] || '?')}
                                    </div>
                                    <PresenceDot online={isParticipantOnline} size={12} style={{ position: 'absolute', bottom: -1, right: -1 }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 1px 0' }}>{activeParticipant?.full_name || activeParticipant?.username || 'User'}</p>
                                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>{isOtherTyping ? 'typing...' : isParticipantOnline ? 'Online' : activeParticipant?.username ? `@${activeParticipant.username}` : 'Offline'}</p>
                                </div>
                            </header>

                            <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {messages.length === 0 ? (
                                    <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)' }}><MessageCircle size={26} style={{ marginBottom: 10 }} />{messagesQuery.isFetching ? 'Loading conversation...' : 'No messages yet.'}</div>
                                ) : messages.map((message, index) => {
                                    const isMe = message.sender_id === user?.id
                                    const showDate = shouldShowDateSeparator(messages, index)
                                    const nextMessage = messages[index + 1]
                                    const isLastInGroup = !nextMessage || nextMessage.sender_id !== message.sender_id || shouldShowDateSeparator(messages, index + 1)
                                    const isLastByMe = message.id === lastMessageByMe?.id
                                    return (
                                        <div key={message.id}>
                                            {showDate && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: index === 0 ? '4px 0 12px' : '16px 0 12px' }}><span style={{ fontSize: 11, color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-elevated)', padding: '4px 12px', borderRadius: 10, fontWeight: 500 }}>{formatDateLabel(message.created_at)}</span></div>}
                                            <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: isLastInGroup ? 8 : 2 }}>
                                                <div style={{ maxWidth: '75%' }}>
                                                    <div style={{ padding: '10px 14px', fontSize: 14, lineHeight: 1.5, backgroundColor: isMe ? 'var(--color-primary)' : 'var(--color-bg-elevated)', color: isMe ? 'white' : 'var(--color-text-primary)', borderRadius: 18, borderBottomRightRadius: isMe && isLastInGroup ? 4 : 18, borderBottomLeftRadius: !isMe && isLastInGroup ? 4 : 18, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                                        <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
                                                    </div>
                                                    {isLastInGroup && <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 2, marginTop: 3, padding: isMe ? '0 4px 0 0' : '0 0 0 4px' }}><span style={{ fontSize: 11, color: 'var(--color-text-muted)', opacity: 0.8 }}>{formatTime(message.created_at)}</span>{isMe && isLastByMe && <MessageStatus message={message} />}</div>}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {isOtherTyping && <TypingIndicator />}
                                <div ref={messagesEndRef} />
                            </div>

                            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10, backgroundColor: 'var(--color-bg-card)' }}>
                                <input type="text" value={draft} onChange={(event) => { setDraft(event.target.value); if (event.target.value.trim()) sendTypingSignal() }} placeholder="Type a message..." style={{ flex: 1, padding: '12px 16px', borderRadius: 24, fontSize: 14, outline: 'none', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSend() } }} />
                                <button onClick={handleSend} disabled={!draft.trim()} style={{ padding: 12, borderRadius: '50%', border: 'none', cursor: !draft.trim() ? 'not-allowed' : 'pointer', background: 'var(--color-primary)', color: 'white', opacity: !draft.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, flexShrink: 0 }}><Send size={18} /></button>
                            </div>
                        </>
                    )}
                </section>
            </div>

            <style>{`
                .messages-shell { grid-template-columns: 1fr; }
                @media (min-width: 960px) { .messages-shell { grid-template-columns: 340px minmax(0, 1fr); } }
                @media (max-width: 959px) { .hide-on-mobile { display: none !important; } .mobile-back-btn { display: flex !important; } }
                @keyframes typingBounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }
                .typing-dot { width: 7px; height: 7px; border-radius: 50%; background-color: var(--color-text-muted); display: inline-block; animation: typingBounce 1.2s ease-in-out infinite; }
            `}</style>
        </div>
    )
}
