import { NextRequest } from 'next/server'
import { requireAdmin, adminError } from '@/lib/admin'

// GET /api/admin/announcements?page=1&limit=20
export async function GET(request: NextRequest) {
    try {
        const { serviceClient } = await requireAdmin()
        const { searchParams } = request.nextUrl
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
        const from = (page - 1) * limit
        const to = from + limit - 1

        const { data, count, error } = await serviceClient
            .from('announcements')
            .select('*, author:profiles!author_id(id, full_name, username)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to)

        if (error) return Response.json({ error: error.message }, { status: 500 })

        return Response.json({ data, total: count, page, limit })
    } catch (err) {
        return adminError(err)
    }
}

// POST /api/admin/announcements — Create announcement
export async function POST(request: NextRequest) {
    try {
        const { adminId, serviceClient } = await requireAdmin()
        const { title, content, priority } = await request.json()

        if (!title?.trim() || !content?.trim()) {
            return Response.json({ error: 'Title and content are required' }, { status: 400 })
        }
        if (priority && !['low', 'normal', 'high', 'urgent'].includes(priority)) {
            return Response.json({ error: 'Invalid priority' }, { status: 400 })
        }

        const { data, error } = await serviceClient
            .from('announcements')
            .insert({
                title: title.trim(),
                content: content.trim(),
                author_id: adminId,
                priority: priority || 'normal',
            })
            .select('*, author:profiles!author_id(id, full_name, username)')
            .single()

        if (error) return Response.json({ error: error.message }, { status: 500 })
        return Response.json({ data }, { status: 201 })
    } catch (err) {
        return adminError(err)
    }
}

// PATCH /api/admin/announcements — Edit announcement
export async function PATCH(request: NextRequest) {
    try {
        const { serviceClient } = await requireAdmin()
        const { announcementId, ...updates } = await request.json()

        if (!announcementId) {
            return Response.json({ error: 'announcementId is required' }, { status: 400 })
        }

        const allowed = ['title', 'content', 'priority', 'is_active']
        const filtered: Record<string, unknown> = {}
        for (const key of allowed) {
            if (key in updates) {
                if (key === 'title' || key === 'content') {
                    if (typeof updates[key] !== 'string' || !updates[key].trim()) continue
                    filtered[key] = updates[key].trim()
                } else if (key === 'priority') {
                    if (!['low', 'normal', 'high', 'urgent'].includes(updates[key])) continue
                    filtered[key] = updates[key]
                } else {
                    filtered[key] = updates[key]
                }
            }
        }

        const { data, error } = await serviceClient
            .from('announcements')
            .update(filtered)
            .eq('id', announcementId)
            .select('*, author:profiles!author_id(id, full_name, username)')
            .single()

        if (error) return Response.json({ error: error.message }, { status: 500 })
        return Response.json({ data })
    } catch (err) {
        return adminError(err)
    }
}

// DELETE /api/admin/announcements?id=<announcementId>
export async function DELETE(request: NextRequest) {
    try {
        const { serviceClient } = await requireAdmin()
        const id = request.nextUrl.searchParams.get('id')

        if (!id) {
            return Response.json({ error: 'Announcement ID is required' }, { status: 400 })
        }

        const { error } = await serviceClient.from('announcements').delete().eq('id', id)
        if (error) return Response.json({ error: error.message }, { status: 500 })

        return Response.json({ success: true })
    } catch (err) {
        return adminError(err)
    }
}
