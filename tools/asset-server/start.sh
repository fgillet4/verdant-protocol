#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

# Activate local venv if present
if [ -f venv/bin/activate ]; then
  source venv/bin/activate
fi

pip install -r requirements.txt -q

python3 seed.py

uvicorn server:app --reload --port 7432
