# # change_state.py file

# from dataclasses import dataclass
# from mechaphlowers import units
# import logging

# import numpy as np
# from stellar_engine.entities import output

# logger = logging.getLogger("mechaphlowers")
# # Set logger level to WARNING so info messages are shown
# logger.setLevel(logging.WARNING)


# @dataclass
# class ClimateCharge:
#     windPressure: float
#     cableTemperature: float
#     symmetryType: str
#     iceThickness: float
#     frontierSupportNumber: int
#     iceThicknessBefore: float
#     iceThicknessAfter: float


# @dataclass
# class SpanLoad:
#     loadPosition: float
#     loadWeight: float


# @dataclass
# class ChangeStateInput:
#     climate: ClimateCharge
#     spanLoads: list[SpanLoad]
