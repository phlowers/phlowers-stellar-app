# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

project = 'Stellar'
copyright = '2026, Adrien Goeller'
author = 'Adrien Goeller'

# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = [
    'sphinx_js',
    'myst_parser',  # Support for Markdown files
]

# sphinx-js configuration for TypeScript
js_language = 'typescript'
js_source_path = '../../src'
jsdoc_tsconfig_path = '../tsconfig.typedoc.json'
primary_domain = 'js'

# MyST-Parser configuration for Markdown support
myst_enable_extensions = [
    "colon_fence",
    "deflist",
]
source_suffix = {
    '.rst': 'restructuredtext',
    '.md': 'markdown',
}

templates_path = ['_templates']
exclude_patterns = []

# Language configuration
language = 'en'


# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = 'sphinx_material'

# Material theme options
html_theme_options = {
    "nav_title": "Stellar",
    "base_url": "https://stellar.readthedocs.io/",
    "repo_url": "https://github.com/phlowers/stellar",
    "repo_name": "Stellar",
    "google_analytics_account": "",
    "html_minify": False,
    "css_minify": False,
    "globaltoc_depth": 3,
    "globaltoc_collapse": True,
    "globaltoc_includehidden": True,
    "color_primary": "blue",
    "color_accent": "light-blue",
}

# Required for sphinx-material
html_sidebars = {
    "**": ["logo-text.html", "globaltoc.html", "localtoc.html", "searchbox.html"]
}

html_title = "Stellar Documentation"
