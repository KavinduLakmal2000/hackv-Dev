import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ui/ErrorBoundary.jsx';
import { validateEnv } from './utils/validateEnv.js';
import './theme/terminal.css';

// Validate required environment variables before anything else runs.
// In production this crashes with a clear error page instead of a blank screen.
// In dev it logs a warning and uses fallback defaults.
validateEnv();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
