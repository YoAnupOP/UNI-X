import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Verifies the current user is an admin. Returns the service role client for admin operations.
 * Throws an object with { status, message } if unauthorized.
 */
export async function requireAdmin() {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        throw { status: 401, message: 'Not authenticated' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        throw { status: 403, message: 'Admin access required' }
    }

    const serviceClient = await createServiceRoleClient()

    return {
        adminId: user.id,
        serviceClient,
    }
}

/** Standard error response helper for admin API routes */
export function adminError(err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && 'message' in err) {
        const e = err as { status: number; message: string }
        return Response.json({ error: e.message }, { status: e.status })
    }
    console.error('Admin API error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
}
