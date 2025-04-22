import numpy as np
import pandas as pd
import plotly.graph_objects as go

from mechaphlowers import SectionDataFrame
from mechaphlowers.entities.arrays import SectionArray
from mechaphlowers.entities.arrays import CableArray, WeatherArray
import mechaphlowers as mph
from mechaphlowers import plotting as plt


import plotly.express as px

np.random.seed(142)

inputs = js_inputs.to_py()  

cable = inputs["cable"]
sections = inputs["sections"]

size_section = len(sections["name"])
res = 100

print("cable is", cable)
print("sections is", sections)

# def generate_section_array(size_section=15):
#     # Generate a SectionArray
#     name = []
#     suspension = []
#     altitude = []
#     crossarm_length = []
#     line_angle = []
#     insulator_length = []
#     span_length = []
    
#     for i in range(size_section):
#         name.append(f"Section {i}")
#         if i == 0 or i == size_section-1:
#             suspension.append(False)
#             insulator_length.append(0.)
#         else:
#             suspension.append(True)
#             insulator_length.append(float(np.random.uniform(5, 10)))
#         altitude.append(np.random.uniform(20, 150))
#         crossarm_length.append(4.0)
        
        
#         if i == size_section-1:
#             span_length.append(np.nan)
#         else:
#             span_length.append(float(np.random.uniform(80, 1000))) 
#         line_angle.append(np.random.uniform(0, 60))
        
            
#     section_data = {
#         "name": name,
#         "suspension": suspension,
#         "conductor_attachment_altitude": altitude,
#         "crossarm_length": crossarm_length,
#         "insulator_length": insulator_length,
#         "span_length": span_length,
#         "line_angle": line_angle
#     }
    
#     return pd.DataFrame(section_data)


def get_canton(df, frame, shift_arm, shift_altitude, phase_name):
    
    save1 = frame.section_array._data.conductor_attachment_altitude
    save2 = frame.section_array._data.crossarm_length
    
    frame.section_array._data.conductor_attachment_altitude += shift_altitude
    frame.section_array._data.crossarm_length += shift_arm
    frame.update()
    line_points = frame.get_coordinates()

    support_points = plt.plot.get_support_points(frame.data)

    insulator_points = plt.plot.get_insulator_points(frame.data)
    
    spans = pd.DataFrame(line_points, columns=["x", "y", "z"])
    spans["support"] = df.loc[0:size_section-2,"name"].repeat(res).values
    spans["type"] = "span"
    
    supports = pd.DataFrame(support_points, columns=["x", "y", "z"])
    supports["support"] = df.name.repeat(6).values
    supports["type"] = "support"
    
    insulators = pd.DataFrame(insulator_points, columns=["x", "y", "z"])
    insulators["support"] = df.name.repeat(3).values
    insulators["type"] = "insulator"
    
    
    pdf = pd.concat([spans,supports,insulators], ignore_index=True)
    pdf["canton"] = phase_name
    
    frame.section_array._data.conductor_attachment_altitude = save1
    frame.section_array._data.crossarm_length = save2
    
    return pdf

def main():
    # size_multiple = 5
    # size_section = size_multiple*5
    # df = generate_section_array(size_section)
    df = pd.DataFrame(sections)
    print(df)
    mph.options.graphics.resolution = res = 150

    section = SectionArray(data=df)

    # set sagging parameter and temperatur 
    section.sagging_parameter = 800
    section.sagging_temperature = 15

    # Provide section to SectionDataFrame
    frame = SectionDataFrame(section)
    cable_array = CableArray(
    pd.DataFrame(
        {
            "section": [cable["section"]],
            "diameter": [cable["diameter"]],
            "linear_weight": [cable["linear_weight"]],
            "young_modulus": [cable["young_modulus"]],
            "dilatation_coefficient": [cable["dilatation_coefficient"]],
            "temperature_reference": [cable["temperature_reference"]],
            "a0": [cable["a0"]],
            "a1": [cable["a1"]],
            "a2": [cable["a2"]],
            "a3": [cable["a3"]],
            "a4": [cable["a4"]],
            "b0": [cable["b0"]],
            "b1": [cable["b1"]],
            "b2": [cable["b2"]],
            "b3": [cable["b3"]],
            "b4": [cable["b4"]],
        }
        )
    )
    frame.add_cable(cable_array)

    # fig = go.Figure()
    # frame.plot.line3d(fig, "analysis")
    # fig.update_layout(
    #     width=600,
    #     height=300,
    #     autosize=False,
    #     showlegend=False,
    #     margin=dict(l=0, r=0, t=0, b=0)
    # )
    # result = fig.to_json()
    canton_1 = get_canton(df, frame, 0, 0, "phase_1")

    
    return result

result = main()