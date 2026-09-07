# 2026-09-07 — Copilote : sources, navigation et consommation affichée (#642)

Dernier lot du copilote élargi : le prompt couvre les trois sources (données, produit, culture nautique), la réponse porte sa source et une cible de navigation, et le panneau affiche la consommation IA du mois.

- **Prompt.** `assistant_prompt_service.ts` réécrit (FR vouvoiement / EN) : appeler un outil avant de répondre sur des données, ne jamais inventer un chiffre, ne décliner que le hors-sujet réel, exemples d'usage d'outils inclus (levier principal de qualité avec `mistral-small-latest`). Plafond de `message` pour `answer` : 600 → 1500 caractères.
- **Contrat.** La forme `answer` gagne `source` (`fleet_data` | `product` | `general`) et `navTarget` — vocabulaire fermé de 20 routes nommées (`ASSISTANT_NAV_TARGETS`, chemin + clé i18n), validé côté serveur ; une valeur inconnue est ignorée plutôt que fatale. Un test unitaire vérifie chaque cible contre le routeur réel et les deux locales.
- **Front.** `AssistantMessage.vue` : badge de source i18n sous la bulle (jamais une phrase du modèle) et lien de navigation rendu en `<Link>`. `AssistantPanel.vue` : pied de consommation `used / limit` (paire de la page de facturation, ajoutée à la prop partagée `assistantConversation` en `aiUsage`), avertissement avec lien `/settings/billing` au-delà de 80 %. Le `tokensUsed` de la conversation reste privé.
- **i18n.** Clés `assistant.sources.*`, `assistant.navTargets.*`, `assistant.usage.*` dans les deux locales.
- **Docs.** `docs/domain/assistant.md` créé ; `docs/domain/ai-token-quota.md` complété (coût par message outillé).
