import { Profile } from '@/lib/types'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getViewer } from '@/lib/server/viewer'

const SWIPEX_BATCH_SIZE = 30
const SWIPEX_FETCH_LIMIT = 150
const DAILY_LIKE_LIMIT = 50

export interface SwipedeckFilters {
    university?: string
    department?: string
    year?: string
}

export interface SwipeCandidate extends Profile {
    compatibilityScore: number
    sharedTraits: string[]
    hasLikedViewer?: boolean
}

export interface SwipeDeckSnapshot {
    candidates: SwipeCandidate[]
}

function uniqueTraits(values: Array<string | null | undefined>) {
    return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))]
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

function buildCandidateScore(viewer: Profile | null, candidate: Profile, hasLikedViewer: boolean) {
    const sharedTraits = uniqueTraits([
        ...(viewer?.interests ?? []).filter((item) => candidate.interests?.includes(item)),
        ...(viewer?.skills ?? []).filter((item) => candidate.skills?.includes(item)),
        viewer?.department && viewer.department === candidate.department ? viewer.department : null,
        viewer?.university && viewer.university === candidate.university ? viewer.university : null,
    ])

    let compatibilityScore = sharedTraits.length * 12

    if (viewer?.university && viewer.university === candidate.university) compatibilityScore += 24
    if (viewer?.department && viewer.department === candidate.department) compatibilityScore += 14
    if (viewer?.year && viewer.year === candidate.year) compatibilityScore += 8
    
    // Add randomness (0-15) for natural variation
    compatibilityScore += Math.floor(Math.random() * 15)

    return {
        ...candidate,
        compatibilityScore,
        sharedTraits: sharedTraits.slice(0, 4),
        hasLikedViewer
    }
}



// Extracted logic to fix the swipedRows mapping and build hybrid deck
function prepareDeck(swipeActions: any[], fetchedProfiles: Profile[], viewerId: string, viewerProfile: Profile | null) {
    const swipedByViewerIds = new Set(
        swipeActions.filter((row) => row.swiper_id === viewerId).map((row) => row.swiped_id)
    )

    // 2. Identify users who have ALREADY liked the viewer (but viewer hasn't swiped on them yet)
    const likedViewerIds = new Set(
        swipeActions
            .filter((row) => row.swiped_id === viewerId && row.action === 'like')
            .map((row) => row.swiper_id)
    )

    // Filter out users we've already seen
    const unswipedProfiles = fetchedProfiles.filter((candidate) => !swipedByViewerIds.has(candidate.id))

    // Score everyone
    let scoredCandidates = unswipedProfiles.map((candidate) => 
        buildCandidateScore(viewerProfile, candidate, likedViewerIds.has(candidate.id))
    )

    // Split into buckets
    const priorityDeck = scoredCandidates.filter((c) => c.hasLikedViewer)
    const discoveryDeck = scoredCandidates.filter((c) => !c.hasLikedViewer)

    // Sort discovery deck loosely by compatibility (incorporating the randomness we added)
    discoveryDeck.sort((a, b) => b.compatibilityScore - a.compatibilityScore)

    // Construct Hybrid Deck
    let finalDeck: SwipeCandidate[] = []
    
    // Add up to 2 "Likes You" users
    const selectedPriority = shuffleArray(priorityDeck).slice(0, 2)
    finalDeck.push(...selectedPriority)

    // Add remaining discovery users
    let remainingDiscovery = [...discoveryDeck]
    
    // Enforce diversity rules loosely while filling the rest of the batch
    const maxConsecutiveDept = 2
    let currDeptCount = 0
    let lastDept = ''

    for (let i = 0; i < remainingDiscovery.length && finalDeck.length < SWIPEX_BATCH_SIZE; i++) {
        const candidate = remainingDiscovery[i]
        
        // Simple diversity check
        if (candidate.department === lastDept) {
            currDeptCount++
            if (currDeptCount >= maxConsecutiveDept) {
                // Skip for now, push to end of array to look at later
                remainingDiscovery.push(candidate)
                remainingDiscovery.splice(i, 1)
                i-- // Re-evaluate this index since we shifted
                continue
            }
        } else {
            currDeptCount = 0
            lastDept = candidate.department || ''
        }

        finalDeck.push(candidate)
    }

    return finalDeck
}

// Needed to fix the loadSwipeCandidates query since I realized I was selecting swiped_id only in the original
async function executeLoadSwipeCandidates(viewerId: string, viewerProfile: Profile | null, filters?: SwipedeckFilters): Promise<SwipeCandidate[]> {
     const supabase = await createServiceRoleClient()

    let profilesQuery = supabase
        .from('profiles')
        .select('*')
        .neq('id', viewerId)
        .eq('is_public', true)
        .eq('profile_completed', true)
        
    // Apply Filters
    if (filters?.university && filters.university !== 'all') profilesQuery = profilesQuery.eq('university', filters.university)
    if (filters?.department && filters.department !== 'all') profilesQuery = profilesQuery.eq('department', filters.department)
    if (filters?.year && filters.year !== 'all') profilesQuery = profilesQuery.eq('year', filters.year)
    
    profilesQuery = profilesQuery.limit(SWIPEX_FETCH_LIMIT)

    const [{ data: swipedRows, error: swipedError }, { data: profiles, error: profilesError }] = await Promise.all([
        supabase
            .from('swipe_actions')
            .select('*')
            .or(`swiper_id.eq.${viewerId},swiped_id.eq.${viewerId}`), 
        profilesQuery,
    ])

    if (swipedError || profilesError) {
        throw new Error(swipedError?.message || profilesError?.message || 'Failed to load SwipeX deck')
    }
    
    return prepareDeck(swipedRows ?? [], profiles as Profile[] ?? [], viewerId, viewerProfile)
}


export async function getSwipeDeckSnapshot(filters?: SwipedeckFilters): Promise<SwipeDeckSnapshot> {
    const viewer = await getViewer()
    if (!viewer.user) {
        return { candidates: [] }
    }

    return {
        candidates: await executeLoadSwipeCandidates(viewer.user.id, viewer.profile, filters),
    }
}

export async function submitSwipeAction(input: { targetUserId: string; action: 'like' | 'pass' }) {
    const viewer = await getViewer()
    if (!viewer.user) {
        throw new Error('Unauthorized')
    }

    if (input.targetUserId === viewer.user.id) {
        throw new Error('You cannot swipe on yourself')
    }

    const serviceClient = await createServiceRoleClient()

    // 1. Check daily like limit
    if (input.action === 'like') {
        const today = new Date().toISOString().split('T')[0]
        const { count, error: countError } = await serviceClient
            .from('swipe_actions')
            .select('*', { count: 'exact', head: true })
            .eq('swiper_id', viewer.user.id)
            .eq('action', 'like')
            .gte('created_at', today)
            
        if (countError) throw new Error(countError.message)
        
        if (count && count >= DAILY_LIKE_LIMIT) {
             throw new Error('Daily like limit reached. Check back tomorrow!')
        }
    }


    const { error: swipeError } = await serviceClient
        .from('swipe_actions')
        .upsert(
            {
                swiper_id: viewer.user.id,
                swiped_id: input.targetUserId,
                action: input.action,
            },
            {
                onConflict: 'swiper_id,swiped_id',
                ignoreDuplicates: false,
            }
        )

    if (swipeError) {
        throw new Error(swipeError.message)
    }

    if (input.action !== 'like') {
        return { match: null }
    }

    const { data: reciprocalLike, error: reciprocalError } = await serviceClient
        .from('swipe_actions')
        .select('id')
        .eq('swiper_id', input.targetUserId)
        .eq('swiped_id', viewer.user.id)
        .eq('action', 'like')
        .maybeSingle()

    if (reciprocalError) {
        throw new Error(reciprocalError.message)
    }

    if (!reciprocalLike) {
        const deptStr = viewer.profile?.department ? ` from ${viewer.profile.department}` : ''
        await serviceClient.from('notifications').insert({
            user_id: input.targetUserId,
            title: 'New SwipeX Like 👀',
            body: `Someone${deptStr} just liked your profile! Keep swiping to find out who.`,
            type: 'like',
        })
        return { match: null }
    }

    const [user1Id, user2Id] = [viewer.user.id, input.targetUserId].sort()

    const { error: matchError } = await serviceClient
        .from('matches')
        .upsert(
            {
                user1_id: user1Id,
                user2_id: user2Id,
            },
            {
                onConflict: 'user1_id,user2_id',
                ignoreDuplicates: false,
            }
        )

    if (matchError) {
        throw new Error(matchError.message)
    }

    const { data: matchedProfile, error: profileError } = await serviceClient
        .from('profiles')
        .select('*')
        .eq('id', input.targetUserId)
        .maybeSingle()

    if (profileError) {
        throw new Error(profileError.message)
    }

    await serviceClient.from('notifications').insert({
        user_id: input.targetUserId,
        title: "It's a Match! 💖",
        body: `You and ${viewer.profile?.full_name || 'someone'} both swiped right on each other.`,
        type: 'match',
    })

    return {
        match: (matchedProfile as Profile | null) ?? null,
    }
}
