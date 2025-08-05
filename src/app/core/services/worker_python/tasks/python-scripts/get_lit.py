import numpy as np
import pandas as pd
from mechaphlowers import SectionDataFrame
from mechaphlowers.entities.arrays import SectionArray
from mechaphlowers.entities.arrays import CableArray, WeatherArray
import mechaphlowers as mph
from mechaphlowers import plotting as plt


def generate_section_array(size_section=15):
    # Generate a SectionArray
    name = []
    suspension = []
    altitude = []
    crossarm_length = []
    line_angle = []
    insulator_length = []
    span_length = []

    for i in range(size_section):
        name.append(f"Section {i}")
        if i == 0 or i == size_section - 1:
            suspension.append(False)
            insulator_length.append(0.0)
        else:
            suspension.append(True)
            insulator_length.append(float(np.random.uniform(5, 10)))
        altitude.append(np.random.uniform(20, 150))
        crossarm_length.append(4.0)

        if i == size_section - 1:
            span_length.append(np.nan)
        else:
            span_length.append(float(np.random.uniform(80, 1000)))
        line_angle.append(np.random.uniform(0, 60))

    section_data = {
        "name": name,
        "suspension": suspension,
        "conductor_attachment_altitude": altitude,
        "crossarm_length": crossarm_length,
        "insulator_length": insulator_length,
        "span_length": span_length,
        "line_angle": line_angle,
    }
    return pd.DataFrame(section_data)


def add_obstacle(df, x, y, z, type_obstacle, name_obstacle, support):
    df.x.cumsum()
    new_df = pd.DataFrame(
        {
            "x": [x],
            "y": [y],
            "z": [z],
            "type": [type_obstacle],
            "support": [support],
            "section": ["obstacle"],
        }
    )
    return pd.concat([df, new_df], ignore_index=True)


def main():
    np.random.seed(142)
    # np.random.seed(42)
    size_multiple = 5
    size_section = size_multiple * 5
    df = generate_section_array(size_section)
    mph.options.graphics.resolution = res = 10

    section = SectionArray(data=df)

    # set sagging parameter and temperatur
    section.sagging_parameter = 800
    section.sagging_temperature = 15

    # Provide section to SectionDataFrame
    frame = SectionDataFrame(section)
    cable_array = CableArray(
        pd.DataFrame(
            {
                "section": [345.55],
                "diameter": [22.4],
                "linear_weight": [9.55494],
                "young_modulus": [59],
                "dilatation_coefficient": [23],
                "temperature_reference": [15],
                "a0": [0],
                "a1": [59],
                "a2": [0],
                "a3": [0],
                "a4": [0],
                "b0": [0],
                "b1": [0],
                "b2": [0],
                "b3": [0],
                "b4": [0],
            }
        )
    )
    frame.add_cable(cable_array)

    weather = WeatherArray(
        pd.DataFrame(
            {
                "ice_thickness": [0] * size_section,
                "wind_pressure": [540.12, 0.0, 212.0, 53.0, 0.0] * size_multiple,
            }
        )
    )
    frame.add_weather(weather=weather)

    def get_section(frame, shift_arm, shift_altitude, phase_name):
        save1 = frame.section_array._data.conductor_attachment_altitude
        save2 = frame.section_array._data.crossarm_length

        frame.section_array._data.conductor_attachment_altitude += shift_altitude
        frame.section_array._data.crossarm_length += shift_arm
        frame.update()
        line_points = frame.get_coordinates()

        support_points = plt.plot.get_support_points(frame.data)

        insulator_points = plt.plot.get_insulator_points(frame.data)

        spans = pd.DataFrame(line_points, columns=["x", "y", "z"])
        spans["support"] = df.loc[0 : size_section - 2, "name"].repeat(res).values
        spans["type"] = "span"

        supports = pd.DataFrame(support_points, columns=["x", "y", "z"])
        supports["support"] = df.name.repeat(6).values
        supports["type"] = "support"

        insulators = pd.DataFrame(insulator_points, columns=["x", "y", "z"])
        insulators["support"] = df.name.repeat(3).values
        insulators["type"] = "insulator"

        pdf = pd.concat([spans, supports, insulators], ignore_index=True)
        pdf["section"] = phase_name

        frame.section_array._data.conductor_attachment_altitude = save1
        frame.section_array._data.crossarm_length = save2

        return pdf

    section_0 = get_section(frame, -4, 10, "garde")
    section_1 = get_section(frame, 0, -10, "phase_1")
    section_2 = get_section(frame, -8, -5, "phase_2")
    section_3 = get_section(frame, 0, 0, "phase_3")
    lit = pd.concat([section_0, section_1, section_2, section_3], ignore_index=True)
    globals()["test_frame"] = frame
    globals()["test_weather"] = weather

    lit["color_select"] = lit.section + lit.type

    return lit.to_dict()


result = main()
