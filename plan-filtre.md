# Plan: Optimisation du filtrage `attachmentSetModal` via Dexie

## Context

Actuellement, `AttachmentService.getAttachments()` fait `catAttachments.toArray()` (chargement intégral de la table).
Le composant `AttachmentSetModalComponent` filtre ensuite en mémoire JS (`filter`, `sort`) et le template utilise `UniquePipe` (impure) pour dédoublonner.
`support_name` et `attachment_set` ne sont pas indexés dans Dexie.
DB version courante : **3**.

Objectif : déplacer tout le filtrage dans Dexie, ajouter les index nécessaires, exposer des méthodes ciblées dans le service.

---

## Steps

### Step 1 — Infrastructure : Ajouter les index `support_name` et `attachment_set` dans le schéma Dexie

- **Layer**: infrastructure
- **File**: `src/app/infrastructure/database/schemas/catalog-attachment.schema.ts`
- **Action**: Modify
- **Details**: Ajouter `support_name` et `attachment_set` dans la chaîne d'index de `CATALOG_ATTACHMENT_SCHEMA`.
  - Actuel : `&uuid, support_id_catalog, support_idr, support_adr, support_tower, support_family, position, X, Y, Z, L`
  - Nouveau : `&uuid, support_id_catalog, support_idr, support_adr, support_tower, support_family, position, X, Y, Z, L, support_name, attachment_set`
- **Acceptance**: Les deux champs apparaissent dans la string de schéma.

### Step 2 — Infrastructure : Migration Dexie version 4

- **Layer**: infrastructure
- **File**: `src/app/infrastructure/database/app-database.ts`
- **Action**: Modify
- **Details**: Ajouter `this.version(4).stores({...})` reprenant tous les schémas existants avec le nouveau `CATALOG_ATTACHMENT_SCHEMA`. Pas d'`upgrade()` nécessaire — Dexie reconstruit les index automatiquement.
- **Acceptance**: Version 4 déclarée, tous les schémas présents.

### Step 3 — Application : Nouvelles méthodes filtrées dans `AttachmentService`

- **Layer**: application
- **File**: `src/app/shared/catalog/services/attachment.service.ts`
- **Action**: Modify
- **Details**: Ajouter 3 nouvelles méthodes :
  1. `getDistinctSupportNames(): Promise<string[]>` — `catAttachments.orderBy('support_name').uniqueKeys() as string[]` → noms distincts triés.
  2. `getAttachmentsBySupportName(supportName: string): Promise<CatalogAttachment[]>` — `.where('support_name').equals(supportName).sortBy('attachment_set')` → attachements filtrés et triés.
  3. `getAttachmentDetails(supportName: string, attachmentSet: number): Promise<CatalogAttachment | undefined>` — `.where('support_name').equals(supportName).and(a => a.attachment_set === attachmentSet).first()`.
  - `getAttachments()` conservé pour compatibilité avec d'autres consommateurs.
- **Acceptance**: 3 méthodes présentes, aucun `.toArray()` dans les nouvelles méthodes.

### Step 4 — Présentation : Refactoriser `AttachmentSetModalComponent`

- **Layer**: presentation
- **File**: `src/app/features/study/presentation/components/sections-tab/newSectionModal/manualSection/supportsTable/attachmentSetModal/attachmentSetModal.component.ts`
- **Action**: Modify
- **Details**:
  - `supportsFilterTable` → `signal<string[]>([])` alimenté par `getDistinctSupportNames()`.
  - `attachmentsFilterTable` reste `signal<CatalogAttachment[]>([])` mais alimenté par `getAttachmentsBySupportName()` (plus de `filter()` JS).
  - `getData()` : appelle `getDistinctSupportNames()` pour `supportsFilterTable` ; `attachmentsFilterTable` → `[]` si aucun support sélectionné.
  - `onAttachmentSelect('support_name')` : appelle `getAttachmentsBySupportName(value)` directement.
  - `onAttachmentSelect('attachment_set')` : appelle `getAttachmentDetails(supportName, value)` directement.
  - `findCoordinates()` : utilise `getAttachmentsBySupportName(supportName)` au lieu de `getAttachments()` + filter JS.
  - Supprimer l'import de `lodash/uniq` et `UniquePipe` si plus utilisés dans le composant.
- **Acceptance**: Zéro `.filter()` JS sur des données catalog dans le composant.

### Step 5 — Template : Simplifier le HTML

- **Layer**: presentation
- **File**: `src/app/features/study/presentation/components/sections-tab/newSectionModal/manualSection/supportsTable/attachmentSetModal/attachmentSetModal.component.html`
- **Action**: Modify
- **Details**:
  - `support-name-select` : `[options]="supportsFilterTable()"` (type `string[]`), supprimer `| unique: 'support_name'`, supprimer `optionLabel` et `optionValue` (inutiles sur des strings), supprimer `filterBy="support_name"` (PrimeNG filtre les strings par valeur par défaut).
  - `attachment-set-select` : `| unique: 'attachment_set'` conservé (plusieurs lignes par `(supportName, attachmentSet)` possibles selon les positions).
- **Acceptance**: Premier `p-select` sans `UniquePipe`, options de type `string[]`.

### Step 6 — Tests : Mettre à jour `attachment.service.spec.ts`

- **Layer**: application
- **File**: `src/app/shared/catalog/services/attachment.service.spec.ts`
- **Action**: Modify
- **Details**: Ajouter des `describe` pour les 3 nouvelles méthodes. Mocker dans `mockAttachmentsTable` :
  - `orderBy().uniqueKeys()` pour `getDistinctSupportNames`
  - `where().equals().sortBy()` pour `getAttachmentsBySupportName`
  - `where().equals().and().first()` pour `getAttachmentDetails`
  - Cas couverts : valeur trouvée, DB indisponible, résultat vide.
- **Acceptance**: Couverture des 3 nouvelles méthodes, `getAttachments()` inchangé.

### Step 7 — Tests : Mettre à jour `attachmentSetModal.component.spec.ts`

- **Layer**: presentation
- **File**: `src/app/features/study/presentation/components/sections-tab/newSectionModal/manualSection/supportsTable/attachmentSetModal/attachmentSetModal.component.spec.ts`
- **Action**: Modify
- **Details**: Remplacer les mocks `getAttachments()` de filtrage par les mocks des nouvelles méthodes (`getDistinctSupportNames`, `getAttachmentsBySupportName`, `getAttachmentDetails`). Mettre à jour les assertions sur `supportsFilterTable` (type `string[]`).
- **Acceptance**: Aucun test ne mocke `getAttachments()` pour les cas de filtrage.

### Step 8 — Review (`/skill-review`)

- **Action**: Audit complet des fichiers modifiés.
- **Acceptance**: Pas de régression, pas de `.toArray()` pour filtrer dans le composant, DB version 4 présente.

---

## Decisions

- `getAttachments()` conservé (compatibilité avec d'autres consommateurs éventuels).
- Pas de recherche "debounce à N caractères" : le dataset est borné (CSV local), `orderBy().uniqueKeys()` est quasi instantané sur IndexedDB, PrimeNG filtre visuellement en mémoire sur le `string[]` résultant.
- `UniquePipe` retirée uniquement pour `support_name` (unicité garantie par Dexie). Maintenue pour `attachment_set` (plusieurs lignes par set selon les positions).
- DB version 4 : pas de migration de données, Dexie reconstruit les index automatiquement.

## Relevant files

| File | Step |
|---|---|
| `src/app/infrastructure/database/schemas/catalog-attachment.schema.ts` | 1 |
| `src/app/infrastructure/database/app-database.ts` | 2 |
| `src/app/shared/catalog/services/attachment.service.ts` | 3 |
| `src/app/shared/catalog/services/attachment.service.spec.ts` | 6 |
| `.../attachmentSetModal/attachmentSetModal.component.ts` | 4 |
| `.../attachmentSetModal/attachmentSetModal.component.html` | 5 |
| `.../attachmentSetModal/attachmentSetModal.component.spec.ts` | 7 |
