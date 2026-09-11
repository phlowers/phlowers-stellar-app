---
html_theme.sidebar_secondary.remove: true
---

# Bienvenue dans {{app_name}}

**{{app_name}}** est une application web pour l'analyse mécanique des lignes électriques. Elle
fonctionne entièrement dans votre navigateur — y compris le moteur de calcul Python
([mechaphlowers](https://mechaphlowers.readthedocs.io/)) exécuté grâce à Pyodide — ce qui vous
permet de créer et d'étudier des configurations de lignes aériennes **entièrement hors ligne**.

## Ce que vous pouvez faire avec {{app_name}}

- **Créer des études** à partir de vos propres jeux de données de lignes, câbles, chaînes
  d'isolateurs, équipes de maintenance et accessoires.
- **Visualiser les portées en 2D/3D** grâce aux graphiques interactifs du Studio.
- **Effectuer des calculs mécaniques** sur les câbles et les chaînes (flèche, charges, scénarios
  de température...).
- **Simuler des manipulations de câble**, comme l'allongement ou le raccourcissement d'un câble
  sur une portée.
- **Vérifier le respect des distances aux obstacles** le long de la ligne, par rapport à des
  types d'obstacles et de sols configurables.
- **Travailler hors ligne**, vos études étant conservées localement et les catalogues mis à jour
  en toute sécurité en arrière-plan.

Rendez-vous sur {doc}`Premiers pas <user_docs/getting_started>` pour ouvrir l'application pour la
première fois, ou parcourez le {doc}`Guide utilisateur <user_docs/user_guide/index>` pour une
présentation détaillée de chaque fonctionnalité.

## Pour les développeurs

{{app_name}} est une PWA Angular utilisant Pyodide, Dexie et Plotly.js, et peut être construite et
déployée sous forme d'image de conteneur grâce au `Dockerfile` fourni. Les données des catalogues
(lignes, câbles, chaînes, équipes de maintenance, accessoires, types d'obstacles) sont
personnalisables pour s'adapter à vos propres jeux de données. Le
{doc}`Guide développeur <user_docs/developer_guide/index>` couvre la configuration de
l'environnement, l'architecture de l'application, les rouages du tracé, l'authentification et les
traductions, afin que vous puissiez rapidement commencer à contribuer.

## Référence API

Parcourez la {doc}`Référence API <api/index>`, générée à partir du code source TypeScript grâce à
[sphinx-js](https://sphinx-js.readthedocs.io/).

```{toctree}
:titlesonly:
:hidden:

Premiers pas <user_docs/getting_started>
Guide utilisateur <user_docs/user_guide/index>
Guide développeur <user_docs/developer_guide/index>
Référence API <api/index>
```
