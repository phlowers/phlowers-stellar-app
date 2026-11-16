# Format brut des dates (RFC 9557)

Toute date brute écrite par l'application (horodatages enregistrés, fichiers exportés, export JSON d'une mesure de terrain) utilise **RFC 9557**, l'extension d'ISO 8601 / RFC 3339 qui ajoute le nom du fuseau horaire :

```
2026-11-06T16:46:15.869+01:00[Europe/Paris]
AAAA-MM-JJTHH:mm:ss.SSS±HH:MM[Fuseau]
```

- `±HH:MM` est le décalage par rapport à UTC **en vigueur à cet instant**, heure d'été/hiver comprise (`+01:00` en hiver, `+02:00` en été pour `Europe/Paris`).
- `[Fuseau]` est le nom du fuseau IANA, lu dans `environment.timeZone`.

Seul le format **brut** change. Les dates **affichées** (pipe `date`, `toLocaleDateString`, rapports PDF, « il y a ... ») gardent leurs propres formats.

## Fuseau horaire

Le fuseau est une valeur unique, `timeZone`, dans `src/environments/environment.ts` et `environment.development.ts` (par défaut `Europe/Paris`). Pour le changer, modifier cette valeur et reconstruire ; aucun autre code ne change. Une valeur absente ou invalide retombe sur `Europe/Paris` (`DEFAULT_TIME_ZONE`).

Le fuseau s'applique à l'**instant** : le moment exact est conservé et écrit à l'heure locale et au décalage du fuseau. Un navigateur réglé sur un autre fuseau écrit le même instant à l'heure du fuseau configuré.

## Helpers

Tous dans `src/app/shared/helpers/date-time.helpers.ts` :

| Helper | Rôle |
|---|---|
| `formatRfc9557(date, timeZone?)` | Écrit une `Date` en RFC 9557 dans le fuseau configuré |
| `formatRfc9557OrNull(date)` | Idem, `null` pour une date absente ou invalide |
| `nowRfc9557()` | Instant courant, utilisé pour `created_at`, `updated_at`, `created_at_offline`, `updated_at_offline` et les horodatages du catalogue |
| `parseRfc9557(value)` | Lit une chaîne RFC 9557, une chaîne ISO 8601 ancienne (`...Z`), un timestamp ou une `Date` ; `null` si illisible |
| `compareRfc9557(a, b, order?)` | Compare deux dates brutes **par instant** ; les valeurs illisibles en dernier |

## Règles

- **En mémoire, les dates restent des objets `Date`** (`date` et `time` d'une mesure de terrain, données envoyées au worker Python). Seules les chaînes écrites en stockage ou dans un fichier sont en RFC 9557.
- **Ne jamais lire une date brute avec `new Date(valeur)` ni avec le pipe `date` directement** : aucun n'accepte le suffixe `[Fuseau]`. Utiliser `parseRfc9557`, ou le pipe `rfc9557ToDate` dans les templates (`{{ valeur | rfc9557ToDate | date: format }}`).
- **Ne jamais trier des dates brutes comme du texte** : les décalages diffèrent (`+01:00` / `+02:00`) et les anciennes valeurs se terminent par `Z`. Utiliser `compareRfc9557`.
- **Exports** : `serializeFieldMeasureDates` / `serializeSectionDates` (`field-measure.helpers.ts`) écrivent les champs `Date` des mesures de terrain pour les fichiers `.stsec`, `.stsd` et `.clst`. `normalizeFieldMeasureDates` les relit.
- **Anciennes données** : rien n'est migré. Une étude ou un canton enregistré avant ce format garde son horodatage `...Z` jusqu'à sa prochaine mise à jour ; il reste lu, trié et affiché correctement.

## Lire un fichier depuis Python

`datetime.fromisoformat` n'accepte pas le suffixe `[Fuseau]`. Le retirer d'abord :

```python
from datetime import datetime
import re

valeur = "2026-11-06T16:46:15.869+01:00[Europe/Paris]"
instant = datetime.fromisoformat(re.sub(r"\[[^\]]*\]$", "", valeur))
```
