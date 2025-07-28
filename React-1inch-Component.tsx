import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

// 1inch API Integration React Component
// This demonstrates how to integrate the tested 1inch API into a React frontend

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
  private apiKey: string;
  private baseUrl: string;
  private headers: any;

  constructor(apiKey: string, chainId: number = 1) {
    this.apiKey = apiKey;
    this.baseUrl = `https://api.1inch.dev/swap/v6.0/${chainId}`;
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    };
  }

  async getSupportedTokens(): Promise<{ [address: string]: Token }> {
    const response = await fetch(`${this.baseUrl}/tokens`, {
      headers: this.headers,
    });

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

    const response = await fetch(url.toString(), {
      headers: this.headers,
    });

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

    const response = await fetch(url.toString(), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to build swap: ${response.status}`);
    }

    return await response.json();
  }

  async checkAllowance(tokenAddress: string, walletAddress: string): Promise<string> {
    const url = new URL(`${this.baseUrl}/approve/allowance`);
    url.searchParams.append('tokenAddress', tokenAddress);
    url.searchParams.append('walletAddress', walletAddress);

    const response = await fetch(url.toString(), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to check allowance: ${response.status}`);
    }

    const data = await response.json();
    return data.allowance;
  }

  async buildApproval(tokenAddress: string): Promise<SwapTransaction> {
    const url = new URL(`${this.baseUrl}/approve/transaction`);
    url.searchParams.append('tokenAddress', tokenAddress);

    const response = await fetch(url.toString(), {
      headers: this.headers,
    });

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

  // 1inch API instance
  const api = new OneInchAPI('q5nnUnM1Cd2Asd75mpg5QFFPcIVWyXzM');

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
      try {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        await web3Provider.send('eth_requestAccounts', []);
        const signer = web3Provider.getSigner();
        const address = await signer.getAddress();
        
        setProvider(web3Provider);
        setAccount(address);
        setError('');
      } catch (err) {
        setError('Failed to connect wallet');
      }
    } else {
      setError('MetaMask not found');
    }
  };

  // Load supported tokens
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const supportedTokens = await api.getSupportedTokens();
        setTokens(supportedTokens);
        
        // Set default tokens
        setFromToken(commonTokens.ETH);
        setToToken(commonTokens.USDC);
      } catch (err) {
        setError('Failed to load tokens');
      }
    };

    loadTokens();
  }, []);

  // Get quote when inputs change
  const getQuote = useCallback(async () => {
    if (!fromToken || !toToken || !amount || isNaN(Number(amount))) {
      setQuote(null);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const fromTokenData = tokens[fromToken];
      const decimals = fromTokenData?.decimals || 18;
      const amountWei = ethers.utils.parseUnits(amount, decimals).toString();

      const quoteResult = await api.getQuote(fromToken, toToken, amountWei, slippage);
      setQuote(quoteResult);
    } catch (err) {
      setError('Failed to get quote');
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [fromToken, toToken, amount, slippage, tokens]);

  // Debounced quote fetching
  useEffect(() => {
    const timer = setTimeout(getQuote, 500);
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

      // Check if approval is needed (skip for ETH)
      if (fromToken !== commonTokens.ETH) {
        const allowance = await api.checkAllowance(fromToken, account);
        
        if (ethers.BigNumber.from(allowance).lt(ethers.BigNumber.from(amountWei))) {
          // Build and execute approval
          const approvalTx = await api.buildApproval(fromToken);
          const signer = provider.getSigner();
          
          const approveTx = await signer.sendTransaction({
            to: approvalTx.to,
            data: approvalTx.data,
            gasLimit: approvalTx.gas,
          });
          
          await approveTx.wait();
        }
      }

      // Build and execute swap
      const swapData = await api.buildSwap(fromToken, toToken, amountWei, account, slippage);
      const signer = provider.getSigner();

      const tx = await signer.sendTransaction({
        to: swapData.tx.to,
        data: swapData.tx.data,
        value: swapData.tx.value,
        gasLimit: swapData.tx.gas,
      });

      const receipt = await tx.wait();
      
      // Reset form on success
      setAmount('');
      setQuote(null);
      
      alert(`Swap successful! Transaction: ${receipt.transactionHash}`);
      
    } catch (err) {
      setError(`Swap failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Format token amount for display
  const formatTokenAmount = (amount: string, tokenAddress: string): string => {
    const tokenData = tokens[tokenAddress];
    const decimals = tokenData?.decimals || 18;
    return ethers.utils.formatUnits(amount, decimals);
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
      <h2>1inch Token Swap</h2>
      
      {/* Wallet Connection */}
      <div className="wallet-section">
        {account ? (
          <div className="wallet-connected">
            ✅ Connected: {account.slice(0, 6)}...{account.slice(-4)}
          </div>
        ) : (
          <button onClick={connectWallet} className="connect-button">
            Connect Wallet
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {/* Swap Interface */}
      <div className="swap-interface">
        {/* From Token */}
        <div className="token-input">
          <label>From:</label>
          {renderTokenSelector(fromToken, setFromToken, toToken)}
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="amount-input"
          />
        </div>

        {/* Swap Direction Button */}
        <button
          onClick={() => {
            setFromToken(toToken);
            setToToken(fromToken);
          }}
          className="swap-direction"
        >
          ⇅
        </button>

        {/* To Token */}
        <div className="token-input">
          <label>To:</label>
          {renderTokenSelector(toToken, setToToken, fromToken)}
        </div>

        {/* Slippage Settings */}
        <div className="slippage-settings">
          <label>Slippage: {slippage}%</label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={slippage}
            onChange={(e) => setSlippage(Number(e.target.value))}
            className="slippage-slider"
          />
        </div>

        {/* Quote Display */}
        {quote && (
          <div className="quote-display">
            <h3>Quote:</h3>
            <p>
              Expected Output: {formatTokenAmount(quote.dstAmount, toToken)}{' '}
              {tokens[toToken]?.symbol}
            </p>
            {quote.estimatedGas && (
              <p>Estimated Gas: {quote.estimatedGas}</p>
            )}
            <p>Route: {quote.protocols[0]?.length || 0} protocol(s)</p>
          </div>
        )}

        {/* Swap Button */}
        <button
          onClick={executeSwap}
          disabled={!account || !quote || loading}
          className={`swap-button ${loading ? 'loading' : ''}`}
        >
          {loading ? 'Processing...' : 'Swap Tokens'}
        </button>
      </div>

      {/* Styles */}
      <style jsx>{`
        .swap-container {
          max-width: 400px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 12px;
          background: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .wallet-section {
          margin-bottom: 20px;
          text-align: center;
        }

        .connect-button {
          background: #0066cc;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
        }

        .wallet-connected {
          background: #e8f5e8;
          padding: 10px;
          border-radius: 8px;
          color: #2e7d32;
        }

        .error-message {
          background: #ffeaa7;
          color: #d63031;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .token-input {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 15px;
        }

        .token-selector, .amount-input {
          flex: 1;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .swap-direction {
          align-self: center;
          background: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          cursor: pointer;
          font-size: 18px;
          margin: 10px auto;
        }

        .slippage-settings {
          margin: 15px 0;
        }

        .slippage-slider {
          width: 100%;
          margin-top: 5px;
        }

        .quote-display {
          background: #e3f2fd;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
        }

        .quote-display h3 {
          margin: 0 0 10px 0;
          color: #1976d2;
        }

        .quote-display p {
          margin: 5px 0;
          font-size: 14px;
        }

        .swap-button {
          width: 100%;
          background: #00d4aa;
          color: white;
          border: none;
          padding: 15px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }

        .swap-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .swap-button.loading {
          background: #999;
        }

        .swap-button:hover:not(:disabled) {
          background: #00c19a;
        }
      `}</style>
    </div>
  );
};

export default OneInchSwapComponent; 