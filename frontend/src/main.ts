import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './style.css'

import router from './router'
import App from './App.vue'

// Prevent pinch-zoom on iOS (native app feel)
document.addEventListener('gesturestart', (e) => e.preventDefault())
document.addEventListener('touchmove', (e: TouchEvent) => {
  if (e.touches.length > 1) e.preventDefault()
}, { passive: false })

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')
