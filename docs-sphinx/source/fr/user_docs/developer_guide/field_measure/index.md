# Mesure de terrain

Documentation technique du module de mesure de terrain
(`src/app/features/studio/field-measuring/`).

Le module est ouvert depuis la barre d'outils du studio (`ToolbarDialogService`, clé de dialogue
`field-measuring`). `InitComponent` permet à l'utilisateur de créer ou sélectionner une mesure, puis
`FieldMeasuringComponent` héberge un en-tête partagé (`HeaderComponent`) et quatre onglets, tous liés à
un seul modèle `FieldMeasure` (`@shared/domain/models/field-measure.model`).

| Onglet | Composant | Tâches du worker |
|---|---|---|
| Données terrain | `FieldDatasComponent` | — |
| Calcul du paramètre | `CalculusSettingComponent` (`PapotoComponent`, `TangentAimingComponent`, `PepComponent`) | `calculatePapoto` |
| Calcul de température | `TemperatureCalculationComponent` | `getWindIncidence`, `estimateSkyCover`, `temperatureCalculation`, `diffuseAndBeamRadiationsCalculation` |
| Paramètre à 15 °C sans vent | `ParameterCalculation15WithoutWindComponent` | `calculateParameter15CWithoutWind` |

```{toctree}
:maxdepth: 1

terrain_data
parameter_calculation
temperature_calculation
parameter_15c_without_wind
```
