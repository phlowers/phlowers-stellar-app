# Documentation translation workflow

This project maintains the Stellar documentation in two languages: **English** (source of truth) and **French**. The French tree is a peer of the English tree, not a set of `.po` files.

## Structure

```text
docs-sphinx/source/
├── conf.py              # Shared Sphinx configuration
├── _static/             # Shared static assets (CSS, logos, favicon)
├── _templates/          # Shared templates (language switcher)
├── en/                  # English documentation (source of truth)
│   ├── index.md
│   ├── api/
│   └── user_docs/
└── fr/                  # French translation
    ├── index.md
    ├── api/
    └── user_docs/
```

Rules:

- `conf.py`, `_static/`, and `_templates/` are shared across languages.
- The `SPHINX_LANGUAGE` environment variable selects the active language (`en` or `fr`).
- Every page that exists in `source/en/` must also exist in `source/fr/` so the language switcher never 404s.

## Adding a new page

1. Create the page under `source/en/` first.
2. Copy it to the matching path under `source/fr/`.
3. Translate the French copy.
4. Add the page to the French `toctree` labels in the relevant `index.md` files.

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
commands (in two terminals) to make the language switcher jump between them. The
ports are injected into the switcher via the `DOCS_EN_ORIGIN` / `DOCS_FR_ORIGIN`
environment variables set by the npm scripts — nothing is hard-coded in the template.

## ReadTheDocs

A **single** ReadTheDocs project builds both languages. The `.readthedocs.yaml`
build job runs `make html-en` and `make html-fr`, copies the results into
`$READTHEDOCS_OUTPUT/html/en` and `$READTHEDOCS_OUTPUT/html/fr`, and writes a root
`index.html` that redirects to `/en/`.

- No second (translation) project is required.
- The site is served with `/en/…` and `/fr/…` path prefixes, matching the
  switcher's production defaults (`DOCS_EN_PREFIX=/en`, `DOCS_FR_PREFIX=/fr`).

## Language switcher

A persistent language switcher is rendered in the header of every page. It computes
the target URL from four values injected by `conf.py` (origin + path prefix per
language), so the same template works in dev and in production with no hard-coded
ports:

- **Production** (prefixes `/en`, `/fr`, same origin):
  `/en/latest/user_docs/user_guide/index.html` → `/fr/latest/user_docs/user_guide/index.html`
- **Dev** (origins `http://localhost:8080` / `:8081`, empty prefixes):
  `http://localhost:8080/user_docs/user_guide/index.html` → `http://localhost:8081/user_docs/user_guide/index.html`

The switcher template lives in `source/_templates/language-switcher.html` and is styled via `source/_static/custom.css`.

## Translation scope

- English is the authoring source of truth.
- User guide pages are fully translated to French.
- API reference pages remain in English in the first iteration.
- Developer guide detail pages may remain in English temporarily; their `index.md` navigation labels are translated.
