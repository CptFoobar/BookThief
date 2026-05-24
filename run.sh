#!/bin/bash

# Kill background processes on exit
trap "kill 0" EXIT

echo "Starting Backend..."
cd backend
python main.py &

echo "Starting Frontend..."
cd ../frontend
npm run dev -- --port 3000 &

wait
