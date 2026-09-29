# Domaine — États des lieux (#311, #491, #495, #584, #889)

## Objectif fonctionnel

Constater l'état du bateau au départ (check-out) et au retour (check-in) d'une
réservation, et rendre les deux constats **comparables point par point** :

```
Réservation
   ├── Inspection check-out ──┐
   │      ├── checklist       │  comparaison point par point
   │      ├── photos          │  (le check-in affiche l'état
   │      └── notes libres    │   au départ en regard)
   └── Inspection check-in ───┘
          └── item en `damage` ──► action d'équipement pré-remplie
```

Une inspection est unique par `(réservation, kind)` — au plus un check-out et
un check-in. L'unicité est tenue par l'**index unique Postgres**
`(reservation_id, kind)` ; la vérification applicative de
`createForReservation` n'est qu'un doublon de confort — la retirer ne change
rien d'observable, l'index prend le relais (`23505` → même erreur métier).
Un second état des lieux du même type répond **302 + flash
`inspections.kindAlreadyExists`**, et n'écrase pas le premier.

L'écran (`/boats/:boatId/reservations/:reservationId/inspection`) affiche les
deux panneaux côte à côte (onglets sous `lg`, #495).

> ⚠️ **L'ordre de la prop `inspections` n'est pas celui du séjour.**
> `listForReservation` trie `orderBy('kind', 'asc')`, et `checkin` précède
> `checkout` dans l'alphabet : le **retour** arrive donc en premier, quel que
> soit l'ordre de création. Chercher par `kind`, jamais par position (#694).

## Checklist structurée (#584)

Avant #584, tout le constat tenait dans le blob `notes` : deux états des lieux
n'étaient pas comparables et rien n'était exploitable. La checklist reprend le
pattern éprouvé du diagnostic panne (`boat_engine_diagnostic_checks`) : un
**corpus statique à clés stables** + une **table de persistance minimale**.

### Corpus

`shared/constants/inspections/inspection_checklist_content.ts` — sections ×
items, chaque item avec :

- `key` (`<section>.<slug>`) — **persistée en base, jamais renommée** ; on peut
  en insérer de nouvelles à n'importe quelle position (garde-fou :
  `INITIAL_ITEM_KEYS` dans `tests/inertia/inspection_checklist_content.spec.ts`)
- `labelKey` — clé i18n présente dans les deux locales
  (`inspections.checklist.sections.<section>.items.<slug>`)
- `categories?` — catégories de bateau concernées (enum #571) : pas de section
  « mât et gréement » sur une vedette, pas d'« intérieur » sur un semi-rigide.
  Absent = l'item vaut pour tous les bateaux

Sections : coque et pont, mât et gréement (voiliers), moteur et niveaux,
électricité et électronique, sécurité, intérieur et propreté, annexe et
accessoires.

La **même checklist** sert au check-out et au check-in — c'est la comparaison
qui a de la valeur.

### Filtrage par catégorie

`shared/helpers/inspection_checklist.ts` :

- `inspectionCategoryForBoat(boat)` — `boats.category` (#571) quand elle est
  renseignée, sinon repli best-effort sur les colonnes historiques `type` et
  `propulsion_type` via `deriveCategoryFromLegacy`. `null` = catégorie
  inconnue → la checklist s'affiche **en entier** (cocher un point sans objet
  ne coûte qu'un tap, cacher un vrai point coûte un oubli)
- `inspectionSectionsForCategory(category)` — sections et items applicables

### Persistance

Table `boat_inspection_items` : `(boat_inspection_id, item_key)` unique,
`state` (`ok | remark | damage`), `note`. **L'absence de ligne signifie « non
contrôlé »** — ce n'est pas un état. La note est obligatoire dès que l'état
n'est pas `ok` (validator `requiredWhen` + garde UI) et effacée au retour à
`ok`. Le `item_key` est validé contre le corpus dans le service
(`ALL_INSPECTION_ITEM_KEYS`), jamais seulement côté client.

### Parcours terrain

1. Chaque point se coche `ok` d'un tap ; `remark`/`damage` ouvrent la saisie de
   note (cibles tactiles ≥ 44 px, acquis de l'épic #481).
2. Un point en `damage` propose une **action d'équipement pré-remplie**
   (libellé du point + note du constat) via le lien inspection → action déjà
   en place (#311). ⚠️ C'est une **affordance d'interface**, pas une règle du
   domaine : le `v-if="row?.state === 'damage' && canManageActions"` de
   `InspectionChecklistItem.vue` décide seul de l'afficher.
   `createFromInspection` ne lit jamais `boat_inspection_items` — une action se
   crée depuis un état des lieux dont tous les points sont `ok`, ou qui n'en a
   aucun. Figé par `tests/functional/reservations/inspection_round_trip.spec.ts`
   (#694).
3. Au check-in, chaque point affiche l'état qu'il avait au check-out de la même
   réservation ; une **dégradation** (l'état a empiré) est mise en évidence.
4. `notes` reste disponible pour le hors-checklist — aucun champ supprimé, les
   inspections antérieures à #584 s'affichent comme avant (notes seules).

## Contenu

| Fichier                                                                  | Rôle                                                       |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `shared/constants/inspections/inspection_checklist_content.ts`           | Corpus sections × items, `ALL_INSPECTION_ITEM_KEYS`        |
| `shared/helpers/inspection_checklist.ts`                                 | Catégorie effective + filtrage                             |
| `shared/types/inspection.ts`                                             | États, payloads, rows                                      |
| `app/services/boat_inspection_service.ts`                                | CRUD inspections + `setItem`/`clearItem`                   |
| `app/controllers/boat_inspections_controller.ts`                         | `show`, CRUD, `setItem`, `destroyItem`, actions équipement |
| `inertia/components/reservations/inspection/InspectionChecklist.vue`     | Sections, progression, modal d'action pré-remplie          |
| `inertia/components/reservations/inspection/InspectionChecklistItem.vue` | Ligne : tap `ok`, note, comparaison, dégradation           |
| `inertia/components/reservations/inspection/InspectionDefectModal.vue`   | Saisie de l'action pré-remplie depuis un point `damage`    |
| `inertia/components/reservations/inspection/InspectionDefects.vue`       | Liste des actions rattachées à l'état des lieux            |
| `inertia/components/reservations/inspection/InspectionPhotos.vue`        | Galerie et ajout de clichés                                |
| `inertia/components/reservations/inspection/InspectionComparison.vue`    | Confrontation départ / retour                              |
| `inertia/components/reservations/inspection/InspectionPanel.vue`         | Un panneau (un `kind`) avec son formulaire                 |
| `shared/helpers/inspection_report.ts`                                    | Contenu imprimé : sections, décompte, écarts départ/retour |
| `app/services/inspection_pdf_service.ts`                                 | Mise en page pdfkit de l'état des lieux (#889)             |
| `app/services/inspection_document_service.ts`                            | PDF à servir, signature + verrou, envoi au client (#889)   |
| `app/controllers/inspection_documents_controller.ts`                     | `pdf`, `sign`, `send` (#889)                               |
| `app/jobs/send_inspection_email.ts`                                      | E-mail au client, PDF signé en pièce jointe (#889)         |
| `inertia/components/reservations/inspection/InspectionDocumentBar.vue`   | Statut, PDF, « Faire signer », « Envoyer au client »       |
| `inertia/components/reservations/inspection/InspectionSignModal.vue`     | Nom du client + deux pads de signature                     |
| `inertia/components/reservations/inspection/SignaturePad.vue`            | Pad canvas (doigt, stylet, souris) → PNG                   |

## Routes

| Verbe         | URL                                                     | Action                                           |
| ------------- | ------------------------------------------------------- | ------------------------------------------------ |
| GET           | `/boats/:boatId/reservations/:reservationId/inspection` | page (les deux panneaux)                         |
| POST          | `.../inspections`                                       | créer une inspection                             |
| PUT / DELETE  | `.../inspections/:inspectionId`                         | modifier / supprimer                             |
| PATCH         | `.../inspections/:inspectionId/items`                   | constat d'un point (`itemKey`, `state`, `note?`) |
| DELETE        | `.../inspections/:inspectionId/items`                   | repasser un point en « non contrôlé »            |
| POST / DELETE | `.../inspections/:inspectionId/equipment-actions[...]`  | défauts → actions (#311)                         |
| POST / DELETE | `.../inspections/:inspectionId/photos[...]`             | photos (pipeline média)                          |
| GET           | `.../inspections/:inspectionId/pdf[?inline=1]`          | PDF : archive signée, sinon brouillon (#889)     |
| POST          | `.../inspections/:inspectionId/sign`                    | signature des deux parties → verrou (#889)       |
| POST          | `.../inspections/:inspectionId/send`                    | e-mail du PDF signé au client (#889)             |

Toutes les mutations répondent par redirection Inertia (`redirect().back()` pour
les items — `preserveScroll` côté client), jamais par du JSON.

## Permissions

**Avant toute policy, la garde de module.** Le sous-groupe de routes porte
`middleware.requireModulePlan({ feature: 'reservations' })` (#595) : une
organisation sans le module Location est redirigée vers `/settings/billing`
**avant** d'atteindre le contrôleur. C'est la première cause d'un 302
inexpliqué en test — l'acteur doit venir de `createCharterAdminUser()`.
Exhaustivité tenue par `tests/unit/hygiene/charter_routes_gated.spec.ts`.

`InspectionPolicy` (org scope + abilities `inspections.*`) : `view` pour la
page, `create`/`edit`/`delete` pour les mutations — les items relèvent de
`edit`. Les actions d'équipement passent par `EquipmentActionPolicy`.
`mechanic` et `boat_owner` n'ont **aucune** de ces abilities : une lecture leur
répond `403`, une écriture `302` vers `/` avec un flash que le layout marketing
ne rend pas (#694).

## Photos

Les photos restent au niveau de l'inspection — le rattachement par item
envisagé dans #584 est resté hors périmètre, le pipeline n'étant pas générique
par item.

Le stockage est la table **polymorphe `media`**, indexée par
`(entity_type, entity_id)` avec `entity_type = 'inspection'` — et non
`equipment_media`, qui n'est pas une table mais le nom d'un service et d'une
page de doc. Le dossier Cloudinary embarque le `kind`
(`…/reservations/:id/inspections/checkout` ou `…/checkin`) : les clichés du
départ et ceux du retour ne peuvent pas se mélanger.

## Hors-ligne (#491, #622)

Un état des lieux se **crée hors-ligne** : la création part dans la file
IndexedDB avec un jeton temporaire (`create-inspection`), les défauts saisis
dans la foulée le référencent, et la synchro rejoue la création puis réécrit les
défauts avec l'ID réel. Modifier un état des lieux déjà en base fonctionne aussi
hors-ligne (`update-inspection`), avec détection de conflit `_expectedUpdatedAt`.

La **signature** (#889) n'a pas de chemin hors-ligne : le PDF signé est
produit et archivé par le serveur au moment où l'on signe, et un tracé mis en
file pourrait arriver sur une inspection modifiée depuis. La modale le dit et
désactive « Signer et figer » tant que le réseau manque.

Restent indisponibles tant que l'état des lieux n'est pas synchronisé, avec un
message explicite : la **checklist** (les constats `PATCH .../items` n'ont pas de
chemin hors-ligne) et l'**ajout de photos** (#621). Mécanique détaillée dans
`docs/frontend/pwa.md`, section « Dépendances entre actions ».

## Hors périmètre (#584)

Facturation des dommages, checklists personnalisables par organisation,
checklist et photos hors-ligne (voir ci-dessus). Le PDF d'état des lieux
signable, aussi listé ici à l'origine, est livré par #889 (section suivante).

## Caution au retour (#875)

L'écran d'état des lieux porte, sous la comparaison départ/retour, le bloc
**Caution** (`SecurityDepositPanel.vue`) : c'est au vu des défauts constatés au
retour qu'on la restitue ou qu'on en retient une partie (montant ≤ caution
bloquée, motif obligatoire). Le bloc lit la prop `reservation` et ne recharge
qu'elle ; ses gestes sont réservés à `boats.manage` (prop `canManagePayment`).
Règles et routes : `docs/domain/reservations-and-pricing.md`, section 5.5.
Retenir une caution ne crée pas encore de facture de dommages.

## État des lieux signé (#889)

L'état des lieux est la pièce qu'on oppose à une contestation de caution : ce
qui a été constaté, quand, avec quelles photos, **signé par les deux
parties**. Chaque inspection produit donc un PDF, se signe sur place et part
chez le client.

### PDF

`InspectionPdfService` (pdfkit, kit commun `app/services/pdf/`, marque blanche
Entreprise) met en page un `InspectionPdfData` déjà résolu — ni base ni réseau
dans le service :

- en-tête de marque, statut (**brouillon** non signé, ou « Signé le … ») ;
- bateau, période de la réservation, date du relevé, client, carburant et
  heures moteur, notes libres ;
- checklist par zone, chaque point avec son constat (« Non contrôlé » en
  l'absence de ligne) et sa note, précédée d'un décompte ;
- pour un **retour**, les écarts avec le départ : relevés et points dont le
  constat a changé, les dégradations en évidence ;
- défauts levés depuis l'inspection (actions d'équipement) ;
- vignettes photos en grille, 12 au plus (`INSPECTION_PDF_MAX_PHOTOS`), en JPEG
  redimensionné par Cloudinary (`fetchThumbnail`) — pdfkit ne lit ni HEIC ni
  WebP. Une photo qui ne vient pas est omise et comptée dans la mention
  « + N photo(s) non reproduite(s) » ;
- deux cadres de signature, client puis loueur.

Le contenu (sections applicables, points hors catégorie conservés, écarts) est
calculé par `shared/helpers/inspection_report.ts`, testé en unitaire.

### Signature et verrou

`POST …/sign` reçoit le nom du client et deux tracés PNG (`data:image/png;base64,…`,
300 000 caractères au plus). Le service vérifie que les octets sont bien un
PNG, puis :

1. produit le PDF **signé** et l'archive (`media`, `entity_type = 'inspection'`,
   `kind = 'document'`, dossier `…/inspections/<kind>/signed`) — avant toute
   écriture en base : un échec Cloudinary laisse l'inspection modifiable ;
2. dans une transaction (`FOR UPDATE`), crée les deux lignes de
   `boat_inspection_signatures` et pose `locked_at`, `locked_by_id`,
   `pdf_media_id`. Deux signatures simultanées : la seconde voit le verrou et
   son PDF archivé est retiré.

Le nom de l'agent est celui du compte connecté. Les tracés vivent **en base**
(bytea, quelques dizaines de Ko) plutôt qu'en média : ils disparaissent avec
l'inspection et ne dépendent d'aucun service externe. Ils ne transitent jamais
par les props Inertia — seuls rôle, nom et date remontent (`signatures`).

Une inspection signée est **figée**, comme une facture émise (#717) : constats,
relevés, photos, défauts levés depuis elle et suppression répondent
`flash.inspections.locked`. L'écran masque ces gestes. Il n'y a pas de
déverrouillage.

`GET …/pdf` sert l'**archive** signée ; sans archive (ou Cloudinary
injoignable), il recalcule le PDF depuis les données figées. Avant signature,
c'est un brouillon produit à la demande. `?inline=1` l'ouvre dans le
navigateur.

### Envoi au client

`POST …/send` (e-mail vérifié exigé, #768) n'accepte qu'une inspection signée
(`flash.inspections.notSigned` sinon) et une adresse : celle de la réservation,
sinon celle de la fiche client (`flash.inspections.noClientEmail`). Le job
`SendInspectionEmail` joint le PDF archivé ; `sent_at` date le dernier envoi,
et l'on peut renvoyer.

### Caution

Au retour, l'état des lieux signé est le justificatif d'une retenue sur caution
(section « Caution au retour » ci-dessous) : le bloc Caution reste sous la
comparaison, le PDF signé est sur la même page.

### Limites

- Pas de signature **à distance** (lien par e-mail vers une page de
  signature) : les deux parties signent sur l'écran de l'agent.
- Signature électronique qualifiée (eIDAS) hors périmètre : tracé manuscrit,
  horodatage et PDF figé suffisent à l'usage.
- Le PDF signé n'apparaît pas encore dans les documents de la fiche client
  (CRM) : il se télécharge depuis l'écran d'état des lieux de la réservation.
