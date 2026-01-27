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

extensions = ['sphinx_js']

# sphinx-js configuration for TypeScript
js_language = 'typescript'
js_source_path = '../../src'
jsdoc_tsconfig_path = '../../tsconfig.json'
primary_domain = 'js'

templates_path = ['_templates']
exclude_patterns = []

# Language configuration
language = 'en'


# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = 'alabaster'
html_static_path = ['_static']
