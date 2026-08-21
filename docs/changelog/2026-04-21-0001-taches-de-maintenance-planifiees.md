# 2026-04-21

## Tâches de maintenance planifiées

Séparation tâches ouvertes / historique terminé. Récurrence par mois ou par heures moteur, échéances en heures moteur.

## Intégration Mistral AI

Service `ai_service.ts` + job de queue pour les analyses IA des maintenances. Interface de prompt sur le tableau de bord.

## Système de queue (PostgreSQL)

Jobs asynchrones persistés en base (`queue_jobs`), avec déduplication idempotente (`queue_dedup_keys`).

## Tableau de bord

Page d'accueil authentifiée : maintenances urgentes, tâches en retard, prochaines échéances.

## Seeder de démo

Données de démonstration (bateau + moteur + voiles + gréement + historique de maintenance) pour initialisation rapide.

---
