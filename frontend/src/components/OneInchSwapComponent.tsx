import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import './OneInchSwapComponent.css';

// Web3 Window extension
declare global {
  interface Window {
    ethereum?: any;
  }
}

// 1inch API Integration Class
interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

interface Quote {
  dstAmount: string;
  protocols: any[][];
  estimatedGas?: string;
}

interface SwapTransaction {
  to: string;
  data: string;
  value: string;
  gas: string;
  gasPrice: string;
}

class OneInchAPI {
  private baseUrl: string;

  constructor() {
    // Use local backend proxy instead of direct 1inch API
    this.baseUrl = 'http://localhost:3001/api';
  }

  async getSupportedTokens(): Promise<{ [address: string]: Token }> {
    const response = await fetch(`${this.baseUrl}/tokens`);

    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.status}`);
    }

    const data = await response.json();
    return data.tokens;
  }

  async getQuote(
    src: string,
    dst: string,
    amount: string,
    slippage: number = 1
  ): Promise<Quote> {
    const url = new URL(`${this.baseUrl}/quote`);
    url.searchParams.append('src', src);
    url.searchParams.append('dst', dst);
    url.searchParams.append('amount', amount);
    url.searchParams.append('slippage', slippage.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Failed to get quote: ${response.status}`);
    }

    return await response.json();
  }

  async buildSwap(
    src: string,
    dst: string,
    amount: string,
    from: string,
    slippage: number = 1
  ): Promise<{ tx: SwapTransaction; dstAmount: string }> {
    const url = new URL(`${this.baseUrl}/swap`);
    url.searchParams.append('src', src);
    url.searchParams.append('dst', dst);
    url.searchParams.append('amount', amount);
    url.searchParams.append('from', from);
    url.searchParams.append('slippage', slippage.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Failed to build swap: ${response.status}`);
    }

    return await response.json();
  }

  async checkAllowance(tokenAddress: string, walletAddress: string): Promise<string> {
    const url = new URL(`${this.baseUrl}/approve/allowance`);
    url.searchParams.append('tokenAddress', tokenAddress);
    url.searchParams.append('walletAddress', walletAddress);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Failed to check allowance: ${response.status}`);
    }

    const data = await response.json();
    return data.allowance;
  }

  async buildApproval(tokenAddress: string): Promise<SwapTransaction> {
    const url = new URL(`${this.baseUrl}/approve/transaction`);
    url.searchParams.append('tokenAddress', tokenAddress);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Failed to build approval: ${response.status}`);
    }

    return await response.json();
  }
}

// React Component for 1inch Token Swapping
const OneInchSwapComponent: React.FC = () => {
  // State management
  const [tokens, setTokens] = useState<{ [address: string]: Token }>({});
  const [fromToken, setFromToken] = useState<string>('');
  const [toToken, setToToken] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [account, setAccount] = useState<string>('');
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [slippage, setSlippage] = useState<number>(1);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // 1inch API instance (uses local backend proxy) - memoized to prevent infinite re-renders
  const api = useMemo(() => new OneInchAPI(), []);

  // Common token addresses
  const commonTokens = {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
  };

  // Connect wallet
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      setIsConnecting(true);
      try {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        await web3Provider.send('eth_requestAccounts', []);
        const signer = web3Provider.getSigner();
        const address = await signer.getAddress();
        
        setProvider(web3Provider);
        setAccount(address);
        setError('');
        console.log('✅ Wallet connected:', address);
      } catch (err) {
        setError('Failed to connect wallet');
        console.error('Wallet connection error:', err);
      } finally {
        setIsConnecting(false);
      }
    } else {
      setError('MetaMask not found. Please install MetaMask!');
    }
  };

  // Load supported tokens
  useEffect(() => {
    const loadTokens = async () => {
      try {
        console.log('🔄 Loading supported tokens...');
        const supportedTokens = await api.getSupportedTokens();
        setTokens(supportedTokens);
        
        // Set default tokens
        setFromToken(commonTokens.ETH);
        setToToken(commonTokens.USDC);
        
        console.log(`✅ Loaded ${Object.keys(supportedTokens).length} tokens`);
      } catch (err) {
        setError('Failed to load tokens');
        console.error('Token loading error:', err);
      }
    };

    loadTokens();
  }, [api]);

  // Get quote when inputs change
  const getQuote = useCallback(async () => {
    if (!fromToken || !toToken || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setQuote(null);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const fromTokenData = tokens[fromToken];
      const decimals = fromTokenData?.decimals || 18;
      const amountWei = ethers.utils.parseUnits(amount, decimals).toString();

      console.log(`🔍 Getting quote: ${amount} ${fromTokenData?.symbol} → ${tokens[toToken]?.symbol}`);
      
      const quoteResult = await api.getQuote(fromToken, toToken, amountWei, slippage);
      setQuote(quoteResult);
      
      const outputAmount = Number(quoteResult.dstAmount) / Math.pow(10, tokens[toToken]?.decimals || 18);
      console.log(`✅ Quote: ${outputAmount.toFixed(6)} ${tokens[toToken]?.symbol}`);
    } catch (err) {
      setError('Failed to get quote. Please check your inputs.');
      setQuote(null);
      console.error('Quote error:', err);
    } finally {
      setLoading(false);
    }
  }, [fromToken, toToken, amount, slippage, tokens, api]);

  // Debounced quote fetching
  useEffect(() => {
    const timer = setTimeout(getQuote, 1000);
    return () => clearTimeout(timer);
  }, [getQuote]);

  // Execute swap
  const executeSwap = async () => {
    if (!provider || !account || !quote || !amount) {
      setError('Missing requirements for swap');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const fromTokenData = tokens[fromToken];
      const decimals = fromTokenData?.decimals || 18;
      const amountWei = ethers.utils.parseUnits(amount, decimals).toString();

      console.log('🔄 Starting swap process...');

      // Check if approval is needed (skip for ETH)
      if (fromToken !== commonTokens.ETH) {
        console.log('🔐 Checking token approval...');
        const allowance = await api.checkAllowance(fromToken, account);
        
        if (ethers.BigNumber.from(allowance).lt(ethers.BigNumber.from(amountWei))) {
          console.log('⚠️ Insufficient allowance, requesting approval...');
          
          // Build and execute approval
          const approvalTx = await api.buildApproval(fromToken);
          const signer = provider.getSigner();
          
          const approveTx = await signer.sendTransaction({
            to: approvalTx.to,
            data: approvalTx.data,
            gasLimit: approvalTx.gas,
          });
          
          console.log('⏳ Waiting for approval confirmation...');
          await approveTx.wait();
          console.log('✅ Approval confirmed');
        }
      }

      // Build and execute swap
      console.log('🔨 Building swap transaction...');
      const swapData = await api.buildSwap(fromToken, toToken, amountWei, account, slippage);
      const signer = provider.getSigner();

      console.log('🚀 Executing swap...');
      const tx = await signer.sendTransaction({
        to: swapData.tx.to,
        data: swapData.tx.data,
        value: swapData.tx.value,
        gasLimit: swapData.tx.gas,
      });

      console.log('⏳ Waiting for confirmation...');
      const receipt = await tx.wait();
      
      // Reset form on success
      setAmount('');
      setQuote(null);
      
      console.log('🎉 Swap successful!', receipt.transactionHash);
      alert(`✅ Swap successful!\nTransaction: ${receipt.transactionHash}`);
      
    } catch (err: any) {
      const errorMessage = err?.message || 'Unknown error';
      setError(`Swap failed: ${errorMessage}`);
      console.error('Swap error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format token amount for display
  const formatTokenAmount = (amount: string, tokenAddress: string): string => {
    if (!amount || !tokenAddress) return '0.0';
    const tokenData = tokens[tokenAddress];
    const decimals = tokenData?.decimals || 18;
    try {
      return ethers.utils.formatUnits(amount, decimals);
    } catch (error) {
      console.error('Error formatting token amount:', error);
      return '0.0';
    }
  };

  // Render token selector
  const renderTokenSelector = (
    value: string,
    onChange: (value: string) => void,
    excludeToken?: string
  ) => (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="token-selector"
    >
      <option value="">Select Token</option>
      {Object.entries(commonTokens)
        .filter(([_, address]) => address !== excludeToken)
        .map(([symbol, address]) => (
          <option key={address} value={address}>
            {symbol}
          </option>
        ))}
    </select>
  );

  return (
    <div className="swap-container">
      <div className="swap-header">
        <h2>🔄 Token Swap</h2>
        <div className="api-status">
          <span className="status-badge">✅ Live API</span>
          <span className="status-badge">📊 Real Data</span>
        </div>
      </div>
      
      {/* Wallet Connection */}
      <div className="wallet-section">
        {account ? (
          <div className="wallet-connected">
            <span className="wallet-icon">💼</span>
            <span>Connected: {account.slice(0, 6)}...{account.slice(-4)}</span>
            <span className="network-badge">Ethereum</span>
          </div>
        ) : (
          <button 
            onClick={connectWallet} 
            className="connect-button"
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : '🔗 Connect Wallet'}
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Swap Interface */}
      <div className="swap-interface">
        {/* From Token */}
        <div className="token-input-group">
          <label className="input-label">From</label>
          <div className="token-input">
            {renderTokenSelector(fromToken, setFromToken, toToken)}
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="amount-input"
              step="any"
              min="0"
            />
          </div>
          {fromToken && tokens[fromToken] && (
            <div className="token-info">
              {tokens[fromToken]?.name || 'Loading...'}
            </div>
          )}
        </div>

        {/* Swap Direction Button */}
        <div className="swap-direction-container">
          <button
            onClick={() => {
              setFromToken(toToken);
              setToToken(fromToken);
              setQuote(null);
            }}
            className="swap-direction"
            title="Swap token order"
          >
            ⇅
          </button>
        </div>

        {/* To Token */}
        <div className="token-input-group">
          <label className="input-label">To</label>
          <div className="token-input">
            {renderTokenSelector(toToken, setToToken, fromToken)}
            <div className="amount-display">
              {quote ? formatTokenAmount(quote.dstAmount, toToken) : '0.0'}
            </div>
          </div>
          {toToken && tokens[toToken] && (
            <div className="token-info">
              {tokens[toToken]?.name || 'Loading...'}
            </div>
          )}
        </div>

        {/* Slippage Settings */}
        <div className="slippage-settings">
          <label className="settings-label">
            ⚙️ Slippage: {slippage}%
          </label>
          <div className="slippage-controls">
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={slippage}
              onChange={(e) => setSlippage(Number(e.target.value))}
              className="slippage-slider"
            />
            <div className="slippage-presets">
              {[0.5, 1, 2, 5].map(preset => (
                <button
                  key={preset}
                  onClick={() => setSlippage(preset)}
                  className={`preset-button ${slippage === preset ? 'active' : ''}`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quote Display */}
        {quote && Object.keys(tokens).length > 0 && (
          <div className="quote-display">
            <h3>📊 Quote Details</h3>
            <div className="quote-item">
              <span>Expected Output:</span>
              <span className="quote-value">
                {formatTokenAmount(quote.dstAmount, toToken)} {tokens[toToken]?.symbol || 'Token'}
              </span>
            </div>
            {quote.estimatedGas && (
              <div className="quote-item">
                <span>Estimated Gas:</span>
                <span className="quote-value">{quote.estimatedGas}</span>
              </div>
            )}
            <div className="quote-item">
              <span>Route:</span>
              <span className="quote-value">{quote.protocols?.[0]?.length || 0} protocol(s)</span>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <button
          onClick={executeSwap}
          disabled={!account || !quote || loading || !amount}
          className={`swap-button ${loading ? 'loading' : ''}`}
        >
          {loading ? (
            <>
              <span className="spinner">⏳</span>
              Processing...
            </>
          ) : (
            '🚀 Swap Tokens'
          )}
        </button>

        {/* Info Section */}
        <div className="info-section">
          <div className="info-item">
            <span>💡 This uses the real 1inch API</span>
          </div>
          <div className="info-item">
            <span>🔐 Your wallet stays secure</span>
          </div>
          <div className="info-item">
            <span>⚡ Best rates from 139 protocols</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OneInchSwapComponent; 