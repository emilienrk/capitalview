import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import Dashboard from '@/pages/Dashboard.vue'
import Landing from '@/pages/Landing.vue'
import Login from '@/pages/Login.vue'
import StockMarket from '@/pages/StockMarket.vue'
import Cashflow from '@/pages/Cashflow.vue'
import BankAccounts from '@/pages/BankAccounts.vue'
import Wealth from '@/pages/Wealth.vue'
import Crypto from '@/pages/Crypto.vue'
import OtherInvestments from '@/pages/OtherInvestments.vue'
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
    path: '/bank-accounts',
    name: 'bank-accounts',
    component: BankAccounts,
    meta: { requiresAuth: true },
  },
  {
    path: '/cashflow',
    name: 'cashflow',
    component: Cashflow,
    meta: { requiresAuth: true },
  },
  {
    path: '/stock-market',
    name: 'stock-market',
    component: StockMarket,
    meta: { requiresAuth: true },
  },

  {
    path: '/wealth',
    name: 'wealth',
    component: Wealth,
    meta: { requiresAuth: true },
  },
  {
    path: '/crypto',
    name: 'crypto',
    component: Crypto,
    meta: { requiresAuth: true },
  },
  {
    path: '/other-investments',
    name: 'other-investments',
    component: OtherInvestments,
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

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.isInitialized && !auth.isAuthenticated) {
    await auth.checkAuth()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if ((to.name === 'login' || to.name === 'register') && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

export default router
