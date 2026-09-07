# Minimal makefile for Sphinx documentation
#

# You can set these variables from the command line, and also
# from the environment for the first two.
SPHINXOPTS    ?=
SPHINXBUILD   ?= sphinx-build
SOURCEDIR     = source
BUILDDIR      = build

# Put it first so that "make" without argument is like "make help".
help:
	@$(SPHINXBUILD) -M help "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

.PHONY: help Makefile simplepdf pptx

# Build a PDF from the Sphinx sources using sphinx-simplepdf.
simplepdf:
	@$(SPHINXBUILD) -M simplepdf "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

# Convert the SimplePDF output into an editable PowerPoint deck.
pptx: simplepdf
	uv run python scripts/build_pptx_from_pdf.py \
		--pdf "build/simplepdf/stellar_documentation.pdf" \
		--output "build/pptx/stellar_documentation.pptx"

# Catch-all target: route all unknown targets to Sphinx using the new
# "make mode" option.  $(O) is meant as a shortcut for $(SPHINXOPTS).
%: Makefile
	@$(SPHINXBUILD) -M $@ "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)
