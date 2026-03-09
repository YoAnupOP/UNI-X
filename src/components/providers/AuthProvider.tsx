'use client'

import { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/types'

const PROFILE_CACHE_KEY = 'unx_cached_profile'
const USER_CACHE_KEY = 'unx_cached_user'

function getCachedProfile(): Profile | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = localStorage.getItem(PROFILE_CACHE_KEY)
        return raw ? JSON.parse(raw) : null
    } catch { return null }
}

function getCachedUser(): User | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = localStorage.getItem(USER_CACHE_KEY)
        return raw ? JSON.parse(raw) : null
    } catch { return null }
}

function persistProfile(profile: Profile | null) {
    try {
        if (profile) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile))
        else localStorage.removeItem(PROFILE_CACHE_KEY)
    } catch { /* ignore */ }
}

function persistUser(user: User | null) {
    try {
        if (user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
        else localStorage.removeItem(USER_CACHE_KEY)
    } catch { /* ignore */ }
}

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
    // Start with null to match server render — hydrate from localStorage after mount
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()
    const profileFetchedRef = useRef<string | null>(null)
    const cacheHydratedRef = useRef(false)

    // Hydrate from localStorage before paint (avoids visible flash)
    useLayoutEffect(() => {
        const cachedUser = getCachedUser()
        const cachedProfile = getCachedProfile()
        if (cachedUser && cachedProfile) {
            setUser(cachedUser)
            setProfile(cachedProfile)
            setLoading(false)
            profileFetchedRef.current = cachedUser.id
            cacheHydratedRef.current = true
        }
    }, [])

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
            if (data) {
                setProfile(data as Profile)
                persistProfile(data as Profile)
            }
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
                persistUser(currentUser)

                if (currentUser) {
                    // If we already hydrated from cache for this user, revalidate in background
                    if (cacheHydratedRef.current && profileFetchedRef.current === currentUser.id) {
                        // Background revalidate — don't block rendering
                        profileFetchedRef.current = null
                        fetchProfile(currentUser.id)
                    } else {
                        await fetchProfile(currentUser.id)
                    }
                } else {
                    // User is not authenticated — clear cached data
                    setProfile(null)
                    persistProfile(null)
                    persistUser(null)
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
                persistUser(currentUser)
                if (currentUser) {
                    // Force re-fetch profile on sign-in or token refresh
                    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                        profileFetchedRef.current = null
                        await fetchProfile(currentUser.id)
                    }
                } else {
                    setProfile(null)
                    persistProfile(null)
                    persistUser(null)
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
        // Clear all client-side state immediately
        setUser(null)
        setProfile(null)
        persistProfile(null)
        persistUser(null)
        profileFetchedRef.current = null
        try { localStorage.clear() } catch { /* ignore */ }
        try { sessionStorage.clear() } catch { /* ignore */ }

        // Sign out server-side — this clears the httpOnly Supabase SSR cookies
        // in the response so middleware won't see a valid session on redirect
        try {
            await fetch('/api/auth/signout', { method: 'POST' })
        } catch (e) {
            console.error('Sign out error:', e)
        }

        // Hard redirect to login (cookies are already cleared server-side)
        window.location.href = '/login'
    }, [])

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    )
}
