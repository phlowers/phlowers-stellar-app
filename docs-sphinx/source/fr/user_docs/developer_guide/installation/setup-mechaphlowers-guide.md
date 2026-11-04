# Guide de configuration de Mechaphlowers

## Vue d'ensemble

Le script `set_up_mechaphlowers_v2.py` construit **stellar-engine** depuis les sources et prépare tous les packages Python pour le web worker **Pyodide**.

**Ce qu'il fait :**

1. Construit le wheel `stellar-engine` (qui dépend de `mechaphlowers`)
2. Télécharge le runtime Pyodide depuis NPM
3. Télécharge toutes les dépendances transitives via `pip download`
4. Remplace les packages par des wheels précompilés du CDN quand ils sont disponibles
5. Compile les wheels restants en bytecode et génère `python-packages.json`

---

## Architecture

```
Step 1: BUILD STELLAR-ENGINE
  └─ uv build --wheel (optionally patch mechaphlowers version for local wheel)

Step 2: DOWNLOAD PYODIDE RUNTIME
  └─ Fetch Pyodide runtime from NPM registry

Étape 3 : TÉLÉCHARGEMENT DES PACKAGES
  └─ Export des dépendances d'exécution de uv.lock (avec empreintes) → pip download --require-hashes

Step 4: CDN REPLACEMENT
  └─ Replace pip wheels with wasm32 versions from CDN (or local CDN directory)

Step 5: COMPILE & CONFIG
  └─ Deduplicate, compile to .pyc, generate python-packages.json
```

---

## Configuration

La version de Pyodide est lue depuis `package.json` :

```json
{
  "dependencies": {
    "pyodide": "^0.28.3"
  },
  "config": {
    "mechaphlowers": "0.6.0rc2"
  }
}
```

Le `pyproject.toml` de stellar-engine déclare une seule dépendance directe :

```toml
dependencies = [
    "mechaphlowers>=0.6.0rc2",
]
```

Toutes les dépendances transitives (thermohl, numpy, pandas, pandera, etc.) sont résolues automatiquement par pip.

### Fichiers clés

| Fichier | Rôle |
|------|---------|
| `stellar-engine/pyproject.toml` | Définition du package stellar-engine ; `[tool.uv] constraint-dependencies` fige les packages d'exécution sur les versions du CDN Pyodide |
| `stellar-engine/uv.lock` | Source unique de vérité des versions et empreintes des packages Python ; exporté à la volée et imposé par `pip download --require-hashes` |

### Vérifications d'intégrité

- **Tarball Pyodide** : son empreinte SHA-512 est comparée au champ `integrity` de `package-lock.json`. Pour changer de version de Pyodide, utiliser `npm install` et non une modification du script.
- **Wheels PyPI** : `pip download --require-hashes --only-binary=:all:` n'accepte que les empreintes de `stellar-engine/uv.lock` (exporté avec `uv export --locked`, qui échoue si le lock est obsolète). Après toute modification des dépendances de `stellar-engine` ou des versions Pyodide figées, exécuter `uv lock` dans `stellar-engine/` puis versionner le résultat.
- **Wheels du CDN** : l'empreinte SHA-256 de chaque wheel doit correspondre à celle déclarée dans le `pyodide-lock.json` du tarball vérifié (y compris avec `--local-cdn-dir`).
- Avec `--local-mechaphlowers`, l'empreinte du wheel local est calculée à la volée ; ses dépendances doivent en revanche figurer dans `uv.lock`.
- Au moindre écart, le script s'interrompt avec un code de sortie différent de zéro.

---

## Utilisation

```bash
# Standard execution
npm run set-up-mechaphlowers

# Use local CDN directory (offline mode)
npm run set-up-mechaphlowers:local-cdn -- /path/to/cdn

# Use local mechaphlowers wheel from stellar-engine/input/
# (the local wheel's dependency versions override upstream resolution)
npm run set-up-mechaphlowers:local-mechaphlowers

# Only rebuild stellar-engine and update its wheel (skip all other steps)
npm run set-up-mechaphlowers:engine-only

# With custom NPM registry
npm run set-up-mechaphlowers -- --npm-registry-url https://registry.npmmirror.com/
```

### `--engine-only`

Reconstruit uniquement `stellar-engine` et met à jour son wheel dans `public/pyodide/` sans re-télécharger Pyodide, sans résoudre les dépendances, ni recompiler les autres packages. C'est utile en développement lorsque seul le code source de `stellar-engine` a changé.

Le script va :

1. Construire un nouveau wheel `stellar-engine`
2. Supprimer l'ancien `stellar_engine*.whl` de `public/pyodide/`
3. Copier le nouveau wheel à sa place
4. Mettre à jour uniquement l'entrée `stellar-engine` dans `python-packages.json`

Peut être combiné avec `--local-mechaphlowers` pour patcher la version de mechaphlowers avant la construction.

### `--local-mechaphlowers`

Placez un fichier `.whl` de mechaphlowers dans `stellar-engine/input/`. Le script va :

1. Patcher `pyproject.toml` avec la version locale avant la construction
2. Utiliser les dépendances déclarées du wheel local pour la résolution
3. Remplacer le mechaphlowers téléchargé par le wheel local
4. Restaurer le `pyproject.toml` d'origine après la construction

---

## Structure de sortie

```
public/pyodide/
├── pyodide.asm.wasm, pyodide.asm.mjs, python_stdlib.zip, pyodide-lock.json
├── numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl     (CDN)
├── pandas-2.3.1-cp313-cp313-pyodide_2025_0_wasm32.whl    (CDN)
├── mechaphlowers-0.5.3-cp313-none-any.whl                (PyPI, compiled)
├── stellar_engine-0.1.0-cp313-none-any.whl               (built, compiled)
├── plotly-5.24.1-cp313-none-any.whl                      (PyPI, compiled)
└── ... other wheels ...

src/app/core/services/worker_python/
└── python-packages.json
```

---

## Dépannage

| Erreur | Solution |
|-------|----------|
| `pyproject.toml not found` | Vérifiez que `stellar-engine/pyproject.toml` existe |
| `Could not fetch pyodide-lock.json` | Vérifiez la connexion internet ou utilisez `--local-cdn-dir` |
| `multiple mechaphlowers wheels found` | Ne conservez qu'un seul `.whl` dans `stellar-engine/input/` |
| `no mechaphlowers wheel found` | Placez un wheel dans `stellar-engine/input/` |

### Vérifier l'installation

```bash
ls -lh public/pyodide/*.whl | wc -l
cat src/app/core/services/worker_python/python-packages.json | jq 'keys | length'
```

### Reconstruction propre

```bash
rm -rf public/pyodide
rm -f src/app/core/services/worker_python/python-packages.json
npm run set-up-mechaphlowers
```

---

## Ressources

- [Documentation Pyodide](https://pyodide.org/)
- [mechaphlowers sur GitHub](https://github.com/phlowers/mechaphlowers)
- [Documentation uv](https://docs.astral.sh/uv/)

---

**Dernière mise à jour** : 31 mars 2026
