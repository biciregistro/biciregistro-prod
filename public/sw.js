
self.addEventListener('install', (event) => {
  // El SW se instala inmediatamente
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Toma el control de inmediato
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Estrategia "Network Only" por defecto para evitar problemas de caché en desarrollo
  // Esto cumple el requisito técnico de PWA sin arriesgarse a servir contenido obsoleto
  event.respondWith(fetch(event.request));
});
