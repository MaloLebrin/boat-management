# TODO — Améliorations acquisition simulateur

## 1. Email du rapport (priorité haute)

**Problème** : le formulaire lead magnet promet "Recevoir ce rapport" mais rien n'est envoyé en boîte.  
**Impact** : transforme les leads dormants en signups via nurturing.

### Séquence minimale

| Délai | Contenu | Objectif |
|---|---|---|
| J+0 | Détail des coûts par catégorie (breakdown complet) | Tenir la promesse, délivrer de la valeur |
| J+3 | "Comment réduire ces coûts" (contenu utile) | Engagement, établir la confiance |
| J+7 | CTA inscription avec rappel du bateau simulé | Conversion |

### Architecture cible

| Couche | Fichier | Rôle |
|---|---|---|
| Job | `app/jobs/send_simulator_report_job.ts` | Envoie l'email J+0 |
| Job | `app/jobs/send_simulator_nurturing_job.ts` | Emails J+3 et J+7 |
| Listener | `app/listeners/on_simulator_lead_created.ts` | Déclenche les jobs à la création du lead |
| Event | `app/events/simulator_lead_created.ts` | Émis dans `SimulatorLeadService.create` |
| Template | `resources/views/emails/simulator_report.edge` | Template email J+0 |

### Notes

- Toutes les données sont déjà en base : `totalMin`, `totalMax`, les usures par catégorie, `locale`
- Personnaliser les emails selon `locale` (FR/EN)
- Respecter le consentement RGPD déjà affiché dans le formulaire

---

## 2. Benchmark anonymisé (priorité haute)

**Problème** : le résultat est affiché dans l'absolu — sans référence, difficile à évaluer.  
**Impact** : social proof + crédibilité du résultat, augmente le temps passé sur la page.

### Comportement attendu

Afficher sous le total un encart du type :

```
Votre voilier de 10m coûte ~12% plus cher à entretenir
que la moyenne des voiliers similaires estimés sur Navig.
```

### Architecture cible

- Requête dans `SimulatorLeadService` : moyenne `total_min`/`total_max` par `boat_type` + tranche de longueur
- Minimum 10 simulations dans la tranche pour afficher le benchmark (sinon masqué)
- Passé comme prop supplémentaire dans `SimulatorController` → `SimulatorResultCard`

### Notes

- Données déjà en base dans `simulator_leads`
- Pas de donnée tierce nécessaire
- Tranche de longueur : utiliser les mêmes bornes que `COSTS_BY_LENGTH` dans `use_simulator_costs.ts`

---

## 3. Exit intent (priorité moyenne)

**Problème** : le lead magnet n'est visible qu'en scrollant sous la CTA principale — beaucoup de visiteurs quittent sans le voir.  
**Impact** : boost du taux de capture sans changer le flux principal.

### Comportement attendu

- **Desktop** : déclencher quand le curseur sort vers le haut de la fenêtre (`mouseleave` sur `document`)
- **Mobile** : déclencher après 20s d'inactivité sur la page résultats
- Afficher une modale ou un drawer avec le formulaire email existant (réutiliser `SimulatorCtaCard` lead magnet)
- Ne s'affiche qu'une fois par session (localStorage flag)
- Ne s'affiche pas si l'email a déjà été soumis

### Architecture cible

- Composable `use_exit_intent.ts` : détection desktop + mobile, flag localStorage
- Intégré dans `inertia/pages/marketing/simulator.vue` uniquement (pas dans le simulateur in-app)

---

## 4. URL de partage (priorité moyenne)

**Problème** : les résultats sont éphémères — pas de moyen de bookmarker ou partager.  
**Impact** : viralité (forums, groupes Facebook plaisance) + pages indexables SEO.

### Comportement attendu

- Après affichage des résultats, bouton "Partager ces résultats"
- Génère une URL courte : `/simulateur/r/:token` (token UUID tronqué)
- La page rendue est statique : titre du bateau, fourchette, breakdown — sans formulaire de simulation
- `og:title` / `og:description` générés pour le partage social

### Architecture cible

| Couche | Fichier | Rôle |
|---|---|---|
| Migration | `create_simulator_shares_table` | Table `simulator_shares` (token, input JSON, breakdown JSON, created_at) |
| Model | `app/models/simulator_share.ts` | Lucid model |
| Controller | `app/controllers/simulator_share_controller.ts` | `store` (crée) + `show` (affiche) |
| Route | `GET /simulateur/r/:token` | Page publique partagée |
| Page | `inertia/pages/marketing/simulator_share.vue` | Vue lecture seule |

---

## 5. Facteurs supplémentaires dans le questionnaire (priorité basse)

**Problème** : le calcul ignore l'âge du bateau et la zone d'hivernage — deux facteurs majeurs du coût réel.  
**Impact** : meilleure précision → résultat plus crédible → meilleure conversion.

### Champs à ajouter

| Champ | Type | Impact sur le calcul |
|---|---|---|
| `yearBuilt` | integer (année) | Multiplicateur sur hull + electrical si > 15 ans |
| `winteringZone` | enum (`covered`, `outdoor`, `sea`) | Multiplicateur sur hull + mooring |

### Notes

- Ajouter une étape dans le questionnaire multi-étapes (après `SimulatorStepBoat`)
- Mettre à jour `SimulatorBoatInput` dans `shared/types/simulator.ts`
- Mettre à jour `computeSimulatorCosts` dans `use_simulator_costs.ts`
- Ajouter les colonnes dans `simulator_leads` (migration additive)

---

## Ordre de priorité recommandé

1. **Email du rapport** — transforme les leads déjà capturés en signups
2. **Benchmark anonymisé** — effort minimal, données déjà en base
3. **Exit intent** — boost immédiat du taux de capture
4. **URL de partage** — canal viral + SEO long terme
5. **Facteurs supplémentaires** — amélioration qualité, peut attendre plus de volume
