Services
========

Cette section documente les services Angular situés dans ``src/app/core/services``.

Services de stockage et de données
----------------------------------

storage.service
^^^^^^^^^^^^^^^

Service de gestion du stockage IndexedDB pour la persistance des données.

.. js:automodule:: storage.service

studies.service
^^^^^^^^^^^^^^^

Service de gestion des études (opérations CRUD).

.. js:automodule:: studies.service

user.service
^^^^^^^^^^^^

Service de gestion des informations et préférences utilisateur.

.. js:automodule:: user.service

Services de catalogue
---------------------

attachment.service
^^^^^^^^^^^^^^^^^^

Service de gestion des données du catalogue des attaches.

.. js:automodule:: attachment.service

cables.service
^^^^^^^^^^^^^^

Service de gestion des données du catalogue des câbles.

.. js:automodule:: cables.service

chains.service
^^^^^^^^^^^^^^

Service de gestion des données du catalogue des chaînes.

.. js:automodule:: chains.service

lines.service
^^^^^^^^^^^^^

Service de gestion des données du catalogue des lignes.

.. js:automodule:: lines.service

maintenance.service
^^^^^^^^^^^^^^^^^^^

Service de gestion des données du catalogue des équipes de maintenance.

.. js:automodule:: maintenance.service

Services de domaine
-------------------

section.service
^^^^^^^^^^^^^^^

Service de gestion des données de section et des calculs.

.. js:automodule:: section.service

charges.service
^^^^^^^^^^^^^^^

Service de gestion des données de charge (conditions de charge).

.. js:automodule:: charges.service

initial-condition.service
^^^^^^^^^^^^^^^^^^^^^^^^^

Service de gestion des conditions initiales pour les calculs.

.. js:automodule:: initial-condition.service

Services de l'application
-------------------------

changelog.service
^^^^^^^^^^^^^^^^^

Service de gestion du journal des modifications et de l'historique des versions de l'application.

.. js:automodule:: changelog.service

news.service
^^^^^^^^^^^^

Service de récupération et d'affichage des actualités de l'application.

.. js:automodule:: news.service

online.service
^^^^^^^^^^^^^^

Service de détection du statut en ligne/hors ligne.

.. js:automodule:: online.service

Services Worker
---------------

worker-python.service
^^^^^^^^^^^^^^^^^^^^^

Service de gestion du worker Python (Pyodide) pour les calculs.

.. js:automodule:: worker-python.service

worker-python
^^^^^^^^^^^^^

Implémentation du worker Python.

.. js:automodule:: worker-python

worker_update.service
^^^^^^^^^^^^^^^^^^^^^

Service de gestion des mises à jour du service worker.

.. js:automodule:: worker_update.service

Services d'interface utilisateur
--------------------------------

plot.service
^^^^^^^^^^^^

Service de gestion des options d'affichage des graphiques.

.. js:automodule:: plot.service
