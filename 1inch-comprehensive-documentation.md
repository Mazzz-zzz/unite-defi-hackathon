# Comprehensive 1inch Limit Order Protocol & API Documentation

## Overview

The 1inch Network consists of multiple protocols that work together to provide decentralized exchange aggregation and limit order functionality:
- **Aggregation Protocol**: Finds the best rates across DEXs
- **Limit Order Protocol v4**: Enables off-chain order creation with on-chain execution
- **Fusion**: Advanced mode for gasless swaps and MEV protection

## 1. Limit Order Protocol v4

### Smart Contract Addresses

**Standard Address (Most Networks):** `0x111111125421ca6dc452d289314280a0f8842a65`

**Supported Networks:**
- Ethereum Mainnet
- BSC (Binance Smart Chain)
- Polygon (Matic)
- Arbitrum One
- Avalanche (AVAX)
- Fantom (FTM)
- Optimism
- Gnosis Chain
- Base
- Linea
- Scroll

**Exception:**
- zkSync Era: `0x6fd4383cb451173d5f9304f041c7bcbf27d561ff`

### Core Smart Contract Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IOrderMixin {
    struct Order {
        uint256 salt;
        address maker;
        address receiver;
        address makerAsset;
        address takerAsset;
        uint256 makingAmount;
        uint256 takingAmount;
        uint256 makerTraits;
    }

    // Core Functions
    function fillOrder(
        Order calldata order,
        bytes calldata signature,
        bytes calldata interaction,
        uint256 makingAmount,
        uint256 takingAmount,
        uint256 skipPermitAndThresholdAmount
    ) external payable returns (uint256, uint256, bytes32);

    function fillContractOrder(
        Order calldata order,
        bytes calldata signature,
        bytes calldata interaction,
        uint256 makingAmount,
        uint256 takingAmount,
        uint256 skipPermitAndThresholdAmount
    ) external returns (uint256, uint256, bytes32);

    function cancelOrder(uint256 makerTraits, bytes32 orderHash) external;
    
    function bitsInvalidateForOrder(
        uint256 makerTraits,
        uint256 additionalMask
    ) external;

    function hashOrder(Order calldata order) external view returns (bytes32);

    // Events
    event OrderFilled(
        bytes32 indexed orderHash,
        uint256 makingAmount,
        uint256 takingAmount
    );

    event OrderCancelled(bytes32 indexed orderHash);
    
    event BitInvalidatorUpdated(
        address indexed maker,
        uint256 slotIndex,
        uint256 slotValue
    );
}
```

### Protocol Features

**Basic Features:**
- Flexible asset receiver selection
- Partial/multiple fill controls
- Conditional order execution
- Custom interaction hooks
- Multiple token approval schemes (Permit, Permit2)
- Private order options (specified taker)
- Expiration timestamps and nonce management

**Advanced Features:**
- Non-standard token transfer proxies
- On-chain exchange rate calculations
- Dutch auction support
- MEV protection
- Cross-chain compatibility

**Supported Token Standards:**
- ERC20
- ERC721
- ERC1155
- Custom token implementations via extensions

## 2. Aggregation Protocol API

### Base URL
```
https://api.1inch.dev/swap/v6.0/{chainId}
```

### Authentication
All API calls require an API key from the 1inch Developer Portal:
```javascript
headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
}
```

### Core API Endpoints

#### 2.1 Get Quote
**Endpoint:** `GET /quote`

**Parameters:**
```javascript
{
    src: string,           // Source token address
    dst: string,           // Destination token address
    amount: string,        // Amount in wei
    from?: string,         // Wallet address
    slippage?: number,     // Max slippage percentage (0.1-50)
    protocols?: string,    // Comma-separated protocol list
    fee?: number,          // Platform fee (0-3%)
    gasPrice?: string,     // Gas price in wei
    complexityLevel?: number, // 0-3, higher = more complex routes
    parts?: number,        // Max parts for splitting (1-100)
    mainRouteParts?: number, // Main route parts
    gasLimit?: number,     // Gas limit
    includeTokensInfo?: boolean, // Include token metadata
    includeProtocols?: boolean,  // Include protocol info
    includeGas?: boolean   // Include gas estimates
}
```

**Response:**
```javascript
{
    "toAmount": "string",           // Expected output amount
    "protocols": [...],             // Route protocols
    "estimatedGas": "string",       // Gas estimate
    "tokens": {...}                 // Token information
}
```

#### 2.2 Build Swap Transaction
**Endpoint:** `GET /swap`

**Parameters:** (Same as quote plus:)
```javascript
{
    from: string,          // Required: wallet address
    receiver?: string,     // Recipient address
    allowPartialFill?: boolean,
    disableEstimate?: boolean,
    usePatching?: boolean
}
```

**Response:**
```javascript
{
    "toAmount": "string",
    "tx": {
        "from": "string",
        "to": "string",
        "data": "string",
        "value": "string",
        "gas": "string",
        "gasPrice": "string"
    }
}
```

#### 2.3 Get Allowance
**Endpoint:** `GET /approve/allowance`

**Parameters:**
```javascript
{
    tokenAddress: string,  // Token contract address
    walletAddress: string  // Wallet address
}
```

**Response:**
```javascript
{
    "allowance": "string"  // Current allowance in wei
}
```

#### 2.4 Build Approve Transaction
**Endpoint:** `GET /approve/transaction`

**Parameters:**
```javascript
{
    tokenAddress: string,  // Token to approve
    amount?: string        // Amount to approve (default: unlimited)
}
```

**Response:**
```javascript
{
    "to": "string",        // Contract address
    "data": "string",      // Transaction data
    "value": "string",     // ETH value (usually 0)
    "gas": "string",       // Gas limit
    "gasPrice": "string"   // Gas price
}
```

#### 2.5 Get Supported Tokens
**Endpoint:** `GET /tokens`

**Response:**
```javascript
{
    "tokens": {
        "0x...": {
            "symbol": "ETH",
            "name": "Ethereum",
            "decimals": 18,
            "address": "0x...",
            "logoURI": "string",
            "tags": ["native"]
        }
    }
}
```

#### 2.6 Get Protocols
**Endpoint:** `GET /protocols`

**Response:**
```javascript
{
    "protocols": [
        {
            "id": "UNISWAP_V3",
            "title": "Uniswap V3",
            "img": "string"
        }
    ]
}
```

## 3. Limit Order Protocol API

### Base URL
```
https://api.1inch.dev/orderbook/v4.0/{chainId}
```

### 3.1 Submit Order
**Endpoint:** `POST /order`

**Request Body:**
```javascript
{
    "orderHash": "string",
    "signature": "string",
    "data": {
        "salt": "string",
        "maker": "string",
        "receiver": "string",
        "makerAsset": "string",
        "takerAsset": "string",
        "makingAmount": "string",
        "takingAmount": "string",
        "makerTraits": "string"
    }
}
```

**Response:**
```javascript
{
    "success": true,
    "orderHash": "string"
}
```

### 3.2 Get Order by Hash
**Endpoint:** `GET /order/{orderHash}`

**Response:**
```javascript
{
    "orderHash": "string",
    "signature": "string",
    "createDateTime": "string",
    "makerBalance": "string",
    "makerAllowance": "string",
    "data": {
        "salt": "string",
        "maker": "string",
        "receiver": "string",
        "makerAsset": "string",
        "takerAsset": "string",
        "makingAmount": "string",
        "takingAmount": "string",
        "makerTraits": "string"
    }
}
```

### 3.3 Get Orders by Maker
**Endpoint:** `GET /orders`

**Parameters:**
```javascript
{
    maker: string,         // Maker address
    limit?: number,        // Results limit (default: 100, max: 500)
    offset?: number,       // Pagination offset
    statuses?: string      // Comma-separated status list
}
```

### 3.4 Get All Orders
**Endpoint:** `GET /orders/all`

**Parameters:**
```javascript
{
    page?: number,         // Page number
    limit?: number,        // Results per page
    makerAsset?: string,   // Filter by maker asset
    takerAsset?: string,   // Filter by taker asset
    maker?: string,        // Filter by maker address
    sortBy?: string        // Sort field
}
```

## 4. SDK Integration

### JavaScript/TypeScript SDK

#### Installation
```bash
npm install @1inch/limit-order-protocol-utils
npm install @1inch/limit-order-sdk
```

#### Basic Usage
```typescript
import { Api, FetchProviderConnector } from '@1inch/limit-order-sdk';

// Initialize API client
const api = new Api({
    networkId: 1, // Ethereum mainnet
    authKey: 'YOUR_API_KEY',
    httpConnector: new FetchProviderConnector()
});

// Submit an order
const orderResult = await api.submitOrder(order, signature);

// Get order by hash
const orderInfo = await api.getOrderByHash(orderHash);

// Get orders by maker
const orders = await api.getOrdersByMaker(makerAddress);
```

#### Order Creation Example
```typescript
import { LimitOrderBuilder, Web3ProviderConnector } from '@1inch/limit-order-protocol-utils';

const connector = new Web3ProviderConnector(web3);
const builder = new LimitOrderBuilder(
    '0x111111125421ca6dc452d289314280a0f8842a65', // Contract address
    1, // Chain ID
    connector
);

const order = builder.buildLimitOrder({
    makerAssetAddress: '0x...', // Maker token
    takerAssetAddress: '0x...', // Taker token
    makerAddress: '0x...', // Your address
    makingAmount: '1000000000000000000', // 1 token (18 decimals)
    takingAmount: '2000000000000000000', // 2 tokens
    receiver: '0x...', // Receiver address
});

const orderHash = builder.hashOrder(order);
const signature = await connector.signTypedData(
    builder.domain(),
    builder.types(),
    order
);
```

### Python SDK

#### Installation
```bash
pip install 1inch-limit-order-sdk
```

#### Basic Usage
```python
from limit_order_sdk import LimitOrderSdk

sdk = LimitOrderSdk(
    network_id=1,
    auth_key='YOUR_API_KEY'
)

# Submit order
result = sdk.submit_order(order, signature)

# Get order
order_info = sdk.get_order_by_hash(order_hash)
```

## 5. Network Support & Chain IDs

| Network | Chain ID | Contract Address |
|---------|----------|------------------|
| Ethereum | 1 | 0x111111125421ca6dc452d289314280a0f8842a65 |
| BSC | 56 | 0x111111125421ca6dc452d289314280a0f8842a65 |
| Polygon | 137 | 0x111111125421ca6dc452d289314280a0f8842a65 |
| Arbitrum | 42161 | 0x111111125421ca6dc452d289314280a0f8842a65 |
| Optimism | 10 | 0x111111125421ca6dc452d289314280a0f8842a65 |
| Avalanche | 43114 | 0x111111125421ca6dc452d289314280a0f8842a65 |
| Fantom | 250 | 0x111111125421ca6dc452d289314280a0f8842a65 |
| Gnosis | 100 | 0x111111125421ca6dc452d289314280a0f8842a65 |
| Base | 8453 | 0x111111125421ca6dc452d289314280a0f8842a65 |
| zkSync Era | 324 | 0x6fd4383cb451173d5f9304f041c7bcbf27d561ff |

## 6. Error Codes & Troubleshooting

### Common Error Codes

#### Aggregation API Errors
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid API key)
- `429` - Rate limit exceeded
- `500` - Internal server error

#### Limit Order Protocol Errors
```solidity
error InvalidatedOrder();
error TakingAmountExceeded();
error PrivateOrder();
error BadSignature();
error OrderExpired();
error InsufficientBalance();
error InsufficientAllowance();
```

### Rate Limits
- **Free Tier**: 1 request per second
- **Developer**: 10 requests per second
- **Enterprise**: Custom limits

Contact support@1inch.io for higher limits.

## 7. Security Considerations

### Smart Contract Security
- All contracts are audited by multiple security firms
- Use official contract addresses only
- Verify contract addresses on-chain
- Never interact with unverified contracts

### API Security
- Keep API keys secure and private
- Use HTTPS for all requests
- Implement proper error handling
- Validate all responses

### Order Security
- Verify order parameters before signing
- Use appropriate expiration times
- Be aware of MEV risks
- Consider using private orders for large trades

## 8. Gas Optimization

### Best Practices
- Use batch operations when possible
- Optimize order parameters
- Consider gas price timing
- Use permit/permit2 for approvals

### Estimated Gas Costs
- Simple swap: ~150,000 gas
- Complex multi-hop: ~300,000 gas
- Order creation: ~80,000 gas
- Order cancellation: ~50,000 gas

## 9. Integration Examples

### React Integration
```typescript
import { useState, useEffect } from 'react';
import { Web3Provider } from '@ethersproject/providers';

const useOneInchAPI = (chainId: number, apiKey: string) => {
    const [api, setApi] = useState(null);

    useEffect(() => {
        const initAPI = async () => {
            const provider = new Web3Provider(window.ethereum);
            const connector = new Web3ProviderConnector(provider);
            
            const apiInstance = new Api({
                networkId: chainId,
                authKey: apiKey,
                httpConnector: new FetchProviderConnector()
            });
            
            setApi(apiInstance);
        };
        
        initAPI();
    }, [chainId, apiKey]);

    return api;
};

// Usage in component
const TradingComponent = () => {
    const api = useOneInchAPI(1, process.env.REACT_APP_1INCH_API_KEY);
    
    const createLimitOrder = async (orderParams) => {
        if (!api) return;
        
        try {
            const result = await api.submitOrder(order, signature);
            console.log('Order submitted:', result);
        } catch (error) {
            console.error('Error submitting order:', error);
        }
    };
    
    return (
        <div>
            {/* Trading interface */}
        </div>
    );
};
```

### Node.js Backend Integration
```javascript
const express = require('express');
const { Api, FetchProviderConnector } = require('@1inch/limit-order-sdk');

const app = express();
app.use(express.json());

const api = new Api({
    networkId: 1,
    authKey: process.env.ONEINCH_API_KEY,
    httpConnector: new FetchProviderConnector()
});

app.post('/api/submit-order', async (req, res) => {
    try {
        const { order, signature } = req.body;
        const result = await api.submitOrder(order, signature);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/orders/:maker', async (req, res) => {
    try {
        const { maker } = req.params;
        const orders = await api.getOrdersByMaker(maker);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

## 10. Resources & Links

### Official Documentation
- [1inch Developer Portal](https://portal.1inch.dev/)
- [Limit Order Protocol Docs](https://docs.1inch.io/docs/limit-order-protocol/)
- [API Reference](https://docs.1inch.io/docs/aggregation-protocol/api/)

### GitHub Repositories
- [Limit Order Protocol](https://github.com/1inch/limit-order-protocol)
- [Protocol Utils](https://github.com/1inch/limit-order-protocol-utils)
- [JavaScript SDK](https://github.com/1inch/limit-order-sdk)
- [Python SDK](https://github.com/1inch/limit-order-sdk-py)

### Community & Support
- [Discord](https://discord.gg/1inch)
- [Telegram](https://t.me/OneInchNetwork)
- [Twitter](https://twitter.com/1inch)
- Email: support@1inch.io

### Security Audits
- [Audit Reports](https://github.com/1inch/1inch-audits)
- [Bug Bounty Program](https://docs.1inch.io/docs/security/bug-bounty-program)

---

*Last Updated: July 2025*
*This documentation is based on 1inch Limit Order Protocol v4 and Aggregation Protocol v6*