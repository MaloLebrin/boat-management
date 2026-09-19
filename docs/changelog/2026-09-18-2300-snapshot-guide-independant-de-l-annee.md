# 2026-09-18 — Snapshots marketing : le guide ne casse plus au Nouvel An (#709)

`tests/functional/marketing/props_snapshot.spec.ts` compare les props de chaque page marketing à une
fixture versionnée, par `assert.deepEqual` sur l'objet entier. Le titre SEO de la page guide, lui,
porte l'**année en cours**, interpolée à l'exécution par `MarketingContentService`
(`new Date().getFullYear()`). Les fixtures ayant été générées en 2026, elles figeaient
« Coût d'entretien bateau 2026 » — et `guide.fr` comme `guide.en` seraient passés au rouge le
1ᵉʳ janvier 2027, sur un dépôt que personne n'aurait touché.

Une CI qui casse au Nouvel An, sans commit fautif à incriminer, coûte une demi-journée de recherche à
celui qui tombe dessus. C'est le même défaut que celui déjà corrigé côté e-mails : une fixture ne doit
pas figer ce que l'horloge fait varier.

- **Correctif.** L'année est neutralisée **des deux côtés** de la comparaison, au seul endroit où
  l'horloge intervient — `meta.title` de la page guide —, et remplacée par le jeton `{year}`, choisi
  identique au placeholder ICU de `marketing.json` pour que la fixture se lise comme sa clé de
  traduction. Les deux fixtures du guide portent désormais ce jeton en lieu et place de « 2026 ».
- **Périmètre.** Douze fixtures contiennent « 2026 », **deux seulement** étaient à risque. Les dix
  autres (`about`, `privacy`, `terms`, `salesTerms`, `legalNotice`) tiennent leur millésime d'un texte
  éditorial en dur dans `marketing.json` (« 9 juillet 2026 », « Mai 2026 ») : il ne bouge que si
  quelqu'un l'édite, ce qu'un snapshot doit précisément attraper. Elles ne sont pas touchées.
- **Ce qui reste couvert.** Le reste du titre continue d'être comparé au caractère près. Que l'année
  interpolée soit bien l'année **courante** — et non un millésime refigé en dur, le bug d'origine de
  #476 — reste vérifié par `tests/functional/marketing/guide_seo.spec.ts`, inchangé.
- **Tests.** Deux cas ajoutés (`guide (fr|en) matches a fixture generated in another year`) : la
  fixture y est décalée de cinq ans en mémoire, et la comparaison neutralisée doit continuer de
  passer. C'est le symétrique exact du scénario redouté — fixture figée, horloge avancée — joué sans
  piéger le `Date` global du process, qui casserait Lucid et le client HTTP pour tout le fichier. Les
  deux cas assertent aussi que la fixture décalée **diffère** bien de la réponse brute, pour qu'ils ne
  puissent pas passer en comparant deux objets vidés de leur contenu.
- **Non-vacuité.** Vérifié à la main : une fixture guide remise sur un millésime en dur (« 2031 »)
  laisse les vingt snapshots au vert — ce qui n'était pas le cas avant ce correctif.

Régénérer les fixtures chaque année n'aurait pas été une correction : ça aurait déplacé la panne de
douze mois. Le mécanisme `UPDATE_MARKETING_FIXTURES=1` reste documenté en tête du spec et écrit
désormais le jeton, la neutralisation s'appliquant avant l'écriture comme avant la comparaison.
