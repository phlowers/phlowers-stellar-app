# Tool Plugins

Stellar can be extended with **tool plugins**: small, self-contained tools opened in a dialog from the home **Tools** page and/or the studio **Tools** menu. Plugins live outside the application code and only talk to Stellar through a read-only facade, the `StellarPluginApi`.

---

## Architecture

```
src/app/shared/plugin/                       ← public contract + host (application side)
  stellar-plugin.ts                          ← barrel: plugins import only from here
  stellar-plugin.interfaces.ts               ← StellarPluginManifest, StellarPluginApi, ...
  stellar-plugin.constantes.ts               ← STELLAR_PLUGINS, STELLAR_PLUGIN_API, API version
  stellar-plugin.helpers.ts                  ← provideStellarPlugin, validation, placement rules
  stellar-plugins.providers.ts               ← final plugin list (only app file importing @plugins)
  stellar-plugin-registry.service.ts         ← validated plugins with translated titles
  stellar-plugin-api.service.ts              ← builds the facade handed to each plugin
  plugin-dialog.service.ts                   ← active plugin / dialog visibility
  components/plugin-dialog/                  ← dialog lazily loading the plugin component

src/plugins/                                 ← plugins, one folder each
  stellar-plugins.config.ts                  ← plugins enabled in this build, in menu order
  hello-world/                               ← reference example
```

Flow:

1. `stellar-plugins.config.ts` registers manifests in the `STELLAR_PLUGINS` multi-provider (root providers).
2. `StellarPluginRegistryService` drops invalid manifests (logged), then resolves each title and description from the plugin Transloco scope.
3. The home page lists the `home` plugins as cards; the studio appends the `studio` plugins to its **Tools** menu.
4. On click, `PluginDialogService.open()` shows `<app-plugin-dialog>`, which calls `loadComponent()` (separate lazy chunk) and renders the component with its own `STELLAR_PLUGIN_API`.

---

## The contract

```typescript
interface StellarPluginManifest {
  readonly id: string;                                   // unique kebab-case id
  readonly apiVersion: number;                           // STELLAR_PLUGIN_API_VERSION
  readonly placements: readonly ('home' | 'studio')[];
  readonly i18nScope: ProviderScope;                     // inline Transloco loader (en, fr)
  readonly titleKey: string;                             // key inside the scope, no prefix
  readonly descriptionKey: string;
  readonly requiresSection?: boolean;                    // studio only, disabled without section
  readonly accentColor?: string;                         // home card accent (design token)
  readonly dialogStyle?: Readonly<Record<string, string>>;
  readonly loadComponent: () => Promise<Type<unknown>>;
}

interface StellarPluginApi {
  readonly apiVersion: number;
  readonly section: Signal<DeepReadonly<Section> | null>;  // null outside the studio
  readonly study: Signal<DeepReadonly<Study> | null>;      // null outside the studio
  readonly activeLang: Signal<string>;
  readonly notify: { success; info; warning; error };      // (detail, summary?) toasts
  readonly log: { info; warn; error };                     // prefixed with [plugin:<id>]
  close(): void;                                           // closes the plugin dialog
}
```

- A manifest is rejected (and logged) when its id is not kebab-case or already used, its `apiVersion` differs from `STELLAR_PLUGIN_API_VERSION`, or it declares no placement. Other plugins keep working.
- `requiresSection: true` hides the plugin from the home page and disables it in the studio until a section is loaded.
- `section` and `study` are deep-frozen copies: the API is **read-only** in this version. A plugin cannot modify application data, nor run Python engine tasks.

---

## Writing a plugin

1. Create `src/plugins/<plugin-id>/`, using `src/plugins/hello-world/` as a template:

   ```
   src/plugins/<plugin-id>/
     <plugin-id>.plugin.ts          ← manifest
     <plugin-id>.component.ts|html|scss
     <plugin-id>.constantes.ts      ← id, Transloco scope, i18n keys
     <plugin-id>.helpers.ts         ← pure functions (optional)
     <plugin-id>.interfaces.ts      ← types (optional)
     i18n/en.json, i18n/fr.json     ← plugin texts, including title and description
     *.spec.ts                      ← tests
   ```

2. Declare the Transloco scope with an inline loader, so the texts leave with the plugin:

   ```typescript
   export const MY_TOOL_TRANSLOCO_SCOPE: ProviderScope = {
     scope: 'my-tool',
     loader: {
       en: () => import('./i18n/en.json').then((module) => module.default),
       fr: () => import('./i18n/fr.json').then((module) => module.default)
     }
   };
   ```

3. Write the manifest:

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

4. Write a standalone `OnPush` component. Provide the scope and inject the facade:

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

   In templates, scope keys are prefixed with the camelCased scope name: `{{ 'myTool.greeting' | transloco }}`.

5. Enable it in `src/plugins/stellar-plugins.config.ts`:

   ```typescript
   export const ENABLED_STELLAR_PLUGIN_PROVIDERS: Provider[] = [
     ...provideStellarPlugin(HELLO_WORLD_PLUGIN),
     ...provideStellarPlugin(MY_TOOL_PLUGIN)
   ];
   ```

   Remove the line to disable the plugin: it disappears from every menu and from the bundle.

---

## Boundaries (ESLint)

- `src/plugins/**` must not import `@app`, `@core`, `@services`, `@features`, `@infrastructure` or `@adapters`. Use `@shared/plugin/stellar-plugin` for the contract; other `@shared` code (UI atoms such as `app-btn`, domain models) is allowed.
- `src/app/**` and `src/adapters/**` must not import `@plugins`, except `src/app/shared/plugin/stellar-plugins.providers.ts` and specs.

---

## Tests

Plugin specs sit next to the plugin and mock the facade:

```typescript
TestBed.configureTestingModule({
  imports: [
    TranslocoTestingModule.forRoot({
      langs: { en: {}, 'my-tool/en': en },        // scope translations
      translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      preloadLangs: true
    }),
    MyToolComponent
  ],
  providers: [{ provide: STELLAR_PLUGIN_API, useValue: fakeApi }]
});
```

Also test the manifest (id, API version, placements, `loadComponent`, i18n parity between `en.json` and `fr.json`). See `src/plugins/hello-world/*.spec.ts`.
