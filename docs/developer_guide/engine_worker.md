# Engine Worker

The application uses a worker to run [mechaphlowers](https://github.com/phlowers/mechaphlowers) that is the calculation engine of the application. The worker is located at "src/app/core/engine/worker/worker.ts" and is responsible for:

- installing mechaphlowers
- running the engine
- returning the result

## Mechaphlowers Installation

The mechaphlowers installation is done thanks to pyodide with the help of the `loadPyodide` function. It partially loads the needed python packages wheels through a CDN for the heaviest packages (numpy, pandas, etc.) and loads the rest of the packages from the local assets.

Just after installation, the `pyodide.runPython` function is used to run an initial import of all the packages in order to load them into memory.

## Running the engine

The engine is ran with the `runTask` function. It takes a task and a data object as arguments.

The task is a string that corresponds to the function to call in the `worker.ts` file. The functions are python files located in the `src/app/core/engine/python-functions` directory.

The data is an object that contains the data to pass to the function. The data is passed to the python function thanks to the `pyodide.globals.set` function.

## Returned data

After the python function is ran, the result of the computation is read by the javascript code thanks to the `pyodide.globals.get` function and then returned to the caller of the `runTask` function via the `postMessage` function. The result can be used to update the UI or to update the database.


