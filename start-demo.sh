#!/bin/bash

echo "🚀 Starting Agora Conversational AI Demo..."

# Kill any existing processes on ports 3001 and 3002
echo "🔄 Cleaning up existing processes..."
pkill -f "node.*3001" 2>/dev/null || true
pkill -f "react-scripts.*3002" 2>/dev/null || true

# Start the server on port 3001
echo "📡 Starting server on port 3001..."
npm run server &
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Start the client on port 3002
echo "🖥️  Starting client on port 3002..."
cd client && PORT=3002 npm run start-external &
CLIENT_PID=$!

# Wait for both processes
echo "✅ Demo is starting up..."
echo "📊 Server: http://localhost:3001"
echo "🖥️  Client: http://localhost:3002"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
wait $SERVER_PID $CLIENT_PID

# Cleanup
echo "🔄 Stopping servers..."
kill $SERVER_PID 2>/dev/null || true
kill $CLIENT_PID 2>/dev/null || true
echo "✅ Demo stopped" 