# 2026-07-23 — Simulateur : cohérence du hero, a11y des boutons de choix et robustesse autofill (#412)

Audit UX du 2026-07-19 sur `/fr/simulateur-cout-entretien` : le hero annonçait « 3 étapes » numérotées alors que le wizard en affiche 4 à 5 selon le bateau, les boutons de choix (types de bateau, catégories CE, usure, hivernage) n'exposaient pas de nom accessible clair, et un autofill navigateur pouvait écraser un champ (`lengthM` perdu quand `yearBuilt` suivait dans le même tick).

- **Hero réaligné** : les trois pastilles numérotées (1/2/3) qui entraient en conflit avec le stepper deviennent un flux de phases « Décrivez → Évaluez → Obtenez » sous l'intitulé « Comment ça marche » (`simulator.how_eyebrow`), sans compteur d'étapes trompeur.
- **Accessibilité** : `BaseOptionCard` accepte une prop `ariaLabel` et expose `aria-pressed` (état de sélection). Les boutons de type de bateau, catégorie de conception CE, niveau d'usure et zone d'hivernage reçoivent un `aria-label` explicite ; les emojis décoratifs passent en `aria-hidden`.
- **Robustesse** : `SimulatorStepBoat` fusionne désormais les mises à jour via un état local (`ref` + `watch`) au lieu de lire `props.modelValue` (encore périmé dans le même tick), évitant l'écrasement mutuel de deux champs remplis simultanément par l'autofill.
- **SEO** : ajout de `head-key` sur les balises `<meta>`/`<link>` du `<Head>` Inertia du simulateur pour une déduplication propre (format supporté par Inertia Head).
- Rappel : l'accent du lien de footer « Simulateur de coût » avait déjà été corrigé (#425).
