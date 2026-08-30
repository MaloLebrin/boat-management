# 2026-08-30 — État des lieux structuré par checklist (check-in / check-out) (#584)

L'état des lieux se réduisait à quatre champs dont un blob de `notes` : deux
inspections n'étaient pas comparables et rien n'était exploitable. La checklist
reprend le pattern du diagnostic panne : un corpus statique à clés stables +
une table de persistance minimale.

- **Corpus** `shared/constants/inspections/inspection_checklist_content.ts` :
  7 sections (coque et pont, mât et gréement, moteur et niveaux, électricité et
  électronique, sécurité, intérieur et propreté, annexe et accessoires), 33
  points de contrôle à clés stables (`<section>.<slug>`, jamais renommées),
  libellés i18n dans les deux locales.
- **Ciblage par catégorie de bateau** (enum #571) : pas de gréement sur une
  vedette, pas d'intérieur sur un semi-rigide. Repli sur les colonnes
  historiques `type`/`propulsion_type` quand `boats.category` est vide ;
  catégorie inconnue = checklist entière (`shared/helpers/inspection_checklist.ts`).
- **Table `boat_inspection_items`** : `state` (`ok | remark | damage`, CHECK),
  `note` (obligatoire si `remark`/`damage`, effacée au retour à `ok`), unique
  `(boat_inspection_id, item_key)`, FK cascade, `down()` implémenté. L'absence
  de ligne signifie « non contrôlé ». `item_key` validé contre le corpus côté
  service.
- **Routes** : `PATCH .../inspections/:inspectionId/items` (constat) et
  `DELETE .../items` (retour à non contrôlé), mutations Inertia
  (`router.patch`/`router.delete` + `preserveScroll`, redirections côté
  contrôleur), ability `inspections.edit`.
- **Écran** : checklist filtrée par catégorie dans chaque panneau d'inspection,
  tap = `ok`, éditeur de note pour `remark`/`damage`, cibles tactiles ≥ 44 px,
  compteur de progression.
- **Dommage → action** : un point en `damage` propose la création d'une action
  d'équipement pré-remplie (libellé du point + note) via la modal existante
  (#311).
- **Comparaison** : au check-in, chaque point affiche son état au check-out de
  la même réservation ; une dégradation est signalée en rouge.
- **Compat** : inspections existantes inchangées (notes seules), aucun champ
  supprimé, aucune migration de données.
- **Docs** : création de `docs/domain/inspections.md`, sections
  `boat_inspections` et `boat_inspection_items` ajoutées à `docs/data/schema.md`.
- **Tests** : Japa (CRUD des constats, validation des clés contre le corpus,
  note conditionnelle, scoping org, cascade, props de comparaison) + Vitest
  (invariants du corpus dont garde-fou des clés persistées et i18n bi-locale,
  filtrage par catégorie, composant checklist).
