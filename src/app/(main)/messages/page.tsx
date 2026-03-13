import MessagesClient from '@/features/messages/MessagesClient'
import { getConversationMessagesSnapshot, getInboxSnapshot, resolveInitialConversationId } from '@/features/messages/server'

interface MessagesPageProps {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
    const params = searchParams ? await searchParams : {}
    const requestedConversationId = typeof params.convo === 'string' ? params.convo : undefined
    const initialConversations = await getInboxSnapshot()
    const initialConversationId = resolveInitialConversationId(initialConversations, requestedConversationId)
    const initialThread = initialConversationId
        ? await getConversationMessagesSnapshot(initialConversationId)
        : { messages: [], isOtherTyping: false }

    return (
        <MessagesClient
            initialConversations={initialConversations}
            initialConversationId={initialConversationId}
            initialMessages={initialThread.messages}
            initialIsOtherTyping={initialThread.isOtherTyping}
        />
    )
}
