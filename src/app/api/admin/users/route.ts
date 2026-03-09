import { NextRequest } from 'next/server'
import { requireAdmin, adminError } from '@/lib/admin'

// GET /api/admin/users?q=&role=&page=1&limit=20
export async function GET(request: NextRequest) {
    try {
        const { serviceClient } = await requireAdmin()
        const { searchParams } = request.nextUrl
        const q = searchParams.get('q') || ''
        const role = searchParams.get('role') || ''
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
        const from = (page - 1) * limit
        const to = from + limit - 1

        let query = serviceClient
            .from('profiles')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to)

        if (q) {
            query = query.or(`full_name.ilike.%${q}%,username.ilike.%${q}%,email.ilike.%${q}%`)
        }
        if (role && ['student', 'admin', 'moderator'].includes(role)) {
            query = query.eq('role', role)
        }

        const { data, count, error } = await query
        if (error) return Response.json({ error: error.message }, { status: 500 })

        return Response.json({ data, total: count, page, limit })
    } catch (err) {
        return adminError(err)
    }
}

// PATCH /api/admin/users — Update user role
export async function PATCH(request: NextRequest) {
    try {
        const { adminId, serviceClient } = await requireAdmin()
        const { userId, role } = await request.json()

        if (!userId || !role) {
            return Response.json({ error: 'userId and role are required' }, { status: 400 })
        }
        if (!['student', 'admin', 'moderator'].includes(role)) {
            return Response.json({ error: 'Invalid role' }, { status: 400 })
        }
        // Prevent admin from demoting themselves
        if (userId === adminId) {
            return Response.json({ error: 'Cannot change your own role' }, { status: 400 })
        }

        const { data, error } = await serviceClient
            .from('profiles')
            .update({ role, updated_at: new Date().toISOString() })
            .eq('id', userId)
            .select()
            .single()

        if (error) return Response.json({ error: error.message }, { status: 500 })
        return Response.json({ data })
    } catch (err) {
        return adminError(err)
    }
}

// DELETE /api/admin/users?id=<userId>
export async function DELETE(request: NextRequest) {
    try {
        const { adminId, serviceClient } = await requireAdmin()
        const userId = request.nextUrl.searchParams.get('id')

        if (!userId) {
            return Response.json({ error: 'User ID is required' }, { status: 400 })
        }
        if (userId === adminId) {
            return Response.json({ error: 'Cannot delete your own account' }, { status: 400 })
        }

        // Delete from auth (cascades to profiles via FK)
        const { error } = await serviceClient.auth.admin.deleteUser(userId)
        if (error) return Response.json({ error: error.message }, { status: 500 })

        return Response.json({ success: true })
    } catch (err) {
        return adminError(err)
    }
}
