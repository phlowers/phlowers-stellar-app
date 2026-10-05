# Temperature Calculation

## Overview

The **Temperature calculation** tab computes the cable temperature under real measured field conditions. Using ambient temperature, electrical current, wind speed and direction, and solar radiation, {{app_name}} applies thermal equilibrium equations via mechaphlowers library to estimate what the conductor temperature will be at steady state. This value is critical for assessing the cable position on the field.

All fields shown in this tab are mandatory to run the calculation, except for the **Solar beam radiation (not required)** input, which may be left empty if you choose not to measure it directly.

---

## Inputs

| Label | Unit | Mandatory? | Meaning & Range |
|-------|------|-----------|-----------------|
| **Cable name** | — | Yes | Name of the conductor being measured (displayed from catalog). |
| **Ambient temperature** | °C | Inherited | Air temperature at measurement time (read-only, copied from **Terrain data** tab). |
| **Transit** | A | Yes | Current flowing through the conductor at measurement time. **Range: 0–4000 A**. Validation: minimum 0 A, maximum 4000 A. |
| **Wind speed** | km/h or m/s | Inherited | Wind speed from **Terrain data** tab (with unit toggle). Defaults to 0 if not set. |
| **Wind direction** | — | Inherited | Cardinal direction (North, North-East, East, South-East, South, South-West, West, North-West) from **Terrain data** tab. |
| **Wind incidence** | degrees | Computed | Angle of wind attack on the cable. **Auto mode** (default): computed from cable azimuth and wind direction; **Perpendicular mode**: fixed at 90°. Requires azimuth and wind direction to compute. |
| **Solar beam radiation** | W/m² | No | Optional measured direct solar irradiance. **Range: 0–2000 W/m²**. If left empty, it will not be used in the calculation (see note below). Click **Estimate** to auto-compute from sky cover and location. |
| **Sky cover** | — | Yes | Cloud coverage on N0–N8 scale (N0 = clear sky, N8 = fully covered). Select from dropdown. Can be auto-estimated from measured solar radiation if you click **Estimate**. |
| **Diffuse solar radiation** | W/m² | Computed | Scattered (diffuse) solar irradiance on a horizontal plane, automatically computed from date, time, location, and sky cover. |
| **Solar beam radiation** | W/m² | Computed | Direct solar irradiance on a horizontal plane, automatically computed. |
| **Diffuse + solar beam radiation** | W/m² | Computed | Total global horizontal irradiance (sum of diffuse and beam). |

---

## How to Use

### 1. Fill Mandatory Inputs

Ensure the **Terrain data** tab is completed first (coordinates, date, time, cable name, etc.). The temperature calculation tab inherits:
- Ambient temperature  
- Date and time  
- Coordinates (longitude, latitude, altitude)  
- Cable azimuth  
- Wind speed and direction  

### 2. Select Sky Cover

Choose a sky cover value (N0–N8) from the **Sky cover** dropdown. If unsure:

1. Enter or measure the **Solar beam radiation** value (0–2000 W/m²).  
2. Click the **Estimate** button.  
   - {{app_name}} will use solar geometry and your measurement to infer the sky cover.  
   - The dropdown will auto-populate; you can still override it manually.  
   - If the time is during night, an error message appears: "Sky cover could not be estimated from the provided inputs. Please check the values and try again."

### 3. Enter Transit (Current)

Type the measured current (0–4000 A) in the **Transit** field. This is the steady-state or snapshot current at measurement time.

### 4. Adjust Wind Incidence (Optional)

- **Auto mode** (default): Wind incidence is computed automatically from cable azimuth and wind direction.  
  - If azimuth or wind direction is missing, a warning appears: "Wind direction and azimuth are required."  
- **Perpendicular mode**: Wind hits the cable perpendicularly (90°). Use this if measurement conditions differ from the canonical azimuth.  

### 5. Click Calculate

Once all mandatory fields are filled and within bounds, the **Calculate** button becomes active. Click it to run the thermal equilibrium calculation.

---

## Results

After calculation completes, a results section expands below showing:

| Label | Unit | Meaning |
|-------|------|---------|
| **Cable temperature** | °C | Steady-state cable core temperature under the measured conditions. Typically ranges 20–80°C depending on current and ambient conditions. |
| **Uncertainty cable temperature** | °C | Uncertainty range (e.g., ±1.0°C) accounting for measurement errors and model approximations. |
| **Solar flux on the cable** | W/m² | Solar radiation absorbed by the cable cross-section (currently always empty/null in computation, reserved for future use). |

### Example Result
```
Cable temperature: 45.3°C
Uncertainty cable temperature: 1.1°C
Solar flux on the cable: —
```

---

## Important Notes

### Solar Beam Radiation Field

The **Solar beam radiation (not required)** input is optional. Its purpose is to help you estimate sky cover if you have a direct measurement. After estimation, the field displays: **"It won't be used in the calculation."**

The thermal calculation uses the **Diffuse + solar beam radiation** total (automatically computed from sky cover), not the measured value you enter.

### Validation Errors

- **"Minimum transit value: 0 A."** — Your transit value is below 0 A.  
- **"Maximum transit value: 4000 A."** — Your transit value exceeds 4000 A.  
- **"All fields are mandatory for temperature calculation."** — One or more mandatory field is empty (shown at top of tab).  

### Weather-Dependent Limitations

- Measurement at **night** (when sun is below horizon) will fail the **Estimate** button with an error, since solar radiation is zero. Provide a sky cover manually instead.  
- Calculation assumes **steady-state** conditions; transient effects (e.g., sudden current change) are not modeled.

---

## Links to Related Pages

- {doc}`Terrain data <terrain_data>` — Set coordinates, date, time, cable details.  
- {doc}`Parameter calculation <parameter_calculation>` — Use PAPOTO or tangent aiming methods to compute span sag parameter.  
- {doc}`Parameter at 15°C without wind <parameter_15c_without_wind>` — Calibrate parameter to standard conditions using the computed cable temperature.
