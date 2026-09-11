
# Premiers pas

{{app_name}} est une application web pour l'analyse mécanique des lignes électriques, construite
avec Angular et fonctionnant entièrement dans votre navigateur grâce à
[Pyodide](https://pyodide.org/en/stable/index.html), qui exécute le moteur Python `mechaphlowers`
en WebAssembly.  
Actuellement, l'application est développée pour le navigateur Edge.

## Ouvrir l'application

1. Ouvrez {{app_name}} dans un navigateur récent (dernière version de Edge).
2. Attendez le chargement initial — l'application télécharge et met en cache le moteur Python
   ainsi que les données de catalogue (lignes, câbles, chaînes, équipes de maintenance,
   accessoires) afin de pouvoir fonctionner hors ligne par la suite.
3. Une fois chargée, {{app_name}} fonctionne entièrement hors ligne : vous pouvez perdre la
   connexion réseau et continuer à travailler. Les catalogues et les fichiers de l'application
   sont resynchronisés automatiquement dès que vous êtes de nouveau en ligne (voir
   {doc}`Mise à jour de l'application <user_docs/user_guide/application_update>`).

## Votre première étude

- Créez une nouvelle étude depuis la page **Études**.
- Saisissez ou importez les données physiques de votre ligne (supports, câbles, chaînes).
- Ouvrez le **Studio** pour visualiser la ligne en 2D/3D, exécuter les calculs mécaniques et
  vérifier le respect des distances aux obstacles.

Poursuivez avec le {doc}`Guide utilisateur <user_docs/user_guide/index>` pour une présentation
détaillée, étape par étape, de chaque fonctionnalité.

## Mettre en place un environnement de développement

### Côté Angular/TypeScript

Si vous souhaitez exécuter {{app_name}} en local ou contribuer au code, consultez le
{doc}`Guide développeur <user_docs/developer_guide/index>` pour tous les détails. Pour démarrer
rapidement :

```shell
# 1. Installer et sélectionner Node.js (nvm est recommandé)
nvm install v23
nvm use 23

# 2. Installer les dépendances du projet
npm install

# 3. Mettre en place le moteur Python mechaphlowers (nécessite uv, voir le Guide développeur)
npm run set-up-mechaphlowers

# 4. Démarrer le serveur de développement, puis ouvrir http://localhost:4200/
npm run start
```

Autres commandes utiles :

```shell
npm run build        # build de production, sortie dans dist/
npm run test          # exécute les tests unitaires une fois
npm run lint-check    # exécute eslint
npm run format        # exécute prettier (formate les fichiers js/ts/html sur place)
```

### Côté Pyodide/Python

{{app_name}} exécute des calculs Python (via `mechaphlowers`, packagé sous le nom
`stellar-engine`) directement dans le navigateur grâce à Pyodide. La commande
`npm run set-up-mechaphlowers` construit `stellar-engine` et prépare tous les paquets Python pour
le web worker Pyodide — voir le
{doc}`Guide de mise en place de Mechaphlowers <user_docs/developer_guide/installation/setup-mechaphlowers-guide>`
pour tous les détails. Elle nécessite [uv](https://docs.astral.sh/uv/getting-started/installation/) :

```shell
# Installer uv (macOS/Linux)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Construire stellar-engine et préparer les paquets Pyodide
npm run set-up-mechaphlowers

# Reconstruire uniquement stellar-engine après une modification du code source
# (plus rapide, sans retéléchargement de Pyodide)
npm run set-up-mechaphlowers:engine-only

# Utiliser une roue mechaphlowers locale depuis stellar-engine/input/
npm run set-up-mechaphlowers:local-mechaphlowers
```

Le code source Python se trouve dans `stellar-engine/`, avec son propre environnement virtuel géré
par `uv` et son propre `Makefile`. Ses tests s'exécutent de manière isolée, indépendamment de la
suite de tests Angular/Vitest :

```shell
cd stellar-engine

# créer l'environnement virtuel
uv venv

# Activer l'environnement virtuel
source .venv/bin/activate

# Installer les dépendances
uv sync --all-groups

# Lint, formatage et exécution des tests
make lint     # ruff check --fix
make format   # ruff format
make test     # pytest + rapport de couverture
```

## Dockerfile

Vous pouvez également construire et exécuter {{app_name}} sous forme de conteneur grâce au
`Dockerfile` fourni :

```shell
docker build -t stellar-app .
docker run -p 8080:80 stellar-app
```

## Documentation

### En local

Pour construire ce site de documentation en local :

```shell
cd docs-sphinx
uv venv --python 3.13              # créer un environnement virtuel
source .venv/bin/activate          # l'activer
uv pip install -r requirements.txt # installer Sphinx et ses dépendances
```

Vous pouvez maintenant exécuter `npm run docs` pour construire les deux langues, `npm run docs:en`
/ `npm run docs:fr` pour construire une seule langue, ou `npm run autodocs:en` /
`npm run autodocs:fr` pour construire et servir la documentation avec rechargement à chaud (voir
`docs-sphinx/TRANSLATION.md` pour le détail du build bilingue).

Par défaut, la documentation est intitulée « Stellar ». Définissez la variable d'environnement
`SPHINX_APP_NAME` avant de lancer le build pour personnaliser le nom d'application utilisé dans
toute la documentation générée, par exemple :

```shell
SPHINX_APP_NAME="My App" npm run docs:en
```

### Générer la documentation PDF

La documentation peut également être exportée en PDF grâce à
[Sphinx-SimplePDF](https://sphinx-simplepdf.readthedocs.io/en/latest/).
Après avoir installé les dépendances Python décrites ci-dessus, exécutez :

```shell
cd docs-sphinx
# créer, installer, activer le venv
make simplepdf
```

Le PDF généré est écrit dans le dossier `docs-sphinx/build/simplepdf/`.

> **Remarque :** Sphinx-SimplePDF repose sur
> [WeasyPrint](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html), qui nécessite
> des bibliothèques natives. Sous Debian/Ubuntu, installez `libpango-1.0-0 libpangoft2-1.0-0
> libharfbuzz-subset0` ; sous Fedora, installez `pango` ; sous macOS, exécutez
> `brew install pango`.
>
> Si vous obtenez une erreur telle que `pango_context_set_round_glyph_positions` introuvable,
> votre Pango système est trop ancien pour la dernière version de WeasyPrint. Fixez WeasyPrint à
> une version compatible :
> ```shell
> uv pip install 'weasyprint==52.5'
> ```

### Générer la documentation PowerPoint

Un export PowerPoint est disponible en convertissant le PDF produit par `make simplepdf`. Cette
approche conserve la mise en page exacte tout en produisant des zones de texte modifiables dans
PowerPoint. Exécutez :

```shell
cd docs-sphinx
make pptx
```

Ou, depuis la racine du dépôt :

```shell
npm run docs:pptx
```

Le fichier `.pptx` généré est écrit dans `docs-sphinx/build/pptx/stellar_documentation.pptx`.

> **Remarque :** Cela nécessite `pymupdf` et `python-pptx`, déjà listés dans
> `docs-sphinx/requirements.txt`.


