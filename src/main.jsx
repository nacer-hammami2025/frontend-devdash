import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { AppProvider } from './context/AppContext';
import { useOfflineInit } from './hooks/useOfflineInit';
import { useOfflineSync } from './hooks/useOfflineSync';
import './styles.css';
import './styles/ConnectionStatus.css';

// Enregistrement du service worker (production uniquement)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker enregistré avec succès:', registration);
      })
      .catch(error => {
        console.error('Erreur lors de l\'enregistrement du Service Worker:', error);
      });
  });
}

// En dev, tenter de désenregistrer d'anciens service workers pour éviter le cache
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations?.().then(registrations => {
    registrations.forEach(r => r.unregister());
  }).catch(() => { });
}

// Wrapper component to initialize offline sync
function RootWithOffline() {
  // Enable only if flag set or default to true (can add VITE_OFFLINE_SYNC=0 to disable)
  const enableOffline = import.meta.env.VITE_OFFLINE_SYNC !== '0';
  const { ready, durationMs } = useOfflineInit({ enabled: enableOffline });
  useOfflineSync({ enabled: enableOffline && ready });
  if (enableOffline && !ready) {
    // Lightweight skeleton while initializing offline DB (avoids race for first offline action)
    return <div style={{ padding: '2rem', fontFamily: 'sans-serif', opacity: 0.7 }}>Initialisation offline…</div>;
  }
  return <App />;
}

// Détection si l'accès se fait via adresse IP directe pour choisir le routeur approprié
function isIPAddress(host) {
  // Regex simple pour détecter une adresse IP
  return /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(host);
}

const host = window.location.host;
const isIP = isIPAddress(host);
console.log(`Démarrage avec ${isIP ? 'HashRouter' : 'BrowserRouter'} (host: ${host})`);

// Utiliser HashRouter pour les adresses IP, BrowserRouter sinon
const Router = isIP ? HashRouter : BrowserRouter;

// Configuration supplémentaire pour HashRouter lors de l'utilisation d'une adresse IP
const routerProps = isIP ?
  { basename: '', future: { v7_startTransition: true, v7_relativeSplatPath: true } } :
  { future: { v7_startTransition: true, v7_relativeSplatPath: true } };

// Ajouter un gestionnaire d'erreurs global pour le débogage
window.addEventListener('error', (event) => {
  console.error('Erreur globale:', event.error || event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise rejection:', event.reason);
});

// Diagnostic: log si le navigateur reçoit du HTML pour un import JS (symptôme token '<')
async function probeDynamicImport(path) {
  try {
    const res = await fetch(path, { method: 'GET' });
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      console.warn('[Probe] Le chemin', path, 'retourne du HTML (peut causer Unexpected token "<"). Status:', res.status);
    }
  } catch (e) { console.warn('[Probe] Échec fetch', path, e); }
}
if (isIP) {
  // sonder quelques chunks probables (heuristique) uniquement en mode IP
  const guesses = ['/src/audio/audioEngine.js', '/src/components/ThemePicker.jsx'];
  guesses.forEach(g => probeDynamicImport(g));
}

// Wrapper le rendu dans un try-catch pour capturer les erreurs de rendu
try {
  createRoot(document.getElementById('root')).render(
    <Router {...routerProps}>
      <AppProvider>
        <ErrorBoundary>
          <RootWithOffline />
        </ErrorBoundary>
      </AppProvider>
    </Router>
  );
  console.log('Application rendue avec succès');
} catch (error) {
  console.error('Erreur lors du rendu de l\'application:', error);
  document.getElementById('root').innerHTML = `
    <div style="padding: 20px; font-family: sans-serif;">
      <h2>Une erreur est survenue lors du chargement de l'application</h2>
      <p>Veuillez recharger la page ou contacter le support.</p>
      <button onclick="window.location.reload()">Recharger</button>
    </div>
  `;
}
