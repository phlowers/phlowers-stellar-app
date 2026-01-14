from dataclasses import dataclass

@dataclass
class TemperatureCalculationInputs:
    cableName: str
    ambientTemperature: float
    longitude: float
    latitude: float
    transit: float
    skyCover: str

def temperature_calculation(js_inputs):
    python_inputs = js_inputs.to_py()
    temperature_inputs = TemperatureCalculationInputs(**python_inputs)
    return {
        "cableSolarFlux": 123,
        "cableTemperature": 123,
        "cableTemperatureUncertainty": 123
    }