# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

project = 'Stellar'
copyright = 'Copyright (c) 2026, RTE (http://www.rte-france.com)'


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

# Include the docs folder in the source path
import os
import sys
# Create symlink or copy docs content - we'll reference them directly
docs_path = os.path.abspath('../../docs')

# Language configuration
language = 'en'

# Static files (images, style sheets, etc.)
html_static_path = ['_static']

# Custom CSS
html_css_files = ['custom.css']

# Logo and favicon
html_logo = '_static/logo.svg'
html_favicon = '_static/favicon.png'

# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = 'sphinx_book_theme'
html_static_path = ['_static']

# Wiki-like theme options
html_theme_options = {
    "repository_url": "https://github.com/your-org/phlowers-stellar-app",
    "use_repository_button": True,
    "use_edit_page_button": True,
    "use_source_button": True,
    "use_issues_button": True,
    "use_download_button": True,
    "show_toc_level": 2,
    "navigation_with_keys": True,
    "show_navbar_depth": 2,
    "home_page_in_toc": True,
}

html_title = "Stellar Wiki"
