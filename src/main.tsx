import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { ExpressiveProvider } from './components/expressive/shapes';
import './index.css';

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <ExpressiveProvider>
    <App />
  </ExpressiveProvider>
);
