# set_up_mechaphlowers.py - Quick Reference

## 🚀 Quick Start

```bash
# Télécharger et optimiser mechaphlowers avec Pyodide
npm run set-up-mechaphlowers
```

## 📊 Qu'est-ce que fait ce script?

```
<<<<<<< HEAD
<<<<<<< HEAD
Input: mechaphlowers==0.5.1 + Pyodide 0.28.3 CDN
=======
Input: mechaphlowers==0.4.3 + Pyodide 0.28.3 CDN
>>>>>>> fb86a38 (New whl files management optimized with cdn and auto dependencies management.)
=======
Input: mechaphlowers==0.4.3 + Pyodide 0.28.3 CDN
>>>>>>> b347507 (New whl files management optimized with cdn and auto dependencies management.)
                ↓
        ┌───────────────┐
        │ Analyse des   │
        │  dépendances  │ → 26 packages (direct + transitive)
        └───────────────┘
                ↓
        ┌───────────────┐
        │ Vérification  │
        │  CDN Pyodide  │ → 14 packages disponibles
        └───────────────┘
                ↓
        ┌───────────────┐
        │ Téléchargement│
        │  intelligent  │ → CDN (14) + pip (12)
        └───────────────┘
                ↓
        ┌───────────────┐
        │ Optimisation  │
        │ & Compression │ → Brotli + Gzip, 26% réduction
        └───────────────┘
                ↓
Output: ./public/pyodide/ (26 wheels optimisés)
        ./src/app/.../python-packages.json (config)
```

## 🎯 Résultats

- ✅ **26 packages** téléchargés et optimisés
- ✅ **14/26 depuis le CDN** (versions Pyodide optimisées)
- ✅ **12/26 via pip** (packages non-CDN)
- ✅ **6.7 MB** économisés (compression)
- ✅ **Zéro maintenance** - s'adapte automatiquement

## 🔑 Fonctionnalités clés

### 1. Détection automatique complète
```python
# Extrait toutes les dépendances résolues (direct + transitive)
get_mechaphlowers_dependencies()  # → 26 packages

Inclut automatiquement:
  - numpy, pandas, scipy (gros packages)
  - pydantic, pydantic-core (validation)
  - Toutes les sous-dépendances
```

### 2. Intelligence CDN
```python
# Vérifie le CDN pour chaque dépendance
available_packages = get_available_packages_from_cdn()  # → 14 trouvés

Optimisé:
  - numpy → numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl (Pyodide)
  - pandas → pandas-2.3.1-cp313-cp313-pyodide_2025_0_wasm32.whl (Pyodide)
  - Packages manquants → téléchargés via pip
```

### 3. Compression optimale
```
plotly (25.40 MB) → Brotli + Gzip → 18.74 MB (26% réduction)

Strategy:
  - Saute fichiers CDN (déjà comprimés)
  - Saute petits fichiers (< 1 MB)
  - Compresse seulement ce qui vaut le coup
```

## 📁 Fichiers générés

```
public/pyodide/
├── pyodide.asm.wasm                    (runtime)
├── pyodide.asm.js                      (runtime)
├── python_stdlib.zip                   (stdlib)
├── pyodide-lock.json                   (inventory)
├── numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl
├── pandas-2.3.1-cp313-cp313-pyodide_2025_0_wasm32.whl
├── plotly-5.24.1-cp312-none-any.whl
├── plotly-5.24.1-cp312-none-any.whl.br (Brotli)
├── plotly-5.24.1-cp312-none-any.whl.gz (Gzip)
└── ... 21 autres wheels

src/app/core/services/worker_python/
└── python-packages.json   (config avec tous les packages)
```

## 🔧 Options avancées

```bash
# Index PyPI personnalisé
npm run set-up-mechaphlowers -- --uv-index https://my-index.com/simple

# Registry NPM personnalisé
npm run set-up-mechaphlowers -- --npm-registry-url https://registry.npmmirror.com/

# Sauter la compression (debug)
npm run set-up-mechaphlowers -- --skip-compression
```

## ⚡ Algorithmes optimisés

### Recherche CDN: O(n²) → O(n) avec normalisation case-insensitive

**Avant**: 26 packages × 343 CDN packages = 8,918 comparaisons  
**Après**: 343 lookup setup + 26 recherches = 369 opérations  
**Gain**: 24× plus rapide 🚀

**Normalisation**: `PyYAML` + `pyyaml` = package unique (plus de faux doublons)

### Pas d'appels redondants

```python
# Fonction centralisée pour normalisation
def normalize_package_name(name: str) -> str:
    return name.lower().replace("_", "-")

# AVANT: .lower().replace("_", "-") répété 8 fois
# APRÈS: normalize_package_name() utilisé partout
```

## 📊 Flux d'exécution

```
main()
├─ recreate_directory()                    Nettoie ./public/pyodide
├─ download_and_extract_tgz()             Télécharge Pyodide (NPM)
├─ keep_only_needed_files()               Garde seulement essentiels
├─ get_mechaphlowers_dependencies()       Résout toutes les deps
├─ get_available_packages_from_cdn()      Vérifie CDN
├─ download_optimized_wheels_from_cdn()   Télécharge CDN (14)
├─ subprocess.run([pip download...])      Télécharge pip (12)
├─ pyodide_build()                        Compilation .pyc
├─ remove_duplicate_wheels()              Nettoyage (normalisation case-insensitive)
├─ compress_pyodide_wheels()              Brotli + Gzip
└─ write_python_packages_json()           Config finale
```

## 🔧 Fonctionnalités avancées

### Types modernes Python 3.12+
```python
# AVANT: from typing import Dict, List
# list[str], dict[str, str] au lieu de List[str], Dict[str, str]
```

### Fonction centralisée `normalize_package_name()`
```
- PyYAML → pyyaml
- pydantic_core → pydantic-core
- Élimine duplication (~8 fois → 1 fonction)
```

### Normalisation case-insensitive
```
PyYAML (pip)  ┐
pyyaml (CDN)  ├→ MÊME PACKAGE → 1 seule version conservée
PyYAML (CDN)  ┘

Priorités intelligentes:
  1. Pyodide optimisé (cp313-pyodide) ← PRÉFÉRÉ
  2. Compilé (cp312 ou cp313)
  3. Générique (py3-none)
```

### Suppression des doublons garantie
- Case-insensitive: `pydantic_core` = `pydantic-core`
- Underscore normalization: `_` → `-`
- Zéro doublons après exécution (vérifié automatiquement)

## ✅ Dépannage

**Erreur**: "Could not fetch pyodide-lock.json"
```bash
curl https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide-lock.json
npm run set-up-mechaphlowers
```

**Avertissement**: "Found more than one output tag"  
→ Normal, le script gère automatiquement

**Recréer depuis zéro**:
```bash
rm -rf public/pyodide
rm -f src/app/core/services/worker_python/python-packages.json
npm run set-up-mechaphlowers
```

## 🔗 Références

- Voir `docs/setup-mechaphlowers-guide.md` pour la documentation complète
- [Pyodide Docs](https://pyodide.org/)
- [mechaphlowers GitHub](https://github.com/phlowers/mechaphlowers)

---

<<<<<<< HEAD
<<<<<<< HEAD
**Version**: Pyodide 0.28.3 / mechaphlowers 0.5.1  
**Date**: 6 janvier 2026  
=======
**Version**: Pyodide 0.28.3 / mechaphlowers 0.4.3  
**Date**: 5 janvier 2026  
>>>>>>> fb86a38 (New whl files management optimized with cdn and auto dependencies management.)
=======
**Version**: Pyodide 0.28.3 / mechaphlowers 0.4.3  
**Date**: 5 janvier 2026  
>>>>>>> b347507 (New whl files management optimized with cdn and auto dependencies management.)
**Script**: 658 lignes, 10 imports  
**Optimisations**: Fonction `normalize_package_name()`, types modernes Python 3.12+, déduplication par `set`
