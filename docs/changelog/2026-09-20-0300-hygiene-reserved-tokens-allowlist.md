# `reservedTokens` inscrite dans l'allowlist du garde d'hygiène

**Date** : 20 septembre 2026
**Suite de** : #782 (garde) et #776 (colonne)

## Contexte

`main` est rouge sur
`tests/unit/hygiene/secret_model_columns.spec.ts`. Aucune des deux PR n'est
fautive prise isolément : c'est leur **rencontre** qui casse.

- #782 a posé un garde qui prend la question à l'envers : toute colonne dont
  le nom évoque un secret doit être masquée à la sérialisation, sauf
  inscription motivée dans `NOT_A_SECRET`.
- #776 a ajouté `ai_token_usages.reserved_tokens` pour rendre le quota de
  tokens IA atomique.

`reservedTokens` contient le mot « tokens », le lexique l'attrape, et elle
n'était ni masquée ni inscrite. Les deux PR étaient vertes séparément — la
CI ne teste pas la combinaison avant le merge.

## Ce qui change

Une ligne dans `NOT_A_SECRET`, avec sa raison, à côté de sa jumelle
`ai_token_usage.tokensUsed` déjà inscrite.

Le choix est celui que la doc du garde demande explicitement de faire plutôt
que d'inscrire machinalement : **cette colonne n'est pas un secret**. C'est un
compteur de tokens réservés pour un appel IA en vol, de la même nature que
`tokensUsed`. La masquer à la sérialisation serait le mauvais geste — elle n'a
rien d'une créance, et rien ne justifie de la cacher d'un client qui aurait
légitimement besoin de connaître sa consommation.

## Vérification

Le garde reste porteur : en retirant l'entrée, le test retombe en rouge sur
cette seule colonne.
