const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  const { hostname, protocol } = window.location
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000'
  }

  return `${protocol}//api.${hostname}`
}

const API_BASE_URL = getApiBaseUrl()

let onSessionExpired: (() => void) | null = null

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler
}

class ApiClient {
  private accessToken: string | null = null
  private refreshPromise: Promise<string | null> | null = null

  setToken(token: string | null) {
    this.accessToken = token
  }

  getToken(): string | null {
    return this.accessToken
  }

  private async tryRefresh(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise

    this.refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json()
          this.setToken(data.access_token)
          return data.access_token as string
        }
        this.setToken(null)
        onSessionExpired?.()
        return null
      })
      .catch(() => {
        this.setToken(null)
        onSessionExpired?.()
        return null
      })
      .finally(() => {
        this.refreshPromise = null
      })

    return this.refreshPromise
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.accessToken) {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`
    }

    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    })

    if (response.status === 401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
      const newToken = await this.tryRefresh()

      if (newToken) {
        ;(headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        })
      } else {
        throw new Error('Session expired')
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      const detail = error.detail || `HTTP ${response.status}`

      // Master Key missing → session incomplete, redirect to login
      if (
        response.status === 400 &&
        typeof detail === 'string' &&
        detail.toLowerCase().includes('master key')
      ) {
        this.setToken(null)
        window.location.href = '/login'
        throw new Error(detail)
      }

      throw new Error(detail)
    }

    if (response.status === 204) {
      return {} as T
    }

    return response.json()
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async delete(endpoint: string): Promise<void> {
    await this.request(endpoint, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()