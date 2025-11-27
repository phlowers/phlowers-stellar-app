# Database

The application needs to store data locally in order to be able to work offline.

The application uses a local indexedDB database to store the data. The database logics and tables are located at `src/app/core/store`.

The database is used to store the data for the application.

## Dexie

The application uses [Dexie](https://dexie.org/) as a wrapper for the indexedDB database.

Dexie makes it easier to work with IndexedDB by providing a cleaner syntax and additional features like complex indexing, live queries, and observable data.

## Database Tables

The database has the following tables:

- `config`: stores the application configuration
- `data`: stores the application data
