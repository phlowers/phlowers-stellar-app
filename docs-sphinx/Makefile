# Minimal makefile for Sphinx documentation
#

# You can set these variables from the command line, and also
# from the environment for the first two.
SPHINXOPTS    ?= -W
SPHINXBUILD   ?= uv run sphinx-build
SOURCEDIR     = source
BUILDDIR      = build
SPHINX_LANGUAGE ?= en
# Where publish-pdf copies the PDFs, laid out as <PUBLISH_DIR>/<lang>/<PDF_NAME>.
PUBLISH_DIR   ?= ../dist/docs
# Name of the PDF produced by simplepdf, read from conf.py so stale PDFs left
# by an older version or app name are never picked up.
PDF_NAME = $(shell uv run python -c "import runpy; print(runpy.run_path('$(SOURCEDIR)/conf.py')['simplepdf_file_name'])")

# Put it first so that "make" without argument is like "make help".
help:
	@$(SPHINXBUILD) -M help "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

.PHONY: help Makefile html html-en html-fr html-rtd simplepdf simplepdf-fr simplepdf-rtd epub-rtd pptx pptx-fr publish-pdf

# Build the English HTML site.
html-en:
	@SPHINX_LANGUAGE=en $(SPHINXBUILD) -M html "$(SOURCEDIR)/en" "$(BUILDDIR)/en" -c "$(SOURCEDIR)" $(SPHINXOPTS) $(O)

# Build the French HTML site.
html-fr:
	@SPHINX_LANGUAGE=fr $(SPHINXBUILD) -M html "$(SOURCEDIR)/fr" "$(BUILDDIR)/fr" -c "$(SOURCEDIR)" $(SPHINXOPTS) $(O)

# Build both language sites.
html: html-en html-fr

# Build a single language straight into build/html, selected by $(SPHINX_LANGUAGE).
# Used by ReadTheDocs, where each native translation project builds only its
# own language (READTHEDOCS_LANGUAGE is exported into SPHINX_LANGUAGE).
html-rtd:
	@$(SPHINXBUILD) -M html "$(SOURCEDIR)/$(SPHINX_LANGUAGE)" "$(BUILDDIR)" -c "$(SOURCEDIR)" $(SPHINXOPTS) $(O)

# Build a PDF from the Sphinx sources using sphinx-simplepdf (English).
# The file is named <app>_documentation_<version>.pdf (see simplepdf_file_name in conf.py).
simplepdf:
	@SPHINX_LANGUAGE=en $(SPHINXBUILD) -M simplepdf "$(SOURCEDIR)/en" "$(BUILDDIR)" -c "$(SOURCEDIR)" $(SPHINXOPTS) $(O)

# Build a PDF from the Sphinx sources using sphinx-simplepdf (French).
simplepdf-fr:
	@SPHINX_LANGUAGE=fr $(SPHINXBUILD) -M simplepdf "$(SOURCEDIR)/fr" "$(BUILDDIR)/fr" -c "$(SOURCEDIR)" $(SPHINXOPTS) $(O)

# Build a PDF straight into build/simplepdf, selected by $(SPHINX_LANGUAGE).
# Used by ReadTheDocs to build the "pdf" offline format for each language project.
simplepdf-rtd:
	@$(SPHINXBUILD) -M simplepdf "$(SOURCEDIR)/$(SPHINX_LANGUAGE)" "$(BUILDDIR)" -c "$(SOURCEDIR)" $(SPHINXOPTS) $(O)

# Build an ePub straight into build/epub, selected by $(SPHINX_LANGUAGE).
# Used by ReadTheDocs to build the "epub" offline format for each language project.
epub-rtd:
	@$(SPHINXBUILD) -M epub "$(SOURCEDIR)/$(SPHINX_LANGUAGE)" "$(BUILDDIR)" -c "$(SOURCEDIR)" $(SPHINXOPTS) $(O)

# Build both language PDFs and copy them where the app links to them
# (/docs/<lang>/<app>_documentation_<version>.pdf, see features/instruction-manual).
# Set SPHINX_APP_NAME to the app's APP_NAME so both sides compute the same file name.
publish-pdf: simplepdf simplepdf-fr
	mkdir -p "$(PUBLISH_DIR)/en" "$(PUBLISH_DIR)/fr"
	cp "$(BUILDDIR)/simplepdf/$(PDF_NAME)" "$(PUBLISH_DIR)/en/$(PDF_NAME)"
	cp "$(BUILDDIR)/fr/simplepdf/$(PDF_NAME)" "$(PUBLISH_DIR)/fr/$(PDF_NAME)"

# Convert the SimplePDF output into an editable PowerPoint deck (English).
pptx: simplepdf
	uv run python scripts/build_pptx_from_pdf.py \
		--pdf "build/simplepdf/$(PDF_NAME)" \
		--output "build/pptx/stellar_documentation.pptx"

# Convert the SimplePDF output into an editable PowerPoint deck (French).
pptx-fr: simplepdf-fr
	uv run python scripts/build_pptx_from_pdf.py \
		--pdf "build/fr/simplepdf/$(PDF_NAME)" \
		--output "build/fr/pptx/stellar_documentation.pptx"

# Catch-all target: route all unknown targets to Sphinx using the new
# "make mode" option.  $(O) is meant as a shortcut for $(SPHINXOPTS).
%: Makefile
	@$(SPHINXBUILD) -M $@ "$(SOURCEDIR)/en" "$(BUILDDIR)" -c "$(SOURCEDIR)" $(SPHINXOPTS) $(O)
