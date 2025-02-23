import os

packages = [
    "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/wrapt-1.16.0-cp312-cp312-pyodide_2024_0_wasm32.whl",
    "https://files.pythonhosted.org/packages/cf/4b/9a77dc721aa0b7f74440a42e4ef6f9a4fae7324e17f64f88b96f4c25cc05/typeguard-4.4.2-py3-none-any.whl",
    "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/annotated_types-0.6.0-py3-none-any.whl",
    "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/packaging-24.2-py3-none-any.whl",
    "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/python_dateutil-2.9.0.post0-py2.py3-none-any.whl",
    "https://files.pythonhosted.org/packages/e5/ae/580600f441f6fc05218bd6c9d5794f4aef072a7d9093b291f1c50a9db8bc/plotly-5.24.1-py3-none-any.whl",
    "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/typing_extensions-4.11.0-py3-none-any.whl",
    "https://files.pythonhosted.org/packages/9b/1c/63fac4a86797b584132532cfab7295321103255930b96e516ab9101ffa90/pandera-0.21.1-py3-none-any.whl",
    "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/six-1.16.0-py2.py3-none-any.whl",
    "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pydantic_core-2.27.2-cp312-cp312-pyodide_2024_0_wasm32.whl",
    "https://files.pythonhosted.org/packages/65/f3/107a22063bf27bdccf2024833d3445f4eea42b2e598abfbd46f6a63b6cb0/typing_inspect-0.9.0-py3-none-any.whl",
    "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pydantic-2.10.5-py3-none-any.whl",
    "https://files.pythonhosted.org/packages/af/98/cff14d53a2f2f67d7fe8a4e235a383ee71aba6a1da12aeea24b325d0c72a/multimethod-1.12-py3-none-any.whl",
    "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pytz-2024.1-py2.py3-none-any.whl",
    "https://files.pythonhosted.org/packages/2a/e2/5d3f6ada4297caebe1a2add3b126fe800c96f56dbe5d1988a2cbe0b267aa/mypy_extensions-1.0.0-py3-none-any.whl"
]

import urllib.request

def download_packages(packages, download_dir):
    if not os.path.exists(download_dir):
        os.makedirs(download_dir)
    
    for package_url in packages:
        package_name = package_url.split('/')[-1]
        package_path = os.path.join(download_dir, package_name)
        
        print(f"Downloading {package_name}...")
        urllib.request.urlretrieve(package_url, package_path)
        print(f"Downloaded {package_name} to {package_path}")

# download_dir = "./raw_packages"
# download_packages(packages, download_dir)

# (.venv) ➜  test-pyodide git:(test) ✗ python3 -m pyc_wheel --with_backup --optimize 2 ./public/packages/mechaphlowers-0.2.0.post1-py3-none-any.whl
from pyc_wheel import main
import re


# main(["--optimize", "2", "./raw_packages/*py3*"])

# import json
# # packages = list(set(packages))
# # print(json.dumps(packages, indent=4))
def remove_files_by_regex(directory, pattern):
    regex = re.compile(pattern)
    for filename in os.listdir(directory):
        if regex.match(filename):
            file_path = os.path.join(directory, filename)
            os.remove(file_path)
            print(f"Removed {file_path}")

# Example usage:
remove_files_by_regex("./raw_packages", r".*py3.*")