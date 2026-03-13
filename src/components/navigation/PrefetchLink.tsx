'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { ComponentPropsWithoutRef, useRef } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { prefetchRouteData } from '@/lib/query/prefetch-route-data'

type PrefetchLinkProps = ComponentPropsWithoutRef<typeof Link>

export default function PrefetchLink({
    href,
    onMouseEnter,
    onFocus,
    onTouchStart,
    children,
    ...props
}: PrefetchLinkProps) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { user } = useAuth()
    const warmedRef = useRef(false)

    const warm = () => {
        if (warmedRef.current || typeof href !== 'string') return

        warmedRef.current = true
        router.prefetch(href)
        prefetchRouteData({ href, queryClient, user })
    }

    return (
        <Link
            href={href}
            onMouseEnter={(event) => {
                warm()
                onMouseEnter?.(event)
            }}
            onFocus={(event) => {
                warm()
                onFocus?.(event)
            }}
            onTouchStart={(event) => {
                warm()
                onTouchStart?.(event)
            }}
            {...props}
        >
            {children}
        </Link>
    )
}
