
# Getting Started

{{app_name}} is a web application for power line mechanical analysis, built with Angular and running entirely in your browser thanks to [Pyodide](https://pyodide.org/en/stable/index.html), which brings the `mechaphlowers` Python engine to WebAssembly.  
Currently, only the Edge browser is supported.

## Opening the application

1. Open {{app_name}} in a recent browser (latest Edge).
2. Wait for the initial load — the app downloads and caches the Python engine and catalog data (lines, cables, chains, maintenance teams, attachments) so it can run offline afterwards.
3. Once loaded, {{app_name}} works fully offline: you can lose network connection and keep working. Catalogs and application files are re-synchronized automatically the next time you are online (see {doc}`Application Update <user_guide/application_update>`).

## Your first study

- Create a new study from the **Studies** page.
- Enter or import the physical data of your line (supports, cables, chains).
- Open the **Studio** to visualize the line in 2D/3D, run mechanical calculations, and check obstacle clearance.

Continue with the {doc}`User Guide <user_guide/index>` for a detailed, step-by-step walkthrough of each feature.

## Setting up a development environment

### Angular/typescript side

If you want to run {{app_name}} locally or contribute code, see the {doc}`Developer Guide <developer_guide/index>` for the full details. As a quick start:

```shell
# 1. Install and select Node.js (nvm is recommended)
nvm install v22
nvm use 22

# 2. Install project dependencies
npm install

# 3. Set up the mechaphlowers Python engine (requires uv, see the Developer Guide)
npm run set-up-mechaphlowers

# 4. Start the dev server, then open http://localhost:4200/
npm run start
```

Other useful commands:

```shell
npm run build        # production build, output in dist/
npm run test          # run unit tests once
npm run lint-check    # run eslint
npm run format        # run prettier (formats js/ts/html files in place)
```

### Pyodide/python side

{{app_name}} runs Python calculations (via `mechaphlowers`, packaged as `stellar-engine`) directly in the
browser using Pyodide. The `npm run set-up-mechaphlowers` command builds `stellar-engine` and prepares all
Python packages for the Pyodide web worker — see the {doc}`Set-up Mechaphlowers Guide <developer_guide/installation/setup-mechaphlowers-guide>` for the full details. It requires [uv](https://docs.astral.sh/uv/getting-started/installation/):

```shell
# Install uv (macOS/Linux)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Build stellar-engine and prepare Pyodide packages
npm run set-up-mechaphlowers

# Rebuild only stellar-engine after a source change (faster, skips Pyodide re-download)
npm run set-up-mechaphlowers:engine-only

# Use a local mechaphlowers wheel from stellar-engine/input/
npm run set-up-mechaphlowers:local-mechaphlowers
```

The Python source itself lives in `stellar-engine/`, with its own `uv`-managed virtual environment
and `Makefile`. Its tests are run in isolation, independently from the Angular/Vitest test suite:

```shell
cd stellar-engine

# create the virtual environment
uv venv

# Activate the virtual environment
source .venv/bin/activate

# Install dependencies and 
uv sync --all-groups

# Lint, format and run the tests
make lint     # ruff check --fix
make format   # ruff format
make test     # pytest + coverage report
```


## Dockerfile

You can also build and run {{app_name}} as a container using the provided `Dockerfile`:

```shell
docker build -t stellar-app .
docker run -p 8080:80 stellar-app
```

## Documentation

### Local 

To build this documentation site locally:

```shell
cd docs-sphinx
uv venv --python 3.13              # create a virtual environment
source .venv/bin/activate          # activate it
uv pip install -r requirements.txt # install Sphinx and dependencies
```

You can now run `npm run docs` to build both languages, `npm run docs:en` / `npm run docs:fr` to build a single language, or `npm run autodocs:en` / `npm run autodocs:fr` to build and serve the documentation with live reload on changes (see {doc}`Documentation Translation Workflow <developer_guide/translation>` for details on the bilingual build).

By default the docs are titled "Stellar". Set the `SPHINX_APP_NAME` environment variable before building to customize the application name used throughout the generated documentation, e.g.:

```shell
SPHINX_APP_NAME="My App" npm run docs:en
```

### Generate PDF documentation

The documentation can also be exported as a PDF using [Sphinx-SimplePDF](https://sphinx-simplepdf.readthedocs.io/en/latest/).
After installing the Python dependencies described above, run:

```shell
cd docs-sphinx
# create, install, activate venv
make simplepdf
```

The generated PDF is written to the `docs-sphinx/build/simplepdf/` folder.

> **Note:** Sphinx-SimplePDF relies on [WeasyPrint](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html), which requires native libraries. On Debian/Ubuntu install `libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0`; on Fedora install `pango`; on macOS run `brew install pango`.
>
> If you get an error such as `pango_context_set_round_glyph_positions` not found, your system Pango is too old for the latest WeasyPrint. Pin WeasyPrint to a compatible version:
> ```shell
> uv pip install 'weasyprint==52.5'
> ```

### Generate PowerPoint documentation

A PowerPoint export is available by converting the PDF produced by `make simplepdf`. This approach keeps the exact page layout while producing editable text boxes in PowerPoint. Run:

```shell
cd docs-sphinx
make pptx
```

Or, from the repository root:

```shell
npm run docs:pptx
```

The generated `.pptx` is written to `docs-sphinx/build/pptx/stellar_documentation.pptx`.

> **Note:** This requires `pymupdf` and `python-pptx`, already listed in `docs-sphinx/requirements.txt`.



