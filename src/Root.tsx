// FIX: Added a triple-slash directive to provide DOM type definitions, resolving the error for 'window.location'.
/// <reference lib="dom" />

import React from 'react';
import App from './App';
import { TestPage } from './TestPage';

const Root: React.FC = () => {
    const path = window.location.pathname;

    if (path.startsWith('/test')) {
        return <TestPage />;
    }

    return <App />;
};

export default Root;
