# Adaptateurs d'import de canton

L'import de canton est indépendant du format. Chaque format de fichier est géré par un **adaptateur d'import de canton** ; le pipeline du cœur fait tout le reste (collision, validation, reprojection des coordonnées, persistance, notifications).

Cette page complète le [pipeline d'import générique](generic_import_pipeline.md).

---

## Architecture

```
src/app/shared/import/section-adapter/       ← contrat public + composition du cœur
  section-import-adapter.ts                  ← barrel : importer depuis ce fichier
  section-import-adapter.interfaces.ts       ← SectionImportAdapter, SectionImportPayload, ...
  section-import-adapters.providers.ts       ← liste finale des adaptateurs (stellar_json + optionnels)

src/adapters/section-import/                 ← adaptateurs, un dossier chacun
  section-import-adapters.config.ts          ← adaptateurs optionnels activés dans ce build
  stellar-json/                              ← adaptateur par défaut (obligatoire, exemple de référence)
  rte-custom/                                ← format canton RTE optionnel

src/app/features/study/application/services/
  section-import.service.ts                  ← orchestrateur (ImportAdapter<Section>)
```

L'orchestrateur lit le fichier une seule fois, choisit le premier adaptateur (dans l'ordre du registre) dont les extensions contiennent celle du fichier et dont `canHandle` renvoie `true`, puis exécute :

1. `adapter.import(source)` — analyse, validation de son propre format, conversion en `Section`.
2. Validation par le cœur de la `Section` obtenue (champs requis, bornes des supports), pour tous les adaptateurs.
3. Correction par les catalogues, si l'adaptateur a défini `applyCatalogCorrections` : identifiants de maintenance, tension, accroches et chaînes sont corrigés avec les catalogues locaux (un service de correction par catalogue dans `src/app/features/study/application/services/catalog-correction/`), puis les nouveaux noms de supports sont ajoutés au catalogue des accroches. Une entrée absente du catalogue des accroches lève un avertissement.
4. Reprojection des coordonnées, si l'adaptateur a renvoyé `coordinates`.
5. Contrôle de collision et persistance, puis notifications (succès, information de reprojection, notices de l'adaptateur et des catalogues).

---

## Le contrat

```typescript
interface SectionImportAdapter {
  readonly id: string;                       // identifiant snake_case unique
  readonly formatLabel: string;              // affiché dans l'indication de dépôt
  readonly extensions: readonly string[];    // minuscules, avec le point
  readonly mimeTypes?: readonly string[];
  canHandle(source: SectionImportSource): boolean;          // rapide, synchrone, ne lève jamais d'erreur
  extractUuid(source: SectionImportSource): string | null;  // contrôle de collision, ne lève jamais d'erreur
  import(source: SectionImportSource): Promise<SectionImportPayload>;
}

interface SectionImportPayload {
  section: Section;
  coordinates?: { crs: 'LAMBERT93' | 'WGS84'; x: (number | null)[]; y: (number | null)[] };
  notices?: { severity: 'info' | 'warning'; message: string }[];
  applyCatalogCorrections?: boolean;         // false par défaut
}
```

- `source` contient `fileName`, le `text` décodé et le `json` analysé (`undefined` si le texte n'est pas du JSON valide).
- `coordinates` contient une entrée `x`/`y` par support, dans l'ordre des supports.
  - `LAMBERT93` : est/nord en mètres. Le cœur les reprojette en GPS, renseigne `footLatitude`/`footLongitude`, le point de départ du canton et l'erreur moyenne de reprojection.
  - `WGS84` : `x` est la longitude et `y` la latitude, en degrés ; appliquées telles quelles.
  - Une entrée `null` ignore la reprojection sans bloquer l'import.
- `notices.message` doit déjà être traduit.
- `applyCatalogCorrections: true` demande au cœur de corriger le canton converti avec les catalogues locaux. L'adaptateur se limite à la conversion et doit renseigner les clés de recherche dans la `Section` : `cm_designation`, `eel_designation`, `gmr_designation`, `voltage_idr`/`voltage_adr` et, par support, `name`, `attachmentSet`, `chainName`, `towerModel` (ex. `rte_custom`).

### Erreurs

`import()` doit rejeter avec un objet de forme `ImportError` : `{ code, message, stage }`. Construire le code avec `adapterErrorCode('MON_ADAPTATEUR_RAISON')` et traduire le message dans l'adaptateur. Le cœur transmet ces erreurs telles quelles ; toute autre valeur levée est encapsulée dans une `MAPPING_ERROR` générique.

---

## Activer et désactiver des adaptateurs

- `stellar_json` est l'adaptateur par défaut et est **toujours** enregistré par le cœur. Il ne peut pas être retiré via la configuration.
- Les adaptateurs optionnels sont listés dans `src/adapters/section-import/section-import-adapters.config.ts` :

```typescript
export const OPTIONAL_SECTION_IMPORT_ADAPTER_PROVIDERS: Provider[] = [
  ...provideSectionImportAdapter(RteCustomAdapter)
];
```

L'ordre compte : le premier adaptateur qui reconnaît le contenu l'emporte. Un adaptateur non importé dans ce fichier n'est pas embarqué dans le build.

Une règle de lint interdit d'importer `@adapters/*` depuis `src/app/**` (sauf le fichier de composition) et d'importer `@features/*` depuis `src/adapters/**`.

---

## Écrire un adaptateur

1. Créer `src/adapters/section-import/<nom>/` avec une classe `*.adapter.ts` (`@Injectable()`, sans `providedIn`) qui implémente `SectionImportAdapter`.
2. Garder interfaces, constantes et fonctions pures dans des fichiers co-localisés `*.interfaces.ts`, `*.constantes.ts` et `*.helpers.ts`, avec leurs specs et fixtures.
3. Livrer les textes propres à l'adaptateur sous forme de scope Transloco dans le dossier (`i18n/en.json`, `i18n/fr.json`) et les résoudre avec `selectTranslate(clé, params, scope)`, afin qu'ils disparaissent avec l'adaptateur.
4. L'enregistrer dans `section-import-adapters.config.ts`.

`stellar-json/` est l'implémentation de référence.

---

## Format par défaut : `.stsec`

L'export de canton écrit `<nom du canton>.stsec`, une enveloppe JSON relue par l'adaptateur `stellar_json` :

```json
{
  "format": "stellar-section",
  "version": 1,
  "section": { "uuid": "...", "name": "...", "supports": [] },
  "coordinates": { "crs": "WGS84", "x": [], "y": [] }
}
```

- `coordinates` est optionnel (même signification que dans le payload).
- Une `version` supérieure à celle prise en charge est rejetée avec une erreur dédiée.
- Par rétrocompatibilité, un `Section` brut sérialisé dans un fichier `.json` reste accepté.
- L'export est disponible depuis le tableau des cantons et depuis la barre d'outils du studio.
