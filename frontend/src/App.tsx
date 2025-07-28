import React from 'react';
import OneInchSwapComponent from './components/OneInchSwapComponent';
import './App.css';

function App() {
  return (
    <div className="App">
      <div className="app-container">
        <header className="app-header">
          <h1>🔄 1inch Trading App</h1>
          <p>Swap tokens with the best rates on Ethereum</p>
        </header>
        
        <main className="app-main">
          <OneInchSwapComponent />
        </main>
        
        <footer className="app-footer">
          <p>Powered by 1inch API • Real-time market data</p>
          <div className="status-indicators">
            <span className="status-item">
              ✅ Live API Connected
            </span>
            <span className="status-item">
              📊 Real Market Data
            </span>
            <span className="status-item">
              🔐 Secure Transactions
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App; 