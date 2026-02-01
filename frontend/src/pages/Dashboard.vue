<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'

const auth = useAuthStore()
const dashboard = useDashboardStore()

onMounted(() => {
  if (auth.isAuthenticated) {
    dashboard.fetchAll()
  }
})
</script>

<template>
  <div>
    <h1>Dashboard</h1>

    <!-- Loading -->
    <div v-if="dashboard.isLoading">Chargement...</div>

    <!-- Error -->
    <div v-else-if="dashboard.error">
      <p>Erreur: {{ dashboard.error }}</p>
      <button @click="dashboard.fetchAll">Réessayer</button>
    </div>

    <!-- Not authenticated -->
    <div v-else-if="!auth.isAuthenticated">
      <p>Veuillez vous connecter pour accéder au dashboard.</p>
    </div>

    <!-- Dashboard content -->
    <div v-else>
      <!-- User info -->
      <section>
        <h2>Bienvenue {{ auth.user?.username }}</h2>
        <p>Email: {{ auth.user?.email }}</p>
      </section>

      <hr />

      <!-- Bank Accounts Summary -->
      <section>
        <h2>Comptes Bancaires</h2>
        <p><strong>Solde total:</strong> {{ dashboard.formatCurrency(dashboard.bankAccounts?.total_balance) }}</p>

        <div v-if="dashboard.bankAccounts?.accounts?.length">
          <h3>Détail des comptes:</h3>
          <ul>
            <li v-for="account in dashboard.bankAccounts.accounts" :key="account.id">
              {{ account.name }} ({{ account.account_type }}):
              {{ dashboard.formatCurrency(account.balance) }}
              <span v-if="account.bank_name"> - {{ account.bank_name }}</span>
            </li>
          </ul>
        </div>
        <p v-else>Aucun compte bancaire</p>
      </section>

      <hr />

      <!-- Cashflow Balance -->
      <section>
        <h2>Flux de Trésorerie</h2>

        <div v-if="dashboard.cashflowBalance">
          <p><strong>Revenus mensuels:</strong> {{ dashboard.formatCurrency(dashboard.cashflowBalance.monthly_inflows) }}</p>
          <p><strong>Dépenses mensuelles:</strong> {{ dashboard.formatCurrency(dashboard.cashflowBalance.monthly_outflows) }}</p>
          <p><strong>Balance mensuelle:</strong> {{ dashboard.formatCurrency(dashboard.cashflowBalance.monthly_balance) }}</p>
          <p><strong>Taux d'épargne:</strong> {{ dashboard.formatPercent(dashboard.cashflowBalance.savings_rate) }}</p>
        </div>
        <p v-else>Aucune donnée de flux</p>
      </section>

      <hr />

      <!-- Portfolio -->
      <section>
        <h2>Portfolio Investissements</h2>

        <div v-if="dashboard.portfolio">
          <p><strong>Total investi:</strong> {{ dashboard.formatCurrency(dashboard.portfolio.total_invested) }}</p>
          <p><strong>Frais totaux:</strong> {{ dashboard.formatCurrency(dashboard.portfolio.total_fees) }}</p>
          <p><strong>Valeur actuelle:</strong> {{ dashboard.formatCurrency(dashboard.portfolio.current_value) }}</p>
          <p><strong>P/L:</strong> {{ dashboard.formatCurrency(dashboard.portfolio.profit_loss) }} ({{ dashboard.formatPercent(dashboard.portfolio.profit_loss_percentage) }})</p>

          <!-- Accounts -->
          <div v-if="dashboard.portfolio.accounts?.length">
            <h3>Comptes d'investissement:</h3>
            <div v-for="account in dashboard.portfolio.accounts" :key="account.account_id">
              <h4>{{ account.account_name }} ({{ account.account_type }})</h4>
              <ul>
                <li>Investi: {{ dashboard.formatCurrency(account.total_invested) }}</li>
                <li>Valeur: {{ dashboard.formatCurrency(account.current_value) }}</li>
                <li>P/L: {{ dashboard.formatCurrency(account.profit_loss) }} ({{ dashboard.formatPercent(account.profit_loss_percentage) }})</li>
              </ul>

              <!-- Positions -->
              <div v-if="account.positions?.length">
                <h5>Positions:</h5>
                <table>
                  <thead>
                    <tr>
                      <th>Ticker</th>
                      <th>Quantité</th>
                      <th>PRU</th>
                      <th>Investi</th>
                      <th>Valeur</th>
                      <th>P/L</th>
                      <th>P/L %</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="position in account.positions" :key="position.ticker">
                      <td>{{ position.ticker }}</td>
                      <td>{{ position.total_amount }}</td>
                      <td>{{ dashboard.formatCurrency(position.average_buy_price) }}</td>
                      <td>{{ dashboard.formatCurrency(position.total_invested) }}</td>
                      <td>{{ dashboard.formatCurrency(position.current_value) }}</td>
                      <td>{{ dashboard.formatCurrency(position.profit_loss) }}</td>
                      <td>{{ dashboard.formatPercent(position.profit_loss_percentage) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-else>Aucune position</p>
            </div>
          </div>
          <p v-else>Aucun compte d'investissement</p>
        </div>
        <p v-else>Aucune donnée de portfolio</p>
      </section>
    </div>
  </div>
</template>
