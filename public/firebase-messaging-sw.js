importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Fetch the configuration from a secure endpoint
fetch('/api/firebase-config')
  .then(response => response.json())
  .then(config => {
    firebase.initializeApp(config);

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage(function(payload) {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);
      // Customize notification here
      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon.png', // Ensure this icon exists or use a placeholder
        data: payload.data
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  })
  .catch(error => {
    console.error('Error fetching Firebase config:', error);
  });
