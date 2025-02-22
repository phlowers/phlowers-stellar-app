import os
import re

def list_files(directory, pattern):
    regex = re.compile(pattern)
    matching_files = []
    print("im here")
    if not os.path.exists(directory):
        print(f"The directory {directory} does not exist.")
        return []
    for root, dirs, files in os.walk(directory):
        for file in files:
            print(regex.match(file))
            if "312" in file:
                print("it matches")
                matching_files.append(os.path.join(root, file))

    return matching_files

if __name__ == "__main__":
    directory = "/packages"
    pattern = r"bak"
    matching_files = list_files(directory, pattern)
    
    for file in matching_files:
        print("window.location.origin + " + "\"" + file + "\"" + ",")