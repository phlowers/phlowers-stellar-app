---
html_theme.sidebar_secondary.remove: true
---

# Mise à jour de l'application

Cette page explique comment Stellar se met à jour et comment vos données utilisateur sont préservées.

## Éléments mis à jour

Lorsqu'une nouvelle version est déployée, l'application met à jour :

- les fichiers de l'application (HTML, JavaScript, CSS)
- les ressources statiques listées dans le manifeste
- les fichiers CSV du catalogue (lignes, câbles, chaînes, maintenance, attaches, types d'obstacles)

## Éléments préservés

Vos études ne sont pas supprimées lors d'une mise à jour normale.

- les études utilisateur restent dans IndexedDB
- seules les tables du catalogue sont resynchronisées si nécessaire

## Fonctionnement des mises à jour

1. Le *Service Worker* détecte une nouvelle version du manifeste.
2. Les fichiers de l'application sont téléchargés et remplacés dans le cache de l'application.
3. L'application compare les empreintes des fichiers CSV.
4. Seuls les catalogues dont le CSV a changé sont réimportés.

Cette approche réduit le trafic réseau, améliore les performances de démarrage et évite les réimportations inutiles.

## Quand intervenir

Dans la plupart des cas, les mises à jour sont automatiques.

Un message de notification peut s'afficher lorsqu'une nouvelle version est disponible. Dans ce cas :

1. Cliquez sur le bouton de mise à jour.
2. Attendez le message de confirmation.
3. Rechargez la page si nécessaire.

## Bonnes pratiques

- Gardez un seul onglet Stellar principal ouvert pendant la mise à jour.
- Évitez d'effectuer plusieurs rechargements de page consécutifs.
- Si vous êtes hors ligne, reconnectez-vous puis rechargez la page.

## Dépannage

Si vous voyez toujours une ancienne interface après le déploiement :

1. Fermez tous les onglets Stellar ouverts.
2. Rouvrez l'application.
3. Effectuez un rechargement complet du navigateur.

Si le problème persiste, contactez le support en indiquant :

- la version affichée dans l'interface
- la date et l'heure
- le nom et la version du navigateur
