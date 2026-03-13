import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { createFeedPost, deleteFeedPost, getFeedPosts, toggleFeedLike } from '@/features/feed/server'
import { CACHE_TAGS } from '@/lib/server/cache-tags'

export async function GET() {
    try {
        const posts = await getFeedPosts()
        return NextResponse.json(posts)
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load feed' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const post = await createFeedPost({ content: body.content ?? '', imageUrl: body.imageUrl ?? null })
        revalidateTag(CACHE_TAGS.feedPosts, 'max')
        return NextResponse.json(post)
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create post' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const result = await toggleFeedLike(body.postId)
        revalidateTag(CACHE_TAGS.feedPosts, 'max')
        return NextResponse.json(result)
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update like' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json()
        const result = await deleteFeedPost(body.postId)
        revalidateTag(CACHE_TAGS.feedPosts, 'max')
        return NextResponse.json(result)
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete post' }, { status: 500 })
    }
}

