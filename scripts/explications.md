# Résumé du fonctionnement du script set_up_mechaphlowers.py

## Objectif
Configurer **mechaphlowers** et ses dépendances pour fonctionner dans **Pyodide** (Python dans le navigateur via WebAssembly).

---

## Workflow en 7 étapes

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Télécharger Pyodide runtime depuis NPM                      │
│     (pyodide.asm.wasm, pyodide.asm.js, python_stdlib.zip)       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. Récupérer la liste des packages CDN + construire les        │
│     contraintes pour les packages NATIFS uniquement             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. Télécharger mechaphlowers + dépendances via pip             │
│     AVEC contraintes sur packages natifs (C/Rust)               │
│     → pip résout librement les packages pure Python             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. Télécharger les wheels CDN (versions identiques)            │
│     → Remplace les wheels manylinux par des wheels wasm32       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. Dédupliquer + Compiler en .pyc                              │
│  6. Compresser les gros wheels non-CDN (brotli/gzip)            │
│  7. Générer python-packages.json                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Gestion des versions - Le cœur du problème

### Le problème
Les packages avec **extensions natives** (C/Rust) téléchargés par pip sont compilés pour **Linux x86_64**, pas pour **WebAssembly** :
- `pydantic-core` → Rust
- `numpy`, `pandas`, `pyyaml`, `scipy`, `pillow`, `lxml` → C/C++
- `wrapt`, `xxhash` → C

Ces wheels **manylinux** ne fonctionnent pas dans le navigateur !

### La solution : contraintes UNIQUEMENT sur les packages natifs

```python
# Packages natifs qui DOIVENT utiliser les versions CDN wasm32
NATIVE_PACKAGES = frozenset({
    "pydantic-core",  # Rust
    "numpy", "pandas", "pyyaml", "scipy", "pillow", "lxml",  # C/C++
    "wrapt", "xxhash",  # C
})

def build_native_constraints(cdn_packages: dict[str, CdnPackage]) -> dict[str, str]:
    """Construit les contraintes pip pour les packages natifs UNIQUEMENT."""
    constraints = {}
    
    # Pin SEULEMENT les packages natifs aux versions CDN
    for pkg_name in NATIVE_PACKAGES:
        if pkg_name in cdn_packages:
            constraints[pkg_name] = cdn_packages[pkg_name].version
    
    # Les packages pure Python (pydantic, pandera, etc.) sont résolus
    # LIBREMENT par pip pour garantir la compatibilité
    return constraints
```

### Pourquoi ne pas contraindre les packages pure Python ?

**Priorité : compatibilité fonctionnelle > optimisation**

Si on force `pydantic==2.10.6` parce que le CDN a `pydantic-core==2.27.2`, on risque de casser des dépendances comme **pandera** qui pourrait nécessiter une version plus récente de pydantic.

En laissant pip résoudre librement les packages pure Python :
- ✅ Pandera obtient la version de pydantic dont il a besoin
- ✅ Si pip ne peut pas résoudre (incompatibilité réelle), on le sait immédiatement
- ✅ Les packages pure Python fonctionnent partout (pas de problème wasm)

### Flux de résolution des versions

```
                    package.json
                         │
            ┌────────────┴────────────┐
            │  pyodide: "0.28.3"      │
            │  mechaphlowers: "0.5.1" │
            └────────────┬────────────┘
                         │
                         ↓
         ┌───────────────────────────────────┐
         │  CDN Pyodide v0.28.3              │
         │  pyodide-lock.json                │
         │  ─────────────────────────        │
         │  pydantic-core: 2.27.2            │
         │  numpy: 2.2.5                     │
         │  pandas: 2.3.1                    │
         │  ...                              │
         └───────────────┬───────────────────┘
                         │
            Contraintes NATIVES uniquement
                         │
                         ↓
         ┌───────────────────────────────────┐
         │  pip download mechaphlowers==0.5.1│
         │  -c constraints.txt               │
         │  ─────────────────────────────    │
         │  pydantic-core==2.27.2  ← natif   │
         │  numpy==2.2.5           ← natif   │
         │  pandas==2.3.1          ← natif   │
         │  pydantic==???          ← LIBRE   │
         │  pandera==???           ← LIBRE   │
         └───────────────┬───────────────────┘
                         │
              pip résout automatiquement
              pydantic compatible avec
              pydantic-core 2.27.2
                         │
                         ↓
         ┌───────────────────────────────────┐
         │  Télécharger depuis CDN les       │
         │  versions identiques (wasm32)     │
         │  → numpy, pandas, pydantic-core   │
         │  → pyyaml, wrapt, xxhash          │
         └───────────────────────────────────┘
```

---

## Vérification de compatibilité

Après la résolution pip, le script vérifie les potentiels problèmes :

```python
def check_version_compatibility(installed, cdn_packages) -> list[str]:
    """Avertit si les versions résolues semblent incompatibles."""
    warnings = []
    
    # Exemple: pydantic 2.11+ nécessite pydantic-core 2.28+
    if pydantic.startswith("2.11") and pydantic_core.startswith("2.27"):
        warnings.append("pydantic 2.11 may need pydantic-core 2.28+")
    
    return warnings
```

Si pip échoue à résoudre les dépendances avec les contraintes CDN, c'est une **vraie incompatibilité** et le script s'arrête avec un message explicatif.

---

## Priorité lors de la déduplication

Quand plusieurs wheels existent pour le même package :

| Priorité | Type | Exemple |
|----------|------|---------|
| 1 | CDN pyodide (wasm32) | `numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl` |
| 2 | cp313 compilé | `plotly-5.24.1-cp313-none-any.whl` |
| 3 | CDN générique | `six-1.17.0-py2.py3-none-any.whl` |
| 4 | pip py3 | `tenacity-9.1.2-py3-none-any.whl` |

---

## Résultat final

```
public/pyodide/
├── pyodide.asm.wasm          # Runtime Pyodide
├── pyodide.asm.js
├── python_stdlib.zip
├── pyodide-lock.json
│
├── numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl    # CDN (wasm)
├── pandas-2.3.1-cp313-cp313-pyodide_2025_0_wasm32.whl   # CDN (wasm)
├── pydantic_core-2.27.2-cp313-cp313-pyodide_*.whl       # CDN (wasm)
├── pydantic-2.10.6-cp313-none-any.whl                   # pip (résolu librement)
├── pandera-0.21.1-cp313-none-any.whl                    # pip (résolu librement)
├── mechaphlowers-0.5.1-cp313-none-any.whl               # pip (pure Python)
├── plotly-5.24.1-cp313-none-any.whl                     # pip (compressé)
├── plotly-5.24.1-cp313-none-any.whl.br                  # brotli
└── ...
```

---

## Usage

```bash
# Standard
uv run scripts/set_up_mechaphlowers.py

# Sans compression (plus rapide pour dev)
uv run scripts/set_up_mechaphlowers.py --skip-compression

# Avec une wheel locale (compression auto-skippée pour itération rapide)
uv run scripts/set_up_mechaphlowers.py --local-wheel ./mechaphlowers-0.5.2-py3-none-any.whl

# Avec un index PyPI custom
uv run scripts/set_up_mechaphlowers.py --uv-index https://my-pypi.example.com/simple
```
