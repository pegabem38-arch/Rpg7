import { initDomProtection } from './services/domPatch';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Inicializa proteção global do DOM contra falhas de insertBefore / extensões / tradutores
initDomProtection();

// Registro robusto de Service Worker para PWA (garante instalação em qualquer navegador e Vercel)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('RPG PWA Service Worker registrado com sucesso:', registration.scope);
      })
      .catch((err) => {
        console.warn('Erro ao registrar Service Worker do PWA:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
