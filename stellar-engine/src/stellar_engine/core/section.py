import pandas as pd

from stellar_engine.entities.inputs import Support


def generate_section_array(supports: list[Support]):
    # Generate a SectionArray
    name = []
    suspension = []
    altitude = []
    crossarm_length = []
    line_angle = []
    insulator_length = []
    span_length = []
    insulator_mass = []
    load_mass = []
    load_position = []
    ground_altitude = []

    for index, support in enumerate(supports):
        name.append(support.name or f"Support {index}")
        if index == 0 or index == len(supports) - 1:
            suspension.append(False)
        else:
            suspension.append(True)
        altitude.append(support.attachmentHeight)
        crossarm_length.append(support.armLength or 0)
        insulator_length.append(support.chainLength or 1)
        span_length.append(support.spanLength)
        line_angle.append(support.spanAngle)
        insulator_mass.append(support.chainWeight or 0)
        load_mass.append(0)
        load_position.append(0)
        ground_altitude.append(support.supportFootAltitude)

    section_data = {
        "name": name,
        "suspension": suspension,
        "conductor_attachment_altitude": altitude,
        "crossarm_length": crossarm_length,
        "insulator_length": insulator_length,
        "insulator_mass": insulator_mass,
        "load_mass": load_mass,
        "load_position": load_position,
        "span_length": span_length,
        "line_angle": line_angle,
        "ground_altitude": ground_altitude,
    }
    return pd.DataFrame(section_data)
