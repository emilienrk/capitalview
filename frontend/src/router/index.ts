import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import Dashboard from '@/pages/Dashboard.vue'
import Landing from '@/pages/Landing.vue'
import Login from '@/pages/Login.vue'
import ThemeTest from '@/pages/ThemeTest.vue'
import Pea from '@/pages/Pea.vue'
import CompteTitre from '@/pages/CompteTitre.vue'
import CompteCourant from '@/pages/CompteCourant.vue'
import Patrimoine from '@/pages/Patrimoine.vue'
import Crypto from '@/pages/Crypto.vue'
import AutresInvestissements from '@/pages/AutresInvestissements.vue'
import Notes from '@/pages/Notes.vue'
import Settings from '@/pages/Settings.vue'
import Register from '@/pages/Register.vue'

const routes = [
  {
    path: '/',
    name: 'landing',
    component: Landing,
    meta: { requiresAuth: false, layout: 'blank' },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: Dashboard,
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: { requiresAuth: false, layout: 'blank' },
  },
  {
    path: '/register',
    name: 'register',
    component: Register,
    meta: { requiresAuth: false, layout: 'blank' },
  },
  {
    path: '/theme-test',
    name: 'theme-test',
    component: ThemeTest,
    meta: { requiresAuth: false, layout: 'blank' },
  },
  {
    path: '/compte-courant',
    name: 'compte-courant',
    component: CompteCourant,
    meta: { requiresAuth: true },
  },
  {
    path: '/pea',
    name: 'pea',
    component: Pea,
    meta: { requiresAuth: true },
  },
  {
    path: '/compte-titre',
    name: 'compte-titre',
    component: CompteTitre,
    meta: { requiresAuth: true },
  },

  {
    path: '/patrimoine',
    name: 'patrimoine',
    component: Patrimoine,
    meta: { requiresAuth: true },
  },
  {
    path: '/crypto',
    name: 'crypto',
    component: Crypto,
    meta: { requiresAuth: true },
  },
  {
    path: '/autres-investissements',
    name: 'autres-investissements',
    component: AutresInvestissements,
    meta: { requiresAuth: true },
  },
  {
    path: '/notes',
    name: 'notes',
    component: Notes,
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings,
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } 
  else if ((to.name === 'login' || to.name === 'register') && auth.isAuthenticated) {
    next({ name: 'dashboard' })
  }
  else {
    next()
  }
})

export default router
