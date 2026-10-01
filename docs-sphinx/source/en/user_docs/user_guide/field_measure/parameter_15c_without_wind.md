# Parameter at 15°C without wind

## Overview

This tab calculates the cable's **parameter at a standardized reference condition** — 15°C temperature and zero wind — from your field measurements. The result is a central value plus and minus uncertainty bounds.

This standardized parameter is useful because:
- It allows comparison of measurements taken in different weather conditions
- It provides a baseline for identifying cable wear or degradation over time
- It serves as an input for creating an **initial condition** in the mechanical model

## Update Mode: Auto vs Manual

### Auto mode

**Auto** (default) automatically fetches the four required values from previous tabs:
- **Parameter**: from the **Parameter calculation** tab (PAPOTO, tangent aiming, or PEP result)
- **Parameter uncertainty**: also from the **Parameter calculation** tab
- **Cable temperature**: from the **Temperature calculation** tab
- **Temperature uncertainty**: also from the **Temperature calculation** tab

Use **Auto** when you trust the values computed in prior tabs.

### Manual mode

**Manual** lets you type all four values directly. Use this if:
- You have independent or corrected measurements
- You want to override prior tab values
- You are testing different scenarios

When you switch from **Auto** to **Manual**, fields that you have not yet filled in are automatically pre-filled with the **Auto** values (truncated for display). Your existing manual entries are never overwritten.

## Input Fields

When in **Manual** mode, you must enter all of the following:

| Field | Unit | Meaning | Example |
|---|---|---|---|
| **Parameter (Papoto, etc.)** | m | Measured cable sag or extension | 2500.1 |
| **Uncertainty parameter** | m | Measurement uncertainty (standard deviation or similar) | 15.5 |
| **Cable temperature** | °C | Cable temperature at the time of measurement | 18.5 |
| **Uncertainty cable temperature** | °C | Temperature measurement uncertainty | 1.8 |

All four fields are **mandatory**. If any field is missing or empty when you click **Calculate setting parameter at 15°C**, you will see the error:

> **All fields are mandatory for parameter calculation at 15°C**

## How to Calculate

1. Choose your **Update mode** (**Auto** or **Manual**)
   - In **Auto**, the fields auto-populate and are read-only
   - In **Manual**, enter your four values in the input fields
2. Click **Calculate setting parameter at 15°C**
3. Wait for the calculation to complete (a loading indicator appears during computation)
4. Three results appear below:
   - **Parameter at 15°C - uncertainty** (lower bound)
   - **Parameter at 15°C** (central value)
   - **Parameter at 15°C + uncertainty** (upper bound)

## Understanding the Results

The three results represent:

$$P_{min} = \text{calibrate}(P - 0.5 \times 1.65 \times Inc_P, \, T - 0.9 \times 1.65 \times Inc_T)$$

$$P = \text{calibrate}(P, \, T)$$

$$P_{max} = \text{calibrate}(P + 0.5 \times 1.65 \times Inc_P, \, T + 0.9 \times 1.65 \times Inc_T)$$

where:
- $P$ = measured parameter, $Inc_P$ = its uncertainty
- $T$ = measured cable temperature, $Inc_T$ = its uncertainty
- 1.65 is the **coverage factor**
- 0.9 and 0.5 are the weighting factors applied to the temperature and parameter uncertainties

## Creating an Initial Condition

Each of the three results has a **Create initial condition** button. Clicking it:

1. Opens a dialog to create a new **initial condition** (baseline state for mechanical calculations)
2. Pre-fills the **base parameter** with the selected result (rounded to 1 decimal place)
3. Pre-fills the **base temperature** with 15°C
4. Lets you enter a name and other optional fields
5. Saves the initial condition when you click the confirm button in the dialog

From there, you can use this initial condition in the **Studio** tab to run mechanical studies (tension, sag calculations) at that baseline state.

## Error Message

If you see:

> **All fields are mandatory for parameter calculation at 15°C**

Check that:
- In **Auto** mode: all prior tabs have completed their calculations successfully
- In **Manual** mode: all four input fields contain numeric values and are not empty
