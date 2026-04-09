#!/usr/bin/env bash
# build.sh — exécuté par Render avant le démarrage du service backend
set -e

echo "==> Installation des dépendances Python..."
pip install --no-cache-dir -r requirements.txt

echo "==> Création du dossier uploads..."
mkdir -p "${UPLOAD_DIR:-/uploads}"

echo "==> Build terminé. Le schéma de base de données sera créé au démarrage via SQLAlchemy."
