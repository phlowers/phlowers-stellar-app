# Plugins d'outils

Stellar peut être étendu par des **plugins d'outils** : de petits outils autonomes, ouverts dans une popin depuis la page **Outils** de l'accueil et/ou le menu **Outils** du studio. Les plugins vivent en dehors du code de l'application et ne communiquent avec Stellar qu'à travers une façade en lecture seule, la `StellarPluginApi`.

---

## Architecture

```
src/app/shared/plugin/                       ← contrat public + hôte (côté application)
  stellar-plugin.ts                          ← barrel : les plugins n'importent que d'ici
  stellar-plugin.interfaces.ts               ← StellarPluginManifest, StellarPluginApi, ...
  stellar-plugin.constantes.ts               ← STELLAR_PLUGINS, STELLAR_PLUGIN_API, version d'API
  stellar-plugin.helpers.ts                  ← provideStellarPlugin, validation, règles de placement
  stellar-plugins.providers.ts               ← liste finale des plugins (seul fichier de l'app important @plugins)
  stellar-plugin-registry.service.ts         ← plugins validés avec titres traduits
  stellar-plugin-api.service.ts              ← construit la façade fournie à chaque plugin
  plugin-dialog.service.ts                   ← plugin actif / visibilité de la popin
  components/plugin-dialog/                  ← popin chargeant le composant du plugin à la demande

src/plugins/                                 ← plugins, un dossier chacun
  stellar-plugins.config.ts                  ← plugins activés dans ce build, dans l'ordre du menu
  hello-world/                               ← exemple de référence
```

Fonctionnement :

1. `stellar-plugins.config.ts` enregistre les manifests dans le multi-provider `STELLAR_PLUGINS` (providers racine).
2. `StellarPluginRegistryService` écarte les manifests invalides (avec log), puis résout le titre et la description de chaque plugin depuis son scope Transloco.
3. La page d'accueil liste les plugins `home` sous forme de cartes ; le studio ajoute les plugins `studio` à la fin de son menu **Outils**.
4. Au clic, `PluginDialogService.open()` affiche `<app-plugin-dialog>`, qui appelle `loadComponent()` (chunk lazy séparé) et affiche le composant avec sa propre `STELLAR_PLUGIN_API`.

---

## Le contrat

```typescript
interface StellarPluginManifest {
  readonly id: string;                                   // id unique en kebab-case
  readonly apiVersion: number;                           // STELLAR_PLUGIN_API_VERSION
  readonly placements: readonly ('home' | 'studio')[];
  readonly i18nScope: ProviderScope;                     // loader Transloco inline (en, fr)
  readonly titleKey: string;                             // clé dans le scope, sans préfixe
  readonly descriptionKey: string;
  readonly requiresSection?: boolean;                    // studio uniquement, désactivé sans canton
  readonly accentColor?: string;                         // accent de la carte d'accueil (token)
  readonly dialogStyle?: Readonly<Record<string, string>>;
  readonly loadComponent: () => Promise<Type<unknown>>;
}

interface StellarPluginApi {
  readonly apiVersion: number;
  readonly section: Signal<DeepReadonly<Section> | null>;  // null hors du studio
  readonly study: Signal<DeepReadonly<Study> | null>;      // null hors du studio
  readonly activeLang: Signal<string>;
  readonly notify: { success; info; warning; error };      // toasts (detail, summary?)
  readonly log: { info; warn; error };                     // préfixés par [plugin:<id>]
  close(): void;                                           // ferme la popin du plugin
}
```

- Un manifest est rejeté (et logué) si son id n'est pas en kebab-case ou est déjà utilisé, si son `apiVersion` diffère de `STELLAR_PLUGIN_API_VERSION`, ou s'il ne déclare aucun placement. Les autres plugins continuent de fonctionner.
- `requiresSection: true` masque le plugin sur la page d'accueil et le désactive dans le studio tant qu'aucun canton n'est chargé.
- `section` et `study` sont des copies profondément gelées : l'API est **en lecture seule** dans cette version. Un plugin ne peut ni modifier les données de l'application, ni lancer de tâches du moteur Python.

---

## Écrire un plugin

1. Créer `src/plugins/<plugin-id>/`, en partant de `src/plugins/hello-world/` :

   ```
   src/plugins/<plugin-id>/
     <plugin-id>.plugin.ts          ← manifest
     <plugin-id>.component.ts|html|scss
     <plugin-id>.constantes.ts      ← id, scope Transloco, clés i18n
     <plugin-id>.helpers.ts         ← fonctions pures (optionnel)
     <plugin-id>.interfaces.ts      ← types (optionnel)
     i18n/en.json, i18n/fr.json     ← textes du plugin, titre et description compris
     *.spec.ts                      ← tests
   ```

2. Déclarer le scope Transloco avec un loader inline, pour que les textes partent avec le plugin :

   ```typescript
   export const MY_TOOL_TRANSLOCO_SCOPE: ProviderScope = {
     scope: 'my-tool',
     loader: {
       en: () => import('./i18n/en.json').then((module) => module.default),
       fr: () => import('./i18n/fr.json').then((module) => module.default)
     }
   };
   ```

3. Écrire le manifest :

   ```typescript
   export const MY_TOOL_PLUGIN: StellarPluginManifest = {
     id: 'my-tool',
     apiVersion: STELLAR_PLUGIN_API_VERSION,
     placements: ['studio'],
     requiresSection: true,
     i18nScope: MY_TOOL_TRANSLOCO_SCOPE,
     titleKey: 'title',
     descriptionKey: 'description',
     loadComponent: () => import('./my-tool.component').then((module) => module.MyToolComponent)
   };
   ```

4. Écrire un composant standalone `OnPush`, qui fournit le scope et injecte la façade :

   ```typescript
   @Component({
     selector: 'app-my-tool-plugin',
     imports: [TranslocoPipe],
     providers: [provideTranslocoScope(MY_TOOL_TRANSLOCO_SCOPE)],
     templateUrl: './my-tool.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush
   })
   export class MyToolComponent {
     readonly api = inject(STELLAR_PLUGIN_API);
     readonly supportCount = computed(() => this.api.section()?.supports.length ?? 0);
   }
   ```

   Dans les templates, les clés du scope sont préfixées par le nom du scope en camelCase : `{{ 'myTool.greeting' | transloco }}`.

5. L'activer dans `src/plugins/stellar-plugins.config.ts` :

   ```typescript
   export const ENABLED_STELLAR_PLUGIN_PROVIDERS: Provider[] = [
     ...provideStellarPlugin(HELLO_WORLD_PLUGIN),
     ...provideStellarPlugin(MY_TOOL_PLUGIN)
   ];
   ```

   Supprimer la ligne désactive le plugin : il disparaît de tous les menus et du bundle.

---

## Frontières (ESLint)

- `src/plugins/**` ne doit pas importer `@app`, `@core`, `@services`, `@features`, `@infrastructure` ni `@adapters`. Utiliser `@shared/plugin/stellar-plugin` pour le contrat ; le reste de `@shared` (atomes d'UI comme `app-btn`, modèles du domaine) est autorisé.
- `src/app/**` et `src/adapters/**` ne doivent pas importer `@plugins`, sauf `src/app/shared/plugin/stellar-plugins.providers.ts` et les specs.

---

## Tests

Les specs d'un plugin sont placées à côté du plugin et mockent la façade :

```typescript
TestBed.configureTestingModule({
  imports: [
    TranslocoTestingModule.forRoot({
      langs: { en: {}, 'my-tool/en': en },        // traductions du scope
      translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      preloadLangs: true
    }),
    MyToolComponent
  ],
  providers: [{ provide: STELLAR_PLUGIN_API, useValue: fakeApi }]
});
```

Tester aussi le manifest (id, version d'API, placements, `loadComponent`, parité i18n entre `en.json` et `fr.json`). Voir `src/plugins/hello-world/*.spec.ts`.
