/**
 * Ce fichier est le point d'entrée pour la configuration des tests avec Vitest.
 * Il initialise l'environnement de test Angular et configure les dépendances nécessaires.
 * Le code ci-dessous importe les modules essentiels et prépare l'environnement de test.
 */
import '@analogjs/vitest-angular/setup-zone';

import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { getTestBed } from '@angular/core/testing';

getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
