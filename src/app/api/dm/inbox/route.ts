import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
    try {
        const { targetConvoId } = await request.json().catch(() => ({}))

        // 1. Authenticate user via SSR client using cookies
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

        // 2. Use Service Role client to bypass RLS for this operation
        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 3. Get the user's conversation IDs
        const { data: userParts, error: partsErr } = await supabaseAdmin
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', user.id)

        if (partsErr) {
            return NextResponse.json({ error: 'Failed to fetch user conversations' }, { status: 500 })
        }

        const convoIds = userParts?.map(p => p.conversation_id) || []

        if (targetConvoId && !convoIds.includes(targetConvoId)) {
            convoIds.push(targetConvoId)
        }

        if (convoIds.length === 0) {
            return NextResponse.json({ convos: [], participants: [], unreadMsgs: [] })
        }

        // 4. Fetch inbox data using service role
        const [
            { data: convos, error: err1 },
            { data: participants, error: err2 },
            { data: unreadMsgs, error: err3 }
        ] = await Promise.all([
            supabaseAdmin.from('conversations').select('*').in('id', convoIds).order('last_message_at', { ascending: false }),
            supabaseAdmin.from('conversation_participants').select('conversation_id, user_id, profiles(*)').in('conversation_id', convoIds),
            supabaseAdmin.from('messages').select('conversation_id, id').in('conversation_id', convoIds).eq('is_read', false).neq('sender_id', user.id)
        ])

        if (err1 || err2 || err3) {
            console.error('Errors fetching inbox data:', err1, err2, err3)
            return NextResponse.json({ error: 'Failed to fetch inbox data' }, { status: 500 })
        }

        return NextResponse.json({
            convos: convos || [],
            participants: participants || [],
            unreadMsgs: unreadMsgs || []
        })

    } catch (error) {
        console.error('Inbox fetch error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
