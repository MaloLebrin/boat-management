# 2026-05-19

## Plan interactif 2D de marina — Backend

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

## Ajout des mouillages aux ports

- Nouvelle entité `Mouillage` (table `mouillages`) : nom, description, appartient à un port (CASCADE on delete)
- CRUD complet sur la page détail d'un port : section "Mouillages" avec formulaire inline et cartes (`MouillageCard`, `MouillageFormModal`)
- Affectation d'un bateau à un mouillage (exclusif avec le ponton) : champ `mouillage_id` sur `boats`, formulaire bateau mis à jour avec deux selects mutuellement exclusifs (Ponton | Mouillage)
- Historique de position étendu : `mouillage_id` sur `boat_position_history`, `portName` résolu depuis le mouillage si pas de ponton
- Protection suppression : impossible de supprimer un mouillage ou un port si des bateaux y sont affectés
- Routes : `POST/PUT/DELETE /ports/:portId/mouillages[/:mouillageId]`
- i18n EN + FR complets (`ports.mouillages.*`, `boats.hullFields.mouillage`)

---

## Refonte pages Pricing, About, Contact — Frontend

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

## Refonte complète de la landing page marketing — Frontend

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

## Gestion des ports, pontons et emplacements bateaux — Backend + Frontend

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

## Gestion des ports et pontons — Frontend

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
