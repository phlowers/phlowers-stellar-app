# Base de données

L'application doit stocker des données localement afin de pouvoir fonctionner hors ligne.

L'application utilise une base de données IndexedDB locale pour stocker les données. La logique et les tables de la base de données se trouvent dans `src/app/core/store`.

La base de données est utilisée pour stocker les données de l'application.

## Dexie

L'application utilise [Dexie](https://dexie.org/) comme surcouche pour la base de données IndexedDB.

Dexie facilite le travail avec IndexedDB en proposant une syntaxe plus claire et des fonctionnalités supplémentaires telles que l'indexation complexe, les requêtes en direct (live queries) et les données observables.

## Tables de la base de données

La base de données comporte les tables suivantes :

- `config` : stocke la configuration de l'application
- `data` : stocke les données de l'application
