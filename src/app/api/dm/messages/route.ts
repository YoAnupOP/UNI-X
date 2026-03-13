import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { CACHE_TAGS } from '@/lib/server/cache-tags'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const supabaseAuth = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return request.cookies.getAll() },
                    setAll() { },
                },
            }
        )

        const { data: { user } } = await supabaseAuth.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { action } = body

        if (action === 'fetch') {
            const { conversationId } = body
            if (!conversationId) {
                return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
            }

            const { data: participant } = await supabase
                .from('conversation_participants')
                .select('id')
                .eq('conversation_id', conversationId)
                .eq('user_id', user.id)
                .maybeSingle()

            if (!participant) {
                return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
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
                    .neq('user_id', user.id)
                    .maybeSingle(),
            ])

            if (error) {
                console.error('Fetch messages error:', error)
                return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
            }

            const isOtherTyping = typingData?.typing_at
                ? Date.now() - new Date(typingData.typing_at).getTime() < 4_000
                : false

            return NextResponse.json({ messages: messages || [], isOtherTyping })
        }

        if (action === 'send') {
            const { conversationId, content } = body
            if (!conversationId || !content?.trim()) {
                return NextResponse.json({ error: 'conversationId and content required' }, { status: 400 })
            }

            const { data: participant } = await supabase
                .from('conversation_participants')
                .select('id')
                .eq('conversation_id', conversationId)
                .eq('user_id', user.id)
                .maybeSingle()

            if (!participant) {
                return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
            }

            const trimmed = content.trim()
            const [{ data: message, error: messageError }] = await Promise.all([
                supabase
                    .from('messages')
                    .insert({ conversation_id: conversationId, sender_id: user.id, content: trimmed })
                    .select('*, sender:profiles(*)')
                    .single(),
                supabase
                    .from('conversations')
                    .update({ last_message: trimmed, last_message_at: new Date().toISOString() })
                    .eq('id', conversationId),
            ])

            if (messageError || !message) {
                console.error('Send message error:', messageError)
                return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
            }

            revalidateTag(CACHE_TAGS.dmInbox, 'max')
            return NextResponse.json({ message })
        }

        if (action === 'read') {
            const { conversationId } = body
            if (!conversationId) {
                return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
            }

            await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('conversation_id', conversationId)
                .neq('sender_id', user.id)
                .eq('is_read', false)

            revalidateTag(CACHE_TAGS.dmInbox, 'max')
            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
        console.error('Messages API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

