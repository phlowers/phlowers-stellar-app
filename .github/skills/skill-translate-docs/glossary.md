# Translation glossary & style rules

Shared by both translation directions (see the table in [SKILL.md](SKILL.md)). Reuse these
translations — don't invent your own. If you add a new term while translating, add it here in
the same PR so the next translation stays consistent.

## General rules

- Keep class names, function names, file names, CLI commands, and URLs unchanged in both
  directions.
- Do not translate common technical/programming terms that are used as-is in French dev
  writing: `framework`, `endpoint`, `plug-in`, `token`, `cookie`, `payload`, `dataset`.
- Headings: prefer the infinitive/nominal form common in the existing docs (`Configurer…`,
  `Utiliser…`) rather than a literal translation of an English gerund/imperative, unless the
  English heading is itself an instruction (e.g. "Go check …" → imperative `Allez voir…`).
- Numbers/units formatting follows the target language's existing convention in the doc tree
  (e.g. French uses a non-breaking space as thousands separator: `5 000 m`).

## French ↔ English domain terms

Each term is only ever translated in one direction in practice (user guide terms FR→EN, dev
guide terms EN→FR), but they're kept in a single table for easier lookup and maintenance.

| French | English |
|---|---|
| portée | span |
| support | pole (support structure) — keep `support` if already used as a UI field label |
| câble | cable |
| chaîne (d'isolateurs) | chain (of insulators) |
| obstacle | obstacle |
| altitude NGF | NGF elevation |
| étiquette | label |
| point de référence / support de référence | reference point / reference pole |
| travée gauche / droite | left / right span |
| réglage | setting / configuration |
| paramétrage | configuration |
| jeu de données | dataset (do not translate to "data set") |
| la requête | the request |
| la réponse | the response |
| claims (OIDC) | claims (keep, do not translate) |
| session | session |
| incohérence de session | session mismatch |
| redirection | redirect |
| connexion | sign-in / login |
| endpoint | endpoint (do not translate) |
| Service Worker (keep capitalized) | service worker |
| hors ligne / offline-first (keep compound term) | offline-first |
| cache / mis en cache | cache / cached |
| déploiement | deployment |
| déprécier / déprécié | to deprecate / deprecated |
| espace de travail | workspace |
| guard (keep as code concept) | guard (Angular route guard) |
| intercepteur | interceptor |

## Quotes & typography (English → French only)

- Convert neutral double quotes (`"`) to French guillemets (`«` and `»`) outside code.
- Add a non-breaking space before `:`, `;`, `!`, `?` when the surrounding French text already
  follows that convention (check the existing target file first).
- Never touch quotes or spacing inside code blocks, inline code, paths, or URLs.

## Quotes & typography (French → English only)

- Convert `«`/`»` guillemets back to neutral double quotes (`"`).
- Remove the non-breaking space before `:`, `;`, `!`, `?`.
