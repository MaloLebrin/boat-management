# 2026-09-18 — Simulateur : les trois POST publics sont bornés (#731)

`start/routes/marketing.ts` protège ses routes publiques d'écriture par un throttle — `/contact`, `/diagnosis-ai`, `/parts-ai` — sauf les trois du simulateur. Les trois écrivent pourtant en base sans authentification. Mesuré sur `/simulator/share` : dix POST à la suite, dix lignes, aucun refus.

- **Cause.** Les routes `simulator.session`, `simulator.lead` et `simulator.share` ne portaient aucun `.use(...)` de limiteur, à la différence de leurs voisines publiques.
- **Correctif.** Trois limiteurs dédiés dans `start/limiter.ts`, montés sur leur route. Compteurs **séparés** (`simulator_session_`, `simulator_share_`, `simulator_lead_` + IP) : une rafale sur l'une ne consomme pas le budget des autres — même principe que `publicDiagnosisThrottle` / `publicPartSearchThrottle`.
  - `simulatorSessionThrottle` — 6 / minute / IP, le débit du diagnostic public ;
  - `simulatorShareThrottle` — 6 / minute / IP, une ligne `simulator_shares` par appel ;
  - `simulatorLeadThrottle` — **5 / 10 minutes / IP**, plus strict : la route crée un prospect _et_ déclenche `send_simulator_report_job` puis `send_simulator_nurturing_job`. C'est le budget du formulaire de contact, l'autre formulaire public qui envoie du courrier.
- **Comportement.** Au-delà du seuil : `429`, rien d'écrit et aucun job enfilé. En deçà : inchangé.
- **Tests.** Nouveau `tests/functional/simulator/simulator_public_throttle.spec.ts` — le refus sur chacune des trois routes, l'absence d'écriture sur la requête refusée, et la séparation des compteurs (épuiser `share` ne ferme ni `session` ni `lead`). Le cas de caractérisation « dix créations à la suite passent toutes » de `simulator_share_creation.spec.ts` disparaît au profit de ces mesures.
- **Docs.** `docs/domain/simulator.md` : le constat #731 devient un tableau des trois throttles.
