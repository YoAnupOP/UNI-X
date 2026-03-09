import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createServerClient as createSupabaseSSR } from '@supabase/ssr'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { username, bio, department, year, avatar_url } = body

        if (!username || username.length < 3) {
            return NextResponse.json({ error: 'Valid username is required' }, { status: 400 })
        }

        // Get the authenticated user from cookies
        const supabaseAuth = createSupabaseSSR(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll() { },
                },
            }
        )

        const { data: { user } } = await supabaseAuth.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Use service role to update profile (avoids client-side lock issues)
        const supabaseAdmin = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const updateData: Record<string, unknown> = {
            username,
            display_name: username,
            bio: bio || '',
            department: department || '',
            year: year || '',
            profile_completed: true,
        }
        if (avatar_url) updateData.avatar_url = avatar_url

        const { error } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('id', user.id)

        if (error) {
            console.error('Profile update error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Setup profile API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
