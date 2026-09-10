# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

import json
import os
from pathlib import Path

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

app_name = os.environ.get("SPHINX_APP_NAME", "Stellar")

project = app_name
copyright = "2026, RTE (http://www.rte-france.com)"

# Required by the EPUB builder; kept in sync with the app's package.json.
package_json = json.loads(
    (Path(__file__).resolve().parents[2] / "package.json").read_text()
)
version = release = package_json["version"]


# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = [
    "sphinx_js",
    "sphinx.ext.mathjax",  # Math rendering for dollarmath equations
    "myst_parser",  # Support for Markdown files
    "sphinx_design",  # Grid, cards, tabs, badges, etc.
    "sphinx_copybutton",  # Copy button on code blocks
    "sphinx_simplepdf",  # PDF generation via WeasyPrint
    "sphinxcontrib.mermaid",  # Render ```mermaid fenced code blocks as diagrams
]

# Sphinx-SimplePDF configuration
simplepdf_file_name = "stellar_documentation.pdf"
simplepdf_vars = {
    "primary": "#1F4E79",
    "links": "#1F4E79",
}

# sphinx-js configuration for TypeScript
js_language = "typescript"
js_source_path = [
    "../../src/app/core/services",
    "../../src/app/shared/catalog/services",
    "../../src/app/shared/domain",
    "../../src/app/infrastructure",
    "../../src/app/features/changelog",
    "../../src/app/features/news",
]
# Common ancestor of js_source_path entries, needed to disambiguate relative JS paths
root_for_relative_js_paths = "../../src"
jsdoc_tsconfig_path = "../tsconfig.typedoc.json"
primary_domain = "js"

# MyST-Parser configuration for Markdown support
myst_enable_extensions = [
    "colon_fence",
    "deflist",
    "dollarmath",
    "substitution",
]

# Render ```mermaid fences via the mermaid directive instead of Pygments highlighting
myst_fence_as_directive = ["mermaid"]

myst_substitutions = {
    "app_name": app_name,
}

source_suffix = {
    ".rst": "restructuredtext",
    ".md": "markdown",
}

templates_path = ["_templates"]
exclude_patterns = []

# Extension-less remote badge images (README.md shields.io badges) have no
# guessable MIME type for EPUB packaging; this is expected and harmless.
suppress_warnings = ["epub.unknown_project_files"]

# Language configuration
language = os.environ.get("SPHINX_LANGUAGE", "en")

# Static files (images, style sheets, etc.)
html_static_path = ["_static"]

# Custom CSS
html_css_files = ["custom.css"]

# Logo and favicon
html_logo = "_static/logo.svg"
html_favicon = "_static/favicon.png"

# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = "pydata_sphinx_theme"

# PyData theme options
html_theme_options = {
    "github_url": "https://github.com/phlowers/phlowers-stellar-app",
    "navbar_align": "content",
    "show_toc_level": 2,
    "navigation_with_keys": True,
    "logo": {
        "image_light": "_static/logo.svg",
        "image_dark": "_static/logo.svg",
    },
    "navbar_end": ["theme-switcher", "navbar-icon-links"],
    "footer_start": ["copyright"],
    "footer_center": ["sphinx-version"],
}

html_title = (
    f"Documentation {app_name}" if language == "fr" else f"{app_name} Documentation"
)

# Remove secondary sidebar on landing page
html_sidebars = {
    "index": [],
}
