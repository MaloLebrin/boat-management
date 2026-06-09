# ✅ DONE (2026-06-09) — Email capture simulateur (lead magnet)

## Contexte

Actuellement, un visiteur qui voit ses résultats de simulation et ferme la page est perdu définitivement.
Le seul chemin de conversion est la création d'un compte complet. Les utilisateurs non-prêts à s'inscrire ne laissent aucune trace.

## Objectif

Capturer l'email des visiteurs qui ont vu leurs résultats mais ne sont pas prêts à créer un compte.

---

## Backend

### 1. Migration — table `simulator_leads`

```
columns:
  id (uuid)
  email (string, not null)
  boat_type (string)
  length_m (integer)
  hull_wear, engine_wear, safety_wear, rigging_wear (string nullable)
  total_min, total_max (integer) — coûts estimés en euros
  locale (string, default 'fr')
  created_at
```

### 2. Model `SimulatorLead`

- `app/models/simulator_lead.ts`
- Pas de relation avec User/Organization à ce stade

### 3. Service `SimulatorLeadService`

- `app/services/simulator_lead_service.ts`
- Méthode `create(email, input, breakdown)` — upsert sur l'email (évite les doublons)

### 4. Controller `SimulatorLeadController`

- `app/controllers/simulator_lead_controller.ts`
- `POST /simulator/lead` — valide email + données simulateur, appelle le service
- Réponse : `response.redirect().back()` avec flash de confirmation
- Pas de middleware auth (public)

### 5. Validator

- `app/validators/simulator_lead.ts`
- VineJS : email valide + champs simulateur (réutiliser `simulatorValidator` partiel)

### 6. Route

- `start/routes/marketing.ts` : `router.post('/simulator/lead', [SimulatorLeadController, 'store']).as('simulator.lead')`

### 7. Types partagés

- Ajouter `SimulatorLeadPayload` dans `shared/types/simulator.ts`

---

## Frontend

### `SimulatorCtaCard.vue` — 2e CTA

Sous le bouton principal (signup), ajouter une section séparée visuellement :

```
┌──────────────────────────────────────┐
│  [CTA principal — signup]            │
│                                      │
│  ─── ou ───                          │
│                                      │
│  Recevoir ce rapport par email       │
│  [input email]  [Envoyer]            │
│                                      │
│  Mention RGPD 1 ligne                │
└──────────────────────────────────────┘
```

- Utiliser `useForm` + `form.post('/simulator/lead', { preserveScroll: true })`
- Après succès : afficher un message de confirmation inline, masquer le formulaire
- Passer `breakdown.totalMin` et `breakdown.totalMax` en champs cachés

### i18n

Ajouter dans `resources/lang/fr/simulator.json` et `en/simulator.json` :

```
simulator.cta_email_title
simulator.cta_email_placeholder
simulator.cta_email_button
simulator.cta_email_success
simulator.cta_email_rgpd
simulator.cta_or_divider
```

---

## Critères d'acceptance

- [ ] Un visiteur non-authentifié peut soumettre son email depuis la page résultat
- [ ] L'email est enregistré en base avec les données de simulation
- [ ] Si l'email existe déjà, pas de doublon (upsert)
- [ ] Message de confirmation affiché après soumission
- [ ] Le CTA signup reste prioritaire visuellement
- [ ] Clés i18n présentes en FR et EN
- [ ] Test fonctionnel : `POST /simulator/lead` avec payload valide → 302 back

---

## Notes

- Ne pas envoyer d'email automatiquement à ce stade (pas de séquence nurturing configurée)
- La table `simulator_leads` peut servir de base à une future séquence d'emails marketing
- RGPD : mention consentement obligatoire dans le formulaire
