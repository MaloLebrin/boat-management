# Changelog

Toutes les nouvelles fonctionnalités, améliorations et correctifs notables.  
Format : `[date] — Description`. Les entrées les plus récentes sont en haut.

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
