import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { getFeedSuggestions, toggleFollowSuggestion } from '@/features/feed/server'
import { CACHE_TAGS } from '@/lib/server/cache-tags'

export async function GET() {
    try {
        const suggestions = await getFeedSuggestions()
        return NextResponse.json(suggestions)
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load suggestions' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const result = await toggleFollowSuggestion(body.profileId)
        revalidateTag(CACHE_TAGS.feedSuggestions, 'max')
        return NextResponse.json(result)
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update follow state' }, { status: 500 })
    }
}

