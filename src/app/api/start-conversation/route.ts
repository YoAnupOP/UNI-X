import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createServerClient as createSupabaseSSR } from '@supabase/ssr'
import { CACHE_TAGS } from '@/lib/server/cache-tags'

export async function POST(request: NextRequest) {
    try {
        const { targetUserId } = await request.json()

        if (!targetUserId) {
            return NextResponse.json({ error: 'Target user ID required' }, { status: 400 })
        }

        // Get authenticated user
        const supabaseAuth = createSupabaseSSR(
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
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        if (targetUserId === user.id) {
            return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
        }

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Check if conversation already exists between these two users
        const { data: myConvos } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', user.id)

        if (myConvos?.length) {
            const convoIds = myConvos.map(c => c.conversation_id)
            const { data: existing } = await supabase
                .from('conversation_participants')
                .select('conversation_id')
                .eq('user_id', targetUserId)
                .in('conversation_id', convoIds)

            if (existing?.length) {
                revalidateTag(CACHE_TAGS.dmInbox, 'max')
                return NextResponse.json({ conversationId: existing[0].conversation_id })
            }
        }

        // Create new conversation
        const { data: convo, error: convoErr } = await supabase
            .from('conversations')
            .insert({ last_message: '', last_message_at: new Date().toISOString() })
            .select()
            .single()

        if (convoErr || !convo) {
            return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
        }

        // Add both participants
        await supabase.from('conversation_participants').insert([
            { conversation_id: convo.id, user_id: user.id },
            { conversation_id: convo.id, user_id: targetUserId },
        ])

        revalidateTag(CACHE_TAGS.dmInbox, 'max')
        return NextResponse.json({ conversationId: convo.id })
    } catch (error) {
        console.error('Start conversation error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
