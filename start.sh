#!/bin/bash

# Boxy Run Multiplayer - Quick Start Script

echo "🎮 Boxy Run - Multiplayer Edition"
echo "=================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "🚀 Starting Boxy Run Multiplayer Server..."
echo ""
echo "Once started, open your browser and go to:"
echo "👉 http://localhost:3000"
echo ""
echo "To play with friends on the same network, share:"
echo "👉 http://YOUR_LOCAL_IP:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "=================================="
echo ""

# Start the server
npm start
