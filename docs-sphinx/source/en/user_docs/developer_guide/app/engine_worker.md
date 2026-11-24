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

## Hidden engine configuration

Some mechaphlowers options are left open for modification but are not exposed in the interface. They are overloaded from the browser console, applied immediately and again each time the worker starts.

### Console commands

The console exposes two commands on the global `stellarConfig` object.

```js
stellarConfig.setEngineConfig({ 'solver.acceleration.banded_jacobian.active': false })
```

`setEngineConfig(config)` stores the `config` object as JSON in the `engineConfig` key of the browser `localStorage` and applies it immediately. Every overloadable option is first restored to its mechaphlowers default, so the result only depends on `config`. To reset, apply an empty object:

```js
stellarConfig.setEngineConfig({})
```

The stored config is applied again each time the worker starts. Removing the key with `localStorage.removeItem('engineConfig')` does not change the running worker: reload the application for it to take effect.

`stellarConfig.getEngineConfig()` returns a promise resolving to the live value, in the Python runtime, of every overloadable option (what is actually applied, not what is stored):

```js
await stellarConfig.getEngineConfig()
// { 'solver.acceleration.banded_jacobian.active': true }
```

### Available options

The keys are the dotted path of the option in the mechaphlowers `options` object. Only the keys listed below are accepted.

| Key | Type | mechaphlowers option |
|---|---|---|
| `solver.acceleration.banded_jacobian.active` | boolean | `BandedJacobianConfig.active` |

### How it is applied

1. The worker loads Pyodide, then `functions.py` runs `init_config()` and `api.py` is loaded.
2. Once the worker is ready (and on each `setEngineConfig` console call), `WorkerPythonService` reads the `engineConfig` localStorage key and runs the `setEngineConfig` task, which calls the python function `set_engine_config` (`stellar_engine/core/engine_config.py`).
3. All overloadable options are restored to their default. If the stored config is empty, nothing else is changed and an info log "No engine configuration overload" is emitted. If the stored content is not a JSON object, a warning log is emitted in the console and an empty config is sent.
4. Otherwise each key/value is validated against the exact key, the value type and content. Invalid entries are ignored and a warning log "Wrong engine configuration loaded ... check or reset it" is emitted.
5. The validated entries are applied on the mechaphlowers `options`. A warning log lists each overloaded option with its value, and an `EngineConfigWarning` python warning is raised. It is shown once to the user as a toast (see [how to add error codes](how_to_add_error_codes.md)).

To make a new option overloadable, add its dotted path and a validation function to `ENGINE_CONFIG_VALIDATORS` in `engine_config.py`, then rebuild the engine wheel with `npm run set-up-mechaphlowers:engine-only`.
