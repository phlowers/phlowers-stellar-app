# Field measuring

Technical documentation of the field measuring module
(`src/app/features/studio/field-measuring/`).

The module is opened from the studio toolbar (`ToolbarDialogService`, dialog key
`field-measuring`). `InitComponent` lets the user create or select a measure, then
`FieldMeasuringComponent` hosts a shared header (`HeaderComponent`) and four tabs, all bound to
a single `FieldMeasure` model (`@shared/domain/models/field-measure.model`).

| Tab | Component | Worker tasks |
|---|---|---|
| Terrain data | `FieldDatasComponent` | — |
| Parameter calculation | `CalculusSettingComponent` (`PapotoComponent`, `TangentAimingComponent`, `PepComponent`) | `calculatePapoto` |
| Temperature calculation | `TemperatureCalculationComponent` | `getWindIncidence`, `estimateSkyCover`, `temperatureCalculation`, `diffuseAndBeamRadiationsCalculation` |
| Parameter at 15°C without wind | `ParameterCalculation15WithoutWindComponent` | `calculateParameter15CWithoutWind` |

```{toctree}
:maxdepth: 1

terrain_data
parameter_calculation
temperature_calculation
parameter_15c_without_wind
```
