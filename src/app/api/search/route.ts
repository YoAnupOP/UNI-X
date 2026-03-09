import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/search?q=term&limit=5
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = request.nextUrl
        const q = (searchParams.get('q') || '').trim()

        if (!q || q.length < 2) {
            return Response.json({ people: [], clubs: [], events: [], posts: [] })
        }

        const limit = Math.min(8, Math.max(1, parseInt(searchParams.get('limit') || '5')))
        const pattern = `%${q}%`

        // Run all searches in parallel
        const [peopleRes, clubsRes, eventsRes, postsRes] = await Promise.all([
            supabase
                .from('profiles')
                .select('id, username, full_name, display_name, avatar_url, university, department')
                .eq('profile_completed', true)
                .or(`full_name.ilike.${pattern},username.ilike.${pattern},display_name.ilike.${pattern}`)
                .limit(limit),

            supabase
                .from('clubs')
                .select('id, name, description, avatar_url, category, members_count')
                .eq('is_active', true)
                .or(`name.ilike.${pattern},description.ilike.${pattern}`)
                .limit(limit),

            supabase
                .from('events')
                .select('id, title, description, location, start_date, image_url, rsvp_count')
                .eq('is_active', true)
                .gte('start_date', new Date().toISOString())
                .or(`title.ilike.${pattern},description.ilike.${pattern},location.ilike.${pattern}`)
                .order('start_date', { ascending: true })
                .limit(limit),

            supabase
                .from('posts')
                .select('id, content, author_id, likes_count, comments_count, created_at, author:profiles(id, username, full_name, avatar_url)')
                .ilike('content', pattern)
                .order('created_at', { ascending: false })
                .limit(limit),
        ])

        return Response.json({
            people: peopleRes.data || [],
            clubs: clubsRes.data || [],
            events: eventsRes.data || [],
            posts: postsRes.data || [],
        })
    } catch {
        return Response.json({ error: 'Search failed' }, { status: 500 })
    }
}
