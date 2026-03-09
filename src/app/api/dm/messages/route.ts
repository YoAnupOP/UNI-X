import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Authenticate via SSR client
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

        // Service role client for elevated access
        const supabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { action } = body

        // ── FETCH messages for a conversation ──
        if (action === 'fetch') {
            const { conversationId } = body
            if (!conversationId) {
                return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
            }

            // Verify user is a participant
            const { data: part } = await supabase
                .from('conversation_participants')
                .select('id')
                .eq('conversation_id', conversationId)
                .eq('user_id', user.id)
                .single()

            if (!part) {
                return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
            }

            // Fetch messages + check if other user is typing in parallel
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
                    .single()
            ])

            if (error) {
                console.error('Fetch messages error:', error)
                return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
            }

            const isOtherTyping = typingData?.typing_at
                ? (Date.now() - new Date(typingData.typing_at).getTime()) < 4000
                : false

            return NextResponse.json({ messages: messages || [], isOtherTyping })
        }

        // ── SEND a message ──
        if (action === 'send') {
            const { conversationId, content } = body
            if (!conversationId || !content?.trim()) {
                return NextResponse.json({ error: 'conversationId and content required' }, { status: 400 })
            }

            // Verify user is a participant
            const { data: part } = await supabase
                .from('conversation_participants')
                .select('id')
                .eq('conversation_id', conversationId)
                .eq('user_id', user.id)
                .single()

            if (!part) {
                return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
            }

            const trimmed = content.trim()

            // Insert message + update conversation in parallel
            const [{ data: message, error: msgErr }] = await Promise.all([
                supabase
                    .from('messages')
                    .insert({ conversation_id: conversationId, sender_id: user.id, content: trimmed })
                    .select('*, sender:profiles(*)')
                    .single(),
                supabase
                    .from('conversations')
                    .update({ last_message: trimmed, last_message_at: new Date().toISOString() })
                    .eq('id', conversationId)
            ])

            if (msgErr || !message) {
                console.error('Send message error:', msgErr)
                return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
            }

            return NextResponse.json({ message })
        }

        // ── MARK messages as read ──
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

            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error) {
        console.error('Messages API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
