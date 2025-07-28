# 1inch API Reference & Examples

## Overview

This document provides comprehensive API reference with practical examples for integra ting with 1inch protocols. All examples use real-world scenarios and include error handling.

## Authentication

All 1inch APIs require authentication via API key from the [1inch Developer Portal](https://portal.1inch.dev/).

```javascript
const API_KEY = 'YOUR_API_KEY_FROM_PORTAL';
const BASE_HEADERS = {
    'Authorization': `Bearer ${API_KEY}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
};
```

## 1. Aggregation Protocol API

### Base URLs by Network

```javascript
const AGGREGATION_URLS = {
    1: 'https://api.1inch.dev/swap/v6.0/1',      // Ethereum
    56: 'https://api.1inch.dev/swap/v6.0/56',    // BSC
    137: 'https://api.1inch.dev/swap/v6.0/137',  // Polygon
    42161: 'https://api.1inch.dev/swap/v6.0/42161', // Arbitrum
    10: 'https://api.1inch.dev/swap/v6.0/10',    // Optimism
    43114: 'https://api.1inch.dev/swap/v6.0/43114' // Avalanche
};
```

### 1.1 Get Token Quote

**Endpoint:** `GET /quote`

**Purpose:** Get the best exchange rate for a token swap without gas estimation.

```javascript
async function getQuote(params) {
    const {
        src,           // Source token address
        dst,           // Destination token address  
        amount,        // Amount in wei
        from,          // Optional: wallet address
        slippage = 1,  // Optional: slippage percentage (0.1-50)
        protocols,     // Optional: specific protocols to use
        fee = 0,       // Optional: platform fee (0-3%)
        complexityLevel = 2 // Optional: route complexity (0-3)
    } = params;

    const url = new URL(`${AGGREGATION_URLS[1]}/quote`);
    
    // Add required parameters
    url.searchParams.append('src', src);
    url.searchParams.append('dst', dst);
    url.searchParams.append('amount', amount);
    
    // Add optional parameters
    if (from) url.searchParams.append('from', from);
    if (slippage !== 1) url.searchParams.append('slippage', slippage);
    if (protocols) url.searchParams.append('protocols', protocols);
    if (fee > 0) url.searchParams.append('fee', fee);
    if (complexityLevel !== 2) url.searchParams.append('complexityLevel', complexityLevel);
    
    try {
        const response = await fetch(url.toString(), {
            headers: BASE_HEADERS
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Quote request failed:', error);
        throw error;
    }
}

// Example usage: Get quote for 1 ETH to USDC
const quoteExample = async () => {
    const result = await getQuote({
        src: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
        dst: '0xA0b86a33E6417c64d0FF50D2C84E2A02bB2F6EFa', // USDC
        amount: '1000000000000000000', // 1 ETH in wei
        slippage: 1.5 // 1.5% slippage
    });
    
    console.log('Expected output:', result.toAmount);
    console.log('Protocols used:', result.protocols);
};
```

**Response Schema:**
```typescript
interface QuoteResponse {
    toAmount: string;           // Expected output amount in wei
    protocols: Protocol[][];    // Route breakdown by protocols
    estimatedGas?: string;      // Gas estimate (if requested)
    tokens?: TokenInfo;         // Token metadata (if requested)
}
```

### 1.2 Build Swap Transaction

**Endpoint:** `GET /swap`

**Purpose:** Generate a complete transaction for executing a token swap.

```javascript
async function buildSwap(params) {
    const {
        src,
        dst, 
        amount,
        from,               // Required for swap
        slippage = 1,
        receiver,           // Optional: different recipient
        allowPartialFill = false,
        disableEstimate = false,
        usePatching = false,
        referrer           // Optional: referrer address for fees
    } = params;

    const url = new URL(`${AGGREGATION_URLS[1]}/swap`);
    
    // Add all parameters
    url.searchParams.append('src', src);
    url.searchParams.append('dst', dst);
    url.searchParams.append('amount', amount);
    url.searchParams.append('from', from);
    url.searchParams.append('slippage', slippage);
    
    if (receiver) url.searchParams.append('receiver', receiver);
    if (allowPartialFill) url.searchParams.append('allowPartialFill', 'true');
    if (disableEstimate) url.searchParams.append('disableEstimate', 'true');
    if (usePatching) url.searchParams.append('usePatching', 'true');
    if (referrer) url.searchParams.append('referrer', referrer);

    try {
        const response = await fetch(url.toString(), {
            headers: BASE_HEADERS
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Swap build failed: ${errorText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Swap build failed:', error);
        throw error;
    }
}

// Example: Build swap transaction for ETH to USDC
const swapExample = async () => {
    const walletAddress = '0x742d35Cc6634C0532925a3b8dGmage...';
    
    const swapData = await buildSwap({
        src: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
        dst: '0xA0b86a33E6417c64d0FF50D2C84E2A02bB2F6EFa', // USDC
        amount: '1000000000000000000', // 1 ETH
        from: walletAddress,
        slippage: 2, // 2% slippage tolerance
        allowPartialFill: false
    });
    
    // Execute with Web3
    if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        
        const tx = await signer.sendTransaction({
            to: swapData.tx.to,
            data: swapData.tx.data,
            value: swapData.tx.value,
            gasLimit: swapData.tx.gas,
            gasPrice: swapData.tx.gasPrice
        });
        
        console.log('Transaction hash:', tx.hash);
        const receipt = await tx.wait();
        console.log('Transaction confirmed:', receipt);
    }
};
```

**Response Schema:**
```typescript
interface SwapResponse {
    toAmount: string;
    tx: {
        from: string;
        to: string;
        data: string;
        value: string;
        gas: string;
        gasPrice: string;
    };
    protocols: Protocol[][];
}
```

### 1.3 Token Approval Management

**Check Current Allowance:**

```javascript
async function checkAllowance(tokenAddress, walletAddress, chainId = 1) {
    const url = `${AGGREGATION_URLS[chainId]}/approve/allowance`;
    const params = new URLSearchParams({
        tokenAddress,
        walletAddress
    });

    try {
        const response = await fetch(`${url}?${params}`, {
            headers: BASE_HEADERS
        });
        
        if (!response.ok) {
            throw new Error(`Allowance check failed: ${response.status}`);
        }
        
        const result = await response.json();
        return result.allowance;
    } catch (error) {
        console.error('Allowance check failed:', error);
        throw error;
    }
}
```

**Build Approve Transaction:**

```javascript
async function buildApproval(tokenAddress, amount, chainId = 1) {
    const url = `${AGGREGATION_URLS[chainId]}/approve/transaction`;
    const params = new URLSearchParams({
        tokenAddress
    });
    
    if (amount && amount !== 'unlimited') {
        params.append('amount', amount);
    }

    try {
        const response = await fetch(`${url}?${params}`, {
            headers: BASE_HEADERS
        });
        
        if (!response.ok) {
            throw new Error(`Approval build failed: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Approval build failed:', error);
        throw error;
    }
}

// Complete approval workflow
const approvalWorkflow = async (tokenAddress, spendAmount, walletAddress) => {
    // 1. Check current allowance
    const currentAllowance = await checkAllowance(tokenAddress, walletAddress);
    console.log('Current allowance:', currentAllowance);
    
    // 2. If insufficient, build approval transaction
    if (BigInt(currentAllowance) < BigInt(spendAmount)) {
        console.log('Insufficient allowance, building approval...');
        
        const approvalTx = await buildApproval(tokenAddress);
        
        // 3. Execute approval
        if (window.ethereum) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            
            const tx = await signer.sendTransaction({
                to: approvalTx.to,
                data: approvalTx.data,
                value: approvalTx.value,
                gasLimit: approvalTx.gas
            });
            
            console.log('Approval transaction:', tx.hash);
            await tx.wait();
            console.log('Approval confirmed');
        }
    } else {
        console.log('Sufficient allowance available');
    }
};
```

### 1.4 Get Supported Tokens

```javascript
async function getSupportedTokens(chainId = 1) {
    const url = `${AGGREGATION_URLS[chainId]}/tokens`;

    try {
        const response = await fetch(url, {
            headers: BASE_HEADERS
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch tokens: ${response.status}`);
        }
        
        const result = await response.json();
        return result.tokens;
    } catch (error) {
        console.error('Token fetch failed:', error);
        throw error;
    }
}

// Filter tokens by criteria
const findTokens = async (searchTerm) => {
    const tokens = await getSupportedTokens();
    
    return Object.values(tokens).filter(token => 
        token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
};
```

### 1.5 Get Supported Protocols

```javascript
async function getSupportedProtocols(chainId = 1) {
    const url = `${AGGREGATION_URLS[chainId]}/protocols`;

    try {
        const response = await fetch(url, {
            headers: BASE_HEADERS
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch protocols: ${response.status}`);
        }
        
        const result = await response.json();
        return result.protocols;
    } catch (error) {
        console.error('Protocol fetch failed:', error);
        throw error;
    }
}
```

## 2. Limit Order Protocol API

### Base URLs by Network

```javascript
const ORDERBOOK_URLS = {
    1: 'https://api.1inch.dev/orderbook/v4.0/1',      // Ethereum
    56: 'https://api.1inch.dev/orderbook/v4.0/56',    // BSC  
    137: 'https://api.1inch.dev/orderbook/v4.0/137',  // Polygon
    42161: 'https://api.1inch.dev/orderbook/v4.0/42161', // Arbitrum
    10: 'https://api.1inch.dev/orderbook/v4.0/10',    // Optimism
    43114: 'https://api.1inch.dev/orderbook/v4.0/43114' // Avalanche
};
```

### 2.1 Submit Limit Order

```javascript
async function submitOrder(orderData, signature, chainId = 1) {
    const url = `${ORDERBOOK_URLS[chainId]}/order`;
    
    const payload = {
        orderHash: orderData.orderHash,
        signature: signature,
        data: {
            salt: orderData.salt,
            maker: orderData.maker,
            receiver: orderData.receiver,
            makerAsset: orderData.makerAsset,
            takerAsset: orderData.takerAsset,
            makingAmount: orderData.makingAmount,
            takingAmount: orderData.takingAmount,
            makerTraits: orderData.makerTraits
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: BASE_HEADERS,
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Order submission failed: ${errorText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Order submission failed:', error);
        throw error;
    }
}
```

### 2.2 Create and Submit Complete Limit Order

```javascript
import { LimitOrderBuilder, Web3ProviderConnector } from '@1inch/limit-order-protocol-utils';

class LimitOrderManager {
    constructor(chainId, contractAddress, provider) {
        this.chainId = chainId;
        this.contractAddress = contractAddress;
        this.connector = new Web3ProviderConnector(provider);
        this.builder = new LimitOrderBuilder(
            contractAddress,
            chainId,
            this.connector
        );
    }

    async createLimitOrder(params) {
        const {
            makerAssetAddress,
            takerAssetAddress,
            makerAddress,
            makingAmount,
            takingAmount,
            receiver,
            expiry,
            allowedSender = '0x0000000000000000000000000000000000000000'
        } = params;

        // Build the order
        const order = this.builder.buildLimitOrder({
            makerAssetAddress,
            takerAssetAddress,
            makerAddress,
            makingAmount,
            takingAmount,
            receiver: receiver || makerAddress,
            allowedSender,
            expiry: expiry || Math.floor(Date.now() / 1000) + 86400 // 24 hours default
        });

        // Generate order hash
        const orderHash = this.builder.hashOrder(order);

        // Sign the order
        const signature = await this.connector.signTypedData(
            this.builder.domain(),
            this.builder.types(),
            order
        );

        return {
            order,
            orderHash,
            signature
        };
    }

    async submitLimitOrder(orderParams) {
        try {
            // 1. Create the order
            const { order, orderHash, signature } = await this.createLimitOrder(orderParams);

            // 2. Submit to 1inch orderbook
            const submissionResult = await submitOrder({
                ...order,
                orderHash
            }, signature, this.chainId);

            console.log('Order submitted successfully:', submissionResult);
            return { orderHash, ...submissionResult };
        } catch (error) {
            console.error('Limit order creation failed:', error);
            throw error;
        }
    }
}

// Usage example
const limitOrderExample = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const walletAddress = await signer.getAddress();
    
    const orderManager = new LimitOrderManager(
        1, // Ethereum
        '0x111111125421ca6dc452d289314280a0f8842a65', // 1inch LOP contract
        provider
    );

    // Create a limit order: Sell 1 ETH for 2000 USDC
    const orderResult = await orderManager.submitLimitOrder({
        makerAssetAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
        takerAssetAddress: '0xA0b86a33E6417c64d0FF50D2C84E2A02bB2F6EFa', // USDC
        makerAddress: walletAddress,
        makingAmount: '1000000000000000000', // 1 ETH
        takingAmount: '2000000000', // 2000 USDC (6 decimals)
        expiry: Math.floor(Date.now() / 1000) + 86400 // 24 hours
    });

    console.log('Order created with hash:', orderResult.orderHash);
};
```

### 2.3 Get Order Information

```javascript
async function getOrderByHash(orderHash, chainId = 1) {
    const url = `${ORDERBOOK_URLS[chainId]}/order/${orderHash}`;

    try {
        const response = await fetch(url, {
            headers: BASE_HEADERS
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Order not found');
            }
            throw new Error(`Failed to fetch order: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Order fetch failed:', error);
        throw error;
    }
}

async function getOrdersByMaker(makerAddress, options = {}, chainId = 1) {
    const {
        limit = 100,
        offset = 0,
        statuses // comma-separated: active,filled,cancelled,expired
    } = options;

    const url = new URL(`${ORDERBOOK_URLS[chainId]}/orders`);
    url.searchParams.append('maker', makerAddress);
    url.searchParams.append('limit', limit);
    url.searchParams.append('offset', offset);
    
    if (statuses) {
        url.searchParams.append('statuses', statuses);
    }

    try {
        const response = await fetch(url.toString(), {
            headers: BASE_HEADERS
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch orders: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Orders fetch failed:', error);
        throw error;
    }
}

// Get all active orders for a maker
const getActiveOrders = async (makerAddress) => {
    return await getOrdersByMaker(makerAddress, {
        statuses: 'active',
        limit: 500
    });
};
```

### 2.4 Get All Orders (Orderbook)

```javascript
async function getAllOrders(filters = {}, chainId = 1) {
    const {
        page = 1,
        limit = 100,
        makerAsset,
        takerAsset,
        maker,
        sortBy = 'createDateTime' // createDateTime, makingAmount, takingAmount
    } = filters;

    const url = new URL(`${ORDERBOOK_URLS[chainId]}/orders/all`);
    url.searchParams.append('page', page);
    url.searchParams.append('limit', limit);
    url.searchParams.append('sortBy', sortBy);
    
    if (makerAsset) url.searchParams.append('makerAsset', makerAsset);
    if (takerAsset) url.searchParams.append('takerAsset', takerAsset);
    if (maker) url.searchParams.append('maker', maker);

    try {
        const response = await fetch(url.toString(), {
            headers: BASE_HEADERS
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch orderbook: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Orderbook fetch failed:', error);
        throw error;
    }
}

// Get ETH/USDC orderbook
const getETHUSDCOrderbook = async () => {
    return await getAllOrders({
        makerAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
        takerAsset: '0xA0b86a33E6417c64d0FF50D2C84E2A02bB2F6EFa', // USDC
        limit: 50,
        sortBy: 'takingAmount'
    });
};
```

## 3. Error Handling & Rate Limiting

### Comprehensive Error Handler

```javascript
class OneInchAPIError extends Error {
    constructor(message, status, response) {
        super(message);
        this.name = 'OneInchAPIError';
        this.status = status;
        this.response = response;
    }
}

async function handleAPIRequest(requestFn, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await requestFn();
        } catch (error) {
            lastError = error;
            
            // Handle specific error codes
            if (error.status === 429) {
                // Rate limited - exponential backoff
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`Rate limited. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            if (error.status === 401) {
                throw new OneInchAPIError('Invalid API key', 401, error.response);
            }
            
            if (error.status >= 500) {
                // Server error - retry
                console.log(`Server error (${error.status}). Attempt ${attempt}/${maxRetries}`);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    continue;
                }
            }
            
            // Client error - don't retry
            if (error.status >= 400 && error.status < 500) {
                throw error;
            }
        }
    }
    
    throw lastError;
}

// Usage with error handling
const safeGetQuote = async (params) => {
    return await handleAPIRequest(() => getQuote(params));
};
```

### Rate Limit Manager

```javascript
class RateLimitManager {
    constructor(requestsPerSecond = 1) {
        this.interval = 1000 / requestsPerSecond;
        this.lastRequest = 0;
        this.queue = [];
        this.processing = false;
    }

    async execute(requestFn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ requestFn, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;

        while (this.queue.length > 0) {
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequest;

            if (timeSinceLastRequest < this.interval) {
                await new Promise(resolve => 
                    setTimeout(resolve, this.interval - timeSinceLastRequest)
                );
            }

            const { requestFn, resolve, reject } = this.queue.shift();
            this.lastRequest = Date.now();

            try {
                const result = await requestFn();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }

        this.processing = false;
    }
}

// Usage
const rateLimiter = new RateLimitManager(1); // 1 request per second

const rateLimitedQuote = async (params) => {
    return await rateLimiter.execute(() => getQuote(params));
};
```

## 4. Complete Trading Bot Example

```javascript
class OneInchTradingBot {
    constructor(apiKey, chainId = 1) {
        this.apiKey = apiKey;
        this.chainId = chainId;
        this.rateLimiter = new RateLimitManager(1);
        
        this.headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    }

    async getPrice(tokenA, tokenB, amount) {
        return await this.rateLimiter.execute(async () => {
            const quote = await getQuote({
                src: tokenA,
                dst: tokenB,
                amount: amount.toString(),
                slippage: 1
            });
            return quote.toAmount;
        });
    }

    async executeTrade(tokenA, tokenB, amount, walletAddress, slippage = 2) {
        try {
            // 1. Get quote first
            const quote = await this.getPrice(tokenA, tokenB, amount);
            console.log(`Expected output: ${quote} wei`);

            // 2. Check allowance if not ETH
            if (tokenA !== '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
                const allowance = await checkAllowance(tokenA, walletAddress, this.chainId);
                
                if (BigInt(allowance) < BigInt(amount)) {
                    console.log('Insufficient allowance, approval required');
                    const approvalTx = await buildApproval(tokenA, undefined, this.chainId);
                    // Return approval transaction for user to execute
                    return { type: 'approval', transaction: approvalTx };
                }
            }

            // 3. Build swap transaction
            const swapData = await buildSwap({
                src: tokenA,
                dst: tokenB,
                amount: amount.toString(),
                from: walletAddress,
                slippage,
                disableEstimate: false
            });

            return { type: 'swap', transaction: swapData.tx, expectedOutput: quote };
        } catch (error) {
            console.error('Trade execution failed:', error);
            throw error;
        }
    }

    async monitorLimitOrders(makerAddress) {
        const orders = await getOrdersByMaker(makerAddress, {
            statuses: 'active',
            limit: 100
        }, this.chainId);

        for (const order of orders) {
            try {
                // Check if order can be filled
                const currentPrice = await this.getPrice(
                    order.data.makerAsset,
                    order.data.takerAsset,
                    order.data.makingAmount
                );

                const orderPrice = BigInt(order.data.takingAmount);
                const marketPrice = BigInt(currentPrice);

                if (marketPrice >= orderPrice) {
                    console.log(`Order ${order.orderHash} can be filled!`);
                    console.log(`Order price: ${orderPrice}, Market price: ${marketPrice}`);
                }
            } catch (error) {
                console.error(`Error checking order ${order.orderHash}:`, error);
            }
        }
    }
}

// Bot usage example
const tradingBot = new OneInchTradingBot('YOUR_API_KEY', 1);

// Execute a trade
const executeTrade = async () => {
    const walletAddress = '0x742d35Cc6634C0532925a3b8dGmage...';
    
    const tradeResult = await tradingBot.executeTrade(
        '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
        '0xA0b86a33E6417c64d0FF50D2C84E2A02bB2F6EFa', // USDC
        '1000000000000000000', // 1 ETH
        walletAddress,
        2 // 2% slippage
    );

    if (tradeResult.type === 'approval') {
        console.log('Approval required first:', tradeResult.transaction);
    } else {
        console.log('Ready to execute swap:', tradeResult.transaction);
        console.log('Expected output:', tradeResult.expectedOutput);
    }
};

// Monitor limit orders
const monitorOrders = async () => {
    const walletAddress = '0x742d35Cc6634C0532925a3b8dGmage...';
    await tradingBot.monitorLimitOrders(walletAddress);
};
```

## 5. React Hooks for 1inch Integration

```typescript
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

// Custom hook for 1inch quotes
export const useOneInchQuote = (src: string, dst: string, amount: string) => {
    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchQuote = useCallback(async () => {
        if (!src || !dst || !amount) return;

        setLoading(true);
        setError(null);

        try {
            const result = await getQuote({ src, dst, amount });
            setQuote(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch quote');
        } finally {
            setLoading(false);
        }
    }, [src, dst, amount]);

    useEffect(() => {
        fetchQuote();
    }, [fetchQuote]);

    return { quote, loading, error, refetch: fetchQuote };
};

// Custom hook for limit orders
export const useLimitOrders = (makerAddress: string) => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchOrders = useCallback(async () => {
        if (!makerAddress) return;

        setLoading(true);
        try {
            const result = await getOrdersByMaker(makerAddress);
            setOrders(result);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    }, [makerAddress]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    return { orders, loading, refetch: fetchOrders };
};

// Example React component
const TradingInterface: React.FC = () => {
    const [fromToken, setFromToken] = useState('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE');
    const [toToken, setToToken] = useState('0xA0b86a33E6417c64d0FF50D2C84E2A02bB2F6EFa');
    const [amount, setAmount] = useState('1000000000000000000');
    
    const { quote, loading, error } = useOneInchQuote(fromToken, toToken, amount);

    return (
        <div>
            <h2>1inch Trading Interface</h2>
            
            {loading && <p>Loading quote...</p>}
            {error && <p>Error: {error}</p>}
            {quote && (
                <div>
                    <p>Expected output: {ethers.utils.formatUnits(quote.toAmount, 6)} USDC</p>
                    <p>Estimated gas: {quote.estimatedGas}</p>
                </div>
            )}
            
            {/* Add more UI components */}
        </div>
    );
};
```

## 6. Node.js Server Integration

```javascript
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
app.use(cors());
app.use(express.json());

// API wrapper class
class OneInchAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseHeaders = {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
        };
    }

    async makeRequest(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: { ...this.baseHeaders, ...options.headers }
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    async getQuote(chainId, params) {
        const url = new URL(`https://api.1inch.dev/swap/v6.0/${chainId}/quote`);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) url.searchParams.append(key, value);
        });

        return this.makeRequest(url.toString());
    }

    async buildSwap(chainId, params) {
        const url = new URL(`https://api.1inch.dev/swap/v6.0/${chainId}/swap`);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) url.searchParams.append(key, value);
        });

        return this.makeRequest(url.toString());
    }
}

const oneInchAPI = new OneInchAPI(process.env.ONEINCH_API_KEY);

// Routes
app.get('/api/quote/:chainId', async (req, res) => {
    try {
        const { chainId } = req.params;
        const quote = await oneInchAPI.getQuote(chainId, req.query);
        res.json(quote);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/swap/:chainId', async (req, res) => {
    try {
        const { chainId } = req.params;
        const swap = await oneInchAPI.buildSwap(chainId, req.query);
        res.json(swap);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Webhook for order updates
app.post('/api/webhook/order-update', (req, res) => {
    const { orderHash, status, event } = req.body;
    
    console.log(`Order ${orderHash} updated: ${status} (${event})`);
    
    // Process order update
    // Send notifications, update database, etc.
    
    res.json({ success: true });
});

app.listen(3000, () => {
    console.log('1inch API server running on port 3000');
});
```

## Summary

This API reference provides comprehensive examples for integrating with 1inch's Aggregation and Limit Order protocols. Key takeaways:

1. **Authentication**: Always use API keys from the official developer portal
2. **Error Handling**: Implement robust error handling with retries for network issues
3. **Rate Limiting**: Respect API rate limits to avoid being blocked
4. **Gas Optimization**: Use appropriate slippage and complexity settings
5. **Security**: Validate all parameters and responses before use

For more advanced integrations, consider the official 1inch SDKs and refer to the complete documentation at https://portal.1inch.dev/