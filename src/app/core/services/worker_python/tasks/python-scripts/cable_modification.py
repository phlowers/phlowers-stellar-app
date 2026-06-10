from stellar_engine.entities import output


def cable_modification(js_inputs: dict):
    """Apply a cable length modification on a span and return the updated coordinates.

    TODO: Replace simulation with real mechaphlowers cable modification API.
    Current simulation uses a temperature delta to approximate cable length change.

    Expected inputs:
    - spanIndex (int): index of the span to modify
    - widthCable ('lengthening' | 'shortening'): direction of modification
    - sizeCable (float): size of the modification in meters
    - distanceSupportRef (float): distance from reference support in meters
    - supportRef ('LEFT' | 'RIGHT'): reference support for the modification
    """
    global engine, plt_line, base_plt_line, base_engine, js_to_python, get_coordinates

    _inputs = js_to_python(js_inputs)  # type: ignore
    span_index = _inputs["spanIndex"]
    width_cable = _inputs["widthCable"]  # 'lengthening' | 'shortening'
    size_cable = float(_inputs["sizeCable"])

    print(
        f"[cable_modification] span_index={span_index}, widthCable={width_cable}, sizeCable={size_cable}m"
    )

    # Simulation: convert cable length change → equivalent temperature delta
    # Formula: ΔL = L * α * ΔT  →  ΔT ≈ sizeCable / (span_length_m * 23e-6)
    # Approximation with a fixed span length of 300m and α=23e-6 for aluminum/ACSR
    ALPHA = 23e-6  # thermal expansion coefficient for ACSR [1/°C]
    APPROX_SPAN_LENGTH_M = 300.0
    delta_temp = size_cable / (APPROX_SPAN_LENGTH_M * ALPHA)

    # Lengthening → warmer cable → more sag
    # Shortening  → colder cable → less sag
    if width_cable == "shortening":
        delta_temp = -delta_temp

    base_temperature = 15.0  # °C reference
    simulated_temperature = base_temperature + delta_temp

    print(
        f"[cable_modification] simulated temperature = {simulated_temperature:.1f}°C (delta={delta_temp:+.1f}°C)"
    )

    engine.solve_adjustment()
    engine.solve_change_state(
        new_temperature=simulated_temperature,
        ice_thickness=0.0,
        wind_pressure=0.0,
        wind_direction="clockwise",
    )

    section_length = len(engine.section_array.data)
    base_section_length = (
        len(base_engine.section_array.data) if base_engine else section_length
    )

    return {
        "current": output.get_coordinates(
            engine, plt_line, False, 0, section_length - 1
        ),
        "base": output.get_coordinates(
            engine, base_plt_line, False, 0, base_section_length - 1
        )
        if base_plt_line
        else None,
    }
