'use client'

import { useState, useEffect, useLayoutEffect, useCallback, useRef, type Dispatch, type SetStateAction } from 'react'
import { getStaleCache, setCache, isCacheFresh } from './cache'

export interface CachedQueryResult<T> {
    /** Currently available data (stale cache or fresh). Starts as initialData. */
    data: T
    /** Update data locally (for optimistic updates, real-time, etc.) */
    setData: Dispatch<SetStateAction<T>>
    /** True only when NO data is available — show skeleton/placeholder */
    isLoading: boolean
    /** True when a network request is in-flight (data may still be visible) */
    isFetching: boolean
    /** Re-fetch data. Pass true to bypass freshness check. */
    refresh: (force?: boolean) => Promise<void>
}

/**
 * Stale-while-revalidate data hook with two-tier cache support.
 *
 * - Hydrates instantly from cache before first paint (no flash)
 * - Shows skeleton (isLoading) only on first-ever load with empty cache
 * - Background refreshes never cause skeleton to reappear
 * - Supports optimistic updates via setData
 * - Handles dynamic cache keys (e.g. per-category)
 */
export function useCachedQuery<T>(
    key: string,
    fetcher: () => Promise<T | null>,
    initialData: T,
    options: { enabled?: boolean; maxAge?: number } = {},
): CachedQueryResult<T> {
    const { enabled = true, maxAge = 60_000 } = options

    const [data, setData] = useState<T>(initialData)
    const [isLoading, setIsLoading] = useState(true)
    const [isFetching, setIsFetching] = useState(false)

    // Refs for latest values (avoid stale closures in async operations)
    const fetcherRef = useRef(fetcher)
    fetcherRef.current = fetcher
    const keyRef = useRef(key)
    keyRef.current = key
    const initialDataRef = useRef(initialData)

    // Hydrate from stale cache synchronously before first paint
    useLayoutEffect(() => {
        const cached = getStaleCache<T>(key)
        if (cached != null) {
            setData(cached)
            setIsLoading(false)
        } else {
            setData(initialDataRef.current)
            setIsLoading(true)
        }
    }, [key])

    const refresh = useCallback(async (force = false) => {
        const currentKey = key
        if (!force && isCacheFresh(currentKey, maxAge)) {
            setIsLoading(false)
            return
        }
        setIsFetching(true)
        try {
            const result = await fetcherRef.current()
            // Only apply if key hasn't changed during async operation
            if (keyRef.current === currentKey && result != null) {
                setData(result)
                setCache(currentKey, result)
            }
        } catch (e) {
            console.error(`Failed to fetch "${currentKey}":`, e)
        } finally {
            if (keyRef.current === currentKey) {
                setIsLoading(false)
                setIsFetching(false)
            }
        }
    }, [key, maxAge])

    // Auto-fetch when enabled becomes true or key/maxAge change
    useEffect(() => {
        if (enabled) refresh()
    }, [enabled, refresh])

    return { data, setData, isLoading, isFetching, refresh }
}
