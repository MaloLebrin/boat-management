# Commande : Nouvelle ressource AdonisJS complète

Crée une ressource AdonisJS v7 complète et production-ready pour : **$ARGUMENTS**

## Ce que tu dois générer

Utilise l'agent @backend pour créer dans l'ordre :

1. **Migration** `database/migrations/TIMESTAMP_create_RESOURCE_table.ts`
   - Colonnes métier adaptées à la ressource
   - `table.timestamps(true, true)`
   - Index pertinents
   - `down()` avec `dropTable`

2. **Model** `app/models/RESOURCE.ts`
   - Colonnes typées
   - Relations si nécessaire
   - Hooks si nécessaire (ex: slugify)

3. **Factory** `database/factories/RESOURCE_factory.ts`
   - Données réalistes avec faker

4. **Validator** `app/validators/RESOURCE_validator.ts`
   - `storeRESOURCEValidator`
   - `updateRESOURCEValidator`

5. **Service** `app/services/RESOURCE_service.ts`
   - `index(filters?)`, `show(id)`, `store(data)`, `update(id, data)`, `destroy(id)`
   - Gestion des erreurs avec exceptions Adonis

6. **Policy** `app/policies/RESOURCE_policy.ts`
   - `viewAny`, `view`, `create`, `update`, `delete`

7. **Controller** `app/controllers/RESOURCEController.ts`
   - CRUD complet, délégation au Service
   - `index`, `show`, `store`, `update`, `destroy`

8. **Routes** à ajouter dans `start/routes.ts`
   - `router.resource('RESOURCES', RESOURCEController).apiOnly()`

9. **Tests** via @tests
   - Fichier `tests/functional/RESOURCES.spec.ts`
   - Tests CRUD complets avec factory

## Résumé à fournir

À la fin, donne un tableau récapitulatif des fichiers créés et les commandes à exécuter :

```bash
node ace migration:run
node ace test --files=RESOURCES
```
