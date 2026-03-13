import { unstable_cache } from 'next/cache'
import { Club } from '@/lib/types'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { getViewer } from '@/lib/server/viewer'
import { CACHE_TAGS } from '@/lib/server/cache-tags'

const getClubsSnapshotCached = unstable_cache(
    async (viewerId: string | null): Promise<Club[]> => {
        const supabase = await createServiceRoleClient()

        const [{ data: clubsData, error: clubsError }, membershipsResponse] = await Promise.all([
            supabase.from('clubs').select('*').eq('is_active', true).order('members_count', { ascending: false }),
            viewerId
                ? supabase.from('club_members').select('club_id').eq('user_id', viewerId)
                : Promise.resolve({ data: [] as Array<{ club_id: string }>, error: null }),
        ])

        if (clubsError) {
            throw new Error(clubsError.message)
        }

        const memberIds = new Set((membershipsResponse.data ?? []).map((item: { club_id: string }) => item.club_id))

        return ((clubsData ?? []) as Club[]).map((club) => ({ ...club, is_member: memberIds.has(club.id) }))
    },
    ['clubs-snapshot'],
    { revalidate: 300, tags: [CACHE_TAGS.clubs] }
)

export async function getClubsSnapshot(): Promise<Club[]> {
    const viewer = await getViewer()
    return getClubsSnapshotCached(viewer.user?.id ?? null)
}

export async function createClub(input: { name: string; description?: string; category?: string }) {
    const viewer = await getViewer()
    if (!viewer.user) throw new Error('Unauthorized')

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
        .from('clubs')
        .insert({
            name: input.name,
            description: input.description ?? '',
            category: input.category ?? 'general',
            admin_id: viewer.user.id,
            members_count: 1,
        })
        .select('*')
        .single()

    if (error || !data) {
        throw new Error(error?.message ?? 'Failed to create club')
    }

    await supabase.from('club_members').insert({ club_id: data.id, user_id: viewer.user.id })

    return { ...(data as Club), is_member: true }
}

export async function toggleClubMembership(clubId: string) {
    const viewer = await getViewer()
    if (!viewer.user) throw new Error('Unauthorized')

    const supabase = await createServerSupabaseClient()
    const { data: existing } = await supabase
        .from('club_members')
        .select('id')
        .eq('club_id', clubId)
        .eq('user_id', viewer.user.id)
        .maybeSingle()

    if (existing) {
        const { error } = await supabase.from('club_members').delete().eq('club_id', clubId).eq('user_id', viewer.user.id)
        if (error) throw new Error(error.message)
    } else {
        const { error } = await supabase.from('club_members').insert({ club_id: clubId, user_id: viewer.user.id })
        if (error) throw new Error(error.message)
    }

    const { count } = await supabase.from('club_members').select('*', { count: 'exact', head: true }).eq('club_id', clubId)
    const membersCount = count ?? 0

    await supabase.from('clubs').update({ members_count: membersCount }).eq('id', clubId)

    return { clubId, isMember: !existing, membersCount }
}
