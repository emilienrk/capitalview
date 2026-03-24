interface CacheEntry<T> {
  value: T
  fetchedAt: number
  ttlMs: number
}

const cacheStore = new Map<string, CacheEntry<unknown>>()
const inFlightStore = new Map<string, Promise<unknown>>()

function isFresh(entry: CacheEntry<unknown>): boolean {
  return Date.now() - entry.fetchedAt < entry.ttlMs
}

export function getCachedValue<T>(key: string): T | null {
  const entry = cacheStore.get(key)
  if (!entry) return null
  if (!isFresh(entry)) {
    cacheStore.delete(key)
    return null
  }
  return entry.value as T
}

export function isCacheEntryValid(key: string): boolean {
  const entry = cacheStore.get(key)
  if (!entry) return false
  if (!isFresh(entry)) {
    cacheStore.delete(key)
    return false
  }
  return true
}

export async function getOrFetchCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
  force = false,
): Promise<T> {
  if (!force) {
    const cached = getCachedValue<T>(key)
    if (cached !== null) return cached
  }

  const existingInFlight = inFlightStore.get(key)
  if (existingInFlight) {
    return existingInFlight as Promise<T>
  }

  const request = fetcher()
    .then((value) => {
      cacheStore.set(key, {
        value,
        fetchedAt: Date.now(),
        ttlMs,
      })
      return value
    })
    .finally(() => {
      // Only remove if this request is still the one registered for this key.
      if (inFlightStore.get(key) === request) {
        inFlightStore.delete(key)
      }
    })

  inFlightStore.set(key, request as Promise<unknown>)
  return request
}

export function invalidateCacheKey(key: string): void {
  cacheStore.delete(key)
  inFlightStore.delete(key)
}

export function invalidateCachePrefix(prefix: string): void {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) cacheStore.delete(key)
  }
  for (const key of inFlightStore.keys()) {
    if (key.startsWith(prefix)) inFlightStore.delete(key)
  }
}

export function clearCache(): void {
  cacheStore.clear()
  inFlightStore.clear()
}

const GC_INTERVAL_MS = 5 * 60 * 1000 // Cleanup every 5 minutes

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of cacheStore.entries()) {
    if (now - entry.fetchedAt >= entry.ttlMs) {
      cacheStore.delete(key)
    }
  }
}, GC_INTERVAL_MS)
