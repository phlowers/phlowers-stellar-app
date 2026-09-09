# Worker du moteur

L'application utilise un worker pour exécuter [mechaphlowers](https://github.com/phlowers/mechaphlowers), qui est le moteur de calcul de l'application. Le worker est situé à "src/app/core/engine/worker/worker.ts" et est responsable de :

- l'installation de mechaphlowers
- l'exécution du moteur
- le retour du résultat

## Installation de Mechaphlowers

L'installation de mechaphlowers se fait grâce à pyodide à l'aide de la fonction `loadPyodide`. Elle charge partiellement les wheels des paquets python nécessaires via un CDN pour les paquets les plus lourds (numpy, pandas, etc.) et charge le reste des paquets depuis les assets locaux.

Juste après l'installation, la fonction `pyodide.runPython` est utilisée pour exécuter un import initial de tous les paquets afin de les charger en mémoire.

## Exécution du moteur

Le moteur est exécuté avec la fonction `runTask`. Elle prend une tâche et un objet de données en arguments.

La tâche est une chaîne de caractères correspondant à la fonction à appeler dans le fichier `worker.ts`. Les fonctions sont des fichiers python situés dans le répertoire `src/app/core/engine/python-functions`.

Les données sont un objet contenant les données à transmettre à la fonction. Les données sont transmises à la fonction python grâce à la fonction `pyodide.globals.set`.

## Données retournées

Une fois la fonction python exécutée, le résultat du calcul est lu par le code javascript grâce à la fonction `pyodide.globals.get`, puis renvoyé à l'appelant de la fonction `runTask` via la fonction `postMessage`. Le résultat peut être utilisé pour mettre à jour l'interface utilisateur ou pour mettre à jour la base de données.

