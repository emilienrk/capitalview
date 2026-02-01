<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div>
    <!-- Navigation menu (only if authenticated) -->
    <nav v-if="auth.isAuthenticated" style="padding: 1rem; border-bottom: 1px solid #ccc;">
      <span>{{ auth.user?.username }}</span> | 
      <router-link to="/">Dashboard</router-link> | 
      <router-link to="/compte-courant">Compte Courant</router-link> | 
      <router-link to="/pea">PEA</router-link> | 
      <router-link to="/compte-titre">Compte Titre</router-link> | 
      <router-link to="/patrimoine">Patrimoine</router-link> | 
      <router-link to="/crypto">Crypto</router-link> | 
      <router-link to="/autres-investissements">Autres</router-link> | 
      <router-link to="/notes">Notes</router-link> | 
      <button @click="handleLogout">Déconnexion</button>
    </nav>

    <!-- Page content -->
    <main style="padding: 1rem;">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
nav {
  display: flex;
  gap: 1rem;
  align-items: center;
}

nav a {
  text-decoration: none;
  color: #42b983;
}

nav a:hover {
  text-decoration: underline;
}

nav a.router-link-active {
  font-weight: bold;
}

button {
  cursor: pointer;
}
</style>
