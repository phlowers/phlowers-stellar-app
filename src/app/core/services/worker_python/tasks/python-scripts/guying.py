from stellar_engine import api

def calculate_guying(js_inputs: dict):
    global engine
    return api.calculate_guying(inputs=js_inputs, engine=engine)

