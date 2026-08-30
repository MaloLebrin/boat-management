# Domaine — Checklists de diagnostic de panne (#515, #516, #576)

## Objectif fonctionnel

Guider l'utilisateur d'un symptôme (« ça démarre puis ça cale ») à une cause probable, **du contrôle le moins cher au plus cher**. L'app ne répare pas et ne remplace ni le manuel d'atelier ni un professionnel : elle ordonne les contrôles et retient ce qui a déjà été fait.

Le parcours tient en trois écrans :

```
/diagnostic                                   → moteurs éligibles de l'organisation
  → …/diagnostic (checklist globale)          → le tri de premier niveau, + panneau IA (#516)
    → …/diagnostic/sheets/:slug (fiche)       → le détail d'une famille de panne
```

Chaque case cochée est persistée par moteur (`boat_engine_diagnostic_checks`) : la checklist survit à la session, ce qui est tout l'intérêt quand le diagnostic s'étale sur plusieurs sorties.

---

## Éligibilité — par famille de motorisation (#576)

Un moteur est éligible **dès qu'au moins une fiche non autonome concerne sa famille** :

```ts
// shared/helpers/diagnostic.ts
isDiagnosticEligibleEngine(engine) === sheetsForEngine(engine).length > 0
```

C'est exactement le critère des pièces détachées (`isSparePartsEligibleEngine`, #574), et c'est un changement par rapport à #515, qui codait la restriction en dur :

```ts
// avant #576
return engine.kind === 'outboard' && engine.strokeType === '2_stroke'
```

Ce test était juste tant que le corpus se limitait au 2 temps. Une fois les fiches in-bord livrées, il créait l'incohérence d'un moteur ayant droit aux pièces détachées mais pas au diagnostic — sur la famille où l'immobilisation coûte le plus cher.

La famille retenue est celle **saisie** sur le moteur (`boat_engines.family`), sinon celle déduite de `kind`/`fuel`/`stroke_type` (`resolveEngineFamily`, `#shared/helpers/engine_family`). Un moteur créé sans famille — API, import, formulaire laissé vide — rend donc la même chose qu'un moteur backfillé.

| Famille                                               | Éligible | Corpus                                                    |
| ----------------------------------------------------- | -------- | --------------------------------------------------------- |
| `outboard_2t`                                         | oui      | les 7 fiches de #515 + `electrical`                       |
| `inboard_diesel_shaft`                                | oui      | in-bord + `gearbox`, `shaft-line`                         |
| `inboard_diesel_saildrive`                            | oui      | in-bord + `gearbox`, `saildrive`                          |
| `sterndrive`                                          | oui      | `inboard-cooling`, `wet-exhaust`, `gearbox`, `electrical` |
| `generator`                                           | oui      | in-bord hors transmission                                 |
| `outboard_4t`, `jet`, `electric_*`, `hybrid`, `other` | non      | pas de contenu — hors périmètre de #576                   |

Ajouter des fiches à une famille l'ouvre automatiquement : il n'y a **aucune liste de familles éligibles** à maintenir ailleurs.

---

## Contenu

| Fichier                                                | Contenu                                                               |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| `shared/constants/diagnostic/diagnostic_content.ts`    | corpus hors-bord 2 temps (#515), agrégation, index des clés           |
| `shared/constants/diagnostic/inboard_diesel_sheets.ts` | corpus in-bord (#576) + la section « charge » de `electrical`         |
| `shared/helpers/diagnostic.ts`                         | éligibilité, filtrage par famille                                     |
| `shared/types/diagnostic.ts`                           | slugs, scopes, formes `DiagnosticSheet` / `DiagnosticGlobalChecklist` |

### Checklists globales

Une par grande famille, chacune avec **son propre préfixe de clés** :

| Scope            | Familles                    | Constante                  |
| ---------------- | --------------------------- | -------------------------- |
| `global`         | `outboard_2t`               | `GLOBAL_CHECKLIST`         |
| `global-inboard` | les quatre familles in-bord | `INBOARD_GLOBAL_CHECKLIST` |

Les préfixes distincts ne sont pas cosmétiques : ils garantissent qu'une case cochée sur un hors-bord n'est jamais comptée pour un in-bord, et que `resetChecks(scope)` (`WHERE step_key LIKE '<scope>.%'`) ne touche qu'une seule checklist. Un test vérifie que les familles servies sont **disjointes** et que toute famille éligible dispose d'une checklist.

Le nombre total d'étapes dépend donc de la famille : `DiagnosticEngineRow` porte `totalSteps` par ligne, la page index ne peut plus lire une constante globale.

### Fiches

Quinze slugs au total. Un slug est un **préfixe de clé persistée** : on en insère, on n'en renomme jamais. D'où `cooling` (hors-bord) et `inboard-cooling` (in-bord) plutôt qu'une fiche unique dont le sens changerait selon le moteur.

| Slug              | Familles      | Sujet                                          |
| ----------------- | ------------- | ---------------------------------------------- |
| `compression`     | 2T            | compression faible ou inégale                  |
| `ignition`        | 2T            | étincelle                                      |
| `fuel`            | 2T            | carburateur et circuit essence                 |
| `cooling`         | 2T            | jet témoin, impeller                           |
| `gearcase`        | 2T            | embase, hélice                                 |
| `timing`          | 2T            | calage, link & sync                            |
| `electrical`      | 2T + in-bord  | démarrage et charge — **élargie**              |
| `first-contact`   | toutes        | achat d'occasion, autonome (état non persisté) |
| `inboard-cooling` | in-bord       | surchauffe, eau de mer et circuit fermé        |
| `diesel-fuel`     | diesel        | gasoil, préfiltre décanteur, purge             |
| `diesel-smoke`    | diesel        | fumées noire / blanche / bleue                 |
| `wet-exhaust`     | in-bord       | coude, waterlock, col de cygne                 |
| `gearbox`         | in-bord       | inverseur                                      |
| `shaft-line`      | ligne d'arbre | presse-étoupe, bague hydrolube, alignement     |
| `saildrive`       | saildrive     | soufflet, anodes, huile émulsionnée            |

**Élargir plutôt que dupliquer.** `electrical` sert les deux mondes : la batterie et le solénoïde valent pour tout le monde, la courroie d'alternateur et les bougies de préchauffage non. `DiagnosticSection.families` restreint la section, pas la fiche — c'est ce qui évite d'afficher `electrical.trim_wiring` à un diesel et `electrical.glow_plugs` à un hors-bord, sans dupliquer la fiche ni renommer une clé.

### Avertissements de sécurité

Le corpus in-bord porte trois rappels absents du hors-bord, testés explicitement parce que leur absence serait un défaut de contenu, pas un oubli de traduction :

- **le soufflet de saildrive a une date de péremption** — un soufflet hors d'âge, même d'aspect impeccable, est un risque de voie d'eau, pas une pièce d'usure ordinaire ;
- **ne jamais ouvrir un circuit de refroidissement chaud sous pression**, et couper le moteur avant toute intervention sur une courroie ;
- **ne jamais desserrer un raccord haute pression moteur tournant** — le jet d'un injecteur diesel traverse la peau.

Le rappel « avant de démarrer » suit aussi la famille : « jamais à sec, bac d'eau ou oreilles de rinçage » pour un hors-bord (`DiagnosticSheet.runningEngineWarning` absent = ce défaut), « vanne de coque ouverte » pour un in-bord.

---

## Diagnostic assisté par IA (#516, paramétré par famille en #576)

`app/services/engine_diagnosis_prompt_service.ts` — builders purs, testables sans conteneur.

La famille cadre **trois** choses, et c'est le risque principal de #576 : un diesel diagnostiqué en 2 temps produirait des conseils faux, pas seulement imprécis.

1. **L'expertise annoncée** — `{expertise}` dans le prompt système, en remplacement de « mécanicien expert en moteurs hors-bord 2 temps » codé en dur.
2. **Le condensé de fiches injecté** — `sheetDigestForFamily()` sert `SHEET_DIGESTS` (2 temps) ou `INBOARD_SHEET_DIGESTS`.
3. **La ligne « Moteur » du message** — le libellé de famille remplace le `(2T, …h)` littéral de #516.

`parseEngineDiagnosisResponse(raw, family)` refuse en plus une fiche qui ne sert pas la famille : `fuel` est un slug valide, mais le recommander sur un diesel serait un conseil faux. Sans famille connue, le comportement de #516 est conservé à l'identique — corpus 2 temps, toute fiche acceptée.

Les garde-fous de #516 sont inchangés : gating par plan et quota de tokens, jamais de spec chiffrée inventée, l'IA recommande et ne décide pas.

> `SHEET_DIGESTS` reste exporté tel quel pour le chat public de diagnostic (#602), qui n'est pas rattaché à un moteur et garde donc le socle hors-bord.

---

## Liens croisés avec les pièces détachées

`DIAGNOSTIC_SHEET_TO_ASSEMBLY` (fiche → ensemble) et `SparePartAssembly.diagnosticSheet` (ensemble → fiche) sont **réciproques**, et trois tests le vérifient :

1. toute entrée `fiche → ensemble` revient vers cette même fiche ;
2. toute fiche citée par un ensemble figure dans la table inverse ;
3. les deux côtés partagent au moins une famille — sinon le lien existe mais aucun moteur ne voit les deux écrans.

L'invariant ne tenait pas avant #576 : `gearcase` pointait vers `lower-unit`, qui renvoie vers `cooling` (l'aller-retour ne bouclait pas), et `electrical` vers `ignition`, sans réciproque. Corrigés respectivement en `propeller` et `starting-charging`.

---

## Persistance

`boat_engine_diagnostic_checks` — une ligne par (moteur, `step_key`) cochée.

**Les `step_key` ne se renomment jamais.** Elles sont l'unique état utilisateur de ce domaine ; en renommer une décocherait silencieusement les checklists de tout le monde. On en insère à n'importe quelle position, jamais on n'en renomme. Un test liste les 82 clés d'avant #576 et vérifie qu'elles existent toujours à l'identique.

`ALL_DIAGNOSTIC_STEP_KEYS` est l'ensemble des clés **persistables** : il exclut les fiches `standalone` (« premier contact »), dont l'état vit dans le navigateur — le moteur prospect n'existe pas en base.

---

## Tests

| Fichier                                                       | Couvre                                                                            |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `tests/inertia/diagnostic_content.spec.ts`                    | invariants de contenu, clés persistées, i18n `fr` + `en`, éligibilité par famille |
| `tests/inertia/spare_parts_content.spec.ts`                   | réciprocité des liens croisés                                                     |
| `tests/unit/services/engine_diagnosis_prompt_service.spec.ts` | prompt et parser par famille                                                      |
| `tests/functional/diagnostic/*.spec.ts`                       | pages, ACL, toggle, reset, fiche hors famille                                     |
| `tests/functional/ai/engine_diagnosis.spec.ts`                | gating plan/quota, prompt in-bord, fiche hors famille rejetée                     |

## Ajouter une fiche

1. Écrire la fiche dans le fichier de corpus de sa famille, `families` renseigné et clés préfixées par le slug.
2. Ajouter le slug à `DIAGNOSTIC_SHEET_SLUGS` (jamais en renommer un).
3. Ajouter les clés i18n dans **les deux** locales — vouvoiement, c'est un écran de l'app.
4. Si la fiche ouvre une famille jusqu'ici non servie, lui donner une checklist globale : le test `toute famille éligible dispose d'une checklist globale` échoue sinon.
5. Si un ensemble de pièces lui correspond, poser le lien **des deux côtés**.
