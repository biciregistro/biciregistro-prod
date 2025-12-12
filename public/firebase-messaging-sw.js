importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Configuration from .env.local (Safe to expose public keys)
firebase.initializeApp({
  apiKey: "AIzaSyCLgqAxIJmWkUE43GWpilGtxlTL4X6x5pk",
  projectId: "studio-535179390-fbbb5",
  messagingSenderId: "821606258493",
  appId: "1:821606258493:web:850a639dd266e9b88c1754",
});

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
