#!/bin/bash

# Kill background processes on exit
trap "kill 0" EXIT

# Function to get local IP
get_local_ip() {
    hostname -I | awk '{print $1}'
}

LOCAL_IP=$(get_local_ip)
LOG_FILE="server.log"

echo "========================================"
echo "      BookThief Server Starting"
echo "========================================"
echo "Local Network URL: http://$LOCAL_IP:3000"
echo "Logging to: $LOG_FILE"
echo "========================================"

# Clear old logs
> "$LOG_FILE"

echo "[$(date)] Starting Backend..." >> "$LOG_FILE"
cd backend
python3 main.py >> "../$LOG_FILE" 2>&1 &

echo "[$(date)] Starting Frontend..." >> "../$LOG_FILE"
cd ../frontend
npm run build && npx vite preview --host 0.0.0.0 --port 3000 >> "../$LOG_FILE" 2>&1 &

# Wait for processes
wait
