import { NextResponse } from 'next/server'
import { getViewer } from '@/lib/server/viewer'

export async function GET() {
    const viewer = await getViewer()
    return NextResponse.json(viewer)
}

