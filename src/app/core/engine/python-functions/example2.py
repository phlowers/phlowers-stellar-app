import numpy as np
import pandas as pd
import plotly.graph_objects as go

from mechaphlowers import SectionDataFrame
from mechaphlowers.entities.arrays import SectionArray
from mechaphlowers.entities.arrays import CableArray, WeatherArray
import mechaphlowers as mph


np.random.seed(142)

inputs = js_inputs.to_py()  

cable = inputs["cable"]
sections = inputs["sections"]

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


def main():
    size_multiple = 5
    size_section = size_multiple*5
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

    # Display figure
    fig = go.Figure()
    frame.plot.line3d(fig, "analysis")
    fig.update_layout(
        width=1200,
        height=800,
        autosize=False,
    )
    result = fig.to_json()
    # fig.show()
    return result

result = main()