import FeedClient from '@/features/feed/FeedClient'
import { getFeedPageSnapshot } from '@/features/feed/server'

export default async function FeedPage() {
    const { initialPosts, initialSuggestions, renderedAt } = await getFeedPageSnapshot()

    return <FeedClient initialPosts={initialPosts} initialSuggestions={initialSuggestions} renderedAt={renderedAt} />
}
