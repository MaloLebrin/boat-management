# 2026-09-19 — La modale de conflit hors-ligne devient un vrai dialogue (#734)

Constat sorti de la mesure de #700 : `ConflictResolutionModal` était le seul écran **bloquant** du
produit à ne pas passer par `BaseModal`. Son conteneur était un `Teleport` suivi d'un `<div>` nu,
sans `role="dialog"`, sans `aria-modal` ni nom accessible.

- **Cause.** Le composant dessinait son propre voile et son propre panneau. Un lecteur d'écran
  n'annonçait donc pas l'ouverture d'une modale et ne restreignait pas la navigation à son
  contenu : l'utilisateur continuait de parcourir la page derrière l'écran de conflit, sans savoir
  qu'une décision l'attendait et que sa file de synchronisation était en pause.
- **Correctif.** `ConflictResolutionModal` passe par `BaseModal`, qui porte déjà `role="dialog"`,
  `aria-modal="true"` et le verrou de scroll du body. La comparaison local/serveur occupe le corps
  de la modale, les deux arbitrages son pied.
- **`BaseModal` gagne une prop `dismissible`** (défaut `true`). À `false`, la modale n'a plus de
  sortie neutre : pas de bouton de fermeture dans l'en-tête, pas de fermeture au clic sur
  l'arrière-plan, pas de fermeture à Échap. C'est ce que demande l'écran de conflit, qui ne doit se
  refermer que sur « Utiliser la version serveur » ou « Garder mes modifications ».
- **Nom accessible du dialogue.** Le titre de `BaseModal` est désormais un `<h2>` porteur d'un
  identifiant (`useId()`, donc unique même à deux modales montées), et le panneau le référence par
  `aria-labelledby` au lieu de recopier le texte dans un `aria-label`. Sans titre, le repli
  `aria-label="Modal"` est conservé. Bénéfice collatéral : les titres de toutes les modales de
  l'app sont enfin des titres pour la navigation par en-têtes.
- **Couleur.** L'en-tête de colonne « vos modifications » utilisait `text-amber-600` — un palier
  moyen d'une palette de marque utilisé comme encre. Il passe au token `text-warning`, déjà employé
  par les cellules qui diffèrent juste en dessous.
- **Tests.** `tests/inertia/base_modal.spec.ts` : nom accessible par `aria-labelledby`, repli sans
  titre, et `dismissible: false` qui ferme les trois sorties neutres (une modale ordinaire reste
  fermable). `tests/inertia/conflict_resolution_modal.spec.ts` : rôle `dialog`, `aria-modal`, nom,
  et seulement deux boutons. `tests/browser/offline_queue.spec.ts` cible maintenant la modale par
  `getByRole('dialog', { name: 'Conflict detected' })` — ce que #700 ne pouvait pas faire — et
  vérifie qu'un Échap ne la referme pas.
