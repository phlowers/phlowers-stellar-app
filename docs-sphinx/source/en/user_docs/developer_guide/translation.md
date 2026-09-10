# Documentation translation workflow

This project maintains the {{app_name}} documentation in two languages: **English** and **French**. The French tree is a peer of the English tree, not a set of `.po` files. Depending on the folder, either language can be the authoring source of truth — see [Translation scope](#translation-scope).

## Structure

```text
docs-sphinx/source/
├── conf.py              # Shared Sphinx configuration
├── _static/             # Shared static assets (CSS, logos, favicon)
├── _templates/          # Shared templates
├── en/                  # English documentation (source of truth, except user_guide)
│   ├── index.md
│   ├── api/
│   └── user_docs/
└── fr/                  # French documentation (source of truth for user_guide)
    ├── index.md
    ├── api/
    └── user_docs/
```

Rules:

- `conf.py`, `_static/`, and `_templates/` are shared across languages.
- The `SPHINX_LANGUAGE` environment variable selects the active language (`en` or `fr`).
- Every page that exists in `source/en/` must also exist in `source/fr/` so ReadTheDocs' language flyout never 404s.

## Adding a new page

1. Create the page under `source/en/` first.
2. Copy it to the matching path under `source/fr/`.
3. Translate the French copy.
4. Add the page to the relevant `toctree` labels in both language indexes.

## Building locally

```bash
# English only
npm run docs:en

# French only
npm run docs:fr

# Both languages
npm run docs
```

The generated sites are written to:

- `docs-sphinx/build/en/html/`
- `docs-sphinx/build/fr/html/`

Both builds run with warnings treated as errors (`-W`) by default.

## Live reload

```bash
# English (default, port 8080)
npm run autodocs:en   # alias: npm run autodocs

# French (port 8081)
npm run autodocs:fr
```

`autodocs:en` serves the English site on `http://localhost:8080/` and `autodocs:fr`
serves the French site on `http://localhost:8081/`, both with live reload. Run both
commands in two terminals to preview both languages side by side, opening each
port in its own browser tab.

## ReadTheDocs

This uses ReadTheDocs' native **translations** feature: two separate RTD
projects share this repository, one per language.

1. Create (or reuse) the main project pointing at this repo, with **Language**
   set to `English` in its admin settings — this is the `en` project.
2. Create a second RTD project for the same repo with **Language** set to
   `French` — this is the `fr` project.
3. In the main project's admin, go to **Translations** and add the `fr`
   project.

ReadTheDocs then serves both under the main project's domain (`/en/<version>/…`
and `/fr/<version>/…`) and injects `READTHEDOCS_LANGUAGE` (`en` or `fr`) into
each project's build. The `.readthedocs.yaml` build job forwards that value
into `SPHINX_LANGUAGE` and runs `make html-rtd`, which builds only that
project's language into `$READTHEDOCS_OUTPUT/html`.

- No manual root-redirect page or `/en` + `/fr` merge step is needed — RTD
  owns the path prefixing and the version/language switcher.
- RTD's own flyout is the only language switch; no custom in-page switcher
  needs to be built or maintained.

## Translation scope

Direction depends on the folder — there is no single "source language" for the whole tree:

| Folder | Source of truth | Translated into |
|---|---|---|
| `user_docs/user_guide/` | **French** | English |
| `index.md`, `api/`, `user_docs/developer_guide/`, `user_docs/getting_started.md`, `user_docs/scale_view.md` | **English** | French |

## Local AI-assisted translation

Translation is done locally by the contributor, not by CI:

1. Edit the source-of-truth file for the relevant folder (see the table above).
2. Open the peer file (swap `en/` ↔ `fr/` at the same relative path) in a Copilot Chat session.
3. Ask Copilot to apply the `skill-translate-docs` skill, pointing at the two files.
4. Review the generated diff — check terminology against
   [`.github/skills/skill-translate-docs/glossary.md`](../../../../../.github/skills/skill-translate-docs/glossary.md),
   fix anything off, then commit yourself.

This is intentionally low-automation: no script or CI job performs the translation.
