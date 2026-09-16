# D'où sortent CM, GMR, EEL ? — Hiérarchie de maintenance RTE

## 🔍 La réponse courte

**CM, GMR et EEL ne sont PAS des codes ou des numéros.**
C'est **l'hiérarchie organisationnelle d'RTE pour la maintenance des lignes électriques**.

| Sigle | Signification | Niveau | Exemple |
|-------|---------------|--------|---------|
| **CM** | Centre de Maintenance | Niveau 1 (national/régional) | "Île-de-France" |
| **GMR** | Groupe de Maintenance Régional | Niveau 2 (régional) | "Paris" |
| **EEL** | Équipe d'Exploitation Locale | Niveau 3 (local) | "Boulogne-Billancourt" |

---

## 📊 La hiérarchie complète

```
Île-de-France (CM - Centre de Maintenance)
├── Paris (GMR - Groupe Maintenance Régional)
│   └── Paris (EEL - Équipe d'Exploitation Locale)
├── Hauts-de-Seine (GMR)
│   └── Boulogne-Billancourt (EEL)
└── Seine-Saint-Denis (GMR)
    └── Saint-Denis (EEL)

Auvergne-Rhone-Alpes (CM)
├── Rhone (GMR)
│   └── Lyon (EEL)
├── Isère (GMR)
│   └── Grenoble (EEL)
└── Haute-Savoie (GMR)
    └── Annecy (EEL)
```

---

## 📥 D'où sortent les données ?

### 1️⃣ Source primaire : CSV de maintenance RTE

**Fichier** : `public/data/maintenance-teams.csv`

```csv
maintenance_center;regional_team;maintenance_team;maintenance_center_id;regional_team_id;maintenance_team_id
Île-de-France;Paris;Paris;04a27836...;a703f504...;39a314d2...
Île-de-France;Hauts-de-Seine;Boulogne-Billancourt;9d8050b4...;e10233b0...;067932eb...
Auvergne-Rhone-Alpes;Rhone;Lyon;0c4bc56d...;d249110a...;7dc7028a...
```

**Champs du CSV** :
- `maintenance_center` = Nom du CM (ex: "Île-de-France")
- `regional_team` = Nom du GMR (ex: "Paris")
- `maintenance_team` = Nom de l'EEL (ex: "Paris")
- `maintenance_center_id` = UUID du CM
- `regional_team_id` = UUID du GMR
- `maintenance_team_id` = UUID de l'EEL

### 2️⃣ Transformation : CSV → Catalogue

**Fichier** : `src/app/shared/catalog/csv-import/configs/maintenance.config.ts`

```typescript
export const mapMaintenanceRow = (item: MaintenanceCsvDto): CatalogMaintenanceEntity | null => {
  if (!item?.maintenance_team_id) return null;
  return {
    maintenance_center_id: item.maintenance_center_id,
    maintenance_center: item.maintenance_center,        // "Île-de-France"
    regional_team_id: item.regional_team_id,
    regional_team: item.regional_team,                  // "Paris"
    maintenance_team_id: item.maintenance_team_id,
    maintenance_team: item.maintenance_team              // "Paris" (EEL)
  };
};
```

**Stockage** : Table `catMaintenance` en Dexie

### 3️⃣ Utilisation : Section import

**Fichier** : `src/app/features/study/application/services/section-import.service.ts`

Quand on importe une section (canton) depuis les fichiers RTE XML, chaque span contient :
- `CM_DESIGNATION` : Le nom du centre de maintenance responsable
- `GMR_DESIGNATION` : Le nom du groupe régional responsable
- `EEL_DESIGNATION` : Le nom de l'équipe d'exploitation responsable

```typescript
// Lecture depuis le span du canton
const cmDesignation = firstSpan?.CM_DESIGNATION ?? null;        // ex: "Île-de-France"
const gmrDesignation = firstSpan?.GMR_DESIGNATION ?? null;      // ex: "Paris"
const eelDesignation = firstSpan?.EEL_DESIGNATION ?? null;      // ex: "Paris"

// Lookup dans le catalogue maintenance pour obtenir les IDs
const allMaintenance = await this.maintenanceService.getMaintenance();

const maintenanceCenterEntry = cmDesignation
  ? allMaintenance.find((m) => m.maintenance_center === cmDesignation)
  : undefined;

// Résultat : on récupère l'ID et la désignation
section.maintenance_center_id = maintenanceCenterEntry?.maintenance_center_id;
section.cm_adr = cmDesignation;  // "Île-de-France"
```

---

## 🔗 Relation entre Section et Maintenance

```
Canton XML (importé d'RTE)
├── Span 1
│   ├── CM_DESIGNATION: "Île-de-France"
│   ├── GMR_DESIGNATION: "Paris"
│   └── EEL_DESIGNATION: "Paris"
└── Span 2
    ├── CM_DESIGNATION: "Île-de-France"
    ├── GMR_DESIGNATION: "Hauts-de-Seine"
    └── EEL_DESIGNATION: "Boulogne-Billancourt"
        ↓
    Section
    ├── maintenance_center_id: "04a27836..." (ID du CM)
    ├── maintenance_center_names: ["Île-de-France"]
    ├── cm_adr: "Île-de-France"
    ├── regional_team_id: "a703f504..." (ID du GMR)
    ├── regional_maintenance_center_names: ["Paris"]
    ├── gmr_adr: "Paris"
    ├── maintenance_team_id: "39a314d2..." (ID de l'EEL)
    └── eel_adr: "Paris"
```

---

## ❓ Pourquoi le PO ne savait pas ?

Parce que :

1. **Pas documenté en spec** : La signification de CM/GMR/EEL n'était pas expliquée
2. **Implicite en code** : C'est du domaine métier RTE, pas évident pour un PO externe
3. **Flou dans les fichiers** :
   - Les champs s'appellent `CM_DESIGNATION`, `GMR_DESIGNATION`, `EEL_DESIGNATION`
   - Les propriétés Section s'appellent `cm_adr`, `gmr_adr`, `eel_adr`
   - Pas de connexion évidente

4. **Données sources en français** : Tout ce qui vient d'RTE est en français (noms de régions, etc.)
   - Île-de-France, Paris, Boulogne-Billancourt → Termes métier RTE

---

## 📋 Mapping complet

### En base de données

**Table `catMaintenance`** (champs de `CatalogMaintenanceEntity`) :

| Champ | Source CSV | Type | Exemple |
|-------|-----------|------|---------|
| `maintenance_center_id` | `maintenance_center_id` | UUID | `04a27836-4002-486d-86c0-a39bde57da9a` |
| `maintenance_center` | `maintenance_center` | string | `"Île-de-France"` |
| `regional_team_id` | `regional_team_id` | UUID | `a703f504-dd7b-4276-b989-eecf226c6861` |
| `regional_team` | `regional_team` | string | `"Paris"` |
| `maintenance_team_id` | `maintenance_team_id` | UUID | `39a314d2-5af9-4db9-9e39-67f4b3f1a072` |
| `maintenance_team` | `maintenance_team` | string | `"Paris"` |

### En Section (application)

| Champ Section | Source | Type | Exemple |
|---------------|--------|------|---------|
| `maintenance_center_id` | catMaintenance lookup | string | `04a27836...` |
| `maintenance_center_names` | CM_DESIGNATION du span | string[] | `["Île-de-France"]` |
| `cm_adr` | CM_DESIGNATION du span | string | `"Île-de-France"` |
| `regional_team_id` | catMaintenance lookup | string | `a703f504...` |
| `regional_maintenance_center_names` | GMR_DESIGNATION du span | string[] | `["Paris"]` |
| `gmr_adr` | GMR_DESIGNATION du span | string | `"Paris"` |
| `maintenance_team_id` | catMaintenance lookup | string | `39a314d2...` |
| `eel_adr` | EEL_DESIGNATION du span | string | `"Paris"` |

---

## 🎯 Résumé pour le PO

### Ce que c'est
CM/GMR/EEL = **Hiérarchie organisationnelle RTE**
- Dictent qui est responsable de la maintenance de chaque ligne
- Importés depuis un CSV RTE dédié
- Liés à chaque section via le fichier de canton

### Ce qu'on peut faire avec
✅ Afficher qui gère la maintenance (usager final)
✅ Filtrer sections par responsable
✅ Exporter/synchroniser avec autres systèmes RTE
✅ Tracer la responsabilité

### Ce qui manque actuellement
❌ Les IDR (`cm_idr`, `gmr_idr`, `eel_idr`) ne sont pas peuplés
❌ Seules les designations (`cm_adr`, `gmr_adr`, `eel_adr`) sont utilisées

### Décision requise
1. **Peuplé les IDR** : Modifier l'import pour récupérer les UUIDs ?
2. **Ou les supprimer** : Si on ne les utilise jamais ?
3. **Ou documenter** : Clarifier que ce sont des données de maintenance RTE ?

---

## 🔗 Références dans le code

| Fichier | Rôle |
|---------|------|
| `public/data/maintenance-teams.csv` | Source CSV RTE |
| `src/app/infrastructure/dto/maintenance-csv.dto.ts` | Parsing CSV |
| `src/app/shared/domain/models/catalog/catalog-maintenance.model.ts` | Modèle domaine |
| `src/app/shared/catalog/csv-import/configs/maintenance.config.ts` | Transformation |
| `src/app/infrastructure/database/schemas/catalog-maintenance.schema.ts` | Schéma Dexie |
| `src/app/features/study/application/services/section-import.service.ts` | Liaison Section ↔ Maintenance |

