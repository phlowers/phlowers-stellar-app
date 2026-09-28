# Terrain Data

## What is the Terrain Data Tab?

The **Terrain Data** tab in the Field Measuring tool captures the environmental and geographic information recorded during your site visit. This data is essential to compute the electrical parameter and cable temperature under the specific conditions you observed on the day of measurement.

You use this tab to record:
- When you took the measurement (date and time)
- Where the measurement was taken (span location, coordinates, elevation)
- What the weather was like (wind, temperature, sky conditions)

## Getting Started: Create or Select a Measurement

When you open the Field Measuring tool, {{app_name}} presents an initialization screen to either create a new measurement or select an existing one.

### Create a New Measurement

1. Enter a unique name for your measurement in the **Measure's name** field (or keep the default auto-generated name like "TM 1", "TM 2", etc.).
2. Click **Create a new measurement**.
3. The main dialog opens with the Terrain Data tab active.

### Select an Existing Measurement

1. Scroll through the **Choose an existing measure** dropdown to find your prior measurement.
2. Click **Choose**.
3. The main dialog opens with that measurement's data pre-loaded.

```{note}
You can delete an existing measurement by clicking the delete icon in the dropdown. Once deleted, you cannot recover it.
```

## Shared Header: Line and Location Information

At the top of all tabs, {{app_name}} displays a **header** with information about the circuit you are measuring:

| **Field** | **Description** | **Notes** |
|---|---|---|
| **Link** | The transmission or distribution line name | Read-only; from the section definition |
| **Voltage** | Nominal voltage of the line | Read-only; from the section definition |
| **Span type** | Either "Phase" or "Guard" | Read-only; from the section definition |
| **Phase number** | Which phase (if Span type is Phase) | Read-only; shown only for Phase spans |
| **Cable amount** | Number of conductors in the span | Read-only; from the section definition |

Below the read-only info, enter the **location where you recorded the measurement**:

| **Field** | **Unit** | **Range** | **Mandatory** | **Notes** |
|---|---|---|---|---|
| **Span** | — | dropdown list | Yes | Selects which span between two supports. {{app_name}} auto-selects the first available span. |
| **Longitude** | degrees (°) | −180 to +180 | Yes | Your GPS or map coordinate (West is negative, East is positive). If the selected study span has a stored localization, {{app_name}} fills this value automatically from that study data. |
| **Latitude** | degrees (°) | −90 to +90 | Yes | Your GPS or map coordinate (South is negative, North is positive). If the selected study span has a stored localization, {{app_name}} fills this value automatically from that study data. |
| **Altitude** | meters (m) | −100 to 9000 | Yes | Elevation above sea level (NGF). {{app_name}} auto-calculates this from the span's support heights; you may override it manually. |
| **Azimuth** | degrees (°) | −180 to +180 | Yes | Direction of the cable, measured clockwise from North (0°). The app can populate it from the study's span localization when available. |

### Automatic localization from the study

When a span is selected, {{app_name}} tries to pre-fill the longitude, latitude and azimuth using the localization already stored in the current study for that span.

The value used depends on the selected span and the selected reference support:
- The app takes the studied localization for the selected span.
- If a reference support has been chosen, it uses the localization associated with that support.
- If no reference support is selected, it falls back to the left support of the current span.
- The result is then written into the measurement fields so the user can validate or adjust it before saving.

If the study does not contain enough localization data for that span, {{app_name}} displays the information message: **Localization not available in study**. In that case, the user can still enter the values manually.

## Terrain Data Tab: Environmental Conditions

Enter the environmental conditions you observed during measurement:

| **Field** | **Unit** | **Range** | **Mandatory** | **Notes** |
|---|---|---|---|---|
| **Measure name** | — | text, unique | Yes | Name of this measurement session. Must not duplicate an existing measurement in the same section. If you try to use a duplicate name, an error appears: **Measure name must be unique.** |
| **Date** | — | dd/mm/yy | Yes | Date of measurement. Use the date picker calendar. |
| **Time** | 24-hour format (HH:mm) | valid time | Yes | Time of measurement (in 24-hour format). |
| **Season** | — | Summer / Winter | Yes | {{app_name}} auto-detects this based on daylight-saving time rules. You may override it if needed. |
| **Ambient temperature** | °C | −50 to +99 | Yes | Air temperature at the measurement location. |
| **Wind speed** | km/h or m/s | 0 to 50 | Yes | Average wind speed during measurement. Choose your preferred unit (km/h or m/s) via the toggle. |
| **Wind direction** | — | 8 compass points | Yes | Direction from which the wind blows (North, North-East, East, South-East, South, South-West, West, North-West). |
| **Sky cover** | N0 to N8 (nebulosity) | 9 values | Yes | Cloud cover on a scale from N0 (clear sky) to N8 (fully covered). N0, N3, N4, N7 are unlabeled; N1 = Sunny, N2 = Partly Cloudy, N5 = Cloudy, N6 = Covered Sky, N8 = Covered/Smoky. |

```{note}
All fields in the Terrain Data tab are mandatory. {{app_name}} displays an info message at the top: **All fields are mandatory**.
```

## Validation and Error Messages

As you type, {{app_name}} validates your entries:

- **Measure name duplicate**: If your name matches an existing measure, an error message appears below the name field: **Measure name must be unique.** Edit the name to resolve it.
- **Invalid ranges**: If a number field (e.g., wind speed) falls outside its allowed range, {{app_name}} may highlight the field when you try to save.
- **Empty mandatory field**: If you leave any required field blank, the **Save** and **Export** buttons remain disabled.

Once all fields are valid and you have made changes, the **Save** button becomes enabled. If all four tabs (Terrain Data, Parameter Calculation, Temperature Calculation, Parameter at 15°C without Wind) are valid, the **Export** button also becomes enabled.

## Dialog Actions

At the bottom of the dialog, three buttons control the measurement session:

- **Report** (disabled in current version): Reserved for future reporting functionality.
- **Export**: Generates a JSON file with all measurement data and computed results. Enabled only when all tabs are valid. The file name follows the pattern: `Export Mesure de terrain_<measure name>_<section name>_<date>.json`.
- **Save**: Persists your entries to the database. Enabled when the form is valid and you have made unsaved changes.

## Tips

```{tip}
**Auto-filled defaults**: When you create a new measurement, {{app_name}} pre-fills:
  - Date and time to "today/now"
  - Season to the current season (based on daylight-saving time rules)
  - Span to the first available span in the section
  - Altitude to the midpoint of the span's support heights (can be edited)
```

```{tip}
**Coordinate entry**: Use decimal degrees for coordinates (e.g., 45.1234 for latitude, 2.5678 for longitude). Avoid mixing degrees/minutes/seconds format.
```

```{tip}
**Wind direction**: If you are unsure of the exact direction, pick the closest cardinal or intercardinal direction (N, NE, E, SE, S, SW, W, NW).
```

See also: {doc}`Parameter calculation <parameter_calculation>`, {doc}`Temperature calculation <temperature_calculation>`, {doc}`Parameter at 15°C without wind <parameter_15c_without_wind>`.
