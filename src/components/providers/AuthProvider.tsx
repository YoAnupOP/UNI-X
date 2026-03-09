'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/types'

interface AuthContextType {
    user: User | null
    profile: Profile | null
    loading: boolean
    signOut: () => Promise<void>
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
    refreshProfile: async () => { },
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()
    const router = useRouter()
    const profileFetchedRef = useRef<string | null>(null)

    const fetchProfile = useCallback(async (userId: string) => {
        // Skip if we already fetched for this user (avoids duplicate calls)
        if (profileFetchedRef.current === userId) return
        profileFetchedRef.current = userId
        try {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()
            if (data) setProfile(data as Profile)
        } catch (e) {
            console.error('Profile fetch error:', e)
        }
    }, [supabase])

    const refreshProfile = useCallback(async () => {
        if (user?.id) {
            profileFetchedRef.current = null // force re-fetch
            await fetchProfile(user.id)
        }
    }, [user?.id, fetchProfile])

    useEffect(() => {
        let mounted = true

        // getSession() reads from stored session (fast, uses local cache)
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (!mounted) return
                const currentUser = session?.user ?? null
                setUser(currentUser)
                if (currentUser) {
                    await fetchProfile(currentUser.id)
                }
            } catch (e) {
                console.error('Auth session error:', e)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        initAuth()

        // Listen for auth changes (sign in, sign out, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return
                // Skip INITIAL_SESSION since initAuth handles it
                if (event === 'INITIAL_SESSION') return

                const currentUser = session?.user ?? null
                setUser(currentUser)
                if (currentUser) {
                    // Force re-fetch profile on sign-in or token refresh
                    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                        profileFetchedRef.current = null
                        await fetchProfile(currentUser.id)
                    }
                } else {
                    setProfile(null)
                    profileFetchedRef.current = null
                }
                setLoading(false)
            }
        )

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [supabase, fetchProfile])

    const signOut = useCallback(async () => {
        try {
            await supabase.auth.signOut()
        } catch (e) {
            console.error('Sign out error:', e)
        }
        setUser(null)
        setProfile(null)
        profileFetchedRef.current = null
        // Clear the profile_completed cookie
        document.cookie = 'profile_completed=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        router.push('/login')
    }, [supabase, router])

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    )
}
