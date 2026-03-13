'use client'

import { ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/types'
import { QueryProvider } from './QueryProvider'
import { AuthProvider } from './AuthProvider'

interface AppProvidersProps {
    children: ReactNode
    initialUser: User | null
    initialProfile: Profile | null
}

export function AppProviders({ children, initialUser, initialProfile }: AppProvidersProps) {
    return (
        <QueryProvider>
            <AuthProvider initialUser={initialUser} initialProfile={initialProfile}>
                {children}
            </AuthProvider>
        </QueryProvider>
    )
}

