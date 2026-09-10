Infrastructure
==============

Cette section documente la couche d'infrastructure située dans ``src/app/core/infrastructure``.
Elle inclut les entités de base de données, les schémas et les DTOs (Data Transfer Objects).

Base de données
---------------

app-database
^^^^^^^^^^^^

Configuration et initialisation principales de la base de données.

.. js:automodule:: app-database

Entités
-------

Les entités de base de données représentent les structures de données stockées dans IndexedDB.

study.entity
^^^^^^^^^^^^

Entité pour le stockage des données d'étude.

.. js:automodule:: study.entity

user.entity
^^^^^^^^^^^

Entité pour le stockage des données utilisateur.

.. js:automodule:: user.entity

catalog-attachment.entity
^^^^^^^^^^^^^^^^^^^^^^^^^

Entité pour le stockage des données du catalogue des attaches.

.. js:automodule:: catalog-attachment.entity

catalog-cable.entity
^^^^^^^^^^^^^^^^^^^^

Entité pour le stockage des données du catalogue des câbles.

.. js:automodule:: catalog-cable.entity

catalog-chain.entity
^^^^^^^^^^^^^^^^^^^^

Entité pour le stockage des données du catalogue des chaînes.

.. js:automodule:: catalog-chain.entity

catalog-line.entity
^^^^^^^^^^^^^^^^^^^

Entité pour le stockage des données du catalogue des lignes.

.. js:automodule:: catalog-line.entity

catalog-maintenance.entity
^^^^^^^^^^^^^^^^^^^^^^^^^^

Entité pour le stockage des données du catalogue des équipes de maintenance.

.. js:automodule:: catalog-maintenance.entity

Schémas
-------

Les schémas de base de données définissent la structure des collections IndexedDB.

study.schema
^^^^^^^^^^^^

Schéma pour la collection des études.

.. js:automodule:: study.schema

user.schema
^^^^^^^^^^^

Schéma pour la collection des utilisateurs.

.. js:automodule:: user.schema

catalog-attachment.schema
^^^^^^^^^^^^^^^^^^^^^^^^^

Schéma pour la collection du catalogue des attaches.

.. js:automodule:: catalog-attachment.schema

catalog-cable.schema
^^^^^^^^^^^^^^^^^^^^

Schéma pour la collection du catalogue des câbles.

.. js:automodule:: catalog-cable.schema

catalog-chain.schema
^^^^^^^^^^^^^^^^^^^^

Schéma pour la collection du catalogue des chaînes.

.. js:automodule:: catalog-chain.schema

catalog-line.schema
^^^^^^^^^^^^^^^^^^^

Schéma pour la collection du catalogue des lignes.

.. js:automodule:: catalog-line.schema

catalog-maintenance.schema
^^^^^^^^^^^^^^^^^^^^^^^^^^

Schéma pour la collection du catalogue des équipes de maintenance.

.. js:automodule:: catalog-maintenance.schema

DTOs (objets de transfert de données)
-------------------------------------

Les DTOs sont utilisés pour analyser et transformer les données provenant de sources externes (fichiers CSV).

attachment-csv.dto
^^^^^^^^^^^^^^^^^^

DTO pour l'analyse des données d'attache depuis un fichier CSV.

.. js:automodule:: attachment-csv.dto

cable-csv.dto
^^^^^^^^^^^^^

DTO pour l'analyse des données de câble depuis un fichier CSV.

.. js:automodule:: cable-csv.dto

chain-csv.dto
^^^^^^^^^^^^^

DTO pour l'analyse des données de chaîne depuis un fichier CSV.

.. js:automodule:: chain-csv.dto

line-csv.dto
^^^^^^^^^^^^

DTO pour l'analyse des données de ligne depuis un fichier CSV.

.. js:automodule:: line-csv.dto

maintenance-csv.dto
^^^^^^^^^^^^^^^^^^^

DTO pour l'analyse des données d'équipe de maintenance depuis un fichier CSV.

.. js:automodule:: maintenance-csv.dto
