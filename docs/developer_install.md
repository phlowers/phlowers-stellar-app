# Installation

## Prerequisites
1. You need to install node/npm. We propose to use nvm to be precise on its version.  
- [For nvm](https://github.com/nvm-sh/nvm)
- Set node version to 23 using `nvm install v23` and `nvm use 23`

2. You will need `uv` to run the script for mechaflowers setup.  
*mechaflowers is python's scripts for complexe physics calculations*  
[uv installation doc](https://docs.astral.sh/uv/getting-started/installation/)
   - to install uv for windows: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`
   - to install uv for macOS and linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`

3. We advise installation of global angular CLI.
You should match global and local project CLI by watching current version in `package.json`.  
`npm i -g @angular/cli@project_cli_version`
    - local CLI could be use but is not recommanded

## Install dependencies and Run locally 
1. install global packages with npm `npm i` / `npm install`

2. Setup mechaflowers using local script `npm run set-up-mechaphlowers`

3. Launch local server with `ng serve` or `npm run start`
