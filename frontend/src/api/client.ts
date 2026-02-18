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

class ApiClient {
  private accessToken: string | null = null

  setToken(token: string | null) {
    this.accessToken = token
  }

  getToken(): string | null {
    return this.accessToken
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
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })

        if (refreshResponse.ok) {
          const data = await refreshResponse.json()
          const newAccessToken = data.access_token

          this.setToken(newAccessToken)

          ;(headers as Record<string, string>)['Authorization'] = `Bearer ${newAccessToken}`

          response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include',
          })
        } else {
          this.setToken(null)
          window.location.href = '/login'
          throw new Error('Session expired')
        }
      } catch (error) {
        this.setToken(null)
        window.location.href = '/login'
        throw error
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