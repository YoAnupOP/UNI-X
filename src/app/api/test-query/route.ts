import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No user' })

    const { data: parts } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id)

    const convoIds = parts?.map(p => p.conversation_id) || []

    const res1 = await supabase.from('conversations').select('*').in('id', convoIds).order('last_message_at', { ascending: false })
    const res2 = await supabase.from('conversation_participants').select('conversation_id, user_id, profiles(*)').in('conversation_id', convoIds)
    const res3 = await supabase.from('messages').select('conversation_id, id').in('conversation_id', convoIds).eq('is_read', false).neq('sender_id', user.id)

    return NextResponse.json({
        res1, res2, res3
    })
}
