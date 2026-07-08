
from stellar_engine.plot.conformity import get_conformity
from stellar_engine.plot.obstacles import add_single_obstacle


def test_get_scenario_conformity(study_base):
    python_inputs = {
    "obstacle": {
        "uuid": "05176a6c-4726-4488-8b2a-418551510254",
        "name": "aaa",
        "type": "vegetation",
        "supportIndex": 0,
        "altitudeType": "absolute",
        "lateralDistanceType": "SPAN_AXIS",
        "referenceSupport": "LEFT",
        "allPositions": [
            {
                "x": 30,
                "y": 20,
                "z": 30
            }
        ],
        "activePoint": {
            "x": 30,
            "y": 20,
            "z": 30
        }
    },
    "electricTension": "400 KV",
    "form": {
        "windZone": "200",
        "windPressure": 200,
        "windMinus": False,
        "redZonePresence": False,
        "repartitionTemperature": 70,
        "lateralDistanceTemperature": 68,
        "selectedConformityRules": [
            "RULE_1",
            "RULE_2"
        ],
        "conformityPlot": "vegetation"
    },
    "rulesClimaticConditions": [
        {
            "ruleType": "RULE_1",
            "ruleName": "RULE_1",
            "lateralPoint": {
                "temperature": 17,
                "pressure": "WindZoneInput",
                "red_zone": False
            },
            "overhangPoint": {
                "temperature": None,
                "pressure": 0,
                "red_zone": False
            }
        },
        {
            "ruleType": "RULE_2",
            "ruleName": "RULE_2",
            "lateralPoint": {
                "temperature": 68,
                "pressure": "WindZoneInput",
                "red_zone": True
            },
            "overhangPoint": {
                "temperature": None,
                "pressure": 0,
                "red_zone": False
            }
        }
    ],
    "rulesDistances": [
        {
            "ruleType": "RULE_1",
            "lateral": {
                "63": 0.6,
                "90": 0.7,
                "150": 0.8,
                "225": 0.9,
                "400": 1
            },
            "overhang": {
                "63": 1.1,
                "90": 1.2,
                "150": 1.3,
                "225": 1.4,
                "400": 1.5
            }
        },
        {
            "ruleType": "RULE_2",
            "lateral": {
                "63": 1.6,
                "90": 1.7,
                "150": 1.8,
                "225": 1.9,
                "400": 2
            },
            "overhang": {
                "63": 2.1,
                "90": 2.2,
                "150": 2.3,
                "225": 2.4,
                "400": 2.5
            }
        }
    ]
}
    
    obstacle_inputs = {'obstacle': {'uuid': '05176a6c-4726-4488-8b2a-418551510254', 'supportUuid': 'b63c8dd7-f48c-4e74-aa37-633e36d64af2', 'supportIndex': 0, 'name': 'aaa', 'type': 'vegetation', 'altitudeType': 'absolute', 'lateralDistanceType': 'SPAN_AXIS', 'referenceSupport': 'LEFT', 'positions': [{'x': 30, 'y': 20, 'z': 30}]}, 'startSupport': 0, 'endSupport': 3, 'view': '3d'}
    obstacle = obstacle_inputs["obstacle"]
    # middle_span = get_section_middle_span(
    #     obstacle_inputs["startSupport"], obstacle_inputs["endSupport"]
    # )
    add_single_obstacle({"obstacles": [obstacle]}, study_base, support_index=0,)

    # Define the inputs for the test
    get_conformity(python_inputs, study_base)
