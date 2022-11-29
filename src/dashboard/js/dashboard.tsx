import React from 'react';
import ReactDOM from 'react-dom/client';
import { DashboardApp } from './DashboardApp';

const root = ReactDOM.createRoot(document.querySelector('#app') as Element);

root.render(
  <React.StrictMode>
    <DashboardApp />
  </React.StrictMode>
);