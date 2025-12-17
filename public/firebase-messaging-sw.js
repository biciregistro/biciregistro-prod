importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Helper to parse query parameters from the SW URL
const getQueryParam = (key) => {
  const query = self.location.search.substring(1);
  const vars = query.split('&');
  for (let i = 0; i < vars.length; i++) {
    const pair = vars[i].split('=');
    if (decodeURIComponent(pair[0]) === key) {
      return decodeURIComponent(pair[1]);
    }
  }
  return null;
};

// Construct config from URL params
const firebaseConfig = {
  apiKey: getQueryParam('apiKey'),
  authDomain: getQueryParam('authDomain'),
  projectId: getQueryParam('projectId'),
  storageBucket: getQueryParam('storageBucket'),
  messagingSenderId: getQueryParam('messagingSenderId'),
  appId: getQueryParam('appId'),
};

// Check if config is valid
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  // --- HANDLER FOR RECEIVING MESSAGES ---
  messaging.onBackgroundMessage(function(payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/icon.png',
      // Pass along the data from the server
      data: payload.data 
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });

  // --- HANDLER FOR NOTIFICATION CLICKS (CORRECTION) ---
  self.addEventListener('notificationclick', function(event) {
    const notification = event.notification;
    const link = notification.data?.link;

    console.log('[firebase-messaging-sw.js] Notification clicked. Data: ', notification.data);

    // Close the notification
    notification.close();

    // If a link is present, open it in a new window.
    if (link && (link.startsWith('http://') || link.startsWith('https://'))) {
      event.waitUntil(
        clients.openWindow(link)
      );
    } else {
       console.log('[firebase-messaging-sw.js] No valid link found in notification data.');
       // Optional: you could open the base site if no link is provided
       // event.waitUntil(clients.openWindow('/dashboard'));
    }
  });

} else {
  console.error('Firebase config missing in Service Worker URL parameters.');
}
