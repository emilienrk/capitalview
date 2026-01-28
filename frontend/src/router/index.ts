import { createRouter, createWebHistory } from 'vue-router'

import Dashboard from '@/pages/Dashboard.vue'
import Pea from '@/pages/Pea.vue'
import CompteTitre from '@/pages/CompteTitre.vue'
import CompteCourant from '@/pages/CompteCourant.vue'
import Patrimoine from '@/pages/Patrimoine.vue'
import Crypto from '@/pages/Crypto.vue'
import AutresInvestissements from '@/pages/AutresInvestissements.vue'
import Notes from '@/pages/Notes.vue'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: Dashboard,
  },
  {
    path: '/compte-courant',
    name: 'compte-courant',
    component: CompteCourant,
  },
  {
    path: '/pea',
    name: 'pea',
    component: Pea,
  },
  {
    path: '/compte-titre',
    name: 'compte-titre',
    component: CompteTitre,
  },

  {
    path: '/patrimoine',
    name: 'patrimoine',
    omponent: Patrimoine,
  },
  {
    path: '/crypto',
    name: 'crypto',
    component: Crypto,
  },
  {
    path: '/autres-investissements',
    name: 'autres-investissements',
    component: AutresInvestissements,
  },
  {
    path: '/notes',
    name: 'notes',
    component: Notes,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
