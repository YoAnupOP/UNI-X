import { NextRequest, NextResponse } from 'next/server'
import { getSwipeDeckSnapshot, submitSwipeAction } from '@/features/swipex/server'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const filters = {
            university: searchParams.get('university') || undefined,
            department: searchParams.get('department') || undefined,
            year: searchParams.get('year') || undefined,
        }

        const snapshot = await getSwipeDeckSnapshot(filters)
        return NextResponse.json(snapshot)
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to load SwipeX deck' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId : ''
        const action = body.action === 'like' ? 'like' : body.action === 'pass' ? 'pass' : null

        if (!targetUserId || !action) {
            return NextResponse.json({ error: 'targetUserId and valid action are required' }, { status: 400 })
        }

        const result = await submitSwipeAction({ targetUserId, action })
        return NextResponse.json(result)
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to save swipe action' },
            { status: 500 }
        )
    }
}
