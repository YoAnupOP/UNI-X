import { QueryClient } from '@tanstack/react-query'
import { User } from '@supabase/supabase-js'
import type { FeedPost } from '@/features/feed/server'
import type { SwipeDeckSnapshot } from '@/features/swipex/server'
import { Club, Conversation, Profile } from '@/lib/types'
import { fetchJson } from './fetch-json'

const FEED_POSTS_QUERY_KEY = ['feed-posts'] as const
const FEED_SUGGESTIONS_QUERY_KEY = ['feed-suggestions'] as const
const CLUBS_QUERY_KEY = ['clubs'] as const
const DM_CONVERSATIONS_QUERY_KEY = ['dm-conversations'] as const
const SWIPEX_DECK_QUERY_KEY = ['swipex-deck'] as const

export function prefetchRouteData({
    href,
    queryClient,
    user,
}: {
    href: string
    queryClient: QueryClient
    user: User | null
}) {
    const pathname = href.split('?')[0]

    if (pathname === '/feed') {
        void queryClient.prefetchQuery({
            queryKey: FEED_POSTS_QUERY_KEY,
            queryFn: () => fetchJson<FeedPost[]>('/api/feed', { cache: 'no-store' }),
            staleTime: 60_000,
        })

        if (user) {
            void queryClient.prefetchQuery({
                queryKey: FEED_SUGGESTIONS_QUERY_KEY,
                queryFn: () => fetchJson<Profile[]>('/api/feed/suggestions', { cache: 'no-store' }),
                staleTime: 300_000,
            })
        }

        return
    }

    if (pathname === '/clubs') {
        void queryClient.prefetchQuery({
            queryKey: CLUBS_QUERY_KEY,
            queryFn: () => fetchJson<Club[]>('/api/clubs', { cache: 'no-store' }),
            staleTime: 300_000,
        })
        return
    }

    if (pathname === '/messages' && user) {
        void queryClient.prefetchQuery({
            queryKey: DM_CONVERSATIONS_QUERY_KEY,
            queryFn: () => fetchJson<Conversation[]>('/api/dm/inbox', {
                method: 'POST',
                body: JSON.stringify({}),
            }),
            staleTime: 30_000,
        })
        return
    }

    if (pathname === '/swipex' && user) {
        void queryClient.prefetchQuery({
            queryKey: SWIPEX_DECK_QUERY_KEY,
            queryFn: () => fetchJson<SwipeDeckSnapshot>('/api/swipex', { cache: 'no-store' }),
            staleTime: 5 * 60_000,
        })
    }
}
