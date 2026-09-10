---
name: skill-translate-docs
description: "Local, developer-triggered translation of docs-sphinx pages between English and French. Use when: translating a doc page, syncing the fr/en doc tree, updating a translated page after the source changed, adding a new doc page to both languages. Keywords: translate docs, sphinx translation, user_guide, developer_guide, fr, en, llm-prompt."
argument-hint: "Path to the doc file that changed (source or target)"
---

# Translate Docs — Local Translator Mode

## When to Use

- A contributor edited a page under `docs-sphinx/source/` and needs the peer-language copy
  updated.
- A new page was added under `docs-sphinx/source/en/` or `docs-sphinx/source/fr/` and needs its
  counterpart created in the other language.
- Someone asks to "translate this doc", "sync the French/English doc", or "update the
  translation" for a `docs-sphinx` page.

This is a **local, low-automation** workflow: the developer runs it manually in their own
Copilot Chat session, reviews the diff, and commits it themselves. There is no CI job and no
script that performs the translation automatically.

## Role

Act as a **bilingual technical translator** working on paired Markdown (MyST) files that live at
the same relative path under `docs-sphinx/source/en/` and `docs-sphinx/source/fr/`.

## Translation direction

Direction depends on the folder, not on which file happens to be edited first:

| Path (relative to `docs-sphinx/source/`) | Source of truth | Translate into |
|---|---|---|
| `fr/user_docs/user_guide/**` | **French** | English (`en/user_docs/user_guide/**`) |
| everything else (`index.md`, `api/**`, `user_docs/developer_guide/**`, `user_docs/getting_started.md`, `user_docs/scale_view.md`) | **English** | French |

If asked to translate a file under `user_docs/user_guide/`, always read the French file as the
source, even if the English file was the one just edited — flag the mismatch instead of
translating English back into itself.

## Procedure

1. **Identify the pair**: given one file path, compute the counterpart by swapping `en/` ↔ `fr/`
   at the same relative path. If the counterpart doesn't exist yet, this is a new page.
2. **Read the source-of-truth file** (per the direction table above) and the **current target
   file** (if it exists) to preserve established terminology and tone.
3. **Read the glossary** in [glossary.md](glossary.md) in this skill folder before translating —
   reuse existing term translations, don't invent new ones for terms already listed.
4. **Translate**, preserving:
   - MyST/Sphinx syntax as-is: `{doc}`, `{{app_name}}`, front matter (`---` blocks), `toctree`
     directives, admonitions (`` ```{note} ``, `` ```{warning} ``, etc.) — translate only the
     admonition body text, not the directive name.
   - Code blocks, inline code, file paths, CLI commands, class/function names, and URLs
     unchanged.
   - Markdown link targets unchanged; translate only the visible link text.
   - Table structure and column count.
5. **French typography**: use `«`/`»` guillemets for quotes outside code, and a non-breaking
   space before `:`, `;`, `!`, `?` where the existing French docs already do so. Do not alter
   quotes/spacing inside code blocks or paths.
6. **New page**: if the counterpart didn't exist, add it to the matching `toctree` in both
   `index.md` files (or the relevant section index), matching the existing entry style.
7. **Scope discipline**: only touch the file(s) being translated (plus `toctree` entries for new
   pages). Do not reorganize content, fix unrelated wording, or touch build config
   (`conf.py`, `_static/`, `_templates/`).
8. **Never run `git commit` or `git push`** — hand the diff back to the developer for review.

## Output

- List which file(s) were created/updated.
- Flag any term not found in [glossary.md](glossary.md) that required a judgment call, so the
  developer can add it to the glossary if it should be reused.
- Flag any source content that looks stale/ambiguous instead of guessing.
