# mypy: ignore-errors
# pylint: skip-file
# def main():
#     print("Hello, World!")
#     print("globals are", globals())

if __name__ == "__main__":
    print("cable_temperature are", globals()["inputs"].to_py())
    inputs = globals()["inputs"].to_py()
    cable_temperature = inputs["cable_temperature"]
    test_frame = globals()["test_frame"]
    test_weather = globals()["test_weather"]    
    test_frame.state.change(cable_temperature, test_weather)
    
    print("Length", type(test_frame.state.L_after_change), "parameter", type(test_frame.state.p_after_change))
    result = {
        "lengths": test_frame.state.L_after_change.tolist(),
        "parameters": test_frame.state.p_after_change.tolist()
    }
    print("result", result)
    # main()

