import { NextResponse } from 'next/server'
import { getInboxSnapshot } from '@/features/messages/server'

export async function POST() {
    try {
        const conversations = await getInboxSnapshot()
        return NextResponse.json(conversations)
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load inbox' }, { status: 500 })
    }
}

