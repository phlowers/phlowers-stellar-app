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

The documentation is built with Sphinx. First, go to the `docs-sphinx` folder and prepare the Python environment:

```shell
uv venv --python 3.13              # create a venv
source .venv/bin/activate          # activate it
uv pip install -r requirements.txt # install Sphinx and dependencies
```

Once the environment is ready, you can use the following npm scripts from the project root:

- `npm run docs` — cleans and builds the static HTML documentation in `docs-sphinx/build/html`.
- `npm run autodocs` — builds and serves the documentation on `http://localhost:8000/` with live reload on changes.
- `npm run docs:open` — builds the documentation and opens `docs-sphinx/build/html/index.html` in your default browser.

Use `npm run autodocs` during active writing so changes are rebuilt and reloaded automatically.
