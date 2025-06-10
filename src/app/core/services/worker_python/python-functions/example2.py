import numpy as np
import pandas as pd
import plotly.graph_objects as go
import json
from mechaphlowers import SectionDataFrame
from mechaphlowers.entities.arrays import SectionArray
from mechaphlowers.entities.arrays import CableArray, WeatherArray
import mechaphlowers as mph
from mechaphlowers import plotting as plt


import plotly.express as px


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
        if i == 0 or i == size_section-1:
            suspension.append(False)
            insulator_length.append(0.)
        else:
            suspension.append(True)
            insulator_length.append(float(np.random.uniform(5, 10)))
        altitude.append(np.random.uniform(20, 150))
        crossarm_length.append(4.0)
        
        
        if i == size_section-1:
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
        "line_angle": line_angle
    }
    return pd.DataFrame(section_data)

def add_obstacle(df, x,y,z,type_obstacle, name_obstacle, support):

    df.x.cumsum()
    new_df = pd.DataFrame({
        "x": [x],
        "y": [y],
        "z": [z],
        "type": [type_obstacle],
        "support": [support],
        "canton": ["obstacle"]
    })
    return pd.concat([df,new_df], ignore_index=True)



def main():
    np.random.seed(142)
    # np.random.seed(42)
    size_multiple = 5
    size_section = size_multiple*5
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
                "ice_thickness": [0]*size_section,
                "wind_pressure": [540.12, 0.0, 212.0, 53.0, 0.]*size_multiple,
            }
        )
    )
    frame.add_weather(weather=weather)

    # Display figure
    fig = go.Figure()
    frame.plot.line3d(fig, "full")
    fig.update_layout(
        width=1200,
        height=300,
        autosize=True,
        showlegend=False
    )
    json_3d = fig.to_json()
    
    def get_canton(frame, shift_arm, shift_altitude, phase_name):
    
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
    
    canton_0 = get_canton(frame, -4, 10, "garde")
    canton_1 = get_canton(frame, 0, -10, "phase_1")
    canton_2 = get_canton(frame, -8, -5, "phase_2")
    canton_3 = get_canton(frame, 0, 0, "phase_3")
    
    section_0 = "Section 0"
    section_1 = "Section 1"
    section_2 = "Section 2"

    canton_1 = add_obstacle(canton_1, 150, 0, 20, "toit", "obstacle_1", section_0)
    canton_1 = add_obstacle(canton_1, 150, 10, 30, "toit", "obstacle_1", section_0)
    canton_1 = add_obstacle(canton_1, 150, 20, 40, "toit", "obstacle_1", section_0)

    canton_1 = add_obstacle(canton_1, 700, -5, 30, "arbre", "obstacle_2", section_1)
    canton_1 = add_obstacle(canton_1, 700, -5, 0, "arbre", "obstacle_2", section_1)

    canton_1 = add_obstacle(canton_1, 800, 0, 0, "sol", "obstacle_2", section_2)
    canton_1 = add_obstacle(canton_1, 900, 0, -30, "sol", "obstacle_2", section_2)
    canton_1 = add_obstacle(canton_1, 1000, 0, -90, "sol", "obstacle_2", section_2)   
    canton_1 = add_obstacle(canton_1, 1100, 0, -150, "sol", "obstacle_2", section_2)
    canton_1 = add_obstacle(canton_1, 1200, 0, -200, "sol", "obstacle_2", section_2)
    canton_1 = add_obstacle(canton_1, 1300, 0, -190, "sol", "obstacle_2", section_2)
    canton_1 = add_obstacle(canton_1, 1400, 0, -90, "sol", "obstacle_2", section_2)
    canton_1 = add_obstacle(canton_1, 1590, 0, 0, "sol", "obstacle_2", section_2)
    lit = pd.concat([canton_0,canton_1,canton_2,canton_3], ignore_index=True)
    lit["color_select"] = lit.canton + lit.type
    
    # fig2
    
    fig = px.line(canton_1, x="x", y="z", color="type",hover_data="support")

    fig.update_traces(line=dict(width=5))

    aspect_ratio = dict(x=1, y=0.05, z=0.5)

    fig.update_layout(
            scene=dict(
                aspectratio=aspect_ratio,
                aspectmode="manual",
                camera=dict(
                    up=dict(x=0, y=0, z=1),
                    eye=dict(
                        x=0,
                        y=-1 / 1,
                        z=0,
                    ),
                ),
            )
        )

    # fig.update_layout(
    #     xaxis=dict(
    #         rangeselector=dict(
    #         ),
    #         rangeslider=dict(
    #             visible=True,
    #             # thickness=.9
    #         ),
    #         type="linear"
    #     )
    # )
    json_2d = fig.to_json()
    
    fig = px.line(lit[lit.type.isin(["insulator", "support", ])], x="y", y="z", color="type",hover_data=["canton","support"], animation_frame="support", line_group="canton", height=1000, width=400)

    fig.update_traces(line=dict(width=5))

    aspect_ratio = dict(x=1, y=0.05, z=0.5)

    fig.update_layout(
            scene=dict(
                aspectratio=aspect_ratio,
                aspectmode="data",
                camera=dict(
                    up=dict(x=0, y=1, z=1),
                    eye=dict(
                        x=0,
                        y=-1 / 1,
                        z=0,
                    ),
                ),
            )
        )
    
    support_2d = fig.to_json()
    
    fig = px.line_3d(canton_1, x="x", y="y", z="z", color="type", line_group="canton" ,
                 hover_data=["support", "canton"], animation_frame="support", width=1200, height=800)

    fig.update_traces(line=dict(width=8))

    aspect_ratio = dict(x=1, y=0.05, z=0.5)
    fig["layout"].pop("updatemenus") 
    fig.update_layout(
            scene=dict(
                aspectratio=aspect_ratio,
                aspectmode="manual",
                camera=dict(
                    up=dict(x=0, y=0, z=1),
                    eye=dict(
                        x=0,
                        y=-1 / 1,
                        z=0,
                    ),
                ),
            )
        )

    scene_aspect_ratio ="scene.aspectratio"
    fig.update_layout(
        updatemenus=[
            dict(
                type = "buttons",
                direction = "left",
                buttons=list([
                    dict(
                        args=["scene.camera.eye", dict(x=0, y=-1, z=0)],
                        label="profil",
                        method="relayout"
                    ),
                    dict(
                        args=["scene.camera.eye", dict(x=-1/.9, y=0, z=0)],
                        label="contre profil",
                        method="relayout"
                    ),
                    dict(
                        args=[scene_aspect_ratio, dict(x=1, y=0.00005, z= .5)],
                        label="Mode 2D ligne",
                        method="relayout"
                    ),
                    dict(
                        args=[scene_aspect_ratio, dict(x=1e-5, y=1, z= .5)],
                        label="Mode 2D support",
                        method="relayout"
                    ),
                    dict(
                        args=[scene_aspect_ratio, dict(x=1, y=0.05, z= .5)],
                        label="Mode 3D support",
                        method="relayout"
                    ),
                    
                ]),
                pad={"r": 10, "t": 10},
                showactive=True,
                x=0.11,
                xanchor="left",
                y=1.1,
                yanchor="top"
            ),
        ]
        
    )
    
    json_section_3d = fig.to_json()


    
    return json.dumps({"json_3d": json_3d, "json_2d": json_2d, "json_support_2d": support_2d, "json_section_3d": json_section_3d})
    # return {"lit": lit.to_dict()}

result = main()