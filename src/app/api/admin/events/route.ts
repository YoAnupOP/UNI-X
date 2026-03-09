import { NextRequest } from 'next/server'
import { requireAdmin, adminError } from '@/lib/admin'

// GET /api/admin/events?q=&filter=all|active|past&page=1&limit=20
export async function GET(request: NextRequest) {
    try {
        const { serviceClient } = await requireAdmin()
        const { searchParams } = request.nextUrl
        const q = searchParams.get('q') || ''
        const filter = searchParams.get('filter') || 'all'
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
        const from = (page - 1) * limit
        const to = from + limit - 1

        let query = serviceClient
            .from('events')
            .select('*, organizer:profiles!organizer_id(id, full_name, username), club:clubs(id, name)', { count: 'exact' })
            .order('start_date', { ascending: false })
            .range(from, to)

        if (q) {
            query = query.ilike('title', `%${q}%`)
        }
        if (filter === 'active') {
            query = query.eq('is_active', true).gte('start_date', new Date().toISOString())
        } else if (filter === 'past') {
            query = query.lt('start_date', new Date().toISOString())
        }

        const { data, count, error } = await query
        if (error) return Response.json({ error: error.message }, { status: 500 })

        return Response.json({ data, total: count, page, limit })
    } catch (err) {
        return adminError(err)
    }
}

// POST /api/admin/events — Create event as admin
export async function POST(request: NextRequest) {
    try {
        const { adminId, serviceClient } = await requireAdmin()
        const body = await request.json()

        const { title, description, location, start_date, end_date, club_id } = body
        if (!title || !start_date) {
            return Response.json({ error: 'title and start_date are required' }, { status: 400 })
        }

        const { data, error } = await serviceClient
            .from('events')
            .insert({
                title,
                description: description || '',
                location: location || '',
                start_date,
                end_date: end_date || null,
                organizer_id: adminId,
                club_id: club_id || null,
            })
            .select()
            .single()

        if (error) return Response.json({ error: error.message }, { status: 500 })
        return Response.json({ data }, { status: 201 })
    } catch (err) {
        return adminError(err)
    }
}

// PATCH /api/admin/events — Update event
export async function PATCH(request: NextRequest) {
    try {
        const { serviceClient } = await requireAdmin()
        const { eventId, ...updates } = await request.json()

        if (!eventId) {
            return Response.json({ error: 'eventId is required' }, { status: 400 })
        }

        const allowed = ['title', 'description', 'location', 'start_date', 'end_date', 'is_active']
        const filtered: Record<string, unknown> = {}
        for (const key of allowed) {
            if (key in updates) filtered[key] = updates[key]
        }

        const { data, error } = await serviceClient
            .from('events')
            .update(filtered)
            .eq('id', eventId)
            .select()
            .single()

        if (error) return Response.json({ error: error.message }, { status: 500 })
        return Response.json({ data })
    } catch (err) {
        return adminError(err)
    }
}

// DELETE /api/admin/events?id=<eventId>
export async function DELETE(request: NextRequest) {
    try {
        const { serviceClient } = await requireAdmin()
        const eventId = request.nextUrl.searchParams.get('id')

        if (!eventId) {
            return Response.json({ error: 'Event ID is required' }, { status: 400 })
        }

        const { error } = await serviceClient.from('events').delete().eq('id', eventId)
        if (error) return Response.json({ error: error.message }, { status: 500 })

        return Response.json({ success: true })
    } catch (err) {
        return adminError(err)
    }
}
