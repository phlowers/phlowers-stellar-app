from dataclasses import dataclass
from mechaphlowers import param_calibration
@dataclass
class ParameterCalibrationInputs:
    parameterUncertaintyPapoto: float
    cableTemperatureCalibration: float
    cableTemperatureCalibrationUncertainty: float
    parameterPapoto: float
    span_index: int

def parameter_15_without_wind(js_inputs):
    global engine
    python_inputs = js_inputs.to_py()
    param_calibr_inputs = ParameterCalibrationInputs(**python_inputs)
    print(param_calibr_inputs)
    param_result = param_calibration(
        measured_parameter=param_calibr_inputs.parameterPapoto,
        measured_temperature=param_calibr_inputs.cableTemperatureCalibration,
        section_array=engine.section_array,
        cable_array=engine.cable_array,
        span_index=param_calibr_inputs.span_index
    )
    return {
        "parameter15CMinusUncertainty": None,
        "parameter15C": param_result,
        "parameter15CPlusUncertainty": None
    }