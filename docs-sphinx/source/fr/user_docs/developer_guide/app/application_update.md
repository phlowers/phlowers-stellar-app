# Processus de mise à jour de l'application

L'application doit fonctionner hors ligne. Par conséquent, toutes les ressources doivent être téléchargées et mises en cache sur l'appareil de l'utilisateur. Elle doit également être capable de se mettre à jour elle-même lorsqu'une nouvelle version est disponible.

Les données de référence du catalogue (fichiers CSV/JSON) sont actualisées par un mécanisme
séparé et indépendant — voir [Processus de mise à jour du catalogue](catalog_update.md).

## Aperçu du Service Worker

Notre application utilise un service worker pour permettre les fonctionnalités hors ligne et gérer les mises à jour. Le service worker :

1. Met en cache les ressources de l'application lors de l'installation
2. Vérifie l'existence de nouvelles versions au chargement de l'application
3. Gère le processus de mise à jour lorsqu'une nouvelle version est disponible
4. Sert les ressources mises en cache lorsque l'utilisateur est hors ligne

Les fichiers de catalogue (`/data/*.csv`, `/data/obstacle_configuration.json`) sont **exclus**
du manifeste des ressources de l'application (`files`) — le service worker ne les
télécharge ni ne les met en cache. Seuls leurs hachages SHA-256 sont listés, sous
`data_hashes`, à l'usage du mécanisme de mise à jour du catalogue.

## Mécanisme de mise à jour

### Comment fonctionnent les mises à jour

1. Lorsqu'un utilisateur navigue vers l'application, le service worker vérifie l'existence d'une nouvelle version en comparant :
   - Le hash Git de la version actuelle (stocké en cache) et le hash Git de la dernière version (issu du manifeste serveur)
   - L'horodatage de build de la version actuelle (stocké en cache) et l'horodatage de build de la dernière version (issu du manifeste serveur)

2. Si une nouvelle version est détectée, le service worker en informe l'application via un événement message.

3. L'application peut alors afficher un message à l'utilisateur dans l'interface pour l'informer qu'une mise à jour est disponible.

4. L'utilisateur peut ensuite se rendre sur la page /admin et cliquer sur le bouton « Mettre à jour » pour télécharger la nouvelle version.

5. Pendant le processus de mise à jour, le service worker :
   - Télécharge les nouvelles ressources
   - Supprime les ressources obsolètes
   - Met à jour les informations de version en cache

### Autorisation et points d'entrée

`WorkerUpdateService` (`stellar/src/app/core/services/worker_update/worker_update.service.ts`)
est la seule classe autorisée à envoyer des commandes `install`/`update` au service
worker, via trois intentions explicites, réservées aux utilisateurs authentifiés :

- `confirmUpdate()` — l'utilisateur accepte la popup de mise à jour (`pendingAction` doit être
  `'first-install'` ou `'update-available'`).
- `forceUpdateFromAdmin()` — un clic explicite sur la page `/admin` (nécessite
  `pendingAction === 'update-available'`).
- `installFirstLaunch()` — la seule action autorisée à s'exécuter automatiquement, et uniquement
  lorsque le cache du service worker est confirmé vide (`pendingAction === 'first-install'`)
  **et** que l'utilisateur est authentifié.

Les trois méthodes lisent `AuthService.currentUser()` (lecture seule) et renvoient `false` sans
envoyer aucun message si l'utilisateur n'est pas authentifié ou si l'action en attente ne
correspond pas.

### Activation versionnée et atomique

Les versions de l'application sont activées de manière atomique afin d'éviter toute fenêtre hors ligne avec un
cache partiellement rempli :

- Chaque version est mise en cache sous son propre nom `app-assets-v-*` ; un petit cache
  de contrôle (`app-assets-control`) stocke le pointeur vers le cache actuellement `active`
  et conserve le `previous` pour un éventuel rollback.
- Une version candidate n'est entièrement préparée (y compris une vérification que
  `/index.html` et toutes les ressources du manifeste sont présentes) **qu'avant** le basculement
  du pointeur de contrôle — une seule écriture, effectuée uniquement en cas de succès complet.
- En cas d'échec avant l'activation, seule la version candidate incomplète est écartée ; la
  version active continue de servir l'application sans être affectée.
- La gestion des requêtes fetch résout une unique version cohérente par requête (active, ou
  previous en repli) — elle ne mélange jamais les ressources de deux versions.

### Génération de la liste des ressources

Le service worker s'appuie sur une liste pré-générée de ressources à mettre en cache afin de télécharger les bonnes ressources lorsqu'une mise à jour est disponible. Cette liste est créée pendant le processus de build à l'aide du script `create_assets_list_for_service_worker.py`.

#### Gestion des paquets Python

Les paquets Python (mechaphlowers et ses dépendances) sont gérés par le script `set_up_mechaphlowers.py`, qui :
- Détecte automatiquement toutes les dépendances (26 paquets)
- Privilégie les versions CDN lorsqu'elles sont disponibles (14/26 depuis le CDN Pyodide)
- Télécharge les paquets restants via pip (12/26)
- Optimise les wheels avec une compression Brotli/Gzip
- Stocke les paquets localement dans `public/pyodide/`

Exécutez le script de configuration avant de builder :
```bash
npm run set-up-mechaphlowers
```

#### Commandes de la liste des ressources

`npm run build` l'exécute automatiquement après `ng build`. Elle peut également être exécutée manuellement :

- `npm run create-assets-list-for-service-worker` - Génère la liste des ressources pour l'unique sortie de build Transloco dans `dist/`

Cette commande exécute le script Python qui :
1. Parcourt récursivement le répertoire de build `dist/`
2. Crée une liste de tous les fichiers (à l'exclusion des éléments sur liste noire comme le service worker lui-même)
3. Inclut les paquets Python présents dans `public/pyodide/` (gérés par `set_up_mechaphlowers.py`)
4. Génère les informations de version, notamment :
   - Le hash du commit Git
   - L'horodatage du build
   - La version de l'application depuis package.json
5. Écrit la liste complète des ressources dans `assets_list.json`
