/**
 * Request deduplication utility to prevent duplicate API calls
 * Uses in-memory Map with TTL to track ongoing requests
 */

interface PendingRequest {
  promise: Promise<any>
  timestamp: number
}

// Store pending requests with TTL (5 seconds)
const pendingRequests = new Map<string, PendingRequest>()
const REQUEST_TTL = 5000 // 5 seconds

/**
 * Deduplicate identical requests within a short time window
 * @param key Unique key for the request (e.g., API endpoint + params)
 * @param requestFn Function that makes the actual API call
 * @returns Promise that resolves to the API response
 */
export async function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  // Clean up expired requests first
  const now = Date.now()
  const expiredKeys: string[] = []
  
  pendingRequests.forEach((request, requestKey) => {
    if (now - request.timestamp > REQUEST_TTL) {
      expiredKeys.push(requestKey)
    }
  })
  
  expiredKeys.forEach(key => {
    pendingRequests.delete(key)
  })

  // Check if this request is already pending
  const existingRequest = pendingRequests.get(key)
  if (existingRequest) {
    console.log('🔄 Deduplicating request:', key)
    return existingRequest.promise
  }

  // Create new request
  console.log('🚀 New request:', key)
  const promise = requestFn()
    .finally(() => {
      // Remove from pending requests when completed
      pendingRequests.delete(key)
    })

  // Store the pending request
  pendingRequests.set(key, {
    promise,
    timestamp: now
  })

  return promise
}

/**
 * Create a unique key for API requests
 * @param endpoint API endpoint
 * @param params Request parameters
 * @returns Unique string key
 */
export function createRequestKey(
  endpoint: string,
  params: Record<string, any> = {}
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')
  
  return `${endpoint}?${sortedParams}`
}

/**
 * Clear all pending requests (useful for cleanup)
 */
export function clearPendingRequests(): void {
  pendingRequests.clear()
}
