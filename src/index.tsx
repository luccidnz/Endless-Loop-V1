// FIX: Add Vite client types reference to make `import.meta.env` available globally.
/// <reference types="vite/client" />

import React from 'react';
import ReactDOM from 'react-dom/client';
import Root from './Root';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);