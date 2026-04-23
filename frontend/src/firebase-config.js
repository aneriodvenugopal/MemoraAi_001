// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase config for MemoraAI - using environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBLdLj5EGwRxHbsCqEbngRWbEFn4RUHQdI",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "exlainerp-5ff78.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "exlainerp-5ff78",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "exlainerp-5ff78.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "999459364917",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:999459364917:web:ab67804d48b20e288bd17c"
};

// Initialize Firebase
let app = null;
let messaging = null;

try {
  app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
} catch (error) {
  console.log('Firebase initialization skipped:', error.message);
}

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return null;
    }
    
    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted');
      
      // Get FCM token
      if (messaging) {
        const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.log('VAPID key not configured, skipping FCM token');
          return null;
        }
        
        const token = await getToken(messaging, { vapidKey });
        
        if (token) {
          console.log('FCM Token obtained');
          return token;
        } else {
          console.log('No registration token available');
          return null;
        }
      }
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        console.log('Message received:', payload);
        resolve(payload);
      });
    }
  });

export { messaging };
