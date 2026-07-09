# Changelog

Toutes les nouvelles fonctionnalités, améliorations et correctifs notables.  
Format : `[date] — Description`. Les entrées les plus récentes sont en haut.

## 2026-07-09 — Refonte marketing « Stripe-like » : home + tarifs (animations, canvas, configurateur)

Refonte visuelle des pages **home** et **tarifs** pour mettre en scène l'offre modulaire (#327) et apporter une couche d'animation façon stripe.com, dans le respect de la charte nautique (hero sombre navy + corps cream).

- **Infrastructure d'animation réutilisable** :
  - `GradientMeshCanvas.vue` (`inertia/components/marketing/canvas/`) — dégradé multicolore animé en fond de hero (canvas 2D). Variantes `navy`/`sunset`/`ocean`.
  - `ParticleNetworkCanvas.vue` — réseau de nœuds reliés, réactif à la souris (évoque une flotte connectée).
  - Composables `use_count_up.ts` (compteurs incrémentés au scroll), `use_tilt.ts` (cartes 3D inclinables + parallaxe) et `use_tween_number.ts` (nombre qui « roule » à chaque changement).
  - Utilitaires CSS : `.text-gradient-animated` (titres highlight en dégradé animé), `.glow-border` (bordure conique rotative sur les cartes mises en avant), `.float-slow` (flottement du mockup hero), `.stagger` (entrée en cascade des cartes au scroll).
  - Tous **SSR-safe** (accès `window`/canvas uniquement `onMounted`), avec pause hors-écran (`IntersectionObserver`) + onglet caché (`visibilitychange`), `devicePixelRatio` plafonné à 2, et **fallback statique / animations coupées** sous `prefers-reduced-motion`.
- **Home** : hero sombre navy + gradient mesh, mock produit en carte 3D ; nouvelle section **`HomeModularOfferSection`** (socle Pro + 2 modules add-ons avec prix) ; tilt sur les mockups des features ; compteurs animés (`HomeStatValue`) sur la stats band et les métriques du case study ; réseau de particules en fond du CTA final.
- **Tarifs** : hero sombre + gradient mesh ; nouveau **configurateur interactif `PricingConfigurator`** (socle Pro + toggles Location/CRM & Facturation → **total et économie annuelle recalculés en direct**, comparaison Enterprise) ; le tableau détaillé marque désormais les capacités issues des modules via un badge **« Add-on »** (nouveau groupe « Modules add-ons »). La grille `PricingModulesSection` est absorbée par le configurateur.
- **`BaseButton`** : ajout de la variante `outline` (type honnête avec `ctaVariant` produit par le controller).
- **Prix** lus depuis `PLAN_PRICES` / `MODULE_PRICES` (`shared/types/plan.ts`) via `MarketingController` — aucune valeur en dur.
- **i18n** (en + fr) : `home.modularOffer.*`, `pricing2.config_*`, `pricing2.table_modules_*` / `table_addon_badge`.
- **Couche d'animation enrichie** : titres highlight en dégradé animé, bordure lumineuse rotative sur le tier Pro / la carte récap du configurateur / le socle de l'offre modulaire, flottement du mockup hero, entrée staggerée des cartes, total du configurateur qui « roule ». Correction au passage : l'entrée `fadeUp` (`fill: both`) du mockup hero écrasait le `transform` du tilt (séparation entrée / flottement / tilt sur des divs imbriqués).
- **Tests** : Vitest configurateur (total mensuel/annuel, toggles, économie), `HomeStatValue` (parsing), montage des canvas sans erreur, `HomeModularOfferSection` ; suites marketing existantes mises à jour.
- **Doc** : `inertia/css/ANIMATIONS.md` complété (canvas, composables, utilitaires CSS).

## 2026-07-09 — Offre modulaire : correctifs post-revue (collision de prop + erreur Stripe)

Deux correctifs sur l'offre modulaire (#327), issus de la revue.

- **Collision de prop Inertia sur `/settings/billing`** : la page rendait `activeModules: {module, source}[]`, écrasant la prop partagée `activeModules: PlanModule[]` (chaînes) du middleware que `usePlan()`/la nav consomment. Sur cette page, les quotas issus d'un module retombaient à tier-only → liens Clients/Factures/Périodes tarifaires masqués à tort. La prop de page est renommée `orgModules` (controller + `billing.vue` + `SettingsBillingTab`). Test : la page expose `orgModules` (objets) **et** la prop partagée `activeModules` (chaînes) intacte.
- **Erreur Stripe non gérée au retrait de module** : `removeModule` pouvait lever un 500 si une requête concurrente avait déjà retiré l'item (`resource_missing`) — asymétrie avec l'ajout, protégé par une clé d'idempotence. `handleModuleError` intercepte désormais toute `Stripe.errors.StripeError` → flash `moduleActionFailed` (en + fr) + redirection. Test : un échec Stripe au retrait renvoie un flash, pas un 500.

## 2026-07-09 — [#332] Offre modulaire 5c : grandfathering + idempotence Stripe

Dernier lot du cycle de vie (#332), qui clôt l'épic #327.

- **Commande Ace** `modules:grant-enterprise` (`commands/grant_enterprise_modules.ts`) : accorde tous les modules add-ons en `source = 'granted'` aux organisations Enterprise existantes (grandfathering — aucune ne perd de fonctionnalité). Logique dans `OrganizationModuleService.grantModulesToEnterpriseOrgs` (idempotente, ne requalifie pas une ligne `subscription` existante). À lancer une fois au déploiement.
- **Idempotence Stripe de bout en bout** : `StripeService.addSubscriptionItem` passe une clé d'idempotence (`add-module:{subscriptionId}:{priceId}`, extraite dans `moduleIdempotencyKey`) — ferme la fenêtre de concurrence résiduelle que le garde applicatif `hasModule` (#331) ne couvre pas. Deux ajouts simultanés du même module ne créent qu'un item facturé.
- **Doc** : `docs/billing-and-quotas.md` §1.1 (résiliation, idempotence, procédure de rollout).
- **Tests** : commande/service (modules accordés aux Enterprise uniquement, idempotence, préservation d'une ligne `subscription`), clé d'idempotence déterministe (unit).

## 2026-07-09 — [#332] Offre modulaire 5b : accès résiduel en lecture seule

Après résiliation du module CRM & Facturation, les données existantes restent **consultables en lecture seule** (obligation légale pour les factures émises) mais la création/édition est bloquée.

- **Séparation lecture/écriture** dans `ClientsController` et `InvoicesController` : `loadOrgForWrite` (exige le module actif → `store`/`update`/`destroy`/`send`/`convert`/…) et `loadOrgForRead` (autorise si module actif **ou** données existantes → `index`/`show`/`downloadPdf`/`exportData`). Le PDF d'une facture émise et l'export RGPD d'un client restent accessibles.
- **`QuotaService.canManageClients`** (booléen, symétrie avec `canManageInvoices`) ; **`ClientService.hasAnyForOrg`** / **`InvoiceService.hasAnyForOrg`**.
- **Frontend** : prop `readOnly` sur `clients/index`, `clients/show`, `invoices/index`, `invoices/show` ; masque les boutons Ajouter/Éditer et affiche un bandeau « lecture seule ». i18n `clients.readOnlyNotice` / `invoices.readOnlyNotice` (en + fr).
- **Changement de comportement assumé** : une org sans le module mais avec des factures peut désormais télécharger leurs PDF (accès résiduel) — test `invoice_pdf_email` mis à jour en conséquence.
- **Tests** : lecture autorisée avec données / refusée sans données ni module ; écriture bloquée malgré des données ; retour au plein contrôle si le module est (ré)accordé.

## 2026-07-09 — [#332] Offre modulaire 5a : notifications de résiliation de module

Premier lot du cycle de vie (#332). Quand un module add-on souscrit disparaît de l'abonnement (résiliation, downgrade, annulation), les admins de l'organisation sont notifiés.

- **Event** `OrganizationModuleDeactivated` (`app/events/`, sur le modèle de `OrganizationPlanDowngraded`), dispatché **après commit** par `SubscriptionService` pour chaque module retiré. `OrganizationModuleService.reconcileSubscriptionModules` renvoie désormais `{ removed: PlanModule[] }`.
- **Listener** `on_organization_module_deactivated` : notification in-app (`module.deactivated`) + email transactionnel (dédupliqué) à chaque admin. Enregistré dans `start/events.ts`.
- **Email** : template `resources/views/emails/module_deactivated.edge` + `EmailQueueService.sendModuleDeactivatedNotification`.
- **i18n** : `notifications.messages.module.{names,deactivated}` (en + fr) ; type `module.deactivated` ajouté à `NotificationType`.
- **Tests** : event dispatché quand un module est retiré (pas sinon) ; listener notifie chaque admin (pas les membres) et enqueue l'email avec le bon module.

## 2026-07-09 — [#331] Offre modulaire 4/5 : UI page pricing + réglages facturation

Exposition des modules add-ons à l'utilisateur : grille publique et gestion in-app.

- **Page pricing publique** : nouvelle section `PricingModulesSection.vue` (2 modules, prix lus depuis `MODULE_PRICES`, « disponibles sur Pro / inclus dans Entreprise »), alimentée par `buildPricingPageData` (clés `marketing.pricing2.modules_*`).
- **Réglages > Facturation** : nouveau composant `SettingsBillingModules.vue` (extrait pour garder l'onglet < 250 lignes) — liste les modules avec badge d'état (`Offert` pour `granted`, `Actif` pour `subscription`, `Inclus` en Entreprise) ; un abonné Pro peut **activer/résilier** un module. La page passe `activeModules` (module + source).
- **Backend** : endpoints `POST`/`DELETE /settings/billing/module` (`BillingController.addModule`/`removeModule`, validator `moduleActionValidator`) ; guards « Pro + abonnement actif » ; `StripeService.addSubscriptionItem`/`removeSubscriptionItem` (item ajouté/retiré → le webhook #330 réconcilie la base). `OrganizationModuleService.listWithSource`/`findSubscriptionModule`.
- **Garde d'idempotence** : `addModule` court-circuite (`hasModule`) si le module est déjà actif — évite qu'un double-clic ne crée un second item Stripe non résiliable depuis l'UI (flash `moduleAlreadyActive`).
- **i18n** : `settings.billing.modules.*` et `marketing.pricing2.modules_*` (en + fr), messages flash `moduleAdded`/`moduleRemoved`/`moduleNotFound`/`moduleAlreadyActive`.
- **Tests** : fonctionnels (prop `activeModules`, guards add/remove, idempotence, frontière Stripe non configuré), Vitest (`SettingsBillingModules` selon plan/abonnement/source, `PricingModulesSection`).

## 2026-07-09 — [#330] Offre modulaire 3/5 : abonnements Stripe multi-items (socle + add-ons)

Le billing Stripe gère désormais des abonnements **multi-items** : un item de base (tier Pro/Enterprise) + un item par module add-on. Aucun changement visible tant qu'aucun module n'est vendu ; brique consommée par l'UI (#331).

- **Env** : 4 variables `STRIPE_MODULE_{CHARTER,CRM_INVOICING}_{MONTHLY,ANNUAL}_PRICE_ID` (`start/env.ts`, `.env.example`). `.env.test` fixe `STRIPE_SECRET_KEY=` (vide, aucun appel réseau) + des IDs `price_test_*`.
- **`StripeService`** : `priceIdForModule(module, interval)` et `moduleForPriceId(priceId)` (mapping inverse) ; `createCheckoutSession` accepte désormais `priceIds: string[]` (line items multiples).
- **`BillingController.checkout`** : payload `CheckoutPayload.modules?` (validator `vine.array` + guard `ModulesRequireProPlanError` — modules vendables uniquement sur Pro), construit `[prix du tier, ...prix des modules]`.
- **`SubscriptionService`** : `resolveTierItem` (l'item du tier n'est plus forcément à l'index 0) fixe plan/bornes/intervalle ; `desiredModulesFrom` mappe les items de module ; réconciliation via `OrganizationModuleService.reconcileSubscriptionModules` dans la transaction de sync (retire les modules `subscription` absents, ajoute les désirés, **ne touche jamais un module `granted`**). Un abonnement annulé retire tous les modules `subscription`.
- **Doc** : `docs/billing-and-quotas.md` §1.1, §4.5 bis, §8. **Tests** : mapping (unit), réconciliation multi-items — activation/retrait/annulation/ordre des items/module offert préservé (fonctionnels), guard checkout (fonctionnels).

## 2026-07-08 — [#329] Offre modulaire 2/5 : résolution des quotas effectifs (tier + modules)

Les capacités clients/pricing/invoices peuvent désormais venir du tier **ou** d'un module add-on actif. Aucun changement visible tant qu'aucun module n'est souscrit.

- **Helper pur partagé** `shared/helpers/plan.ts` : `resolveEffectiveQuotas(tier, modules)` — quotas du tier fusionnés avec les `MODULE_FLAGS` des modules actifs ; seule source de vérité back/front.
- **Backend** : `OrganizationModuleService.getEffectiveQuotas(org)` ; les 5 checks `QuotaService` concernés (`assertCanManageClients`, `canManagePricing`, `assertCanManagePricing`, `canManageInvoices`, `assertCanManageInvoices`) deviennent **async** et passent par les quotas effectifs (7 sites d'appel mis à jour). Les autres checks restent tier-only tant qu'aucun module ne les accorde.
- **Props Inertia** : nouvelle prop partagée `activeModules: PlanModule[]` (middleware Inertia), à côté de `currentPlan`.
- **Frontend** : nouveau composable `use_plan.ts` (`currentPlan`, `activeModules`, `effectiveQuotas` — mêmes règles de validation que le backend) ; `use_nav_sections.ts` consomme les quotas effectifs au lieu de lire `PLAN_LIMITS` directement.
- **Tests** : unit (résolution pure, non-mutation de `PLAN_LIMITS`), fonctionnels (gating Pro sans module → redirection ; Pro + module → accès ; module `granted` équivalent ; prop `activeModules` exposée), Vitest nav (modules → entrées Clients/Factures/Périodes tarifaires).

## 2026-07-08 — [#328] Offre modulaire 1/5 : modèle de données des modules

Socle du système de modules add-ons (épic #327). Aucun changement de comportement utilisateur : cette brique est consommée par les lots suivants (résolution des quotas effectifs #329, sync Stripe #330).

- **Types partagés** (`shared/types/plan.ts`) : `PlanModule` (`charter` | `crm_invoicing`), `ModuleSource` (`subscription` | `granted`), `PLAN_MODULES`, `MODULE_PRICES` (15 €/mois, 12 €/mois en annuel), `MODULE_FLAGS` (mapping module → flags de `PlanQuotas` accordés : `charter` → `canManagePricing` ; `crm_invoicing` → `canManageClients` + `canManageInvoices`), garde `isPlanModule`.
- **Migration** `create_organization_modules_table` : `organization_id` (FK cascade), `module`, `source` (défaut `subscription` ; `granted` = offert/grandfathering), `stripe_subscription_item_id` nullable, contrainte unique (`organization_id`, `module`), CHECK sur `module` et `source`.
- **Modèle** `OrganizationModule` + relation `Organization.modules` (hasMany).
- **Service** `OrganizationModuleService` : `getActiveModules`, `hasModule`, `grantModule` (idempotent, ne requalifie jamais la `source` d'une ligne existante), `revokeModule` (ne retire que les modules `subscription` par défaut — un module offert survit à la sync Stripe).
- **Tests** : taxonomie des modules (unit), service + contraintes DB + cascade (fonctionnels).

## 2026-07-08 — Analyse : proposition d'offre modulaire (socles + add-ons)

Ajout de `docs/offre-modulaire.md` : catalogue des fonctionnalités découpées en modules (socle commun, Location, CRM Clients, Facturation, IA, Marina, Navigation & Bord, Marque blanche, Data & Conformité), comparaison de trois scénarios commerciaux (tiers redécoupés / hybride socles + add-ons / 100 % à la carte) et recommandation : lancer une V1 hybride avec deux modules déjà gatés (**Location** 15 €/mois et **CRM & Facturation** 15 €/mois) sur le socle Pro, Enterprise conservé en bundle tout inclus. Document d'analyse uniquement — aucun changement de code ni de gating.

## 2026-07-08 — [#323] Historique de maintenance avec des filtres

Refonte de la page `/maintenance/history` : le filtrage et la pagination passent **côté serveur** (pattern org-scopé de `boats`/`clients`), et de nouveaux filtres sont ajoutés.

- **Filtres** : recherche texte (titre **ou** nom de bateau), **bateau**, **sujet**, **plage de dates** (`performedAt` de/à), tri **plus récent / plus ancien**, avec **pagination**.
- **Query params** de `GET /maintenance/history` : `q`, `subject`, `boatId`, `dateFrom`, `dateTo`, `sort` (`recent`|`oldest`), `page`, `perPage`. Normalisés via `shared/helpers/query.ts` (échappement `LIKE`, clamp pagination, validation des dates `yyyy-MM-dd`, `boatId` hors org ignoré).
- **Service** : `BoatMaintenanceService.getHistoryForOrg(user, query)` renvoie désormais `{ events: { data, meta }, stats, filters, boatOptions }`. Les **stats** (événements, pièces, bateaux, coût total) sont calculées sur **l'ensemble filtré complet**, pas seulement la page courante.
- **Types partagés** : `MaintenanceHistoryFilters`, `MaintenanceHistorySort`, `MaintenanceHistoryStats`, `MaintenanceBoatOption`, `MaintenanceHistoryPaginated` dans `shared/types/maintenance.ts`.
- **Frontend** : `inertia/pages/maintenance/history.vue` (orchestrateur) + nouveaux composants `MaintenanceHistoryToolbar.vue` (barre de filtres, recherche debounced) et `MaintenanceHistoryTimeline.vue` (timeline groupée par mois), navigation via `router.get`.
- **i18n** : bloc `maintenance.history.filterBar.*` (en + fr).

## 2026-07-08 — [#313] Proposer l'ajout à la liste d'achats/réparations depuis un équipement dégradé

Dernier lot de l'épic « Actions équipement » (#310/#311/#312 déjà livrés). Sur l'onglet Équipement, une carte d'équipement en statut ≠ `ok` propose un bouton « Ajouter à la liste » qui ouvre le modal d'action **pré-rempli** (type/id d'équipement, libellé, `actionType` suggéré). Aucune création silencieuse : le modal sert de confirmation. Aucune migration, aucun nouvel endpoint.

- **Helper partagé** : `shared/helpers/equipment_action.ts` → `suggestEquipmentActionType(status)` (`to_replace`/`expired → 'to_replace'`, `to_check → 'to_repair'`).
- **Modal** : `BoatEquipmentActionModal.vue` gagne une prop optionnelle `prefill` (rétro-compatible) et soumet le lien via inputs cachés `equipmentType`/`equipmentId` (déjà acceptés par le validator #310).
- **Cartes** : `BoatGenericEquipmentCard.vue` / `BoatSafetyEquipmentCard.vue` — bouton contextuel sur les items dégradés (gaté `canManageActions`) + emit `addToActions`. `BoatShowTabEquipment.vue` héberge le modal ; `BoatShowTabContent.vue` propage `canManageEquipmentActions`.
- **Type** `EquipmentActionPrefill` (`inertia/types/boat_show.ts`). i18n `equipmentActions.prefill.addButton` (fr + en).
- **Tests** : Vitest (cartes : visibilité selon statut + payload émis ; modal : seed + inputs cachés ; helper). La persistance du lien est déjà couverte par `boat_equipment_actions.spec.ts` (« POST with equipment reference »).
- **Doc** : `docs/domain/equipment-actions.md` § « Origine équipement ».

## 2026-07-08 — [#311] Actions équipement depuis une inspection de location (« Défauts constatés »)

Permet, sur l'écran d'inspection (checkout/checkin), de tracer les défauts constatés en créant des `BoatEquipmentAction` liées à l'inspection. Exploite la colonne `inspection_id` posée en #310 (aucune migration).

- **Service** (`app/services/boat_equipment_action_service.ts`) : `createFromInspection(user, boat, inspection, payload)` (boat/org **déduits**, `inspection_id` positionné, statut `pending`) et `listForInspection(user, boat, inspection)`. Le `inspection_id` est désormais exposé (`BoatEquipmentActionRow` + transformer + colonnes de `select`).
- **Controller** (`BoatInspectionsController`) : `storeEquipmentAction` / `destroyEquipmentAction`, redirigeant vers l'écran d'inspection. La cohérence bateau ↔ réservation ↔ inspection est garantie par la chaîne de résolution imbriquée (un id d'un autre bateau/org ne crée rien).
- **Routes** : `POST`/`DELETE /boats/:boatId/reservations/:reservationId/inspections/:inspectionId/equipment-actions(/:actionId)`. Ajout du matcher numérique `actionId` (`start/routes/_matchers.ts`) — corrige aussi un 500 latent sur les routes équipement de #312.
- **ACL** : ajout via `EquipmentActionPolicy.create` (membre), suppression `…delete` (admin).
- **Frontend** : section « Défauts constatés » (`InspectionDefects.vue` + `InspectionDefectModal.vue`) montée dans `InspectionPanel.vue` ; l'édition/statut restent dans l'onglet équipement du bateau (#312). i18n `equipmentActions.defects.*` (fr + en).
- **Tests** : fonctionnels `tests/functional/boats/inspection_equipment_actions.spec.ts` (création + boat_id déduit, IDOR bateau/org, listing, suppression admin, refus membre) ; Vitest `tests/inertia/inspection_defects.spec.ts`.
- **Doc** : `docs/domain/equipment-actions.md` § « Origine inspection ».

## 2026-07-07 — [#312] Interface des actions sur équipements (achats/réparations)

Ajout de l'interface utilisateur pour visualiser et gérer les actions sur équipements depuis la fiche bateau, en tant que nouvel onglet "Achats/réparations".

- **Backend** : branchement de `BoatEquipmentActionService.listForBoat()` dans `BoatsController.show()` avec les permissions `canManageEquipmentActions` et `canDeleteEquipmentActions` via `EquipmentActionPolicy`.
- **Transformer** : ajout de `equipmentActions`, `canManageEquipmentActions`, `canDeleteEquipmentActions` dans `BoatManageContext` et `toManageProps()`.
- **Page** : nouvel onglet `equipmentActions` dans `inertia/pages/boats/show.vue` avec clé de tab correspondante pour le paramètre URL `?tab=equipmentActions`.
- **Composants** :
  - `inertia/components/boats/equipment-actions/BoatEquipmentActionCard.vue` — carte affichant une action avec badges type/statut, coûts, boutons édition/suppression.
  - `inertia/components/boats/equipment-actions/BoatEquipmentActionModal.vue` — modal création/édition avec champs label, actionType, notes, estimatedCost (+ actualCost et status en édition).
  - `inertia/components/boats/show/tabs/BoatShowTabEquipmentActions.vue` — onglet avec filtres par statut et type, liste des actions, empty state.
- **Types frontend** : ré-export des types depuis `shared/types/equipment_action.ts` dans `inertia/types/boat_show.ts`.
- **i18n** : clé `boats.show.tabs.equipmentActions` (FR: "Achats/réparations", EN: "Purchases/repairs"), clés filtres `equipmentActions.filters.*`.
- **Tests Vitest** : `boat_equipment_action_card.spec.ts`, `boat_equipment_action_modal.spec.ts`, `boat_show_tab_equipment_actions.spec.ts`.

## 2026-07-07 — [#310] Actions sur équipements (pièces à acheter/remplacer/réparer)

Nouvelle entité `BoatEquipmentAction` pour tracer les actions à mener sur les équipements d'un bateau (acheter, remplacer, réparer) avec suivi de statut et coûts.

- **Migration** : `1816000000000_create_boat_equipment_actions_table.ts` avec contraintes CHECK sur `action_type`, `status`, `equipment_type`.
- **Modèle** : `app/models/boat_equipment_action.ts` avec `belongsTo Boat` et `belongsTo User` (créateur).
- **Types partagés** : `shared/types/equipment_action.ts` (`EquipmentActionType`, `EquipmentActionStatus`, `EquipmentReferenceType`, payloads, `BoatEquipmentActionRow`).
- **Capacités Bouncer** : `equipmentActions.view/create/edit` (membre) + `equipmentActions.delete` (admin only) dans `shared/types/permissions.ts`.
- **Service** : `app/services/boat_equipment_action_service.ts` avec méthodes `listForBoat`, `createForBoat`, `updateForBoat`, `deleteForBoat`. Règle métier : statut `done` nécessite `actual_cost` renseigné, `resolved_at` positionné automatiquement.
- **Policy** : `app/policies/equipment_action_policy.ts` étendant `OrgScopedPolicy`.
- **Controller** : `app/controllers/boat_equipment_actions_controller.ts` (store/update/destroy), réponses par redirection Inertia.
- **Routes** : `POST/PUT/DELETE /boats/:boatId/equipment-actions[/:actionId]` dans `start/routes/boats.ts`.
- **i18n** : `resources/lang/{fr,en}/equipmentActions.json` + `flash.equipmentActions.*`.
- **Documentation** : `docs/domain/equipment-actions.md`, mise à jour `docs/data/schema.md`.

## 2026-07-06 — [#276] CRM : conformité RGPD (consentement, anonymisation, export)

Lot 4/4 de l'epic CRM léger (#108) — **clôt l'epic**. Ajoute le suivi du consentement, le droit à l'effacement (anonymisation) et la portabilité (export) sur la fiche client.

- **Consentement** : champ `gdprConsent` (booléen) dans les validators/payloads create & update ; `ClientService` pose/efface `gdpr_consent_at` (posé une seule fois, conservé si déjà donné). Case à cocher dans `ClientForm.vue`, état affiché sur la fiche.
- **Anonymisation** (`ClientService.anonymize`, idempotente, transactionnelle) : neutralise les PII (nom → « Client anonymisé », email/téléphone/adresse/permis/notes → `null`), supprime les documents (Cloudinary + quota), et anonymise le **snapshot texte** des réservations liées tout en conservant `client_id` (intégrité référentielle). Nouvelle colonne `clients.anonymized_at` (migration `1815000000000`) : marque l'état, verrouille la ré-édition (`ClientAlreadyAnonymizedError` → flash), masque les actions et affiche un badge « Anonymisé ».
- **ACL** : capacité `clients.anonymize` **admin-only** (`shared/types/permissions.ts`, `ClientPolicy.anonymize`).
- **Export RGPD** (portabilité) : `GET /clients/:id/export` renvoie un JSON (client + historique réservations + métadonnées documents) en pièce jointe ; `ClientService.exportData`.
- **Routes** : `POST /clients/:id/anonymize`, `GET /clients/:id/export`.
- **i18n** : `clients.gdpr.*` (en + fr) + `flash.clients.anonymized` / `alreadyAnonymized`.
- **Tests** : fonctionnels `client_anonymize.spec.ts` (PII, snapshot réservation, idempotence, blocage ré-édition, admin-only, IDOR, gating) et `client_gdpr.spec.ts` (consentement create/update, export) ; Vitest case de consentement `ClientForm`.

## 2026-07-06 — [#274] CRM : documents clients (copie permis, pièce d'identité)

Lot 2/4 de l'epic CRM léger (#108). Ajoute la gestion de documents rattachés à une fiche client, en réutilisant le sous-système média polymorphe existant.

- **Média** : `'client'` ajouté à `MEDIA_ENTITY_TYPES` (`shared/constants/media.ts`) ; nouveau dossier `CloudinaryFolders.clientDocuments(orgSlug, clientId)`.
- **Contrôleur** : nouveau `app/controllers/client_media_controller.ts` (`storeDocument` / `destroy` / `downloadMedia`) — org-scopé, gaté plan Enterprise, ACL `ClientPolicy.update`, réutilise `mediaService.upload/deleteForEntity/getForEntity` et `storeBoatDocumentValidator`.
- **Routes** : `POST /clients/:id/documents`, `DELETE /clients/:id/media/:mediaId`, `GET /clients/:id/media/:mediaId/download`.
- **Cleanup** : `ClientService.delete(org, client)` supprime désormais les médias (Cloudinary + quota stockage) via `mediaService.deleteAllForEntity` avant de supprimer la ligne.
- **Fiche client** : le contrôleur `show` charge et expose les documents (`toMediaRow`, nouveau `app/transformers/media_row_transformer.ts`) + un flag `canManage`.
- **Frontend** : section « Documents » sur la fiche (`inertia/components/clients/ClientDocuments.vue` + `ClientDocumentAddModal.vue`) — upload multipart, liste, téléchargement, suppression confirmée.
- **i18n** : clés `clients.documents.*` (en + fr) + `flash.clients.documentAdded` / `documentDeleted`.
- **Tests** : fonctionnels `tests/functional/clients/client_documents.spec.ts` (upload, liste, suppression + cleanup Cloudinary, IDOR, refus non-Enterprise, download) ; Vitest `tests/inertia/client_documents.spec.ts`.

## 2026-07-06 — [#281] Mutualise les helpers de normalisation de requête des listes org-scopées

Les helpers de normalisation des paramètres de liste (recherche / tri / pagination) étaient dupliqués verbatim entre `client_service` et `boat_list_service` — toute correction d'edge-case (`NaN`, bornes de pagination) risquait une divergence silencieuse.

- **`shared/helpers/query.ts`** : ajoute les helpers génériques `toTrimmedStringOrUndefined`, `toIntegerOrUndefined` (jamais `NaN`), `clampInt` et `normalizeEnum(value, allowed, fallback)` (validation d'énumération de tri / direction / statut, avec fallback hors-liste type `''`).
- **`app/services/client_service.ts`** et **`app/services/boat_list_service.ts`** consomment désormais ces helpers partagés (zéro duplication) ; les listes d'options autorisées restent locales à chaque service. Comportement inchangé.
- **Tests** : unitaires `tests/unit/helpers/query.spec.ts` (couvre les 4 helpers) ; non-régression des listes (`clients`, `boats`) verte.

## 2026-07-06 — [#279] Garde contre un utilisateur sans organisation sur les routes gatées

Un utilisateur authentifié dont `organizationId` est `null` (course à l'onboarding, org supprimée, fixture) qui atteignait une route gatée déclenchait un **500** : les contrôleurs chargent `user.organization` puis appellent `quotaService.assertCan*(user.organization)`, et `PLAN_LIMITS[null.plan]` levait une `TypeError` non gérée.

- **`app/services/quota_service.ts`** : les méthodes `assertCan*` / `can*` acceptent désormais `Organization | null` et passent par une garde privée `#assertOrganization()` (assertion TypeScript) qui lève une `UserNotInOrganizationError` métier si `org` est `null` — avant tout accès à `PLAN_LIMITS`.
- **`app/exceptions/handler.ts`** : `UserNotInOrganizationError` est traitée en flash + **redirection vers `/`** (au lieu d'un 500) et n'est plus journalisée comme erreur serveur. Bénéficie aussi aux `port_service`/`boat_hull_service` qui levaient déjà cette erreur sans traitement dédié.
- **i18n** : clé `flash.organization.required` (en/fr).
- **Tests** : `tests/functional/organization/no_organization_guard.spec.ts` — un user `organizationId = null` sur `/clients`, `/boats/:id/export/*.csv` et `/ai/chat` est redirigé vers `/` (pas de 500).

## 2026-07-06 — [#278] Recherche : échappe les métacaractères LIKE (`%` et `_`)

Les services de recherche interpolaient la saisie utilisateur dans un motif `whereILike('...', \`%${q}%\`)`sans échapper les métacaractères LIKE. Conséquence :`q = '%'`renvoyait **toutes** les lignes de l'org (motif`%%%`) et `q = '\_'` matchait tout enregistrement d'au moins un caractère — contrat de recherche cassé.

- **Helper partagé** : `shared/helpers/query.ts` → `escapeLike(input)` échappe `\`, `%` et `_` (PostgreSQL utilise `\` comme caractère d'échappement par défaut, pas de clause `ESCAPE` nécessaire).
- **Appliqué** à `app/services/client_service.ts` (recherche `first_name`/`last_name`/`email`) et `app/services/boat_list_service.ts` (recherche `name`/`registration_number`).
- **Tests** : unitaires `tests/unit/helpers/query.spec.ts` (échappement de `%`, `_`, `\`) + fonctionnels `tests/functional/search/like_escaping.spec.ts` (`q='%'` ne renvoie que les lignes contenant littéralement `%` ; `q='A_B'` ne matche pas `AXB`).

## 2026-07-06 — [#280] Corrige le 500 sur un paramètre de route `:id` non numérique

Un paramètre de route d'identifiant non numérique (`PUT /clients/not-a-number`, `GET /boats/abc`…) produisait un **500** au lieu d'un **404** : les contrôleurs font `Number(params.id)`, `Number('not-a-number') = NaN` était transmis à `where('id', NaN)` → PostgreSQL levait `invalid input syntax for type integer: NaN`, exception non attrapée (pas un `NotFoundError`).

- **Routing** : nouveau module `start/routes/_matchers.ts` (importé en premier dans `start/routes.ts`) enregistre un **matcher numérique global** (`router.where(param, router.matchers.number())`) pour tous les paramètres de route d'identifiant en base (`id`, `boatId`, `reservationId`, `engineId`, `portId`, `mediaId`, `partId`, `logId`, `itemId`, `pontoonId`, `mouillageId`, `inspectionId`, `sheetId`, `sailId`, `taskId`, `stayId`, `memberId`, `incidentId`, `entryId`, `documentId`, `eventId`, `certId`). Un segment non numérique ne matche plus la route → **404 natif**. Les paramètres non numériques (`:token` partage simulateur, `:name` preview d'email) sont volontairement exclus.
- **Tests** : `tests/functional/routing/numeric_id_matcher.spec.ts` — `:id`/`:boatId` non numérique → 404 sur les ressources principales (boats, clients, crew), et un `:id` numérique valide continue de matcher la route (pas de sur-blocage).

## 2026-07-06 — [#291] Corrige les retours de code review sur la signature du contrat de location

Corrige trois problèmes relevés en review sur #291 :

- `rental_contracts_controller.ts#send` : `markSent()` (validation de la transition `draft → sent`) s'exécute désormais **avant** l'envoi de l'email — évite d'envoyer un email si la transition est invalide
- `rental_contracts_controller.ts#sign` : `RentalContractService.assertCanAttachSignedDocument()` (nouvelle méthode) valide la transition **avant** de supprimer l'ancien document Cloudinary et d'uploader le nouveau — évite un `Media` orphelin (DB + Cloudinary) si le contrat est encore `draft`
- Le contrat signé n'est plus exposé via l'URL Cloudinary publique brute (`mediaSecureUrl`) : nouvelle route authentifiée `GET .../contract/signed-document` (`downloadSignedDocument`, calquée sur `downloadPdf`/`BoatMediaController#downloadMedia`) qui télécharge le fichier via `private_download_url` ; le transformer expose `hasSignedDocument: boolean` à la place
- `send_rental_contract_email.ts` : remplace le ternaire `locale === 'fr' ? ... : ...` par `i18n.t('rentalContracts.email.*')` (clés ajoutées en/fr) pour le sujet et le corps du texte de l'email

- **Tests** : `tests/functional/boats/rental_contracts.spec.ts` — non-envoi d'un second email sur transition invalide, téléchargement du document signé authentifié, redirection si aucun document signé

## 2026-07-06 — [#291] Location 3/3 : signature du contrat de location (upload du PDF signé)

**Troisième et dernière PR de l'epic #283 (Contrats de location & états des lieux)**, après #290. Finalise le cycle de vie du contrat : upload du contrat signé (scanné/PDF), rattaché à `rental_contracts.media_id` (colonne réservée par #290), avec passage automatique au statut `signed` + `signed_at`. La signature électronique intégrée reste hors périmètre (mentionnée comme optionnelle dans l'issue).

- **Backend** :
  - `shared/constants/media.ts` : nouveau type d'entité média `'rentalContract'` ; `CloudinaryFolders.rentalContractSignedDocument` (`app/services/cloudinary_service.ts`)
  - `app/models/rental_contract.ts` : relation `belongsTo(Media)`
  - `app/services/rental_contract_service.ts` : `attachSignedDocument()` remplace l'ancien `markSigned()` sans preuve — attache le `media_id` uploadé, statut `sent → signed` (ou remplacement du document si déjà `signed`, sans réinitialiser `signed_at`) ; `deleteForReservation()` nettoie désormais le document signé (Cloudinary + quota) à la suppression du contrat
  - `app/validators/rental_contract.ts` (nouveau) : `storeSignedRentalContractValidator` (PDF, 20 Mo max)
  - `app/controllers/rental_contracts_controller.ts#sign` : accepte désormais un upload multipart (remplace l'ancien document si un nouveau est envoyé), délègue à `MediaService`
  - `shared/types/rental_contract.ts` / `app/transformers/rental_contract_transformer.ts` : `mediaSecureUrl`/`mediaFilename` exposés au frontend
- **Frontend** : `ContractPanel.vue` — le bouton « Marquer comme signé » est remplacé par un envoi de fichier (upload/remplacement du contrat signé) ; lien « Voir le contrat signé » une fois disponible
- **i18n** : clés `rentalContracts.actions.{uploadSigned,replaceSigned,viewSigned}` (en/fr)
- **Tests** : `tests/functional/boats/rental_contracts.spec.ts` — upload multipart (mock Cloudinary), refus si contrat encore `draft`, remplacement d'un document déjà signé, nettoyage du média à la suppression du contrat

## 2026-07-06 — [#290] Location 2/3 : contrat de location (génération PDF + statuts + envoi email)

**Deuxième PR de l'epic #283 (Contrats de location & états des lieux)**, après #289. Génère un contrat de location PDF à partir d'une réservation (bateau, client, période, conditions générales), avec un cycle de statuts `draft → sent → signed` et un envoi par email au client.

- **Base de données** : migration `1814000000000_create_rental_contracts_table.ts` — table `rental_contracts` (`organization_id`, `reservation_id` FK `boat_reservations` cascade unique — un seul contrat par réservation, `client_id` FK `clients` nullable `SET NULL`, `status` check `draft`/`sent`/`signed`, `signed_at`, `media_id` FK `media` nullable — **réservé pour #291** signature/upload du PDF signé, non exploité dans ce lot)
- **Backend** :
  - `app/models/rental_contract.ts`, `app/services/rental_contract_service.ts` (création depuis une réservation avec résolution du client CRM comme pour les devis, transitions `draft→sent`/`sent→signed`, suppression), `app/services/rental_contract_pdf_service.ts` (génération PDF avec branding org, calquée sur `invoice_pdf_service.ts`)
  - `app/exceptions/rental_contract_errors.ts`, `app/transformers/rental_contract_transformer.ts`
  - `shared/types/permissions.ts` : nouvelles capacités `rentalContracts.view/create/edit` (member) et `rentalContracts.delete` (admin-only) ; `app/policies/rental_contract_policy.ts`
  - Envoi email : `app/services/email_queue_service.ts#sendRentalContract`, `app/jobs/send_rental_contract_email.ts` (régénère le PDF dans le worker, pièce jointe), template `resources/views/emails/rental_contract.edge`
  - Routes : `GET/POST boats/:boatId/reservations/:reservationId/contract`, `GET .../contract/pdf`, `POST .../contract/send`, `POST .../contract/sign`, `DELETE .../contract`
- **Frontend** : page `boats/reservation_contract`, composants `ContractPanel`/`ContractStatusBadge`, bouton d'accès depuis `ReservationList`
- **i18n** : nouveau domaine `rentalContracts.json` (en/fr, incluant les textes du PDF), clés `flash.rentalContracts.*`, `reservations.actions.contract`
- **Tests** : `tests/functional/boats/rental_contracts.spec.ts` (CRUD, policy admin/member, unicité par réservation, transitions de statut, scoping org, téléchargement PDF), `tests/functional/boats/send_rental_contract_email_job.spec.ts` (génération PDF + envoi email avec pièce jointe)

## 2026-07-06 — [#289] Location 1/3 : états des lieux départ/retour (relevés + photos)

**Première PR de l'epic #283 (Contrats de location & états des lieux)**. Ajoute l'état des lieux de départ (`checkout`) et de retour (`checkin`) rattaché à une réservation, avec relevés (niveau carburant, heures moteur, notes) et photos.

- **Base de données** : migration `1813000000000_create_boat_inspections_table.ts` — table `boat_inspections` (`organization_id`, `reservation_id` FK `boat_reservations` cascade, `kind` check `checkout`/`checkin`, `performed_at`, `fuel_level`, `engine_hours`, `notes`), unique `(reservation_id, kind)` — un seul checkout et un seul checkin par réservation
- **Backend** :
  - `app/models/boat_inspection.ts`, `app/services/boat_inspection_service.ts` (CRUD org-scopé via la réservation), `app/validators/boat_inspection.ts`, `app/exceptions/inspection_errors.ts`, `app/transformers/boat_inspection_transformer.ts`
  - `shared/types/permissions.ts` : nouvelles capacités `inspections.view/create/edit` (member) et `inspections.delete` (admin-only) ; `app/policies/inspection_policy.ts`
  - `shared/constants/media.ts` : nouveau type d'entité média `'inspection'` ; `CloudinaryFolders.inspectionPhotos` ; actions `storeInspectionPhoto`/`destroyInspectionMedia` sur `boat_media_controller.ts`
  - Routes : `GET/POST/PUT/DELETE boats/:boatId/reservations/:reservationId/inspection(s)` + sous-routes photos
- **Frontend** : page `boats/reservation_inspection`, composants `InspectionPanel`/`InspectionPhotos`/`InspectionComparison`, bouton d'accès depuis `ReservationList`
- **i18n** : nouveau domaine `inspections.json` (en/fr), clés `flash.inspections.*`, `reservations.actions.inspection`
- **Tests** : `tests/functional/boats/inspections.spec.ts` (CRUD, policy admin/member, unicité par type, scoping org, suppression photo)

## 2026-07-06 — Permissions granulaires par capacité (admin/member)

Refactor de l'autorisation Bouncer : les 16 policies codaient en dur `before()` (bypass admin) puis `return false`/checks bruts pour chaque action. Introduction d'une taxonomie de capacités explicite (`shared/types/permissions.ts` : type `Capability`, `ROLE_PERMISSIONS: Record<OrgRole, Set<Capability>>`), sans changement de comportement (refactor pur) ni migration de base de données — le rôle reste `'admin' | 'member'` en base.

- **Backend** :
  - `shared/types/permissions.ts` : taxonomie des capacités (`boats.delete`, `members.manage`, `ai.configure`…) et mapping par rôle
  - `app/models/user.ts` : nouvelle méthode `hasPermission(orgId, capability)` ; fallback vers les capacités `member` pour un utilisateur lié à l'org via `organizationId` mais sans ligne `organization_memberships` (préserve le comportement historique des utilisateurs legacy non encore auto-réparés)
  - `app/utils/org_scoped_policy.ts` : classe de base `OrgScopedPolicy` (hors `app/policies/` pour ne pas être indexée par Bouncer) centralisant le `before()` admin et exposant `can()`/`sameOrg()`
  - Les 16 policies (`app/policies/*.ts`) migrées vers `OrgScopedPolicy` et les nouvelles capacités
  - `app/services/permission_service.ts` : `sharedProps()` pour exposer rôle + capacités résolues à Inertia
  - `app/middleware/inertia_middleware.ts` : nouvelle prop partagée `permissions`
  - `shared/types/auth.ts` supprimé (type mort, jamais peuplé côté frontend)
- **Frontend** : `inertia/composables/use_permissions.ts` — `usePermissions()` expose `role`, `isAdmin`, `isMember`, `can(capability)` à partir des props Inertia partagées
- **Comportement préservé à l'identique** : MouillagePolicy/PortPolicy restent admin-only sur create/edit/delete (pas alignés sur les autres ressources) ; `OrganizationInvitationPolicy` migrée mais toujours non branchée dans le contrôleur (qui utilise `OrganizationPolicy.manageMembers`)
- **Documentation** : `docs/domain/auth-acl.md` réécrit (section ACL) — taxonomie complète, mécanisme des Policies, exposition frontend, règles préservées
- **Tests** : `tests/unit/permissions_taxonomy.spec.ts` (invariant member ⊂ admin), `tests/integration/permissions/user_has_permission.spec.ts`, `tests/integration/permissions/policies_capabilities.spec.ts` (admin autorisé / member refusé / cross-org refusé sur plusieurs policies admin-only), `tests/inertia/use_permissions.spec.ts`

## 2026-07-06 — [#275] CRM : lien réservation ↔ client (historique + blocage blacklist)

**Lot 3/4 de l'epic CRM léger (#108)** : relie une réservation à une fiche client, avec historique côté client et blocage des clients blacklistés.

- **Base de données** : migration `1812000000000_add_client_id_to_boat_reservations_table.ts` — ajoute `client_id` (FK `clients`, `SET NULL`, nullable, indexée) à `boat_reservations` ; les champs texte `client_name`/`client_email`/`client_phone` restent comme **snapshot dénormalisé** (`down()` implémenté)
- **Modèle** : `boat_reservation.ts` — colonne `clientId` (relation résolue par requête directe, sans `@belongsTo` pour éviter une régression de typage `preload` self-référent Lucid)
- **Backend** :
  - `boat_reservation_service.ts` : résolution du client org-scopée (`#resolveClientId`) à la création **et** à la mise à jour, avec **blocage des clients blacklistés** (`ReservationBlacklistedClientError`) ; un `client_id` d'une autre organisation est ignoré ; `listForClient(orgId, clientId)` pour l'historique
  - `client_service.ts` : `listOptions(orgId)` (sélecteur) ; `#toRow` délègue à un nouveau `client_transformer.ts`
  - `clients_controller.ts` : action `show` (`GET /clients/:id`, gatée Enterprise) rendant la fiche client + l'historique des réservations
  - `boat_reservations_controller.ts` : persiste `clientId`, passe `clientOptions` à la page, mappe l'erreur blacklist en flash ; `reservations_controller`/`invoice_service` inchangés côté contrat
  - **Synergie #288** : `createQuoteFromReservation` privilégie désormais le `client_id` de la réservation (FK) avant de retomber sur l'email snapshot
- **Frontend** :
  - Sélecteur de client (optionnel) dans `ReservationForm.vue` et `ReservationEditModal.vue` (remplit le nom snapshot à la sélection) ; `clientOptions` propagé via `boats/reservations.vue` → `ReservationList`
  - Nouvelle fiche client `inertia/pages/clients/show.vue` (informations + historique des réservations) ; lien « Voir » depuis la liste des clients
- **i18n** en + fr : `reservations.form.client`/`noClientOption`, `clients.view`, `clients.show.*`, `flash.reservation.blacklistedClient`
- **Documentation** : nouveau `docs/domain/clients.md` (module CRM clients + lien réservation ↔ client : résolution org-scopée, blocage blacklist, historique, synergie #288), référencé dans `docs/README.md` et croisé depuis `docs/domain/reservations-and-pricing.md`
- **Tests** :
  - 6 fonctionnels (`tests/functional/boats/reservation_client_link.spec.ts`) : lien à la création, refus blacklist (création + mise à jour), `client_id` cross-org ignoré, suppression client → `client_id` NULL (snapshot conservé), historique sur la fiche client
  - Front (Vitest) : sélecteur de client dans le formulaire de réservation ; mocks `useForm` mis à jour pour `transform()`

## 2026-07-05 — [#282] Documentation de domaine : facturation

Documentation consolidée de l'epic Facturation (#282, lots #285→#288) : nouveau `docs/domain/invoicing.md` couvrant le modèle de données (invoices/lignes/compteurs + colonnes cycle de vie), la numérotation sans trou, le calcul pur des totaux, le cycle de vie et les statuts (envoi, conversion, paiement, retard auto), la génération PDF + envoi email, le devis depuis réservation et son lien bidirectionnel, la sécurité/gating Enterprise, les routes, l'i18n, les fichiers clés et les tests. Référencé depuis `docs/README.md`.

## 2026-07-05 — [#288] Facturation : créer un devis depuis une réservation

**Lot 4/4 (dernier) de l'epic Facturation (#282)** : raccourci métier pour générer un devis pré-rempli directement depuis une réservation, avec lien bidirectionnel réservation ↔ devis/facture.

- **Backend** :
  - `app/services/invoice_service.ts` :
    - `createQuoteFromReservation(org, reservation, { lineLabel })` : crée un devis brouillon (`kind: 'quote'`, numéro `DEV-`) lié à la réservation (`reservation_id`), résout le client via l'email snapshot de la réservation (sinon conserve le `client_name` texte libre comme snapshot), et ajoute une ligne unique tarifée à partir du `total_price` de la réservation (qui reflète déjà la tarification #284 quand disponible)
    - `listLinksByReservationIds(orgId, ids)` : lookup groupé (org-scopé) des devis/factures rattachés à un lot de réservations, pour l'affichage du lien bidirectionnel
  - `app/services/boat_reservation_service.ts` : `findForOrganization(orgId, id)` (réservation org-scopée, tous bateaux, avec le bateau préchargé)
  - `app/controllers/invoices_controller.ts` : action `createFromReservation` (`POST /invoices/from-reservation/:reservationId`), gatée Enterprise + policy `create`, construit le libellé de ligne via i18n et redirige vers le devis créé
  - `app/controllers/reservations_controller.ts` : la liste des réservations expose désormais `linkedInvoices` par réservation + le flag `canCreateQuote` (Enterprise)
  - Transformers : `toInvoiceDetail` expose `reservationBoatId` (deep-link) ; `toBoatReservationRow` accepte `linkedInvoices`
- **Note dépendance** : #275 (FK `client_id` sur `boat_reservations`) n'est pas encore livré → la résolution du client se fait par **email snapshot** (dégradation propre) ; elle basculera sur la FK directe quand #275 sera fait, sans changer le contrat
- **Frontend** :
  - `inertia/components/reservations/FleetReservationList.vue` : colonne « Documents » listant les devis/factures liés (liens) + bouton « Créer un devis » (Enterprise) qui `POST` vers la route de création
  - `inertia/pages/invoices/show.vue` : la réservation liée devient un lien vers la page des réservations du bateau
- **i18n** en + fr : `reservations.actions.createQuote`, `reservations.columns.documents`, `invoices.fromReservation.line`, `invoices.show.viewReservation`, `flash.invoices.quoteFromReservation`
- **Tests** :
  - 7 fonctionnels (`tests/functional/invoices/invoice_from_reservation.spec.ts`) : création du devis pré-rempli (numéro `DEV-`, `reservation_id`, ligne depuis `total_price`) ; résolution client par email ; conservation du nom libre sans client correspondant ; ligne à 0 sans `total_price` ; org-scoping (IDOR) ; gating non-Enterprise ; la liste des réservations expose `linkedInvoices` + `canCreateQuote`
  - 3 front (`tests/inertia/fleet_reservation_list.spec.ts`) : bouton « Créer un devis » (visibilité selon Enterprise + POST) et liens vers les documents rattachés

## 2026-07-05 — [#287] Facturation : conversion devis → facture + statuts payé/en retard

**Lot 3/4 de l'epic Facturation (#282)** : cycle de vie du document — conversion d'un devis en facture, marquage « payé » et bascule automatique en « en retard ».

- **Base de données** : migration `1811000003000_add_lifecycle_to_invoices_table.ts` — ajoute `paid_at` (date, nullable) et `source_quote_id` (FK auto-référente vers `invoices`, SET NULL, indexée) à la table `invoices` (down implémenté)
- **Modèle** : `app/models/invoice.ts` — colonnes `paidAt` et `sourceQuoteId` (la relation auto-référente n'est pas déclarée : Lucid ne sait pas typer un `preload` self-référent → les documents liés sont chargés explicitement, org-scopés)
- **Backend** :
  - `app/services/invoice_service.ts` :
    - `convertToInvoice(quote)` : crée une nouvelle facture (`kind: 'invoice'`, nouveau numéro `FAC-` via le compteur gap-free), recopie client/réservation/lignes/TVA/notes du devis, `sourceQuoteId` pointant vers le devis d'origine, statut réinitialisé à `draft`. Un devis ne peut être converti qu'une fois (garde contre double conversion et contre la conversion d'un non-devis)
    - `markAsPaid(invoice)` : passe le statut à `paid` et horodate `paidAt` (uniquement pour une facture non annulée)
    - `markOverdueInvoices(now)` : bascule en `overdue` toute facture `sent`, non payée, dont l'échéance est dépassée (idempotent) ; renvoie le nombre de lignes mises à jour
    - `getLinks(invoice)` : résout le devis d'origine et la facture convertie (org-scopés)
  - `app/exceptions/invoice_errors.ts` : `NotAQuoteError`, `QuoteAlreadyConvertedError`, `CannotMarkPaidError`
  - `app/controllers/invoices_controller.ts` : actions `convert` (POST `/invoices/:id/convert`) et `markPaid` (POST `/invoices/:id/pay`), gatées Enterprise + policy `update`, avec gestion des erreurs métier en flash
  - `app/jobs/mark_overdue_invoices.ts` + `start/scheduler.ts` : job planifié quotidien (6 h, Europe/Paris) qui appelle `markOverdueInvoices`
- **Frontend** (`inertia/pages/invoices/show.vue`) : boutons « Convertir en facture » (devis non converti) et « Marquer comme payée » (facture non payée/annulée) ; liens vers le devis d'origine / la facture convertie ; affichage de la date de paiement. Extraction du tableau des lignes en `components/invoices/InvoiceLinesCard.vue` (respect de la limite de 250 lignes)
- **i18n** en + fr : `invoices.actions.convert`/`markPaid`, `invoices.show.paidOn`/`convertedFrom`/`convertedTo` ; `flash.invoices.converted`/`notAQuote`/`alreadyConverted`/`paid`/`cannotMarkPaid`
- **Tests** :
  - 8 fonctionnels (`tests/functional/invoices/invoice_lifecycle.spec.ts`) : conversion devis→facture (numéro `FAC-`, lien, lignes recopiées, statut `draft`), refus de convertir un non-devis, refus de double conversion, org-scoping (IDOR), marquage payé + horodatage, refus de marquer un devis payé, gating non-Enterprise, `markOverdueInvoices` ne bascule que les factures `sent`/non payées/échues
  - 4 front (`tests/inertia/invoice_show_actions.spec.ts`) : visibilité/POST des boutons convertir et payer selon `kind`/statut

## 2026-07-05 — [#286] Facturation : génération PDF + envoi email

**Lot 2/4 de l'epic Facturation (#282)** : génération de PDF pour les devis/factures et envoi par email au client avec pièce jointe.

- **Backend** :
  - `app/services/invoice_pdf_service.ts` : génération PDF A4 via pdfkit avec en-tête brandé (logo/couleurs org si plan Enterprise + white-label activé, sinon branding FleetView par défaut), métadonnées (dates, statut, client), tableau des lignes zébré avec pagination automatique, totaux, notes et mentions légales. Tous les libellés via i18n (`invoices.pdf.*`)
  - `app/jobs/send_invoice_email.ts` : job dédié `SendInvoiceEmail` (queue `emails`, 5 retries max) qui recharge l'invoice et l'org, construit un contexte i18n pour la locale demandée via `i18nManager.locale()`, génère le PDF via `InvoicePdfService` résolu par le container (`app.container.make()`), rend le template Edge, envoie l'email avec pièce jointe PDF via `message.attachData(buffer, { filename, contentType })`
  - `app/services/email_queue_service.ts` : nouvelle méthode `sendInvoice({ invoiceId, organizationId, to, locale })` avec clé de dédup unique par envoi (timestamp) pour autoriser les renvois
  - `app/controllers/invoices_controller.ts` : 2 nouvelles actions `downloadPdf` (téléchargement direct du PDF, inline ou attachment) et `send` (enfile l'email + transition automatique `draft → sent`)
  - Routes : `GET /invoices/:id/pdf` (`invoices.pdf`), `POST /invoices/:id/send` (`invoices.send`)
- **Template email** : `resources/views/emails/invoice.edge` (bilingue FR/EN, utilise le layout existant, mentionne le montant total et la pièce jointe)
- **i18n** : namespace `invoices.pdf.*` (titre devis/facture, colonnes tableau, totaux, mentions légales, footer paginé) en + fr ; `flash.invoices.sent` et `flash.invoices.noClientEmail` en + fr
- **Branding** : utilise `PLAN_LIMITS[org.plan].canWhiteLabel` pour décider si le logo/couleurs de l'org sont appliqués ; sinon couleur primaire par défaut `#1e3a5f`
- **Frontend** : boutons « Télécharger le PDF » (lien vers `/invoices/:id/pdf`) et « Envoyer par email » (POST `/invoices/:id/send`) sur la fiche facture (`inertia/pages/invoices/show.vue`), avec affichage des flash succès/erreur ; clés `invoices.actions.*`
- **Sécurité / statut** : envoi refusé (flash) si le client n'a pas d'email ; transition `draft → sent` uniquement (une facture payée/annulée n'est pas rétrogradée) ; PDF et envoi org-scopés (IDOR) et gatés Enterprise
- **Tests** : 6 fonctionnels (`tests/functional/invoices/invoice_pdf_email.spec.ts`) — buffer `%PDF` valide, téléchargement (content-type/taille), IDOR, gating non-Enterprise, envoi → statut `sent` + flash, refus sans email

## 2026-07-05 — [#285] Facturation : socle devis/factures (CRUD, numérotation, plan Enterprise)

**Lot 1/4 de l'epic Facturation (#282)** : nouveau module `invoices` org-scopé (devis + factures), réservé au plan Enterprise. Comprend le CRUD complet, la numérotation sans trou et le gating Enterprise.

- **Base de données** :
  - Table `invoices` (`organization_id`, `client_id` FK SET NULL, `reservation_id` FK SET NULL, `kind` enum quote/invoice, `number`, `client_name` snapshot, `status` enum draft/sent/paid/overdue/cancelled, `issued_at`, `due_at`, decimals `subtotal`/`tax_rate`/`tax_amount`/`total`, `currency`, `notes`, timestamps) + contrainte UNIQUE `(organization_id, kind, number)` + index `(organization_id, kind, status)` et `(organization_id, issued_at)`
  - Table `invoice_lines` (`invoice_id` FK CASCADE, `label`, `quantity`, `unit_price`, `amount`, `position`, timestamps) + index `invoice_id`
  - Table `invoice_counters` (`organization_id` FK CASCADE, `kind`, `last_number`, timestamps) + contrainte UNIQUE `(organization_id, kind)`
- **Numérotation gap-free** : préfixe `DEV-` pour les devis, `FAC-` pour les factures, numéro sur 6 chiffres (ex: `FAC-000001`). Allocation via INSERT ON CONFLICT IGNORE + SELECT FOR UPDATE sur `invoice_counters`
- **Backend** :
  - `app/models/invoice.ts`, `app/models/invoice_line.ts`, `app/models/invoice_counter.ts` (decimals en `string`)
  - `app/services/invoice_service.ts` : CRUD org-scopé, `normalizeFilters`, `search` (pagination, filtres status/kind/clientId/q/period), `listClientOptions`, numérotation gap-free transactionnelle, snapshot `client_name`
  - `app/validators/invoice.ts` : `createInvoiceValidator`, `updateInvoiceValidator`
  - `app/transformers/invoice_transformer.ts` : `toInvoiceRow`, `toInvoiceDetail`
  - `app/policies/invoice_policy.ts` (suppression admin-only)
  - `app/exceptions/invoice_errors.ts` : `InvoiceNotFoundError`
  - `app/controllers/invoices_controller.ts` : actions index/show/create/store/edit/update/destroy
  - Routes `start/routes/invoices.ts` : GET/POST/PUT/DELETE `/invoices`
- **Gating Enterprise** : flag `canManageInvoices` dans `shared/types/plan.ts` (Enterprise uniquement), `quotaService.canManageInvoices()` + `assertCanManageInvoices()`, `QuotaFeature 'invoices'`
- **Cœur partagé** : `shared/helpers/invoice_totals.ts` — fonction pure `computeInvoiceTotals(lines, taxRate)` (montant par ligne, sous-total, TVA sur assiette unique, total ; arrondi 2 décimales) utilisée backend (persistance) ET frontend (aperçu live)
- **Types partagés** : `shared/types/invoice.ts` (`InvoiceKind`, `InvoiceStatus`, `InvoiceRow`, `InvoiceDetail`, `InvoiceLineInput`, `InvoiceLineRow`, `CreateInvoicePayload`, `UpdateInvoicePayload`, `InvoiceListFilters`, `InvoicesPaginated`)
- **Frontend** : liste filtrable (`/invoices`, filtres statut/type/client/période + pagination), pages dédiées détail (`/invoices/:id`) et création/édition multi-lignes (`/invoices/new`, `/:id/edit`) avec éditeur de lignes et aperçu live des totaux ; item de menu « Factures » visible uniquement en Enterprise
- **i18n** : namespace `invoices.*` + `nav.invoices` + `flash.invoices.*` (created, updated, deleted, notFound) + `flash.quota.invoicesExceeded` (en + fr)
- **Tests** : 6 unitaires (`computeInvoiceTotals`) + 10 fonctionnels (CRUD, numérotation séquentielle/indépendante par kind/non réutilisée après suppression, totaux serveur, snapshot client, cascade des lignes, org-scoping, IDOR, gating, non authentifié) + 3 Vitest (éditeur de lignes)

## 2026-07-05 — [#294] Tarification : calcul automatique du total de réservation

**Lot 3/3 de l'epic Tarification (#284)** : calcul automatique du total de réservation basé sur le tarif de base du bateau et les périodes saisonnières.

- **Cœur partagé** : `shared/helpers/reservation_quote.ts` exporte la fonction pure `computeReservationQuote(pricing, seasons, startsAt, endsAt)` et `countBilledNights(startsAt, endsAt)` (type `ReservationQuote` : `hasPricing`, `currency`, `nights`, `total`, `deposit`, `minDays`, `maxDays`, `withinBounds`, `boundsError`, `usedWeeklyRate`, `lines[]`). Règles : tarif journalier saisonnier (prix absolu ou `base × multiplicateur`) sinon tarif de base ; tarif hebdomadaire pour les semaines pleines quand aucune saison ne s'applique ; résolution des saisons par priorité puis périmètre bateau > global
- **Backend** :
  - `app/services/pricing_season_service.ts` : nouvelle méthode `listForBoatScope(organizationId, boatId)` retournant les saisons applicables à un bateau (saisons propres + saisons globales de l'org)
  - `app/services/reservation_quote_service.ts` (nouveau) : service injectable `quoteForBoat(boat, startsAt, endsAt)` qui assemble le tarif de base, les saisons et appelle `computeReservationQuote`
  - `app/services/boat_reservation_service.ts` : injection de `BoatPricingService` et `ReservationQuoteService` ; enforcement des bornes min/max jours (lève `ReservationDurationError`) ; auto-remplissage de `totalPrice` dans `create` si non fourni et tarif configuré
  - `app/exceptions/reservation_errors.ts` : nouvelle erreur `ReservationDurationError` avec `reason: 'below_min' | 'above_max'`
  - `app/controllers/boat_reservations_controller.ts` : `index` expose `boatPricing` et `pricingSeasons` au frontend ; `store`/`update` gèrent `ReservationDurationError` avec flash i18n
- **Frontend** : composant `ReservationQuoteCard.vue` (détail par ligne, caution, avertissement hors bornes, bouton « appliquer ») intégré au formulaire de création (auto-remplissage de `total_price` si vide) et à la modale d'édition
- **i18n** : namespace `reservations.quote.*` (en + fr) + `flash.reservation.belowMinDays` / `flash.reservation.aboveMaxDays`
- **Tests** : 13 unitaires sur la fonction pure (mono/multi-saison, semaine vs jour, multiplicateur, priorité de périmètre, bornes) + 7 fonctionnels (auto-remplissage, saison appliquée, rejet hors bornes, exposition des props, non-régression sans tarif) + 3 Vitest (carte d'estimation)

## 2026-07-04 — [#293] Tarification : périodes saisonnières + validation de chevauchement

**Lot 2/3 de l'epic Tarification (#284)** : nouvelle ressource `pricing_seasons` org-scopée, réservée au plan Enterprise. Permet de définir des périodes tarifaires saisonnières (globales ou par bateau) avec validation de chevauchement par périmètre.

- **Base de données** : table `pricing_seasons` (`organization_id`, `boat_id` nullable — `null` = période globale, `name`, `starts_on`, `ends_on`, `daily_price` decimal nullable, `multiplier` decimal nullable, `priority` défaut 0, timestamps) + index composite `(organization_id, boat_id)`
- **Backend** : `app/models/pricing_season.ts` (dates `@column.date()`, décimaux en `string | null`), `app/services/pricing_season_service.ts` (CRUD org-scopé, `normalizeFilters`, `list` avec preload du bateau, `listBoatOptions`, validation métier : ordre des dates, XOR prix/multiplicateur, chevauchement par scope, appartenance du bateau à l'org), `app/validators/pricing_season.ts`, `app/policies/pricing_season_policy.ts` (suppression admin-only), `app/exceptions/pricing_season_errors.ts` (`PricingSeasonNotFoundError`, `SeasonOverlapError`, `InvalidSeasonDateRangeError`, `InvalidSeasonPriceError`, `SeasonBoatNotFoundError`), `app/controllers/pricing_seasons_controller.ts`
- **Règle de chevauchement** : deux périodes du même périmètre (même `boat_id`, `null`=global traité comme un scope propre) ne peuvent se chevaucher ; les périmètres différents (global vs bateau, ou deux bateaux) peuvent coexister — la `priority` les départagera en 3/3
- **Gating Enterprise** : réutilise `canManagePricing` de #292 (`quotaService.assertCanManagePricing`) ; accès refusé (flash + redirect `/`) hors Enterprise
- **Routes** : `start/routes/pricing.ts` (`GET /pricing/seasons`, `POST`, `PUT /:id`, `DELETE /:id`) importé dans `start/routes.ts`
- **Types partagés** : `shared/types/pricing_season.ts` (`PricingSeasonRow`, `BoatOption`, `CreatePricingSeasonPayload`, `UpdatePricingSeasonPayload`, `PricingSeasonListFilters`)
- **Frontend** : page `/pricing/seasons` (liste + filtre par bateau, création/édition via formulaire Inertia `useForm`, suppression confirmée), item de menu « Périodes tarifaires » visible uniquement en Enterprise
- **i18n** : namespace `pricingSeasons.*` + `nav.pricingSeasons` + `flash.pricingSeason.*` (created, updated, deleted, notFound, overlap, invalidRange, invalidPrice, boatNotFound) en + fr
- **Tests** : 15 fonctionnels (CRUD, org-scoping, chevauchement même scope rejeté / scopes différents autorisés, ordre des dates, XOR prix, bateau hors org, tri par priorité, gating Enterprise, IDOR, non authentifié) + 4 Vitest (formulaire create/edit, cancel)

## 2026-07-04 — Tests e2e navigateur (Japa browser client + Playwright)

**Introduit une suite de tests end-to-end qui exerce l'application dans un vrai navigateur (rendu Inertia + interactions), jusqu'ici absente (seuls des tests unitaires, d'intégration, fonctionnels et de composants existaient).**

- **Outillage** : dépendance dev `playwright`, branchement des plugins `browserClient` / `sessionBrowserClient` / `authBrowserClient` dans `tests/bootstrap.ts` (la suite `browser` et `@japa/browser-client` étaient déjà déclarés). Authentification programmatique via `browserContext.loginAs(user)` (session web), données préparées par les factories existantes, isolation par `truncate()` par test.
- **Parcours critiques** (`tests/browser/`) : `auth.spec.ts` (login réel via formulaire, mauvais mot de passe, redirection `/boats` → `/login` si non authentifié, logout), `boats.spec.ts` (création → fiche → édition → suppression), `maintenance.spec.ts` (événement de maintenance visible dans l'historique, redirection `/maintenance` → `/maintenance/history`)
- **Smoke navigable** : `smoke_authenticated.spec.ts` charge tous les écrans authentifiés principaux (dashboard, boats, planning, maintenance, navigation, réservations, ports, crew, clients, notifications, settings…) avec un admin Enterprise et vérifie le statut HTTP + l'URL ; `smoke_public.spec.ts` couvre les pages publiques/marketing (EN/FR) et la page de login
- **Scripts** : `pnpm test:e2e` (= `node ace test browser`) ; `pnpm test` / `pnpm test:coverage` ciblent désormais explicitement `unit integration functional` (la suite navigateur, qui requiert un navigateur, reste opt-in via `test:e2e`)
- **CI** : nouveau job `test-e2e` dans `.github/workflows/ci.yml` (service PostgreSQL + `playwright install --with-deps chromium` + `pnpm test:e2e`)
- **Note environnement** : la variable `PLAYWRIGHT_CHROMIUM_EXECUTABLE` (optionnelle) permet de pointer vers un Chromium système quand le téléchargement Playwright n'est pas disponible ; en CI le navigateur est installé et cette variable reste vide

## 2026-07-04 — [#292] Tarification : tarif de base par bateau (plan Enterprise)

**Socle de la tarification (epic Tarification #284, lot 1/3)** : nouvelle ressource `boat_pricing` en 1:1 par bateau, org-scopée, réservée au plan Enterprise. Expose un onglet « Tarif » sur la fiche bateau.

- **Base de données** : table `boat_pricing` (`organization_id`, `boat_id` UNIQUE, `base_daily_price`, `base_weekly_price`, `deposit_amount`, `min_days`, `max_days`, `currency` défaut `EUR`, timestamps) + index sur `organization_id`
- **Backend** : `app/models/boat_pricing.ts`, `app/services/boat_pricing_service.ts` (upsert preserve-if-absent, validation `minDays`/`maxDays`), `app/validators/boat_pricing.ts`, `app/exceptions/boat_pricing_errors.ts` (`InvalidPricingRangeError`), `app/transformers/boat_pricing_transformer.ts`, `app/controllers/boat_pricing_controller.ts` (action `update` = upsert), route `PUT /boats/:id/pricing`
- **Gating Enterprise** : flag `canManagePricing` dans `shared/types/plan.ts` (Enterprise uniquement), `quotaService.canManagePricing()` + `assertCanManagePricing()`, `QuotaFeature 'pricing'` ; accès refusé (flash + redirect) hors Enterprise
- **Intégration fiche bateau** : `BoatManageContext` étendu avec `pricing`, `pricingEnabled`, `canManagePricing` ; `BoatsController.show` charge le tarif et passe les flags au frontend
- **Frontend** : onglet « Tarif » sur la fiche bateau (`BoatShowTabPricing.vue`) — affichage du tarif courant et formulaire d'édition (`useForm` Inertia) réservé aux administrateurs Enterprise, lecture seule sinon
- **i18n** : clés `boats.show.tabs.pricing` + namespace `boats.pricing.*`, `flash.pricing.saved`, `flash.pricing.invalidRange`, `flash.quota.pricingExceeded` (en + fr)
- **Tests** : 10 fonctionnels (upsert, préservation partielle, validation de bornes, gating Enterprise/starter, IDOR, exposition des props de la fiche) + 3 Vitest (soumission du formulaire, mode lecture seule)

## 2026-07-04 — Outillage de couverture de tests (c8 + @vitest/coverage-v8)

**Ajoute la mesure de couverture de code, jusqu'ici absente du projet (aucun instrument back ni front).**

- Backend : dépendance dev `c8` + config `.c8rc.json` (instrumente `app/` et `shared/`, exclut tests/build, rapports `text` + `html` dans `coverage/backend`). Script `pnpm test:coverage` (= `c8 node ace test`)
- Frontend : dépendance dev `@vitest/coverage-v8` + bloc `coverage` dans `vitest.config.ts` (provider `v8`, cible `inertia/**`, rapports dans `coverage/frontend`). Script `pnpm test:inertia:coverage` (= `vitest run --coverage`)
- `.gitignore` : le dossier `coverage/` est ignoré
- Aucun seuil bloquant en CI : l'outillage est disponible en local pour suivre la progression, sans faire échouer le build

## 2026-07-04 — [#273] CRM : module clients (CRUD, recherche, plan Enterprise)

**Socle du CRM léger (epic #108, lot 1/4)** : nouvelle ressource `clients` org-scopée, réservée au plan Enterprise.

- **Base de données** : table `clients` (`organization_id`, `first_name`, `last_name`, `email`, `phone`, `address`, `navigation_permit_number`, `navigation_permit_type`, `status` enum `active`/`inactive`/`blacklisted`, `notes`, `gdpr_consent_at` — posé pour le lot RGPD, timestamps) + index `(organization_id, email)`
- **Backend** : `app/models/client.ts`, `app/services/client_service.ts` (CRUD org-scopé + `search()` serveur `whereILike` nom/email + filtre statut + pagination), `app/validators/client.ts`, `app/policies/client_policy.ts` (suppression admin-only), `app/exceptions/client_errors.ts`, `app/controllers/clients_controller.ts`, routes `/clients` (`start/routes/clients.ts`)
- **Gating Enterprise** : flag `canManageClients` dans `shared/types/plan.ts` (Enterprise uniquement), `quotaService.assertCanManageClients` + `QuotaFeature 'clients'` ; accès refusé (flash + redirect) hors Enterprise
- **Frontend** : page `/clients` (recherche debounced + filtre statut + création/édition inline + badge de statut + suppression confirmée), composants `ClientForm` / `ClientListToolbar` / `ClientStatusBadge`, item de menu « Clients » visible uniquement en Enterprise
- **i18n** : namespaces `clients` (en + fr), `nav.clients`, `flash.clients.*`, `flash.quota.clientsExceeded`
- **Tests** : 14 fonctionnels (CRUD, org-scoping/IDOR, recherche, refus non-Enterprise) + 8 Vitest (`ClientForm`, `ClientStatusBadge`)

Les lots suivants (documents #274, lien réservations + blacklist #275, RGPD #276) s'appuient sur ce socle.

## 2026-07-04 — [#185] Fiches de maintenance : impossible de terminer une fiche avec des items non cochés

**Corrige E-04 : `completeSheet()` passait la fiche en statut `completed` sans charger les items ni vérifier qu'ils étaient tous cochés. Une fiche avec des items non faits pouvait être marquée « terminée », compromettant l'intégrité des données**

- `app/exceptions/maintenance_errors.ts` : nouvelle erreur métier `BoatMaintenanceSheetIncompleteError`
- `app/services/boat_maintenance_sheet_service.ts` (`completeSheet`) : précharge les items et lève `BoatMaintenanceSheetIncompleteError` si au moins un item a `isDone = false`. Une fiche sans item reste complétable (rien à cocher)
- `app/controllers/boat_maintenance_sheets_controller.ts` : `complete()` attrape l'erreur → `flash.maintenanceSheets.itemsNotDone`
- `resources/lang/en/flash.json` et `fr` : nouvelle clé `maintenanceSheets.itemsNotDone`
- Tests ajoutés : `tests/functional/boats/maintenance_sheets.spec.ts` (fiche avec un item non coché → refus + flash, statut inchangé ; tous cochés → complétée ; fiche sans item → complétée)

## 2026-07-04 — [#183] Dates : `toDateTime()` normalise en UTC (indépendant du TZ serveur)

**Corrige D-08 : `toDateTime()` interprétait les datetimes naïves (sans fuseau) dans la zone locale du process. Les datetimes de navigation et de réservation variaient donc selon le TZ serveur (prod UTC vs dev), faussant les instants stockés (colonnes `timestamptz`)**

Décision retenue : _forcer UTC_ (sémantique « naïve = UTC »).

- `shared/helpers/date.ts` : une datetime naïve est désormais normalisée en UTC, quel que soit le TZ serveur
  - branche `Date` (payload VineJS, parsé en zone locale) : `DateTime.fromJSDate(value).setZone('utc', { keepLocalTime: true })` — on récupère le wall-clock local (= la saisie) et on le ré-étiquette UTC
  - branche string ISO naïve : `DateTime.fromISO(value, { zone: 'utc' })`
  - une datetime avec offset explicite conserve son instant
- Note : la piste littérale de l'issue (`fromJSDate(value, { zone: 'utc' })`) est en réalité incorrecte ici — VineJS parse la datetime naïve en zone locale, donc cette variante donnerait un instant décalé sur un serveur non-UTC. Le `keepLocalTime` est la correction juste (vérifiée sous UTC / America-New_York / Asia-Tokyo)
- Test ajouté : `tests/unit/helpers/date.spec.ts` (naïve → UTC, Date locale ré-étiquetée UTC, offset explicite préservé, DateTime inchangé) — vérifié indépendant du TZ

## 2026-07-04 — [#182] Navigation : un seul trajet `in_progress` par bateau

**Corrige D-07 : `createForBoat` insérait un trajet sans vérifier qu'un trajet `in_progress` existait déjà pour ce bateau, et aucun index n'empêchait le doublon. Deux trajets `in_progress` → ambiguïté sur le trajet actif et corruption des heures moteur aux deux `closeTrip`**

- `app/exceptions/navigation_log_errors.ts` : nouvelle erreur métier `NavigationLogInProgressError`
- `app/services/navigation_log_service.ts` (`createForBoat`) : vérifie l'absence de trajet `in_progress` avant de créer ; en cas de course, la violation de l'index unique partiel est aussi convertie en `NavigationLogInProgressError`
- `database/migrations/1807000000000_add_one_in_progress_per_boat_index_to_navigation_logs.ts` : index **partiel unique** `one_in_progress_per_boat` sur `navigation_logs (boat_id) WHERE status = 'in_progress'` (garde de concurrence côté base). La migration clôture d'abord d'éventuels doublons existants (garde le trajet `in_progress` le plus récent par bateau) pour pouvoir créer l'index
- `app/controllers/navigation_logs_controller.ts` : `store()` attrape l'erreur → `flash.navigationLog.alreadyInProgress`
- `resources/lang/en/flash.json` et `fr` : clé `navigationLog.alreadyInProgress`
- Tests ajoutés : `tests/functional/boats/navigation_logs.spec.ts` (un 2ᵉ trajet `in_progress` est refusé avec flash, un seul reste ; une nouvelle sortie est autorisée une fois la précédente clôturée)

## 2026-07-03 — [#181] Navigation : `closeTrip` cible le bon moteur (multi-moteurs)

**Corrige D-06 : sur un bateau multi-moteurs, `closeTrip` mettait toujours à jour le moteur au plus petit `id` (`orderBy('id','asc').first()`), quel que soit le moteur réellement utilisé — compteur d'heures faux, erreurs de maintenance préventive**

Règle métier validée : _moteur ciblé, sinon mono-moteur seulement_.

- `shared/types/navigation_log.ts` : ajout de `boatEngineId?: number | null` dans `CloseNavigationLogPayload`
- `app/validators/navigation_log.ts` : `closeNavigationLogValidator` accepte `boatEngineId` (entier positif, nullable)
- `app/services/navigation_log_service.ts` (`closeTrip`) : si `boatEngineId` est fourni → seul ce moteur (actif, du bateau) est mis à jour ; sinon → mise à jour uniquement s'il existe **exactement un** moteur actif. Sur un bateau multi-moteurs sans moteur précisé, **aucun** moteur n'est modifié (plus de compteur faux). Le garde anti-régression des heures (#174) est conservé
- `app/controllers/navigation_logs_controller.ts` : passe `boatEngineId`
- **Frontend** : `NavigationLogCloseForm.vue` affiche un sélecteur de moteur quand le bateau a >1 moteur actif (`boatEngineId`) ; helper réutilisable `inertia/utils/navigation_engine_options.ts` ; câblage via `BoatShowTabNavigationLogs.vue` et `NavigationActiveCard.vue`
- `resources/lang/en/navigation_logs.json` et `fr` : clés `fields.boatEngine`, `fields.selectEngine`
- Tests ajoutés :
  - backend `tests/functional/boats/navigation_logs.spec.ts` (multi-moteurs sans `boatEngineId` → aucun moteur touché ; `boatEngineId` fourni → seul le moteur ciblé mis à jour ; mono-moteur inchangé)
  - frontend `tests/inertia/navigation_engine_options.spec.ts` (helper : filtre les moteurs hors service, label brand/model, fallback `#id`) et `tests/inertia/navigation_log_close_form.spec.ts` (sélecteur affiché si >1 moteur, masqué sinon)

## 2026-07-03 — [#180] Navigation : l'update partiel n'efface plus les champs optionnels

**Corrige D-05 : le contrôleur convertissait `undefined → null` (`?? null`) pour `windForceBeaufort`, `seaState`, `crewCount`, `notes`. Le service protège ces champs via `!== undefined`, mais `null !== undefined` est vrai — donc chaque update partiel écrasait à `null` les champs non fournis**

- `app/controllers/navigation_logs_controller.ts` (`update()`) : passe désormais `payload.windForceBeaufort` (etc.) directement, sans `?? null`. Un champ absent (`undefined`) est préservé par le service ; un champ explicitement vidé (`null`) est effacé
- `app/validators/navigation_log.ts` : `updateNavigationLogValidator` — les 4 champs deviennent `.nullable().optional()`, de sorte qu'un champ vidé côté formulaire (`''` → `null` via `convertEmptyStringsToNull`) est une valeur de « vidage » valide et non une erreur de validation
- Tests ajoutés : `tests/functional/boats/navigation_logs.spec.ts` (update partiel préserve les champs non fournis ; un champ vidé est bien mis à `null`)

## 2026-07-03 — [#178] Équipage : confirmation avant de vider l'équipage d'une sortie

**Corrige D-03 : un payload `crew` vide vide tout l'équipage d'un log via `sync({})`. Le vidage est en réalité un geste légitime (retirer le dernier équipier), donc plutôt que de l'interdire (`.minLength(1)` aurait rendu le dernier équipier non-retirable), on le protège d'un clic accidentel par une confirmation**

- `inertia/components/boats/show/tabs/NavigationLogCrewPanel.vue` : `removeCrewMember()` demande une confirmation (`crew.logCrew.removeLastConfirm`) quand le retrait laisserait la sortie sans aucun équipage
- `resources/lang/en/crew.json` et `fr/crew.json` : nouvelle clé `crew.logCrew.removeLastConfirm`
- `app/services/crew_service.ts` : commentaire clarifiant que le vidage explicite est intentionnel et ne doit pas être interdit côté validator (le champ `crew` est déjà requis, donc une requête malformée qui l'omet est déjà rejetée — pas de perte silencieuse)
- Tests ajoutés :
  - backend `tests/functional/boats/navigation_log_crew.spec.ts` (un `crew: []` explicite vide bien l'équipage ; une requête sans champ `crew` est rejetée et conserve l'équipage existant)
  - frontend `tests/inertia/navigation_log_crew_panel.spec.ts` (confirmation demandée avant de retirer le dernier équipier ; pas de soumission si annulé, soumission si confirmé)

## 2026-07-03 — [#177] Réservations : machine à états sur les transitions de statut

**Corrige C-03 : `update()` appliquait n'importe quelle valeur de statut sans contrôle. Les transitions invalides (`confirmed → option`, `cancelled → confirmed`, etc.) n'étaient pas bloquées**

- `app/services/boat_reservation_service.ts` : map de transitions autorisées — `option → confirmed | cancelled`, `confirmed → cancelled`, `cancelled → ∅` (terminal). Rester sur le même statut est un no-op autorisé. Une transition interdite lève `ReservationValidationError('invalidTransition')`
- `resources/lang/en/flash.json` et `fr/flash.json` : nouvelle clé `reservation.invalidTransition` (le contrôleur mappe déjà `ReservationValidationError` → `flash.reservation.${errorCode}`)
- Décision métier validée : pas de dé-confirmation (`confirmed → option`), pas de réactivation (`cancelled` définitif)
- Tests ajoutés/ajustés : `tests/functional/boats/reservations.spec.ts` (option→cancelled et confirmed→cancelled autorisées ; confirmed→option et cancelled→confirmed rejetées avec flash ; mise à jour d'autres champs sans changement de statut autorisée). L'ancien test qui autorisait `confirmed → option` a été retiré (comportement supprimé par la nouvelle règle)

## 2026-07-03 — [#176] Réservations : priorité `confirmed` > `option`

**Corrige C-02 : le contrôle de conflit bloquait toute réservation non annulée (option comme confirmed), rendant impossible de confirmer un créneau couvert par une simple option. Règle métier retenue : une réservation ferme l'emporte sur une option provisoire**

- `app/services/boat_reservation_service.ts` :
  - `checkConflict()` prend désormais en compte le statut entrant : une `confirmed` n'est bloquée que par une autre `confirmed` qui chevauche ; une `option` reste bloquée par toute réservation non annulée qui chevauche (un hold par créneau) ; une `cancelled` ne crée jamais de conflit
  - nouvelle méthode `cancelOverlappingOptions()` : lors de la création/mise à jour d'une `confirmed`, les `option` qui chevauchent passent automatiquement en `cancelled` (dans une transaction, pas de donnée incohérente)
  - `create()` et `update()` s'exécutent en transaction et renvoient `{ reservation, cancelledOptions }`
- `app/controllers/boat_reservations_controller.ts` : flash de succès enrichi — `flash.reservation.optionsOverridden` avec le nombre d'options annulées quand une confirmed en écrase
- `resources/lang/en/flash.json` et `fr/flash.json` : nouvelle clé `reservation.optionsOverridden`
- Tests ajoutés : `tests/functional/boats/reservations.spec.ts` (confirmed écrase et annule une option chevauchante ; confirmed toujours bloquée par une confirmed ; option bloquée par une option ; update d'une confirmed sur une option l'annule)

## 2026-07-03 — [#175] Bateaux : `assign()` passe par la policy Bouncer

**Corrige B-06 : l'action `assign()` (affectation de spot) ne passait par aucune policy Bouncer, contrairement à `update`/`destroy`/`create`. Elle est désormais routée par `BoatPolicy.edit`**

- `app/controllers/boats_controller.ts` : `assign()` appelle `await bouncer.with(BoatPolicy).authorize('edit', boat)` après la récupération du bateau
- Défense en profondeur : le cross-org était déjà bloqué par `getForUserOrFail` (fetch scopé à l'org), et `BoatPolicy.edit` autorise les membres de l'org (même règle que `update`) — pas de changement de comportement immédiat, mais l'action respecte maintenant la policy et suivra automatiquement tout durcissement futur de `edit`
- Tests ajoutés : `tests/functional/boats/boats_assign.spec.ts` (un membre non-admin de l'org reste autorisé ; un bateau d'une autre org n'est pas modifié)

## 2026-07-03 — [#174] Moteurs : les heures ne peuvent plus régresser

**Corrige B-05 : la mise à jour d'un moteur acceptait n'importe quelle valeur d'heures ≥ 0, sans vérifier qu'elle ne descend pas sous la valeur actuelle. Le compteur (monotone) pouvait donc régresser — manipulation frauduleuse, erreurs de maintenance préventive, biais des analyses IA**

- `app/exceptions/boat_errors.ts` : nouvelle erreur métier `EngineHoursRegressionError`
- `app/services/boat_engine_service.ts` : `update()` refuse une nouvelle valeur d'heures strictement inférieure à l'actuelle (`EngineHoursRegressionError`). Mettre la valeur à `null` (effacement) ou renseigner un moteur sans heures reste autorisé
- `app/controllers/boat_equipment_controller.ts` : `updateEngine()` attrape l'erreur → `session.flash('error', i18n.t('flash.engine.hoursRegression'))` + redirect
- `resources/lang/en/flash.json` et `fr/flash.json` : nouvelle clé `engine.hoursRegression`
- Tests ajoutés : `tests/functional/boats/engine_hours.spec.ts` (valeur inférieure rejetée et heures conservées ; valeur supérieure/égale acceptée ; passage depuis une valeur non renseignée autorisé)

## 2026-07-03 — [#173] Bateaux : numéro d'immatriculation dupliqué géré proprement (plus de 500)

**Corrige B-04 : un index unique `(organization_id, registration_number)` existe en base, mais aucune validation VineJS ni try/catch ne couvrait la violation. Soumettre deux bateaux avec le même `registrationNumber` renvoyait un 500 brut**

- `app/exceptions/boat_errors.ts` : nouvelle erreur métier `RegistrationNumberTakenError`
- `app/services/boat_hull_service.ts` : `createForUser()` et `updateForUser()` interceptent la violation d'unicité PostgreSQL (`23505` sur la contrainte `registration_number`) et lèvent `RegistrationNumberTakenError` (robuste face aux races, contrairement à une simple validation)
- `app/controllers/boats_controller.ts` : `store()` et `update()` attrapent l'erreur → `session.flash('error', i18n.t('flash.boat.registrationTaken'))` + redirect back
- `resources/lang/en/flash.json` et `fr/flash.json` : nouvelle clé `boat.registrationTaken`
- Les `registrationNumber` `null` multiples restent autorisés (NULL distincts en PostgreSQL)
- Tests ajoutés : `tests/functional/boats/boats.spec.ts` (POST et PUT avec numéro dupliqué → flash d'erreur, pas de 500 ni de doublon ; plusieurs bateaux sans numéro acceptés)

## 2026-07-03 — [#172] Invitations : l'appartenance à l'org est détectée même sans membership

**Corrige A-09 : la vérification « déjà membre » dans `OrganizationInvitationService.create()` ne consultait que `organization_memberships`. Un user rattaché à l'org sans ligne membership (owner, drift A-03) pouvait recevoir une invitation à sa propre organisation**

- `app/services/organization_invitation_service.ts` : `create()` vérifie désormais aussi `users WHERE email = ? AND organizationId = orgId`, en plus de la check membership. Les deux signaux sont conservés car une membership peut exister sans que `users.organizationId` pointe ici (multi-org), et un user peut appartenir à l'org sans membership
- Test ajouté : `tests/functional/organization/invitations.spec.ts` (un user rattaché à l'org sans membership ne peut pas être invité — `AlreadyMemberError`, aucune invitation créée)

## 2026-07-03 — [#171] Facturation : synchronisation d'abonnement atomique

**Corrige A-08 : `syncFromCheckoutSession()` et `syncFromSubscriptionEvent()` appelaient `upsertSubscription()` puis la mise à jour du plan de l'org de façon séquentielle et non transactionnelle. En cas d'échec de la seconde écriture, la souscription était enregistrée mais le plan de l'org restait incohérent (ex : souscription `active` mais org encore sur `starter`)**

- `app/services/subscription_service.ts` : les deux écritures (`upsertSubscription` + application du plan) sont désormais enveloppées dans `db.transaction()` — soit tout est commité, soit tout est annulé
- `updateOrgPlan()` devient `applyOrgPlan()` : effectue l'écriture dans la transaction et **retourne** l'info de downgrade au lieu de dispatcher l'event directement. `OrganizationPlanDowngraded` est désormais dispatché **après le commit** (le listener envoie des emails et crée des notifications — il ne doit pas agir sur un changement susceptible d'être annulé)
- Tests ajoutés : `tests/functional/billing/subscription_service.spec.ts` (commit conjoint souscription + plan avec event post-commit ; rollback de la souscription si la mise à jour du plan échoue)

## 2026-07-03 — Boot : correction du flake `authThrottle` (dépendance circulaire preload)

**Corrige une erreur de démarrage intermittente `ReferenceError: Cannot access 'authThrottle' before initialization` (`start/routes/auth.ts`) qui faisait échouer ~50 % des runs de tests et rendait la CI flaky**

- Cause : les preloads d'`adonisrc.ts` sont importés en parallèle (`Promise.all`). `#start/limiter` dépend d'un module à top-level await (`@adonisjs/limiter/services/main` → `await app.booted`). En figurant à la fois comme preload et comme dépendance du graphe des routes, il devenait une seconde racine concurrente, ouvrant une fenêtre où `authThrottle` était lu en TDZ avant son initialisation
- Correctif : retrait de `() => import('#start/limiter')` des `preloads` (il était redondant — le module est chargé comme dépendance de `start/routes/auth.ts`, `ai.ts`, `demo.ts`). L'évaluation devient déterministe ; le throttling reste fonctionnel
- Vérifié : 8/8 runs du test canary sans flake (avant : ~50 % d'échec), tests auth (routes protégées par `authThrottle`) 12/12

## 2026-07-03 — [#170] Facturation : bornes de période lues depuis Stripe

**Corrige A-07 : `getPeriodBounds()` recalculait la période de facturation à partir de `billing_cycle_anchor` avec une boucle `while`. Ce recalcul divergeait de Stripe dans les cas particuliers (trials, pauses, ajustements mid-cycle)**

- `app/services/subscription_service.ts` : `getPeriodBounds()` lit désormais directement les bornes autoritaires de Stripe. Dans la version d'API du SDK utilisé (stripe v22), `current_period_start` / `current_period_end` vivent sur l'item de souscription (`stripeSub.items.data[0]`), pas sur la souscription — le correctif les lit à cet endroit
- Test ajouté : `tests/functional/billing/subscription_service.spec.ts` (un anchor 2020 avec une période Stripe 2030 : la période stockée doit être 2030, prouvant que les valeurs Stripe sont utilisées telles quelles et non recalculées)

## 2026-07-03 — [#168] Membres : flash messages d'erreur passés en i18n

**Corrige A-05 : quatre flash d'erreur de `OrganizationMembersController` utilisaient des clés brutes (`member_user_not_found`, `member_already_member`, `member_last_admin`) au lieu de `i18n.t(...)` — l'utilisateur voyait une clé technique au lieu d'un message traduit**

- `app/controllers/organization_members_controller.ts` : les flash de `store()` (`UserNotFoundError`, `AlreadyMemberError`) et de `update()`/`destroy()` (`LastAdminError`) passent désormais par `i18n.t('flash.members.*')`
- `resources/lang/en/flash.json` et `resources/lang/fr/flash.json` : nouvelles clés `members.userNotFound`, `members.alreadyMember`, `members.lastAdmin`
- Tests ajoutés : `tests/functional/organization/members.spec.ts` (flash i18n vérifié pour email sans compte, membre déjà présent, et retrait/rétrogradation du dernier admin)

## 2026-07-03 — [#167] Membres : l'owner de l'org apparaît toujours dans la liste

**Corrige A-04 : `listMembers()` ne lisait que la table `organization_memberships`. Un user rattaché à une organisation mais sans ligne de membership (drift de données, ou owner créé avant le backfill des memberships) n'apparaissait jamais — la page members pouvait être vide**

- `app/services/organization_member_service.ts` : `listMembers()` appelle désormais `ensureMembershipsForOrgUsers()` en amont — pour chaque user de l'org sans membership, une membership `admin` est créée (idempotent via la contrainte unique `(user_id, organization_id)`). L'invariant « tout user de l'org a une membership » est ainsi auto-réparé, sans changement de type ni de frontend (`id` reste l'id de membership, donc les actions rôle/suppression continuent de fonctionner)
- Le backfill des données existantes était déjà couvert par la migration `1779400001000_backfill_organization_memberships.ts` ; ce correctif ajoute la garantie au runtime
- Test ajouté : `tests/functional/organization/members.spec.ts` (un user avec `organizationId` mais sans membership apparaît dans la liste en rôle `admin`, et sa membership est bien créée)

**Corrige A-06, D-04 et E-03 : `vine.compile()` est interdit par les règles du projet (déprécié). Il subsistait dans plusieurs validators des domaines auth, navigation/équipage et CSV**

- `app/validators/organization_member.ts` : les 4 validators (`inviteMemberValidator`, `updateMemberRoleValidator`, `acceptInvitationValidator`, `declineInvitationValidator`) utilisent désormais `vine.create()`
- `app/validators/navigation_log.ts` : les 3 validators (`createNavigationLogValidator`, `updateNavigationLogValidator`, `closeNavigationLogValidator`) utilisent désormais `vine.create()`
- `app/validators/crew.ts` : les 4 validators (`createCrewMemberValidator`, `updateCrewMemberValidator`, `createCrewCertificationValidator`, `syncNavigationLogCrewValidator`) utilisent désormais `vine.create()`
- `app/validators/csv_import.ts` : les 2 validators (`csvPreviewValidator`, `csvConfirmValidator`) utilisent désormais `vine.create()`
- Remplacement mécanique sans changement de comportement (même API, `vine.create` est le remplaçant direct de `vine.compile`)

## 2026-07-03 — [#196] Membres : flash message sur MemberNotFoundError

**Corrige A-10 : `MemberNotFoundError` levée dans `update()` et `destroy()` de `OrganizationMembersController` provoquait une redirection silencieuse, sans indiquer à l'utilisateur ce qui s'était passé**

- `app/controllers/organization_members_controller.ts` (`update()` ligne 93, `destroy()` ligne 119) : ajout de `session.flash('error', i18n.t('flash.members.notFound'))` avant le redirect
- `resources/lang/en/flash.json` et `resources/lang/fr/flash.json` : nouvelle clé `members.notFound`
- Tests ajoutés : `tests/functional/organization/members.spec.ts` (flash d'erreur vérifié sur `PUT` et `DELETE` avec un id de membre inexistant)

## 2026-07-03 — [#197] Auth : fullName trimmé et vidé en null si vide

**Corrige A-11 : `fullName` n'était pas trimmé au signup ni à la mise à jour du profil — une valeur composée uniquement d'espaces (`"   "`) passait la validation et rendait le getter `initials` vide (`charAt` sur une chaîne vide)**

- `app/validators/user.ts` : `fullName` (`signupValidator` et `updateProfileValidator`) utilise désormais `vine.string().trim().maxLength(255).nullable().transform((v) => v || null)` — les espaces sont retirés puis la chaîne vide résultante est convertie en `null`
- Tests ajoutés : `tests/functional/auth/signup.spec.ts` et `tests/functional/settings/settings.spec.ts` (valeur uniquement composée d'espaces stockée comme `null`, valeur avec espaces superflus trimée avant stockage)

## 2026-07-03 — [#198] Équipements : purchasePrice validé comme nombre décimal positif

**Corrige B-07 : `purchasePrice` était déclaré `vine.string().trim()` dans trois validators alors que la colonne DB est `decimal(10, 2)` — les valeurs `"-500"`, `"abc"` ou `"3.14.15"` passaient la validation et pouvaient corrompre la base**

- `app/validators/boat_safety_equipment.ts`, `app/validators/boat_generic_equipment.ts`, `app/validators/boat_engine_part.ts` : `purchasePrice` utilise désormais `vine.number().positive().decimal([0, 2]).nullable().optional()`
- `shared/types/boat.ts` : `purchasePrice` passe de `string | null` à `number | null` dans `BoatSafetyEquipmentPayload`, `BoatGenericEquipmentPayload` et `BoatEnginePartPayload`
- `app/utils/boat_utils.ts` : nouvel helper `toDecimalStringOrNull()` pour convertir le nombre validé en chaîne décimale avant stockage (colonne `decimal` mappée en `string` côté Lucid)
- `app/services/boat_safety_equipment_service.ts`, `app/services/boat_generic_equipment_service.ts`, `app/services/boat_engine_part_service.ts` : utilisation de `toDecimalStringOrNull()` en création et mise à jour
- Test ajouté : `tests/functional/boats/equipment_purchase_price.spec.ts` (rejet des valeurs négatives/non-numériques, acceptation des valeurs valides, pour les trois routes)

## 2026-07-03 — [#199] Pièces moteur : stock non renseigné n'est plus traité comme épuisé

**Corrige B-08 : `listLowStock()` incluait `stock IS NULL OR stock <= min_stock_alert`, déclenchant une fausse alerte low-stock dès qu'une pièce avait un `minStockAlert` défini mais un `stock` non renseigné (tracking désactivé)**

- `app/services/boat_engine_part_service.ts` : `listLowStock()` retire la branche `stock IS NULL` — les comparaisons SQL `<=` excluent déjà nativement les valeurs NULL
- Test ajouté : `tests/integration/services/boat_engine_part_service.spec.ts` (`listLowStock ignores parts with untracked (null) stock`)

## 2026-07-03 — [#200] Réservations : totalPrice à 0 accepté (prestation offerte)

**Corrige C-04 : `vine.number().positive()` excluait 0, rendant impossible la création d'une réservation gratuite (invitation, test, prestation offerte)**

- `app/validators/boat_reservation_validator.ts` : `totalPrice` utilise désormais `.min(0)` au lieu de `.positive()`, dans les validators `create` et `update` — les valeurs négatives restent rejetées
- Test ajouté : `tests/functional/boats/reservations.spec.ts` (`totalPrice: 0` accepté et persisté)

## 2026-07-03 — [#202] Réservations : garde sur la suppression d'une réservation confirmée

**Corrige C-06 : `destroy()` supprimait n'importe quelle réservation (y compris `confirmed`) sans droit spécifique — un simple membre pouvait annuler une réservation confirmée**

- `app/policies/boat_policy.ts` : nouvelle ability `deleteReservation(user, boat, reservation)` — refuse la suppression si `reservation.status === 'confirmed'` pour un non-admin ; les admins passent via le hook `before()` existant (même pattern que `FuelLogPolicy`)
- `app/services/boat_reservation_service.ts` : `findForBoat()` extrait de `delete()` pour permettre au contrôleur de récupérer la réservation avant l'autorisation
- `app/controllers/boat_reservations_controller.ts` : `destroy()` charge la réservation puis appelle `bouncer.with(BoatPolicy).authorize('deleteReservation', boat, reservation)` avant suppression
- Tests ajoutés : `tests/functional/boats/reservations.spec.ts` (refus pour un membre non-admin sur réservation confirmée, autorisation sur réservation non confirmée, autorisation admin sur réservation confirmée)

## 2026-07-03 — [#203] Logs carburant : validation croisée quantity/pricePerLiter/totalCost

**Corrige D-09 : le validator acceptait `totalCost` incohérent avec `quantityLiters * pricePerLiter` sans contrôle**

- `app/services/boat_fuel_log_service.ts` : `createForBoat()` vérifie désormais, quand `pricePerLiter` et `totalCost` sont tous deux fournis, que `Math.abs(totalCost - quantityLiters * pricePerLiter) < 0.01` ; sinon `BoatFuelLogValidationError('inconsistentCost')`
- `resources/lang/{fr,en}/flash.json` : clé `fuelLog.inconsistentCost` ajoutée
- Tests ajoutés : `tests/functional/boats/fuel_logs.spec.ts` (rejet si incohérent, acceptation dans la tolérance d'arrondi)

## 2026-07-03 — [#205] Import CSV : nom de la pièce "Coût total" traduit (i18n)

**Corrige E-08 : `importMaintenanceRows()` créait la pièce de coût avec le libellé français `'Coût total'` codé en dur, quelle que soit la locale de l'utilisateur**

- `app/services/csv_import_service.ts` : `importMaintenanceRows()` prend désormais un paramètre `i18n: I18n` et utilise `i18n.t('maintenance.history.timeline.totalCost')` (clé déjà existante côté frontend) au lieu de la chaîne en dur
- `app/controllers/csv_import_controller.ts` : `confirm()` transmet `i18n` (déjà disponible dans le `HttpContext`) à `importMaintenanceRows()`
- Tests ajoutés : `tests/integration/services/csv_import_service.spec.ts` (le nom de la pièce reflète la locale `fr` et `en`)

## 2026-07-03 — [#206] Import CSV : messages d'erreur de validation traduits (i18n)

**Corrige E-09 : `validateMaintenanceRow()` retournait des messages français hardcodés, cassant l'expérience en mode anglais**

- `shared/types/csv.ts` : `CsvRowError` (message déjà traduit, envoyé au frontend) séparé de `CsvRowErrorKey` (clé i18n + params, usage interne) ; `CsvPreviewRowKeys` pour la sortie brute du service
- `app/services/csv_import_service.ts` : `validateMaintenanceRow()` retourne désormais des clés i18n (`flash.csv.rowErrors.*`) avec params (ex. `subjectInvalid` interpole la liste des sujets acceptés) au lieu de chaînes en dur
- `app/controllers/csv_import_controller.ts` : résolution des clés via `i18n.t()` avant d'envoyer les lignes de prévisualisation au frontend
- `resources/lang/{en,fr}/flash.json` : nouvelle section `csv.rowErrors` (date invalide, titre requis, sujet invalide, légendes moteur/voile requises, coût invalide)
- Tests ajoutés : `tests/unit/services/csv_import_service.spec.ts` (clés i18n + params retournés par le service) et `tests/functional/settings/csv_import.spec.ts` (messages traduits en anglais par défaut, en français via `Accept-Language`, interpolation du message de sujet invalide)
  main

## 2026-07-03 — [#207] Plan de mouillage : validation des coordonnées de position sur le canvas

**Corrige G-07 : les positions des pontons/mouillages n'étaient pas bornées aux dimensions du canvas**

- `shared/constants/marina_layout.ts` : nouvelle constante `MARINA_CANVAS_WIDTH` (1400) / `MARINA_CANVAS_HEIGHT` (900), source unique pour backend et frontend
- `app/validators/marina_layout.ts` : `updatePositionValidator` borne désormais `x`/`y` entre `0` et les dimensions du canvas (`.min(0).max(...)`), routes `PATCH /ports/:portId/pontoons/:pontoonId/position` et `PATCH /ports/:portId/mouillages/:mouillageId/position`
- `inertia/components/ports/show/MarinaCanvas.vue` : le SVG utilise la constante partagée (au lieu de valeurs `1400`/`900` en dur) et le drag-and-drop clampe la position à l'intérieur du canvas pendant le déplacement
- Tests fonctionnels ajoutés dans `tests/functional/ports/pontoons.spec.ts` et `tests/functional/ports/mouillages.spec.ts` : coordonnées valides acceptées, coordonnées négatives et hors-limites rejetées

## 2026-07-03 — [#208] Planning : tests fonctionnels pour le bucket "non datées"

**Complète la PR #243 (issue #209, duplicata de #208) qui ajoutait le bucket `undatedTasks`**

- `tests/functional/planning/index.spec.ts` : couverture de `GET /planning` — une tâche sans `dueAt` ni `dueEngineHours` atterrit dans `undatedTasks` et non dans `plannedTasks` ou `overdueTasks`
- Aucun changement de comportement : `app/services/planning_service.ts`, `inertia/pages/planning/index.vue` et les traductions `planning.json` étaient déjà en place depuis #243

## 2026-07-01 — [#186] Maintenance : les items d'une fiche complétée sont désormais en lecture seule

**Correction de la mutabilité des fiches terminées**

- `app/exceptions/maintenance_errors.ts` : ajout de `BoatMaintenanceSheetValidationError` (avec `errorCode`)
- `app/services/boat_maintenance_sheet_service.ts` : `updateItem()` vérifie `sheet.status === 'completed'` et lève `BoatMaintenanceSheetValidationError('sheet is completed', 'sheetAlreadyCompleted')`
- `app/controllers/boat_maintenance_sheet_items_controller.ts` : capture `BoatMaintenanceSheetValidationError` et renvoie le message flash `flash.maintenanceSheets.${errorCode}`
- `resources/lang/{fr,en}/flash.json` : ajout de la clé `sheetAlreadyCompleted`

## 2026-07-01 — [#187] Maintenance : décrémentation atomique du stock de pièces moteur

**Correction d'une race condition read-modify-write lors de la décrémentation du stock**

- `app/services/boat_maintenance_service.ts` : remplacement du pattern lecture → calcul → save par un `UPDATE` atomique via `db.raw()` utilisant `CASE WHEN` pour garantir `GREATEST(0, stock - used)` et la mise à jour conditionnelle de `wear_state` dans une seule opération SQL. Élimine la possibilité que deux transactions concurrentes lisent le même stock avant écriture.
- `tests/integration/services/boat_maintenance_service.spec.ts` : ajout de 3 tests couvrant le clamp à 0 quand `quantity > stock`, la préservation de `wearState = 'damaged'`, et la préservation de `stock = null`.

## 2026-07-01 — [#188] Escales portuaires : autoriser cost = 0 (mouillages gratuits)

**Correction du validateur qui rejetait les escales gratuites (cost = 0)**

- `app/validators/boat_port_stay_validator.ts` : remplacement de `.positive()` par `.min(0)` sur `cost` — cohérent avec `boat_document.ts` qui utilise déjà `.min(0)`.
- Permet d'enregistrer les mouillages gratuits, ports partenaires et invitations sans coût.

## 2026-07-01 — [#189] Budget : inclure les documents sans date d'émission (issued_at = null)

**Correction du calcul mensuel du budget qui ignorait silencieusement les documents sans date d'émission**

- `app/services/budget_service.ts` : `fetchDocumentsByMonth` utilise désormais `COALESCE(issued_at, created_at)` au lieu de `issued_at` seul — les documents sans date d'émission sont rattachés au mois de leur création plutôt qu'exclus du budget.
- `tests/functional/boats/budget.spec.ts` : test ajouté pour vérifier qu'un document avec `issued_at = null` et un coût est bien comptabilisé dans le budget annuel.

## 2026-07-01 — [#190] Budget : autoriser les montants négatifs (avoirs, remboursements)

**Correction du validateur qui rejetait les montants négatifs dans les entrées budgétaires**

- `app/validators/budget_entry_validator.ts` : suppression de `.positive()` sur `amount` — seul `.decimal([0, 2])` est conservé, permettant les montants négatifs (avoirs, remboursements assurance, ajustements).
- `inertia/components/boats/budget/BudgetEntryForm.vue` : suppression de `min="0"` sur le champ montant pour cohérence avec la validation backend.
- La colonne DB `decimal(10, 2)` supporte nativement les négatifs — aucune migration nécessaire.
- Le `SUM(amount)` dans `budget_service.ts` impute naturellement les crédits en réduction du total.
- `tests/functional/boats/budget_entries.spec.ts` : 2 nouveaux tests (POST et PATCH avec montants négatifs).

## 2026-07-01 — [#191] i18n : flash messages ports/pontoons/mouillages traduits via i18n.t()

**Correction des flash messages hardcodés (raw keys) dans les controllers ports/pontoons/mouillages**

- `app/controllers/ports_controller.ts` : `session.flash('error', 'port_has_boats')` → `i18n.t('flash.ports.hasBoats')`
- `app/controllers/pontoons_controller.ts` : `session.flash('error', 'pontoon_has_boats')` → `i18n.t('flash.pontoons.hasBoats')`
- `app/controllers/mouillages_controller.ts` : `session.flash('error', 'mouillage_has_boats')` → `i18n.t('flash.mouillages.hasBoats')`
- `resources/lang/fr/flash.json` et `resources/lang/en/flash.json` : ajout des clés `ports.hasBoats`, `pontoons.hasBoats`, `mouillages.hasBoats`
- `tests/functional/ports/ports.spec.ts` : test du cas `PortHasBoatsError` → redirection avec flash
- `tests/functional/ports/pontoons.spec.ts` : tests delete nominal + `PontoonHasBoatsError`
- `tests/functional/ports/mouillages.spec.ts` : tests delete nominal + `MouillageHasBoatsError`

## 2026-07-01 — [#193] Sécurité : correction race condition TOCTOU sur suppression pontoon/mouillage

**Race condition (TOCTOU) corrigée dans la suppression des pontoons et mouillages**

- `app/services/pontoon_service.ts` : `deleteForPort` enveloppe désormais le count de bateaux et le `delete()` dans `db.transaction()` avec `.useTransaction(trx)` sur toutes les requêtes, garantissant qu'aucun bateau ne peut être affecté à un spot entre la vérification et la suppression.
- `app/services/mouillage_service.ts` : même correction appliquée à `MouillageService.deleteForPort`.
- `tests/integration/services/pontoon_service.spec.ts` : 3 nouveaux tests — suppression sans spots, suppression avec spots libres, et `PontoonHasBoatsError` quand un bateau occupe un spot.
- `tests/integration/services/mouillage_service.spec.ts` : 3 nouveaux tests symétriques pour `MouillageService`.

## 2026-07-01 — [#194] Sécurité : correction race condition TOCTOU sur quota tokens IA

**Race condition (TOCTOU) corrigée dans la vérification du quota de tokens Mistral**

- `app/services/ai_token_quota_service.ts` : ajout de `withOrgLock<T>(orgId, fn)` — mutex async par organisation basé sur un chaînage de Promises. Deux requêtes simultanées du même org sont sérialisées : la seconde attend que la première termine (check + appel Mistral + `recordUsage`) avant de relire le quota.
- `app/services/ai_analysis_service.ts` : `generateFleetAnalysis` et `generateBoatSuggestions` enveloppent désormais la séquence `getUsage → assertCanUseTokens → chat → recordUsage` dans `withOrgLock`, ce qui empêche deux requêtes concurrentes de passer le check de quota simultanément.
- `tests/functional/quota/ai_token_quota.spec.ts` : 3 nouveaux tests — sérialisation des appels concurrents du même org, parallélisme toujours actif entre orgs différents, et vérification que le second appel concurrent est bien bloqué par `QuotaExceededError` quand le quota est dépassé par le premier.

## 2026-07-01 — [#195] Sécurité : AuthorizationException de Bouncer re-propagée dans boatSuggestions

**Correction d'une exception de Bouncer avalée silencieusement**

- `app/controllers/ai_controller.ts` : ajout d'un branch `else if (error instanceof bouncerErrors.E_AUTHORIZATION_FAILURE) { throw error }` dans le catch de `boatSuggestions`, avant le `else` générique. Les `AuthorizationException` levées par Bouncer (`bouncer.with(BoatPolicy).authorize('view', boat)`) sont désormais re-propagées au framework (qui les gère avec un redirect + flash `error: Access denied`) au lieu d'être masquées comme une erreur d'analyse.
- `tests/functional/ai/boat_suggestions.spec.ts` : 3 nouveaux tests fonctionnels (unauthentifié → /login, boat not found → redirect silencieux, bouncer deny → redirect + flash `errorsBag.E_AUTHORIZATION_FAILURE`).

## 2026-07-01 — [#166] Sécurité : ai_analyses scopées par organisation pour éviter la fuite de données inter-org

**Fuite de données inter-organisation corrigée**

- Migration `1806000000000_alter_ai_analyses_add_organization_id.ts` : ajoute `organization_id` (FK → organizations) + index `(organization_id, kind)` à la table `ai_analyses`.
- `database/schema.ts` : `AiAnalysisSchema` enrichi du champ `organizationId`.
- `app/models/ai_analysis.ts` : relation `belongsTo(Organization)` ajoutée.
- `app/services/ai_analysis_service.ts` :
  - `getLatestFleetAnalysis(userId, orgId)` — filtre désormais aussi par `organizationId`.
  - `getLatestBoatSuggestions(userId, boatId, orgId)` — idem.
  - `generateFleetAnalysis()` et `generateBoatSuggestions()` — stockent `organizationId` à la création.
- `app/controllers/home_controller.ts` : passe `user.organizationId` à `getLatestFleetAnalysis` ; retourne `null` si l'utilisateur n'a pas d'org.
- `app/controllers/boats_controller.ts` : passe `user.organization.id` à `getLatestBoatSuggestions`.
- `database/factories/ai_analysis_factory.ts` : nouvelle factory de test.
- 5 tests d'intégration ajoutés dans `tests/integration/services/ai_analysis_service.spec.ts`.

## 2026-07-01 — [#160] Correction : assertCanExport utilisé à tort sur l'endpoint d'import CSV

**Bug de contrôle d'accès corrigé**

- `app/controllers/csv_import_controller.ts` — `preview()` appelait `this.quotaService.assertCanExport(user.organization)` alors qu'il s'agit d'un endpoint d'**import** CSV. Résultat : tous les utilisateurs sur le plan `starter` (sans accès export) ne pouvaient pas importer, alors que l'import est une feature sans restriction de plan.
- Correction : suppression de la gate `assertCanExport` (et du `user.load('organization')` devenu inutile), l'import CSV est désormais accessible à tous les plans.
- Nettoyage : `QuotaService` retiré du constructeur puisqu'il n'est plus utilisé.
- 4 tests fonctionnels ajoutés dans `tests/functional/settings/csv_import.spec.ts` (plan starter, plan pro, non authentifié, bateau inconnu).
- Route concernée : `POST /settings/import/preview`

## 2026-06-30 — [#158] Correction : expiresAt certification d'équipage cassée en PostgreSQL

**Bug critique corrigé**

- `app/controllers/crew_certifications_controller.ts` — `String(payload.expiresAt)` sur un objet `Date` produit un format non-ISO (`Mon Jan 15...`) rejeté par PostgreSQL. Remplacé par `payload.expiresAt ?? null` (valeur brute passée au service).
- `app/services/crew_service.ts` — le cast `as unknown as any` masquait le type mismatch. Remplacé par `toDateTime(payload.expiresAt)` (helper `shared/helpers/date.ts`) qui convertit `Date | string | DateTime` en Luxon `DateTime` avant persistance via `@column.date()`.
- `shared/types/crew.ts` — `CreateCrewCertificationPayload.expiresAt` typé `Date | string | DateTime | null` (cohérent avec les autres payloads du projet).
- 4 tests fonctionnels ajoutés dans `tests/functional/crew/crew_certifications.spec.ts` (création avec date, sans date, IDOR, suppression).
- Routes concernées : `POST /crew/:memberId/certifications`, `DELETE /crew/:memberId/certifications/:certId`

## 2026-06-30 — [#157] Sécurité IDOR : syncCrewForNavigationLog scopé par organisation

**Bug de sécurité corrigé**

- `app/services/crew_service.ts` — `syncCrewForNavigationLog` construisait le `pivotData` directement depuis `payload.crew` sans vérifier que les IDs de membres appartiennent à l'organisation du log. Un utilisateur de l'org A pouvait injecter des IDs de membres de l'org B via un PATCH sur `/boats/:id/navigation-logs/:logId/crew`.
- **Correctif** : requête préalable `CrewMember.query().whereIn('id', ids).where('organizationId', log.organizationId)` — seuls les IDs validés dans la bonne org sont inclus dans le `sync`.
- Route concernée : `PATCH /boats/:boatId/navigation-logs/:logId/crew`

## 2026-06-30 — [#155] Sécurité IDOR : destroyMedia et downloadMedia sur pièces moteur

**Bug de sécurité corrigé**

- `app/controllers/boat_engine_parts_controller.ts` — `destroyMedia` et `downloadMedia` validaient uniquement le `boatId` via `loadBoat`, sans vérifier que l'`engineId` appartient bien au bateau ni que le `partId` appartient à cet engine. Un utilisateur pouvait forger l'URL pour lire ou supprimer des fichiers d'une autre organisation.
- Ajout des mêmes guards que dans `storeDocument` : `boat.engines.find(e.id === engineId)` puis `equipmentService.findEnginePart(engineId, partId)` avant toute opération.
- 7 tests fonctionnels ajoutés dans `tests/functional/boats/boat_engine_parts_media.spec.ts` couvrant le cas nominal et les deux vecteurs IDOR (engineId cross-org et partId cross-engine) pour les deux actions.

## 2026-06-30 — [#153] Sécurité IDOR : suppression de médias scopée par entité

**Bug de sécurité corrigé**

- `app/services/media_service.ts` — `deleteById()` renommé en `deleteForEntity(mediaId, entityType, entityId, org)`. Le lookup bare par PK (`Media.find`) est remplacé par un filtre sur `entityType` + `entityId`, identique à `getForEntity()`. Un utilisateur ne peut désormais plus supprimer un media appartenant à un autre bateau ou une autre organisation en injectant un `mediaId` arbitraire dans la route.
- `app/controllers/boat_media_controller.ts` — `destroy()` et `destroyEngineMedia()` passent désormais `entityType` et `entityId` à `deleteForEntity`.
- `app/controllers/boat_engine_parts_controller.ts` — `destroyMedia()` idem.
- `app/services/boat_document_service.ts` — `delete()` passe `entityType: 'boat'` et `entityId: doc.boatId` à `deleteForEntity`.
- **Tests** : `tests/functional/boats/boat_media.spec.ts` — 4 cas dont le scénario IDOR cross-org.

## 2026-06-30 — [#162] Correction comparaison intraday du statut de document bateau

**Bug corrigé**

- `app/services/boat_document_service.ts` — `computeStatus()` : comparaison désormais en jours entiers via `startOf('day')` des deux côtés. Avant le correctif, un document dont `expiresAt` était à minuit du jour J était immédiatement marqué `expired` à 00:00:01, car `DateTime.now()` (avec l'heure courante) produisait un diff négatif. Le document reste maintenant `expiring_soon` toute la journée J et passe à `expired` uniquement le lendemain.

## 2026-06-30 — [#150] Sécurité invitations : vérification email + déclin + ré-invitation sans blocage

**Bugs corrigés**

- `app/services/organization_invitation_service.ts` — `accept()` : chargement du `User` et comparaison insensible à la casse avec `invitation.email` ; lève `InvitationEmailMismatchError` si l'email ne correspond pas — correction d'une escalade de privilèges horizontale (n'importe quel utilisateur authentifié pouvait accepter un lien d'invitation destiné à quelqu'un d'autre)
- `app/services/organization_invitation_service.ts` — `create()` : avant d'insérer, annule (`status = 'cancelled'`) toute invitation `pending` existante pour le même couple `(organizationId, email)` — l'envoi d'une nouvelle invitation à la même adresse ne bloque plus avec `InvitationAlreadyExistsError`
- `app/services/organization_invitation_service.ts` — nouvelle méthode `decline(plainToken)` : vérifie le token et passe l'invitation en `cancelled`

**Nouvelles routes**

- `POST /invitations/decline` (publique, sans auth) — annule l'invitation via son token ; redirige vers `/`

**Contrôleur / validateur**

- `app/controllers/organization_invitations_controller.ts` : nouvelle action `decline()` avec gestion des erreurs (`InvitationNotFoundError`, `InvitationExpiredError`, `InvitationAlreadyAcceptedError`) ; gestion de `InvitationEmailMismatchError` dans `accept()`
- `app/validators/organization_member.ts` : ajout de `declineInvitationValidator`

**Frontend**

- `inertia/pages/invitations/accept.vue` : le bouton « Décliner » (état invitation valide + utilisateur authentifié) poste désormais via `useForm` vers `POST /invitations/decline` au lieu d'être un simple lien vers `/`

**i18n** (FR + EN)

- `flash.invitation.emailMismatch` — email non correspondant
- `flash.invitation.declined` — invitation refusée

**Tests** : 8 tests fonctionnels (`tests/functional/organization/invitations.spec.ts`) — accept (email correct, mismatch, casse, non authentifié), decline (annulation, public, token invalide), re-invite (remplacement de l'ancienne invitation)

---

## 2026-06-29 — [F-01] endedAt peut être antérieur à startedAt sur une escale portuaire

**Bug corrigé**

- `app/validators/boat_port_stay_validator.ts` : ajout de `.afterOrSameAs('startedAt')` sur le champ `endedAt` — validation cross-field empêche la persistance d'escales aux dates inversées
- `resources/lang/fr/validator.json` + `en/validator.json` : ajout de la clé `date.afterOrSameAs` pour le message d'erreur traduit
- Tests : 3 tests fonctionnels couvrant `endedAt < startedAt` (POST et PATCH rejetés) et `endedAt = startedAt` (même jour accepté)

## 2026-06-29 — [F-03] Suppression d'un document administratif nettoyait pas Cloudinary

**Bug corrigé**

- `app/services/boat_document_service.ts` : `BoatDocumentService` injecte désormais `MediaService` via `@inject()` ; `delete()` appelle `mediaService.deleteById(doc.mediaId, org)` avant `doc.delete()` si un media est associé — plus de fichiers orphelins sur Cloudinary, plus d'enregistrements `media` fantômes, quota décrémenté correctement
- `database/factories/boat_document_factory.ts` : nouvelle factory `BoatDocumentFactory`
- Tests : 5 tests fonctionnels couvrant suppression sans media, suppression avec media (Cloudinary mocké), document inexistant, accès non authentifié, accès inter-org

## 2026-06-29 — [G-02] Contrainte UNIQUE sur spot_id dans boats

**Bug corrigé**

- Migration `1805000001000` : ajout de la contrainte `UNIQUE (spot_id)` sur la table `boats` — PostgreSQL ignore les NULL, plusieurs bateaux sans spot restent valides
- `app/models/spot.ts` : relation `hasMany(() => Boat)` → `hasOne(() => Boat)` pour refléter la cardinalité réelle
- `app/services/boat_hull_service.ts` : éviction silencieuse de l'occupant précédent avant toute assignation (`createForUser`, `updateForUser`, `updateAssignment`) — chaque opération wrapped dans `db.transaction()` + `FOR UPDATE` pour éviter les race conditions
- Tests : 5 tests fonctionnels couvrant assignation libre, éviction lors d'un PATCH, éviction lors d'un POST /boats, réassignation sur le spot courant, désassignation

## 2026-06-28 — Audit & complétion feature Budget

**Bugs corrigés**

- `budget.vue` : suppression du doublon `entries` dans le computed `categories` (7ème carte fantôme supprimée)
- `BoatPortStayService.listForBoat` : ajout du filtre `year` optionnel — la liste des séjours est maintenant cohérente avec l'année sélectionnée dans le sélecteur
- `BudgetCategoryCard.vue` : remplacement du `<button>` brut par `<BaseButton variant="ghost">` ; prop `unavailable` et clé `budget.portUnavailable` orphelines supprimées

**Architecture**

- `shared/types/budget.ts` : `BUDGET_ENTRY_CATEGORIES` et `BudgetEntryCategory` déplacés depuis `app/validators/` (conventions)
- `BoatBudgetEntryItem.amount` normalisé en `number` (était `string`, forçait un cast dans la vue)
- Nouveau `app/transformers/budget_transformer.ts` : `toBudgetEntryItem()` + `toPortStayItem()` — la mise en forme inline du `BudgetController.show` a été extraite

**Nouvelles fonctionnalités**

- `PATCH /boats/:id/budget/entries/:entryId` : édition d'une dépense libre (label, montant, date, catégorie, description)
- `PATCH /boats/:id/port-stays/:stayId` : édition d'un séjour au port
- `BudgetEntryList.vue` + `BudgetPortStayList.vue` : bouton « Modifier » avec formulaire inline (`useForm` → `form.patch`)
- Clés i18n ajoutées : `budget.portStay.editTitle/updateSubmit`, `budget.entries.editTitle/updateSubmit`, `flash.portStay.updated`, `flash.budgetEntry.updated` (FR + EN)

**Tests**

- Nouvelles factories : `BoatBudgetEntryFactory`, `BoatPortStayFactory`
- Tests fonctionnels PATCH pour entries et port stays (auth, isolation org, validation)
- Nouveaux tests Vitest : `BudgetBarChart`, `BudgetEntryForm`, `BudgetEntryList`, `BudgetPortStayForm`, `BudgetPortStayList`

## 2026-06-28 — Composant BaseSegmentedControl + i18n BoatShowTabHistory (issue #144)

- Nouveau composant `inertia/components/base/BaseSegmentedControl.vue` : groupe de boutons jointifs avec `v-model` (`string | number`)
- Tests Vitest complets dans `tests/inertia/base_segmented_control.spec.ts` (rendu, option active, émission, valeurs numériques)
- `BoatShowTabHistory.vue` : remplacement des `<button>` bruts par `<BaseSegmentedControl>` ; toutes les chaînes (filtres, recherche, sidebar, toggle Masquer/Détail, export PDF) passent désormais par `t()` avec les clés `boats.show.historyTab.*` en FR et EN

## 2026-06-28 — Correctifs post-review réservations (issue #107)

- Ajout d'un index composé `(organization_id, starts_at)` via une nouvelle migration pour accélérer `listForOrg`
- Interface d'édition : composant `ReservationEditModal` + bouton « Modifier » dans `ReservationList` — le PATCH est désormais accessible depuis l'UI
- Timeline flotte : fin de réservation exclusive (`<` au lieu de `<=`) ; `rounded-r` corrigé en conséquence pour que la pilule s'arrête au bon jour
- `ReservationConflictError.conflictingId` supprimé (propriété morte, jamais utilisée dans les controllers)
- `formatDate` extrait en composable `use_reservation_format.ts` (était dupliqué dans `ReservationList` et `FleetReservationList`)
- `boatOptions` dans `reservations/index.vue` encapsulé dans `computed()` pour rester réactif aux rechargements partiels
- Tests : couverture du cas PATCH `endBeforeStart` et isolation inter-org sur `GET /reservations`
- i18n : clé `reservations.form.edit` ajoutée (EN + FR)

## 2026-06-27 — Système de réservation par bateau (issue #107)

Module complet de réservation de bateaux pour les entreprises (charter, club, école de voile).

- Table `boat_reservations` : `boat_id` (FK CASCADE), `organization_id` (FK CASCADE), `status` (option/confirmed/cancelled), `starts_at`/`ends_at` (datetime), `client_name`, `client_email`, `client_phone`, `notes`, `total_price` ; index composé `(boat_id, starts_at, ends_at, status)` pour la détection de conflits
- Modèle `BoatReservation` avec relations `belongsTo` Boat et Organization ; `hasMany` ajouté sur Boat
- Service `BoatReservationService` : `listForBoat`, `listForOrg`, `create`, `update`, `delete` ; détection de chevauchement (`starts_at < endsAt AND ends_at > startsAt`, status != cancelled) avec `ReservationConflictError`
- Exceptions `reservation_errors.ts` : `ReservationNotFoundError`, `ReservationConflictError` (porte conflictingId), `ReservationValidationError`
- Validators VineJS : `createBoatReservationValidator` / `updateBoatReservationValidator` (datetime-local + date)
- Controller `BoatReservationsController` : GET/POST/PATCH/DELETE `/boats/:boatId/reservations` ; flash sur conflit
- Controller `ReservationsController` : GET `/reservations` (vue flotte multi-bateaux avec `FleetBoatCalendarEntry`)
- Pages : `boats/reservations.vue` (calendrier mono-bateau + formulaire + liste) et `reservations/index.vue` (timeline flotte + filtre bateau)
- Composants : `ReservationForm`, `ReservationList`, `ReservationStatusBadge`, `ReservationCalendar`, `ReservationTimeline`, `ReservationTimelineRow`, `FleetReservationList`
- i18n : `resources/lang/{fr,en}/reservations.json` + clés `flash.reservation.*` + `nav.reservations` ; lien nav ajouté dans la section FLOTTE
- Note : `client_id` FK CRM reporté — champs inline `client_name/email/phone` utilisés en attendant (voir issue CRM)
- Tests : `tests/functional/boats/reservations.spec.ts` (15 cas : index, store, update, destroy, fleet)

## 2026-06-27 — File d'attente offline : liste et annulation des mutations en attente

Complète l'issue #120 en ajoutant la visibilité et la gestion des actions hors-ligne en attente de synchronisation.

- `useOfflineQueue` : ajout de `pendingActions` (ref réactive sur la liste complète des items IDB) et `cancelAction(id)` (suppression individuelle + toast)
- `OfflinePendingQueue.vue` : composant affiché en haut du layout quand des mutations sont en attente — liste chaque action avec son type traduit, son heure et un bouton "Annuler"
- `default.vue` : intègre `<OfflinePendingQueue />` au-dessus du contenu de page
- i18n EN + FR : clés `offline.queue.*` (titre, syncNow, cancel, cancelled, cancelAriaLabel, type.\*)
- Tests Vitest : 9 nouveaux tests (`use_offline_queue` × 5 pour `pendingActions`/`cancelAction`, `offline_pending_queue` × 4 pour le composant)

## 2026-06-25 — Aide contextuelle budget (tooltips sources de données)

Ajout de tooltips sur chaque carte de catégorie du tableau de bord budget pour expliquer d'où viennent les chiffres.

- Prop `helpText` ajoutée sur `BudgetCategoryCard.vue` : affiche une icône `?` avec tooltip au survol
- Page `budget.vue` : chaque `BudgetCategoryCard` reçoit la clé i18n `budget.help.<categorie>` en `helpText`
- i18n : clés `budget.help.maintenance`, `.fuel`, `.documents`, `.port`, `.equipment`, `.entries`, `.total` en FR et EN

Ajout de la possibilite de saisir des depenses libres (taxe de francisation, cotisation club, etc.) dans le module budget.

- Table `boat_budget_entries` : `amount`, `date`, `label`, `category` (maintenance/fuel/documents/port/equipment/other), `description`
- Modele `BoatBudgetEntry` avec relation `belongsTo` vers `Boat`
- Service `BoatBudgetEntryService` : `listForBoat`, `create`, `delete`
- Controller `BoatBudgetEntryController` : `store`, `destroy`
- Routes : `POST /boats/:id/budget/entries`, `DELETE /boats/:id/budget/entries/:entryId`
- `BudgetService` : nouvelle methode `fetchEntriesByMonth` ; `entries` ajoute a `BudgetMonthlyData` et `BudgetYearSummary`
- Export CSV budget : colonne `entries` (depenses_libres) ajoutee
- Frontend : `BudgetEntryForm.vue` (formulaire avec selection de categorie), `BudgetEntryList.vue` (liste avec badges couleur par categorie)
- Page budget : categorie Depenses libres active en orange, grille 6 colonnes
- Graphique mensuel : dataset Depenses libres en orange
- i18n : cles `budget.entries.*`, `budget.categories.entries`, `budget.csv.headers.entries` et `flash.budgetEntry.*` en FR et EN
- Tests : `budget_entries.spec.ts` (creation, suppression, validation, securite)

## 2026-06-25 — Prix d'achat equipements et categorie budget

Ajout des champs `purchase_price` et `purchased_at` sur les 4 modeles d'equipements, avec integration dans le tableau de bord budget annuel.

- 4 migrations : alter `boat_generic_equipment`, `boat_safety_equipment`, `boat_sails`, `boat_engine_parts` pour ajouter `purchase_price` (decimal 10,2) et `purchased_at` (date)
- Validators : champs ajoutes dans `createGenericEquipmentValidator`, `updateGenericEquipmentValidator`, `createSafetyEquipmentValidator`, `updateSafetyEquipmentValidator`, `sailPayload`, `partFields`
- Services : mapping des nouveaux champs dans `BoatGenericEquipmentService`, `BoatSafetyEquipmentService`, `BoatSailService`, `BoatEnginePartService`
- Types : `purchasePrice` et `purchasedAt` ajoutes dans `BoatGenericEquipmentPayload`, `BoatSafetyEquipmentPayload`, `BoatSailPayload`, `BoatEnginePartPayload` (`shared/types/boat.ts`)
- `BudgetMonthlyData` et `BudgetYearSummary` : nouveau champ `equipment`
- `BudgetService.fetchEquipmentByMonth` : agregation sur les 4 tables (avec jointure `boat_engines` pour `boat_engine_parts`)
- Export CSV budget : colonne `equipment` ajoutee
- Frontend : champs prix/date dans `BoatGenericEquipmentFields.vue`, `BoatSafetyEquipmentFields.vue`, `BoatEquipmentSailFields.vue`, `EnginePartModal.vue`
- Page budget : categorie Equipements en couleur verte, grille 5 colonnes
- Graphique mensuel : dataset Equipment en vert
- i18n : `budget.categories.equipment`, `budget.csv.headers.equipment`, `equipment.purchasePrice.label`, `equipment.purchasedAt.label` en FR et EN
- Tests : `budget_equipment.spec.ts` (integration equipements dans budget)

## 2026-06-25 — Sejours au port et integration budget

Ajout de la gestion des sejours au port avec cout, integree dans le tableau de bord budget annuel.

- Table `boat_port_stays` : `port_name`, `started_at`, `ended_at`, `cost`, `notes`
- Modele `BoatPortStay` avec relation `belongsTo` vers `Boat`
- Service `BoatPortStayService` : `listForBoat`, `create`, `delete`
- Controller `BoatPortStayController` : `store`, `destroy`
- Routes : `POST /boats/:id/port-stays`, `DELETE /boats/:id/port-stays/:stayId`
- `BudgetService` : nouvelle methode `fetchPortByMonth` ; `port` ajoute a `BudgetMonthlyData` et `BudgetYearSummary`
- Export CSV budget : colonne `port` ajoutee
- Frontend : `BudgetPortStayForm.vue` (formulaire useForm), `BudgetPortStayList.vue` (liste avec suppression)
- Page budget : categorie Port active avec total et comparaison N-1
- Graphique mensuel : dataset Port en couleur teal
- i18n : cles `budget.portStay.*` et `flash.portStay.*` en FR et EN
- Policy `BoatPolicy.manage` pour controler les droits de gestion

## 2026-06-25 — PWA : interface de résolution de conflits

Quand une action PATCH offline entre en conflit avec une version plus récente du serveur, une modale s'affiche pour laisser l'utilisateur choisir la version à conserver.

- `ConflictResolutionModal.vue` : modale avec tableau comparatif (vos modifications / version serveur), boutons « Garder mes modifications » / « Utiliser la version serveur »
- `use_offline_queue.ts` : `conflictedAction` (ref module) détectée dans `onSuccess` via `flash.conflictData` ; `resolveConflict('local'|'server')` re-enqueue avec le `updatedAt` serveur ou supprime l'action
- `NavigationLogConflictError` porte désormais un `ConflictLogSnapshot` (champs lisibles, sans modèle Lucid)
- Backend : flash `conflictData` (JSON) + `conflictType` au lieu d'un flash `error`, pour que la modale intercepte sans déclencher le toast générique
- `default.vue` : `<ConflictResolutionModal>` câblé ; `conflictedAction` et `resolveConflict` exposés
- i18n `offline.conflict.*` + `navigationLog.field.*` en FR et EN
- Tests : 3 nouveaux cas composable + 5 cas composant modal (175/175)

## 2026-06-25 — PWA : résolution des limites connues V1

Résolution des 4 limites documentées dans `docs/frontend/pwa.md`.

**Limit 2 — Page hors-ligne pour les pages non visitées :**

- `public/offline.html` : page statique servie par le Service Worker quand une navigation échoue (page jamais mise en cache)
- `vite.config.ts` : `navigateFallback: '/offline.html'` + `navigateFallbackDenylist` pour exclure `/api/`, `/up`, `/_inertia`
- `offline.html` ajouté aux `globPatterns` pour garantir sa mise en cache

**Limit 3 — Erreur 5xx ne bloque plus la file :**

- `use_offline_queue.ts` : ajout d'un flag `settled` + `onFinish` safety-net — si ni `onSuccess` ni `onError` ne s'est déclenché (cas 5xx / réseau), `isSyncing` est réinitialisé et l'action reste en file pour le prochain retry
- Tests : cas 5xx couvert dans `use_offline_queue.spec.ts`

**Limit 4 — Formulaires d'édition offline-aware :**

- `NavigationLogUpdateForm.vue` : converti de `<Form>` en `useForm` + `form.patch` + chemin offline (enqueue avec `method: 'patch'`)
- `NavigationLogCloseForm.vue` : même conversion, champ `arrivedAt` contrôlé via `v-model`
- Tests : `navigation_log_update_form.spec.ts` + `navigation_log_close_form.spec.ts`

**Limit 1 — Détection de conflit (last-write-wins) :**

- `shared/types/navigation_log.ts` : `updatedAt` ajouté à `NavigationLogRow` ; `expectedUpdatedAt?` ajouté à `UpdateNavigationLogPayload` et `CloseNavigationLogPayload`
- `app/transformers/boat_transformer.ts` : `updatedAt` exposé dans `toNavigationLog()`
- `app/exceptions/navigation_log_errors.ts` : `NavigationLogConflictError`
- `app/services/navigation_log_service.ts` : vérification `expectedUpdatedAt` dans `updateForBoat()` et `closeTrip()`
- `app/controllers/navigation_logs_controller.ts` : lecture de `_expectedUpdatedAt` (champ brut, hors validation VineJS) + gestion `NavigationLogConflictError`
- Flash i18n `flash.navigationLog.conflict` en FR et EN
- Les formulaires d'édition incluent `_expectedUpdatedAt: log.updatedAt` dans le payload offline

## 2026-06-25 — PWA : notifications cycle de vie SW + prompt d'installation

Compléments aux recommandations vite-plugin-pwa non couverts en V1.

**Fonctionnalités :**

- **`usePwaUpdate`** : utilise `useRegisterSW` (`virtual:pwa-register/vue`) pour afficher un toast « Application prête pour une utilisation hors-ligne » au premier précache complet, et planifie une vérification horaire des mises à jour SW (`registration.update()`).
- **`usePwaInstall`** : capture l'événement `beforeinstallprompt` (état partagé au niveau module) et expose `canInstall` + `promptInstall()`. Le bouton d'installation s'affiche dans la sidebar (`AsideMenu.vue`) quand le navigateur autorise l'install, puis disparaît après `appinstalled`.
- **Alias Vitest** : `virtual:pwa-register/vue` résolu vers un stub de test pour isoler `usePwaUpdate` dans les tests unitaires.
- **i18n** : clés `pwa.offlineReady` et `pwa.install` ajoutées en FR et EN.
- **Types** : `/// <reference types="vite-plugin-pwa/client" />` ajouté dans `inertia/shims.ts`.

**Routes concernées :** aucune.

---

## 2026-06-24 — PWA / mode offline (journal de bord et carburant)

Support hors-ligne pour les pages de navigation, permettant de consulter et saisir des données sans connexion.

**Fonctionnalités :**

- **Service Worker** généré par `vite-plugin-pwa` (Workbox) : précache des assets statiques (JS/CSS/images), cache NetworkFirst pour les pages `/boats/*`, `/navigation/*`, `/planning/*`
- **Manifest PWA** mis à jour (nom Fleetide, thème #0066cc, display standalone) — app installable sur mobile
- **Saisie offline** : les formulaires de création journal de bord (`NavigationLogForm`) et avitaillement (`BoatFuelLogForm`) détectent la connexion et enregistrent en IndexedDB si hors-ligne (toast informatif)
- **Sync automatique** au retour de connexion : le layout déclenchent `drainQueue()` qui rejoue les actions via `router.post/patch` et affiche un toast de succès/erreur
- **Composables** : `useNetworkStatus` (réactivité `navigator.onLine`) et `useOfflineQueue` (IndexedDB via `idb`)

**Routes concernées :** aucune nouvelle route — le SW cache les pages existantes.

**Notes :** En V1, last-write-wins pour les conflits. La navigation Inertia entre pages non-visitées reste bloquée offline (app-shell prévu en V2).

## 2026-06-24 — Tableau de bord budget (dépenses annuelles par poste)

Nouvelle page **Budget** accessible depuis la fiche de chaque bateau (bouton « Budget »).

**Fonctionnalités :**

- Vue agrégée des dépenses par poste : maintenance, carburant, documents/assurance, port (à venir)
- Sélecteur d'année avec comparaison N-1 (delta %)
- Graphique barres empilées mensuel (chart.js + vue-chartjs)
- Export CSV du budget annuel : `GET /boats/:id/export/budget.csv?year=YYYY`
- Champ `cost` ajouté à `boat_documents` (migration + validator + service)

**Routes :**

- `GET /boats/:id/budget` — page budget (paramètre `?year=YYYY` optionnel, défaut = année courante)
- `GET /boats/:id/export/budget.csv` — export CSV du budget annuel

**Sources de données :**

- Maintenance : `SUM(boat_maintenance_parts.unit_price × quantity)` groupé par mois
- Carburant : `SUM(boat_fuel_logs.total_cost)` groupé par mois
- Documents : `SUM(boat_documents.cost)` groupé par mois (date de `issued_at`)
- Port : non disponible en V1, affiché comme « à venir »

## 2026-06-23 — Import / Export CSV (maintenance, avitaillements, journal de bord)

Nouvelle section **Import / Export CSV** accessible dans Paramètres → Import CSV (plans Pro et Enterprise uniquement).

**Export CSV** : téléchargement direct depuis la page de chaque bateau ou depuis la page d'import, format UTF-8 BOM + séparateur `;` (compatibilité Excel FR).

- `GET /boats/:id/export/maintenance.csv` — événements de maintenance avec coût total
- `GET /boats/:id/export/fuel-logs.csv` — avitaillements (quantité, prix, heures moteur…)
- `GET /boats/:id/export/navigation-logs.csv` — journal de bord (départ/arrivée, distance, météo…)

**Import CSV** : upload d'un fichier, dry-run avec aperçu ligne par ligne et rapport d'erreurs, puis confirmation pour créer les enregistrements en base.

- `GET /settings/import` — page d'import/export
- `POST /settings/import/preview` — dry-run, aperçu (50 premières lignes, erreurs colonne par colonne)
- `POST /settings/import/confirm` — import effectif des lignes valides
- `POST /settings/import/cancel` — annulation

**Format attendu (maintenance)** : `date;title;subject;notes;engine_caption;sail_caption;cost`

- `subject` : `boat | hull | engine | sail | rig | electrical | plumbing | safety | deck | other`
- `engine_caption` requis si `subject=engine` ; `sail_caption` requis si `subject=sail`

**Backend**

- `shared/types/csv.ts` — types `CsvImportType`, `CsvPreviewRow`, `CsvImportPreviewData`, `MaintenanceImportRow`, `MAINTENANCE_CSV_HEADERS`
- `app/exceptions/csv_errors.ts` — `CsvImportValidationError`
- `app/validators/csv_import.ts` — `csvPreviewValidator`, `csvConfirmValidator`
- `app/services/csv_import_service.ts` — parsing CSV (BOM, guillemets, semicolons), validation par colonne, `importMaintenanceRows()`
- `app/services/csv_export_service.ts` — `buildCsv()` (BOM + `;`), `csvFilename()`
- `app/controllers/csv_import_controller.ts` — `show`, `preview`, `confirm`, `cancel`
- `app/controllers/csv_export_controller.ts` — `maintenance`, `fuelLogs`, `navigationLogs`
- `start/routes/settings.ts` — routes import
- `start/routes/boats.ts` — routes export
- `resources/lang/{fr,en}/settings.json` — clés `settings.import.*`
- `resources/lang/{fr,en}/flash.json` — clés `flash.csv.*`

**Frontend**

- `inertia/pages/settings/import.vue` — page shell
- `inertia/components/settings/tabs/SettingsImportTab.vue` — formulaire upload + tableau aperçu + section export
- `inertia/components/settings/SettingsShell.vue` — lien "Import CSV" visible sur plans Pro/Enterprise
- `inertia/utils/routes.ts` — helpers `routes.csv.*`
- `.adonisjs/server/pages.d.ts` — enregistrement `settings/import`

## 2026-06-23 — Nouvelles catégories d'équipement (sécurité, navigation, électricité, mouillage, pont)

Extension du modal d'ajout d'équipement (`BoatEquipmentAddModal`) avec 5 nouvelles catégories. La catégorie **Sécurité** était déjà implémentée côté backend ; les 4 autres (`navigation`, `electrical`, `anchoring`, `deck`) utilisent un nouveau modèle générique `boat_generic_equipment`.

**Backend**

- `database/migrations/1800000002000_create_boat_generic_equipment_table.ts` — table `boat_generic_equipment` : `boat_id`, `category`, `name`, `brand`, `model`, `quantity`, `status`, `notes`
- `app/models/boat_generic_equipment.ts` — modèle Lucid étendant `BoatGenericEquipmentSchema`
- `shared/types/boat.ts` — constante `GENERIC_EQUIPMENT_CATEGORIES`, types `GenericEquipmentCategory` et `BoatGenericEquipmentPayload`
- `shared/constants/boats/boat_form_options.ts` — constante `GENERIC_EQUIPMENT_STATUS_OPTIONS` (ok / to_check / to_replace)
- `app/validators/boat_generic_equipment.ts` — validators `createGenericEquipmentValidator` et `updateGenericEquipmentValidator`
- `app/services/boat_generic_equipment_service.ts` — service avec `create`, `update`, `delete`
- `app/controllers/boat_generic_equipment_controller.ts` — contrôleur `store` / `update` / `destroy` ; redirige vers `?tab=equipment`
- `app/models/boat.ts` — relation `hasMany(() => BoatGenericEquipment)`
- `app/services/boat_hull_service.ts` — preload `genericEquipment` dans `getFullDetailForUser`
- `app/transformers/boat_transformer.ts` — `toGenericEquipmentItem`, ajouté dans `toBoatDetail`
- `start/routes/boats.ts` — `POST/PUT/DELETE /boats/:boatId/generic-equipment[/:itemId]`

**Frontend**

- `inertia/types/boat_show.ts` — type `BoatShowGenericEquipment`, champ `genericEquipment[]` dans `BoatShowDetail`
- `inertia/composables/use_boat_options.ts` — `genericEquipmentStatusOptions`
- `inertia/components/boats/equipment/BoatGenericEquipmentFields.vue` — formulaire générique (nom, marque, modèle, quantité, état, notes)
- `inertia/components/boats/equipment/BoatGenericEquipmentCard.vue` — card avec items groupés par catégorie + modaux create/edit/delete
- `inertia/components/boats/show/modals/BoatEquipmentAddModal.vue` — 5 nouvelles catégories ; catégorie transmise via `<input type="hidden" name="category">`
- `inertia/components/boats/show/tabs/BoatShowTabEquipment.vue` — filtre pill "Équipements" + `<BoatGenericEquipmentCard>`

**i18n**

- `resources/lang/fr/boats.json` — clés `equipmentAddModal.categories.*` (safety, navigation, electrical, anchoring, deck), section `genericEquipment`, `options.genericEquipmentStatus`
- `resources/lang/en/boats.json` — idem + ajout de la section `equipmentAddModal` manquante
- `resources/lang/{fr,en}/flash.json` — clés `genericEquipment.{created,updated,deleted,notFound}`

---

## 2026-06-23 — Section Navigation globale dans la sidebar

Restructuration de l'architecture de navigation de l'app pour refléter sa double identité : gestion de flotte + navigation opérationnelle.

**Backend**

- `start/routes/navigation.ts` — 3 nouvelles routes GET protégées par `middleware.auth()` : `/navigation/logbook`, `/navigation/fuel`, `/navigation/incidents`
- `start/routes.ts` — import du nouveau fichier de routes navigation
- `app/controllers/navigation_controller.ts` — contrôleur mince (`@inject()`) avec 3 méthodes : `logbook()`, `fuel()`, `incidents()`. Filtre optionnel `?boatId=` via query string
- `app/services/navigation_service.ts` — service avec 4 méthodes : `getFleetBoats()`, `getFleetLogbook()`, `getFleetFuelLogs()`, `getFleetIncidents()`. Requêtes sur `NavigationLog`, `BoatFuelLog`, `BoatIncident` filtrées par `organizationId`. Preload `boat` (id + name uniquement)
- `shared/types/navigation.ts` — nouveaux types : `FleetLogbookRow`, `FleetFuelLogRow`, `FleetIncidentRow`, `FleetBoatOption`

**Frontend**

- `inertia/composables/use_nav_sections.ts` — ajout section "NAVIGATION" entre Maintenance et Préférences avec 3 items : Journal de bord (`/navigation/logbook`), Carburant (`/navigation/fuel`), Incidents (`/navigation/incidents`)
- `inertia/components/layout/NavIcon.vue` — 3 nouveaux icônes SVG : `compass`, `fuel`, `alert-triangle`
- `inertia/components/navigation/NavigationBoatFilter.vue` — composant select partagé pour filtrer par bateau (utilise `router.get` avec `replace: true`)
- `inertia/components/navigation/LogbookRow.vue`, `FuelLogRow.vue`, `IncidentRow.vue` — lignes de tableau avec lien vers `/boats/:id/navigation`
- `inertia/pages/navigation/logbook.vue` — vue globale du journal de bord (statut, bateau, ports départ/arrivée, distance, date)
- `inertia/pages/navigation/fuel.vue` — vue globale des avitaillements (bateau, date, quantité, coût, fournisseur)
- `inertia/pages/navigation/incidents.vue` — vue globale des incidents (statut, bateau, type, date, lieu)

**i18n**

- `resources/lang/fr/nav.json` + `en/nav.json` — clés `logbook`, `fuel`, `incidents`, `sections.navigation`
- `resources/lang/fr/navigation.json` + `en/navigation.json` — fichiers complets pour les 3 pages globales (titres, colonnes, stats, états vides, filtre)

---

## 2026-06-23 — Tracking GPS / AIS — position temps réel des bateaux (V1) #112

**Backend**

- `database/migrations/1800000000000_alter_boats_add_mmsi_imo.ts` — ajout `mmsi` (varchar 9, nullable) et `imo_number` (varchar 20, nullable) sur la table `boats`
- `database/migrations/1800000001000_alter_boat_position_history_add_gps.ts` — enrichissement `boat_position_history` : `latitude` (decimal 10,7), `longitude` (decimal 10,7), `speed_knots` (decimal 5,2), `heading_degrees` (int), `source` (string : `manual | ais | gps`, défaut `manual`)
- `app/models/boat.ts` — colonnes `mmsi` et `imoNumber`
- `app/models/boat_position_history.ts` — colonnes `latitude`, `longitude`, `speedKnots`, `headingDegrees`, `source`
- `shared/types/boat.ts` — `BoatPositionSource`, `BoatPositionPayload`, champs `mmsi` et `imoNumber` dans `BoatHullPayload`
- `app/validators/boat.ts` — règles MMSI (regex `/^\d{9}$/`) et `imoNumber` dans create/update ; nouveau `updateBoatPositionValidator` (lat/lng avec range)
- `app/services/boat_position_service.ts` — `storeManualPosition()` : crée une entrée `boat_position_history` avec `source='manual'`, clôture l'entrée GPS ouverte précédente
- `app/services/boat_hull_service.ts` — persistance `mmsi` et `imoNumber` dans `createForUser()` et `updateForUser()`
- `app/controllers/boat_position_controller.ts` — `POST /boats/:boatId/position` → valide lat/lng, délègue au service
- `app/controllers/boats_controller.ts` — correction des bugs pré-existants : injection `NavigationLogService`, résolution `navigationLogs`, `portOptions`, `canCreateNavigationLogs`, `canUpdateNavigationLogs`, `canDeleteNavigationLogs` dans `show()`
- `app/transformers/boat_transformer.ts` — `toEditForm` et `toBoatDetail` exposent `mmsi` et `imoNumber` ; `toPositionHistoryEntry` expose `latitude`, `longitude`, `source`
- `start/routes/boats.ts` — route `POST /boats/:boatId/position` → `boats.position.store`

**Frontend**

- `inertia/types/boat_show.ts` — `BoatPositionHistoryRow` : ajout `latitude`, `longitude`, `source` ; `BoatShowDetail` : ajout `mmsi`, `imoNumber`
- `inertia/types/boat_form.ts` — `BoatEditPayload` : ajout `mmsi`, `imoNumber`
- `inertia/components/boats/hull/BoatFormHullFields.vue` — section « Identification AIS » avec champs MMSI et N° IMO
- `inertia/components/boats/show/tabs/overview/BoatOverviewPositionCard.vue` — carte Leaflet (OpenStreetMap) si lat/lng disponible ; formulaire de saisie manuelle lat/lng (Inertia `router.post`)
- `inertia/components/boats/show/tabs/BoatShowTabOverview.vue` — calcul `latestGpsPosition` (dernier historique avec lat/lng non clôturé), passage en props à `BoatOverviewPositionCard`
- `package.json` — dépendances `leaflet` 1.9.4 et `@types/leaflet` 1.9.21
- i18n (fr + en) — clés `hullFields.aisSection`, `mmsi`, `imoNumber`, `show.position.setGps`, `gpsCoords`, `manualTitle`, `latitude`, `longitude`, `saveGps`

**Notes V1** : affichage position manuelle sur carte uniquement (sans AIS). L'intégration API AIS (MarineTraffic / AISHub) et le geofencing sont prévus pour V2 (plan Enterprise).

---

## 2026-06-23 — Gestion des équipiers #110

**Backend**

- `database/migrations/1799000000000_create_crew_members_table.ts` — table `crew_members` : `organization_id` (FK CASCADE), `first_name`, `last_name`, `email` (nullable), `phone` (nullable), `notes` (text nullable)
- `database/migrations/1799000001000_create_crew_certifications_table.ts` — table `crew_certifications` : `crew_member_id` (FK CASCADE), `type` (enum : `coastal_permit | offshore_permit | vhf | stcw_basic | stcw_proficiency | other`), `reference_number` (nullable), `expires_at` (date nullable, indexé)
- `database/migrations/1799000002000_create_navigation_log_crew_table.ts` — table pivot `navigation_log_crew` : `navigation_log_id` (FK CASCADE), `crew_member_id` (FK CASCADE), `role` (enum : `skipper | crew | passenger`, défaut `crew`), contrainte unique `(navigation_log_id, crew_member_id)`
- `app/models/crew_member.ts` — modèle Lucid avec `hasMany(() => CrewCertification)` et `manyToMany(() => NavigationLog)`
- `app/models/crew_certification.ts` — modèle Lucid avec getters calculés `isExpired` et `expiresInDays`
- `app/models/navigation_log.ts` — ajout relation `manyToMany(() => CrewMember, { pivotTable: 'navigation_log_crew', pivotColumns: ['role'] })`
- `shared/types/crew.ts` — types `CrewMemberRow`, `CrewCertificationRow`, `NavigationLogCrewRow`, `CrewMemberOption`, payloads CRUD, enums `CrewCertificationType`, `NavigationLogCrewRole`
- `shared/types/navigation_log.ts` — ajout du champ `crew: NavigationLogCrewRow[]` dans `NavigationLogRow`
- `app/exceptions/crew_errors.ts` — `CrewMemberNotFoundError`, `CrewCertificationNotFoundError`
- `app/validators/crew.ts` — `createCrewMemberValidator`, `updateCrewMemberValidator`, `createCrewCertificationValidator`, `syncNavigationLogCrewValidator`
- `app/policies/crew_member_policy.ts` — `create`/`update` (membres de l'orga), `delete` (admin uniquement)
- `app/services/crew_service.ts` — CRUD équipiers, gestion certifications, `syncCrewForNavigationLog()`, `listOptionsForOrganization()`
- `app/services/crew_role_pdf_service.ts` — génération PDF rôle d'équipage (PDFKit), format tableau avec nom/rôle/email, en-tête de sortie
- `app/services/navigation_log_service.ts` — ajout `getForBoat()`, preload `crew` dans `listForBoat()`
- `app/controllers/crew_members_controller.ts` — `index`, `store`, `update`, `destroy`
- `app/controllers/crew_certifications_controller.ts` — `store`, `destroy`
- `app/controllers/navigation_log_crew_controller.ts` — `sync` (PATCH, remplace tout l'équipage de la sortie)
- `app/controllers/crew_role_pdf_controller.ts` — `download` (GET, retourne PDF)
- `app/transformers/boat_transformer.ts` — ajout `crewMemberOptions` dans `BoatShowContext`, crew dans `toNavigationLog()`
- `app/controllers/boats_controller.ts` — injection `CrewService`, chargement `crewMemberOptions` dans `show()`
- `start/routes/crew.ts` — routes `/crew` CRUD + certifications
- `start/routes/boats.ts` — ajout `PATCH /boats/:boatId/navigation-logs/:logId/crew`, `GET /boats/:boatId/navigation-logs/:logId/crew-role.pdf`
- `start/routes.ts` — import `./routes/crew.js`

**Frontend**

- `inertia/pages/organization/crew.vue` — page liste équipiers avec CRUD inline et gestion des certifications par membre
- `inertia/components/crew/CrewMemberForm.vue` — formulaire création/édition équipier
- `inertia/components/crew/CrewCertificationForm.vue` — formulaire ajout de certification (type, référence, expiration)
- `inertia/components/crew/CrewCertificationBadge.vue` — badge statut certification (valide / expire bientôt / expirée)
- `inertia/components/boats/show/tabs/NavigationLogCrewPanel.vue` — panel gestion équipage d'une sortie (ajout/suppression membres avec rôle, lien PDF)
- `inertia/components/boats/show/tabs/BoatShowTabNavigationLogs.vue` — ajout `crewMemberOptions` prop + intégration `NavigationLogCrewPanel`
- `inertia/components/boats/show/BoatShowTabContent.vue` — prop `crewMemberOptions` transmise
- `inertia/pages/boats/show.vue` — prop `crewMemberOptions` déclarée
- `inertia/composables/use_nav_sections.ts` — ajout entrée "Équipiers" `/crew` dans section FLOTTE
- `inertia/components/layout/NavIcon.vue` — ajout icône `people`

**i18n**

- `resources/lang/fr/crew.json`, `resources/lang/en/crew.json` — toutes les clés équipiers/certifications/PDF
- `resources/lang/fr/nav.json`, `resources/lang/en/nav.json` — clé `crew`
- `resources/lang/fr/flash.json`, `resources/lang/en/flash.json` — namespace `crew`

---

## 2026-06-22 — Journal de bord — saisie des sorties #101

**Backend**

- `database/migrations/1798000000000_create_navigation_logs_table.ts` — table `navigation_logs` : `boat_id` (FK CASCADE), `organization_id` (FK CASCADE), `status` (enum : `in_progress | completed`, défaut `in_progress`), `departed_at` (datetime, indexé), `arrived_at` (nullable), `departure_port_id` / `arrival_port_id` (FK nullable → ports, `SET NULL`), `departure_port_name` / `arrival_port_name` (texte libre fallback), `distance_nm` (decimal), `engine_hours_start` / `engine_hours_end` (decimal), `fuel_consumed_liters` (decimal), `wind_force_beaufort` (int 0–12), `sea_state` (enum : `calm | slight | moderate | rough | very_rough`), `crew_count` (int), `notes` (text)
- `app/models/navigation_log.ts` — modèle Lucid avec relations `@belongsTo` vers `Boat`, `Port` (départ et arrivée)
- `app/exceptions/navigation_log_errors.ts` — `NavigationLogNotFoundError`, `NavigationLogValidationError`
- `shared/types/navigation_log.ts` — types `NavigationLogRow`, `CreateNavigationLogPayload`, `CloseNavigationLogPayload`, `NavigationLogPortOption`, enums `NavigationLogStatus`, `SeaState`
- `app/services/navigation_log_service.ts` — `listForBoat()`, `createForBoat()`, `closeTrip()` (atomique via transaction DB, met à jour `boat_engines.hours` si `engineHoursEnd` fourni), `deleteForBoat()`
- `app/validators/navigation_log.ts` — `createNavigationLogValidator`, `closeNavigationLogValidator` (VineJS)
- `app/policies/navigation_log_policy.ts` — `create` (même org), `delete` (admin uniquement via `before()`)
- `app/controllers/navigation_logs_controller.ts` — routes `store`, `close` (PATCH), `destroy`
- `app/transformers/boat_transformer.ts` — ajout `toNavigationLog()`, mise à jour `BoatShowContext` et `toShowProps`
- `app/models/boat.ts` — ajout relation `hasMany(() => NavigationLog)`
- `app/controllers/boats_controller.ts` — chargement des `navigationLogs` et `portOptions` dans `show()`, vérification bouncer `NavigationLogPolicy`
- `app/services/port_service.ts` — ajout méthode `listNamesForOrg()` (requête légère `id + name`)
- `start/routes/boats.ts` — routes `POST /boats/:boatId/navigation-logs`, `PATCH /boats/:boatId/navigation-logs/:logId/close`, `DELETE /boats/:boatId/navigation-logs/:logId`

**Frontend**

- `inertia/types/boat_show.ts` — export des types `NavigationLogRow`, `NavigationLogStatus`, `SeaState`, `NavigationLogPortOption`
- `inertia/components/boats/show/tabs/NavigationLogForm.vue` — formulaire de création de sortie (départ, port, heures moteur, météo, équipiers, notes)
- `inertia/components/boats/show/tabs/NavigationLogCloseForm.vue` — formulaire de clôture (arrivée, port, distance, heures moteur, carburant, météo)
- `inertia/components/boats/show/tabs/BoatShowTabNavigationLogs.vue` — onglet liste des sorties avec création inline et clôture inline
- `inertia/pages/boats/show.vue` — ajout de l'onglet `navigation-logs`, nouvelles props `navigationLogs`, `portOptions`, `canCreateNavigationLogs`, `canDeleteNavigationLogs`

**i18n**

- `resources/lang/fr/navigation_logs.json` + `resources/lang/en/navigation_logs.json` — nouveau namespace
- `resources/lang/fr/flash.json` + `resources/lang/en/flash.json` — clés `flash.navigationLog.*`

**Comportement notable**

- La clôture d'une sortie est atomique : mise à jour du log + mise à jour des heures moteur du premier moteur actif du bateau dans une seule transaction
- Validation : `arrivedAt > departedAt` côté service (erreur flash `arrivedAtBeforeDeparture`)
- Les ports existants de l'organisation sont proposés en dropdown (optionnel), avec fallback texte libre
- Seuls les admins peuvent supprimer des sorties (policy `delete` toujours `false` sauf via `before()`)

## 2026-06-21 — Notifications temps réel via Transmit

**Backend**

- `config/transmit.ts` — configuration de `@adonisjs/transmit` (transport in-process, no ping)
- `start/transmit.ts` — preload : enregistrement des routes SSE (`/__transmit/events`, `/__transmit/subscribe`, `/__transmit/unsubscribe`) + autorisation de canal `notifications/:userId` (seul le propriétaire peut s'abonner)
- `adonisrc.ts` — ajout du provider `@adonisjs/transmit/transmit_provider` et du preload `start/transmit`
- `app/services/notification_service.ts` — après `Notification.create()`, diffusion SSE sur le canal `notifications/:userId` avec le payload `{ notification: NotificationForFront }`

**Frontend**

- `inertia/composables/use_notifications.ts` — état réactif au niveau module (singleton) + abonnement Transmit dans `onMounted` (connexion unique par session, guard par `subscribedUserId`) ; synchronisation avec les shared props Inertia à chaque navigation ; CSRF géré via `beforeSubscribe`/`beforeUnsubscribe` (ajout du header `X-XSRF-TOKEN` lu depuis le cookie `XSRF-TOKEN`) ; reset automatique de la souscription en cas de changement d'utilisateur (logout/login sans rechargement de page)

**Comportement**

- Connexion SSE établie automatiquement après le premier montage d'un composant authentifié utilisant `useNotifications()`
- Le badge de la cloche se met à jour en temps réel sans rechargement de page
- Le panneau de notifications ajoute la nouvelle notification en tête de liste (max 5 récentes)
- Fallback gracieux : si la connexion Transmit échoue, les données restent synchronisées via les shared props Inertia à chaque navigation

## 2026-06-21 — Notifications in-app #104

**Backend**

- `database/migrations/1798000000000_create_notifications_table.ts` — table `notifications` : `user_id` (FK CASCADE), `organization_id` (FK CASCADE), `type` (string 100), `severity` (string 20, default 'info'), `title` (string 500), `body` (text nullable), `action_url` (string 1000 nullable), `metadata` (json nullable), `read_at` (timestamp nullable), `created_at` (timestamp). Index sur `(user_id, read_at)` et `(organization_id, created_at)`
- `app/models/notification.ts` — modèle Lucid avec relations `belongsTo(User)` et `belongsTo(Organization)`, getter `isRead`
- `shared/types/notification.ts` — types `NotificationType` (extensible), `NotificationSeverity`, `NotificationForFront`, `NotificationsSharedProps`, `NotificationsPage`, `CreateNotificationParams`
- `app/transformers/notification_transformer.ts` — fonction `toRow()` pour le frontend
- `app/services/notification_service.ts` — `create`, `getUnreadCount`, `getRecentUnread`, `sharedProps`, `listForUser`, `markRead`, `markAllRead`, `destroy`
- `app/controllers/notifications_controller.ts` — `index` (page paginée), `markAsRead`, `markAllAsRead`, `destroy` ; réponses par redirection
- `start/routes/notifications.ts` — routes `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/:id`
- `app/middleware/inertia_middleware.ts` — injection de `NotificationService`, prop partagée `notifications` (unreadCount + recent) pour les utilisateurs authentifiés
- `app/listeners/send_ai_token_quota_notification.ts` — création d'une notification in-app en plus de l'email
- `app/listeners/send_storage_quota_notification.ts` — création d'une notification in-app en plus de l'email
- `app/listeners/on_organization_member_joined.ts` — notification aux admins quand un membre rejoint l'organisation
- `app/listeners/on_organization_plan_downgraded.ts` — notification aux admins en plus de l'email
- `resources/lang/fr/notifications.json` et `resources/lang/en/notifications.json` — toutes les clés UI du module

**Frontend**

- `inertia/pages/notifications/index.vue` — page de liste des notifications avec pagination, actions mark as read / delete

## 2026-06-19 — Suivi carburant / avitaillement #102

**Backend**

- `database/migrations/1797000000000_create_fuel_logs_table.ts` — table `fuel_logs` : `boat_id` (FK CASCADE), `organization_id` (FK CASCADE), `boat_engine_id` (FK SET NULL, nullable), `fueled_at` (date), `quantity_liters` decimal(10,3), `price_per_liter` decimal(10,4) nullable, `total_cost` decimal(10,2) nullable, `engine_hours_at_fueling` decimal(10,1) nullable, `supplier` string nullable, `notes` text nullable
- `app/models/boat_fuel_log.ts` — modèle Lucid avec relations `belongsTo(Boat)` et `belongsTo(BoatEngine)`
- `app/exceptions/fuel_log_errors.ts` — `BoatFuelLogNotFoundError`, `BoatFuelLogValidationError`
- `shared/types/fuel_log.ts` — types `CreateFuelLogPayload`, `FuelLogRow`
- `app/validators/boat_fuel_log.ts` — `createBoatFuelLogValidator`
- `app/policies/fuel_log_policy.ts` — policy Bouncer : `create` autorisé aux membres de l'organisation, `delete` réservé aux admins via `before()`
- `app/services/boat_fuel_log_service.ts` — `listForBoat`, `createForBoat` (validation appartenance moteur), `deleteForBoat`
- `app/controllers/boat_fuel_logs_controller.ts` — `store`, `destroy` ; réponses par redirection vers `?tab=fuel`
- `start/routes/boats.ts` — routes `POST /boats/:boatId/fuel-logs`, `DELETE /boats/:boatId/fuel-logs/:logId`
- `app/controllers/boats_controller.ts` — injection de `BoatFuelLogService`, chargement des fuel logs + `canDeleteFuelLogs` dans `show`
- `app/transformers/boat_transformer.ts` — `toFuelLog()` + `canDeleteFuelLogs` dans `toShowProps()`
- `resources/lang/fr/flash.json` et `resources/lang/en/flash.json` — clés `fuelLog.*`

**Frontend**

- `resources/lang/fr/fuel_logs.json` et `resources/lang/en/fuel_logs.json` — toutes les clés UI du module
- `inertia/types/boat_show.ts` — re-export de `FuelLogRow`
- `inertia/components/boats/show/tabs/BoatShowTabFuelLogs.vue` — onglet carburant : liste des avitaillements avec date, quantité, coût, moteur, heures moteur, fournisseur, notes ; compteur total litres
- `inertia/components/boats/show/tabs/BoatFuelLogForm.vue` — formulaire de création d'avitaillement
- `inertia/pages/boats/show.vue` — ajout de l'onglet "Carburant" avec props `fuelLogs` et `canDeleteFuelLogs`

## 2026-06-19 — Rapport d'incident / avarie #106

**Backend**

- `database/migrations/1796000000000_create_boat_incidents_table.ts` — table `boat_incidents` : `boat_id`, `organization_id`, `occurred_at`, `type` (enum : grounding, flooding, rigging_failure, engine_failure, collision, fire, theft_vandalism, other), `location`, `description`, `insurance_claimed`, `insurance_claim_ref`, `status` (enum : open, in_progress, closed), `closed_at`
- `app/models/boat_incident.ts` — modèle Lucid avec relation `belongsTo(Boat)`
- `app/exceptions/incident_errors.ts` — `BoatIncidentNotFoundError`, `BoatIncidentValidationError`
- `shared/types/incident.ts` — types `IncidentType`, `IncidentStatus`, `CreateIncidentPayload`, `UpdateIncidentPayload`, `BoatIncidentRow`
- `app/validators/boat_incident.ts` — `createBoatIncidentValidator`, `updateBoatIncidentValidator`
- `app/policies/incident_policy.ts` — policy Bouncer (view, create, edit, delete)
- `app/services/boat_incident_service.ts` — `listForBoat`, `createForBoat`, `updateForBoat`, `deleteForBoat` ; clôture automatique de `closed_at` au passage en statut `closed`
- `app/controllers/boat_incidents_controller.ts` — `store`, `update`, `destroy`
- `start/routes/boats.ts` — routes `POST /boats/:boatId/incidents`, `PUT /boats/:boatId/incidents/:incidentId`, `DELETE /boats/:boatId/incidents/:incidentId`
- `app/controllers/boats_controller.ts` — injection de `BoatIncidentService`, chargement des incidents dans le `show`
- `app/transformers/boat_transformer.ts` — `toIncident()` + inclusion dans `toShowProps()`
- `resources/lang/fr/flash.json` et `resources/lang/en/flash.json` — clés `incidents.*`

**Frontend**

- `resources/lang/fr/incidents.json` et `resources/lang/en/incidents.json` — toutes les clés UI du module
- `inertia/types/boat_show.ts` — types `IncidentType`, `IncidentStatus`, `BoatIncidentRow`
- `inertia/components/boats/show/tabs/BoatShowTabIncidents.vue` — onglet incidents : liste avec code couleur par statut (open=coral, in_progress=amber, closed=gris), formulaire création/édition inline, suppression avec confirmation
- `inertia/pages/boats/show.vue` — ajout de l'onglet "Incidents" avec badge comptant les incidents ouverts/en cours

## 2026-06-19 — Correctifs documents administratifs bateau (#103 suite)

**Correctifs bloquants**

- `app/jobs/send_reminder_emails.ts` — fenêtres d'envoi exclusives : `(8, 30)` + `(0, 7)` — supprime le double envoi pour les documents expirant dans ≤7 jours
- `app/services/boat_document_service.ts` — `toReminderItem` : guard null sur `expiresAt` avant l'assertion ; `getExpiringDocuments(fromDaysAhead, toDaysAhead)` : borne inférieure `>=` (documents expirant aujourd'hui inclus)
- `inertia/components/boats/show/tabs/BoatShowTabAdminDocs.vue` — remplacement du `<button>` brut par `<BaseButton>` (convention projet)

**Correctifs importants**

- `database/migrations/1796000001000_add_index_boat_documents_expires_at.ts` — index sur `expires_at` (requête cron quotidienne)
- `app/validators/boat_document.ts` — factory `boatDocumentFields()` partagée entre create et update
- `app/services/reminder_email_service.ts` — injection de `BoatDocumentService` ; suppression de la requête et du mapping dupliqués ; utilisation de `getExpiringDocuments` + `toReminderItem`
- `app/transformers/boat_transformer.ts` + `app/controllers/boats_controller.ts` + `inertia/pages/boats/show.vue` — `canManageDocuments` découplé de `canManageEquipment`

**Suggestions appliquées**

- `shared/constants/boats/boat_document_constants.ts` — constante `BOAT_DOCUMENT_EXPIRY_WARNING_DAYS = 30` partagée entre service et job
- `inertia/components/base/BaseBadge.vue` — variante `danger` ajoutée ; `expired` → `'danger'` dans `statusVariant`
- `resources/views/emails/reminder_document_expiry.edge` — suppression du `.slice(0, 10)` redondant sur `expiresAt`

## 2026-06-19 — Documents administratifs bateau avec dates d'expiration et alertes #103

**Backend**

- `database/migrations/1796000000000_create_boat_documents_table.ts` — table `boat_documents` : `type` (enum), `custom_type_label`, `reference_number`, `issued_at`, `expires_at`, `issuer`, `media_id` (FK nullable → media), `notes`
- `app/models/boat_document.ts` — modèle Lucid avec relations `boat` et `media`
- `app/services/boat_document_service.ts` — CRUD + calcul du statut (valid / expiring_soon / expired) + `getExpiringDocuments(daysAhead)`
- `app/controllers/boat_documents_controller.ts` — routes POST/PUT/DELETE `/boats/:boatId/admin-documents[/:documentId]`
- `app/validators/boat_document.ts` — validation VineJS (type enum, dates nullable)
- `app/exceptions/boat_document_errors.ts` — `BoatDocumentNotFoundError`
- `shared/types/boat_document.ts` — types partagés : `BoatDocumentType`, `BoatDocumentRow`, `ReminderDocumentItem`
- `shared/constants/media.ts` — ajout de `'boat_document'` dans `MEDIA_ENTITY_TYPES`
- `app/services/reminder_email_service.ts` — `sendDocumentExpirationReminders(30|7)` : alertes email 30 j et 7 j avant expiration
- `app/services/email_queue_service.ts` — `sendReminderDocumentExpiry()` + template `reminder_document_expiry.edge`
- `app/jobs/send_reminder_emails.ts` — appel des deux nouvelles méthodes
- Types disponibles : francisation, assurance, permis de navigation, licence radio VHF, certificat de sécurité, jauge, certificat CE, rôle d'équipage, autre

**Frontend**

- Onglet "Documents admin." ajouté à la fiche bateau (`show.vue`) avec badge si des documents expirent bientôt / sont expirés
- `BoatShowTabAdminDocs.vue` — liste des documents avec statut coloré, actions modifier/supprimer
- `BoatAdminDocumentFormModal.vue` — modal création / édition (type, référence, dates, organisme, notes)
- Clés i18n ajoutées dans `fr/boats.json` et `en/boats.json` (namespace `adminDocs`)
- Flash messages `boatDocument.*` dans `fr/flash.json` et `en/flash.json`

## 2026-06-18 — Compte démo sandbox accessible sans inscription #96

**Backend**

- `database/seeders/sandbox_seeder.ts` — seeder dédié à l'organisation "Marina Démo" : 5 bateaux (voiliers + moteurs) avec équipements complets (moteurs, voiles, gréements) et historiques de maintenance (5 événements + tâches par bateau)
- `app/services/demo_service.ts` — service `DemoService` : `reset()` supprime l'org demo et re-seede, `ensureExists()` crée les données si absentes, `isDemoUser()` identifie le compte démo
- `app/jobs/reset_demo_data.ts` — job `ResetDemoData` pour le scheduler
- `app/controllers/demo_controller.ts` — route GET `/demo` : auto-login du compte démo sans saisie de credentials + redirection vers le dashboard
- `app/controllers/session_controller.ts` — au logout du compte démo, `DemoService.reset()` est déclenché (données remises à zéro)
- `start/routes/demo.ts` — route `/demo` protégée par rate limiting (5 req/min/IP)
- `start/limiter.ts` — throttle `demoThrottle` dédié
- `start/routes.ts` — import de `routes/demo.js`
- `start/scheduler.ts` — cron quotidien `0 4 * * *` (reset 4h du matin, Europe/Paris)
- `.env.example` — variables `DEMO_EMAIL` et `DEMO_PASSWORD`

**Frontend**

- `inertia/components/marketing/home/HomeDemoSection.vue` — nouveau CTA card "Essayer la démo" (accès instantané, sans inscription) en priorité sur la card "Réserver une démo guidée"
- `inertia/pages/marketing/home.vue` — types `PageProps` mis à jour (`tryDemoLabel`, `tryDemoSubtitle`) + binding des nouvelles props
- `resources/lang/fr/marketing.json` — clés `try_demo_label`, `try_demo_subtitle`
- `resources/lang/en/marketing.json` — idem en anglais

**Comportement de reset**

- À chaque logout du compte `demo@fleetai.app` : les données sont effacées et recréées
- Cron quotidien à 4h : reset de sécurité si personne ne s'est déconnecté
- Accès : GET `/demo` → connexion auto → dashboard avec 5 bateaux pré-remplis

---

## 2026-06-18 — Suppression bouton /careers inexistant — page About #94

**Frontend**

- `inertia/components/marketing/about/AboutTeamSection.vue` — suppression du `<BaseButton href="/careers">` qui produisait une 404 ; le hiring banner conserve son titre et sous-titre
- `shared/types/marketing.ts` — suppression du champ `hiringCta` du type `team`

**Backend**

- `app/controllers/marketing_controller.ts` — suppression de `hiringCta: t('team_hiring_cta')`
- `resources/lang/fr/marketing.json` + `resources/lang/en/marketing.json` — suppression des clés `team_hiring_cta`

---

## 2026-06-17 — Carnet d'entretien PDF — Pro & Enterprise #60

**Backend**

- `app/services/maintenance_log_pdf_service.ts` — génération PDF (PDFKit) : en-tête bateau, spécifications, historique chronologique des interventions avec pièces.
- `app/controllers/maintenance_log_pdf_controller.ts` — route `GET /boats/:id/maintenance-log.pdf`, vérifie `assertCanExport` (403→redirect pour plan Starter).
- `app/services/quota_service.ts` — ajout méthode `canExport(org): boolean` (lecture seule, sans lever d'exception).
- `start/routes/boats.ts` — route `boats.maintenanceLog.download`.
- `app/transformers/boat_transformer.ts` — prop `canExport` ajoutée dans `toShowProps` / `BoatShowContext`.

**Frontend**

- `inertia/pages/boats/show.vue` — prop `canExport`, bouton "Télécharger le carnet PDF" visible pour les orgs Pro/Enterprise.
- `inertia/types/boat_show.ts` — type `MaintenanceLogPdfProps`.
- `resources/lang/fr/boats.json` + `resources/lang/en/boats.json` — clés `boats.maintenanceLog.*`.

---

## 2026-06-17 — Fix : crash page Planning #86

**Frontend**

- `inertia/components/planning/PlanningTaskCard.vue` — remplacement de `:route="\`/boats/${task.boatId}\`"`par`route="boats.show" :params="{ id: task.boatId }"`sur`BaseButton`. La prop `route`attend un nom de route Tuyau, pas un chemin URL ; passer un chemin URL appelait`tuyau.getRoute('/boats/:id')`au rendu et levait`Error: Route /boats/:id not found`, faisant crasher toute la page Planning dès l'ouverture.
- `inertia/components/planning/PlanningCalendar.vue` — même correctif sur le bouton "Planifier" de la section tâches sans date.

---

## 2026-06-17 — White-label emails transactionnels avec branding org #81

**Backend**

- `shared/types/branding.ts` — ajout de `BrandingEmailParams` (`appName`, `primaryColor`, `logoUrl`).
- `app/services/branding_service.ts` — méthode `toEmailParams(org)` : retourne `BrandingEmailParams | null` (null si plan non-Enterprise).
- `app/services/email_queue_service.ts` — ajout du paramètre optionnel `branding?: BrandingEmailParams | null` sur les 11 méthodes org-spécifiques (`sendInvitation`, `sendStorageQuotaWarning`, `sendAiTokenQuotaWarning`, `sendPlanDowngradeNotification`, tous les `sendReminder*`). Le branding est passé à `edge.render()`.
- Callers mis à jour :
  - `app/controllers/organization_invitations_controller.ts` — passe `this.brandingService.toEmailParams(user.organization)`.
  - `app/listeners/send_storage_quota_notification.ts` — passe le branding de l'org de l'event.
  - `app/listeners/send_ai_token_quota_notification.ts` — idem.
  - `app/listeners/on_organization_plan_downgraded.ts` — idem.
  - `app/services/reminder_email_service.ts` — charge l'org par `Organization.find(orgId)` (en parallèle avec les admins) pour injecter le branding dans tous les reminders.

**Template**

- `resources/views/emails/_layout.edge` — header dynamique : `branding.primaryColor ?? '#1e3a5f'` pour la couleur, logo Cloudinary si `branding.logoUrl`, sinon `branding.appName ?? 'FleetAi'` en texte. Footer utilise `appName` avec fallback.

## 2026-06-17 — White-label branding core — Enterprise #80

**Backend**

- `database/migrations/1794000000000_add_branding_to_organizations.ts` — ajout des colonnes `logo_url`, `logo_public_id`, `primary_color`, `secondary_color`, `app_name` (nullable) sur la table `organizations`.
- `shared/types/branding.ts` — interfaces `BrandingConfig` et `BrandingUpdatePayload`.
- `shared/types/plan.ts` — ajout de `canWhiteLabel: boolean` dans `PlanQuotas` (false pour Starter & Pro, true pour Enterprise).
- `app/services/cloudinary_service.ts` — ajout du dossier `orgLogo` dans `CloudinaryFolders`.
- `app/services/branding_service.ts` — `uploadLogo` (remplace l'ancien logo sur Cloudinary), `deleteLogo`, `updateBranding` (couleurs + app_name), `toBrandingConfig`.
- `app/validators/branding.ts` — `updateBrandingValidator` (couleurs hex + app_name) et `uploadLogoValidator` (2 Mo, JPG/PNG/SVG/WebP).
- `app/policies/organization_policy.ts` — méthode `configureBranding` (accordée aux admins via `before()`).
- `app/controllers/settings_controller.ts` — méthodes `branding`, `updateBranding`, `uploadLogo`, `deleteLogo`.
- `start/routes/settings.ts` — routes `GET/PUT /settings/branding` + `POST/DELETE /settings/branding/logo`.
- `app/middleware/inertia_middleware.ts` — injection du `BrandingConfig` de l'organisation dans les props Inertia partagées (null si plan non-Enterprise).

**Frontend**

- `inertia/pages/settings/branding.vue` — page de configuration branding.
- `inertia/components/settings/tabs/SettingsBrandingTab.vue` — upload de logo (preview instantané), champs couleurs avec color picker natif, champ app_name, aperçu des couleurs en bande.
- `inertia/components/settings/SettingsShell.vue` — section "Marque blanche" ajoutée dans la nav pour les orgs Enterprise.
- `resources/lang/{fr,en}/settings.json` — clés `settings.sections.branding` et `settings.branding.*`.
- `resources/lang/{fr,en}/flash.json` — clés `settings.brandingUpdated`, `settings.logoUpdated`, `settings.logoDeleted`.

## 2026-06-17 — Regroupement automatique des tâches de maintenance — Pro & Enterprise #63

**Backend**

- `shared/types/plan.ts` — ajout de `canGroupTasks: boolean` dans `PlanQuotas` (false pour Starter, true pour Pro & Enterprise).
- `shared/types/planning.ts` — ajout de l'interface `TaskGroup` (`id`, `subject`, `boatId`, `boatName`, `tasks`, `earliestDueAt`, `latestDueAt`) et extension de `PlanningResult` avec `groups: TaskGroup[]` et `canGroupTasks: boolean`.
- `app/services/task_grouping_service.ts` — algorithme de clustering : regroupe les tâches par date (`kind === 'date'`, `status === 'open'`) qui partagent le même bateau et sujet, avec une fenêtre de proximité de 7 jours (balayage trié par `boatId → subject → dueAt`). Produit des groupes d'au moins 2 tâches.
- `app/services/planning_service.ts` — injection de `TaskGroupingService`, chargement de l'`Organization` pour lire le plan, calcul des groupes si `canGroupTasks`, exposition dans `PlanningResult`.
- `app/controllers/planning_controller.ts` — passage de `groups` et `canGroupTasks` à la vue Inertia.

**Frontend**

- Extraction de la page `planning/index.vue` (550 lignes → ~110 lignes) en 4 composants dédiés dans `inertia/components/planning/` :
  - `PlanningKanban.vue` — 4 colonnes Kanban avec support des groupes dans la colonne "Planifiées".
  - `PlanningCalendar.vue` — calendrier mensuel + agenda mobile + tâches sans date + tâches par heures.
  - `PlanningTaskCard.vue` — carte individuelle réutilisable (accent, badge, barré pour done).
  - `PlanningTaskGroup.vue` — carte pliable pour un groupe (sujet, plage de dates, bouton "Dissocier").
- `planning/index.vue` — toggle "Regroupement" (visible uniquement en Pro+), teaser upsell pour Starter, gestion des groupes dissociés en session (Set client-side).
- Comportement :
  - Le regroupement est activé par défaut et peut être désactivé via le toggle.
  - Les tâches groupées sont masquées des listes individuelles et affichées dans `PlanningTaskGroup`.
  - "Dissocier" retire le groupe de la vue pour la session courante.

**i18n** (FR + EN)

- `planning.grouping.toggle` — libellé du bouton toggle.
- `planning.grouping.toggleTitle` — title/tooltip du toggle.
- `planning.grouping.ungroup` — bouton de dissociation dans un groupe.
- `planning.grouping.proTeaser` — message d'incitation pour les plans Starter.

**Tests**

- `tests/unit/task_grouping_service.spec.ts` — 10 cas unitaires couvrant : entrée vide, tâche seule, regroupement dans la fenêtre, hors fenêtre (8 jours), sujets différents, bateaux différents, tâches par heures exclues, tâches done exclues, limite exacte de 7 jours, deux groupes indépendants.

---

## 2026-06-16 — Limite de tokens IA mensuelle — Pro (1M tokens/mois) #64

**Backend**

- Table `ai_token_usages` (`organization_id`, `month` YYYY-MM, `tokens_used`, `created_at`, `updated_at`) avec contrainte unique `(organization_id, month)`.
- `app/models/ai_token_usage.ts` — modèle Lucid avec relation `organization`.
- `app/services/ai_token_quota_service.ts` — `getUsage()`, `assertCanUseTokens()`, `recordUsage()` (upsert atomique + dispatch événement seuils 80%/100%), `resetMonth()`.
- `app/services/ai_service.ts` — `chat()` retourne maintenant `{ content, tokensUsed }` au lieu de `string`.
- `app/services/ai_analysis_service.ts` — `generateFleetAnalysis()` et `generateBoatSuggestions()` acceptent `org: Organization`, vérifient le quota avant appel, enregistrent les tokens consommés.
- `app/jobs/run_ai_chat.ts` — ajout de `organizationId` dans le payload, vérification quota + enregistrement usage dans `execute()`.
- `app/services/ai_queue_service.ts` — ajout de `organizationId` dans `enqueueChat()`.
- `app/jobs/reset_ai_token_usage.ts` — job de reset mensuel (1er du mois à 01h00 Europe/Paris) qui supprime les entrées du mois précédent.
- `app/events/ai_token_threshold_crossed.ts` + `app/listeners/send_ai_token_quota_notification.ts` — notification email aux admins à 80% et 100% du quota.
- `app/services/email_queue_service.ts` — ajout de `sendAiTokenQuotaWarning()`.
- `resources/views/emails/ai_token_quota_warning.edge` — template email FR+EN alerte tokens IA.
- `shared/types/plan.ts` — ajout de `aiTokensPerMonth` dans `PlanQuotas` (Pro = 1_000_000, Enterprise/Starter = null) et `aiTokens` dans `QuotaUsage`.
- `app/exceptions/quota_errors.ts` — ajout de `'ai_tokens'` dans `QuotaFeature`.
- `app/controllers/settings_controller.ts` — `billing()` expose `aiTokens.used` + `aiTokens.limit` dans `quotaUsage`.
- Routes AI inchangées — quota token check intégré dans les services existants.

**Frontend**

- `inertia/components/settings/tabs/SettingsBillingTab.vue` — jauge `SettingsBillingUsageGauge` pour les tokens IA, affichée uniquement si `canUseAI`.

**i18n** (FR + EN)

- `settings.billing.usage.aiTokens` — libellé jauge tokens IA.
- `flash.quota.aiTokensExceeded` — message flash quand le quota est dépassé.

---

## 2026-06-16 — Audit log — Pro (90 jours) & Enterprise (illimité) #71

**Backend**

- Table `audit_logs` (`organization_id`, `user_id`, `action`, `entity_type`, `entity_id`, `metadata`, `created_at`) avec index sur `(organization_id, created_at)`.
- `app/models/audit_log.ts` — modèle Lucid avec relations `user` et `organization`.
- `app/services/audit_log_service.ts` — `log()`, `list()` (pagination + filtres), `purgeExpired()`, `canAccessAuditLog()`.
- `app/controllers/audit_logs_controller.ts` — `GET /settings/audit-log` (pagination, filtres user/action).
- `app/jobs/purge_audit_logs.ts` — job de purge quotidien à 03h00 (Europe/Paris) des logs expirés.
- `shared/types/plan.ts` — ajout de `auditLogRetentionDays` dans `PlanQuotas` : Starter = 0 (pas d'accès), Pro = 90 jours, Enterprise = null (illimité).
- `shared/types/audit_log.ts` — types `AuditAction`, `AuditLogEntry`, `AuditLogFilters`, `AuditLogPage`.
- Actions tracées : `login`, `logout`, `boat.create`, `boat.update`, `boat.delete`, `member.add`, `member.remove`, `member.update_role`.
- Route : `GET /settings/audit-log` (alias `settings.auditLog`), protégée par auth + `OrganizationPolicy.viewAuditLog`.

**Frontend**

- `inertia/pages/settings/audit_log.vue` — page Inertia avec shell settings.
- `inertia/components/settings/tabs/SettingsAuditLogTab.vue` — tableau avec filtres (utilisateur, action) et pagination.
- `SettingsShell.vue` — onglet "Journal d'activité" visible pour Pro et Enterprise uniquement.
- Clés i18n `settings.auditLog.*` ajoutées en FR et EN.

---

## 2026-06-16 — Refactor : event StorageThresholdCrossed pour découpler les notifications de quota stockage

**Backend**

- `app/events/storage_threshold_crossed.ts` (nouveau) — event `StorageThresholdCrossed` dispatché quand l'usage stockage franchit 80 % ou 100 % du quota.
- `app/listeners/send_storage_quota_notification.ts` (nouveau) — listener qui charge les admins de l'organisation et enqueue les emails via `EmailQueueService`.
- `app/services/quota_service.ts` — `updateStorageUsed` dispatche désormais `StorageThresholdCrossed.dispatch()` au lieu d'appeler `sendStorageQuotaNotification` directement ; suppression de `emailQueueService` comme dépendance du service.
- `start/events.ts` — wiring `StorageThresholdCrossed` → `SendStorageQuotaNotification`.

## 2026-06-16 — Correctifs post-code-review quota stockage

**Backend**

- `app/services/media_service.ts` — `deleteAllForEntity` accepte désormais `org?: Organization` : somme les bytes des médias avant suppression groupée et appelle `updateStorageUsed(org, -totalBytes)` après (corrigeait une dérive silencieuse du compteur lors de la suppression d'un bateau/moteur/pièce).
- `app/services/media_service.ts` — `logger.warn` si `org` est absent pour un `entityType !== 'user'` (détection en dev des oublis de passage d'organisation).
- `app/services/media_service.ts` — Commentaire explicitant la différence `file.size` (guard pre-upload) vs `uploaded.bytes` (compteur post-Cloudinary, après compression PDF éventuelle).
- `app/services/quota_service.ts` — Commentaire race condition sur `assertCanUpload` (symétrique avec le commentaire existant dans `updateStorageUsed`).
- `app/services/quota_service.ts` — Commentaire side effect `org.refresh()` dans `updateStorageUsed`.

**Email**

- `resources/views/emails/storage_quota_warning.edge` — Correction des accents manquants (`libéré`, `mis à jour`, `Gérer`).

**Tests**

- `tests/functional/quota/storage.spec.ts` — Suppression du test en doublon (`storage usage decrements correctly on deletion`, identique à `updateStorageUsed decrements storage_used_bytes on deletion`).

---

## 2026-06-16 — Comportement downgrade de plan

**Backend**

- `app/exceptions/quota_errors.ts` — `QuotaExceededError` enrichi d'un champ `alreadyOverLimit: boolean` pour distinguer "déjà au-dessus de la limite" (post-downgrade) de "cet upload dépasserait la limite".
- `app/services/quota_service.ts` — `assertCanUpload` vérifie d'abord `storageUsedBytes > limit` (pré-condition post-downgrade, throw avec `alreadyOverLimit: true`), puis `storageUsedBytes + bytes > limit` (cas normal).
- `app/exceptions/handler.ts` — Catch global de `QuotaExceededError` : flash `quota.storageOverflow` si `alreadyOverLimit`, sinon `quota.<feature>Exceeded`, puis redirect back. Couvre les routes upload non catchées localement.
- `app/services/subscription_service.ts` — `updateOrgPlan` détecte un downgrade (`PLAN_ORDER`) et émet l'event `OrganizationPlanDowngraded` après sauvegarde.
- `app/events/organization_plan_downgraded.ts` — Nouvel event avec `organization`, `fromPlan`, `toPlan`.
- `app/listeners/on_organization_plan_downgraded.ts` — Listener : envoie un email de notification à tous les admins de l'organisation via `EmailQueueService.sendPlanDowngradeNotification`.
- `app/services/email_queue_service.ts` — Nouvelle méthode `sendPlanDowngradeNotification` (bilingue FR/EN, déduplication par `orgId:fromPlan:toPlan:yyyy-MM`).
- `resources/views/emails/plan_downgrade.edge` — Template email de notification de downgrade.
- `start/events.ts` — Enregistrement du listener `OnOrganizationPlanDowngraded`.
- `resources/lang/{en,fr}/flash.json` — Clés `quota.storageExceeded` et `quota.storageOverflow` ajoutées.

**Frontend**

- `inertia/components/settings/tabs/SettingsBillingTab.vue` — Banner rouge si `storageUsedBytes > limitBytes` (post-downgrade).
- `resources/lang/{en,fr}/settings.json` — Clé `settings.billing.storageOverflow` ajoutée.

## 2026-06-16 — Correctifs code review : Quota de stockage (#72)

**Backend**

- `app/services/quota_service.ts` — Correctif : le décrément de `storage_used_bytes` est désormais plafonné à la valeur courante (`Math.min`) pour éviter un passage en négatif en cas d'incohérence de données. Commentaire ajouté sur la fenêtre de concurrence des notifications de seuil (déduplication assurée par `correlationSuffix` dans `EmailQueueService`). Ligne vide manquante après le constructeur.

**Frontend**

- `inertia/components/settings/SettingsBillingUsageGauge.vue` — Ko/Mo/Go remplacés par des clés i18n (`settings.billing.usage.kb/mb/gb`) afin d'afficher KB/MB/GB en anglais.
- `resources/lang/fr/settings.json` — Ajout des clés `kb`, `mb`, `gb` (Ko/Mo/Go).
- `resources/lang/en/settings.json` — Ajout des clés `kb`, `mb`, `gb` (KB/MB/GB).

**Tests**

- `tests/functional/quota/storage.spec.ts` — Test HTTP creux remplacé par des assertions Inertia réelles (`assertInertiaComponent` + `assertInertiaPropsContain`). Test dupliqué de décrément remplacé par un test couvrant le plancher à zéro (décrément supérieur à la valeur courante).

**Docs**

- `docs/changelog.md` — Correction des accents manquants sur les entrées du 2026-06-16.

---

## 2026-06-16 — Feature : Quota de stockage (#72)

**Backend**

- `shared/types/plan.ts` — Ajout de `storageGb: number | null` dans `PlanQuotas` (1 Go Starter, 20 Go Pro, null Enterprise). Ajout de `storage: { usedBytes: number; limitBytes: number | null }` dans `QuotaUsage`.
- Migration `1791000000000_add_storage_to_organizations.ts` — Colonne `storage_used_bytes` (bigint, default 0) sur la table `organizations`.
- `database/schema.ts` — Ajout du champ `storageUsedBytes` dans `OrganizationSchema`.
- `app/exceptions/quota_errors.ts` — Ajout de `'storage'` dans le type `QuotaFeature`.
- `app/services/quota_service.ts` — Nouvelles méthodes `storageLimitBytes()`, `assertCanUpload()`, `updateStorageUsed()`. Détection des seuils 80%/100% pour envoi d'email de notification aux admins.
- `app/services/media_service.ts` — Modification de `upload()` et `deleteById()` pour accepter un paramètre `org` optionnel. Vérification du quota avant upload et mise à jour du compteur après upload/suppression.
- `app/services/email_queue_service.ts` — Nouvelle méthode `sendStorageQuotaWarning()` pour notifier les admins.
- `app/controllers/boat_media_controller.ts` — Passage de l'organisation a `upload()` et `deleteById()` pour le tracking du stockage.
- `app/controllers/boat_engine_parts_controller.ts` — Idem pour les documents de pieces moteur.
- `app/controllers/settings_controller.ts` — Ajout de `storage` dans `quotaUsage` pour la page billing.
- `resources/views/emails/storage_quota_warning.edge` — Template email bilingue pour les alertes de quota.

**Frontend**

- `inertia/components/settings/SettingsBillingUsageGauge.vue` — Nouveau composant generique pour les jauges d'usage (boats, members, storage).
- `inertia/components/settings/tabs/SettingsBillingTab.vue` — Utilisation du nouveau composant jauge et ajout de la jauge stockage avec formatage bytes (Ko/Mo/Go).

**i18n** — Cle `settings.billing.usage.storage` ajoutee (FR + EN).

**Tests** — `tests/functional/quota/storage.spec.ts` pour les tests du quota de stockage.

---

## 2026-06-16 — Feature : Personnalisation du modèle IA pour Enterprise (#70)

**Backend**

- `shared/types/plan.ts` — Ajout de `canCustomizeAI: boolean` dans `PlanQuotas` ; valeur `true` uniquement pour le plan Enterprise.
- Migration `1790000000000_add_ai_settings_to_organizations.ts` — Colonnes `ai_system_prompt` (text, nullable) et `ai_model_override` (varchar 100, nullable) sur la table `organizations`.
- `app/validators/user.ts` — `updateAiSettingsValidator` : `aiSystemPrompt` (max 2 000 car., nullable) + `aiModelOverride` (enum parmi `mistral-small-latest`, `mistral-medium-latest`, `mistral-large-latest`, nullable).
- `app/services/ai_analysis_service.ts` — `generateFleetAnalysis()` et `generateBoatSuggestions()` acceptent un `orgSystemPrompt?` optionnel qui est préfixé au prompt système existant.
- `app/controllers/ai_controller.ts` — Passe `user.organization.aiSystemPrompt` à chaque appel `generateFleetAnalysis` / `generateBoatSuggestions`.
- `app/controllers/settings_controller.ts` — Méthodes `ai()` (GET) et `updateAiSettings()` (PUT) ; redirection vers `/settings/billing` si le plan n'est pas Enterprise.
- `start/routes/settings.ts` — Routes `GET /settings/ai` (`settings.ai`) et `PUT /settings/ai` (`settings.ai.update`).

**Frontend**

- `inertia/components/settings/tabs/SettingsAiTab.vue` — Formulaire de configuration : textarea pour le prompt système, select pour le modèle.
- `inertia/pages/settings/ai.vue` — Page settings onglet IA.
- `inertia/components/settings/SettingsShell.vue` — Section « Personnalisation IA » visible uniquement si `PLAN_LIMITS[currentPlan].canCustomizeAI`.

**i18n** — Clés `settings.ai.*` et `settings.sections.ai` ajoutées (FR + EN). Message flash `settings.aiSettingsUpdated` ajouté (FR + EN).

---

## 2026-06-15 — Fix : calendrier planning non responsive sur mobile (#53)

**Vue agenda sur mobile — `inertia/pages/planning/index.vue`**

Sur mobile (`< sm`), la grille 7 colonnes fixe du calendrier compressait chaque colonne à ~45px, rendant les événements illisibles. Ajout d'une vue agenda/liste pour les écrans mobiles : les jours du mois courant ayant des tâches sont affichés en liste verticale avec numéro de jour, étiquette courte du jour et toutes les tâches cliquables. La grille 7 colonnes est conservée à partir de `sm`. Nouvelle clé i18n `planning.calendar.agendaEmpty` (FR + EN) pour l'état vide.

## 2026-06-15 — Fix : drag-and-drop tactile sur MarinaCanvas (#47)

**Support touch/mobile — `MarinaCanvas.vue` / `MarinaPontoon.vue` / `MarinaMouillage.vue`**

Le canvas de plan de port utilisait exclusivement des événements souris (`mousedown`, `mousemove`, `mouseup`), rendant le drag-and-drop inutilisable sur mobile et tablette. Migration vers l'API **Pointer Events** (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`), qui unifie souris, touch et stylet sans code conditionnel. `setPointerCapture` est appelé au début du drag pour garantir la réception des événements `pointermove` même si le doigt quitte la zone SVG. `touch-action: none` sur le SVG empêche le scroll navigateur pendant le drag. Les sous-composants `MarinaPontoon` et `MarinaMouillage` émettent désormais `pointerdown` au lieu de `mousedown`.

## 2026-06-15 — Fix : navigation mobile absente dans le header public (#46)

**Correctif mobile — `AppHeader.vue` / `AppHeaderMobileDrawer.vue`**

Sur mobile (< 768 px), la nav principale (`Features`, `Pricing`, `Guide`) était masquée sans alternative. Ajout d'un bouton hamburger (visible uniquement sous `md:`) qui ouvre un drawer latéral droit. Le drawer expose les mêmes liens que la nav desktop, un sélecteur de langue et les CTA Login / S'inscrire. Fermeture via overlay cliquable, touche Escape, ou navigation Inertia. La logique du drawer est extraite dans `AppHeaderMobileDrawer.vue` pour respecter la limite de 250 lignes par composant. Les boutons Login / S'inscrire sont masqués en desktop dans la barre d'actions lorsque le hamburger est présent.

## 2026-06-15 — Fix : home publique — sections invisibles à cause du scroll-reveal brisé (#40)

**Correctif UX — Page d'accueil publique (`/en`, `/fr`)**

Toutes les sections sous le hero (`HomeProblemSection`, `HomePillarsSection`, `HomeFeatureSection` ×3, `HomePersonasSection`, `HomeStatsBandSection`, `HomeComparisonSection`, `HomeTestimonialsSection`, `HomeSecuritySection`, `HomeFaqSection`) restaient à `opacity: 0` : le composable `useScrollReveal` utilisait `IntersectionObserver` sur une ref qui n'était jamais connectée au DOM.

Cause : le pattern `:ref="(el) => (sectionEl = el as HTMLElement)"` réassigne la variable locale sans mettre à jour `sectionEl.value`, donc l'observer ne recevait jamais l'élément cible.

Fix : remplacement de ce pattern par `:ref="sectionEl"` (Vue gère automatiquement `sectionEl.value = el`) dans les 26 occurrences réparties sur 14 composants de `inertia/components/marketing/home/`.

## 2026-06-15 — Dashboard : stat-cards enrichies — prop delta, liens cliquables, icônes (#39)

**Amélioration UX — Dashboard**

Les 5 stat-cards du dashboard affichaient uniquement un chiffre sans contexte. La prop `delta` (déjà présente dans `BaseStatCard` mais jamais alimentée) est maintenant renseignée depuis le service.

- **`shared/types/dashboard.ts`** : ajout du type `DashboardStatDeltas` (5 compteurs contextuels) et du champ `deltas` dans `DashboardStats`
- **`app/services/dashboard_service.ts`** : calcul des deltas — `boatsInAlert` (bateaux avec maintenance urgente), `boatsWithEngine/Sail/Rig` (bateaux équipés), `overdueCount` (tâches en retard)
- **`inertia/components/base/BaseStatCard.vue`** : ajout prop `href` (rend la carte cliquable via `<a>`) + slot `#icon` pour icône contextuelle
- **`inertia/pages/dashboard.vue`** : chaque carte reçoit `delta`, `href` (/boats ou /planning) et une icône SVG (bateau, engrenage, voile, mât, clé)
- **i18n** : 10 nouvelles clés `dashboard.stats.delta.*` dans `fr/dashboard.json` et `en/dashboard.json`

## 2026-06-15 — Design : unification tokens couleur — suppression des namespaces `abyss` et `lagoon` (#35)

**Refactoring — Design system / CSS**

Triple système de tokens couleur fragmenté (navy / abyss / lagoon pointant vers les mêmes teintes) remplacé par un seul namespace `navy` étendu. La palette `navy` passe de 7 à 11 shades (ajout de 400, 300, 200, 25) pour couvrir toutes les teintes précédemment définies sous `abyss-*` et `lagoon-*`. Tous les composants et pages Inertia migrent vers `navy-*` selon la correspondance exacte des valeurs hex. Aucun changement visuel.

- **`inertia/css/app.css`** : palette `navy` étendue (900→25), blocs `abyss` et `lagoon` supprimés
- **Composants** (`default.vue`, `AsideMenu`, `LanguageSwitcher`, `PublicFooter`, `Logo`, `BaseModal`, `BoatOverviewAiPanel`, `EngineShowTabOverview`, `HomeComparisonSection`, `HomeContentSections`) : `abyss-X` → `navy-Y`, `lagoon-X` → `navy-Y`
- **Pages** (`dashboard`, `planning/index`, `marketing/guide`) : idem

## 2026-06-15 — Fix i18n : drawer mobile — texte hardcodé remplacé par t() (#34)

**Correctif — i18n / Layout**

Le drawer de navigation mobile dans `inertia/layouts/default.vue` affichait du texte hardcodé en français (sections FLOTTE, MAINTENANCE, PREFERENCES ; items Dashboard, Mes bateaux, Planning, Historique, Reglages, Deconnexion) sans passer par `t()`. Résultat : le drawer restait en français même en anglais.

- Création du composable `inertia/composables/use_nav_sections.ts` — source unique des sections de nav avec `t()` (partagée entre `AsideMenu` et le drawer)
- Création du composant `inertia/components/layout/NavIcon.vue` — icônes SVG extraites pour éliminer la duplication
- Refactorisation de `AsideMenu.vue` pour utiliser le composable + `NavIcon`
- Remplacement dans `default.vue` de tous les textes hardcodés : sections via `navSections`, `aria-label` via `t('nav.closeMenu')`, fallback utilisateur via `t('nav.unknownUser')`, déconnexion via `t('nav.logout')`
- Ajout de la clé `nav.closeMenu` dans `resources/lang/fr/nav.json` et `en/nav.json`

## 2026-06-15 — Fix : redirections pour /maintenance et /organization (#32)

**Correctif — Router**

Les routes `/maintenance` et `/organization` renvoyaient une erreur 500 car elles n'étaient pas définies. Ajout de redirections permanentes : `/maintenance` → `/maintenance/history` et `/organization` → `/organization/members`.

## 2026-06-15 — Fix BaseStatCard : badge affiche le label i18n au lieu du nom de l'enum (#31)

**Correctif — BaseStatCard**

Le badge affiché en haut à droite de chaque stat-card affichait le nom brut de l'enum (`neutral`, `info`, `success`, `warning`) au lieu d'un libellé localisé. Ajout des clés `common.tone.*` dans `resources/lang/{fr,en}/common.json` et utilisation de `t('common.tone.' + tone)` dans `BaseStatCard.vue`.

## 2026-06-15 — Fix rendu des templates email Edge v6 (#27)

**Correctif — Migration syntaxe templates Edge**

Les directives `@layout`, `@section` et `@end` de Edge v5 n'existent plus en Edge.js v6 et s'affichaient en texte brut dans les emails reçus. Migration des 13 templates email (`resources/views/emails/*.edge`) vers la syntaxe composants Edge v6 : `@component('emails/_layout')` + `@slot('content')` + `@end`. Mise à jour du layout `_layout.edge` : `@!section('content')` → `{{{ await $slots.content() }}}`.

## 2026-06-14 — Benchmark anonymisé avec comparaison en pourcentage dans les résultats du simulateur (#13)

**Amélioration — Social proof dans SimulatorResultCard**

Affichage d'un encart comparatif sous le total estimé dans les résultats du simulateur. Le delta entre le coût de l'utilisateur et la moyenne anonymisée des bateaux similaires est calculé et présenté sous forme de message contextuel.

**Frontend (`inertia/components/marketing/simulator/SimulatorResultCard.vue`) :**

- Computed `benchmarkComparison` : calcule le pourcentage de différence entre `(totalMin+totalMax)/2` et `(benchmark.avgMin+benchmark.avgMax)/2`
- Trois clés utilisées selon le delta : `benchmark_above` (> +5%), `benchmark_below` (< −5%), `benchmark_similar` (±5%)
- La fourchette moyenne (avgMin – avgMax) reste affichée en secondaire

**i18n (FR + EN) :**

- Ajout des clés `benchmark_above`, `benchmark_below`, `benchmark_similar` avec params `{percent}` et `{count}`

**Tests (`tests/inertia/simulator_step_costs.spec.ts`) :** 4 nouveaux cas couvrant les trois branches de comparaison et l'absence du bloc quand aucun benchmark n'est fourni.

## 2026-06-12 — Séquence email J+0/J+3/J+7 après capture lead simulateur (#12)

**Nouvelle fonctionnalité — Nurturing leads simulateur**

Mise en place de l'architecture Event/Listener/Jobs pour l'envoi automatique de 3 emails après création d'un `SimulatorLead`.

**Backend :**

- `app/events/simulator_lead_created.ts` : event `SimulatorLeadCreated extends BaseEvent`, émis dans `SimulatorLeadService.create` via `SimulatorLeadCreated.dispatch(lead)`
- `app/listeners/on_simulator_lead_created.ts` : dispatche `SendSimulatorReportJob` et `SendSimulatorNurturingJob` à la réception de l'event
- `app/jobs/send_simulator_report_job.ts` : email J+0 — rapport de coûts complet par catégorie (coque, moteur, sécurité, électrique, mouillage, gréement), bilingue FR/EN selon `lead.locale`, template `emails/simulator_report.edge`
- `app/jobs/send_simulator_nurturing_job.ts` : email J+3 (3 conseils pour réduire les coûts, `.in('3d')`) + email J+7 (rappel estimation avec CTA inscription, `.in('7d')`), bilingue FR/EN, templates `emails/nurturing_d3.edge` et `emails/nurturing_d7.edge`
- `start/events.ts` : enregistrement du binding `emitter.listen(SimulatorLeadCreated, [lazy import listener])`, préchargé via `adonisrc.ts`
- Dedup par `correlationId` sur chaque email — évite les doublons en cas de re-soumission du formulaire

**Refactor :**

- `EmailQueueService` : suppression des méthodes `sendSimulatorReport` et `sendSimulatorNurturing` (logique déplacée dans les Jobs dédiés)
- `SimulatorLeadService` : ne dépend plus d'`EmailQueueService` ; délègue via l'event

---

## 2026-06-11 — Relances maintenance — tâches en retard, moteur, inspection bateau (PR 3/3)

**Nouvelle fonctionnalité — Alertes maintenance**

Implémentation des 3 relances maintenance dans `ReminderEmailService`.

**Backend :**

- `sendOverdueTaskReminders()` : tâches ouvertes avec `dueAt < aujourd'hui` → email aux admins de chaque organisation avec la liste des tâches en retard (toutes catégories)
- `sendEngineTaskReminders()` : tâches ouvertes avec `subject = 'engine'` et `dueAt` dans les 30 prochains jours → email de rappel moteur par admin
- `sendBoatCheckReminders()` : tâches ouvertes avec `subject = 'boat'` et `dueAt` dans les 30 prochains jours → email d'inspection bateau par admin
- `EmailQueueService` : 3 nouvelles méthodes (`sendReminderOverdueTasks`, `sendReminderEngineTasks`, `sendReminderBoatCheckTasks`) avec templates HTML bilingues (FR/EN), tableau tâche/bateau/échéance, CTA vers `/maintenance`
- Jointure via `preload('boat')` pour récupérer `organizationId` et grouper les tâches par organisation
- Dedup par `correlationId` incluant les IDs des tâches — évite les doublons quotidiens

---

## 2026-06-11 — Relances utilisateur — compte inactif, bateaux/ports incomplets, inactivité (PR 2/3)

**Nouvelle fonctionnalité — Rétention utilisateur**

Implémentation des 4 relances liées au cycle de vie utilisateur dans `ReminderEmailService`.

**Backend :**

- `sendInactiveAccountReminders()` : organisations sans bateau créées il y a > 7 jours → email aux admins pour ajouter leur flotte
- `sendIncompleteBoatReminders()` : bateaux avec ≥ 3 champs clés null (type, immatriculation, longueur, année, fabricant, modèle) → email groupé par admin avec liste des bateaux à compléter
- `sendIncompletePortReminders()` : ports sans ville ou sans pays → email groupé par admin avec liste des ports à compléter
- `sendInactiveLoginReminders()` : utilisateurs sans connexion depuis > 30 jours → email de réengagement individuel
- `EmailQueueService` : 4 nouvelles méthodes d'envoi (`sendReminderInactiveAccount`, `sendReminderIncompleteBoats`, `sendReminderIncompletePorts`, `sendReminderInactiveLogin`) avec templates HTML bilingues (FR/EN) et dedup
- Ciblage admin via `OrganizationMembership` (role `admin`) — 1 email par admin avec liste groupée
- Dédup par `correlationId` incluant les IDs des éléments concernés — évite les doublons quotidiens

---

## 2026-06-11 — Infrastructure emails de relance (PR 1/3)

**Nouvelle fonctionnalité — Rétention utilisateur**

Pose les fondations pour les emails de relance automatiques envoyés quotidiennement.

**Backend :**

- Migration : `last_login_at` ajouté sur la table `users` (nullable)
- Tracking : `lastLoginAt` mis à jour à chaque connexion (`SessionController.store`) et création de compte (`NewAccountController.store`)
- `app/services/reminder_email_service.ts` : service orchestrateur avec 7 méthodes (squelettes) — `sendInactiveAccountReminders`, `sendIncompleteBoatReminders`, `sendIncompletePortReminders`, `sendInactiveLoginReminders`, `sendOverdueTaskReminders`, `sendEngineTaskReminders`, `sendBoatCheckReminders`
- `app/jobs/send_reminder_emails.ts` : job queue `emails` qui exécute toutes les relances en séquence
- `start/scheduler.ts` : planification cron quotidienne à 08h00 (Europe/Paris), id `daily-reminder-emails`
- `shared/types/reminder.ts` : types partagés (`ReminderKind`, `ReminderTaskItem`, `ReminderBoatItem`, `ReminderPortItem`)
  Implémentation des 4 relances liées au cycle de vie utilisateur dans `ReminderEmailService`.

**Backend :**

- `sendInactiveAccountReminders()` : organisations sans bateau créées il y a > 7 jours → email aux admins pour ajouter leur flotte
- `sendIncompleteBoatReminders()` : bateaux avec ≥ 3 champs clés null (type, immatriculation, longueur, année, fabricant, modèle) → email groupé par admin avec liste des bateaux à compléter
- `sendIncompletePortReminders()` : ports sans ville ou sans pays → email groupé par admin avec liste des ports à compléter
- `sendInactiveLoginReminders()` : utilisateurs sans connexion depuis > 30 jours → email de réengagement individuel
- `EmailQueueService` : 4 nouvelles méthodes d'envoi (`sendReminderInactiveAccount`, `sendReminderIncompleteBoats`, `sendReminderIncompletePorts`, `sendReminderInactiveLogin`) avec templates HTML bilingues (FR/EN) et dedup
- Ciblage admin via `OrganizationMembership` (role `admin`) — 1 email par admin avec liste groupée
- Dédup par `correlationId` incluant les IDs des éléments concernés — évite les doublons quotidiens

---

---

## 2026-06-09 — Email capture simulateur (lead magnet)

**Nouvelle fonctionnalité — Acquisition**

Capture l'email des visiteurs qui ont vu leurs résultats de simulation mais ne sont pas prêts à créer un compte.

**Backend :**

- Table `simulator_leads` (UUID, email unique, données du simulateur, fourchette de coût, locale)
- Model `SimulatorLead`, service `SimulatorLeadService` (upsert sur email), controller `SimulatorLeadController`
- Validator VineJS `simulatorLeadValidator`
- Route : `POST /simulator/lead` → `simulator.lead` (publique, sans auth)

**Frontend :**

- `SimulatorCtaCard.vue` : second CTA "Recevoir ce rapport par email" affiché sous le bouton principal (visiteurs non authentifiés uniquement), séparé par un divider "ou", avec message de confirmation inline après soumission
- Prop `breakdown` ajoutée à `SimulatorCtaCard` pour passer `totalMin`/`totalMax`

**i18n :** clés `cta_or_divider`, `cta_email_title`, `cta_email_placeholder`, `cta_email_button`, `cta_email_success`, `cta_email_rgpd` dans `simulator.json` (FR + EN)

---

## 2026-06-06 — Page guide SEO coût d'entretien + simulateur flotte

**Nouvelle fonctionnalité — SEO organique + simulateur authentifié**

### Page guide "Coût d'entretien d'un bateau"

Page de contenu SEO riche ciblant les requêtes organiques sur le coût d'entretien annuel d'un bateau. Alimente un tunnel vers le simulateur public.

**Routes :**

- `GET /fr/cout-entretien-bateau` → `marketing.fr.guide`
- `GET /en/boat-maintenance-cost` → `marketing.en.guide`

**Sections :** Hero + stats clés + catégories de coûts + tableau comparatif par type/longueur + FAQ accordion + CTA simulateur + contexte réglementaire Division 240.

**SEO :** FAQPage JSON-LD (schema.org) embarqué dans `<Head>` pour rich results Google. Balises canonical + hreflang.

**Navigation :** Lien "Guide entretien" / "Maintenance guide" ajouté dans le header public et le footer.

**Fichiers créés :**

- `inertia/pages/marketing/guide.vue` — page guide (174 lignes)
- `inertia/components/marketing/guide/GuideCostTable.vue` — tableau coûts responsive
- `inertia/components/marketing/guide/GuideFaqSection.vue` — accordion FAQ
- `resources/lang/fr/marketing.json` — section `guide` (73 clés)
- `resources/lang/en/marketing.json` — section `guide` (73 clés)

**Simulateur enrichi :** Section "Comment ça marche" (3 étapes) ajoutée avant le formulaire sur la page simulateur public.

### Simulateur de coût sur bateau existant (flotte authentifiée)

Permet à un utilisateur connecté de relancer le simulateur de coût d'entretien sur un bateau déjà dans sa flotte, avec les données de base pré-remplies.

**Routes :**

- `GET /boats/:id/simulator` → `boats.simulator` (auth requis)

**Comportement :** Type, longueur, année, catégorie CE pré-remplis depuis la fiche bateau. Seules les étapes d'usure (coque, moteur, sécurité, gréement) sont présentées. Calcul client-side sans persistance. Résultat avec bouton retour fiche bateau.

**Accès :** Bouton "Estimer les coûts d'entretien" dans l'onglet Aperçu de la fiche bateau.

**Fichiers créés :**

- `app/controllers/boat_simulator_controller.ts` — contrôleur avec bouncer `BoatPolicy.view`
- `inertia/pages/boats/simulator.vue` — page simulateur flotte (layout app)

---

## 2026-06-06 — Simulateur de coût d'entretien (acquisition publique)

**Nouvelle fonctionnalité — outil public / stratégie d'acquisition**

### Simulateur de coût annuel d'entretien

Page publique (sans authentification) permettant à tout propriétaire de bateau d'estimer son budget annuel d'entretien en 2 minutes. Basé sur la réglementation Division 240 – Annexe 240-A.2.

**Tunnel de conversion :**

1. L'utilisateur remplit les données de son bateau (type, longueur, âge, catégorie CE) et l'état de ses équipements (coque, moteur, sécurité, gréement)
2. Un coût estimé par catégorie (fourchette min/max) est calculé côté frontend sans appel serveur
3. Un CTA incite l'utilisateur à créer un compte — les données du bateau sont stockées en session
4. Après inscription, le bateau est automatiquement créé et l'utilisateur est redirigé vers la fiche de son bateau

**Routes :**

- `GET /fr/simulateur-cout-entretien` → `marketing.fr.simulator`
- `GET /en/maintenance-cost-simulator` → `marketing.en.simulator`
- `POST /simulator/session` → stockage en session + redirect signup

**Fichiers créés :**

- `shared/types/simulator.ts` — types `SimulatorBoatInput`, `SimulatorCostBreakdown`
- `app/validators/simulator.ts` — validation VineJS des données du simulateur
- `app/controllers/simulator_controller.ts` — `saveSession()`
- `inertia/composables/use_simulator_costs.ts` — calcul des coûts par catégorie
- `inertia/components/marketing/simulator/` — 7 composants (étapes + résultat + CTA)
- `inertia/pages/marketing/simulator.vue` — page multi-étapes

**Fichiers modifiés :**

- `app/controllers/marketing_controller.ts` — méthode `simulator()`
- `app/services/boat_hull_service.ts` — méthode `createFromSimulator(orgId, data)`
- `app/controllers/new_account_controller.ts` — auto-création du bateau depuis la session post-inscription
- `start/routes/marketing.ts` — routes simulateur
- `resources/lang/{fr,en}/marketing.json` — clés `marketing.simulator.*`
- `resources/lang/{fr,en}/public.json` — lien footer "Simulateur de coût"
- `inertia/layouts/public.vue` — lien footer ajouté

---

## 2026-06-01 — Gestion avancée des pièces et suivi des coûts de maintenance

**Nouvelles fonctionnalités**

### Liaison pièces de maintenance → catalogue moteur

- Champ `engine_part_id` (FK nullable) ajouté sur `boat_maintenance_parts` → lien vers `boat_engine_parts`
- Relation `belongsTo` ajoutée dans `BoatMaintenancePart` → `BoatEnginePart`
- Champ `enginePartId` accepté dans le payload `parts[]` du formulaire de création d'événement de maintenance
- Lors de la création d'un événement, si une pièce référence une pièce du catalogue :
  - Le stock est décrémenté automatiquement (en transaction)
  - Si le stock atteint 0, le `wearState` passe à `to_replace` (sauf si `damaged`)

### Suivi des coûts de maintenance

- Champ `unit_price` (decimal 10,2) ajouté sur `boat_maintenance_parts`
- Champ `unitPrice` accepté dans le payload `parts[]`
- `getHistoryForOrg` retourne `totalCost` par événement et dans les statistiques globales
- Type `MaintenanceEventPartRow` et `MaintenanceEventRow` ajoutés dans `shared/types/maintenance.ts`
- Clés i18n ajoutées : `maintenance.history.stats.totalCost`, `maintenance.history.timeline.totalCost/unitPrice/fromCatalog` (EN + FR)

### Seuil d'alerte de stock minimum sur les pièces moteur

- Champ `min_stock_alert` (int nullable) ajouté sur `boat_engine_parts`
- Champ `minStockAlert` accepté dans les payloads create/update de pièce moteur
- Méthode `BoatEnginePartService.listLowStock(engineId)` : retourne les pièces dont `stock ≤ min_stock_alert`
- Clés i18n ajoutées : `equipment.stock.minStockAlert/minStockAlertPlaceholder/lowStockWarning` (EN + FR)
- Type `LowStockPartRow` ajouté dans `shared/types/boat.ts`

**Migrations ajoutées**

- `1779200000000_link_maintenance_parts_to_engine_parts.ts` — FK `engine_part_id` sur `boat_maintenance_parts`
- `1779300000000_add_cost_to_maintenance_parts.ts` — colonne `unit_price` sur `boat_maintenance_parts`
- `1779400000000_add_min_stock_alert_to_engine_parts.ts` — colonne `min_stock_alert` sur `boat_engine_parts`

**Tests ajoutés**

- `tests/unit/boat_maintenance_service.spec.ts` : 3 nouveaux cas (décrément stock, wearState auto, totalCost)
- `tests/unit/boat_engine_part_service.spec.ts` : 4 cas (create avec minStockAlert, listLowStock, update)

## 2026-06-01 — États d'usure et documents sur les pièces moteur

**Nouvelles fonctionnalités**

- Champ `wear_state` ajouté sur `boat_engine_parts` : valeurs `new | good | worn | to_replace | damaged`, optionnel (défaut `good`)
- Les pièces moteur peuvent désormais avoir des documents attachés (PDF, CSV, XLSX, DOCX) via le système Media polymorphique (`entityType: 'boat_engine_part'`)
- Nouvelle page dédiée `/boats/:boatId/engines/:engineId/parts/:partId` avec deux onglets : **Informations** et **Documents**
- Bouton « Voir » dans le tableau des pièces de la page moteur → redirige vers la page pièce
- Colonne « État d'usure » (badge coloré) dans le tableau des pièces
- Sélecteur d'état d'usure dans le modal d'ajout/modification de pièce
- Clés i18n ajoutées dans `equipment.wearState` (EN + FR) et `boats.engineShow.parts.wearState/view` + `boats.engineShow.partShow` (EN + FR)

**Routes ajoutées**

- `GET  /boats/:boatId/engines/:engineId/parts/:partId` → `BoatEnginePartsController.show`
- `POST /boats/:boatId/engines/:engineId/parts/:partId/documents` → `storeDocument`
- `DELETE /boats/:boatId/engines/:engineId/parts/:partId/media/:mediaId` → `destroyMedia`
- `GET  /boats/:boatId/engines/:engineId/parts/:partId/media/:mediaId/download` → `downloadMedia`

**Dossier Cloudinary** : `organizations/{slug}/boats/{id}/engines/{id}/parts/{id}/documents`

## 2026-05-25 — Correctifs et config Stripe

**Correctifs backend**

- `SubscriptionService.syncFromCheckoutSession` : `session.subscription` était casté en `Stripe.Subscription` alors que c'est un simple ID string → corrigé par un appel `stripeService.retrieveSubscription()` pour récupérer l'objet complet avec `expand: ['items.data.price']`
- Route `/webhooks/stripe` exclue de la protection CSRF Shield (`config/shield.ts → exceptRoutes`)

**Variables d'environnement requises**

| Variable                             | Description                                                      |
| ------------------------------------ | ---------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`                  | Clé secrète Stripe (`sk_live_...` en prod, `sk_test_...` en dev) |
| `STRIPE_WEBHOOK_SECRET`              | Secret de signature webhook (`whsec_...`)                        |
| `STRIPE_PUBLIC_KEY`                  | Clé publique (`pk_live_...` / `pk_test_...`)                     |
| `STRIPE_PRO_MONTHLY_PRICE_ID`        | Price ID Stripe mensuel Pro (`price_...`)                        |
| `STRIPE_PRO_ANNUAL_PRICE_ID`         | Price ID Stripe annuel Pro (`price_...`)                         |
| `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID` | Price ID Stripe mensuel Enterprise (`price_...`)                 |
| `STRIPE_ENTERPRISE_ANNUAL_PRICE_ID`  | Price ID Stripe annuel Enterprise (`price_...`)                  |
| `STRIPE_CUSTOMER_PORTAL_ID`          | ID de configuration du Customer Portal (`bpc_...`, optionnel)    |

⚠️ Les Price IDs commencent par `price_` (pas `prod_` qui sont des Product IDs).

**Config webhook en production**

1. Dashboard Stripe → **Webhooks** → **Add endpoint** : `https://ton-domaine.com/webhooks/stripe`
2. Events à écouter : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Copier le `whsec_...` affiché → `STRIPE_WEBHOOK_SECRET` dans les env de prod
4. Le `whsec_` du CLI (`stripe listen`) est différent de celui du dashboard — ne pas les mélanger

**Dev local**

```bash
stripe login                  # si clé CLI expirée
stripe listen --forward-to localhost:5555/webhooks/stripe
# copier le whsec_ affiché → STRIPE_WEBHOOK_SECRET dans .env
```

Cartes de test : `4242 4242 4242 4242` (succès), `4000 0000 0000 0002` (refusée), `4000 0025 0000 3155` (3DS)

---

## 2026-05-23 — Intégration Stripe — paiement par abonnement

Mise en place du flux de paiement complet via Stripe Billing.

**Backend**

- Nouvelles tables : `subscriptions` (état de l'abonnement Stripe), colonne `stripe_customer_id` sur `organizations`
- `StripeService` : création/récupération du customer Stripe, Checkout Session, Customer Portal Session, vérification de signature webhook
- `SubscriptionService` : synchronisation de l'abonnement depuis les événements Stripe (`checkout.session.completed`, `customer.subscription.updated/deleted`), mise à jour automatique de `organizations.plan`
- `BillingController` : routes POST `/settings/billing/checkout` (→ Stripe Checkout), POST `/settings/billing/portal` (→ Customer Portal), POST `/webhooks/stripe` (webhook public)
- Le plan `organizations.plan` est mis à jour automatiquement par les webhooks Stripe

**Frontend**

- Page `/settings/billing` : prop `subscription` (statut, date de renouvellement, intervalle)
- Sélecteur mensuel/annuel avant le checkout
- Badge de statut abonnement (actif, en retard…) + date de renouvellement
- Bouton "Gérer mon abonnement" → Customer Portal Stripe

**Routes**

- `POST /settings/billing/checkout` — `settings.billing.checkout`
- `POST /settings/billing/portal` — `settings.billing.portal`
- `POST /webhooks/stripe` — `webhooks.stripe` (public, hors auth)

## 2026-05-23 — Mise à jour tarifaire : plan Pro à 20 €/mois

Révision des tarifs du plan Pro. Le modèle reste par organisation (pas par bateau ni par utilisateur).

| Plan       | Mensuel     | Annuel (−20 %)         |
| ---------- | ----------- | ---------------------- |
| Starter    | Gratuit     | Gratuit                |
| Pro        | 20 € / mois | 16 € / mois (192 €/an) |
| Enterprise | Sur devis   | Sur devis              |

**Fichiers mis à jour :**

- `resources/lang/fr/marketing.json` — prix carte Pro, tableau comparatif, meta description, FAQ (×2)
- `resources/lang/en/marketing.json` — idem en anglais
- `docs/quotas.md` — section Tarifs ajoutée

---

## 2026-05-23 — Enforcement quotas : retour utilisateur anticipé (bateaux)

Amélioration UX : le blocage quota sur l'ajout de bateau remonte désormais au plus tôt, avant toute navigation.

**4 niveaux de guards pour l'ajout de bateau (defense in depth) :**

1. **Icône cadenas dans le bouton** (`inertia/pages/boats/index.vue`) — signal visuel avant tout clic ; `canAddBoat: false` → `LockClosedIcon` affiché dans le bouton "Nouveau bateau"
2. **Toast au clic** — `handleNewBoat()` intercepte le clic et affiche `toast.error(t('boats.index.quotaReached'))` au lieu de naviguer
3. **Redirect dans `GET /boats/new`** (`BoatsController.create`) — si accès direct par URL, redirige vers `/boats` + flash error
4. **Assert dans `POST /boats`** (`BoatsController.store`) — `quotaService.assertCanAddBoat()` avant toute création en base

**Changements :**

- `BoatsController.index` : charge l'org et passe `canAddBoat` (boolean) en prop Inertia via `quotaService.canAddBoat()`
- `BoatsController.create` : vérifie `canAddBoat` avant de rendre le formulaire
- `inertia/pages/boats/index.vue` : `handleNewBoat()` remplace le lien direct ; bouton avec `LockClosedIcon` conditionnel
- i18n : `boats.index.quotaReached` ajouté en EN et FR

**Correctif** : import ESM dans `app/services/boat_hull_service.ts` — import relatif `../utils/boat_utils` (sans `.js`) remplacé par l'alias `#utils/boat_utils` (résolution correcte en ESM Node 20)

---

## 2026-05-22 — Système de quotas par plan (Starter / Pro / Enterprise)

Mise en place de l'enforcement des limites par plan organisationnel. Le plan est assigné manuellement en BDD (pas de Stripe).

**Architecture :**

- **`shared/types/plan.ts`** — source de vérité unique partagée backend/frontend :
  - `PlanTier` : `'starter' | 'pro' | 'enterprise'`
  - `PLAN_LIMITS: Record<PlanTier, PlanQuotas>` — limites par plan
  - `getUpgradeTier(current)` — retourne le tier suivant ou `null`
  - `QuotaUsage` — interface pour la page billing
- **`app/exceptions/quota_errors.ts`** : `QuotaExceededError(feature, limit, current, upgradeTo)`
- **`app/services/quota_service.ts`** :
  - `canAddBoat(org)` → `Promise<boolean>` — pour l'UI (pas de throw)
  - `assertCanAddBoat(org)` → throw si dépassé
  - `assertCanAddMember(org)` → throw si dépassé
  - `assertCanUseAI(org)` → synchrone, throw si non autorisé
  - `assertCanExport(org)` → synchrone, throw si non autorisé

**Guards backend (controllers) :**

- `BoatsController.store` : `assertCanAddBoat` avant `request.validateUsing`
- `BoatsController.create` : `canAddBoat` pour bloquer l'accès au formulaire
- `OrganizationInvitationsController.store` : `assertCanAddMember` avant création
- `AiController.chat`, `fleetAnalysis`, `boatSuggestions` : `assertCanUseAI` en entrée de chaque méthode

**Autres :**

- **Migration** : colonne `plan` (enum `starter|pro|enterprise`, défaut `starter`) sur `organizations`
- **Inertia shared props** : `currentPlan` exposé à toutes les pages via `InertiaMiddleware`
- **Page billing** (`settings/billing`) : plan réel, jauges usage (bateaux/membres), disponibilité IA/export, CTA mise à niveau
- **i18n** : `flash.quota.{boatsExceeded,membersExceeded,aiExceeded,exportExceeded}` en EN et FR ; refonte `settings.billing.*`

**Limites par plan :**

| Feature       | Starter | Pro | Enterprise |
| ------------- | ------- | --- | ---------- |
| Bateaux max   | 2       | 25  | ∞          |
| Membres max   | 1       | 5   | ∞          |
| IA / Copilote | ✗       | ✓   | ✓          |
| Export        | ✗       | ✓   | ✓          |

> Pour tout futur controller d'export : appeler `quotaService.assertCanExport(org)` en entrée.

---

## 2026-05-22 — Invitations de membres

Feature d'invitation de membres par email :

- Envoi d'une invitation par email avec token signe (expiry 7 jours)
- Page d'acceptation `/invitations/accept?token=xxx` (publique, auth requise pour accepter)
- Annulation d'invitation depuis les settings
- Routes : POST/DELETE /organization/invitations, GET/POST /invitations/accept
- Liste des invitations pending dans settings/members
- Table `organization_invitations` avec statuts pending/accepted/cancelled

---

## 2026-05-22 — Système de permissions Bouncer (rôles admin / member, scoped organisation)

- Nouvelle table `organization_memberships` (`user_id`, `organization_id`, `role` enum admin|member) avec contrainte d'unicité par paire user-org
- Migration de backfill : tous les utilisateurs existants liés à une org deviennent `admin`
- Modèle `OrganizationMembership` + helpers `User.getRoleInOrg(orgId)` / `User.isAdminOf(orgId)`
- 4 policies Bouncer dans `app/policies/` : `BoatPolicy`, `PortPolicy`, `MaintenancePolicy`, `OrganizationPolicy`
  - Matrice : admin → tout autoriser via hook `before` ; member → view/create/edit bateaux et maintenance, lecture seule infrastructure
  - Suppression de bateaux, ports/pontoons/mouillages/spots, maintenance : admin uniquement
- Remplacement de toutes les anciennes abilities `boatView/boatCreate/boatUpdate/boatDelete` par les nouvelles policies dans tous les controllers
- Service `OrganizationMemberService` : listMembers, addMember, updateRole, removeMember (avec protection dernier admin)
- Nouveau controller `OrganizationMembersController` + routes `GET/POST/PUT/DELETE /organization/members`
- Validator `inviteMemberValidator` / `updateMemberRoleValidator`
- Page frontend `inertia/pages/organization/members.vue` : table des membres, changement de rôle inline, formulaire d'invitation (visible admin seulement)
- Clés i18n `resources/lang/{en,fr}/organization.json`
- Types partagés dans `shared/types/organization.ts` : `OrgRole`, `OrganizationMemberData`

---

## 2026-05-21 — Refactorisation i18n : découpage de `app.json` en fichiers de domaine

- Suppression de `resources/lang/{en,fr}/app.json` (1 080+ lignes)
- Création de 13 fichiers de domaine par locale : `common.json`, `nav.json`, `auth.json`, `dashboard.json`, `planning.json`, `maintenance.json`, `settings.json`, `errors.json`, `equipment.json`, `boats.json`, `homePreview.json`, `public.json`, `ports.json`
- `app/middleware/inertia_middleware.ts` : filtre désormais par exclusion des namespaces backend-only (`flash`, `marketing`, `validator`) au lieu d'un filtre `app.*`
- API frontend `useT().t('clé')` inchangée — toutes les clés existantes fonctionnent sans modification

---

## 2026-05-21 — Sécurité : corrections SEC-M1 à SEC-M5

**SEC-M1 — Rate limiting** (`@adonisjs/limiter` v3, store database) :

- `POST /login`, `POST /forgot-password`, `POST /reset-password` → 10 req/min par IP (`authThrottle`)
- `POST /ai/chat`, `POST /ai/fleet-analysis`, `POST /ai/boats/:id/suggestions` → 20 req/min par userId/IP (`aiThrottle`)
- Migration : `1779300016000_create_rate_limits_table.ts`

**SEC-M2 — AI Chat** (`app/controllers/ai_controller.ts`, `app/validators/ai.ts`) :

- Validation VineJS : tableau `messages` avec `role: enum(['user','assistant'])` et `content: string.maxLength(4000)`, 1–50 éléments
- Réponse convertie en `session.flash('info')` + `response.redirect().back()` (suppression des `response.badRequest` / `response.accepted` JSON)

**SEC-M3 — cloudinaryPublicId** :

- Supprimé des props Inertia : `app/transformers/boat_transformer.ts`, `app/transformers/media_transformer.ts`, `app/controllers/boat_equipment_controller.ts`, `inertia/types/boat_show.ts`
- Le champ reste accessible côté serveur (Cloudinary download) mais n'est plus sérialisé vers le client

**SEC-M5 — Token de reset** (`app/services/password_reset_service.ts`) :

- Stockage en SHA-256 hex (plus de plain text en base)
- Comparaison avec `crypto.timingSafeEqual` pour éliminer les timing attacks
- Migration : `1779300015000_truncate_password_reset_tokens.ts` (purge des tokens plain-text existants)

---

## 2026-05-21 — Sécurité : activation CSP (Content-Security-Policy)

`config/shield.ts` : CSP activée en mode `reportOnly: true`.  
Directives : `default-src 'self'`, `img-src` autorise `res.cloudinary.com`, nonce Shield pour scripts et styles Vite/Inertia.  
Template `inertia_layout.edge` : nonce ajouté sur le `<script type="application/ld+json">` inline.  
**Prochaine étape** : surveiller les violations en prod, puis passer `reportOnly: false`.

## 2026-05-20 — Plan marina : requêtes Inertia

Le plan marina (`MarinaMapTab`) utilise désormais `router.patch` (cycle Inertia) au lieu de `fetch` JSON manuel.

- **Frontend** : drag des pontons/mouillages et assignation bateau → place via `router.patch` avec `preserveScroll` ; assignation avec partial reload `only: ['port']`
- **Backend** : `PontoonsController.updatePosition`, `MouillagesController.updatePosition`, `BoatsController.assign` renvoient `response.redirect().back()` (CSRF et validation VineJS inchangés)

## 2026-05-20 — Widget Marina sur le Dashboard

Ajout d'un widget "Marinas" sur la page d'accueil du tableau de bord.

- **`DashboardService`** : fetch des ports via `PortService.listForUser()`, nouveau type `DashboardPortItem` et `DashboardPortStats`
- **`PortService.listForUser()`** : ajout du comptage des spots totaux (via pontoons et mouillages) — calcul de `totalSpots` et `freeSpots`
- **`PortListItem`** (type frontend) : nouveaux champs `totalSpots` et `freeSpots`
- **`MarinaDashboardCard.vue`** : composant affichant la liste des ports avec taux de remplissage (barre de progression), nombre de places libres/total, et stats globales
- **i18n** : clés `dashboard.marina.*` ajoutées en FR et EN

## 2026-05-20 — Modele Spot (places de marina)

Introduction du modele `Spot` qui represente une place individuelle au sein d'un ponton ou mouillage. Un bateau est maintenant assigne a un spot (et non plus directement a un ponton/mouillage).

**Migrations** :

- `1779300011000_create_spots_table` : table `spots` (id, name, description, pontoon_id, mouillage_id, organization_id, timestamps)
- `1779300012000_alter_boats_for_spots` : ajout `spot_id`, suppression `pontoon_id`, `mouillage_id`, `spot_identifier`
- `1779300013000_alter_boat_position_history_for_spots` : ajout `spot_id`, suppression `pontoon_id`, `mouillage_id`, `spot_identifier`

**Modele** : `app/models/spot.ts` — relations `belongsTo(Pontoon)`, `belongsTo(Mouillage)`, `belongsTo(Organization)`, `hasMany(Boat)`

**Validator** : `app/validators/spot.ts` — `createSpotValidator`, `updateSpotValidator`

**Service** : `app/services/spot_service.ts` — `createForPontoon`, `createForMouillage`, `update`, `delete`

**Controller** : `app/controllers/spots_controller.ts` — actions `storeForPontoon`, `storeForMouillage`, `update`, `destroy`

**Routes** (dans `start/routes/ports.ts`) :

- `POST /ports/:portId/pontoons/:pontoonId/spots` — creer un spot sur un ponton
- `POST /ports/:portId/mouillages/:mouillageId/spots` — creer un spot sur un mouillage
- `PUT /spots/:id` — modifier un spot
- `DELETE /spots/:id` — supprimer un spot

**Modeles modifies** :

- `Pontoon`, `Mouillage` : ajout relation `hasMany(Spot)`
- `Boat` : remplace `pontoonId`, `mouillageId`, `spotIdentifier` par `spotId` + `belongsTo(Spot)`
- `BoatPositionHistory` : remplace `pontoonId`, `mouillageId`, `spotIdentifier` par `spotId` + `belongsTo(Spot)`

**Services modifies** :

- `BoatService` : `updateAssignment` prend maintenant `{ spotId }` au lieu de `{ pontoonId, mouillageId, spotIdentifier }`
- `PortService` : `getWithPontoonsAndMouillagesOrFail` retourne les spots par ponton/mouillage avec le bateau assigne
- `PontoonService`, `MouillageService` : verification des bateaux via spots avant suppression

---

## 2026-05-20 — Plan interactif 2D de la marina

Ajout d'un onglet "Plan marina" sur la page de detail d'un port. Canvas SVG interactif avec positionnement libre des pontons et mouillages (coordonnees x/y persistees en base), mode edition pour repositionner les elements par drag, et reaffectation des bateaux par clic.

**Composants Vue crees** :

- `inertia/components/ports/show/tabs/PortListTab.vue` — onglet liste (extrait de show.vue)
- `inertia/components/ports/show/tabs/MarinaMapTab.vue` — orchestrateur du plan marina
- `inertia/components/ports/show/MarinaCanvas.vue` — canvas SVG 1400x900 avec drag
- `inertia/components/ports/show/MarinaPontoon.vue` — composant SVG ponton avec slots bateaux
- `inertia/components/ports/show/MarinaMouillage.vue` — composant SVG zone mouillage
- `inertia/components/ports/modals/BoatAssignModal.vue` — modale affectation bateau

**Page modifiee** : `inertia/pages/ports/show.vue` — ajout BaseTabs (list/plan)

**Routes backend utilisees** :

- `PATCH /ports/:portId/pontoons/:pontoonId/position` — met a jour la position x/y d'un ponton
- `PATCH /ports/:portId/mouillages/:mouillageId/position` — met a jour la position x/y d'un mouillage
- `PATCH /boats/:id/assignment` — reaffecte un bateau a un ponton/mouillage

**i18n** : cles `ports.tabs.*` et `ports.plan.*` ajoutees en FR et EN

---

## 2026-05-19

### Plan interactif 2D de marina — Backend

Couche backend pour la feature de plan interactif de marina permettant le positionnement drag-and-drop des pontons/mouillages et l'affectation rapide des bateaux.

**Migrations** :

- `1779300009000_alter_pontoons_add_position` : ajout `position_x`, `position_y` (double, nullable) sur `pontoons`
- `1779300010000_alter_mouillages_add_position` : idem sur `mouillages`

**Modèles** : `Pontoon` et `Mouillage` — colonnes `positionX`, `positionY` ajoutées

**Validator** : `app/validators/marina_layout.ts`

- `updatePositionValidator` : `{ x: number, y: number }`
- `assignBoatValidator` : `{ pontoonId?, mouillageId?, spotIdentifier? }`

**Services** :

- `PontoonService.updatePosition(pontoon, { x, y })` — sauvegarde position
- `MouillageService.updatePosition(mouillage, { x, y })` — idem
- `BoatService.updateAssignment(boat, { pontoonId, mouillageId, spotIdentifier })` — réaffecte un bateau et enregistre l'historique

**Routes** :

- `PATCH /ports/:portId/pontoons/:pontoonId/position` → `ports.pontoons.updatePosition`
- `PATCH /ports/:portId/mouillages/:mouillageId/position` → `ports.mouillages.updatePosition`
- `PATCH /boats/:id/assignment` → `boats.assign`

**PortService** : `getWithPontoonsAndMouillagesOrFail` expose maintenant `positionX`, `positionY` pour pontons et mouillages

---

### Ajout des mouillages aux ports

- Nouvelle entité `Mouillage` (table `mouillages`) : nom, description, appartient à un port (CASCADE on delete)
- CRUD complet sur la page détail d'un port : section "Mouillages" avec formulaire inline et cartes (`MouillageCard`, `MouillageFormModal`)
- Affectation d'un bateau à un mouillage (exclusif avec le ponton) : champ `mouillage_id` sur `boats`, formulaire bateau mis à jour avec deux selects mutuellement exclusifs (Ponton | Mouillage)
- Historique de position étendu : `mouillage_id` sur `boat_position_history`, `portName` résolu depuis le mouillage si pas de ponton
- Protection suppression : impossible de supprimer un mouillage ou un port si des bateaux y sont affectés
- Routes : `POST/PUT/DELETE /ports/:portId/mouillages[/:mouillageId]`
- i18n EN + FR complets (`ports.mouillages.*`, `boats.hullFields.mouillage`)

---

### Refonte pages Pricing, About, Contact — Frontend

Implémentation complète des trois pages marketing depuis un design prototype (Claude Design). Chaque page est décomposée en composants Vue 3 autonomes (`<script setup>`), avec props typées et i18n EN+FR.

**Pages et composants créés :**

- **`marketing/pricing.vue`** + 7 sections : `PricingHeroSection` (toggle billing mensuel/annuel), `PricingTiersSection` (3 plans avec prices billing-aware), `PricingROISection` (calculateur interactif), `PricingTestimonialsSection`, `PricingDetailedTableSection` (8 groupes accordéon), `PricingExtrasSection`, `PricingFaqSection`
- **`marketing/about.vue`** + 8 sections : `AboutHeroSection`, `AboutOriginSection`, `AboutValuesSection`, `AboutTeamSection`, `AboutNumbersSection`, `AboutTimelineSection`, `AboutOfficeSection`, `HomeFinalCtaSection`
- **`marketing/contact.vue`** + 5 sections : `ContactHeroSection`, `ContactChannelsSection`, `ContactFormSection`, `ContactOfficesSection`, `ContactFaqSection`

**Routes mises à jour** (`start/routes/marketing.ts`) :

- `buildPricingPageData(i18n)` → `/en/tarifs`, `/fr/tarifs`
- `buildAboutPageData(i18n)` → `/en/about`, `/fr/a-propos`
- `buildContactPageData(i18n)` → `/contact`

**i18n** : namespaces `pricing2`, `about2`, `contact2` ajoutés dans `fr/marketing.json` et `en/marketing.json`.

---

### Refonte complète de la landing page marketing — Frontend

Implémentation de la landing page FleetAi depuis un design prototype (Claude Design). La page `marketing/home.vue` a été entièrement redessinée avec les sections suivantes :

- **Hero persona-aware** : H1 Instrument Serif 84px, persona switcher (loueurs / écoles / marinas), mock dashboard dans un frame navigateur macOS
- **Logos band** : défilement marquee, 8 clients fictifs
- **Section Problème** : 3 cartes avec stats corail (73 %, 1 200 €, 4h/sem)
- **Section Piliers** : 3 piliers solution (Historique immuable, Planification intelligente, Fleetide IA)
- **3 Feature deep-dives** : layouts alternés gauche/droite avec mocks applicatifs (fiche bateau, planning calendrier, chat Fleetide)
- **Section Personas** : 4 onglets (loueurs / écoles / marinas / armateurs), quote + stat par persona
- **Bande de stats** : 4 métriques en grand Instrument Serif
- **Table comparatif** : fond navy, comparaison Excel / Papier / FleetAi
- **Mur de témoignages** : 1 featured + 3 petits
- **Sécurité & conformité** : 6 cartes (UE, RGPD, chiffrement, etc.)
- **FAQ accordéon** : 8 questions
- **CTA final** : fond navy gradient avec déco boussole SVG

Nouveaux composants créés : `HomeBrowserFrame`, `HomeMockDashboard`, `HomeMockBoatDetail`, `HomeMockPlanning`, `HomeMockFleetide`, `HomeProblemSection`, `HomePillarsSection`, `HomeFeatureSection`, `HomePersonasSection`, `HomeStatsBandSection`, `HomeComparisonSection`, `HomeTestimonialsSection`, `HomeSecuritySection`, `HomeFaqSection`, `HomeFinalCtaSection`.

Layout `public.vue` modifié : `<main>` désormais `w-full` (suppression du padding pour permettre les sections pleine-largeur).

Routes marketing.ts : ajout de la fonction `buildHomePageData()` avec toutes les clés i18n. Clés ajoutées dans `fr/marketing.json` et `en/marketing.json`.

### Gestion des ports, pontons et emplacements bateaux — Backend + Frontend

Nouveau système complet de localisation des bateaux dans les marinas.

**Migrations** (4 nouvelles) :

- `create_ports_table` : table `ports` (organization_id FK, name, city, country, address, notes)
- `create_pontoons_table` : table `pontoons` (port_id FK, name, description)
- `alter_boats_add_pontoon_fields` : ajout `pontoon_id` (FK nullable) et `spot_identifier` (varchar 16) sur `boats`
- `create_boat_position_history_table` : historique des positions (boat_id, pontoon_id, spot_identifier, started_at, ended_at)

**Modèles** : `Port`, `Pontoon`, `BoatPositionHistory` + relations ajoutées sur `Boat` (pontoon, positionHistory) et `Organization` (ports)

**Services** :

- `port_service.ts` : CRUD ports + garde `PortHasBoatsError` / `PontoonHasBoatsError`
- `pontoon_service.ts` : CRUD pontons avec vérification bateaux avant suppression
- `boat_service.ts` : ajout champs `pontoonId`/`spotIdentifier` + méthode `_logBerthChange` pour historique automatique à chaque changement d'emplacement

**Controllers** : `ports_controller`, `pontoons_controller` + mise à jour `boats_controller` (pontoon + historique dans show, ports dans edit/create)

**Routes** : `start/routes/ports.ts` — CRUD ports (`ports.*`) + CRUD pontons (`ports.pontoons.*`)

**Validators** : `port.ts`, `pontoon.ts` + ajout `pontoonId`/`spotIdentifier` dans `boat.ts`

---

### Gestion des ports et pontons — Frontend

Nouvelles pages et composants Vue 3 pour la gestion des ports et pontons :

**Pages ports** (`inertia/pages/ports/`) :

- `index.vue` : liste des ports avec cards (nom, ville, nb pontons, nb bateaux), empty state, bouton "Nouveau port"
- `new.vue` : formulaire de creation de port (name, city, country, address, notes)
- `show.vue` : detail d'un port avec liste des pontons, formulaire inline d'ajout/modification de ponton
- `edit.vue` : formulaire d'edition de port

**Composants ports** (`inertia/components/ports/`) :

- `show/PontoonCard.vue` : affiche un ponton avec sa liste de bateaux et liens vers les fiches bateau
- `modals/PontoonFormModal.vue` : formulaire inline de creation/modification de ponton

**Modifications bateaux** :

- `BoatFormHullFields.vue` : nouvelle section "Emplacement actuel" avec selects Port > Ponton cascades + champ N° d'emplacement
- `BoatShowTabSpecs.vue` : nouvelle carte "Emplacement actuel" affichant le port/ponton ou fallback sur homePort
- `BoatShowTabOverview.vue` : affichage de l'emplacement actuel (Port / Ponton / #spot) dans la sidebar

**Types** :

- `inertia/types/port.ts` : `PortListItem`, `PontoonRow`, `PortShowDetail`, `PortEditPayload`

**i18n** : toutes les cles sont deja presentes dans `resources/lang/{en,fr}/app.json` (namespace `ports.*`)

---

## 2026-05-19

### Refonte landing pages marketing — contenu enrichi et nouvelles sections

**Home page** — 3 nouvelles sections + sections existantes enrichies :

- `HomeScreenshotsSection` : section "See it before you try it" avec 4 onglets produit (dashboard, fiche bateau, checklist, IA)
- `HomeIndustriesSection` : accordéon 3 cibles (loueurs & charters, écoles de voile, armateurs privés) avec pain points / bénéfices / micro-quote
- `HomeCaseStudySection` : étude de cas Marina Bleue — Challenge → Solution → Résultats avec 3 métriques (-80% temps, 22 bateaux, 0 oublié)
- `HomeProofSections` : témoignages enrichis (6 au lieu de 3), ajout taille de flotte et ancienneté
- `HomeHowItWorksSection` : sous-texte pratique par étape + timeline J1/J7/J30

**Pricing page** — sections enrichies :

- "Idéal pour" par plan (3 bullet points ciblés)
- Micro-quote client par plan
- Trust signals enrichis (essai 14 jours, rejoint par 40+ flottes)
- FAQ élargie de 5 à 9 questions

**About page** — nouvelles sections :

- `AboutTimelineSection` : frise chronologique 2024 → aujourd'hui
- Section Mission sur fond navy (eyebrow, statement, body)
- Valeurs étendues de 3 à 5 (transparence radicale, conformité maritime)
- Section Presse : 3 citations (Voiles & Voiliers, Bateaux.com, YachtingWorld)

**i18n** : `resources/lang/{en,fr}/marketing.json` — toutes nouvelles clés EN + FR  
**Routes** : `start/routes/marketing.ts` — nouvelles sections exposées via Inertia (EN + FR)

---

## 2026-05-18

### Analyse IA (Mistral) — Dashboard et fiche bateau

- Panneau IA du dashboard : bouton "Analyser la flotte" desormais fonctionnel — genere des suggestions Mistral basees sur l'etat reel de la flotte (bateaux, maintenances urgentes, stats)
- Panneau IA de la fiche bateau (onglet Vue d'ensemble) : bouton "Actualiser" genere des suggestions specifiques au bateau (moteurs, voiles, securite, taches en retard)
- Les analyses sont cachees en base (`ai_analyses`) et servies sans re-appel Mistral au rechargement de page
- Nouveaux endpoints : `POST /ai/fleet-analysis`, `POST /ai/boats/:id/suggestions`

---

## 2026-05-18

### Analyse IA avec Mistral — Backend

Intégration complète des suggestions IA via Mistral pour l'analyse de flotte et de bateaux individuels :

- **Migration** : nouvelle table `ai_analyses` (id, user_id, boat_id, kind, response_text, created_at)
- **Model** : `AiAnalysis` avec relations `User` et `Boat`
- **Service** : `AiAnalysisService` avec méthodes :
  - `getLatestFleetAnalysis(userId)` : récupère la dernière analyse de flotte
  - `getLatestBoatSuggestions(userId, boatId)` : récupère les dernières suggestions pour un bateau
  - `generateFleetAnalysis(userId, input)` : génère des suggestions IA pour la flotte entière
  - `generateBoatSuggestions(userId, boatId, input)` : génère des suggestions IA pour un bateau spécifique
- **Types exportés** : `AiSuggestion`, `FleetAnalysisInput`, `BoatSuggestionsInput`
- **Routes** :
  - `POST /ai/fleet-analysis` → `ai.fleetAnalysis` (déclenche l'analyse de flotte)
  - `POST /ai/boats/:id/suggestions` → `ai.boatSuggestions` (déclenche les suggestions bateau)
- **Props Inertia** :
  - Dashboard : `aiFleetAnalysis` (tableau de suggestions ou null)
  - Page boat/show : `aiSuggestions` (tableau de suggestions ou null)
- **i18n** : clé `flash.ai.analysisError` ajoutée (EN/FR)
- **Appel synchrone** : pas de queue, résultat stocké en base et servi en cache

---

## 2026-05-18

### Fiches de maintenance — Frontend

Interface Vue 3 complète pour les fiches de maintenance :

- **Nouvel onglet** "Fiches" dans la page de détail du bateau (`?tab=sheets`)
- **Panel principal** (`BoatMaintenanceSheetsPanel`) : création de fiches via modal, filtrage par type
- **Carte de fiche** (`BoatMaintenanceSheetCard`) : affichage du titre, type (badge couleur), statut, progression, expand/collapse
- **Liste d'items** (`BoatMaintenanceSheetItemList`) : checkbox isDone, notes inline avec debounce
- **Actions** : créer, marquer complète, supprimer (avec confirmation)
- **Types** : `MaintenanceSheetRow` et `MaintenanceSheetItemRow` dans `boat_show.ts`
- **i18n** : clés `boats.sheets.*` ajoutées en FR et EN

---

## 2026-05-18

### Fiches de maintenance — Backend

Backend complet pour les fiches de maintenance avec checklist pré-remplie :

- **Types de fiches** : entretien (10 items), montage (10 items), hivernage (14 items), déshivernage (14 items), atelier (8 items)
- **Modèles** : `BoatMaintenanceSheet` et `BoatMaintenanceSheetItem` avec relations Lucid
- **Service** : `BoatMaintenanceSheetService` (list, create, complete, delete, updateItem)
- **Service de templates** : `BoatMaintenanceSheetTemplateService` retourne les items par défaut selon le type
- **Controllers** : `BoatMaintenanceSheetsController` (store, complete, destroy) et `BoatMaintenanceSheetItemsController` (update)
- **Validator** : `createBoatMaintenanceSheetValidator` et `updateSheetItemValidator`
- **Routes** :
  - `POST /boats/:boatId/maintenance-sheets` — créer une fiche
  - `PUT /boats/:boatId/maintenance-sheets/:sheetId/complete` — marquer complète
  - `DELETE /boats/:boatId/maintenance-sheets/:sheetId` — supprimer
  - `PUT /boats/:boatId/maintenance-sheets/:sheetId/items/:itemId` — mettre à jour un item
- **Données exposées** dans `BoatsController.show` via `maintenanceSheets`

---

## 2026-05-18

### Fiche bateau — champs réglementaires français

- **Port d'attache** (`home_port`) : champ texte libre sur le bateau
- **Catégorie de navigation CE** (`navigation_category`) : A / B / C / D avec descriptions (A = océanique, B = hauturière, C = côtière, D = eaux abritées)
- **Numéro de coque HIN/WIN** (`hull_identification_number`) : identifiant constructeur
- **Numéro de francisation** (`francisation_number`) : référence de l'acte douanier
- **Pavillon** (`flag_country`) : code pays (ex. `FR`)
- **Personnes max à bord** (`max_persons`) : nombre entier

### Armement de sécurité

Nouvelle section dédiée sur la fiche bateau, avec CRUD complet :

- **Types** : gilet de sauvetage, radeau, extincteur, VHF, fusée/signal de détresse, EPIRB/PLB, trousse de premiers secours, harnais, bouée, ancre, pompe de cale, compas, AIS, GPS, radar, autre
- **Quantité** : nombre d'unités
- **Date d'expiration** : suivi du renouvellement obligatoire (gilets, fusées, radeaux…)
- **Statut** : OK (vert) · À vérifier (orange) · Périmé (rouge)
- **Notes** : remarques libres par équipement
- Filtrage dans l'onglet Équipement (`?tab=safety`)
- Routes : `POST/PUT/DELETE /boats/:boatId/safety-equipment[/:itemId]`

---

## 2026-05-18

### Pièces moteur

CRUD complet pour les pièces détachées associées à un moteur :

- Désignation, référence, stock, fournisseur, notes
- Accessible depuis la fiche moteur (`?tab=parts`)

### Catégories de maintenance étendues

Ajout des catégories : coque, électricité, plomberie, sécurité, pont, autre (en plus de moteur, voile, gréement)

---

## 2026-05-17

### Notes libres sur les équipements

Champ `notes` (texte libre) ajouté sur les moteurs, voiles et gréements.

### Liens contextuels dans l'historique de maintenance

Les sujets de maintenance sont désormais cliquables et renvoient vers l'équipement concerné.

---

## 2026-05-16

### Téléchargement de documents

- Téléchargement sécurisé des documents attachés aux bateaux et moteurs
- Compression automatique des PDFs via Ghostscript avant upload Cloudinary (`-dPDFSETTINGS=/ebook`)

### Documents moteur

Upload de documents (PDFs, images) directement depuis la fiche moteur.

### Réinitialisation de mot de passe

Flow complet : envoi d'email, lien sécurisé, saisie du nouveau mot de passe.

### Paramètres profil et organisation

Pages dédiées pour modifier les informations du profil utilisateur et de l'organisation.

---

## 2026-05-15

### Médias bateaux (photos et documents)

- Upload de photos et documents via Cloudinary
- Galerie photo sur la fiche bateau (onglet Documents)
- Chemins Cloudinary préfixés par environnement (isolation prod/staging)

### Système email

Intégration `@adonisjs/mail` avec transport SMTP — utilisé pour les emails transactionnels (reset password, notifications futures).

### Enrichissement fiche moteur

- **Heures à l'installation** (`install_hours`) : compteur de référence à la pose
- **Type de cycle** (`stroke_type`) : 2 temps / 4 temps

### Statut des équipements

Champ `status` sur les moteurs, voiles et gréements : `operational` · `in_maintenance` · `out_of_service` · `retired`, affiché avec badge coloré dans l'UI.

### Événements de maintenance depuis la fiche moteur

Ajout d'un événement de maintenance directement depuis la page moteur, sans repasser par la fiche bateau.

### Transitions UI

Animations de transition sur les onglets (indicateur glissant), modals et pages.

---

## 2026-05-13

### Synchronisation onglet / URL

Le paramètre `?tab=xxx` dans l'URL est synchronisé avec l'onglet actif — lien direct et navigation navigateur opérationnels.

---

## 2026-05-11

### Interface bateau à onglets

Fiche bateau réorganisée en 6 onglets : Vue d'ensemble · Specs · Équipements · Historique · Tâches · Documents.

### Modal d'ajout d'événement de maintenance

Formulaire modal pour enregistrer un événement depuis la fiche bateau ou moteur.

### Internationalisation complète

Toutes les chaînes UI sont passées par le système `t()` (useT composable) — support FR/EN sur la totalité des pages et composants.

### Sélecteur de langue

Composant de changement de langue (FR/EN), persistance dans un cookie.

### Pages marketing

Pages À propos et Contact avec animations, SEO meta et contenu localisé.

### PWA

Manifest web app progressif + favicon/branding Fleetide.

---

## 2026-04-27 — 2026-05-10

### Internationalisation backend

Clés de traduction AdonisJS pour les messages flash, erreurs de validation et emails.

### Refactoring composables

- `useT` : composable i18n universel côté Vue
- `useBoatOptions` : options de select centralisées (propulsion, matériau, etc.)

---

## 2026-04-21

### Tâches de maintenance planifiées

Séparation tâches ouvertes / historique terminé. Récurrence par mois ou par heures moteur, échéances en heures moteur.

### Intégration Mistral AI

Service `ai_service.ts` + job de queue pour les analyses IA des maintenances. Interface de prompt sur le tableau de bord.

### Système de queue (PostgreSQL)

Jobs asynchrones persistés en base (`queue_jobs`), avec déduplication idempotente (`queue_dedup_keys`).

### Tableau de bord

Page d'accueil authentifiée : maintenances urgentes, tâches en retard, prochaines échéances.

### Seeder de démo

Données de démonstration (bateau + moteur + voiles + gréement + historique de maintenance) pour initialisation rapide.

---

## 2026-04-20 — Initialisation du projet

### Socle technique

- AdonisJS v7 (TypeScript strict) + Vue 3 / Inertia.js SSR
- PostgreSQL + Lucid ORM, migrations, seeders
- Auth @adonisjs/auth + Bouncer (ACL par abilities)
- Docker + CI/CD GitHub Actions
- ESLint (max-lines 250, vue rules) + Prettier
- Vitest + @vue/test-utils (tests frontend) / Japa (tests backend)
- Tailwind CSS v4
- Design system : composants base (BaseButton, BaseCard, BaseInput, BaseSelect, BaseBadge…)

### Gestion des bateaux

- CRUD bateaux (coque, moteurs, voiles, gréement)
- Historique d'entretien avec pièces consommées
- Architecture REST : hull vs équipements séparés
