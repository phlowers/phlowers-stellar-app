# Stellar Documentation

## Generate documentation 

### Building

#### Setup python

Mkdocs framework needs python to run. We propose to use uv to proceed.

See [uv documentation](https://docs.astral.sh/uv/getting-started/installation/) to install it.


You need a compatible python version. You may have to install it manually (e.g. with pyenv).
Then you may create a virtualenv, install dependencies and activate the env:

```console
    uv venv --python 3.12
    source .venv/bin/activate
```

!!! Tip

    You would probably use an editor, make sure you configure it to use the same virtual environment you created (it will probably autodetect it) so that you can get autocompletion and inline errors. Here some links for [VSCode](https://code.visualstudio.com/docs/python/environments#_select-and-activate-an-environment) and [PyCharm](https://www.jetbrains.com/help/pycharm/creating-virtual-environment.html).  

#### Install dependencies

```python
uv pip install -r docs/requirements.txt
```

### Serving

```python
uv run mkdocs serve
```

If you need to export, you can use the build command from mkdocs.
See [https://www.mkdocs.org/](https://www.mkdocs.org/) for more informations.


## Adding documentation

Website structure is defined in the `nav` section of the mkdocs.yaml.

Use the docs/docs folder to organize where the documentation can be added :

- Getting started for installation and first steps
- User guide for user documentation
- Developer guide for technical documentation
- _static is for images, figures
- docstring is for automatic docstring generation (see below)
- javascript is only for addons or extra plugins of mkddocs


## Dosctring generation

You have to complete the folder docstring with the subrepositories you want. At the end put a markdown with anchor `::: package.module.submodule` where submodule is the module you want to auto generate.

!!! important

    The file has to be placed inside subrepositories reflecting the code folders architecture. The name of the .md file containing the anchor needs to correspond to the .py file to document.


## Configuration

The configuration can be found in mkdocs.yaml :

- plugins for docstrings generation, search, and offline mode
- markdown extension
    - snippets for including markdown located outside of the docs folder

## Stack choice

Mechaphlowers use the mkdocs stack for documentation.
This choice is based on :

- simplicity
- have to handle auto docstring generation
- have to handle math latex equations
- have to include plotly figures in html


Mkdocs need some configuration to reach those needs :

- mkdocs - _principal package_
- mkdocstrings-typescripts - _extension to generate docstring_ (optional/testing)
- mkdocs-material - _material theme used_

In the future, the package [mike](https://github.com/jimporter/mike) could be used to handle [multiple version of documentation](https://squidfunk.github.io/mkdocs-material/setup/setting-up-versioning/)

## CI

Some help from mkdocs to configure CI on github can be found [here](https://squidfunk.github.io/mkdocs-material/publishing-your-site/)