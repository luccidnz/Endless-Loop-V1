// FIX: Added a triple-slash directive to provide DOM type definitions, resolving the error "Cannot find name 'document'".
/// <reference lib="dom" />

import React from 'react';
import ReactDOM from 'react-dom/client';
import Root from './Root';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
