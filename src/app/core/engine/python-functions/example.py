# mypy: ignore-errors
# pylint: skip-file
import time
start = time.time()
import plotly.graph_objects as go
import numpy as np
import pandas as pd
from mechaphlowers import SectionDataFrame
from mechaphlowers.entities.arrays import SectionArray

end = time.time()
print(f"Time taken to import modules: {end - start} seconds")

data = {
    "name": ["1", "2", "three", "support 4"],
    "suspension": [False, True, True, False],
    "conductor_attachment_altitude": [50.0, 40.0, 20.0, 10.0],
    "crossarm_length": [5.0,] * 4,
    "line_angle": [0.] * 4,
    "insulator_length": [0, 4, 3.2, 0],
    "span_length": [100, 200, 300, np.nan],
}

section = SectionArray(data=pd.DataFrame(data1.to_py()))
print(f"Time taken to create section: {time.time() - end} seconds")
print(section)

# set sagging parameter and temperature
section.sagging_parameter = 500
section.sagging_temperature = 15

# Provide section to SectionDataFrame
frame = SectionDataFrame(section)
print(f"Time taken to create frame: {time.time() - end} seconds")

layout = {
    'height': 800,
    # 'width': 1000,
    # 'width': 500,
    'autosize': True,
    "showlegend": False
}

# Display figure
fig = go.Figure(layout=layout)
print(f"Time taken to create figure: {time.time() - end} seconds")
frame.plot.line3d(fig)
print(f"Time taken to plot line3d: {time.time() - end} seconds")

camera = dict(
    up=dict(x=0, y=0, z=1),
    center=dict(x=0, y=0, z=0),
    eye=dict(x=1.25, y=1.25, z=1.25)
)

fig.update_layout(
    scene=dict(
        aspectmode='manual',  # Makes the axes scale proportionally to the data
        aspectratio=dict(x=15, y=0.5, z=7),  # Equal scaling for all axes
    )
)
print(f"Time taken to update layout: {time.time() - end} seconds")
# fig.show() # NOSONAR
print("fig is", fig)
# print("js is", js) # NOSONAR
# plot_output = js.document.getElementById('plotly-output1') # NOSONAR
# print("plot_output is", plot_output) # NOSONAR
# result = fig.to_html(
#     include_plotlyjs=True,
#     full_html=False,
#     default_height='800px',
#     default_width='100%',
#     # div_id='plotly-output', # NOSONAR
# )
result = fig.to_json()
print(f"Time taken to create figure html: {time.time() - end} seconds")
print("result is", result)