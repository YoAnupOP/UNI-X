import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getViewer } from '@/lib/server/viewer'
import { Match, Profile } from '@/lib/types'

export async function GET() {
    try {
        const viewer = await getViewer()
        if (!viewer.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createServerSupabaseClient()

        // Get all matches for user
        const { data: matchesData, error: matchesError } = await supabase
            .from('matches')
            .select('*')
            .or(`user1_id.eq.${viewer.user.id},user2_id.eq.${viewer.user.id}`)
            .order('matched_at', { ascending: false })

        if (matchesError) {
            throw new Error(matchesError.message)
        }

        if (!matchesData || matchesData.length === 0) {
            return NextResponse.json({ matches: [] })
        }

        const userId = viewer.user.id

        // Get profile info for all matched users
        const matchedUserIds = matchesData.map(match => 
            match.user1_id === userId ? match.user2_id : match.user1_id
        )

        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', matchedUserIds)

        if (profilesError) {
            throw new Error(profilesError.message)
        }

        const profilesMap = new Map((profiles as Profile[]).map(p => [p.id, p]))

        const mappedMatches = matchesData.map(match => {
            const partnerId = match.user1_id === userId ? match.user2_id : match.user1_id
            return {
                ...match,
                matched_user: profilesMap.get(partnerId)
            }
        }).filter(m => m.matched_user) // Filter out any where profile couldn't be loaded

        return NextResponse.json({ matches: mappedMatches })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch matches' },
            { status: 500 }
        )
    }
}
