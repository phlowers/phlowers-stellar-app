/// <reference types="vitest" />

// Importation du plugin Angular pour Vite
import angular from '@analogjs/vite-plugin-angular';

// Importation de la fonction defineConfig de Vite
import { defineConfig } from 'vite';

// Configuration de Vite
// La fonction defineConfig permet de définir la configuration avec l'aide de l'autocomplétion
export default defineConfig(({ mode }) => {
  return {
    // Configuration des plugins
    plugins: [
      // Utilisation du plugin Angular
      angular()
    ],
    // Configuration spécifique pour les tests
    test: {
      // Cela évite de devoir faire des imports supplémentaires dans chaque test comme import { it } from 'vitest'
      globals: true,
      // Utilise jsdom pour simuler un environnement de navigateur
      environment: 'jsdom',
      // Fichier de configuration pour les tests
      setupFiles: ['src/test-setup.ts'],
      // Inclut tous les fichiers se terminant par .spec.ts
      include: ['**/*.spec.ts'],
      // Un reporter est un plugin qui permet de formatter les résultats des tests
      reporters: ['default']
    },
    // Définition de variables globales
    define: {
      // Cette ligne permet à Vitest de fonctionner correctement en mode développement
      'import.meta.vitest': mode !== 'production'
    }
  };
});
