import { ref } from 'vue'

const STORAGE_KEY = 'privacy_mode'

const privacyMode = ref<boolean>(localStorage.getItem(STORAGE_KEY) === 'true')

export function usePrivacyMode() {
  function togglePrivacyMode(): void {
    privacyMode.value = !privacyMode.value
    localStorage.setItem(STORAGE_KEY, String(privacyMode.value))
  }

  function maskValue(formatted: string): string {
    return privacyMode.value ? '••••••' : formatted
  }

  return { privacyMode, togglePrivacyMode, maskValue }
}
