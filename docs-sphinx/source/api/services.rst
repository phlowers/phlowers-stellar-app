Services
========

This section documents the Angular services located in ``src/app/core/services``.

Storage & Data Services
-----------------------

storage.service
^^^^^^^^^^^^^^^

IndexedDB storage management service for persistent data storage.

.. js:automodule:: storage.service

studies.service
^^^^^^^^^^^^^^^

Service for managing studies (CRUD operations).

.. js:automodule:: studies.service

user.service
^^^^^^^^^^^^

Service for managing user information and preferences.

.. js:automodule:: user.service

Catalog Services
----------------

attachment.service
^^^^^^^^^^^^^^^^^^

Service for managing attachment catalog data.

.. js:automodule:: attachment.service

cables.service
^^^^^^^^^^^^^^

Service for managing cable catalog data.

.. js:automodule:: cables.service

chains.service
^^^^^^^^^^^^^^

Service for managing chain catalog data.

.. js:automodule:: chains.service

lines.service
^^^^^^^^^^^^^

Service for managing line catalog data.

.. js:automodule:: lines.service

maintenance.service
^^^^^^^^^^^^^^^^^^^

Service for managing maintenance team catalog data.

.. js:automodule:: maintenance.service

Domain Services
---------------

section.service
^^^^^^^^^^^^^^^

Service for managing section data and calculations.

.. js:automodule:: section.service

charges.service
^^^^^^^^^^^^^^^

Service for managing charge data (load conditions).

.. js:automodule:: charges.service

initial-condition.service
^^^^^^^^^^^^^^^^^^^^^^^^^

Service for managing initial conditions for calculations.

.. js:automodule:: initial-condition.service

Application Services
--------------------

changelog.service
^^^^^^^^^^^^^^^^^

Service for managing application changelog and version history.

.. js:automodule:: changelog.service

news.service
^^^^^^^^^^^^

Service for fetching and displaying application news.

.. js:automodule:: news.service

online.service
^^^^^^^^^^^^^^

Service for detecting online/offline status.

.. js:automodule:: online.service

Worker Services
---------------

worker-python.service
^^^^^^^^^^^^^^^^^^^^^

Service for managing the Python worker (Pyodide) for calculations.

.. js:automodule:: worker-python.service

worker-python
^^^^^^^^^^^^^

Python worker implementation.

.. js:automodule:: worker-python

worker_update.service
^^^^^^^^^^^^^^^^^^^^^

Service for managing service worker updates.

.. js:automodule:: worker_update.service

UI Services
-----------

plot.service
^^^^^^^^^^^^

Service for managing plot display options.

.. js:automodule:: plot.service
