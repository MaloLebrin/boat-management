# 2026-10-13 — Checklists de diagnostic disponibles hors-ligne (#981)

Suite du spike #972 : plutôt qu'un modèle d'IA embarqué, le diagnostic de panne déterministe devient disponible en mer. « Préparer la traversée » pré-charge désormais les checklists de diagnostic du bateau, et une étape cochée sans réseau est synchronisée au retour.

- **Pré-chargement.** Pour chaque moteur éligible : l'index `/diagnostic`, la checklist du moteur et les fiches de sa famille. Une ligne « Diagnostic de panne — <moteur> » par moteur dans la modale ; elle échoue si une fiche échoue, et sa date est celle de la plus vieille copie. Le service worker met `/diagnostic` en cache comme les autres pages terrain.
- **Cocher en mer.** `DiagnosticStepList.vue` enfile `toggle-diagnostic-step` (`PATCH /boats/:id/engines/:engineId/diagnostic/steps`, une clé de déduplication par étape) et affiche la coche tout de suite. Le contrôleur flashe `rejectedType` sur ses trois refus (moteur supprimé, plus éligible, étape inconnue) : rejouée, l'action refusée n'est plus lue comme un succès.
- **Réinitialisation.** Un `DELETE` ne passe pas par la file : le bouton « Réinitialiser » est désactivé hors-ligne.
- **Limite.** La barre de progression de la page ne compte les coches faites hors-ligne qu'après synchronisation.
- **Tests.** Vitest : pages préparées, pré-chargement des fiches et date de ligne, ligne par moteur dans la modale, toggle enfilé avec état optimiste, bouton de réinitialisation hors-ligne, `TERRAIN_PATH`. Japa : `rejectedType` sur les trois refus du toggle.
