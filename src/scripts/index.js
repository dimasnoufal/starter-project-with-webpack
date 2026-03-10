// CSS imports
import '../styles/styles.css';

import App from './pages/app';
import { registerOnlineSync } from './utils/offline-sync';

document.addEventListener('DOMContentLoaded', async () => {
  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });
  await app.renderPage();

  window.addEventListener('hashchange', async () => {
    await app.renderPage();
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      console.log('SW registered:', registration.scope);

      // Prompt update when new SW is waiting
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (err) {
      console.error('SW registration failed:', err);
    }
  }

  // Auto sync offline queue when back online
  registerOnlineSync();
});
