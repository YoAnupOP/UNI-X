'use client'

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { fetchJson } from '@/lib/query/fetch-json'
import type { ViewerState } from '@/lib/server/viewer'

interface AuthContextType {
    user: User | null
    profile: Profile | null
    loading: boolean
    signOut: () => Promise<void>
    refreshProfile: () => Promise<void>
}

interface AuthProviderProps {
    children: ReactNode
    initialUser: User | null
    initialProfile: Profile | null
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: false,
    signOut: async () => { },
    refreshProfile: async () => { },
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children, initialUser, initialProfile }: AuthProviderProps) {
    const router = useRouter()
    const supabase = createClient()
    const [user, setUser] = useState<User | null>(() => initialUser)
    const [profile, setProfile] = useState<Profile | null>(() => initialProfile)

    const refreshProfile = useCallback(async () => {
        try {
            const viewer = await fetchJson<ViewerState>('/api/me', { cache: 'no-store' })
            setUser(viewer.user)
            setProfile(viewer.profile)
            router.refresh()
        } catch (error) {
            console.error('Profile refresh error:', error)
        }
    }, [router])

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'INITIAL_SESSION') return

                const nextUser = session?.user ?? null
                setUser(nextUser)

                if (!nextUser) {
                    setProfile(null)
                    router.refresh()
                    return
                }

                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                    await refreshProfile()
                }
            }
        )

        return () => {
            subscription.unsubscribe()
        }
    }, [supabase, refreshProfile, router])

    const signOut = useCallback(async () => {
        setUser(null)
        setProfile(null)

        try {
            await fetch('/api/auth/signout', { method: 'POST' })
        } catch (error) {
            console.error('Sign out error:', error)
        }

        router.replace('/login')
        router.refresh()
    }, [router])

    return (
        <AuthContext.Provider value={{ user, profile, loading: false, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

