import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import type { User, TokenResponse, LoginRequest, RegisterRequest } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('access_token'))
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const loginForm = ref({
    email: '',
    password: '',
  })

  const registerForm = ref({
    username: '',
    email: '',
    password: '',
  })

  const isRegisterMode = ref(false)

  const isAuthenticated = computed(() => !!accessToken.value)

  if (accessToken.value) {
    apiClient.setToken(accessToken.value)
  }

  function toggleMode() {
    isRegisterMode.value = !isRegisterMode.value
    error.value = null
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
      accessToken.value = response.access_token
      localStorage.setItem('access_token', response.access_token)
      apiClient.setToken(response.access_token)
      await fetchUser()
      resetForms()
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
      await apiClient.post('/auth/register', registerData)
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
        // Auto-login after registration
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

  async function fetchUser(): Promise<void> {
    if (!accessToken.value) return

    try {
      user.value = await apiClient.get<User>('/auth/me')
    } catch (e) {
      // Token might be expired
      logout()
    }
  }

  async function refreshToken(): Promise<boolean> {
    try {
      const response = await apiClient.post<TokenResponse>('/auth/refresh')
      accessToken.value = response.access_token
      localStorage.setItem('access_token', response.access_token)
      apiClient.setToken(response.access_token)
      return true
    } catch {
      logout()
      return false
    }
  }

  async function logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // Ignore errors on logout
    } finally {
      accessToken.value = null
      user.value = null
      localStorage.removeItem('access_token')
      apiClient.setToken(null)
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
    toggleMode,
    resetForms,
    login,
    register,
    submitForm,
    fetchUser,
    refreshToken,
    logout,
  }
})
