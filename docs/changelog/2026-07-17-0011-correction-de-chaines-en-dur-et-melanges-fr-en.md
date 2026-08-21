# 2026-07-17 — Correction de chaînes en dur et mélanges FR/EN (#369)

Plusieurs textes visibles n'étaient pas internationalisés, provoquant des mélanges de langue selon la locale active.

- `BoatShowTabTasks.vue` (onglet Tâches de la fiche bateau) : « Aucune tache correspondante. » (FR en dur, faute d'orthographe) → clé `boats.maintenance.tasks.emptyFiltered` ; bouton « Fait » (FR en dur) → clé existante `boats.maintenance.tasks.done`.
- Modales « Add entry » (historique de maintenance) et d'upload de documents (bateau, moteur, pièce moteur) : `close-label="Annuler"` codé en dur en français → `t('common.close')`, cohérent avec le reste des modales de l'app.
- Type de propulsion du bateau (`sailboat`, `motorboat`…) jamais traduit dans la fiche bateau, la liste (table/cartes/filtre), et le dashboard → nouvel utilitaire `inertia/utils/boat_propulsion_label.ts` qui réutilise les clés `boats.options.propulsion.*` déjà présentes pour les formulaires.
- Landing page : la maquette produit (`HomeMockDashboard.vue`) affichait « 22 bateaux » en dur, y compris sur la version anglaise du site → clé `homePreview.fleetCount` (EN+FR).
- **Tests** : `tests/inertia/boat_propulsion_label.spec.ts` (nouveau) ; suite existante `tests/inertia/boat_document_add_modal.spec.ts` vérifiée après le changement de `close-label`.
