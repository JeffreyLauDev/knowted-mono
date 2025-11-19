
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import LogRocket from 'logrocket';
import setupLogRocketReact from 'logrocket-react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize LogRocket
LogRocket.init('4mafsl/knowted');

// Setup LogRocket React integration
setupLogRocketReact(LogRocket);

// Initialize Capacitor
import '@capacitor/core';

// Define custom elements for PWA features
defineCustomElements(window);

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
