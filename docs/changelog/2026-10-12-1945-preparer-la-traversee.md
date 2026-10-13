# 2026-10-12 — Préparer la traversée : pré-chargement des pages terrain et cache de 35 jours (#967)

Fait partie de l'épic #949 (Mode traversée), phase 1. Une page jamais ouverte avant le départ tombait sur `/offline.html`, celles de la première semaine expiraient au bout de 7 jours, et une fiche bateau servie depuis le cache s'ouvrait vide (onglets en props différées, chargés par un XHR qui échouait hors-ligne).

- **Rétention.** `inertia-pages` : 35 jours / 120 entrées (avant : 7 jours / 30). Constantes partagées SW ↔ client dans `inertia/lib/offline_cache.ts`.
- **Props différées hors-ligne.** Nouveau cache `inertia-data` dans `inertia/sw.ts` (NetworkFirst 3 s, 35 jours / 240 entrées) pour les rechargements partiels `X-Inertia-Partial-*` des pages terrain, sous une clé synthétique (`inertiaDataCacheKey`) qui ignore `?tab=` et ne peut pas répondre à une navigation. Réponses redirigées ou non Inertia exclues.
- **« Préparer la traversée ».** Entrée du menu « ⋯ » de la fiche bateau, modale `PassagePreparationModal.vue` : pré-charge la fiche, le journal de navigation, les fiches d'entretien, le carburant, les incidents et le planning (document via message `passage:warm-page` au SW, props différées via des visites Inertia), avec statut par page.
- **Check-list de départ** (`PassageChecklist.vue`) : stockage persistant (demandé au clic), espace libre, pages en cache et date de leur copie, file hors-ligne vide, session comparée à la date de retour saisie (30 jours ; au-delà, invitation à se reconnecter avec « Rester connecté », 90 jours).
- **i18n.** Clés `boats.show.passage.*` (FR/EN).
- **Copilote.** Entrée `passage-preparation` dans `product_knowledge.ts`.
- **Tests.** Vitest : `offline_cache.spec.ts`, `passage_preparation.spec.ts`, `use_passage_preparation.spec.ts`, `passage_preparation_modal.spec.ts`, `boat_show_header_actions.spec.ts`. Le SW étant désactivé sous `node ace test`, le service hors-ligne des pages pré-chargées est vérifié sur un build de production, pas en Japa browser.
