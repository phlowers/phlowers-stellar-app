# Minimal makefile for Sphinx documentation
#

# You can set these variables from the command line, and also
# from the environment for the first two.
SPHINXOPTS    ?= -W
SPHINXBUILD   ?= uv run sphinx-build
SOURCEDIR     = source
BUILDDIR      = build

# Put it first so that "make" without argument is like "make help".
help:
	@$(SPHINXBUILD) -M help "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

.PHONY: help Makefile html html-en html-fr simplepdf pptx

# Build the English HTML site.
html-en:
	@SPHINX_LANGUAGE=en $(SPHINXBUILD) -M html "$(SOURCEDIR)/en" "$(BUILDDIR)/en" -c "$(SOURCEDIR)" $(SPHINXOPTS) $(O)

# Build the French HTML site.
html-fr:
	@SPHINX_LANGUAGE=fr $(SPHINXBUILD) -M html "$(SOURCEDIR)/fr" "$(BUILDDIR)/fr" -c "$(SOURCEDIR)" $(SPHINXOPTS) $(O)

# Build both language sites.
html: html-en html-fr

# Build a PDF from the Sphinx sources using sphinx-simplepdf (English).
simplepdf:
	@SPHINX_LANGUAGE=en $(SPHINXBUILD) -M simplepdf "$(SOURCEDIR)/en" "$(BUILDDIR)" -c "$(SOURCEDIR)" $(SPHINXOPTS) $(O)

# Convert the SimplePDF output into an editable PowerPoint deck.
pptx: simplepdf
	uv run python scripts/build_pptx_from_pdf.py \
		--pdf "build/simplepdf/stellar_documentation.pdf" \
		--output "build/pptx/stellar_documentation.pptx"

# Catch-all target: route all unknown targets to Sphinx using the new
# "make mode" option.  $(O) is meant as a shortcut for $(SPHINXOPTS).
%: Makefile
	@$(SPHINXBUILD) -M $@ "$(SOURCEDIR)/en" "$(BUILDDIR)" -c "$(SOURCEDIR)" $(SPHINXOPTS) $(O)
