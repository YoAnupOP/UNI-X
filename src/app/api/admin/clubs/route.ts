import { NextRequest } from 'next/server'
import { requireAdmin, adminError } from '@/lib/admin'

// GET /api/admin/clubs?q=&category=&page=1&limit=20
export async function GET(request: NextRequest) {
    try {
        const { serviceClient } = await requireAdmin()
        const { searchParams } = request.nextUrl
        const q = searchParams.get('q') || ''
        const category = searchParams.get('category') || ''
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
        const from = (page - 1) * limit
        const to = from + limit - 1

        let query = serviceClient
            .from('clubs')
            .select('*, admin:profiles!admin_id(id, full_name, username)', { count: 'exact' })
            .order('members_count', { ascending: false })
            .range(from, to)

        if (q) {
            query = query.ilike('name', `%${q}%`)
        }
        if (category && ['general', 'tech', 'arts', 'sports', 'academic', 'social', 'cultural'].includes(category)) {
            query = query.eq('category', category)
        }

        const { data, count, error } = await query
        if (error) return Response.json({ error: error.message }, { status: 500 })

        return Response.json({ data, total: count, page, limit })
    } catch (err) {
        return adminError(err)
    }
}

// PATCH /api/admin/clubs — Update club details or toggle active
export async function PATCH(request: NextRequest) {
    try {
        const { serviceClient } = await requireAdmin()
        const { clubId, ...updates } = await request.json()

        if (!clubId) {
            return Response.json({ error: 'clubId is required' }, { status: 400 })
        }

        const allowed = ['name', 'description', 'category', 'is_active']
        const filtered: Record<string, unknown> = { updated_at: new Date().toISOString() }
        for (const key of allowed) {
            if (key in updates) filtered[key] = updates[key]
        }

        const { data, error } = await serviceClient
            .from('clubs')
            .update(filtered)
            .eq('id', clubId)
            .select()
            .single()

        if (error) return Response.json({ error: error.message }, { status: 500 })
        return Response.json({ data })
    } catch (err) {
        return adminError(err)
    }
}

// DELETE /api/admin/clubs?id=<clubId>
export async function DELETE(request: NextRequest) {
    try {
        const { serviceClient } = await requireAdmin()
        const clubId = request.nextUrl.searchParams.get('id')

        if (!clubId) {
            return Response.json({ error: 'Club ID is required' }, { status: 400 })
        }

        const { error } = await serviceClient.from('clubs').delete().eq('id', clubId)
        if (error) return Response.json({ error: error.message }, { status: 500 })

        return Response.json({ success: true })
    } catch (err) {
        return adminError(err)
    }
}
