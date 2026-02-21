#!/usr/bin/env bash
set -e

# Install Python deps
pip install -r requirements.txt -q

# Start FastAPI backend in background
echo "Starting FastAPI backend on http://localhost:8000 ..."
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Install frontend deps & start dev server
echo "Starting React frontend on http://localhost:5173 ..."
cd frontend
npm install -q
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "LeanCRM is running!"
echo "  Frontend : http://localhost:5173"
echo "  API docs : http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
