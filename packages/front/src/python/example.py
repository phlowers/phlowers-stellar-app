# mypy: ignore-errors
# pylint: skip-file

# import plotly.graph_objects as go
import js
import numpy as np
import pandas as pd
from mechaphlowers import SectionDataFrame
from mechaphlowers.entities.arrays import SectionArray

data = {
    "name": ["1", "2", "three", "support 4"],
    "suspension": [False, True, True, False],
    "conductor_attachment_altitude": [50.0, 40.0, 20.0, 10.0],
    "crossarm_length": [5.0,] * 4,
    "line_angle": [0.] * 4,
    "insulator_length": [0, 4, 3.2, 0],
    "span_length": [100, 200, 300, np.nan],
}

section = SectionArray(data=pd.DataFrame(data))
print(section)

# set sagging parameter and temperature
section.sagging_parameter = 500
section.sagging_temperature = 15

# Provide section to SectionDataFrame
frame = SectionDataFrame(section)
print(frame)

# Display figure
# fig = go.Figure()
# frame.plot.line3d(fig)
# fig.show()

# plot_output = js.document.getElementById('plotly-output1')
# fig_html = fig.to_html(
#     include_plotlyjs=False,
#     full_html=False,
#     default_height='350px',
#     div_id='plotly-output',
# )
# plot_output.innerHTML = fig_html
