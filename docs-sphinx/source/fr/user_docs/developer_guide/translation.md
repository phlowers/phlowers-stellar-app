# Workflow de traduction de la documentation

Ce projet maintient la documentation de {{app_name}} en deux langues : **anglais** et **français**. L'arborescence française est un équivalent de l'arborescence anglaise, et non un ensemble de fichiers `.po`. Selon le dossier, l'une ou l'autre langue peut être la source de vérité pour la rédaction — voir [Portée de la traduction](#portee-de-la-traduction).

## Structure

```text
docs-sphinx/source/
├── conf.py              # Configuration Sphinx partagée
├── _static/             # Ressources statiques partagées (CSS, logos, favicon)
├── _templates/          # Modèles partagés
├── en/                  # Documentation anglaise (source de vérité, sauf user_guide)
│   ├── index.md
│   ├── api/
│   └── user_docs/
└── fr/                  # Documentation française (source de vérité pour user_guide)
    ├── index.md
    ├── api/
    └── user_docs/
```

Règles :

- `conf.py`, `_static/` et `_templates/` sont partagés entre les deux langues.
- La variable d'environnement `SPHINX_LANGUAGE` sélectionne la langue active (`en` ou `fr`).
- Chaque page présente dans `source/en/` doit aussi exister dans `source/fr/` pour que le sélecteur de langue de ReadTheDocs ne génère pas de 404.

## Ajouter une nouvelle page

1. Créez la page dans la langue source de vérité du dossier concerné (voir
   [Portée de la traduction](#portee-de-la-traduction) ci-dessous) : `source/fr/user_docs/user_guide/`
   pour le guide utilisateur, `source/en/` pour le reste.
2. Copiez-la dans le chemin correspondant sous l'autre arborescence linguistique.
3. Traduisez la copie (voir [Traduction locale assistée par IA](#traduction-locale-assistee-par-ia)).
4. Ajoutez la page aux `toctree` des index des deux langues.

## Construction locale

```bash
# Anglais uniquement
npm run docs:en

# Français uniquement
npm run docs:fr

# Les deux langues
npm run docs
```

Les sites générés sont écrits dans :

- `docs-sphinx/build/en/html/`
- `docs-sphinx/build/fr/html/`

Les deux builds utilisent les avertissements comme erreurs (`-W`) par défaut.

## Rechargement automatique

```bash
# Anglais (port 8080 par défaut)
npm run autodocs:en   # alias: npm run autodocs

# Français (port 8081)
npm run autodocs:fr
```

`autodocs:en` sert le site anglais sur `http://localhost:8080/` et `autodocs:fr`
sert le site français sur `http://localhost:8081/`, avec rechargement automatique.
Lancez les deux commandes dans deux terminaux pour prévisualiser les deux langues
côté à côté, en ouvrant chaque port dans un onglet distinct du navigateur.

## ReadTheDocs

Cette configuration repose sur la fonctionnalité native de traduction de ReadTheDocs :
deux projets RTD distincts partagent ce dépôt, un par langue.

1. Créez (ou réutilisez) le projet principal pointant vers ce dépôt, avec **Language**
   défini sur `English` dans les paramètres d'administration — c'est le projet `en`.
2. Créez un second projet RTD pour le même dépôt avec **Language** défini sur
   `French` — c'est le projet `fr`.
3. Dans l'administration du projet principal, ouvrez **Translations** et ajoutez le
   projet `fr`.

ReadTheDocs sert ensuite les deux langues sous le domaine du projet principal (`/en/<version>/…`
et `/fr/<version>/…`) et injecte `READTHEDOCS_LANGUAGE` (`en` ou `fr`) dans la build.
Le job de build `.readthedocs.yaml` transmet cette valeur vers `SPHINX_LANGUAGE` puis
exécute `make html-rtd`, ce qui construit uniquement la langue du projet concerné
directement dans `$READTHEDOCS_OUTPUT/html`.

- Aucune page de redirection manuelle ou étape de fusion `/en` + `/fr` n'est nécessaire — RTD
  gère le préfixe de chemin et le sélecteur de langue.
- Le menu de langue de RTD est le seul sélecteur ; aucun sélecteur interne personnalisé
  n'a besoin d'être maintenu.

## Portée de la traduction

La direction dépend du dossier — il n'y a pas une seule « langue source » pour toute l'arborescence :

| Dossier | Source de vérité | Traduit vers |
|---|---|---|
| `user_docs/user_guide/` | **Français** | Anglais |
| `index.md`, `api/`, `user_docs/developer_guide/`, `user_docs/getting_started.md`, `user_docs/scale_view.md` | **Anglais** | Français |

## Traduction locale assistée par IA

La traduction est réalisée localement par le contributeur, pas par la CI :

1. Modifiez le fichier source de vérité du dossier concerné (voir le tableau ci-dessus).
2. Ouvrez le fichier pair (permutez `en/` ↔ `fr/` au même chemin relatif) dans une session Copilot Chat.
3. Demandez à Copilot d'appliquer la compétence `skill-translate-docs`, en pointant vers les deux fichiers.
4. Relisez le diff généré — vérifiez la terminologie par rapport à
   [`.github/skills/skill-translate-docs/glossary.md`](../../../../../.github/skills/skill-translate-docs/glossary.md),
   corrigez si besoin, puis validez vous-même le commit.

Ceci est volontairement peu automatisé : aucun script ni job CI n'effectue la traduction.
