Infrastructure
==============

This section documents the infrastructure layer located in ``src/app/core/infrastructure``.
This includes database entities, schemas, and DTOs (Data Transfer Objects).

Database
--------

app-database
^^^^^^^^^^^^

Main database configuration and initialization.

.. js:automodule:: app-database

Entities
--------

Database entities represent the data structures stored in IndexedDB.

study.entity
^^^^^^^^^^^^

Entity for storing study data.

.. js:automodule:: study.entity

user.entity
^^^^^^^^^^^

Entity for storing user data.

.. js:automodule:: user.entity

catalog-attachment.entity
^^^^^^^^^^^^^^^^^^^^^^^^^

Entity for storing attachment catalog data.

.. js:automodule:: catalog-attachment.entity

catalog-cable.entity
^^^^^^^^^^^^^^^^^^^^

Entity for storing cable catalog data.

.. js:automodule:: catalog-cable.entity

catalog-chain.entity
^^^^^^^^^^^^^^^^^^^^

Entity for storing chain catalog data.

.. js:automodule:: catalog-chain.entity

catalog-line.entity
^^^^^^^^^^^^^^^^^^^

Entity for storing line catalog data.

.. js:automodule:: catalog-line.entity

catalog-maintenance.entity
^^^^^^^^^^^^^^^^^^^^^^^^^^

Entity for storing maintenance team catalog data.

.. js:automodule:: catalog-maintenance.entity

Schemas
-------

Database schemas define the structure for IndexedDB collections.

study.schema
^^^^^^^^^^^^

Schema for study collection.

.. js:automodule:: study.schema

user.schema
^^^^^^^^^^^

Schema for user collection.

.. js:automodule:: user.schema

catalog-attachment.schema
^^^^^^^^^^^^^^^^^^^^^^^^^

Schema for attachment catalog collection.

.. js:automodule:: catalog-attachment.schema

catalog-cable.schema
^^^^^^^^^^^^^^^^^^^^

Schema for cable catalog collection.

.. js:automodule:: catalog-cable.schema

catalog-chain.schema
^^^^^^^^^^^^^^^^^^^^

Schema for chain catalog collection.

.. js:automodule:: catalog-chain.schema

catalog-line.schema
^^^^^^^^^^^^^^^^^^^

Schema for line catalog collection.

.. js:automodule:: catalog-line.schema

catalog-maintenance.schema
^^^^^^^^^^^^^^^^^^^^^^^^^^

Schema for maintenance team catalog collection.

.. js:automodule:: catalog-maintenance.schema

DTOs (Data Transfer Objects)
-----------------------------

DTOs are used to parse and transform data from external sources (CSV files).

attachment-csv.dto
^^^^^^^^^^^^^^^^^^

DTO for parsing attachment data from CSV.

.. js:automodule:: attachment-csv.dto

cable-csv.dto
^^^^^^^^^^^^^

DTO for parsing cable data from CSV.

.. js:automodule:: cable-csv.dto

chain-csv.dto
^^^^^^^^^^^^^

DTO for parsing chain data from CSV.

.. js:automodule:: chain-csv.dto

line-csv.dto
^^^^^^^^^^^^

DTO for parsing line data from CSV.

.. js:automodule:: line-csv.dto

maintenance-csv.dto
^^^^^^^^^^^^^^^^^^^

DTO for parsing maintenance team data from CSV.

.. js:automodule:: maintenance-csv.dto
