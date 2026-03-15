import { Conversation, Message, Profile } from '@/lib/types'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getViewer } from '@/lib/server/viewer'

export interface MessageThreadSnapshot {
    messages: Message[]
    isOtherTyping: boolean
}

async function loadInboxSnapshot(viewerId: string): Promise<Conversation[]> {
    const supabase = await createServiceRoleClient()
    const { data: userParts, error: partsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', viewerId)

    if (partsError) {
        throw new Error(partsError.message)
    }

    const convoIds = (userParts ?? []).map((item) => item.conversation_id)
    if (convoIds.length === 0) return []

    const [convosResponse, participantsResponse, unreadResponse] = await Promise.all([
        supabase.from('conversations').select('*').in('id', convoIds).order('last_message_at', { ascending: false }),
        supabase.from('conversation_participants').select('conversation_id, user_id, profiles(*)').in('conversation_id', convoIds),
        supabase.from('messages').select('conversation_id, id').in('conversation_id', convoIds).eq('is_read', false).neq('sender_id', viewerId),
    ])

    if (convosResponse.error || participantsResponse.error || unreadResponse.error) {
        throw new Error(convosResponse.error?.message || participantsResponse.error?.message || unreadResponse.error?.message || 'Failed to load inbox')
    }

    const unreadMap = new Map<string, number>()
    for (const message of unreadResponse.data ?? []) {
        unreadMap.set(message.conversation_id, (unreadMap.get(message.conversation_id) ?? 0) + 1)
    }

    return ((convosResponse.data ?? []) as Conversation[]).map((conversation) => {
        const convoParticipants = (participantsResponse.data ?? []).filter((participant) => participant.conversation_id === conversation.id)
        const other = convoParticipants.find((participant) => participant.user_id !== viewerId) ?? convoParticipants[0]
        const participant = Array.isArray(other?.profiles) ? other?.profiles[0] : other?.profiles

        return {
            ...conversation,
            participant: participant as Profile,
            unread_count: unreadMap.get(conversation.id) ?? 0,
        }
    })
}

export async function getInboxSnapshot(): Promise<Conversation[]> {
    const viewer = await getViewer()
    if (!viewer.user) return []

    return loadInboxSnapshot(viewer.user.id)
}

export async function getConversationMessagesSnapshot(conversationId: string): Promise<MessageThreadSnapshot> {
    const viewer = await getViewer()
    if (!viewer.user || !conversationId) {
        return { messages: [], isOtherTyping: false }
    }

    const supabase = await createServiceRoleClient()
    const { data: participant } = await supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', viewer.user.id)
        .maybeSingle()

    if (!participant) {
        return { messages: [], isOtherTyping: false }
    }

    const [{ data: messages, error }, { data: typingData }] = await Promise.all([
        supabase
            .from('messages')
            .select('*, sender:profiles(*)')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true }),
        supabase
            .from('conversation_participants')
            .select('typing_at')
            .eq('conversation_id', conversationId)
            .neq('user_id', viewer.user.id)
            .maybeSingle(),
    ])

    if (error) {
        throw new Error(error.message)
    }

    const isOtherTyping = typingData?.typing_at
        ? Date.now() - new Date(typingData.typing_at).getTime() < 4_000
        : false

    return {
        messages: (messages as Message[]) ?? [],
        isOtherTyping,
    }
}

export function resolveInitialConversationId(conversations: Conversation[], requestedConversationId?: string | null) {
    if (requestedConversationId && conversations.some((conversation) => conversation.id === requestedConversationId)) {
        return requestedConversationId
    }

    return conversations[0]?.id ?? null
}
