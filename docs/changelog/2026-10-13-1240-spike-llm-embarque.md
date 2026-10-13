# 2026-10-13 — Spike : LLM embarqué pour l'assistant en traversée (#972)

Dernière étape de l'épic « Mode traversée » (#949) : peut-on faire tourner un petit modèle de langage dans le navigateur (WebGPU) pour que l'assistant raisonne sans réseau ? Spike documentaire, aucun code applicatif.

- **Rapport.** `docs/architecture/spike-llm-embarque-972.md` : état de WebGPU sur iOS 26, Chrome Android et Firefox, modèles candidats (Llama 3.2 1B/3B, Qwen3 1.7B) avec leur poids, quotas et persistance du stockage Safari, coût réel d'une intégration (outils, garde-fous, CSP, service worker).
- **Recommandation : no-go pour l'instant.** Un modèle de 1 à 3 milliards de paramètres risque d'inventer une procédure moteur, au large, sans moyen de vérifier ; le téléchargement (0,7 à 2,3 Go) et la couverture des appareils restent incertains. Réévaluation en avril 2027 ou sur déclencheur (Prompt API de Chrome sur Android, modèle ≤ 2 B qui passe le jeu de questions).
- **À la place.** Rendre les checklists de diagnostic disponibles hors-ligne via « Préparer la traversée », puis donner à l'assistant hors-ligne le contexte du bateau à partir des pages en cache.
- **Protocole de mesure.** Dix questions nautiques en français, notées par une personne du métier, avec le débit, la batterie et le stockage à relever sur iPhone, iPad et Android milieu de gamme.
