const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// 1inch API configuration
const API_KEY = 'q5nnUnM1Cd2Asd75mpg5QFFPcIVWyXzM';
const BASE_URL = 'https://api.1inch.dev/swap/v6.0/1';

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // React frontend URL
  credentials: true
}));
app.use(express.json());

// Headers for 1inch API
const getHeaders = () => ({
  'Authorization': `Bearer ${API_KEY}`,
  'Accept': 'application/json',
  'Content-Type': 'application/json'
});

// Proxy endpoint for getting supported tokens
app.get('/api/tokens', async (req, res) => {
  try {
    console.log('🔄 Proxying tokens request...');
    
    const response = await fetch(`${BASE_URL}/tokens`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    console.log(`✅ Returned ${Object.keys(data.tokens).length} tokens`);
    res.json(data);
  } catch (error) {
    console.error('❌ Tokens request failed:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch tokens',
      details: error.message 
    });
  }
});

// Proxy endpoint for getting quotes
app.get('/api/quote', async (req, res) => {
  try {
    console.log('🔄 Proxying quote request...', req.query);
    
    const url = new URL(`${BASE_URL}/quote`);
    
    // Add query parameters
    Object.entries(req.query).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: getHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Quote successful:', data.dstAmount);
    res.json(data);
  } catch (error) {
    console.error('❌ Quote request failed:', error.message);
    res.status(500).json({ 
      error: 'Failed to get quote',
      details: error.message 
    });
  }
});

// Proxy endpoint for building swap transactions
app.get('/api/swap', async (req, res) => {
  try {
    console.log('🔄 Proxying swap request...', req.query);
    
    const url = new URL(`${BASE_URL}/swap`);
    
    // Add query parameters
    Object.entries(req.query).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: getHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Swap transaction built successfully');
    res.json(data);
  } catch (error) {
    console.error('❌ Swap request failed:', error.message);
    res.status(500).json({ 
      error: 'Failed to build swap',
      details: error.message 
    });
  }
});

// Proxy endpoint for checking allowances
app.get('/api/approve/allowance', async (req, res) => {
  try {
    console.log('🔄 Proxying allowance check...', req.query);
    
    const url = new URL(`${BASE_URL}/approve/allowance`);
    
    // Add query parameters
    Object.entries(req.query).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: getHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Allowance check successful:', data.allowance);
    res.json(data);
  } catch (error) {
    console.error('❌ Allowance check failed:', error.message);
    res.status(500).json({ 
      error: 'Failed to check allowance',
      details: error.message 
    });
  }
});

// Proxy endpoint for building approval transactions
app.get('/api/approve/transaction', async (req, res) => {
  try {
    console.log('🔄 Proxying approval transaction...', req.query);
    
    const url = new URL(`${BASE_URL}/approve/transaction`);
    
    // Add query parameters
    Object.entries(req.query).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: getHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Approval transaction built successfully');
    res.json(data);
  } catch (error) {
    console.error('❌ Approval transaction failed:', error.message);
    res.status(500).json({ 
      error: 'Failed to build approval',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: '1inch API Proxy Server is running',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 1inch API Proxy Server Running!
=====================================
📡 Server URL: http://localhost:${PORT}
🔑 API Key: ${API_KEY.slice(0, 8)}...${API_KEY.slice(-8)}
🌐 CORS enabled for: http://localhost:3000
⚡ Ready to proxy 1inch API requests!

📋 Available endpoints:
• GET /api/health - Health check
• GET /api/tokens - Get supported tokens
• GET /api/quote - Get swap quotes
• GET /api/swap - Build swap transactions
• GET /api/approve/allowance - Check token allowances
• GET /api/approve/transaction - Build approval transactions
`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down 1inch API Proxy Server...');
  process.exit(0);
}); 