# 2026-09-07 — Copilote : playbooks d'expert par domaine

Plutôt qu'un prompt monolithique, le copilote charge dynamiquement jusqu'à **deux playbooks** d'expertise par tour, selon la question et la page courante : maintenance, navigation et carburant, location et clients (module commercial requis), sécurité Division 240, ports et mouillages (plan Ports requis), plans et réglages FleetAi.

## Fonctionnement

- `shared/constants/assistant/playbooks.ts` : six blocs FR/EN (~800 caractères max par locale), mots-clés normalisés (minuscules, sans accents), préfixes de pages, flag de plan optionnel.
- `app/services/assistant_playbook_service.ts` : sélection **déterministe** — même barème que la base de connaissance produit (mots-clés ×5, titre ×3, corps ×1) sur le message courant, bonus fixe (+10) quand la page courante appartient au domaine, filtre par quotas effectifs, tri stable, score nul exclu.
- Injection dans le prompt système sous « Repères d'expert pour cette demande : » (section absente quand rien n'est retenu) — coût plafonné à ~400 tokens.

Les quotas effectifs sont calculés une seule fois par tour et partagés entre les outils, les actions et les playbooks.
