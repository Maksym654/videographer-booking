import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

// Полная очистка кеша, локального хранилища и service workers
(function clearAllBrowserCaches() {
  try {
    // Удаляем все записи из Cache API
    if ('caches' in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
    }

    // Чистим localStorage и sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // Удаляем зарегистрированные service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => reg.unregister());
      });
    }

    console.log('✅ Кеш и сервисы очищены');
  } catch (e) {
    console.warn('❌ Очистка кеша не удалась', e);
  }
})();
