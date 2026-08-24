# 2026-06-12 — Séquence email J+0/J+3/J+7 après capture lead simulateur (#12)

**Nouvelle fonctionnalité — Nurturing leads simulateur**

Mise en place de l'architecture Event/Listener/Jobs pour l'envoi automatique de 3 emails après création d'un `SimulatorLead`.

**Backend :**

- `app/events/simulator_lead_created.ts` : event `SimulatorLeadCreated extends BaseEvent`, émis dans `SimulatorLeadService.create` via `SimulatorLeadCreated.dispatch(lead)`
- `app/listeners/on_simulator_lead_created.ts` : dispatche `SendSimulatorReportJob` et `SendSimulatorNurturingJob` à la réception de l'event
- `app/jobs/send_simulator_report_job.ts` : email J+0 — rapport de coûts complet par catégorie (coque, moteur, sécurité, électrique, mouillage, gréement), bilingue FR/EN selon `lead.locale`, template `emails/simulator_report.edge`
- `app/jobs/send_simulator_nurturing_job.ts` : email J+3 (3 conseils pour réduire les coûts, `.in('3d')`) + email J+7 (rappel estimation avec CTA inscription, `.in('7d')`), bilingue FR/EN, templates `emails/nurturing_d3.edge` et `emails/nurturing_d7.edge`
- `start/events.ts` : enregistrement du binding `emitter.listen(SimulatorLeadCreated, [lazy import listener])`, préchargé via `adonisrc.ts`
- Dedup par `correlationId` sur chaque email — évite les doublons en cas de re-soumission du formulaire

**Refactor :**

- `EmailQueueService` : suppression des méthodes `sendSimulatorReport` et `sendSimulatorNurturing` (logique déplacée dans les Jobs dédiés)
- `SimulatorLeadService` : ne dépend plus d'`EmailQueueService` ; délègue via l'event

---
