---
html_theme.sidebar_secondary.remove: true
---

# API Reference

This section contains the TypeScript API documentation for the Stellar application,
auto-generated from the source code using [sphinx-js](https://sphinx-js.readthedocs.io/).

::::{grid} 1 2 2 2
:gutter: 2

:::{grid-item-card} {fas}`database;pst-color-primary` Models
:link: models
:link-type: doc

Data models and interfaces used across the application.
:::

:::{grid-item-card} {fas}`folder-open;pst-color-primary` Catalog
:link: catalog
:link-type: doc

Catalog module API for managing resources.
:::

:::{grid-item-card} {fas}`server;pst-color-primary` Infrastructure
:link: infrastructure
:link-type: doc

Infrastructure layer: HTTP clients, interceptors and adapters.
:::

:::{grid-item-card} {fas}`gears;pst-color-primary` Services
:link: services
:link-type: doc

Business-logic services used throughout the application.
:::

::::

```{toctree}
:maxdepth: 2
:hidden:

models
catalog
infrastructure
services
```
