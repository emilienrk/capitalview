<script setup lang="ts">
import { ArrowLeftRight, ArrowUpDown, Bitcoin, Boxes, Building2, Code2, Eye, Info, KeyRound, Layers3, Lock, Moon, Pencil, Search, Server, ShieldCheck, Sun, TrendingUp, X } from 'lucide-vue-next'

import { ref, onMounted } from 'vue'

const isDark = ref(false)
const showNavLogo = ref(false)
const heroTitleRef = ref<HTMLElement | null>(null)

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark')

  const heroElement = heroTitleRef.value
  if (heroElement) {
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        showNavLogo.value = !entry.isIntersecting
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

interface Feature {
  title: string
  description: string
  icon: string
  color: string
}

const features: Feature[] = [
  {
    title: 'Actions & PEA',
    description: 'Suivi de vos comptes-titres et PEA avec données de marché en temps réel, plus-values et historique de transactions.',
    icon: 'stock',
    color: 'info',
  },
  {
    title: 'Cryptomonnaies',
    description: 'Portefeuille crypto multi-exchanges avec suivi des cours, gains/pertes et allocation par token.',
    icon: 'crypto',
    color: 'warning',
  },
  {
    title: 'Cashflow & Budget',
    description: 'Analyse de vos flux bancaires : revenus, dépenses, épargne mensuelle et taux d\'épargne.',
    icon: 'cashflow',
    color: 'success',
  },
  {
    title: 'Comptes Bancaires',
    description: 'Centralisez tous vos comptes en un seul endroit. Visualisez vos soldes et mouvements en un coup d\'œil.',
    icon: 'bank',
    color: 'primary',
  },
  {
    title: 'Biens Personnels',
    description: 'Suivez vos possessions : véhicules, skins, bijoux, collections… avec estimation de valeur, historique et plus-value.',
    icon: 'asset',
    color: 'secondary',
  },
  {
    title: 'Notes & Stratégie',
    description: 'Documentez vos thèses d\'investissement, vos analyses et vos décisions pour garder une trace de votre raisonnement.',
    icon: 'notes',
    color: 'danger',
  },
]

const highlights = [
  {
    title: 'Données chiffrées',
    description: 'Chiffrement AES-256 de bout en bout pour toutes vos données sensibles. Votre patrimoine reste privé.',
    icon: 'lock',
  },
  {
    title: 'Tout-en-un',
    description: 'Plus besoin de jongler entre Excel, votre banque et vos exchanges. Tout est centralisé.',
    icon: 'layers',
  },
  {
    title: 'Open Source',
    description: 'Code source ouvert et auto-hébergeable. Gardez le contrôle total sur vos données.',
    icon: 'code',
  },
]
</script>

<template>
  <div class="min-h-screen bg-background dark:bg-background-dark text-text-main dark:text-text-dark-main transition-colors duration-300">

    <!-- Nav -->
    <nav
      class="fixed top-0 w-full z-50 px-6 pb-4 transition-all duration-300"
      style="padding-top: max(1rem, env(safe-area-inset-top));"
      :class="{ 'bg-background/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-surface-border dark:border-surface-dark-border': showNavLogo }"
    >
      <div class="max-w-6xl mx-auto w-full flex justify-between items-center">
        <div
          class="hidden sm:flex items-center gap-2 font-bold text-xl tracking-tight text-primary transition-opacity duration-300"
          :class="showNavLogo ? 'opacity-100' : 'opacity-0 pointer-events-none'"
        >
          <img src="/capitalview.svg" alt="CapitalView Logo" class="w-6 h-6" />
          CapitalView
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="toggleDarkMode"
            class="p-1.5 rounded-full hover:bg-surface/50 dark:hover:bg-surface-dark/50 transition-colors text-text-muted dark:text-text-dark-muted shrink-0"
          >
            <Sun v-if="isDark" class="w-4 h-4 sm:w-5 sm:h-5" />
            <Moon v-else class="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <router-link
            to="/login"
            class="whitespace-nowrap px-3 py-1.5 sm:px-4 sm:py-2 rounded-button bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border hover:bg-surface-hover dark:hover:bg-surface-dark-hover text-text-main dark:text-text-dark-main text-xs sm:text-sm font-semibold transition-all"
          >
            Connexion
          </router-link>
          <router-link
            to="/register"
            class="whitespace-nowrap px-3 py-1.5 sm:px-4 sm:py-2 rounded-button bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold shadow-sm shadow-primary/20 transition-all"
          >
            Créer un compte
          </router-link>
        </div>
      </div>
    </nav>

    <!-- Hero -->
    <section class="relative pt-36 pb-28 overflow-hidden">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-5xl opacity-20 pointer-events-none">
        <div class="absolute top-16 left-10 w-72 h-72 bg-primary rounded-full blur-[120px]"></div>
        <div class="absolute bottom-10 right-10 w-80 h-80 bg-info rounded-full blur-[120px]"></div>
      </div>

      <div class="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <h1
          ref="heroTitleRef"
          class="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-linear-to-r from-text-main via-primary to-text-muted dark:from-white dark:via-primary dark:to-text-dark-muted bg-clip-text text-transparent pb-2 animate-slide-up"
        >
          CapitalView
        </h1>
        <p class="text-xl md:text-2xl text-text-body dark:text-text-dark-body max-w-2xl mx-auto mb-4 animate-slide-up" style="animation-delay: 80ms">
          Votre patrimoine, simplifié.
        </p>
        <p class="text-base md:text-lg text-text-muted dark:text-text-dark-muted max-w-xl mx-auto mb-10 animate-slide-up" style="animation-delay: 160ms">
          Suivez vos actions, crypto, comptes bancaires, biens personnels et cashflow depuis une seule interface. Données chiffrées, auto-hébergeable, 100% open source.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center animate-slide-up" style="animation-delay: 240ms">
          <router-link
            to="/register"
            class="px-8 py-3.5 rounded-button bg-primary hover:bg-primary-hover text-white font-bold text-lg shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5"
          >
            Commencer gratuitement
          </router-link>
          <a
            href="#features"
            class="px-8 py-3.5 rounded-button bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border hover:bg-surface-hover dark:hover:bg-surface-dark-hover text-text-main dark:text-text-dark-main font-bold text-lg transition-all"
          >
            Découvrir
          </a>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="py-24 bg-background-subtle dark:bg-background-dark-subtle">
      <div class="max-w-6xl mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold mb-4">Tout votre patrimoine, un seul outil</h2>
          <p class="text-text-muted dark:text-text-dark-muted max-w-lg mx-auto">
            Six modules interconnectés pour une vision complète de vos finances.
          </p>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="group p-7 rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border hover:border-primary/40 transition-all hover:shadow-card"
          >
            <!-- Icon -->
            <div
              class="w-11 h-11 rounded-secondary flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
              :class="{
                'bg-primary/10 text-primary': feature.color === 'primary',
                'bg-info/10 text-info': feature.color === 'info',
                'bg-warning/10 text-warning': feature.color === 'warning',
                'bg-success/10 text-success': feature.color === 'success',
                'bg-secondary/10 text-secondary': feature.color === 'secondary',
                'bg-danger/10 text-danger': feature.color === 'danger',
              }"
            >
              <!-- Stock -->
              <TrendingUp v-if="feature.icon === 'stock'" class="w-5 h-5" stroke-width="2" />
              <!-- Crypto -->
              <Bitcoin v-else-if="feature.icon === 'crypto'" class="w-5 h-5" stroke-width="2" />
              <!-- Cashflow -->
              <ArrowUpDown v-else-if="feature.icon === 'cashflow'" class="w-5 h-5" stroke-width="2" />
              <!-- Bank -->
              <Building2 v-else-if="feature.icon === 'bank'" class="w-5 h-5" stroke-width="2" />
              <!-- Asset -->
              <Boxes v-else-if="feature.icon === 'asset'" class="w-5 h-5" stroke-width="2" />
              <!-- Notes -->
              <Pencil v-else-if="feature.icon === 'notes'" class="w-5 h-5" stroke-width="2" />
            </div>

            <h3 class="text-lg font-bold mb-2">{{ feature.title }}</h3>
            <p class="text-sm text-text-muted dark:text-text-dark-muted leading-relaxed">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Highlights / Why CapitalView -->
    <section class="py-24">
      <div class="max-w-5xl mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold mb-4">Pourquoi CapitalView ?</h2>
          <p class="text-text-muted dark:text-text-dark-muted max-w-lg mx-auto">
            Conçu pour les investisseurs individuels qui veulent garder le contrôle.
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-10">
          <div v-for="item in highlights" :key="item.title" class="text-center">
            <div class="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-5">
              <!-- Lock -->
              <Lock v-if="item.icon === 'lock'" class="w-6 h-6" stroke-width="2" />
              <!-- Layers -->
              <Layers3 v-else-if="item.icon === 'layers'" class="w-6 h-6" stroke-width="2" />
              <!-- Code -->
              <Code2 v-else-if="item.icon === 'code'" class="w-6 h-6" stroke-width="2" />
            </div>
            <h3 class="text-lg font-bold mb-2">{{ item.title }}</h3>
            <p class="text-sm text-text-muted dark:text-text-dark-muted leading-relaxed">{{ item.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Security Deep-Dive -->
    <section id="security" class="py-24 bg-background-subtle dark:bg-background-dark-subtle overflow-hidden">
      <div class="max-w-6xl mx-auto px-6">

        <!-- Header -->
        <div class="text-center mb-20">
          <div class="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-success/10 text-success border border-success/20 text-sm font-semibold tracking-wide uppercase">
            <ShieldCheck class="w-4 h-4" stroke-width="2" />
            Architecture <span class="tooltip">Zero-Knowledge<span class="tooltip-text">Modèle où le serveur ne possède jamais la clé de déchiffrement. Il manipule des données qu'il ne peut pas lire.</span></span>
          </div>
          <h2 class="text-3xl md:text-4xl font-bold mb-4">Comment vos données sont protégées</h2>
          <p class="text-text-muted dark:text-text-dark-muted max-w-2xl mx-auto text-lg">
            Toutes les données sensibles sont chiffrées avec une clé dérivée de votre mot de passe. Le serveur stocke uniquement des blocs chiffrés — en cas de fuite de la base, les informations restent <strong class="text-text-main dark:text-text-dark-main">inexploitables</strong> sans votre mot de passe.
          </p>
        </div>

        <!-- Section 1: Before/After — What the server sees -->
        <div class="mb-20">
          <h3 class="text-xl font-bold text-center mb-2">Ce que le serveur stocke</h3>
          <p class="text-sm text-text-muted dark:text-text-dark-muted text-center mb-8 max-w-lg mx-auto">Comparaison entre vos données réelles et ce qui est réellement enregistré en base de données.</p>

          <div class="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <!-- Your data -->
            <div class="p-6 rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border shadow-soft">
              <div class="flex items-center gap-2 mb-5">
                <div class="w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center">
                  <Eye class="w-4 h-4" stroke-width="2" />
                </div>
                <p class="font-bold text-sm">Ce que <span class="text-success">vous</span> voyez</p>
              </div>
              <div class="space-y-3 font-mono text-sm">
                <div class="p-3 rounded-secondary bg-background dark:bg-background-dark">
                  <span class="text-text-muted dark:text-text-dark-muted text-xs block mb-0.5">IBAN</span>
                  <span class="text-text-main dark:text-text-dark-main">FR76 1234 5678 9012 3456 7890 123</span>
                </div>
                <div class="p-3 rounded-secondary bg-background dark:bg-background-dark">
                  <span class="text-text-muted dark:text-text-dark-muted text-xs block mb-0.5">Solde</span>
                  <span class="text-text-main dark:text-text-dark-main">24 650,83 €</span>
                </div>
                <div class="p-3 rounded-secondary bg-background dark:bg-background-dark">
                  <span class="text-text-muted dark:text-text-dark-muted text-xs block mb-0.5">Note privée</span>
                  <span class="text-text-main dark:text-text-dark-main">Acheter ETH si &lt; 2800$</span>
                </div>
              </div>
            </div>

            <!-- What server sees -->
            <div class="p-6 rounded-card bg-surface dark:bg-surface-dark border border-danger/20 shadow-soft">
              <div class="flex items-center gap-2 mb-5">
                <div class="w-8 h-8 rounded-full bg-danger/10 text-danger flex items-center justify-center">
                  <Server class="w-4 h-4" stroke-width="2" />
                </div>
                <p class="font-bold text-sm">Ce que le <span class="text-danger">serveur</span> stocke</p>
              </div>
              <div class="space-y-3 font-mono text-sm">
                <div class="p-3 rounded-secondary bg-background dark:bg-background-dark">
                  <span class="text-text-muted dark:text-text-dark-muted text-xs block mb-0.5">account_number_encrypted</span>
                  <span class="text-danger/70 break-all text-xs">oXm9k3LpQ2vR8wZt1nBfY6cHjD4e KgMxUaSiNq...</span>
                </div>
                <div class="p-3 rounded-secondary bg-background dark:bg-background-dark">
                  <span class="text-text-muted dark:text-text-dark-muted text-xs block mb-0.5">balance_encrypted</span>
                  <span class="text-danger/70 break-all text-xs">Wq7pRmK2Nv5tYxHn8bCfLj3gDsAo UeZiVrTkMw...</span>
                </div>
                <div class="p-3 rounded-secondary bg-background dark:bg-background-dark">
                  <span class="text-text-muted dark:text-text-dark-muted text-xs block mb-0.5">note_content_encrypted</span>
                  <span class="text-danger/70 break-all text-xs">Fh4yBnWq9kRm2Lv7tPxHcJf5gDsA oZeNiUrTkQ...</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Blind index isolation callout -->
          <div class="mt-8 max-w-4xl mx-auto p-5 rounded-card bg-surface dark:bg-surface-dark border border-warning/20 shadow-soft">
            <div class="flex gap-4">
              <div class="w-10 h-10 rounded-full bg-warning/10 text-warning flex items-center justify-center shrink-0 mt-0.5">
                <Info class="w-5 h-5" stroke-width="2" />
              </div>
              <div>
                <p class="font-bold text-sm mb-1.5">Aucun lien possible entre les données</p>
                <p class="text-sm text-text-muted dark:text-text-dark-muted leading-relaxed">
                  Grâce aux <strong class="text-text-main dark:text-text-dark-main"><span class="tooltip">Blind Index<span class="tooltip-text">Index aveugle : hash déterministe qui permet la recherche sans exposer la donnée en clair. Chaque index est isolé et ne peut pas être corrélé avec d'autres champs.</span></span></strong>, même une personne ayant accès à la base de données ne peut pas déterminer combien de comptes bancaires vous possédez, quel est votre solde total, combien de notes vous avez écrites, ni relier un compte à un montant. Chaque enregistrement chiffré est un bloc opaque, impossible à corréler avec les autres — <strong class="text-text-main dark:text-text-dark-main">y compris pour un administrateur du serveur</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 2: Encryption Pipeline (vertical, clean) -->
        <div class="mb-20 max-w-3xl mx-auto">
          <h3 class="text-xl font-bold text-center mb-2">Pipeline cryptographique</h3>
          <p class="text-sm text-text-muted dark:text-text-dark-muted text-center mb-10 max-w-md mx-auto">De votre mot de passe à la donnée chiffrée en base, chaque étape utilise un algorithme spécialisé.</p>

          <div class="relative">
            <!-- Vertical line connector -->
            <div class="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-surface-border dark:bg-surface-dark-border z-0"></div>

            <!-- Step 1: Password input -->
            <div class="relative flex items-start gap-5 mb-8">
              <div class="relative z-10 w-12 h-12 md:w-16 md:h-16 rounded-full bg-surface dark:bg-surface-dark border-2 border-primary flex items-center justify-center shrink-0">
                <KeyRound class="w-5 h-5 md:w-6 md:h-6 text-primary" stroke-width="2" />
              </div>
              <div class="pt-1 md:pt-3">
                <p class="font-bold mb-0.5">Mot de passe + <span class="tooltip">Sel unique<span class="tooltip-text">Valeur aléatoire de 16 octets, générée à l'inscription et propre à chaque utilisateur. Garantit que deux mots de passe identiques produisent des clés différentes.</span></span></p>
                <p class="text-sm text-text-muted dark:text-text-dark-muted">Un sel cryptographique aléatoire est généré à l'inscription et propre à chaque utilisateur. Il empêche les attaques par <span class="tooltip">rainbow tables<span class="tooltip-text">Tables précalculées de hachages permettant de retrouver un mot de passe à partir de son empreinte. Le sel rend ces tables inutiles.</span></span>.</p>
              </div>
            </div>

            <!-- Step 2: Argon2id -->
            <div class="relative flex items-start gap-5 mb-8">
              <div class="relative z-10 w-12 h-12 md:w-16 md:h-16 rounded-full bg-surface dark:bg-surface-dark border-2 border-danger flex items-center justify-center shrink-0">
                <span class="font-mono font-bold text-danger text-[10px] md:text-xs">Ar2</span>
              </div>
              <div class="pt-1 md:pt-3">
                <div class="flex items-center gap-2 mb-0.5">
                  <p class="font-bold"><span class="tooltip">Argon2id<span class="tooltip-text">Fonction de hachage de mots de passe (RFC 9106). Combine résistance aux attaques par GPU (coût mémoire élevé) et par canaux auxiliaires (mode hybride id).</span></span></p>
                  <span class="px-2 py-0.5 rounded-badge bg-danger/10 text-danger text-[10px] font-medium">Hachage</span>
                </div>
                <p class="text-sm text-text-muted dark:text-text-dark-muted">Algorithme résistant aux <span class="tooltip">GPU<span class="tooltip-text">Les cartes graphiques peuvent tester des milliards de combinaisons par seconde. Argon2id les ralentit en exigeant beaucoup de mémoire vive (64 MiB par essai).</span></span> et <span class="tooltip">ASIC<span class="tooltip-text">Circuits intégrés spécialisés conçus pour le craquage de mots de passe. Le coût mémoire d'Argon2id rend leur fabrication non rentable.</span></span> (64 MiB de mémoire, 4 itérations). Dérive une <strong class="text-text-main dark:text-text-dark-main"><span class="tooltip">Master Key<span class="tooltip-text">Clé principale de 256 bits (32 octets) dérivée de votre mot de passe. Elle n'est jamais stockée et sert à générer les sous-clés de chiffrement et d'indexation.</span></span> de 256 bits</strong> à partir du mot de passe.</p>
              </div>
            </div>

            <!-- Step 3: HKDF -->
            <div class="relative flex items-start gap-5 mb-8">
              <div class="relative z-10 w-12 h-12 md:w-16 md:h-16 rounded-full bg-surface dark:bg-surface-dark border-2 border-primary flex items-center justify-center shrink-0">
                <ArrowLeftRight class="w-5 h-5 md:w-6 md:h-6 text-primary" stroke-width="2" />
              </div>
              <div class="pt-1 md:pt-3">
                <div class="flex items-center gap-2 mb-0.5">
                  <p class="font-bold"><span class="tooltip">HKDF-SHA256<span class="tooltip-text">HMAC-based Key Derivation Function (RFC 5869). Dérive plusieurs sous-clés à partir d'une clé maître en utilisant des contextes distincts, conformément au standard NIST.</span></span></p>
                  <span class="px-2 py-0.5 rounded-badge bg-primary/10 text-primary text-[10px] font-medium">Dérivation</span>
                </div>
                <p class="text-sm text-text-muted dark:text-text-dark-muted">La Master Key est scindée en <strong class="text-text-main dark:text-text-dark-main">deux sous-clés isolées</strong> par contexte : une pour le chiffrement, une pour l'indexation. Compromettre l'une ne révèle pas l'autre.</p>
              </div>
            </div>

            <!-- Step 4a & 4b: Two branches -->
            <div class="relative grid md:grid-cols-2 gap-4 ml-12 md:ml-16 pl-5">

              <!-- AES-256-GCM -->
              <div class="p-5 rounded-card bg-surface dark:bg-surface-dark border border-info/30 shadow-soft">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-8 h-8 rounded-secondary bg-info/10 text-info flex items-center justify-center shrink-0">
                    <Lock class="w-4 h-4" stroke-width="2" />
                  </div>
                  <div>
                    <p class="font-bold text-sm"><span class="tooltip">AES-256-GCM<span class="tooltip-text">Advanced Encryption Standard avec clé de 256 bits en mode Galois/Counter. Chiffrement authentifié (AEAD) qui garantit à la fois la confidentialité et l'intégrité des données.</span></span></p>
                    <p class="text-[10px] text-info font-medium">Chiffrement <span class="tooltip">AEAD<span class="tooltip-text">Authenticated Encryption with Associated Data. Le chiffrement et la vérification d'intégrité sont effectués en une seule opération — toute altération est détectée.</span></span></p>
                  </div>
                </div>
                <p class="text-xs text-text-muted dark:text-text-dark-muted mb-3">Chaque donnée est chiffrée avec un <span class="tooltip">nonce<span class="tooltip-text">Number used once — valeur aléatoire de 12 octets générée pour chaque opération de chiffrement. Garantit qu'un même texte produit un chiffré différent à chaque fois.</span></span> unique de 12 octets. Le tag GCM garantit qu'aucune altération n'est possible.</p>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="px-2 py-0.5 rounded-badge bg-info/10 text-info text-[10px] font-medium">Nonce 12 oct.</span>
                  <span class="px-2 py-0.5 rounded-badge bg-info/10 text-info text-[10px] font-medium">Anti-replay</span>
                  <span class="px-2 py-0.5 rounded-badge bg-info/10 text-info text-[10px] font-medium">FIPS 197</span>
                </div>
              </div>

              <!-- HMAC Blind Index -->
              <div class="p-5 rounded-card bg-surface dark:bg-surface-dark border border-warning/30 shadow-soft">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-8 h-8 rounded-secondary bg-warning/10 text-warning flex items-center justify-center shrink-0">
                    <Search class="w-4 h-4" stroke-width="2" />
                  </div>
                  <div>
                    <p class="font-bold text-sm"><span class="tooltip">HMAC-SHA256<span class="tooltip-text">Hash-based Message Authentication Code avec SHA-256 (RFC 2104). Produit une empreinte déterministe mais irréversible — on ne peut pas retrouver la donnée d'origine à partir du hash.</span></span></p>
                    <p class="text-[10px] text-warning font-medium"><span class="tooltip">Blind Index<span class="tooltip-text">Index aveugle : hash déterministe d'un identifiant, stocké à côté de la donnée chiffrée. Permet au serveur de retrouver un enregistrement sans jamais voir la donnée en clair.</span></span></p>
                  </div>
                </div>
                <p class="text-xs text-text-muted dark:text-text-dark-muted mb-3">Génère un hash irréversible pour chaque identifiant. Permet la recherche en <span class="tooltip">O(1)<span class="tooltip-text">Complexité algorithmique constante : le temps de recherche ne dépend pas du nombre d'enregistrements. Instantané quelle que soit la taille de la base.</span></span> sans déchiffrer les données, tout en rendant impossible de relier un compte à un solde ou de deviner le nombre d'enregistrements d'un utilisateur.</p>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="px-2 py-0.5 rounded-badge bg-warning/10 text-warning text-[10px] font-medium">Irréversible</span>
                  <span class="px-2 py-0.5 rounded-badge bg-warning/10 text-warning text-[10px] font-medium">O(1)</span>
                  <span class="px-2 py-0.5 rounded-badge bg-warning/10 text-warning text-[10px] font-medium">RFC 2104</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 3: Key Lifecycle -->
        <div class="mb-20 max-w-4xl mx-auto">
          <h3 class="text-xl font-bold text-center mb-2">Cycle de vie de la clé</h3>
          <p class="text-sm text-text-muted dark:text-text-dark-muted text-center mb-10 max-w-md mx-auto">La Master Key n'est jamais stockée. Elle existe uniquement en mémoire durant votre session.</p>

          <div class="grid sm:grid-cols-4 gap-4">
            <!-- Login -->
            <div class="relative p-5 rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border text-center">
              <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-sm">1</div>
              <p class="font-bold text-sm mb-1 mt-2">Connexion</p>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Mot de passe + sel → dérivation de la Master Key</p>
            </div>

            <!-- In memory -->
            <div class="relative p-5 rounded-card bg-surface dark:bg-surface-dark border border-success/30 text-center">
              <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-success text-white text-xs font-bold flex items-center justify-center shadow-sm">2</div>
              <p class="font-bold text-sm mb-1 mt-2">En mémoire</p>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Cookie <span class="tooltip">HttpOnly<span class="tooltip-text">Flag de cookie qui interdit l'accès depuis JavaScript (document.cookie). Protège contre les attaques XSS — seul le navigateur peut envoyer le cookie au serveur.</span></span> sécurisé. Jamais en localStorage</p>
            </div>

            <!-- Usage -->
            <div class="relative p-5 rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border text-center">
              <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-info text-white text-xs font-bold flex items-center justify-center shadow-sm">3</div>
              <p class="font-bold text-sm mb-1 mt-2">Utilisation</p>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Chiffrement / déchiffrement à la volée à chaque requête</p>
            </div>

            <!-- Logout -->
            <div class="relative p-5 rounded-card bg-surface dark:bg-surface-dark border border-danger/30 text-center">
              <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-danger text-white text-xs font-bold flex items-center justify-center shadow-sm">4</div>
              <p class="font-bold text-sm mb-1 mt-2 ">Déconnexion</p>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Cookie supprimé. La clé n'existe plus nulle part</p>
            </div>
          </div>
        </div>

        <!-- Section 4: Attack protection -->
        <div class="max-w-4xl mx-auto mb-16">
          <h3 class="text-xl font-bold text-center mb-2">6 vecteurs d'attaque, 6 protections</h3>
          <p class="text-sm text-text-muted dark:text-text-dark-muted text-center mb-8 max-w-md mx-auto">Chaque menace connue est contrecarrée par un mécanisme dédié.</p>

          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="p-4 rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-6 h-6 rounded-full bg-danger/10 text-danger flex items-center justify-center shrink-0">
                  <X class="w-3 h-3" stroke-width="2.5" />
                </div>
                <p class="font-bold text-sm"><span class="tooltip">Rainbow tables<span class="tooltip-text">Tables précalculées contenant des millions de correspondances mot de passe → hash. Permettent de retrouver un mot de passe en quelques secondes si aucun sel n'est utilisé.</span></span></p>
              </div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Sel unique par utilisateur + hachage Argon2id rendent les tables précalculées inutiles.</p>
            </div>

            <div class="p-4 rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-6 h-6 rounded-full bg-danger/10 text-danger flex items-center justify-center shrink-0">
                  <X class="w-3 h-3" stroke-width="2.5" />
                </div>
                <p class="font-bold text-sm"><span class="tooltip">Brute-force GPU<span class="tooltip-text">Attaque par force brute utilisant des cartes graphiques capables de tester des milliards de combinaisons par seconde en parallèle.</span></span></p>
              </div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Argon2id exige 64 MiB de mémoire par tentative, rendant les attaques massives impraticables.</p>
            </div>

            <div class="p-4 rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-6 h-6 rounded-full bg-danger/10 text-danger flex items-center justify-center shrink-0">
                  <X class="w-3 h-3" stroke-width="2.5" />
                </div>
                <p class="font-bold text-sm"><span class="tooltip">Rejeu (Replay)<span class="tooltip-text">Attaque où un intermédiaire intercepte un message chiffré valide et le renvoie au serveur pour reproduire une action. Le nonce unique empêche la réutilisation.</span></span></p>
              </div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Un nonce aléatoire de 12 octets unique par opération empêche la réutilisation de données interceptées.</p>
            </div>

            <div class="p-4 rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-6 h-6 rounded-full bg-danger/10 text-danger flex items-center justify-center shrink-0">
                  <X class="w-3 h-3" stroke-width="2.5" />
                </div>
                <p class="font-bold text-sm">Falsification</p>
              </div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Le <span class="tooltip">tag d'authentification GCM<span class="tooltip-text">Empreinte de 16 octets calculée lors du chiffrement. À la lecture, si un seul bit a été modifié, le tag ne correspond plus et le déchiffrement est refusé.</span></span> (<span class="tooltip">AEAD<span class="tooltip-text">Authenticated Encryption with Associated Data — chiffrement et vérification d'intégrité en une seule opération.</span></span>) détecte toute modification des données chiffrées.</p>
            </div>

            <div class="p-4 rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-6 h-6 rounded-full bg-danger/10 text-danger flex items-center justify-center shrink-0">
                  <X class="w-3 h-3" stroke-width="2.5" />
                </div>
                <p class="font-bold text-sm">Fuite serveur</p>
              </div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Modèle <span class="tooltip">Zero-Knowledge<span class="tooltip-text">Architecture où le serveur ne possède jamais la clé de déchiffrement. Il stocke et renvoie des données qu'il ne peut pas lire.</span></span> : la clé de chiffrement n'est jamais stockée en base de données.</p>
            </div>

            <div class="p-4 rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-6 h-6 rounded-full bg-danger/10 text-danger flex items-center justify-center shrink-0">
                  <X class="w-3 h-3" stroke-width="2.5" />
                </div>
                <p class="font-bold text-sm"><span class="tooltip">Timing attacks<span class="tooltip-text">Attaque qui mesure le temps de réponse du serveur pour déduire des informations. Par exemple, une comparaison de hash plus longue peut indiquer que les premiers caractères correspondent.</span></span></p>
              </div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Comparaisons en <span class="tooltip">temps constant<span class="tooltip-text">La vérification prend toujours la même durée, que le premier ou le dernier caractère soit faux. Empêche de deviner progressivement une valeur.</span></span> intégrées aux bibliothèques PyNaCl et Cryptography.</p>
            </div>
          </div>
        </div>

        <!-- Standards & Compliance -->
        <div class="text-center">
          <p class="text-xs font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider mb-4">Conforme aux standards</p>
          <div class="flex flex-wrap items-center justify-center gap-2">
            <span class="px-3 py-1.5 rounded-secondary bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border text-xs font-mono font-medium text-text-muted dark:text-text-dark-muted">NIST SP 800-132</span>
            <span class="px-3 py-1.5 rounded-secondary bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border text-xs font-mono font-medium text-text-muted dark:text-text-dark-muted">NIST SP 800-108</span>
            <span class="px-3 py-1.5 rounded-secondary bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border text-xs font-mono font-medium text-text-muted dark:text-text-dark-muted">FIPS 197</span>
            <span class="px-3 py-1.5 rounded-secondary bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border text-xs font-mono font-medium text-text-muted dark:text-text-dark-muted">RFC 9106</span>
            <span class="px-3 py-1.5 rounded-secondary bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border text-xs font-mono font-medium text-text-muted dark:text-text-dark-muted">RFC 5869</span>
            <span class="px-3 py-1.5 rounded-secondary bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border text-xs font-mono font-medium text-text-muted dark:text-text-dark-muted">RFC 2104</span>
            <span class="px-3 py-1.5 rounded-secondary bg-success/10 border border-success/20 text-xs font-bold text-success">RGPD</span>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20">
      <div class="max-w-3xl mx-auto px-6 text-center">
        <h2 class="text-3xl md:text-4xl font-bold mb-4">Prêt à centraliser votre patrimoine ?</h2>
        <p class="text-text-muted dark:text-text-dark-muted mb-8 max-w-lg mx-auto">
          Créez votre compte en quelques secondes et commencez à suivre vos investissements dès maintenant.
        </p>
        <router-link
          to="/register"
          class="inline-block px-8 py-3.5 rounded-button bg-primary hover:bg-primary-hover text-white font-bold text-lg shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5"
        >
          Créer mon compte
        </router-link>
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-8 text-center text-text-muted dark:text-text-dark-muted text-sm border-t border-surface-border dark:border-surface-dark-border">
      <p>&copy; 2026 CapitalView. Tous droits réservés.</p>
    </footer>
  </div>
</template>

<style scoped>
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

/* Tooltips */
.tooltip {
  position: relative;
  cursor: help;
  border-bottom: 1px dotted currentColor;
  text-decoration: none;
}
.tooltip .tooltip-text {
  visibility: hidden;
  opacity: 0;
  position: absolute;
  z-index: 50;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: 280px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  font-weight: 400;
  font-family: 'Inter', sans-serif;
  color: var(--color-text-dark-main, #f8fafc);
  background: var(--color-surface-dark, #0f172a);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  transition: opacity 0.15s ease, visibility 0.15s ease;
  text-align: left;
}
:deep(.dark) .tooltip .tooltip-text {
  color: var(--color-text-main, #111827);
  background: var(--color-surface, #ffffff);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.tooltip .tooltip-text::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 5px;
  border-style: solid;
  border-color: var(--color-surface-dark, #0f172a) transparent transparent transparent;
}
.tooltip:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}
</style>