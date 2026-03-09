import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
    const username = request.nextUrl.searchParams.get('username')

    if (!username) {
        return NextResponse.json({ available: false, error: 'Username is required' }, { status: 400 })
    }

    // Validate format: 3-20 chars, lowercase alphanumeric + underscores
    const usernameRegex = /^[a-z0-9_]{3,20}$/
    if (!usernameRegex.test(username)) {
        return NextResponse.json({ available: false, error: 'Username must be 3-20 characters, lowercase letters, numbers, and underscores only' })
    }

    // Reserved usernames
    const reserved = ['admin', 'support', 'unix', 'unixapp', 'system', 'moderator', 'mod', 'help', 'official', 'staff', 'bot', 'api', 'root']
    if (reserved.includes(username)) {
        return NextResponse.json({ available: false, error: 'This username is reserved' })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single()

    return NextResponse.json({ available: !data })
}
