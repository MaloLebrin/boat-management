# 2026-07-22 — Placeholders de sélecteurs traduits + dédup du filtre pricing/seasons (#408)

Audit UX du 2026-07-19 : le placeholder par défaut de `BaseSelect` (« Select… », codé en dur) et l'option « All » de certains filtres restaient en anglais sur les pages FR, et le filtre Bateau de `/pricing/seasons` affichait « Tous les bateaux » deux fois.

- **`BaseSelect`** : le placeholder par défaut passe désormais par `t('common.selectPlaceholder')` (« Sélectionner… » / « Select… ») au lieu de la chaîne codée en dur, corrigeant d'un coup Réglages → Personnalisation IA (modèle), Réglages → Journal d'activité (Utilisateur, Action) et fiche bateau → Modifier → Propriétaires.
- **Filtres de la liste des bateaux** (`BoatListToolbar.vue`) : l'option « All » des filtres Type et Propulsion utilise la clé existante `t('common.all')` (« Tous »).
- **Filtre Bateau de `/pricing/seasons`** : suppression de l'option « Tous les bateaux » injectée manuellement (reliquat de #370/#391) ; le sélecteur passe en `allow-empty` et n'affiche plus qu'une seule fois le placeholder.
