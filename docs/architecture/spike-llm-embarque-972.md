# Spike — LLM embarqué sur l'appareil pour l'assistant en traversée (#972)

> Épic #949 « Mode traversée », phase 5. Spike : **aucun code applicatif**. Ce document rassemble ce qui est établi, ce qui reste à mesurer sur appareil, et la recommandation.
>
> Rédigé le 2026-10-13. Les chiffres viennent de sources publiques (liées en fin de document) ; **aucune mesure n'a encore été faite sur iPhone, iPad ou Android** — le protocole du §6 sert à les produire.

## 1. Question posée

Depuis #971, l'assistant hors-ligne répond aux questions sur **le produit** (base de connaissance embarquée) et met de côté les autres. Il ne raisonne pas : pas de diagnostic d'une panne, pas de lecture d'un manuel. Un petit modèle exécuté dans le navigateur (WebGPU) pourrait-il combler ce manque, dans une PWA installée, sur un téléphone en mer pendant 2 à 4 semaines ?

## 2. Recommandation : **no-go pour l'instant**, réévaluation à 6 mois

On ne lance pas de développement. Les raisons tiennent moins à la technique (elle marche, au moins sur desktop) qu'au rapport valeur / risque pour un utilisateur en mer :

1. **Le cas d'usage visé est celui où un petit modèle est le plus dangereux.** Un modèle de 1 à 3 milliards de paramètres en 4 bits invente volontiers une procédure moteur plausible. Une mauvaise réponse sur le circuit carburant ou le refroidissement, au large, sans possibilité de vérifier, coûte plus cher que pas de réponse. Le copilote en ligne est cadré par ses outils et ses playbooks (`docs/domain/assistant.md` §3 et §7) ; un modèle embarqué n'aurait ni l'un ni l'autre sans un chantier dédié (§5).
2. **Le besoin « diagnostic » a déjà une réponse déterministe** : les checklists de diagnostic (`docs/domain/diagnostic.md`, #515, #576) ordonnent les contrôles du moins cher au plus cher, et se cochent par moteur. Elles ne sont simplement **pas encore disponibles hors-ligne** : le pré-chargement « Préparer la traversée » (#967, `inertia/lib/passage_preparation.ts`) n'inclut pas `/diagnostic`. Les y ajouter coûte une poignée de lignes et ne comporte aucun risque d'hallucination.
3. **Le téléchargement est lourd et se fait au port** : 0,7 à 2,3 Go selon le modèle (§4), sur le Wi-Fi de la marina, à refaire si le navigateur évince le cache. Sur iOS, `navigator.storage.persist()` a longtemps répondu `false` (WebKit bug 271401) — exactement le scénario que #952 couvre pour la file, mais qui pèse autrement plus lourd pour un modèle de 2 Go.
4. **La couverture appareil est partielle** : WebGPU est là sur iOS 26 et Chrome Android récent, mais Safari plafonne la taille d'un buffer GPU (256 Mo sur les iPhone anciens) et Firefox Android n'a pas WebGPU. Une fonction qui marche sur la moitié de la flotte de téléphones d'un équipage crée surtout du support.
5. **La qualité en français des modèles ≤ 3 B est l'inconnue principale** et ne se lève qu'en mesurant (§6). Rien de publié ne la chiffre sur un vocabulaire nautique.

### Ce qu'on fait à la place (issues proposées)

| Proposition                                                                                                                                                                                                                                           | Coût  | Valeur en mer                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------ |
| **Ajouter les checklists de diagnostic au pré-chargement traversée** (`/diagnostic`, la checklist globale et les fiches des moteurs du bateau) ; cocher hors-ligne passe par la file (#481).                                                          | Petit | Forte : c'est le « diagnostic de panne » demandé |
| **Contexte bateau hors-ligne pour l'assistant** (laissé « à cadrer » par #971, livré par #982) : répondre localement « prochaine échéance », « heures moteur », « dernier plein » à partir des props des pages déjà en cache. Recherche déterministe. | Moyen | Moyenne                                          |
| **Réévaluer ce spike en avril 2027**, ou plus tôt si un des déclencheurs du §7 tombe.                                                                                                                                                                 | —     | —                                                |

## 3. État des plateformes (octobre 2026)

| Plateforme                                | WebGPU                                                                                                                      | Remarques                                                                                                                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS / iPadOS 26 (Safari, PWA)             | Activé par défaut depuis Safari 26                                                                                          | Non confirmé par une source primaire **dans une PWA installée** : à vérifier (`navigator.gpu` depuis l'écran d'accueil). Plafond de buffer 256 Mo → 993 Mo selon l'appareil. |
| Chrome Android                            | Stable depuis 2025 (Android 12+, Adreno 600+ / Mali-G78+ selon les sources) ; mode compatibilité GLES 3.1 depuis Chrome 146 | Couverture estimée entre 60 et 78 % des utilisateurs Chrome Android — sources secondaires, divergentes.                                                                      |
| Firefox Android                           | Non                                                                                                                         | Repli obligatoire.                                                                                                                                                           |
| Chrome desktop — Prompt API (Gemini Nano) | Modèle fourni par le navigateur, aucun téléchargement à notre charge                                                        | **Desktop uniquement** d'après la documentation Chrome ; non disponible sur Android ni iOS. Hors sujet pour un téléphone en mer, mais à surveiller (§7).                     |

Le repli, quel que soit le cas, existe déjà : c'est le mode hors-ligne de #971 (aide produit locale + questions en attente).

## 4. Modèles candidats

Les tailles sont celles des builds WebLLM `q4f16_1` (poids 4 bits, activations 16 bits). `vram_required_MB` se relit dans `webllm.prebuiltAppConfig.model_list` de la version installée : les valeurs bougent d'une release à l'autre.

| Modèle                | Paramètres | Téléchargement | Mémoire GPU | Intérêt                                                                        |
| --------------------- | ---------- | -------------- | ----------- | ------------------------------------------------------------------------------ |
| Llama 3.2 1B Instruct | 1,2 B      | ~0,7 Go        | ~0,9 Go     | Le seul raisonnablement sûr sur iPhone ; français faible attendu               |
| Qwen3 1.7B            | 1,7 B      | ~1 Go          | à relever   | Multilingue, bon rapport taille / qualité annoncé ; mode « thinking » à couper |
| Llama 3.2 3B Instruct | 3,2 B      | ~2 Go          | ~2,3 Go     | Meilleure qualité, mais hors plafond de buffer des iPhone anciens              |

Un modèle Mistral serait cohérent avec le reste de la stack (le copilote tourne sur `mistral-small-latest`), mais aucun Mistral de moins de 3 B n'est publié en build WebLLM à date.

Débit : le seul chiffre publié comparable est desktop (WebGPU conserve jusqu'à ~85 % du natif sur un M3 Max). **Aucun débit mesuré sur téléphone n'a été trouvé** ; c'est l'objet du protocole.

## 5. Ce qu'un « go » coûterait vraiment

Même avec un modèle qui répond bien, la valeur viendrait de **ses données**, pas du modèle seul :

- **Pas d'outils** : le copilote en ligne lit la flotte via onze outils serveur (`AssistantToolsService`). Embarqué, il faudrait les réécrire sur les props des pages en cache — le chantier « contexte bateau hors-ligne » du §2, qui a de la valeur **sans** LLM.
- **Pas de playbooks ni de garde-fous** : il faudrait embarquer les playbooks (`AssistantPlaybookService`) et un prompt système qui force le renvoi vers les checklists de diagnostic plutôt que d'improviser.
- **CSP** : `config/shield.ts` n'autorise que `'self'` en `connectSrc` et pas `'wasm-unsafe-eval'` en `scriptSrc`. Il faudrait autoriser le CDN des poids (ou les servir nous-mêmes) et l'exécution WebAssembly.
- **Service worker** : le précache ne prend que `**/*.{js,css,…}` ; les poids iraient dans le Cache API ou OPFS gérés par WebLLM, hors manifeste — à exclure explicitement de la purge des caches à l'activation.
- **Stockage** : vérifier que `use_persistent_storage.ts` (#952) a obtenu la persistance **avant** de proposer le téléchargement, et afficher l'espace pris (`refreshStorageEstimate`).

## 6. Protocole de mesure (à faire avant toute réévaluation)

Appareils : un iPhone récent (iOS 26), un iPad, un Android milieu de gamme (Chrome stable). PWA installée **et** onglet navigateur.

1. **Support** : `navigator.gpu` présent ? `requestAdapter()` non nul ? `adapter.limits.maxBufferSize` et `maxStorageBufferBindingSize` relevés.
2. **Chargement** : pour chaque modèle du §4, temps de premier téléchargement, temps de rechargement depuis le cache, plantage ou non (onglet tué par le système).
3. **Débit** : tokens/s en décodage et temps jusqu'au premier token, sur les 10 questions ci-dessous. WebLLM expose les deux via `engine.runtimeStatsText()`.
4. **Batterie et chauffe** : niveau de batterie avant / après la session de 10 questions (écran à luminosité fixe, mode avion), ressenti thermique noté.
5. **Stockage** : `navigator.storage.estimate()` avant / après ; `persist()` puis `persisted()` après redémarrage de la PWA ; le modèle est-il encore là après 7 jours sans ouverture ?
6. **Qualité FR** : chaque réponse notée 0 (faux ou dangereux), 1 (vague), 2 (juste et utile) par une personne qui connaît la mécanique marine. **Un seul 0 sur les questions 1 à 6 suffit à garder le no-go.**

Jeu de questions :

1. Mon hors-bord deux temps démarre puis cale au bout d'une minute. Que vérifier en premier ?
2. L'alarme de température moteur se déclenche sur mon in-bord diesel. Que faire tout de suite ?
3. Il n'y a plus d'eau qui sort du témoin de refroidissement. Est-ce grave ?
4. Comment purger le circuit de gazole après avoir changé le filtre ?
5. La batterie de servitude est à 11,8 V au mouillage. Que conclure ?
6. Je sens une odeur de gaz dans la cabine. Que dois-je faire ?
7. Quelle différence entre une vidange d'embase et une vidange moteur ?
8. Résume-moi les points à contrôler avant une traversée de 3 jours.
9. Comment déclarer un incident dans FleetAi sans réseau ?
10. Quelle est la pression de gonflage normale d'une annexe ? _(question piège : dépend du fabricant — la bonne réponse le dit)_

Script de banc minimal, à lancer dans la console d'une page de test (pas dans l'app) :

```js
const webllm = await import('https://esm.run/@mlc-ai/web-llm')
const engine = await webllm.CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC', {
  initProgressCallback: (p) => console.info(p.text),
})
const reply = await engine.chat.completions.create({
  messages: [{ role: 'user', content: 'Mon hors-bord deux temps démarre puis cale…' }],
})
console.info(reply.choices[0].message.content, await engine.runtimeStatsText())
```

## 7. Déclencheurs de réévaluation

- Un modèle ≤ 2 B obtient 2/2 sur les questions 1 à 6 du protocole.
- La Prompt API de Chrome (modèle fourni par le navigateur, aucun téléchargement) arrive sur Android, ou Apple expose son modèle on-device au web.
- Les utilisateurs du mode traversée réclament le diagnostic **après** que les checklists sont disponibles hors-ligne : c'est le signal que le déterministe ne suffit pas.

Si l'un d'eux tombe, découpage proposé :

1. Moteur embarqué derrière un flag de plan, téléchargement opt-in dans « Préparer la traversée », persistance exigée, CSP et SW adaptés.
2. Contexte local : outils en lecture sur les props en cache (réutilise le chantier « contexte bateau hors-ligne »).
3. Garde-fous : prompt système, renvoi systématique vers les checklists de diagnostic, mention « réponse générée sur l'appareil, non vérifiée ».
4. Mesure : télémétrie anonyme du débit et des plantages, bouton « réponse fausse ».

## Sources

- WebKit — Safari 26 / WebGPU : [News from WWDC25: WebKit in Safari 26 beta](https://discuss.privacyguides.net/t/news-from-wwdc25-webkit-in-safari-26-beta/28226), [WebGPU in iOS 26](https://appdevelopermagazine.com/webgpu-in-ios-26/)
- WebKit — politique de stockage : [Updates to Storage Policy](https://webkit.org/?p=14403), [bug 271401 — `persist()` renvoie `false`](https://bugs.webkit.org/show_bug.cgi?id=271401), [MDN — quotas et éviction](https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- Chrome Android : [Chrome 146 — WebGPU compatibility mode](https://app.cinevva.com/news/2026-03-10-chrome-146-webgpu-compatibility), [WebGPU on mobile](https://abratabia.com/mobile-browser-performance/webgpu-on-mobile.php)
- Chrome Prompt API : [Get started with built-in AI](https://developer.chrome.com/docs/ai/get-started)
- WebLLM : [dépôt mlc-ai/web-llm](https://github.com/mlc-ai/web-llm), [billet MLC (débit WebGPU vs natif)](https://blog.mlc.ai/2024/06/13/webllm-a-high-performance-in-browser-llm-inference-engine), [liste de modèles et VRAM — issue #683](https://github.com/mlc-ai/web-llm/issues/683), [Browser-native LLM inference (plafonds de buffer Safari, taille Llama 3.2 1B)](https://tianpan.co/blog/2026-04-17-browser-native-llm-inference-webgpu)
