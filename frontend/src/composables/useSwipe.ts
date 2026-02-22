import { ref, onMounted, onUnmounted } from 'vue'

interface UseSwipeOptions {
  /** Callback when user swipes right */
  onSwipeRight?: () => void
  /** Callback when user swipes left */
  onSwipeLeft?: () => void
  /** Min horizontal distance (px) to trigger swipe – default 50 */
  threshold?: number
  /** Max vertical drift allowed (px) – prevents triggering during scroll – default 80 */
  maxVerticalDrift?: number
  /**
   * Minimum X position (px) where the touch must start.
   * Set > 0 to avoid conflicting with Safari's back-gesture (edge ~0-15px).
   * Default: 15
   */
  edgeMin?: number
  /**
   * Maximum X position (px) where the touch must start for swipe-right detection.
   * Limits detection to a left-edge zone so normal content interactions aren't hijacked.
   * Default: 100
   */
  edgeMax?: number
  /**
   * Max viewport width (px) for which swipe is active.
   * Above this width, swipe gestures are ignored (desktop sidebar always visible).
   * Default: 1024 (matches Tailwind `lg` breakpoint)
   */
  maxWidth?: number
}

export function useSwipe(options: UseSwipeOptions = {}) {
  const {
    onSwipeRight,
    onSwipeLeft,
    threshold = 50,
    maxVerticalDrift = 80,
    edgeMin = 15,
    edgeMax = 100,
    maxWidth = 1024,
  } = options

  const isSwiping = ref(false)
  let startX = 0
  let startY = 0
  let tracking = false

  function handleTouchStart(e: TouchEvent): void {
    // Ignore on wide viewports where the desktop sidebar is always visible
    if (window.innerWidth >= maxWidth) {
      tracking = false
      return
    }

    const touch = e.touches[0]
    if (!touch) return
    startX = touch.clientX
    startY = touch.clientY
    tracking = true
    isSwiping.value = false
  }

  function handleTouchMove(e: TouchEvent): void {
    if (!tracking) return

    const touch = e.touches[0]
    if (!touch) return
    const deltaX = touch.clientX - startX
    const deltaY = Math.abs(touch.clientY - startY)

    if (deltaY > maxVerticalDrift) {
      tracking = false
      return
    }

    if (Math.abs(deltaX) > 10) {
      isSwiping.value = true
    }
  }

  function handleTouchEnd(e: TouchEvent): void {
    if (!tracking) return
    tracking = false

    const touch = e.changedTouches[0]
    if (!touch) return
    const deltaX = touch.clientX - startX
    const deltaY = Math.abs(touch.clientY - startY)

    if (deltaY > maxVerticalDrift) {
      isSwiping.value = false
      return
    }

    if (deltaX > threshold && startX >= edgeMin && startX <= edgeMax && onSwipeRight) {
      onSwipeRight()
    }

    if (deltaX < -threshold && onSwipeLeft) {
      onSwipeLeft()
    }

    isSwiping.value = false
  }

  onMounted(() => {
    // Only add listeners if touch is supported (mobile/tablet)
    if (!('ontouchstart' in window)) return

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    document.removeEventListener('touchstart', handleTouchStart)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
  })

  return { isSwiping }
}
