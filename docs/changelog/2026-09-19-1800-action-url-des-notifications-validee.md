# 2026-09-19 — `actionUrl` des notifications validée aux deux bouts (#780)

`notification.actionUrl` est une colonne de texte libre dont la valeur est
passée telle quelle à une navigation, côté page Inertia comme côté service
worker.

- **Cause.** Les huit producteurs actuels y écrivent des chemins littéraux
  construits dans le code : rien n'est exploitable en l'état. Mais rien ne
  l'impose non plus — c'est une convention tenue à la main sur huit sites
  d'écriture. Il suffit d'un producteur qui interpole une valeur utilisateur,
  ou d'une future notification dont la cible vient d'une API, pour que
  `actionUrl` devienne `https://attaquant.example/…` (redirection ouverte
  depuis un clic dans l'app) ou `javascript:…` — `router.visit` ne filtre pas
  le schéma.
- **Correctif.** `isSafeInternalPath()` / `safeInternalPathOr()`
  (`shared/helpers/safe_path.ts`), une **allowlist de forme** : une seule
  barre oblique en tête, pas de `//` ni de `/\` — les URL protocol-relative
  ressemblent à un chemin et le navigateur y lit un hôte, c'est le cas qu'on
  oublie systématiquement — et pas de caractère de contrôle. Une allowlist et
  non une liste noire de schémas, qui est toujours en retard d'un schéma.
- **Posée aux deux bouts.** À l'écriture dans `NotificationService.create` :
  une valeur non conforme est stockée à `null` et journalisée en warning,
  plutôt que de faire échouer la création — une notification sans lien reste
  utile, une notification perdue ne l'est pas. Et à la lecture dans les quatre
  consommateurs : `NotificationPanel.vue`, `pages/notifications/index.vue`,
  `layouts/default.vue` (message `push:navigate` du SW) et `sw.ts`.
- **`sw.ts` en priorité**, comme le demandait l'issue : la valeur y vient du
  payload push, donc après un aller-retour hors de l'app, et
  `clients.openWindow()` accepte des URL absolues par conception. Le repli sur
  `'/'` y existait déjà pour la donnée absente — il couvre désormais aussi la
  donnée hostile.
- **Tests.** `tests/inertia/notification_action_url.spec.ts` : le helper
  (chemin valide, URL absolue, `javascript:`, `data:`, `//hôte`, `/\hôte`,
  chaîne vide, non-chaînes, caractères de contrôle) et le panneau monté
  (navigation pour un chemin sûr, aucune navigation pour une `actionUrl`
  hostile, et la notification reste marquée lue même quand le lien est
  refusé — la lecture ne doit pas être l'otage du lien).
