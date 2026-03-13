import { revalidateTag } from 'next/cache'
import { NextRequest } from 'next/server'
import { requireAdmin, adminError } from '@/lib/admin'
import { CACHE_TAGS } from '@/lib/server/cache-tags'

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

        if (type === 'post') {
            const { error } = await serviceClient.from('posts').delete().eq('id', id)
            if (error) return Response.json({ error: error.message }, { status: 500 })

            revalidateTag(CACHE_TAGS.feedPosts, 'max')
            return Response.json({ success: true })
        }

        if (type === 'comment') {
            const { data: comment, error: commentError } = await serviceClient
                .from('comments')
                .select('post_id')
                .eq('id', id)
                .maybeSingle()

            if (commentError) {
                return Response.json({ error: commentError.message }, { status: 500 })
            }

            const { error: deleteError } = await serviceClient.from('comments').delete().eq('id', id)
            if (deleteError) {
                return Response.json({ error: deleteError.message }, { status: 500 })
            }

            if (comment?.post_id) {
                const { count } = await serviceClient
                    .from('comments')
                    .select('*', { count: 'exact', head: true })
                    .eq('post_id', comment.post_id)

                await serviceClient
                    .from('posts')
                    .update({ comments_count: count ?? 0 })
                    .eq('id', comment.post_id)
            }

            revalidateTag(CACHE_TAGS.feedPosts, 'max')
            return Response.json({ success: true })
        }

        if (type === 'wall') {
            const { error } = await serviceClient.from('wall_posts').delete().eq('id', id)
            if (error) return Response.json({ error: error.message }, { status: 500 })

            return Response.json({ success: true })
        }

        return Response.json({ error: 'Invalid type. Use: post, comment, or wall' }, { status: 400 })
    } catch (err) {
        return adminError(err)
    }
}
