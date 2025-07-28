# 1inch API Testing on Sepolia Testnet

This repository contains comprehensive examples and test scripts for integrating with the 1inch API on Ethereum Sepolia testnet.

## 🚀 Quick Start

### Prerequisites

1. **Get a 1inch API Key**
   - Visit [1inch Developer Portal](https://portal.1inch.dev/)
   - Sign up for a free account
   - Create a new API key

2. **Set Environment Variable**
   ```bash
   export ONEINCH_API_KEY="your_api_key_here"
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

### Running Tests

```bash
# Run basic API tests
npm test

# Run comprehensive demo
node demo-1inch-integration.js
```

## 📁 File Structure

- `test-1inch-sepolia.js` - Basic API connectivity tests
- `demo-1inch-integration.js` - Complete integration examples
- `1inch-api-reference.md` - Comprehensive API documentation
- `package.json` - Project dependencies

## 🔧 API Features Tested

### ✅ Supported Endpoints

1. **Token Information**
   - Get supported tokens on Sepolia
   - Token metadata and addresses

2. **Protocol Information**
   - Get supported DEX protocols
   - Available liquidity sources

3. **Quote Generation**
   - Get best swap rates
   - Slippage calculation
   - Gas estimation

4. **Transaction Building**
   - Build swap transactions
   - Approval transactions
   - Complete transaction data

5. **Limit Orders**
   - Create limit orders
   - Manage order lifecycle
   - Order status tracking

## 🌐 Network Support

The scripts are configured for:
- ✅ **Ethereum Mainnet** (Chain ID: 1)
- ✅ **Ethereum Sepolia** (Chain ID: 11155111) 
- ✅ **Ethereum Goerli** (Chain ID: 5)

## 💻 Code Examples

### Basic Quote Request

```javascript
const api = new OneInchAPI('YOUR_API_KEY', 11155111); // Sepolia

const quote = await api.getQuote(
    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
    '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // WETH on Sepolia
    '1000000000000000000' // 1 ETH
);

console.log('Expected output:', quote.toAmount);
```

### Complete Swap Transaction

```javascript
const swapData = await api.buildSwap(
    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
    '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // WETH
    '1000000000000000000', // 1 ETH
    walletAddress,
    { slippage: 2 } // 2% slippage
);

// Execute with ethers.js
const tx = await signer.sendTransaction(swapData.tx);
```

## 🎯 Integration Patterns

### 1. Frontend React Component

```jsx
import { useState } from 'react';
import { OneInchAPI } from './OneInchAPI';

function TokenSwap() {
    const [quote, setQuote] = useState(null);
    const api = new OneInchAPI('YOUR_API_KEY', 11155111);
    
    const handleGetQuote = async () => {
        const result = await api.getQuote(
            '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
            '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
            '1000000000000000000'
        );
        setQuote(result);
    };
    
    return (
        <div>
            <button onClick={handleGetQuote}>Get Quote</button>
            {quote && <p>Rate: {quote.toAmount} wei</p>}
        </div>
    );
}
```

### 2. Trading Bot

```javascript
class SepoliaTradingBot {
    constructor(apiKey, privateKey) {
        this.api = new OneInchAPI(apiKey, 11155111);
        this.provider = new ethers.providers.JsonRpcProvider('SEPOLIA_RPC');
        this.wallet = new ethers.Wallet(privateKey, this.provider);
    }
    
    async executeSwap(srcToken, dstToken, amount) {
        // 1. Get current quote
        const quote = await this.api.getQuote(srcToken, dstToken, amount);
        
        // 2. Build transaction
        const swapData = await this.api.buildSwap(
            srcToken, dstToken, amount, this.wallet.address
        );
        
        // 3. Execute transaction
        const tx = await this.wallet.sendTransaction(swapData.tx);
        return await tx.wait();
    }
}
```

### 3. Price Monitor

```javascript
async function monitorETHPrice() {
    const api = new OneInchAPI('YOUR_API_KEY', 11155111);
    
    setInterval(async () => {
        try {
            const quote = await api.getQuote(
                '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
                '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // WETH
                '1000000000000000000' // 1 ETH
            );
            
            console.log('ETH/WETH rate:', quote.toAmount);
        } catch (error) {
            console.error('Rate check failed:', error);
        }
    }, 30000); // Every 30 seconds
}
```

## 🔑 Common Sepolia Token Addresses

```javascript
const SEPOLIA_TOKENS = {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    WETH: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
    USDC: '0x07865c6E87B9F70255377e024ace6630C1Eaa37F', // If available
    DAI: '0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844'   // If available
};
```

⚠️ **Note**: Not all tokens may be available on Sepolia. Use the `getSupportedTokens()` method to check current availability.

## 📊 Test Results Structure

### Quote Response
```json
{
  "toAmount": "999000000000000000",
  "protocols": [
    [
      {
        "name": "WETH",
        "part": 100,
        "fromTokenAddress": "0xeeee...",
        "toTokenAddress": "0x7b79..."
      }
    ]
  ],
  "estimatedGas": "150000"
}
```

### Swap Transaction Response
```json
{
  "toAmount": "999000000000000000",
  "tx": {
    "from": "0x742d35Cc...",
    "to": "0x111111125421ca6dc452d289314280a0f8842a65",
    "data": "0x...",
    "value": "1000000000000000000",
    "gas": "150000",
    "gasPrice": "20000000000"
  }
}
```

## 🚨 Error Handling

All API methods include comprehensive error handling:

```javascript
try {
    const quote = await api.getQuote(src, dst, amount);
    console.log('Success:', quote);
} catch (error) {
    if (error.message.includes('HTTP 401')) {
        console.error('Invalid API key');
    } else if (error.message.includes('HTTP 400')) {
        console.error('Invalid parameters:', error.message);
    } else {
        console.error('Network error:', error.message);
    }
}
```

## 🎓 Next Steps

1. **Get Sepolia ETH**
   - Use [Sepolia Faucet](https://sepoliafaucet.com/)
   - Or [Alchemy Faucet](https://sepoliafaucet.com/)

2. **Test Small Amounts First**
   - Start with 0.01 ETH swaps
   - Monitor gas costs
   - Verify transaction success

3. **Deploy to Production**
   - Switch to Ethereum mainnet (Chain ID: 1)
   - Use production RPC endpoints
   - Implement proper key management

4. **Advanced Features**
   - Implement limit orders
   - Add price alerts
   - Build arbitrage strategies

## 📚 Additional Resources

- [1inch API Documentation](https://portal.1inch.dev/documentation)
- [1inch Developer Portal](https://portal.1inch.dev/)
- [Ethereum Sepolia Testnet](https://sepolia.dev/)
- [ethers.js Documentation](https://docs.ethers.io/)

## 🤝 Support

If you encounter issues:
1. Check your API key is valid
2. Verify network connectivity
3. Ensure token addresses are correct for Sepolia
4. Review the console output for detailed error messages

---

**Happy Trading! 🚀** 