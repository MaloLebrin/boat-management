# 2026-07-09 — [#331] Offre modulaire 4/5 : UI page pricing + réglages facturation

Exposition des modules add-ons à l'utilisateur : grille publique et gestion in-app.

- **Page pricing publique** : nouvelle section `PricingModulesSection.vue` (2 modules, prix lus depuis `MODULE_PRICES`, « disponibles sur Pro / inclus dans Entreprise »), alimentée par `buildPricingPageData` (clés `marketing.pricing2.modules_*`).
- **Réglages > Facturation** : nouveau composant `SettingsBillingModules.vue` (extrait pour garder l'onglet < 250 lignes) — liste les modules avec badge d'état (`Offert` pour `granted`, `Actif` pour `subscription`, `Inclus` en Entreprise) ; un abonné Pro peut **activer/résilier** un module. La page passe `activeModules` (module + source).
- **Backend** : endpoints `POST`/`DELETE /settings/billing/module` (`BillingController.addModule`/`removeModule`, validator `moduleActionValidator`) ; guards « Pro + abonnement actif » ; `StripeService.addSubscriptionItem`/`removeSubscriptionItem` (item ajouté/retiré → le webhook #330 réconcilie la base). `OrganizationModuleService.listWithSource`/`findSubscriptionModule`.
- **Garde d'idempotence** : `addModule` court-circuite (`hasModule`) si le module est déjà actif — évite qu'un double-clic ne crée un second item Stripe non résiliable depuis l'UI (flash `moduleAlreadyActive`).
- **i18n** : `settings.billing.modules.*` et `marketing.pricing2.modules_*` (en + fr), messages flash `moduleAdded`/`moduleRemoved`/`moduleNotFound`/`moduleAlreadyActive`.
- **Tests** : fonctionnels (prop `activeModules`, guards add/remove, idempotence, frontière Stripe non configuré), Vitest (`SettingsBillingModules` selon plan/abonnement/source, `PricingModulesSection`).
