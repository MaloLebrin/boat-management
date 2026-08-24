# 2026-08-19 — Réglages : le sous-menu ne surligne plus qu'une seule section (#471)

Suite de la campagne du 03/08 (famille #368). Sur `/settings/members`, l'entrée « Mon profil » du sous-menu Réglages restait surlignée en même temps que « Membres » — deux sections actives à l'écran, dont une qui ne correspondait à aucune page ouverte.

- **« me » est un préfixe de « members ».** `SettingsShell` décidait de l'état actif avec `page.url.startsWith('/settings/' + clé)` : sur `/settings/members`, la clé `me` matchait aussi. La comparaison porte désormais sur le segment de chemin complet — égalité exacte, ou préfixe suivi d'un `/` pour garder la section parente allumée sur une sous-page (`/settings/billing/checkout`). La query string et le `/` final sont retirés avant comparaison, ce qui règle aussi `/settings/audit-log?page=2`.
- **Cas particulier supprimé.** La branche `if (key === 'import')` ne faisait que dupliquer le comportement par défaut : elle disparaît.
- **Tests.** 5 tests (`tests/inertia/settings_shell.spec.ts`) vérifient qu'une seule entrée porte les classes actives, sur `/settings/me`, `/settings/members`, une URL avec query string, une URL à slash final et une sous-page — celui de `/settings/members` échoue sur le code d'avant.
