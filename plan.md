# Plan: Import Section — GeoLiaison Mapper + Edit + reset import

**Objectif:** deux niveaux de travail complémentaires :
1. **Mapper GeoLiaison** : le `SectionImportService` doit comprendre le format canton JSON extrait du patrimoine (structure `cantons > general + portee unitaire`) et le mapper vers le modèle `Section` / `Support` stocké en IndexedDB.
2. **UX Edit/reset** : même fonctionnement que Study pour le flux d'import, avec les spécificités Section : action Edit à la place de Open, et reset du contenu importé dès le passage en mode edit.

**Décisions arrêtées**
- Action succès = bouton Edit (pas de navigation routée comme Study)
- La modale reste ouverte après import réussi (pour permettre d'appuyer Edit)
- Clic Edit → reset import + close + reopen en mode edit
- Study ne régresse pas (Open via `navigationRoute` inchangé)
- `appartenance[0]` : toujours prendre la première entrée du tableau pour `lit_code`, `lit_name`, `branch_idr`, `voltage_idr`
- CM/EEL/GMR : données dans `portee unitaire` (plusieurs portées possibles) — on retient uniquement les valeurs de la **première portée** (après tri par `PORTEE_UNITAIRE_ORDRE`)
- `cable_name` : `CABLE_IDR` est **hors mapping US** (marqué n/a dans le contrat d'interface) — `cable_name` reste vide (`createEmptySection()`) et sera saisi par l'utilisateur en mode edit

---

## ✅ Phase 0 — Extension modèle `Support` *(terminée)*

**Fichiers:**
- `src/app/shared/domain/models/support.model.ts`
- `src/app/shared/domain/helpers/sections.helpers.ts`

Le format GeoLiaison contient 3 champs de localisation non encore présents dans l'interface `Support` :

| Champ JSON GeoLiaison | Champ `Support` à créer | Type |
|---|---|---|
| `PORTEE_AZIMUT` | `spanAzimut` | `number \| null` |
| `PIED_X_LAMBERT93` | `x_foot_lambert93` | `number \| null` |
| `PIED_Y_LAMBERT93` | `y_foot_lambert93` | `number \| null` |

- Ajouter ces 3 champs à l'interface `Support`.
- Les initialiser à `null` dans `createEmptySupport()`.
- Ces champs sont transparents pour les formulaires existants (non affichés, non validés).

**Vérification de phase:** ✅ compilation TypeScript sans erreur, `createEmptySupport()` retourne les nouveaux champs.

---

## ✅ Phase 0b — GeoLiaison Mapper dans `SectionImportService` *(terminée)*

**Fichier:** `src/app/features/study/application/services/section-import.service.ts`

### Détection du format

Ajouter une méthode `isGeoLiaisonFormat(raw: unknown): boolean` qui vérifie la présence de `cantons[0].general.CANTON_CUR`. Si vrai → mapper GeoLiaison. Sinon → fallback spread actuel (rétrocompatibilité format Section JSON direct).

### Fix `checkCollision()`

Quand format GeoLiaison : lire `cantons[0].general.CANTON_CUR` comme UUID au lieu de `raw.uuid`.

### Mapper `mapGeoLiaisonToSection(raw)`

**Depuis `cantons[0].general` :**

| Champ JSON | Champ `Section` | Note |
|---|---|---|
| `CANTON_CUR` | `uuid` | |
| `CABLE_ADR` | `name` | Nom du canton |
| `CANTON_TYPE` | `type` | Ex: `"PHASE"` |
| `FAISCEAU_CABLES_NOMBRE` | `cables_amount` | `parseFloat` |
| `PHASE_ELECTRIQUE_NUMERO` | `electric_phase_number` | nullable |

**Depuis `cantons[0].general.appartenance[0]` :**

| Champ JSON | Champ `Section` | Note |
|---|---|---|
| `LIT_ADR` | `lit_name` | |
| `LIT_IDR` | `lit_code` | |
| `BRANCHE_IDR` | `branch_idr` | Extraire les 2 derniers chiffres (RG.CAN.BRA) |
| `TENSION_ELECTRIQUE_ADR` | `voltage_idr` | |

> Règle **RG.CAN.BRA** : `branch_idr` = valeur numérique extraite de `BRANCHE_IDR` — extraction des 2 derniers chiffres. Ex: `"FLAMAL73MENUE01"` → `"01"`.

**Depuis la première portée uniquement** (tri par `PORTEE_UNITAIRE_ORDRE`, index 0) — règles RG.CAN.CEM / RG.CAN.EEL / RG.CAN.GMR :

| Champ JSON | Champ `Section` | Résolution |
|---|---|---|
| `CM_DESIGNATION` | `maintenance_center_id` | Lookup `MaintenanceService` par `maintenance_center` = `CM_DESIGNATION` |
| `CM_DESIGNATION` | `maintenance_center_names` | Valeur directe : `[CM_DESIGNATION]` |
| `EEL_DESIGNATION` | `maintenance_team_id` | Lookup `MaintenanceService` par `maintenance_team` = `EEL_DESIGNATION` |
| `GMR_DESIGNATION` | `regional_team_id` | Lookup `MaintenanceService` par `regional_team` = `GMR_DESIGNATION` |
| `GMR_DESIGNATION` | `regional_maintenance_center_names` | Valeur directe : `[GMR_DESIGNATION]` |

> `MaintenanceService` doit être **injecté** dans `SectionImportService` (actuellement absent). Le lookup est `async` — `mapGeoLiaisonToSection` doit être `async`.

### Mapper supports `mapGeoLiaisonSupports(portees)`

Algorithme :
1. Trier `cantons[0]["portee unitaire"]` par `PORTEE_UNITAIRE_ORDRE` (valeur numérique).
2. Pour chaque portée → créer un `Support` depuis `accroche depart`.
3. Pour la **dernière portée uniquement** → créer un `Support` supplémentaire depuis `accroche arrivee`.

Mapping d'une accroche → `Support` :

| Champ JSON (accroche) | Champ `Support` | Provenance |
|---|---|---|
| `PORTEE_LONGUEUR` | `spanLength` | portée descriptive |
| `PORTEE_AZIMUT` | `spanAzimut` | portée descriptive |
| `ANGLE_LIGNE` | `spanAngle` | accroche |
| `ACCROCHE_SET` | `attachmentSet` | accroche |
| `ACCROCHE_CABLE_Z_LAMBERT93` | `attachmentHeight` | accroche |
| `HAUTEUR_SOUS_CONSOLE` | `heightBelowConsole` | accroche |
| `LONGUEUR_BRAS` | `armLength` | accroche |
| `CHAINE_INL_ADR` | `chainName` | accroche |
| `CHAINE_INL_LONGUEUR` | `chainLength` | accroche |
| `CHAINE_INL_POIDS` | `chainWeight` | accroche |
| `CHAINE_EN_V` | `chainV` | accroche |
| `CONTREPOIDS` | `counterWeight` | accroche |
| `CHAINE_INL_SURFACE` | `chainSurface` | accroche |
| `PIED_Z_LAMBERT93` | `supportFootAltitude` | accroche |
| `PIED_X_LAMBERT93` | `x_foot_lambert93` | accroche |
| `PIED_Y_LAMBERT93` | `y_foot_lambert93` | accroche |
| `SUPPORT_ADR` | `name` | accroche |
| `SUPPORT_NUMERO` | `number` | accroche |
| `SUPPORT_TOWER` | `towerModel` | accroche |
| `PORTEE_UNITAIRE_DESIGNATION` | `attachmentPosition` | portée descriptive — extraire le nombre après `"Position "` (RG.CAN.POS) |

> Règle **RG.CAN.POS** : `attachmentPosition` = nombre limité aux 2 chiffres situés après `"Position "` et avant `" - Phase"` si présent. Ex: `"Position 1"` → `"1"`.

Les valeurs nulles JSON sont conservées telles quelles (`null`) dans le modèle.

> **Important — types JSON :** toutes les valeurs numériques du JSON GeoLiaison sont encodées en **string** (ex: `"PORTEE_LONGUEUR": "565.49"`, `"ACCROCHE_SET": "19"`). Le mapper doit appliquer `parseFloat()` sur tous les champs `number | null` du modèle `Support` et de la `Section`. Si la valeur JSON est `null` ou chaîne vide, conserver `null`.

> **RG.CAN.OUV-BTN.3** : si le fichier n'est pas au format GeoLiaison valide (structure `cantons` absente ou `CANTON_CUR` manquant), retourner une erreur avec le message `"Fichier de géoliaison à importer non conforme."` et le code `VALIDATION_ERROR`.

**Vérification de phase:** ✅ 38/38 tests passent.
```
npm run test -- src/app/features/study/application/services/section-import.service.spec.ts
```
Tests couverts : fichier GeoLiaison valide → section correctement mappée, supports ordonnés, lookup CM/EEL/GMR, UUID depuis `CANTON_CUR`, dernier support depuis `accroche arrivee`, fallback format Section JSON intact, fichier invalide → erreur `"Fichier de géoliaison à importer non conforme."`.

---

## ✅ Phase 1 — Contrat Shared *(terminée)*

**Fichier:** `src/app/shared/import/domain/import-contracts.interfaces.ts`

- Étendre `ImportContextConfig` pour supporter une action de succès générique, en complément du `navigationRoute` existant:
  - Variante A: lien de navigation (Study) — `navigationRoute: (entityId) => string`
  - Variante B: action callback (Section) — `successAction: { label: string; action: (outcome: ImportOutcome) => void }`
- Ajouter un mécanisme de reset piloté de l'extérieur. Approche: un input `resetToken = input<number>(0)` sur le composant générique — quand sa valeur change, le composant vide ses `outcomes`. Ce pattern évite les méthodes publiques mutables et reste signal-first.
- `navigationRoute` reste optionnel et rétrocompatible; `successAction` est aussi optionnel. Les deux peuvent coexister mais ne concernent pas les mêmes contextes.

**Vérification de phase:** ✅ le type compile, aucun usage Study existant ne casse.

---

## ✅ Phase 2 — Composant Import générique *(terminée)*

**Fichiers:**
- `src/app/shared/components/import/import.component.ts`
- `src/app/shared/components/import/import.component.html`

**Dans le `.ts`:**
- Ajouter l'input `resetToken = input<number>(0)`
- Ajouter un `effect()` sur `resetToken()` qui appelle `outcomes.set([])`
- Ajouter un output `successActionTriggered = output<ImportOutcome>()` — émis quand le bouton Edit est cliqué, avec le payload outcome correspondant. La logique métier reste dans le wrapper feature, le composant générique ne sait pas ce qu'est une Section.

**Dans le `.html`:**
- Conserver le bloc Open existant: `@if (config().navigationRoute && outcome.entityId)` → lien `routerLink` avec `data-testid="open-imported-btn"` (inchangé).
- Ajouter un bloc Edit: `@if (config().successAction && outcome.entityId)` → bouton `<button>` avec `data-testid="edit-imported-btn"`, au clic émet `successActionTriggered` avec le outcome.
- Les deux blocs sont mutuellement exclusifs par configuration, pas par logique template.

**Vérification de phase:**
```
npm run test -- src/app/shared/components/import/import.component.spec.ts
```
✅ 35/35 tests passent. Tests Open existants inchangés, nouveaux cas Edit (5 tests) et reset (3 tests) ajoutés.

---

## ✅ Phase 3 — Wrapper Import Section *(terminée)*

**Fichiers:**
- `src/app/features/study/presentation/components/sections-tab/newSectionModal/import-section/import-section.constantes.ts`
- `src/app/features/study/presentation/components/sections-tab/newSectionModal/import-section/import-section.component.ts`

**Dans les constantes:**
- `SECTION_IMPORT_CONFIG` contient les textes statiques (acceptedFiles, entityLabel, texts). Le callback `successAction.action` ne peut pas être statique car il doit déclencher un output du composant. La solution propre: le composant wrapper construit la config complète en `computed()` en combinant les textes statiques et le callback lié à ses outputs.

**Dans le wrapper `.ts`:**
- Ajouter un input `importResetToken = input<number>(0)` reçu de la modale parente.
- Construire la config complète en `computed()`:
  ```typescript
  readonly config = computed<ImportContextConfig>(() => ({
    ...SECTION_IMPORT_CONFIG,
    successAction: {
      label: $localize`Edit`,
      action: (outcome) => this.editRequested.emit(outcome.entityId!)
    }
  }));
  ```
- Ajouter l'output `editRequested = output<string>()` (string = uuid de la section importée).
- Passer `[resetToken]="importResetToken()"` vers `<app-import>` dans le template.
- Conserver `onImportCompleted` et `importCompleted` output existants.

**Vérification de phase:** ✅ 13/13 tests passent.
```
npm run test -- src/app/features/study/presentation/components/sections-tab/newSectionModal/import-section/import-section.component.spec.ts
```

---

## ✅ Phase 4 — NewSectionModal: orchestration Edit + reset *(terminée)*

**Fichiers:**
- `src/app/features/study/presentation/components/sections-tab/newSectionModal/newSectionModal.component.ts`
- `src/app/features/study/presentation/components/sections-tab/newSectionModal/newSectionModal.component.html`

**Dans le `.ts`:**
- Ajouter un signal `importResetToken = signal<number>(0)` — incrémenter pour déclencher le reset dans le wrapper.
- Modifier `onSectionImportCompleted`: **supprimer** la fermeture automatique sur succès. La modale reste ouverte, le user voit les résultats et peut cliquer Edit.
- Ajouter `onImportedSectionEditRequested(sectionUuid: string)`:
  1. Incrémenter `importResetToken` → vide immédiatement la liste des fichiers importés dans Import Section.
  2. Rechercher la section par uuid dans `this.study()!.sections`.
  3. Si trouvée: émettre `setSection.emit(section)` + émettre `setMode.emit('edit')` + cycle close/reopen via micro-tâche:
     ```typescript
     this.isOpenChange.emit(false);
     Promise.resolve().then(() => this.isOpenChange.emit(true));
     ```
  4. Si non trouvée: notification d'erreur non bloquante (via `NotificationService`), modale conservée ouverte en état extraction.

**Dans le `.html`:**
- Passer `[importResetToken]="importResetToken()"` vers `<app-import-section>`.
- Brancher `(editRequested)="onImportedSectionEditRequested($event)"` sur `<app-import-section>`.

**Vérification de phase:** ✅ 36/36 tests passent.
```
npm run test -- src/app/features/study/presentation/components/sections-tab/newSectionModal/newSectionModal.component.spec.ts
```
Tests couverts: success seul ne ferme pas, clic Edit reset + mode edit, fallback uuid introuvable.

---

## ✅ Phase 5 — Parent SectionsTab: orchestration réouverture *(terminée)*

**Fichiers:**
- `src/app/features/study/presentation/components/sections-tab/sectionsTab.component.ts`
- `src/app/features/study/presentation/components/sections-tab/sectionsTab.component.html`

- Vérifier que le binding `(setSection)="currentSection.set($event)"` et `(setMode)="newSectionModalMode.set($event)"` propagent bien la section importée et le mode edit depuis la modale.
- Vérifier que `(isOpenChange)="onModalOpenChange($event)"` permet le cycle close/reopen: le `false` ferme la modale, le `true` rouvre. La modale gère déjà `isNewSectionModalOpen` — le cycle via micro-tâche côté modal est suffisant.
- Garantir la non-régression de `editSection`, `viewSection`, `openNewSectionModalCreate`.

**Vérification de phase:** ✅ 42/42 tests passent. Bindings déjà corrects dans le template. 6 nouveaux tests ajoutés (cycle close/reopen, propagation section/mode, non-régression editSection/openNewSectionModalCreate).
```
npm run test -- src/app/features/study/presentation/components/sections-tab/sectionsTab.component.spec.ts
```

---

## ✅ Phase 6 — Validation modèle Section *(terminée — vérification uniquement)*

**Fichiers:**
- `src/app/features/study/application/services/section-import.service.ts`
- `src/app/core/services/section/section.service.ts`

- Vérifier que le mapper GeoLiaison (Phase 0b) préserve tous les champs attendus par le formulaire d'édition manuelle: `name`, `type`, `cables_amount`, `supports`, champs optionnels (`initial_conditions`, `obstacles`, etc.). `cable_name` reste vide intentionnellement — ce n'est pas un bug.
- Vérifier que `createOrUpdateSection()` met à jour `study.sections` en mémoire **et** persiste via `StudiesService.updateStudy()`, de sorte que le lookup uuid immédiatement après import retrouve la section.
- Si un champ GeoLiaison est absent ou null, vérifier que le fallback `createEmptySection()` évite les crash dans le formulaire edit.

**Vérification de phase:** ✅ validation croisée confirmée.
- 38/38 tests `section-import.service.spec.ts` couvrent : champs `name`/`type`/`cables_amount`/`supports`, `cable_name` vide intentionnellement, nulls gérés par `createEmptySection()`.
- 6/6 tests `section.service.spec.ts` couvrent : `createOrUpdateSection()` met à jour `study.sections` en mémoire ET persiste via `StudiesService.updateStudy()`.

---

## ✅ Phase 7 — Tests unitaires complets *(terminée)*

### `import.component.spec.ts`
- `HTML rendering — navigation link`: Open inchangé (Study, `navigationRoute` présent).
- `HTML rendering — edit action`: Edit affiché si `successAction` présent + `entityId` défini.
- `HTML rendering — edit action`: Edit absent si `entityId` absent.
- `loadFiles() behaviour`: `successActionTriggered` émis avec le bon outcome au clic Edit.
- `reset behaviour`: après incrément `resetToken`, `successOutcomes()` et `errorOutcomes()` retournent `[]`.

### `import-section.component.spec.ts`
- `config`: `successAction` présent dans la config calculée.
- `editRequested output`: émet l'uuid quand `successActionTriggered` est déclenché par `app-import`.
- `importResetToken`: propagé vers `app-import` via binding.
- Conservation des tests existants (study context, importCompleted forwarding).

### `newSectionModal.component.spec.ts`
- `onSectionImportCompleted`: ne ferme plus automatiquement sur un outcome success.
- `onImportedSectionEditRequested`: incrémente `importResetToken` avant de passer en edit.
- `onImportedSectionEditRequested`: émet `setSection` + `setMode('edit')` + close/reopen si uuid trouvé.
- `onImportedSectionEditRequested`: émet une notification et conserve la modale ouverte si uuid introuvable.

### `sectionsTab.component.spec.ts`
- Non-régression `editSection`, `openNewSectionModalCreate`.
- Cycle close/reopen depuis modale: `isNewSectionModalOpen` passe `false` puis `true`.

**Vérification de phase:** ✅ 126/126 tests passent (4 fichiers).
```
npm run test -- src/app/shared/components/import/import.component.spec.ts \
  src/app/features/study/presentation/components/sections-tab/newSectionModal/import-section/import-section.component.spec.ts \
  src/app/features/study/presentation/components/sections-tab/newSectionModal/newSectionModal.component.spec.ts \
  src/app/features/study/presentation/components/sections-tab/sectionsTab.component.spec.ts
```

---

## ✅ Phase 8 — Vérification finale *(lint + tests terminés)*

**Résultats automatiques:** ✅ 0 erreur lint, ✅ 319/319 tests passent (11 fichiers).

```bash
# Lint ciblé
npm run lint -- src/app/shared/domain/models/ src/app/shared/domain/helpers/ src/app/features/study/application/services/ src/app/shared/components/import/ src/app/shared/import/domain/ src/app/features/study/presentation/components/sections-tab/newSectionModal/

# Tous les tests touchés
npm run test -- src/app/shared/domain/ src/app/features/study/application/services/ src/app/shared/components/import/ src/app/features/study/presentation/components/sections-tab/
```

**Validation manuelle du scénario E2E:**
1. Ouvrir la modale Section en mode create/extraction.
2. Importer un fichier GeoLiaison JSON valide (ex: `400kVFLAMAL73MENUEcanton307a311-cdg19.json`) → succès listé, modale reste ouverte.
3. Cliquer Edit → liste des fichiers importés vidée immédiatement, modale se ferme puis se rouvre en mode edit avec la section préremplie (`name`, `cables_amount`, supports ordonnés, CM/EEL/GMR résolus ; `cable_name` reste vide — à saisir manuellement).
4. Revenir en mode create/extraction → Import Section propre, aucun résidu.
5. Tester collision: importer le même fichier une seconde fois → dialog confirmation → accept remplace, reject skip, liste mise à jour.
6. Vérifier que le flux Study (Open) est inchangé.
7. Vérifier qu'un fichier GeoLiaison avec des champs null ne crash pas le formulaire edit.

---

## Fichiers impactés

| Fichier | Phase | Nature de la modification |
|---|---|---|
| `src/app/shared/domain/models/support.model.ts` | 0 | +3 champs: `spanAzimut`, `x_foot_lambert93`, `y_foot_lambert93` |
| `src/app/shared/domain/helpers/sections.helpers.ts` | 0 | `createEmptySupport()` += 3 champs `null` |
| `src/app/features/study/application/services/section-import.service.ts` | 0b | Mapper GeoLiaison, injection `MaintenanceService`, fix `checkCollision` |
| `src/app/features/study/application/services/section-import.service.spec.ts` | 0b | Tests unitaires mapper GeoLiaison |
| `src/app/shared/import/domain/import-contracts.interfaces.ts` | 1 | Ajout `successAction` dans `ImportContextConfig` ✅ fait |
| `src/app/shared/components/import/import.component.ts` | 2 | Input `resetToken`, effect reset, output `successActionTriggered` |
| `src/app/shared/components/import/import.component.html` | 2 | Bloc Edit conditionnel + `data-testid="edit-imported-btn"` |
| `src/app/shared/components/import/import.component.spec.ts` | 7 | Tests Edit, reset, Open inchangé |
| `src/app/features/study/.../import-section/import-section.constantes.ts` | 3 | Textes statiques Section (pas de callback) |
| `src/app/features/study/.../import-section/import-section.component.ts` | 3 | `computed config`, input `importResetToken`, output `editRequested` |
| `src/app/features/study/.../import-section/import-section.component.spec.ts` | 7 | Tests config/forwarding edit/reset |
| `src/app/features/study/.../newSectionModal/newSectionModal.component.ts` | 4 | Signal `importResetToken`, handler `onImportedSectionEditRequested`, sans fermeture auto |
| `src/app/features/study/.../newSectionModal/newSectionModal.component.html` | 4 | Bindings `importResetToken` + `editRequested` |
| `src/app/features/study/.../newSectionModal/newSectionModal.component.spec.ts` | 7 | Tests comportementaux modale |
| `src/app/features/study/.../sectionsTab.component.ts` | 5 | Vérification orchestration si adaptation nécessaire |
| `src/app/features/study/.../sectionsTab.component.html` | 5 | Vérification bindings outputs modale |
| `src/app/features/study/.../sectionsTab.component.spec.ts` | 7 | Non-régression orchestration |
