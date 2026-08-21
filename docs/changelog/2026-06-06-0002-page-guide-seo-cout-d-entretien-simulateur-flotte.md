# 2026-06-06 — Page guide SEO coût d'entretien + simulateur flotte

**Nouvelle fonctionnalité — SEO organique + simulateur authentifié**

## Page guide "Coût d'entretien d'un bateau"

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

## Simulateur de coût sur bateau existant (flotte authentifiée)

Permet à un utilisateur connecté de relancer le simulateur de coût d'entretien sur un bateau déjà dans sa flotte, avec les données de base pré-remplies.

**Routes :**

- `GET /boats/:id/simulator` → `boats.simulator` (auth requis)

**Comportement :** Type, longueur, année, catégorie CE pré-remplis depuis la fiche bateau. Seules les étapes d'usure (coque, moteur, sécurité, gréement) sont présentées. Calcul client-side sans persistance. Résultat avec bouton retour fiche bateau.

**Accès :** Bouton "Estimer les coûts d'entretien" dans l'onglet Aperçu de la fiche bateau.

**Fichiers créés :**

- `app/controllers/boat_simulator_controller.ts` — contrôleur avec bouncer `BoatPolicy.view`
- `inertia/pages/boats/simulator.vue` — page simulateur flotte (layout app)

---
