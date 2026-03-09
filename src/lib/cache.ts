// In-memory cache with stale-while-revalidate strategy for seamless navigation
const cache = new Map<string, { data: unknown; timestamp: number }>()

// Returns cached data if fresh (within maxAgeMs). Default 5 minutes.
export function getCached<T>(key: string, maxAgeMs = 300_000): T | null {
    const entry = cache.get(key)
    if (entry && Date.now() - entry.timestamp < maxAgeMs) {
        return entry.data as T
    }
    return null
}

// Returns cached data regardless of age — for instant display while revalidating
export function getStaleCache<T>(key: string): T | null {
    const entry = cache.get(key)
    return entry ? (entry.data as T) : null
}

// Check if cache exists and is still fresh (within maxAgeMs)
export function isCacheFresh(key: string, maxAgeMs = 60_000): boolean {
    const entry = cache.get(key)
    return !!entry && Date.now() - entry.timestamp < maxAgeMs
}

export function setCache(key: string, data: unknown): void {
    cache.set(key, { data, timestamp: Date.now() })
}

export function invalidateCache(key: string): void {
    cache.delete(key)
}
