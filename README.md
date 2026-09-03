# Stellar

[![Node](https://img.shields.io/badge/-Node.js-808080?logo=node.js&colorA=404040&logoColor=66cc33)](https://www.npmjs.com/package/preferred-node-version)
![Angular](https://img.shields.io/badge/angular-%23DD0031.svg?logo=angular&logoColor=white)
[![pyodide](https://img.shields.io/badge/works_on-pyodide-%237303fc)](https://pyodide.org/en/stable/index.html)
[![MPL-2.0 License](https://img.shields.io/badge/license-MPL_2.0-blue.svg)](https://www.mozilla.org/en-US/MPL/2.0/)


## Introduction

Stellar is the app based on mechaphlowers enables to perform offline every calculus available in mechaphlowers !  
Stellar is based on pyodide to enable execution of python in the browser.

## Installation
Installation process is described in the Developer guide/Installation section

### Development server  
Run `npm run start` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

#### Code scaffolding  
Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.  
You can also use diminutives for your block generation.  
ex:
- `ng g c component-name` for `ng generate component-name`
- `ng g s service-name` for `ng generate service service-name`

#### Build  
Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.

#### Running unit tests  
Run `npm run test` to execute the unit tests.

#### Running local documentation

Go to `docs-sphinx` folder and run 
```shell
uv venv --python 3.13 # to create a venv 
source .venv/bin/activate # to activate it.
uv pip install -r requirements.txt # to install the dependencies. 
```

You can now run `npm run docs` to build or directly `npm run autodocs` to build and serve the documentation on `http://localhost:8000/` with live reload on changes.

#### Generate PDF documentation

The documentation can also be exported as a PDF using [Sphinx-SimplePDF](https://sphinx-simplepdf.readthedocs.io/en/latest/).  
After installing the Python dependencies described above, run:

```shell
cd docs-sphinx
# create, install, activate venv
make simplepdf
```

The generated PDF is written to `docs-sphinx/build/simplepdf/Stellar.pdf`.

> **Note:** Sphinx-SimplePDF relies on [WeasyPrint](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html), which requires native libraries. On Debian/Ubuntu install `libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0`; on Fedora install `pango`; on macOS run `brew install pango`.
>
> If you get an error such as `pango_context_set_round_glyph_positions` not found, your system Pango is too old for the latest WeasyPrint. Pin WeasyPrint to a compatible version:
> ```shell
> uv pip install 'weasyprint==52.5'
> ```
