import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { getSupabase } from './domain/services/supabaseClient';

// Supabase puede devolver tokens en el hash; con HashRouter los redirigimos a la ruta de reset.
(() => {
  const hash = window.location.hash || '';
  if (hash.includes('type=recovery') || hash.includes('type=signup')) {
    const sb = getSupabase();
    if (sb) {
      // Deja que el cliente parseé la sesión; luego forzamos la ruta de UI.
      void sb.auth.getSession().then(() => {
        if (!window.location.hash.startsWith('#/restablecer-clave')) {
          window.location.hash = '#/restablecer-clave';
        }
      });
    }
  }
})();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Ensure index.html contains a div with id="root".');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Silencioso: SW no crítico en desarrollo
    });
  });
}
