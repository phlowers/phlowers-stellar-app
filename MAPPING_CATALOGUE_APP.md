# Mapping Complet : Catalogue → Application

## 📋 Vue d'ensemble

Le flux de données suit 3 chemins principaux:
1. **CSV Lines** → `LineCsvDto` → `CatalogLineEntity` (en base Dexie)
2. **Canton XML** → `Appartenance` + `Span` → `Section` (propriétés spécifiques)
3. **UI Manual Selection** → `lineTablePropertiesToSectionProperties` → `Section` (overwrite)

---

## 🔗 Niveau 1 : CSV Lines → Catalogue

### Source CSV Format
**Fichier**: `public/data/lines.csv` ou `e2e/fixtures/csv/lines.fixture.csv`

```
link_idr;link_adr;lit_idr;lit_adr;branch_id;branch_idr;branch_adr;voltage_idr;voltage_adr
```

### DTO (LineCsvDto)
**Fichier**: [src/app/infrastructure/dto/line-csv.dto.ts](src/app/infrastructure/dto/line-csv.dto.ts)

| CSV Field | DTO Property | Type | Notes |
|-----------|-------------|------|-------|
| `link_id` | `link_id` | string | Identifiant LIAISON (unused in app) |
| `link_idr` | `link_idr` | string | LIAISON IDR (référence courte) - **Required (validation key)** |
| `link_adr` | `link_adr` | string | LIAISON ADR (adresse complète) |
| `lit_id` | `lit_id` | string | Identifiant LIT (unused) |
| `lit_idr` | `lit_idr` | string | LIT IDR |
| `lit_adr` | `lit_adr` | string | LIT ADR |
| `branch_id` | `branch_id` | string | Identifiant BRANCHE (unused) |
| `branch_idr` | `branch_idr` | string | BRANCHE IDR |
| `branch_adr` | `branch_adr` | string | BRANCHE ADR |
| `voltage_id` | (none) | - | (not mapped) |
| `voltage_idr` | `voltage_idr` | string | VOLTAGE IDR |
| `voltage_adr` | `voltage_adr` | string | VOLTAGE ADR |
| `cable_idr` | (none) | - | (not used in catalog) |
| `cable_adr` | (none) | - | (not used in catalog) |
| `cable_bundle_amount` | (none) | - | (not used in catalog) |

### Transformation : mapLineRow()
**Fichier**: [src/app/shared/catalog/csv-import/configs/lines.config.ts](src/app/shared/catalog/csv-import/configs/lines.config.ts)

```typescript
export const mapLineRow = (item: LineCsvDto): CatalogLineEntity | null => {
  if (!item?.link_idr) return null;  // ⚠️ VALIDATION
  const hasNoVoltage = !item.voltage_idr || !item.voltage_adr || item.voltage_adr === '0.0';
  return {
    uuid: uuidv4(),
    // Direct copy (1:1)
    link_idr: item.link_idr || '',
    link_adr: item.link_adr || '',
    lit_idr: item.lit_idr || '',
    lit_adr: item.lit_adr || '',
    branch_id: item.branch_id || '',
    branch_idr: item.branch_idr || '',
    branch_adr: item.branch_adr || '',
    // Voltage handling
    voltage_idr: hasNoVoltage ? 'NO VOLTAGE' : item.voltage_idr,
    voltage_adr: hasNoVoltage ? 'NO_VOLTAGE' : item.voltage_adr
  };
};
```

### Catalogue DB Schema
**Fichier**: [src/app/infrastructure/database/schemas/catalog-line.schema.ts](src/app/infrastructure/database/schemas/catalog-line.schema.ts)

```typescript
export const CATALOG_LINE_SCHEMA = {
  catLines: `&uuid, link_idr, line_adr, lit_idr, lit_adr, branch_idr, branch_adr, 
             electric_tension_level_idr, electric_tension_level_adr`
};
```

### CatalogLine Model
**Fichier**: [src/app/shared/domain/models/catalog/catalog-line.model.ts](src/app/shared/domain/models/catalog/catalog-line.model.ts)

```typescript
export interface CatalogLine {
  uuid: string;
  link_idr: string;      // LIAISON IDR
  link_adr: string;      // LIAISON ADR
  lit_idr: string;       // LIT IDR
  lit_adr: string;       // LIT ADR
  branch_id: string;     // BRANCHE ID (from CSV only)
  branch_idr: string;    // BRANCHE IDR
  branch_adr: string;    // BRANCHE ADR
  voltage_idr: string;   // VOLTAGE IDR
  voltage_adr: string;   // VOLTAGE ADR
}
```

---

## 🏠 Niveau 2 : Canton XML → Section (Propriétés héritage)

### Source XML : Appartenance
**Fichier**: [src/app/features/study/application/services/section-import.interfaces.ts](src/app/features/study/application/services/section-import.interfaces.ts)

```typescript
export interface Appartenance {
  LIT_ADR: string | null;
  LIT_IDR: string | null;
  BRANCHE_IDR: string | null;
  BRANCHE_ADR: string | null;
  TENSION_ELECTRIQUE_IDR: string | null;
  TENSION_ELECTRIQUE_ADR: string | null;
  LIAISON_IDR: string | null;
  LIAISON_ADR: string | null;
}

export interface Span {
  CM_DESIGNATION: string | null;        // Centre de Maintenance
  EEL_DESIGNATION: string | null;       // Équipe d'Exploitation Locale
  GMR_DESIGNATION: string | null;       // Groupe Maintenance Régional
  // ...
}
```

### Transformation : mapExternalSectionToSection()
**Fichier**: [src/app/features/study/application/services/section-import.service.ts](src/app/features/study/application/services/section-import.service.ts) (lignes 265+)

```typescript
// From Appartenance (line hierarchy)
section: {
  lit_adr: appartenance?.LIT_ADR ?? undefined,
  lit_idr: appartenance?.LIT_IDR ?? undefined,
  link_code: appartenance?.LIAISON_IDR ?? undefined,        // ⚠️ RENAMED!
  link_name: appartenance?.LIAISON_ADR ?? undefined,        // ⚠️ RENAMED!
  branch_code: appartenance?.BRANCHE_IDR ?? undefined,      // ⚠️ RENAMED!
  branch_name: appartenance?.BRANCHE_ADR ?? undefined,
  voltage_idr: voltageIdr,                                 // Resolved from catalog
  voltage_adr: appartenance?.TENSION_ELECTRIQUE_ADR ?? undefined,
  
  // From Span (maintenance)
  maintenance_center_names: cmDesignation ? [cmDesignation] : [],
  maintenance_team_id: maintenanceTeamEntry?.maintenance_team_id ?? undefined,
  regional_team_id: regionalTeamEntry?.regional_team_id ?? undefined,
  regional_maintenance_center_names: gmrDesignation ? [gmrDesignation] : [],
  cm_adr: cmDesignation,    // Scalar (SIG.144)
  eel_adr: eelDesignation,  // Scalar (SIG.144)
  gmr_adr: gmrDesignation   // Scalar (SIG.144)
}
```

---

## 🎨 Niveau 3 : Section Model (Complete)

**Fichier**: [src/app/shared/domain/models/section.model.ts](src/app/shared/domain/models/section.model.ts)

### Line Hierarchy Properties (from Appartenance)

| Property | Type | Source | Notes |
|----------|------|--------|-------|
| `link_code` | string \| undefined | `LIAISON_IDR` | ❌ RENAMED from `link_idr` (DB has `link_idr`) |
| `link_name` | string \| undefined | `LIAISON_ADR` | ✅ Consistent |
| `lit_idr` | string \| undefined | `LIT_IDR` | ✅ Consistent |
| `lit_adr` | string \| undefined | `LIT_ADR` | ✅ Consistent |
| `branch_code` | string \| undefined | `BRANCHE_IDR` | ❌ RENAMED from `branch_idr` (DB has `branch_idr`) |
| `branch_name` | string \| undefined | `BRANCHE_ADR` | ✅ Consistent |
| `voltage_idr` | string \| undefined | Catalog lookup | ✅ Consistent |
| `voltage_adr` | string \| undefined | `TENSION_ELECTRIQUE_ADR` | ✅ Consistent |

### Maintenance Properties (from Span + Maintenance catalog)

| Property | Type | Source | Notes |
|----------|------|--------|-------|
| `maintenance_center_id` | string \| undefined | Catalog lookup by `CM_DESIGNATION` | ID only (name in array) |
| `maintenance_center_names` | string[] | `CM_DESIGNATION` (span) | **DEPRECATED**: Array with 0-1 element, use `cm_adr` |
| `cm_idr` | string \| undefined | (not populated) | ❓ Exists but unused |
| `cm_adr` | string \| undefined | `CM_DESIGNATION` | ✅ NEW (SIG.144) - scalar designation |
| `maintenance_team_id` | string \| undefined | Catalog lookup by `EEL_DESIGNATION` | ID only |
| `eel_idr` | string \| undefined | (not populated) | ❓ Exists but unused |
| `eel_adr` | string \| undefined | `EEL_DESIGNATION` | ✅ NEW (SIG.144) - scalar designation |
| `regional_team_id` | string \| undefined | Catalog lookup by `GMR_DESIGNATION` | ID only (name in array) |
| `regional_maintenance_center_names` | string[] | `GMR_DESIGNATION` (span) | **DEPRECATED**: Array with 0-1 element, use `gmr_adr` |
| `gmr_idr` | string \| undefined | (not populated) | ❓ Exists but unused |
| `gmr_adr` | string \| undefined | `GMR_DESIGNATION` | ✅ NEW (SIG.144) - scalar designation |

---

## 🎯 Niveau 4 : Cascading Select (UI Manual Selection)

### Mapping: CatalogLine properties → Section properties
**Fichier**: [src/app/features/study/presentation/components/sections-tab/newSectionModal/manualSection/manualSection.constantes.ts](src/app/features/study/presentation/components/sections-tab/newSectionModal/manualSection/manualSection.constantes.ts)

```typescript
export const lineTablePropertiesToSectionProperties: Record<LineTableProperties, keyof Section> = {
  voltage_idr: 'voltage_idr',      // ✅ 1:1
  link_idr: 'link_code',           // ❌ RENAME: catalog.link_idr → section.link_code
  lit_idr: 'lit_idr',              // ✅ 1:1
  lit_adr: 'lit_adr',              // ✅ 1:1
  branch_idr: 'branch_code',       // ❌ RENAME: catalog.branch_idr → section.branch_code
  branch_adr: 'branch_name'        // ✅ 1:1 (but note: table has 'branch_adr', Section has 'branch_name')
};
```

**Type**: `LineTableProperties = 'voltage_idr' | 'link_idr' | 'lit_idr' | 'lit_adr' | 'branch_idr' | 'branch_adr'`

### UI Usage
**Files**:
- [manualSection.component.html](src/app/features/study/presentation/components/sections-tab/newSectionModal/manualSection/manualSection.component.html) - Select dropdowns
- [manualSection.component.ts](src/app/features/study/presentation/components/sections-tab/newSectionModal/manualSection/manualSection.component.ts) - Cascading logic
- [manualSection.helpers.ts](src/app/features/study/presentation/components/sections-tab/newSectionModal/manualSection/manualSection.helpers.ts) - Filter logic

**Display Order** (cascading dropdowns):
1. `voltage_idr` (Voltage)
2. `link_idr` (Link)
3. `lit_idr` (LIT ID)
4. `lit_adr` (LIT Name)
5. `branch_idr` (Branch)
6. `branch_adr` (Branch Name)

---

## 📊 Maintenance Catalog Mapping

### Maintenance CSV Import (separate pipeline)
**Fichier**: [src/app/shared/catalog/csv-import/configs/maintenance.config.ts](src/app/shared/catalog/csv-import/configs/maintenance.config.ts)

| CSV Field | DB Field | Type | Notes |
|-----------|----------|------|-------|
| `maintenance_center_id` | `maintenance_center_id` | string | CM ID |
| `maintenance_center` | `maintenance_center` | string | CM name/designation |
| `regional_team_id` | `regional_team_id` | string | GMR ID |
| `regional_team` | `regional_team` | string | GMR name/designation |
| `maintenance_team_id` | `maintenance_team_id` | string | EEL ID |
| `maintenance_team` | `maintenance_team` | string | EEL name/designation |

### Lookup : Span designation → Maintenance ID
**In**: [section-import.service.ts](src/app/features/study/application/services/section-import.service.ts)

```typescript
const cmDesignation = firstSpan?.CM_DESIGNATION ?? null;
const eelDesignation = firstSpan?.EEL_DESIGNATION ?? null;
const gmrDesignation = firstSpan?.GMR_DESIGNATION ?? null;

const allMaintenance = await this.maintenanceService.getMaintenance();

const maintenanceCenterEntry = cmDesignation
  ? allMaintenance.find((m) => m.maintenance_center === cmDesignation)
  : undefined;

// Then store:
section.maintenance_center_id = maintenanceCenterEntry?.maintenance_center_id;
section.cm_adr = cmDesignation;
section.maintenance_center_names = cmDesignation ? [cmDesignation] : [];
```

---

## 🔴 Issues & Inconsistencies

### 1. **Property Renaming: link_idr → link_code**
- **Catalog**: `CatalogLine.link_idr`
- **Section**: `Section.link_code` ❌
- **Impact**: Manual select mapping required in [manualSection.constantes.ts](src/app/features/study/presentation/components/sections-tab/newSectionModal/manualSection/manualSection.constantes.ts#L8)
- **Root cause**: Historical; Section model doesn't match catalog nomenclature

### 2. **Property Renaming: branch_idr → branch_code**
- **Catalog**: `CatalogLine.branch_idr`
- **Section**: `Section.branch_code` ❌
- **Impact**: Manual select mapping required
- **Root cause**: Same as above

### 3. **Maintenance Properties: Redundant Array + Scalar**
- **Old**: `maintenance_center_names: string[]` (0-1 element)
- **New**: `cm_adr: string | undefined` (SIG.144)
- **Status**: Both coexist; array marked for deprecation
- **Files**: [deadcode.md](deadcode.md) line 501-504

### 4. **Unused Maintenance IDR Fields**
- `cm_idr` ❓ (exists but never populated)
- `gmr_idr` ❓ (exists but never populated)
- `eel_idr` ❓ (exists but never populated)
- **Note**: Only ADR versions are populated

### 5. **Missing branch_number**
- Requested in your requirements
- **Not found** in any model or CSV
- Possible: `branch_id` from CSV could be this, but it's not mapped to Section

---

## 🔍 Traceability Examples

### Example 1: User selects `link_idr = "LIAISON-001"` in UI
```
UI (manualSection.component.html)
  → <p-select [(ngModel)]="section().link_name" ...>
  → onChange trigger: onLinesSelect($event, 'link_idr')
  → manualSection.component.ts line 382-383
    section[lineTablePropertiesToSectionProperties['link_idr']] = selectedValue
    → section['link_code'] = 'LIAISON-001'  ❌ Maps to 'link_code', not 'link_idr'
```

### Example 2: Import from Canton XML
```
Canton XML
  → Appartenance.LIAISON_IDR = "LIAISON-001"
  → section-import.service.ts line 318
    → section.link_code = appartenance?.LIAISON_IDR  ❌ Direct assignment
```

---

## ✅ Recommended Next Steps

1. **Standardize nomenclature**:
   - Rename `Section.link_code` → `Section.link_idr` (align with catalog)
   - Rename `Section.branch_code` → `Section.branch_idr` (align with catalog)
   - Remove mapping in `manualSection.constantes.ts`

2. **Clean up maintenance redundancy**:
   - Remove `maintenance_center_names` array (use `cm_adr` scalar)
   - Remove `regional_maintenance_center_names` array (use `gmr_adr` scalar)
   - Populate `cm_idr`, `gmr_idr`, `eel_idr` consistently

3. **Add missing `branch_number`** (if needed):
   - Map from CSV `branch_id` if it represents a number
   - Clarify requirement with business stakeholders

4. **Document all three "code" fields**:
   - Why Section uses `link_code` vs catalog `link_idr`
   - Why Section uses `branch_code` vs catalog `branch_idr`
   - Is this intentional API design or historical debt?
