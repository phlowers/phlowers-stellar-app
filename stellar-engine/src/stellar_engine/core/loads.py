import logging

from mechaphlowers import SectionStudy, units
import numpy as np
from stellar_engine.entities.errors import SupportOutOfRangeError
from stellar_engine.utils import make_debug_log


logger = logging.getLogger("stellar_engine")

debug_log = make_debug_log(logger, prefix="LOADS")

@debug_log
def delete_all_loads(study: SectionStudy):

    n_spans = len(study.balance_engine)
    study.set_loads(np.zeros(n_spans), np.zeros(n_spans))
    return {"success": True}

@debug_log
def delete_load(support_index: int, study: SectionStudy):

    n_spans = len(study.balance_engine)
    if support_index < 0 or support_index >= n_spans:
        raise SupportOutOfRangeError(
            f"Support index {support_index} is out of bounds for the number of spans {n_spans}."
        )

    load_position_array, load_mass_array = build_loads_arrays(
        0.0, 0.0, support_index, n_spans, study
    )
    study.set_loads(load_position_array, load_mass_array)

    return {"success": True}

@debug_log
def build_loads_arrays(
    load_position_distance: float,
    load_mass: float,
    support_index: int,
    n_spans: int,
    study: SectionStudy,
) -> tuple[np.ndarray, np.ndarray]:
    """Builds the load position and mass arrays for the study."""

    load_position_array = study.balance_engine.span_loads.load_position.copy()
    load_mass_array = study.balance_engine.span_loads.load_mass.copy()

    load_position_array[support_index] = load_position_distance
    load_mass_array[support_index] = load_mass

    return load_position_array, load_mass_array



def apply_span_loads(study: SectionStudy, span_loads: list):
    """Parse span loads and apply them to the engine, clearing previous loads when needed.

    If ``span_loads`` is empty or falsy, all loads are zeroed out on the engine.
    Otherwise, each span load dict is converted to position (meters) and mass (kg)
    arrays via :func:`parse_span_loads`, then passed to ``study.add_loads``.

    Args:
        study: The active section study whose engine will be updated.
        span_loads: List of span load dicts, each containing at minimum
            ``loadPosition``, ``loadWeight``, ``type`` and ``referenceSupport``.
    """
    n_spans = len(study.balance_engine)
    if not span_loads:
        study.add_loads(np.zeros(n_spans), np.zeros(n_spans))
        return {"success": True}
    load_position_meters, load_mass = parse_span_loads(study, span_loads)
    logger.debug("Applying span loads: positions=%s, masses=%s", load_position_meters, load_mass)
    study.add_loads(load_position_meters, load_mass)
    return {"success": True}


def parse_span_loads(
    study: SectionStudy, span_loads: list
) -> tuple[np.ndarray, np.ndarray]:
    """Convert raw span load dicts into position and mass arrays."""
    load_position_list = []
    load_weight_list_daN = []
    engine = study.balance_engine
    span_lengths = engine.section_array.data["span_length"].to_numpy()
    for index, span in enumerate(span_loads):
        try:
            if span['referenceSupport'] == 'LEFT':
                load_position_list.append(span["loadPosition"])
            elif span['referenceSupport'] == 'RIGHT':
                if 0 <= index < len(span_lengths):
                    span_length = span_lengths[index]
                    load_position_list.append(
                        span_length - span["loadPosition"]
                    )
                else:
                    logger.warning(
                        "Span load index %s is out of bounds for span_length array (size %s). "
                        "Defaulting load position to 0.",
                        index,
                        len(span_lengths),
                    )
                    load_position_list.append(0)
            else:
                load_position_list.append(0)

            if span['type'] == 'punctual':
                load_weight_list_daN.append(span["loadWeight"])
            else:
                load_weight_list_daN.append(0.01)
        except KeyError as e:
            logger.warning(
                "Span load at index %s is missing required key %s. "
                "Skipping with defaults (position=0, weight=0.01).",
                index,
                e,
            )
            load_position_list.append(0)
            load_weight_list_daN.append(0.01)
    load_mass_kg = units(load_weight_list_daN, 'daN').to('kg').magnitude
    return np.array(load_position_list), np.array(load_mass_kg)

