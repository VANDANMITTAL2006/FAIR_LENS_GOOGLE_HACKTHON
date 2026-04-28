
import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import { FairLensProvider } from './app/state/FairLensContext';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <FairLensProvider>
    <App />
  </FairLensProvider>,
);
  