import { cache } from 'react'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/types'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface ViewerState {
    user: User | null
    profile: Profile | null
}

export const getViewer = cache(async (): Promise<ViewerState> => {
    const supabase = await createServerSupabaseClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { user: null, profile: null }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

    return {
        user,
        profile: (profile as Profile | null) ?? null,
    }
})

