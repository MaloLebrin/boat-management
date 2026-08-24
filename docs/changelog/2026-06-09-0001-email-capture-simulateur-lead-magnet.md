# 2026-06-09 — Email capture simulateur (lead magnet)

**Nouvelle fonctionnalité — Acquisition**

Capture l'email des visiteurs qui ont vu leurs résultats de simulation mais ne sont pas prêts à créer un compte.

**Backend :**

- Table `simulator_leads` (UUID, email unique, données du simulateur, fourchette de coût, locale)
- Model `SimulatorLead`, service `SimulatorLeadService` (upsert sur email), controller `SimulatorLeadController`
- Validator VineJS `simulatorLeadValidator`
- Route : `POST /simulator/lead` → `simulator.lead` (publique, sans auth)

**Frontend :**

- `SimulatorCtaCard.vue` : second CTA "Recevoir ce rapport par email" affiché sous le bouton principal (visiteurs non authentifiés uniquement), séparé par un divider "ou", avec message de confirmation inline après soumission
- Prop `breakdown` ajoutée à `SimulatorCtaCard` pour passer `totalMin`/`totalMax`

**i18n :** clés `cta_or_divider`, `cta_email_title`, `cta_email_placeholder`, `cta_email_button`, `cta_email_success`, `cta_email_rgpd` dans `simulator.json` (FR + EN)

---
