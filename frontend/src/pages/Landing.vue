<script setup lang="ts">
import { ref, onMounted } from 'vue'

// --- Dark Mode Logic ---
const isDark = ref(false)
const showNavLogo = ref(false)
const heroTitleRef = ref<HTMLElement | null>(null)

onMounted(() => {
  // Check initial state
  isDark.value = document.documentElement.classList.contains('dark')

  // Observer pour le titre
  const heroElement = heroTitleRef.value
  if (heroElement) {
    const observer = new IntersectionObserver((entries) => {
      // Si le titre n'est plus visible (isIntersecting = false), on affiche le logo nav
      if (entries[0]) {
        showNavLogo.value = !entries[0].isIntersecting
      }
    }, { threshold: 0 })
    observer.observe(heroElement)
  }
})

function toggleDarkMode() {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.theme = 'dark'
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.theme = 'light'
  }
}

// --- State pour le formulaire de contact ---
const contactForm = ref({
  name: '',
  email: '',
  message: ''
})
const isSent = ref(false)

function submitContact() {
  // Simulation d'envoi
  isSent.value = true
  setTimeout(() => { isSent.value = false; contactForm.value = { name: '', email: '', message: '' } }, 3000)
}

// --- State pour l'Idea Box (Prototype) ---
const ideaText = ref('')
const ideas = ref<{id: number, text: string, type: 'feature' | 'invest'}[]>([
  { id: 1, text: "Ajouter un graphique en camembert pour la répartition crypto", type: 'feature' },
  { id: 2, text: "Surveiller l'action NVIDIA si elle passe sous les 800$", type: 'invest' }
])

function addIdea() {
  if (!ideaText.value) return
  ideas.value.unshift({ id: Date.now(), text: ideaText.value, type: 'invest' }) // Par défaut invest
  ideaText.value = ''
}
</script>

<template>
  <div class="min-h-screen bg-background dark:bg-background-dark text-text-main dark:text-text-dark-main transition-colors duration-300">
    
    <!-- Header / Nav -->
    <nav class="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center transition-all duration-300" :class="{ 'bg-background/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-surface-border dark:border-surface-dark-border': showNavLogo }">
      <div class="max-w-7xl mx-auto w-full flex justify-between items-center">
        <div class="font-bold text-xl tracking-tight text-primary transition-opacity duration-300" :class="showNavLogo ? 'opacity-100' : 'opacity-0 pointer-events-none'">
          CapitalView
        </div>
        <div class="flex items-center gap-4">
          <button @click="toggleDarkMode" class="p-2 rounded-full hover:bg-surface/50 dark:hover:bg-surface-dark/50 transition-colors text-text-muted dark:text-text-dark-muted backdrop-blur-sm">
            <svg v-if="isDark" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
          </button>
          <router-link to="/login" class="px-4 py-2 rounded-button bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-lg shadow-primary/20 transition-all">
            Connexion
          </router-link>
        </div>
      </div>
    </nav>

    <!-- 1. HERO SECTION -->
    <section class="relative pt-32 pb-32 overflow-hidden">
      <!-- Background Gradients -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-30 pointer-events-none">
        <div class="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-[100px] animate-pulse"></div>
        <div class="absolute bottom-20 right-10 w-96 h-96 bg-secondary rounded-full blur-[100px] opacity-60"></div>
      </div>

      <div class="container mx-auto px-6 relative z-10 text-center">
        <div class="inline-block mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-semibold tracking-wide uppercase animate-fade-in">
          Gestion de Patrimoine 2.0
        </div>
        <h1 ref="heroTitleRef" class="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-text-main to-text-muted dark:from-white dark:to-gray-500 bg-clip-text text-transparent pb-2 animate-slide-up">
          CapitalView
        </h1>
        <p class="text-xl md:text-2xl text-text-muted dark:text-text-dark-muted max-w-2xl mx-auto mb-10 animate-slide-up" style="animation-delay: 100ms">
          La plateforme tout-en-un pour suivre, analyser et optimiser vos investissements financiers, immobiliers et crypto.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style="animation-delay: 200ms">
          <router-link to="/dashboard" class="px-8 py-4 rounded-button bg-primary hover:bg-primary-hover text-white font-bold text-lg shadow-lg shadow-primary/25 transition-all hover:-translate-y-1">
            Accéder au Dashboard
          </router-link>
          <a href="#services" class="px-8 py-4 rounded-button bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border hover:bg-surface-hover dark:hover:bg-slate-800 text-text-main dark:text-text-dark-main font-bold text-lg transition-all">
            Découvrir les offres
          </a>
        </div>
      </div>
    </section>

    <!-- 2. SERVICES / FEATURES -->
    <section id="services" class="py-20 bg-background-subtle dark:bg-background-dark-subtle">
      <div class="container mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-bold mb-4">Nos Services & Modules</h2>
          <p class="text-text-muted dark:text-text-dark-muted max-w-xl mx-auto">
            Une suite d'outils interconnectés pour une vision à 360° de votre richesse.
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <!-- Card 1 -->
          <div class="group p-8 rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border hover:border-primary/50 transition-all hover:shadow-card cursor-default">
            <div class="w-12 h-12 rounded-primary bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            </div>
            <h3 class="text-xl font-bold mb-3">Suivi de Marché</h3>
            <p class="text-text-muted dark:text-text-dark-muted">Données en temps réel pour vos actions (PEA/CTO) et cryptomonnaies. Alertes de prix et analyses techniques.</p>
          </div>

          <!-- Card 2 -->
          <div class="group p-8 rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border hover:border-primary/50 transition-all hover:shadow-card cursor-default">
            <div class="w-12 h-12 rounded-primary bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h3 class="text-xl font-bold mb-3">Cashflow & Budget</h3>
            <p class="text-text-muted dark:text-text-dark-muted">Catégorisation automatique des dépenses bancaires. Suivez votre épargne mensuelle et votre "Burn Rate".</p>
          </div>

          <!-- Card 3 -->
          <div class="group p-8 rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border hover:border-primary/50 transition-all hover:shadow-card cursor-default">
            <div class="w-12 h-12 rounded-primary bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            </div>
            <h3 class="text-xl font-bold mb-3">Journal de Trading</h3>
            <p class="text-text-muted dark:text-text-dark-muted">Documentez vos décisions. Pourquoi avez-vous acheté ? Quand vendre ? Apprenez de vos erreurs passées.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. IDEA BOX (SECTION CRÉATIVE) -->
    <section class="py-20 relative overflow-hidden">
      <!-- Déco de fond -->
      <div class="absolute inset-0 bg-primary/5 -skew-y-3 z-0 transform origin-left"></div>

      <div class="container mx-auto px-6 relative z-10 flex flex-col md:flex-row gap-12 items-center">
        <!-- Texte explicatif -->
        <div class="md:w-1/2">
          <div class="inline-flex items-center gap-2 text-warning font-bold mb-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
            LABORATOIRE
          </div>
          <h2 class="text-4xl font-bold mb-4">Idea Box Intelligente</h2>
          <p class="text-lg text-text-muted dark:text-text-dark-muted mb-6">
            Ne laissez jamais une idée d'investissement ou une fonctionnalité vous échapper. Capturez-la instantanément dans votre boîte à idées.
          </p>
          <ul class="space-y-3 mb-8">
            <li class="flex items-center gap-3">
              <div class="w-6 h-6 rounded-full bg-success/20 text-success flex items-center justify-center text-xs">✓</div>
              <span>Capture rapide (Quick Capture)</span>
            </li>
            <li class="flex items-center gap-3">
              <div class="w-6 h-6 rounded-full bg-success/20 text-success flex items-center justify-center text-xs">✓</div>
              <span>Catégorisation automatique</span>
            </li>
            <li class="flex items-center gap-3">
              <div class="w-6 h-6 rounded-full bg-success/20 text-success flex items-center justify-center text-xs">✓</div>
              <span>Priorisation par impact</span>
            </li>
          </ul>
        </div>

        <!-- Composant Interactif (Idea Box) -->
        <div class="md:w-1/2 w-full">
          <div class="bg-surface dark:bg-surface-dark p-6 rounded-card shadow-card border border-surface-border dark:border-surface-dark-border">
            <h3 class="font-bold text-lg mb-4 flex justify-between items-center">
              Vos Idées Récentes
              <span class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-secondary">{{ ideas.length }} actives</span>
            </h3>
            
            <!-- Liste des idées -->
            <div class="space-y-3 mb-6 max-h-64 overflow-y-auto pr-2">
              <div v-for="idea in ideas" :key="idea.id" class="p-3 rounded-secondary bg-background dark:bg-slate-800 border border-surface-border dark:border-surface-dark-border flex items-start gap-3 group hover:border-primary/30 transition-colors">
                <span v-if="idea.type === 'feature'" class="mt-1 w-2 h-2 rounded-full bg-purple-500 shrink-0" title="Feature App"></span>
                <span v-else class="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Investissement"></span>
                <p class="text-sm flex-1">{{ idea.text }}</p>
                <button class="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-opacity">×</button>
              </div>
            </div>

            <!-- Input Zone -->
            <div class="flex gap-2">
              <input 
                v-model="ideaText"
                @keyup.enter="addIdea"
                type="text" 
                placeholder="Nouvelle idée... (Entrée pour valider)" 
                class="flex-1 px-4 py-2 rounded-input bg-background dark:bg-slate-800 border border-surface-border dark:border-surface-dark-border focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
              >
              <button @click="addIdea" class="p-2 rounded-button bg-primary text-white hover:bg-primary-hover transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. ABOUT & CONTACT -->
    <section class="py-20 bg-background dark:bg-background-dark">
      <div class="container mx-auto px-6 grid md:grid-cols-2 gap-16">
        <!-- About -->
        <div>
          <h2 class="text-3xl font-bold mb-6">À Propos</h2>
          <div class="prose dark:prose-invert text-text-muted dark:text-text-dark-muted">
            <p class="mb-4">
              CapitalView est né d'une frustration : l'éparpillement des données financières. Entre les banques, les exchanges crypto, et les fichiers Excel manuels, il manquait une vérité centrale.
            </p>
            <p>
              Développé avec passion (et beaucoup de café) utilisant Vue 3 et FastAPI, ce projet a pour but de redonner le contrôle aux investisseurs individuels.
            </p>
          </div>
        </div>

        <!-- Contact Form -->
        <div class="bg-surface dark:bg-surface-dark p-8 rounded-card border border-surface-border dark:border-surface-dark-border shadow-soft">
          <h3 class="text-xl font-bold mb-6">Nous Contacter</h3>
          <form @submit.prevent="submitContact" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Email</label>
              <input v-model="contactForm.email" type="email" required class="w-full px-4 py-2 rounded-input border border-surface-border dark:border-surface-dark-border bg-background dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Message</label>
              <textarea v-model="contactForm.message" rows="3" required class="w-full px-4 py-2 rounded-input border border-surface-border dark:border-surface-dark-border bg-background dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"></textarea>
            </div>
            <button type="submit" class="w-full py-3 rounded-button bg-secondary hover:bg-secondary-hover text-white font-bold transition-all">
              {{ isSent ? 'Message envoyé !' : 'Envoyer' }}
            </button>
          </form>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="py-8 text-center text-text-muted dark:text-text-dark-muted text-sm border-t border-surface-border dark:border-surface-dark-border">
      <p>&copy; 2026 CapitalView. Tous droits réservés.</p>
    </footer>
  </div>
</template>

<style scoped>
/* Petits ajustements pour l'animation */
.animate-slide-up {
  animation: slideUp 0.8s ease-out forwards;
  opacity: 0;
  transform: translateY(20px);
}
@keyframes slideUp {
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 1s ease-out forwards;
  opacity: 0;
}
@keyframes fadeIn {
  to { opacity: 1; }
}
</style>
