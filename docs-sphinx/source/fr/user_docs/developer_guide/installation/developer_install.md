# Installation

## Prérequis
1. Vous devez installer node/npm. Nous proposons d'utiliser nvm pour maîtriser précisément sa version.  
    - [Pour nvm](https://github.com/nvm-sh/nvm)
    - Définissez la version de node sur 23 avec `nvm install v23` et `nvm use 23`

2. Vous aurez besoin de `uv` pour exécuter le script de configuration de mechaphlowers.
*mechaphlowers est un ensemble de scripts Python pour des calculs physiques complexes*
[doc d'installation de uv](https://docs.astral.sh/uv/getting-started/installation/)
   - pour installer uv sous windows : `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`
   - pour installer uv sous macOS et linux : `curl -LsSf https://astral.sh/uv/install.sh | sh`

3. Nous conseillons d'installer le CLI Angular en global.
Vous devez faire correspondre le CLI global et le CLI local du projet en vérifiant la version actuelle dans `package.json`.  
`npm i -g @angular/cli@project_cli_version`
    - le CLI local peut être utilisé mais ce n'est pas recommandé

## Installer les dépendances et lancer en local
1. installez les packages globaux avec npm `npm i` / `npm install`

2. configurez mechaphlowers avec le script local `npm run set-up-mechaphlowers`

3. lancez le serveur local avec `ng serve` ou `npm run start`

## Alias de chemins TypeScript

Le projet utilise des alias de chemins TypeScript pour simplifier les imports et améliorer la lisibilité du code. Ces alias sont configurés dans `tsconfig.json` et `tsconfig.spec.json`.

| Alias | Chemin | Description |
|-------|------|-------------|
| `@src/*` | `./src/*` | Dossier source racine |
| `@app/*` | `./src/app/*` | Dossier de l'application |
| `@core/*` | `./src/app/core/*` | Module core (domaine, infrastructure) |
| `@services/*` | `./src/app/core/services/*` | Services applicatifs |
| `@features/*` | `./src/app/features/*` | Modules de feature (bounded contexts DDD) |
| `@shared/*` | `./src/app/shared/*` | Composants, pipes, directives réutilisables partagés |
| `@infrastructure/*` | `./src/app/infrastructure/*` | Infrastructure (base Dexie, DTOs) |

### Exemples d'utilisation

```typescript
// Instead of relative imports like:
import { StorageService } from '../../../core/services/storage/storage.service';

// Use alias imports:
import { StorageService } from '@services/storage/storage.service';
import { Study } from '@core/domain';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
```

## Importer les données de lignes et de maintenance

1. les données de lignes doivent être placées dans un fichier `public/data/lines.csv` avec les colonnes suivantes :
    - LIAISON_IDR
    - LIT_IDR
    - LIT_ADR
    - BRANCHE_IDR
    - BRANCHE_ADR
    - TENSION_ELECTRIQUE_IDR
    - TENSION_ELECTRIQUE_ADR

2. les données de maintenance doivent être placées dans un fichier `public/data/maintenance-teams.csv` avec les colonnes suivantes :
    - CM_CUR
    - CM_DESIGNATION
    - GMR_CUR
    - GMR_DESIGNATION
    - EEL_CUR
    - EEL_DESIGNATION

3. les données de câbles doivent être placées dans un fichier `public/data/cables.csv` avec les colonnes suivantes :
    - cable_id
    - name
    - data_source
    - section
    - diameter
    - young_modulus
    - linear_mass
    - dilatation_coefficient
    - temperature_reference
    - section_conductor
    - section_heart
    - stress_strain_a0
    - stress_strain_a1
    - stress_strain_a2
    - stress_strain_a3
    - stress_strain_a4
    - stress_strain_b0
    - stress_strain_b1
    - stress_strain_b2
    - stress_strain_b3
    - stress_strain_b4
    - is_polynomial
    - is_bimetallic
    - diameter_heart
    - has_magnetic_heart
    - electric_resistance_20
    - linear_resistance_temperature_coef
    - emissivity
    - solar_absorption
    - radial_thermal_conductivity
    - rts_cable
    - rts_layer_1
    - nb_strand_layer_1
    - rts_layer_2
    - nb_strand_layer_2
    - rts_layer_3
    - nb_strand_layer_3
    - rts_layer_4
    - nb_strand_layer_4
    - rts_layer_5
    - nb_strand_layer_5
    - rts_layer_6
    - nb_strand_layer_6
    - rts_layer_7
    - nb_strand_layer_7
    - rts_layer_8
    - nb_strand_layer_8
    - safety_coefficient

4. les données de chaînes doivent être placées dans un fichier `public/data/chains.csv` avec les colonnes suivantes :
    - name
    - length
    - weight
    - surface
    - v

5. les données d'attaches doivent être placées dans un fichier `public/data/attachments.csv` avec les colonnes suivantes :
    - support_family
    - support_name
    - set_number
    - arm_length
    - altitude


Au démarrage, l'application importera les données depuis les fichiers csv et les stockera dans la base de données.