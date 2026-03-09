// Two-tier cache: L1 = in-memory Map (instant), L2 = sessionStorage (persists across refresh)
const cache = new Map<string, { data: unknown; timestamp: number }>()
const STORAGE_PREFIX = 'unx_cache_'

function readStorage<T>(key: string): { data: T; timestamp: number } | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
        if (!raw) return null
        return JSON.parse(raw)
    } catch {
        return null
    }
}

function writeStorage(key: string, data: unknown, timestamp: number): void {
    if (typeof window === 'undefined') return
    try {
        sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ data, timestamp }))
    } catch {
        // sessionStorage full — silently ignore
    }
}

function removeStorage(key: string): void {
    if (typeof window === 'undefined') return
    try {
        sessionStorage.removeItem(STORAGE_PREFIX + key)
    } catch { /* ignore */ }
}

function getEntry(key: string): { data: unknown; timestamp: number } | null {
    return cache.get(key) ?? readStorage(key) ?? null
}

// Returns cached data if fresh (within maxAgeMs). Default 5 minutes.
export function getCached<T>(key: string, maxAgeMs = 300_000): T | null {
    const entry = getEntry(key)
    if (entry && Date.now() - entry.timestamp < maxAgeMs) {
        // Promote to L1 if only in L2
        if (!cache.has(key)) cache.set(key, entry)
        return entry.data as T
    }
    return null
}

// Returns cached data regardless of age — for instant display while revalidating
export function getStaleCache<T>(key: string): T | null {
    const entry = getEntry(key)
    if (entry) {
        if (!cache.has(key)) cache.set(key, entry)
        return entry.data as T
    }
    return null
}

// Check if cache exists and is still fresh (within maxAgeMs)
export function isCacheFresh(key: string, maxAgeMs = 60_000): boolean {
    const entry = getEntry(key)
    return !!entry && Date.now() - entry.timestamp < maxAgeMs
}

export function setCache(key: string, data: unknown): void {
    const timestamp = Date.now()
    cache.set(key, { data, timestamp })
    writeStorage(key, data, timestamp)
}

export function invalidateCache(key: string): void {
    cache.delete(key)
    removeStorage(key)
}
