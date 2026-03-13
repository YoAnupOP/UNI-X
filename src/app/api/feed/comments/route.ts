import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { createFeedComment, getFeedComments } from '@/features/feed/server'
import { CACHE_TAGS } from '@/lib/server/cache-tags'

export async function GET(request: NextRequest) {
    try {
        const postId = request.nextUrl.searchParams.get('postId')
        if (!postId) {
            return NextResponse.json({ error: 'postId is required' }, { status: 400 })
        }

        const comments = await getFeedComments(postId)
        return NextResponse.json(comments)
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load comments' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const result = await createFeedComment(body.postId, body.content ?? '')
        revalidateTag(CACHE_TAGS.feedPosts, 'max')
        return NextResponse.json(result)
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create comment' }, { status: 500 })
    }
}

