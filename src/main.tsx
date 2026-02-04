import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
// import App from './App.debug.tsx'
import './index.css'

import ErrorBoundary from './components/ErrorBoundary.tsx'

import { ThemeProvider } from './contexts/ThemeContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
