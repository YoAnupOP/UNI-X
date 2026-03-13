import { unstable_cache } from 'next/cache'
import { Post, Profile } from '@/lib/types'
import { getViewer } from '@/lib/server/viewer'
import { CACHE_TAGS } from '@/lib/server/cache-tags'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'

export type FeedPost = Post & { author: Profile; is_liked: boolean }
export type FeedComment = { id: string; content: string; author: Profile; created_at: string }

const getFeedPostsCached = unstable_cache(
    async (viewerId: string | null): Promise<FeedPost[]> => {
        const supabase = await createServiceRoleClient()

        const [{ data: postsData, error: postsError }, likedResponse] = await Promise.all([
            supabase
                .from('posts')
                .select('*, author:profiles(*)')
                .order('created_at', { ascending: false })
                .limit(50),
            viewerId
                ? supabase.from('likes').select('post_id').eq('user_id', viewerId)
                : Promise.resolve({ data: [] as Array<{ post_id: string }>, error: null }),
        ])

        if (postsError) {
            throw new Error(postsError.message)
        }

        const likedIds = new Set((likedResponse.data ?? []).map((item: { post_id: string }) => item.post_id))

        return ((postsData as Array<Post & { author: Profile }>) ?? []).map((post) => ({
            ...post,
            is_liked: likedIds.has(post.id),
        }))
    },
    ['feed-posts-snapshot'],
    { revalidate: 30, tags: [CACHE_TAGS.feedPosts] }
)

const getFeedSuggestionsCached = unstable_cache(
    async (viewerId: string, university: string | null, limit: number): Promise<Profile[]> => {
        const supabase = await createServiceRoleClient()
        const { data: following } = await supabase
            .from('followers')
            .select('following_id')
            .eq('follower_id', viewerId)

        const followingIds = (following ?? []).map((item) => item.following_id)

        const buildQuery = (filterUniversity: boolean) => {
            let query = supabase
                .from('profiles')
                .select('*')
                .neq('id', viewerId)
                .limit(limit)

            if (followingIds.length > 0) {
                query = query.not('id', 'in', `(${followingIds.join(',')})`)
            }

            if (filterUniversity && university) {
                query = query.eq('university', university)
            }

            return query
        }

        let { data } = await buildQuery(true)

        if (!data?.length) {
            const fallback = await buildQuery(false)
            data = fallback.data
        }

        return (data as Profile[]) ?? []
    },
    ['feed-suggestions-snapshot'],
    { revalidate: 300, tags: [CACHE_TAGS.feedSuggestions] }
)

export async function getFeedPosts(): Promise<FeedPost[]> {
    const viewer = await getViewer()
    return getFeedPostsCached(viewer.user?.id ?? null)
}

export async function getFeedSuggestions(limit = 5): Promise<Profile[]> {
    const viewer = await getViewer()
    if (!viewer.user) return []

    return getFeedSuggestionsCached(viewer.user.id, viewer.profile?.university ?? null, limit)
}

export async function getFeedPageSnapshot() {
    const [initialPosts, initialSuggestions] = await Promise.all([
        getFeedPosts(),
        getFeedSuggestions(),
    ])

    return {
        initialPosts,
        initialSuggestions,
        renderedAt: Date.now(),
    }
}

export async function getFeedComments(postId: string): Promise<FeedComment[]> {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
        .from('comments')
        .select('*, author:profiles(*)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

    if (error) {
        throw new Error(error.message)
    }

    return (data as FeedComment[]) ?? []
}

export async function createFeedPost(input: { content: string; imageUrl?: string | null }) {
    const viewer = await getViewer()
    if (!viewer.user) throw new Error('Unauthorized')

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
        .from('posts')
        .insert({
            author_id: viewer.user.id,
            content: input.content,
            post_type: 'general',
            image_url: input.imageUrl ?? null,
        })
        .select('*, author:profiles(*)')
        .single()

    if (error || !data) {
        throw new Error(error?.message ?? 'Failed to create post')
    }

    return { ...(data as Post & { author: Profile }), is_liked: false } as FeedPost
}

export async function deleteFeedPost(postId: string) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.from('posts').delete().eq('id', postId)

    if (error) {
        throw new Error(error.message)
    }

    return { success: true }
}

export async function toggleFeedLike(postId: string) {
    const viewer = await getViewer()
    if (!viewer.user) throw new Error('Unauthorized')

    const supabase = await createServerSupabaseClient()
    const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', viewer.user.id)
        .maybeSingle()

    if (existingLike) {
        const { error } = await supabase
            .from('likes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', viewer.user.id)

        if (error) throw new Error(error.message)
    } else {
        const { error } = await supabase
            .from('likes')
            .insert({ post_id: postId, user_id: viewer.user.id })

        if (error) throw new Error(error.message)
    }

    const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

    const likesCount = count ?? 0

    await supabase
        .from('posts')
        .update({ likes_count: likesCount })
        .eq('id', postId)

    return {
        postId,
        likesCount,
        isLiked: !existingLike,
    }
}

export async function createFeedComment(postId: string, content: string) {
    const viewer = await getViewer()
    if (!viewer.user) throw new Error('Unauthorized')

    const supabase = await createServerSupabaseClient()
    const { data: comment, error } = await supabase
        .from('comments')
        .insert({ post_id: postId, author_id: viewer.user.id, content })
        .select('*, author:profiles(*)')
        .single()

    if (error || !comment) {
        throw new Error(error?.message ?? 'Failed to add comment')
    }

    const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

    const commentsCount = count ?? 0

    await supabase
        .from('posts')
        .update({ comments_count: commentsCount })
        .eq('id', postId)

    return {
        comment: comment as FeedComment,
        commentsCount,
    }
}

export async function toggleFollowSuggestion(profileId: string) {
    const viewer = await getViewer()
    if (!viewer.user) throw new Error('Unauthorized')

    const supabase = await createServerSupabaseClient()
    const { data: existing } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', viewer.user.id)
        .eq('following_id', profileId)
        .maybeSingle()

    if (existing) {
        const { error } = await supabase
            .from('followers')
            .delete()
            .eq('follower_id', viewer.user.id)
            .eq('following_id', profileId)

        if (error) throw new Error(error.message)
    } else {
        const { error } = await supabase
            .from('followers')
            .insert({ follower_id: viewer.user.id, following_id: profileId })

        if (error) throw new Error(error.message)
    }

    return { profileId, isFollowing: !existing }
}
