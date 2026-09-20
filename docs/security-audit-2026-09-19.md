# Audit sécurité — FleetAi — 2026-09-19

Audit transversal par revue de code statique (sans serveur lancé), complété par
`pnpm audit` sur le lockfile. Périmètre : sécurité applicative, bugs de
correction, fuites de ressources, durcissement config/CI.
Repo : https://github.com/MaloLebrin/boat-management

Chaque finding a fait l'objet d'une vérification directe dans le code avant
d'être retenu. Les pistes qui n'ont pas survécu à cette vérification sont
listées en fin de document, avec la raison — elles sont aussi utiles que les
findings, puisqu'elles évitent de refaire le travail.

**26 issues ouvertes : #761 → #786.**

---

## Ce qui est déjà solide

À noter d'abord, parce que ça cadre la lecture du tableau qui suit : la base est
saine. L'audit n'a trouvé **aucune** injection SQL (tout le SQL brut est
paramétré ou littéral), **aucun** `request.all()` / `request.body()`, **aucun**
`response.json` sur une route Inertia, **aucun** `v-html` / `eval` /
`new Function` dans `inertia/**`, et un seul appel de binaire externe, fait avec
un tableau d'arguments donc sans injection shell possible.

Sont également corrects : la vérification de signature du webhook Stripe avec
déduplication par `event.id` ; le chiffrement au repos des clés IA BYOK, qui ne
franchissent jamais la frontière du backend ; `password` en `serializeAs: null` ;
les props Inertia partagées passées par un transformer en allowlist, avec un test
d'hygiène dédié ; les tokens de réinitialisation et d'invitation en
`randomBytes(64)` stockés en SHA-256 avec expiration ; la régénération de l'ID de
session à la connexion ; et le cloisonnement multi-tenant, appliqué
systématiquement dans la couche service selon un motif _résoudre puis autoriser_.

Les failles franchement exploitables sont donc rares. Le volume du tableau vient
surtout du durcissement et de la dette de couverture.

---

## Tableau récapitulatif

| Issue                                                            | Sévérité  | Domaine          | Titre                                                                          |
| ---------------------------------------------------------------- | --------- | ---------------- | ------------------------------------------------------------------------------ |
| [#761](https://github.com/MaloLebrin/boat-management/issues/761) | 🔴 HIGH   | Contrôle d'accès | `/settings/members` et `PUT /settings/org` ne vérifient aucune capability      |
| [#762](https://github.com/MaloLebrin/boat-management/issues/762) | 🔴 HIGH   | IA publique      | Le plafond des chats IA publics est contournable en vidant ses cookies         |
| [#763](https://github.com/MaloLebrin/boat-management/issues/763) | 🔴 HIGH   | Sessions         | Le reset de mot de passe n'invalide ni les sessions ni les remember-me tokens  |
| [#764](https://github.com/MaloLebrin/boat-management/issues/764) | 🔴 HIGH   | Uploads          | 400 Mo écrits sur disque avant toute validation, sur 12 routes                 |
| [#765](https://github.com/MaloLebrin/boat-management/issues/765) | 🔴 HIGH   | Dépendances      | 62 avis `pnpm audit` ; axios, nodemailer et ws sont dans le chemin d'exécution |
| [#766](https://github.com/MaloLebrin/boat-management/issues/766) | 🟡 MEDIUM | Auth             | `POST /signup` n'a aucun throttle                                              |
| [#767](https://github.com/MaloLebrin/boat-management/issues/767) | 🟡 MEDIUM | Auth             | Le login n'est borné que par IP — pas de limite par compte                     |
| [#768](https://github.com/MaloLebrin/boat-management/issues/768) | 🟡 MEDIUM | Auth             | Aucun flux de vérification d'e-mail                                            |
| [#769](https://github.com/MaloLebrin/boat-management/issues/769) | 🟡 MEDIUM | Secrets          | Cinq secrets hors du type `Secret`, et pas de `redact` logger                  |
| [#770](https://github.com/MaloLebrin/boat-management/issues/770) | 🟡 MEDIUM | Sessions         | Un token de reset peut être recopié dans l'URL du dashboard                    |
| [#771](https://github.com/MaloLebrin/boat-management/issues/771) | 🟡 MEDIUM | Contrôle d'accès | `OrgScopedPolicy.before()` échoue « ouvert » sur une ressource illisible       |
| [#772](https://github.com/MaloLebrin/boat-management/issues/772) | 🟡 MEDIUM | PDF              | Ghostscript sans limite de temps ni `-dSAFER`                                  |
| [#773](https://github.com/MaloLebrin/boat-management/issues/773) | 🟡 MEDIUM | CSV              | Les deux escapers CSV n'empêchent pas l'injection de formule                   |
| [#774](https://github.com/MaloLebrin/boat-management/issues/774) | 🟡 MEDIUM | CSV              | L'import passe toutes les lignes par la session, sans plafond                  |
| [#775](https://github.com/MaloLebrin/boat-management/issues/775) | 🟡 MEDIUM | RGPD             | Aucune purge pour les données des formulaires publics                          |
| [#776](https://github.com/MaloLebrin/boat-management/issues/776) | 🟡 MEDIUM | Quotas IA        | Le mutex de quota est mono-processus — contournable par course                 |
| [#777](https://github.com/MaloLebrin/boat-management/issues/777) | 🟡 MEDIUM | CI               | Ni audit de dépendances, ni scan de secrets, actions non épinglées             |
| [#778](https://github.com/MaloLebrin/boat-management/issues/778) | 🟡 MEDIUM | Tests            | Shield désactivé en test — CSRF et CSP jamais exercés                          |
| [#779](https://github.com/MaloLebrin/boat-management/issues/779) | 🟢 LOW    | En-têtes         | CSP incomplète (`frame-ancestors`, `form-action`, `Referrer-Policy`)           |
| [#780](https://github.com/MaloLebrin/boat-management/issues/780) | 🟢 LOW    | Notifications    | `actionUrl` non validée avant `router.visit()` / `openWindow()`                |
| [#781](https://github.com/MaloLebrin/boat-management/issues/781) | 🟢 LOW    | Exposition       | Le portail propriétaire envoie des modèles Lucid bruts                         |
| [#782](https://github.com/MaloLebrin/boat-management/issues/782) | 🟢 LOW    | Exposition       | Colonnes `token` sans `serializeAs: null`                                      |
| [#783](https://github.com/MaloLebrin/boat-management/issues/783) | 🟢 LOW    | Validation       | `POST /locale` et `/theme` écrivent sans validateur ni throttle                |
| [#784](https://github.com/MaloLebrin/boat-management/issues/784) | 🟢 LOW    | Médias           | `Content-Type` relayé depuis Cloudinary au lieu d'une allowlist                |
| [#785](https://github.com/MaloLebrin/boat-management/issues/785) | 🟢 LOW    | Uploads          | Le logo de marque accepte le SVG, sans assainissement                          |
| [#786](https://github.com/MaloLebrin/boat-management/issues/786) | 🟢 LOW    | Secrets          | Clés BYOK chiffrées avec `APP_KEY`, sans rotation possible                     |

Répartition : 5 élevées, 13 moyennes, 8 faibles.

---

## Les cinq findings de sévérité élevée

### #761 — `/settings/members` et `PUT /settings/org` sans capability

`app/controllers/settings_controller.ts:74-95` n'utilise `allows('manageMembers')`
que pour un flag d'affichage, sans jamais `authorize('viewMembers')` : tout membre
authentifié récupère l'annuaire complet de l'organisation, e-mails et invitations
en attente comprises. Le jumeau `organization_members_controller.ts:26` autorise
correctement sur les mêmes données — la capability existe, cet écran la contourne.

`updateOrganization` (`:242-253`) n'appelle aucune policy : tout membre renomme
l'organisation, dont le nom part sur les factures et les PDF.

### #762 — Plafond des chats IA publics contournable

`app/services/public_diagnosis_service.ts:99-103` compte les conversations dans
la **session** du visiteur. Vider ses cookies remet le compteur à zéro. Chaque
conversation consomme la clé Mistral de l'app hors quota d'organisation (`:221-225`).
Seul garde-fou restant : 6 req/min/IP. Même schéma sur `/parts-ai`.

### #763 — Le reset de mot de passe ne révoque rien

`app/controllers/password_reset_controller.ts:39-60` ne supprime que les tokens de
réinitialisation. Les sessions ouvertes (5 jours) et les remember-me tokens
(**30 jours**, `config/auth.ts:15-25`) survivent : après compromission, la victime
change son mot de passe et l'attaquant reste connecté un mois.

### #764 — 400 Mo sur disque avant validation

`config/bodyparser.ts:7` fixe `LARGE_UPLOAD_LIMIT = '400mb'` et
`app/middleware/large_multipart_upload_middleware.ts:27-40` écrit chaque partie
dans `tmpdir()` avec `deferValidations: true`. La validation VineJS
(`size: '10mb'`, `extnames`) n'arrive que dans le contrôleur, donc après.

### #765 — Dépendances vulnérables dans le chemin d'exécution

62 avis, dont trois paquets réellement exposés : **axios** (`<1.18.0`, expédié dans
le bundle client via `@inertiajs/vue3`, pollution de prototype menant à une
injection d'identifiants), **nodemailer** (`<9.1.1`, traite des adresses fournies
par l'utilisateur), **ws** (`<8.21.0`, client Mistral). Le reste est de
l'outillage de test et de build.

---

## Pistes écartées après vérification

Ces points ont été examinés et **ne justifient pas d'issue**. Ils sont consignés
pour éviter de les re-signaler.

| Piste                                              | Verdict                                                                                                                                                                                              |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `innerHTML` dans `inertia/components/json_ld.ts:8` | Les quatre appelants ne passent que des chaînes i18n statiques (`marketing/{home,help,guide,feature}.vue`).                                                                                          |
| XSS stocké via les téléchargements de média        | Les quatre routes émettent `Content-Disposition: attachment` (aucune n'utilise `inline`) et `nosniff` est actif. Reste un durcissement → #784.                                                       |
| Session fixation à la connexion                    | **Faux positif.** Le guard appelle `session.regenerate()` dans `#createSessionForUser`, invoqué par `login()` (`@adonisjs/auth@10.1.0`, `modules/session_guard/main.js:199-203`).                    |
| `GET /up`                                          | Ne renvoie que `{status, checks:{database}}` — aucune fuite d'information.                                                                                                                           |
| Sérialisation du hash de mot de passe              | `serializeAs: null` (`database/schema.ts:2858`).                                                                                                                                                     |
| Signature du webhook Stripe                        | Vérifiée via `Stripe.webhooks.constructEvent`, rejeu dédupliqué par `event.id` dans une transaction.                                                                                                 |
| Injection SQL                                      | Tout le SQL brut est paramétré (`?` bindings) ou littéral.                                                                                                                                           |
| `POST /invitations/decline` sans auth              | Token en `randomBytes(64)`, non brute-forçable. Choix délibéré et documenté.                                                                                                                         |
| Divulgation d'information sur erreur               | `debug` désactivé en production, page 5xx rendue avec des props vides, erreurs métier surfacées en clés i18n.                                                                                        |
| Lecture des chats IA publics par token             | `#findOwnedOrFail` exige aussi que le token soit dans la session de l'appelant ; pas de route GET par token.                                                                                         |
| Fuite des clés IA BYOK vers le front               | `serializeAs: null`, seuls des booléens sortent du backend. Invariant testé (`tests/functional/settings/ai_api_key.spec.ts:13,69`).                                                                  |
| Traversée de chemin à l'import CSV                 | `tmpPath` est généré par le framework, jamais influencé par l'utilisateur.                                                                                                                           |
| Payloads de jobs                                   | Limités à des ids et uuids ; `run_ai_chat` re-vérifie le quota dans le worker au lieu de faire confiance à l'enfileur.                                                                               |
| Injection de prompt menant à une action            | L'assistant n'a aucun outil d'écriture ; les écritures passent par un flux proposer→confirmer qui reprouve chaque id contre l'organisation. La sortie du modèle est rendue en texte, jamais en HTML. |
| Énumération des tokens de partage du simulateur    | 48 bits, non énumérables en pratique, et le contenu ne comporte aucune donnée personnelle. Le vrai défaut est l'absence d'expiration → #775.                                                         |
| Énumération de comptes sur `forgot-password`       | Le même message de succès est flashé que l'e-mail existe ou non.                                                                                                                                     |

---

## Trous de couverture de tests identifiés

La couverture existante est dense — matrice de policies partagée
(`tests/support/policy_matrix.ts` + 19 specs), garde d'hygiène sur les props
Inertia, contrats cross-org sur les exports et l'import. Les manques repérés sont
portés par les issues correspondantes :

- aucun test d'injection de formule CSV, sur aucun des deux escapers (#773) ;
- rien ne borne la forme de la prop `maintenanceEvents` du portail propriétaire (#781) ;
- aucun test de plafond de lignes à l'import CSV (#774) ;
- aucune assertion que la CSP et le CSRF sont réellement émis, Shield étant retiré
  en test (#778) ;
- `tests/integration/permissions/policies_capabilities.spec.ts` appelle les policies
  en direct, donc hors du hook `before()` — le fail-open n'est pas couvert (#771).
