import { NextRequest } from 'next/server'
import { requireAdmin, adminError } from '@/lib/admin'

// GET /api/admin/moderation?type=post|comment|wall&q=&page=1&limit=20
export async function GET(request: NextRequest) {
    try {
        const { serviceClient } = await requireAdmin()
        const { searchParams } = request.nextUrl
        const type = searchParams.get('type') || 'post'
        const q = searchParams.get('q') || ''
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
        const from = (page - 1) * limit
        const to = from + limit - 1

        if (type === 'post') {
            let query = serviceClient
                .from('posts')
                .select('*, author:profiles!author_id(id, full_name, username, avatar_url)', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(from, to)

            if (q) query = query.ilike('content', `%${q}%`)

            const { data, count, error } = await query
            if (error) return Response.json({ error: error.message }, { status: 500 })
            return Response.json({ data, total: count, page, limit, type })
        }

        if (type === 'comment') {
            let query = serviceClient
                .from('comments')
                .select('*, author:profiles!author_id(id, full_name, username, avatar_url), post:posts(id, content)', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(from, to)

            if (q) query = query.ilike('content', `%${q}%`)

            const { data, count, error } = await query
            if (error) return Response.json({ error: error.message }, { status: 500 })
            return Response.json({ data, total: count, page, limit, type })
        }

        if (type === 'wall') {
            let query = serviceClient
                .from('wall_posts')
                .select('*, author:profiles!author_id(id, full_name, username, avatar_url)', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(from, to)

            if (q) query = query.ilike('content', `%${q}%`)

            const { data, count, error } = await query
            if (error) return Response.json({ error: error.message }, { status: 500 })
            return Response.json({ data, total: count, page, limit, type })
        }

        return Response.json({ error: 'Invalid type. Use: post, comment, or wall' }, { status: 400 })
    } catch (err) {
        return adminError(err)
    }
}

// DELETE /api/admin/moderation?type=post|comment|wall&id=<id>
export async function DELETE(request: NextRequest) {
    try {
        const { serviceClient } = await requireAdmin()
        const type = request.nextUrl.searchParams.get('type')
        const id = request.nextUrl.searchParams.get('id')

        if (!type || !id) {
            return Response.json({ error: 'type and id are required' }, { status: 400 })
        }

        const tableMap: Record<string, string> = {
            post: 'posts',
            comment: 'comments',
            wall: 'wall_posts',
        }

        const table = tableMap[type]
        if (!table) {
            return Response.json({ error: 'Invalid type. Use: post, comment, or wall' }, { status: 400 })
        }

        const { error } = await serviceClient.from(table).delete().eq('id', id)
        if (error) return Response.json({ error: error.message }, { status: 500 })

        return Response.json({ success: true })
    } catch (err) {
        return adminError(err)
    }
}
