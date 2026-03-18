#!/bin/bash
# Installation des dépendances Playwright pour Oracle Linux 8
# 
# Ce script installe les bibliothèques système nécessaires pour exécuter
# les navigateurs headless de Playwright (Chromium, Firefox, WebKit)
#
# Usage: sudo bash install-playwright-deps-oracle-linux.sh

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Installation des dépendances Playwright pour Oracle Linux 8"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$EUID" -ne 0 ]; then
  echo "❌ Erreur: Ce script doit être exécuté avec sudo"
  echo ""
  echo "Usage:"
  echo "  sudo bash install-playwright-deps-oracle-linux.sh"
  exit 1
fi

echo "📦 Installation des bibliothèques système..."
echo ""

dnf install -y \
  libX11-xcb \
  alsa-lib \
  mesa-libgbm \
  mesa-libEGL \
  libxkbcommon \
  libXcomposite \
  libXdamage \
  libXrandr \
  libXcursor \
  gtk3 \
  dbus-glib \
  nss \
  nspr \
  atk \
  at-spi2-atk \
  cups-libs \
  liberation-fonts

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Installation terminée avec succès !"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Vous pouvez maintenant exécuter les tests E2E :"
echo ""
echo "  npm run e2e:prepare  # Compiler l'application (première fois)"
echo "  npm run e2e          # Lancer les tests"
echo ""
