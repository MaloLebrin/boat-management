# 2026-06-18 — Suppression bouton /careers inexistant — page About #94

**Frontend**

- `inertia/components/marketing/about/AboutTeamSection.vue` — suppression du `<BaseButton href="/careers">` qui produisait une 404 ; le hiring banner conserve son titre et sous-titre
- `shared/types/marketing.ts` — suppression du champ `hiringCta` du type `team`

**Backend**

- `app/controllers/marketing_controller.ts` — suppression de `hiringCta: t('team_hiring_cta')`
- `resources/lang/fr/marketing.json` + `resources/lang/en/marketing.json` — suppression des clés `team_hiring_cta`

---
