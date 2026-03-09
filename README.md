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

#### Running E2E tests

E2E tests use [Playwright](https://playwright.dev/) and require the dev server to be running first.

```shell
# Terminal 1 — start the dev server
npm run start

# Terminal 2 — run E2E tests
npm run test:e2e
```

Available commands:

| Command | Description |
| --- | --- |
| `npm run test:e2e` | Run all E2E tests in headless mode |
| `npm run test:e2e:ui` | Open Playwright UI mode (interactive, with time-travel debugging) |
| `npm run test:e2e:debug` | Run tests in debug mode (step by step) |

Test files are located in the `e2e/` directory:

- `e2e/home.spec.ts` — navigation tests (user registration dialog, home page, sidebar)
- `e2e/studies.spec.ts` — studies CRUD flow (page structure, create study, redirect)

> The dev server must be started manually before running E2E tests because `ng serve` sets the `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers required by Pyodide.

#### Running local documentation

Go to `docs-sphinx` folder and run 
```shell
uv venv --python 3.13 # to create a venv 
source .venv/bin/activate # to activate it.
uv pip install -r requirements.txt # to install the dependencies. 
```

You can now run `npm run docs` to build or directly `npm run autodocs` to build and serve the documentation on `http://localhost:8000/` with live reload on changes.
