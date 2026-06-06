#!/bin/zsh

# Function to handle cleanup on exit
cleanup() {
    echo "\nStopping servers..."
    kill $(jobs -p)
    exit
}

trap cleanup SIGINT SIGTERM

echo "Starting BookThief Debug Mode..."

# Start Backend
echo "Starting backend (FastAPI) on port 8000..."
cd backend
python3 main.py &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "Starting frontend (Vite) on port 5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Servers are running. Press Ctrl+C to stop."
wait
