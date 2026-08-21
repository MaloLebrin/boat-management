# 2026-06-15 — Fix BaseStatCard : badge affiche le label i18n au lieu du nom de l'enum (#31)

**Correctif — BaseStatCard**

Le badge affiché en haut à droite de chaque stat-card affichait le nom brut de l'enum (`neutral`, `info`, `success`, `warning`) au lieu d'un libellé localisé. Ajout des clés `common.tone.*` dans `resources/lang/{fr,en}/common.json` et utilisation de `t('common.tone.' + tone)` dans `BaseStatCard.vue`.
