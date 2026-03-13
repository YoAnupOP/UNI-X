import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { createClub, getClubsSnapshot, toggleClubMembership } from '@/features/clubs/server'
import { CACHE_TAGS } from '@/lib/server/cache-tags'

export async function GET() {
    try {
        const clubs = await getClubsSnapshot()
        return NextResponse.json(clubs)
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load clubs' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const club = await createClub(body)
        revalidateTag(CACHE_TAGS.clubs, 'max')
        return NextResponse.json(club)
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create club' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const result = await toggleClubMembership(body.clubId)
        revalidateTag(CACHE_TAGS.clubs, 'max')
        return NextResponse.json(result)
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update membership' }, { status: 500 })
    }
}

