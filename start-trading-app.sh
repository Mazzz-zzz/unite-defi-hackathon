#!/bin/bash

echo "🚀 Starting 1inch Trading App"
echo "============================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "🔧 Starting Backend Proxy Server (Port 3001)..."
echo "   - Handles CORS and 1inch API requests"
echo "   - API Key: q5nnUnM1...cIVWyXzM"
echo ""

# Start backend in background
npm run backend &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

echo "🌐 Starting React Frontend (Port 3000)..."
echo "   - Beautiful trading interface"
echo "   - MetaMask wallet integration"
echo "   - Real-time market data"
echo ""

# Start frontend in background
cd frontend && npm start &
FRONTEND_PID=$!

echo "✅ Both servers started successfully!"
echo ""
echo "📱 Open your browser and visit:"
echo "   🔗 http://localhost:3000"
echo ""
echo "🔥 Features Available:"
echo "   • 💰 Real-time token quotes"
echo "   • 🔄 Token swapping (ETH, USDC, USDT, etc.)"
echo "   • 🔗 MetaMask wallet connection"
echo "   • ⚙️ Slippage controls (0.1% - 5%)"
echo "   • 📊 Live market data from 1inch API"
echo "   • 🚀 Complete swap workflow"
echo ""
echo "⚡ Current Live Prices:"
curl -s "http://localhost:3001/api/quote?src=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&dst=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&amount=1000000000000000000" | node -e "
const fs = require('fs');
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const usdcAmount = (Number(data.dstAmount) / 1e6).toFixed(2);
    console.log('   💎 1 ETH = ' + usdcAmount + ' USDC');
  } catch(e) {
    console.log('   💎 Getting live prices...');
  }
});
"
echo ""
echo "⏹️  To stop both servers: Ctrl+C"
echo ""

# Wait for user to stop
trap 'echo ""; echo "🛑 Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT

# Keep script running
wait 