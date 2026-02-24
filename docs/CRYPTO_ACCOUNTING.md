# Crypto Accounting — Ledger Model (Version Finale)

## Modèle de données
Chaque opération utilisateur est décomposée en **1 à 4 lignes atomiques** dans la base de données. Ces lignes sont liées par un `group_uuid`.

| Champ | Description |
| :--- | :--- |
| `symbol` | Token concerné (ex : BTC, EUR, BNB) |
| `type` | Type atomique (BUY, SPEND, FEE, FIAT_ANCHOR, …) |
| `amount` | Quantité positive du token |
| `price_per_unit` | Prix en EUR par unité — **toujours 0 pour les lignes crypto** |
| `group_uuid` | Identifiant de groupage des lignes |

### Règle `price_per_unit` en base

| Type | `price_per_unit` | Commentaire |
| :--- | :--- | :--- |
| **BUY** | `0` | Quantité seule, coût porté par FIAT_ANCHOR / SPEND EUR |
| **SPEND** (crypto) | `0` | Réduction de solde uniquement |
| **SPEND** (EUR) | `1` | Porte le coût en EUR pour les achats en fiat |
| **FEE** | `0` | Réduction de solde uniquement |
| **REWARD** | `0` | Coût de base = 0 |
| **TRANSFER** | `0` | Neutre, déplacement de quantité |
| **FIAT_DEPOSIT** | `1` | Dépôt fiat, `amount` = montant EUR |
| **FIAT_ANCHOR** | `1` | **Ancre EUR** : `amount` = valeur totale du trade en EUR |
| **EXIT** | `eur_amount / amount` | Sortie taxable, prix de vente en EUR |

---

## Règle d'Ancrage EUR Universelle
La valeur EUR de toute opération est fournie par l'utilisateur via **`eur_amount`** (= `total_trade_eur`).

- Le DTO composite **n'a pas de `price_per_unit`**.
- Le service stocke le coût EUR via :
  - **FIAT_ANCHOR** (pour les quotes crypto ou frais crypto non inclus)
  - **SPEND EUR** (pour les quotes fiat, le montant EUR dépensé EST l'ancre)

---

## Modèle de Frais (BUY)

### 1. `fee_included = True`
Les frais sont inclus dans `eur_amount`.
- La ligne **FEE** est créée avec `price_per_unit = 0` (réduction de solde uniquement).
- Pas d'impact sur le coût total.

### 2. `fee_included = False`
Les frais s'ajoutent au montant total.
- **Coût EUR des frais** : `fee_eur_effectif` = `fee_eur` OU (`eur_amount` × `fee_percentage` / 100).
- **FIAT_ANCHOR** porte le coût total : `eur_amount + fee_eur_effectif`.
- Pour les quotes EUR sans frais crypto : le surcoût est fusionné dans le SPEND EUR.

---

## Exemples de Geste Composite

### Geste : Swap USDC → BTC (avec frais BNB)
- `symbol` : BTC, `amount` : 0.1
- `quote_symbol` : USDC, `quote_amount` : 3000
- `eur_amount` : 2760
- `fee_symbol` : BNB, `fee_amount` : 0.01, `fee_included` : True

**Résultat (3-4 lignes atomiques) :**

| # | Type | Symbol | Amount | price_per_unit |
| :--- | :--- | :--- | :--- | :--- |
| 1 | BUY | BTC | 0.1 | 0 |
| 2 | SPEND | USDC | 3000 | 0 |
| 3 | FIAT_ANCHOR | EUR | 2760 | 1 |
| 4 | FEE | BNB | 0.01 | 0 |

### Geste : Achat BTC avec EUR
- `symbol` : BTC, `amount` : 0.1
- `quote_symbol` : EUR, `quote_amount` : 3000
- `eur_amount` : 3000

**Résultat (2 lignes) :**

| # | Type | Symbol | Amount | price_per_unit |
| :--- | :--- | :--- | :--- | :--- |
| 1 | BUY | BTC | 0.1 | 0 |
| 2 | SPEND | EUR | 3000 | 1 |

> Pas de FIAT_ANCHOR : le SPEND EUR **est** l'ancre.

### Geste : CRYPTO_DEPOSIT
- `symbol` : BTC, `amount` : 0.5
- `eur_amount` : 15000

**Résultat (2 lignes) :**

| # | Type | Symbol | Amount | price_per_unit |
| :--- | :--- | :--- | :--- | :--- |
| 1 | FIAT_ANCHOR | EUR | 15000 | 1 |
| 2 | BUY | BTC | 0.5 | 0 |

---

## Calcul du PRU (Summary)

Le **Prix de Revient Unitaire** est calculé à partir du coût du groupe :

```
group_cost = FIAT_ANCHOR.amount  (si présent dans le group)
           OU SPEND_EUR.amount   (si quote est EUR)

PRU = group_cost / BUY.amount
```

---

## Devises Fiat (USD, GBP, etc.)
L'EUR est l'ancre (`price = 1`). Pour les quotes fiat (EUR, USD…), le SPEND fiat porte directement le coût.