# Stellar Engine

This internal package is not intended to be used externally from stellar application.

Goals:
- enable to structure the python middleware layer between stellar and mechaphlowers.
- enable to perform unit and integration tests of this layer
- easy the python development in stellar
- simplify the python part in stellar

# Installation

The folder can be opened directly in stellar-engine in vscode and use the git repository from stellar-app.

If the opened folder is stellar-app it should be working as well by creating venv and selecting venv interpreter.

## uv installation

Go to uv documentation for installation instructions: https://docs.astral.sh/uv/getting-started/installation/

## setup venv

For Linux users, run the following command in the terminal to create and activate a virtual environment:

```bash
uv venv --python 3.13
source ./venv/bin/activate
```

## install dependencies

```bash
uv sync --all-groups
```

## Let's go ! 

You can now enjoy developing in stellar-engine. You can use the commands in the Makefile to run tests, linters, formatters, etc.

Don't forget to activate the venv before running any command and to cd into stellar-engine folder if you are not already there.



