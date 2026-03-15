import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getViewer } from '@/lib/server/viewer'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
) {
    try {
        const matchId = (await params).matchId
        if (!matchId) {
            return NextResponse.json({ error: 'Match ID is required' }, { status: 400 })
        }

        const viewer = await getViewer()
        if (!viewer.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createServerSupabaseClient()

        // First verify the match belongs to the user
        const { data: match, error: fetchError } = await supabase
            .from('matches')
            .select('*')
            .eq('id', matchId)
            .single()

        if (fetchError || !match) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 })
        }

        if (match.user1_id !== viewer.user.id && match.user2_id !== viewer.user.id) {
            return NextResponse.json({ error: 'Unauthorized to delete this match' }, { status: 403 })
        }

        // Delete the match
        const { error: deleteError } = await supabase
            .from('matches')
            .delete()
            .eq('id', matchId)

        if (deleteError) {
            throw new Error(deleteError.message)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete match' },
            { status: 500 }
        )
    }
}
