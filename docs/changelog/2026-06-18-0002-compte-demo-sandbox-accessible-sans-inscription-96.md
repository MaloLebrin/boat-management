# 2026-06-18 — Compte démo sandbox accessible sans inscription #96

**Backend**

- `database/seeders/sandbox_seeder.ts` — seeder dédié à l'organisation "Marina Démo" : 5 bateaux (voiliers + moteurs) avec équipements complets (moteurs, voiles, gréements) et historiques de maintenance (5 événements + tâches par bateau)
- `app/services/demo_service.ts` — service `DemoService` : `reset()` supprime l'org demo et re-seede, `ensureExists()` crée les données si absentes, `isDemoUser()` identifie le compte démo
- `app/jobs/reset_demo_data.ts` — job `ResetDemoData` pour le scheduler
- `app/controllers/demo_controller.ts` — route GET `/demo` : auto-login du compte démo sans saisie de credentials + redirection vers le dashboard
- `app/controllers/session_controller.ts` — au logout du compte démo, `DemoService.reset()` est déclenché (données remises à zéro)
- `start/routes/demo.ts` — route `/demo` protégée par rate limiting (5 req/min/IP)
- `start/limiter.ts` — throttle `demoThrottle` dédié
- `start/routes.ts` — import de `routes/demo.js`
- `start/scheduler.ts` — cron quotidien `0 4 * * *` (reset 4h du matin, Europe/Paris)
- `.env.example` — variables `DEMO_EMAIL` et `DEMO_PASSWORD`

**Frontend**

- `inertia/components/marketing/home/HomeDemoSection.vue` — nouveau CTA card "Essayer la démo" (accès instantané, sans inscription) en priorité sur la card "Réserver une démo guidée"
- `inertia/pages/marketing/home.vue` — types `PageProps` mis à jour (`tryDemoLabel`, `tryDemoSubtitle`) + binding des nouvelles props
- `resources/lang/fr/marketing.json` — clés `try_demo_label`, `try_demo_subtitle`
- `resources/lang/en/marketing.json` — idem en anglais

**Comportement de reset**

- À chaque logout du compte `demo@fleetai.app` : les données sont effacées et recréées
- Cron quotidien à 4h : reset de sécurité si personne ne s'est déconnecté
- Accès : GET `/demo` → connexion auto → dashboard avec 5 bateaux pré-remplis

---
