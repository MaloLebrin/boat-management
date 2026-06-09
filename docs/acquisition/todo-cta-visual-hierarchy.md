# ✅ DONE (2026-06-09) — Hiérarchie visuelle CTA simulateur

## Contexte

Dans `SimulatorResultCard.vue`, le bouton "Recalculer" est stylé comme un bouton secondaire plein (`border-2 border-bone bg-paper px-6 py-4 text-base font-semibold`).
Il a le même poids visuel que la CTA principale dans `SimulatorCtaCard.vue`, ce qui crée une concurrence visuelle non désirée.
Des utilisateurs vont naturellement recalculer au lieu de convertir.

## Objectif

Réduire le poids visuel du bouton "Recalculer" pour que la CTA signup soit visuellement dominante.

---

## Changement

**Fichier** : `inertia/components/marketing/simulator/SimulatorResultCard.vue`

```vue
<!-- avant -->
<button
  type="button"
  class="mt-6 w-full rounded-xl border-2 border-bone bg-paper px-6 py-4 text-base font-semibold text-fg transition-colors hover:border-fg-subtle"
  @click="emit('restart')"
>
  {{ t('simulator.recalculate') }}
</button>

<!-- après -->
<button
  type="button"
  class="mt-4 w-full text-sm text-fg-subtle underline underline-offset-2 hover:text-fg transition-colors"
  @click="emit('restart')"
>
  {{ t('simulator.recalculate') }}
</button>
```

### Effet attendu

- Le bouton "Recalculer" devient un lien texte discret
- La carte CTA (`SimulatorCtaCard`) devient visuellement l'unique action principale après les résultats
- L'action reste accessible mais ne capte plus l'attention en premier

---

## Critères d'acceptance

- [ ] Le bouton "Recalculer" est un lien texte (pas un bouton plein)
- [ ] La CTA signup reste visuellement dominante
- [ ] Le bouton reste fonctionnel (émet `restart`)
- [ ] Pas de régression sur la page simulateur en app (`inertia/pages/boats/simulator.vue`) si elle partage ce composant

---

## Notes

- Vérifier que `SimulatorResultCard` n'est pas partagé avec le simulateur in-app avant d'appliquer — si oui, s'assurer que le comportement reste cohérent dans ce contexte aussi
- Changement purement CSS, aucun impact backend
