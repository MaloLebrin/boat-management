# 2026-09-18 — Un seul endroit décide du refus de quota

**Date** : 2026-09-18 — dernier reste annoncé par le changelog de la garde de
module unique (« les `catch (QuotaExceededError)` des autres contrôleurs ne
sont pas redondants au sens strict — clés de flash différentes du handler,
cibles de redirection spécifiques. À traiter avec les domaines concernés »).

## Problème

Vingt-six `instanceof QuotaExceededError` étaient répartis dans quinze
fichiers. La note de l'époque avait raison de ne pas les toucher en bloc, mais
la cause qu'elle décrivait — « clés différentes du handler » — était un bug,
pas une divergence légitime.

Le handler global construisait `flash.quota.${error.feature}Exceeded`. Pour la
feature `ai_tokens`, cela donne `flash.quota.ai_tokensExceeded`, **qui n'existe
dans aucune locale** : la clé traduite s'appelle `aiTokensExceeded`. Chaque
contrôleur de l'IA contournait donc le handler en écrivant la clé à la main.

Second effet, mesuré par les tests : douze de ces `catch` flashaient le bon
message mais **perdaient `errorAction`**, l'action « Voir les offres » vers
`/settings/billing` que le handler ajoute depuis #418. Cinq routes — chat IA,
export CSV, les deux PDF de maintenance, périodes tarifaires — refusaient donc
l'accès sans proposer de porte de sortie.

## Correctif

- **`quotaFlashKey(error)`** dans `app/exceptions/quota_errors.ts` : la seule
  fonction qui décide d'un message de quota. Elle convertit le `snake_case` de
  la feature (`ai_tokens` → `aiTokens`) et porte le cas du stockage déjà
  dépassé (`storageOverflow`). Le handler l'utilise.
- **Quinze `catch` retirés** — ceux qui reproduisaient le handler :
  `ai_controller` (×5), `csv_export_controller` (×4), les deux contrôleurs de
  PDF de maintenance, `boat_pricing_controller`, `boats_controller`,
  `organization_members_controller`, `organization_invitations_controller`.
  L'erreur remonte au handler, qui flashe le même message **et** l'upsell.
- **Six sites conservés**, parce qu'ils font autre chose : rediriger ailleurs
  (`client_media_controller` vers la facturation, `spare_part_chat_controller`
  vers la fiche pièces) ou flasher sans rediriger, la méthode choisissant
  ensuite sa destination (`ai_controller`, `assistant_controller`,
  `public_diagnosis_controller`, `public_part_search_controller`). Tous lisent
  désormais leur clé via `quotaFlashKey`, y compris les deux qui faisaient un
  ternaire `feature === 'ai' ? … : …`.
- Les middlewares de plan (`require_module_plan`, `require_ports_plan`) sont
  inchangés : ils gardent l'entrée d'une page et redirigent vers la
  facturation, et leurs features (`clients`, `invoices`, `pricing`,
  `reservations`) sont toutes en un mot.

## Comportement changé

Cinq routes ajoutent l'action « Voir les offres » à leur refus : `POST
/ai/chat`, `GET /boats/:id/export/*.csv`, `GET /boats/:id/maintenance-log.pdf`,
`GET /maintenance/history.pdf`, `PUT /boats/:id/pricing`. **Les messages sont
identiques** — les tests de caractérisation l'assertent phrase par phrase.

## Tests

- `tests/functional/quota/quota_flash_source.spec.ts` (nouveau, 6 tests) :
  chaque route refusée sur un plan `starter`, message exact et présence de
  `errorAction`. Committé d'abord avec `assertFlashMissing('errorAction')`,
  l'état constaté, puis retourné par le correctif.
- `tests/unit/exceptions/quota_flash_key.spec.ts` (nouveau, 4 tests) : le
  mapping `snake_case` → clé camelCase, le cas `storageOverflow`, et surtout
  que **les onze features résolvent dans les deux locales** — le test qui
  aurait attrapé `ai_tokensExceeded`.
- Quatre shards rejoués : `functional-boats` 554, `functional-core` 460,
  `functional-other` 411, `unit`+`integration` 920.
