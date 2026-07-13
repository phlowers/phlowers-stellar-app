import logging
from copy import deepcopy

from mechaphlowers import SectionStudy
from mechaphlowers.core.geometry.distances import DistanceEngine

from stellar_engine.core.conformity.compute import (
    ConformityPlotRules,
    ConformityResult,
)
from stellar_engine.core.conformity.scenarios import (
    ClimaticPoint,
    RuleClimaticCondition,
    build_scenario_bulk,
)
from stellar_engine.entities.conformity import (
    ConformityParametersInput,
    ElectricTensionMapper,
    RuleDistanceInput,
    TensionRules,
)
from stellar_engine.entities.errors import ObstacleNotFoundError

logger = logging.getLogger("stellar_engine")


def get_conformity(python_inputs: dict, study: SectionStudy) -> dict:
    """Compute conformity for an obstacle against regulatory rules.

    Args:
        python_inputs: Input dictionary containing obstacle, rules, and parameters
        study: SectionStudy instance with the current study state

    Returns:
        Dictionary representation of ConformityResult
    """

    # get data from inputs --------------

    logger.debug(f"Getting conformity for inputs: {python_inputs}")
    obstacle_id = python_inputs.get("obstacle", {}).get("uuid")
    obstacle_support_index = python_inputs.get("obstacle", {}).get(
        "supportIndex"
    )
    electric_tension_code = python_inputs.get("electricTension")
    try:
        if not isinstance(electric_tension_code, str):
            raise ValueError(
                "Invalid electric tension code: missing or non-string value"
            )
        electric_tension = ElectricTensionMapper.get_code(
            electric_tension_code
        )
        if electric_tension is None:
            raise ValueError(
                f"Invalid electric tension code: {electric_tension_code}"
            )
    except ValueError as e:
        logger.error(str(e))
        raise

    rule_distances_data = python_inputs.get("rulesDistances")
    rules_climatic_conditions_data = python_inputs.get(
        "rulesClimaticConditions"
    )
    parameters_data = python_inputs.get("form", {})

    # Validation ------------------------------
    # - Validate and create RuleDistance objects
    if rule_distances_data is None or rule_distances_data == []:
        logger.warning(
            "No rule distances provided. Returning empty conformity result."
        )
        logger.warning(
            "This should not happen, button should have been disabled."
        )
        return {}

    print(f"rule_distances_data: {rule_distances_data}")
    try:
        rule_distances = [
            RuleDistanceInput.from_dict(rd) for rd in rule_distances_data
        ]
    except ValueError as e:
        logger.error(f"Invalid rule distances data: {e}")
        raise

    # - Validate and create ConformityParameters object
    try:
        parameters = ConformityParametersInput.from_dict(parameters_data)

    except ValueError as e:
        logger.error(f"Invalid conformity parameters data: {parameters_data}")
        logger.error(f"Invalid form parameters: {e}")
        raise

    # - Validate and create RuleClimaticCondition objects
    # --- set wind pressure for "WindZoneInput" cases before
    ClimaticPoint.default_wind_pressure = parameters.wind_pressure
    # --- build RuleClimaticCondition objects
    if not rules_climatic_conditions_data:
        logger.warning(
            "No climatic conditions provided. Returning empty conformity result."
        )
        return {}

    try:
        rules_climatic_conditions = (
            RuleClimaticCondition.build_rules_climatic_conditions(
                rules_climatic_conditions_data
            )
        )
    except ValueError as e:
        logger.error(f"Invalid climatic conditions data: {e}")
        raise

    # Build objects ------------------------------
    # Build TensionRules objects for each rule type
    tension_rules = TensionRules.build_tension_rules(
        electric_tension, rule_distances
    )

    # - Create ConformityPlotRules object
    conformity_plot_rules = ConformityPlotRules(
        parameters.conformity_plot,
        tension_rules=tension_rules,
    )

    # Build scenarios
    scenarios_by_rule = build_scenario_bulk(
        rules_climatic_conditions, parameters, tension_rules
    )

    logger.debug(f"Built scenarios by rule: {scenarios_by_rule}")

    # Init objects for simulation
    dist_engine = DistanceEngine()
    study_copy = deepcopy(study)
    ground_supports = study_copy.position_engine.coords_calculator.supports_ground_coords.copy()
    dist_engine.add_span_frame(
        ground_supports[obstacle_support_index],
        ground_supports[obstacle_support_index + 1],
    )

    try:
        obstacle_coords = study_copy.position_engine.coords_calculator.obstacles_points.dict_coords().get(
            obstacle_id
        )
        if obstacle_coords is None:
            raise KeyError(obstacle_id)
    except KeyError:
        logger.error(f"Obstacle with uuid: {obstacle_id} not found in study.")
        raise ObstacleNotFoundError(
            f"Obstacle with uuid: {obstacle_id} not found in study."
        )

    # Initialize conformity result structure with empty zones for each rule type
    conformity_result = ConformityResult.create_with_empty_zones(
        obstacle_id=obstacle_id,
        rule_types=list(tension_rules.keys()),
    )
    u_plane, v_plane = dist_engine.define_distance_plane(obstacle_coords[0])
    conformity_result.set_plane_basis(u_plane=u_plane, v_plane=v_plane)

    # Simulation ------------------------------

    for rule_type, rule_scenarios in scenarios_by_rule.items():
        for scenario in rule_scenarios:
            logger.debug(f"Processing scenario: {scenario.to_dict()}")

            # apply the scenario to the study copy
            study.solve_change_state(
                wind_pressure=scenario.target_state.wind_pressure,
                new_temperature=scenario.target_state.new_temperature,
            )
            # add the cable curve to distance engine
            dist_engine.add_curves(
                study.position_engine.coords_calculator.get_spans(
                    frame="section"
                ).coords[obstacle_support_index]
            )
            # get the distance from the obstacle to the cable curve in the section plane
            dist_result = dist_engine.plane_distance(
                obstacle_coords[0], frame="section"
            )

            projected_point = conformity_result.project_onto_plane(
                dist_result.point_target,
            )

            logger.debug(
                f"Distance result for rule {rule_type}: {dist_result}"
            )
            logger.debug(
                f"Projected point for rule {rule_type}: {projected_point}"
            )
            logger.debug(
                f"cable point for rule {rule_type}: {dist_result.point_target}"
            )

            # project into the obstacle plane and save
            conformity_result.add_zone_2d_point(
                rule_type=scenario.rule_type,
                point=projected_point,
                radius=conformity_plot_rules.get_radius(
                    scenario.security_distance
                ),
            )

            conformity_result.table_results[rule_type].set_conformity_point(
                scenario.conformity_point
            )
            conformity_result.table_results[rule_type].set_target_state(
                scenario.target_state, scenario.conformity_point
            )
            conformity_result.table_results[rule_type].set_projected_point(
                projected_point, scenario.conformity_point
            )
            conformity_result.table_results[rule_type].set_distance(
                dist_result, scenario.conformity_point
            )
            conformity_result.table_results[rule_type].set_rule_distances(
                scenario.security_distance, scenario.conformity_point
            )

    # Add obstacle point
    conformity_result.add_obstacle_3d_point(point=obstacle_coords[0])

    # Build zone plots (only for non-cable_track conformity plots)
    for zone_name, zone_conformity in conformity_result.conformity.items():
        if not zone_conformity.points:
            logger.debug(
                f"No points for zone {zone_name}, skipping zone plot generation."
            )
            continue
        zone_plot = conformity_plot_rules.get_zone(
            zone_conformity.points, rule_type=zone_name
        )
        if zone_plot is None:
            continue
        conformity_result.conformity[zone_name].zone_plot = zone_plot

    result_dict = conformity_result.to_dict()
    logger.debug(f"Conformity result: {result_dict}")

    return result_dict
