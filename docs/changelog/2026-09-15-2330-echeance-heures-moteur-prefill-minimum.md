# Échéance en heures moteur pré-remplie au minimum

**Date** : 2026-09-15

Dans le formulaire de tâche (sujet « Moteur »), le champ « Échéance (heures moteur) » se remplit automatiquement avec le minimum accepté (compteur du moteur retenu + 1, ou 1 sans compteur) dès que l'utilisateur le sélectionne, s'il est vide. L'utilisateur n'a plus qu'à augmenter la valeur.

- Composant : `inertia/components/boats/maintenance/MaintenanceTaskSubjectFields.vue` (`@focus`)
- Une valeur déjà saisie n'est jamais écrasée ; le champ reste facultatif (il peut être vidé).
- Aucun changement de route ni de validation backend.
