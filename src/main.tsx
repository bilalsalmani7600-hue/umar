import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import '@/lib/pwa';

// Register Service Worker for PWA compliance and offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('SW registration error:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

