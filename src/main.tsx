import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById(`root`)!).render(<StrictMode><App /></StrictMode>);

// Navigation is always online-first. Only the offline explanation is cached.
if (`serviceWorker` in navigator && import.meta.env.PROD) {
  window.addEventListener(`load`, () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
      .then(registration => registration.update()).catch(() => {});
  });
}
