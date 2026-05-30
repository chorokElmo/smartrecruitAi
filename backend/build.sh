#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Render.com build script for SmartRecruit AI backend
#
# Runs in order:
#   1. Install Python dependencies
#   2. Download spaCy English model (used by CV extractor)
#   3. Pre-cache sentence-transformers model (~80 MB, avoids cold-start delay)
#
# NOTE: Database migrations are run by render.yaml's `preDeployCommand`
#       (after build, before the new instance starts) — NOT here.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

echo "==> [1/3] Installing Python dependencies..."
pip install -r requirements.txt

echo "==> [2/3] Downloading spaCy English model..."
python -m spacy download en_core_web_sm

echo "==> [3/3] Pre-caching sentence-transformers model (all-MiniLM-L6-v2)..."
# SENTENCE_TRANSFORMERS_HOME is set to ./st_model_cache in render.yaml envVars.
# Downloading here bakes the model into the build so startup is instant.
python -c "
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
print('  Model cached — dim:', model.get_sentence_embedding_dimension())
"

echo "==> Build complete."
