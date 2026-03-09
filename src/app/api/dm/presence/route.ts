import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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

        // ── HEARTBEAT: update last_seen_at ──
        if (action === 'heartbeat') {
            await supabase
                .from('profiles')
                .update({ last_seen_at: new Date().toISOString() })
                .eq('id', user.id)
            return NextResponse.json({ ok: true })
        }

        // ── TYPING: update typing_at on conversation_participants ──
        if (action === 'typing') {
            const { conversationId } = body
            if (!conversationId) {
                return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
            }
            await supabase
                .from('conversation_participants')
                .update({ typing_at: new Date().toISOString() })
                .eq('conversation_id', conversationId)
                .eq('user_id', user.id)
            return NextResponse.json({ ok: true })
        }

        // ── CHECK ONLINE: return which userIds are online ──
        if (action === 'check-online') {
            const { userIds } = body
            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                return NextResponse.json({ onlineIds: [] })
            }
            const { data } = await supabase
                .from('profiles')
                .select('id, last_seen_at')
                .in('id', userIds)

            const now = Date.now()
            const onlineIds = (data || [])
                .filter(p => p.last_seen_at && (now - new Date(p.last_seen_at).getTime()) < 60000)
                .map(p => p.id)

            return NextResponse.json({ onlineIds })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error) {
        console.error('Presence API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
