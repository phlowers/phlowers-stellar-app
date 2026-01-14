from dataclasses import dataclass

@dataclass
class Parameter15WithoutWindInputs:
    parameterUncertaintyPapoto: float
    cableTemperature15C: float
    cableTemperatureUncertainty15C: float
    parameterPapoto: float

def parameter_15_without_wind(js_inputs):
    python_inputs = js_inputs.to_py()
    parameter_15_without_wind_inputs = Parameter15WithoutWindInputs(**python_inputs)
    return {
        "parameter15CMinusUncertainty": 123,
        "parameter15C": 123,
        "parameter15CPlusUncertainty": 123
    }