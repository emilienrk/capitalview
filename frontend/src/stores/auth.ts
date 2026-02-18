import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import type { User, TokenResponse, LoginRequest, RegisterRequest } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isAuthenticated = ref(false)
  const isInitialized = ref(false)

  const loginForm = ref({ email: '', password: '' })
  const registerForm = ref({ username: '', email: '', password: '' })
  const isRegisterMode = ref(false)


  function setToken(token: string | null) {
    accessToken.value = token
    apiClient.setToken(token)
  }

  function clearSession() {
    accessToken.value = null
    user.value = null
    apiClient.setToken(null)
  }

  function resetForms() {
    loginForm.value = { email: '', password: '' }
    registerForm.value = { username: '', email: '', password: '' }
    error.value = null
  }

  async function login(credentials?: LoginRequest): Promise<boolean> {
    isLoading.value = true
    error.value = null

    const creds = credentials || {
      email: loginForm.value.email,
      password: loginForm.value.password,
    }

    try {
      const response = await apiClient.post<TokenResponse>('/auth/login', creds)
      setToken(response.access_token)
      user.value = await apiClient.get<User>('/auth/me')
      resetForms()
      isAuthenticated.value = true
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Login failed'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function register(data?: RegisterRequest): Promise<boolean> {
    isLoading.value = true
    error.value = null

    const registerData = data || {
      username: registerForm.value.username,
      email: registerForm.value.email,
      password: registerForm.value.password,
    }

    try {
      const response = await apiClient.post<TokenResponse>('/auth/register', registerData)
      setToken(response.access_token)
      isAuthenticated.value = true
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Registration failed'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function submitForm(router: ReturnType<typeof useRouter>): Promise<void> {
    if (isRegisterMode.value) {
      const success = await register()
      if (success) {
        await login({
          email: registerForm.value.email,
          password: registerForm.value.password,
        })
        router.push('/')
      }
    } else {
      const success = await login()
      if (success) {
        router.push('/')
      }
    }
  }

  async function refreshToken(): Promise<boolean> {
    try {
      const response = await apiClient.post<TokenResponse>('/auth/refresh')
      setToken(response.access_token)
      return true
    } catch {
      clearSession()
      return false
    }
  }

  async function checkAuth(): Promise<void> {
    if (isInitialized.value) return

    try {
      const response = await apiClient.post<TokenResponse>('/auth/refresh')
      setToken(response.access_token)

      isAuthenticated.value = true

      apiClient.get<User>('/auth/me').then((u) => {
        user.value = u
      }).catch(() => {
      })
    } catch {
      clearSession()
      isAuthenticated.value = false
    } finally {
      isInitialized.value = true
    }
  }

  async function logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } catch (e) {
      console.error('Logout error:', e)
    } finally {
      clearSession()
    }
  }

  return {
    user,
    accessToken,
    isLoading,
    error,
    isAuthenticated,
    loginForm,
    registerForm,
    isRegisterMode,
    isInitialized,
    resetForms,
    login,
    register,
    submitForm,
    refreshToken,
    checkAuth,
    logout
  }
})
