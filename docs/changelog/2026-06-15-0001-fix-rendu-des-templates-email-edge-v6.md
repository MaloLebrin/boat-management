# 2026-06-15 — Fix rendu des templates email Edge v6 (#27)

**Correctif — Migration syntaxe templates Edge**

Les directives `@layout`, `@section` et `@end` de Edge v5 n'existent plus en Edge.js v6 et s'affichaient en texte brut dans les emails reçus. Migration des 13 templates email (`resources/views/emails/*.edge`) vers la syntaxe composants Edge v6 : `@component('emails/_layout')` + `@slot('content')` + `@end`. Mise à jour du layout `_layout.edge` : `@!section('content')` → `{{{ await $slots.content() }}}`.
