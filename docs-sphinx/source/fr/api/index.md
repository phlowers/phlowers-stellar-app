---
html_theme.sidebar_secondary.remove: true
---

# Référence API

Cette section contient la documentation de l'API TypeScript de l'application Stellar,
générée automatiquement à partir du code source avec [sphinx-js](https://sphinx-js.readthedocs.io/).

::::{grid} 1 2 2 2
:gutter: 2

:::{grid-item-card} {fas}`database;pst-color-primary` Modèles
:link: models
:link-type: doc

Modèles de données et interfaces utilisés dans l'application.
:::

:::{grid-item-card} {fas}`folder-open;pst-color-primary` Catalogue
:link: catalog
:link-type: doc

API du module catalogue pour la gestion des ressources.
:::

:::{grid-item-card} {fas}`server;pst-color-primary` Infrastructure
:link: infrastructure
:link-type: doc

Couche infrastructure : clients HTTP, intercepteurs et adaptateurs.
:::

:::{grid-item-card} {fas}`gears;pst-color-primary` Services
:link: services
:link-type: doc

Services métier utilisés dans toute l'application.
:::

::::

:::{note}
Les pages de référence API ci-dessous restent en anglais dans cette première itération.
:::

```{toctree}
:maxdepth: 2
:hidden:

Modèles <models>
Catalogue <catalog>
Infrastructure <infrastructure>
Services <services>
```
