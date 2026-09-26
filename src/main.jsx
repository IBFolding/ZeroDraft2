import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Web3Providers from './web3/Providers';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Web3Providers>
      <App />
    </Web3Providers>
  </React.StrictMode>
);
