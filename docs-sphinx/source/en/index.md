---
html_theme.sidebar_secondary.remove: true
---

# Welcome to {{app_name}}

**{{app_name}}** is a web application for power line mechanical analysis. It runs entirely in your
browser — including the Python calculation engine ([mechaphlowers](https://mechaphlowers.readthedocs.io/))
powered by Pyodide — so you can build and study overhead line configurations **fully offline**.

## What you can do with {{app_name}}

- **Build studies** from your own line, cable, chain, maintenance team and attachment catalogs.
- **Visualize spans in 2D/3D** with interactive charts in the Studio.
- **Run mechanical calculations** on cables and chains (sag, loads, temperature scenarios...).
- **Simulate cable manipulations**, such as lengthening or shortening a cable at a span.
- **Check obstacle clearance** along the line against configurable obstacle and ground types.
- **Work offline**, with your studies kept locally and catalogs updated safely in the background.

Head to {doc}`Get Started <user_docs/getting_started>` to open the application for the first time, or
browse the {doc}`User Guide <user_docs/user_guide/index>` for a detailed walkthrough of each feature.

## For developers

{{app_name}} is an Angular PWA using Pyodide, Dexie and Plotly.js, and can be built and deployed as a
container image using the provided `Dockerfile`. Catalog data (lines, cables, chains, maintenance
teams, attachments, obstacle types) is customizable to fit your own datasets. The
{doc}`Developer Guide <user_docs/developer_guide/index>` covers environment setup, the application
architecture, plotting internals, authentication and translations, so you can start contributing quickly.

## API Reference

Browse the {doc}`API Reference <api/index>`, generated from the TypeScript source code using
[sphinx-js](https://sphinx-js.readthedocs.io/).

```{toctree}
:titlesonly:
:hidden:

Get Started <user_docs/getting_started>
User Guide <user_docs/user_guide/index>
Developer Guide <user_docs/developer_guide/index>
API Reference <api/index>
```
