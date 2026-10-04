#!/bin/bash
# Start script for ManOSalwaKnot Python FastAPI Backend
cd "$(dirname "$0")"

echo "🚀 Starting ManOSalwaKnot Backend on http://localhost:3001..."

if [ -f ".venv/bin/uvicorn" ]; then
    exec .venv/bin/uvicorn main:app --host 0.0.0.0 --port 3001 --reload
else
    if [ -d ".venv" ]; then
        source .venv/bin/activate
    fi
    exec python3 -m uvicorn main:app --host 0.0.0.0 --port 3001 --reload
fi
