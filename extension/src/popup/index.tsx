import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from './Popup';
import '../index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element for the Chrome Extension Popup');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
