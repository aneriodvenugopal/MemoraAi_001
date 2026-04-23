import { requestNotificationPermission, onMessageListener } from '../firebase-config';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

class NotificationService {
  constructor() {
    this.fcmToken = null;
    this.setupListeners();
  }
  
  // Initialize Firebase notifications
  async initialize(userId) {
    try {
      // Request permission and get token
      const token = await requestNotificationPermission();
      
      if (token) {
        this.fcmToken = token;
        
        // Save token to backend
        await this.saveFCMToken(userId, token);
        
        console.log('Notifications initialized successfully');
        return true;
      } else {
        console.log('Failed to get FCM token');
        return false;
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }
  
  // Save FCM token to backend
  async saveFCMToken(userId, token) {
    try {
      const authToken = localStorage.getItem('token');
      
      await fetch(`${BACKEND_URL}/api/notifications/save-fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          user_id: userId,
          fcm_token: token,
          device_type: this.getDeviceType()
        })
      });
      
      console.log('FCM token saved to backend');
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }
  
  // Setup foreground message listener
  setupListeners() {
    onMessageListener()
      .then((payload) => {
        console.log('Foreground notification received:', payload);
        
        // Show toast notification
        if (payload.notification) {
          toast.info(payload.notification.title, {
            description: payload.notification.body,
            action: payload.data?.url ? {
              label: 'View',
              onClick: () => window.location.href = payload.data.url
            } : null,
            duration: 5000
          });
        }
        
        // Play notification sound
        this.playNotificationSound();
        
        // Update notification badge
        this.updateNotificationBadge();
      })
      .catch((error) => {
        console.error('Error in message listener:', error);
      });
  }
  
  // Get device type
  getDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/android/.test(userAgent)) {
      return 'android';
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios';
    } else if (/mobile/.test(userAgent)) {
      return 'mobile';
    } else {
      return 'web';
    }
  }
  
  // Play notification sound
  playNotificationSound() {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Could not play sound:', e));
    } catch (error) {
      console.log('Notification sound failed:', error);
    }
  }
  
  // Update notification badge
  updateNotificationBadge() {
    // Trigger a refresh of notification count
    window.dispatchEvent(new CustomEvent('notification-received'));
  }
  
  // Check notification permission status
  checkPermission() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }
  
  // Prompt user to enable notifications
  async promptForPermission() {
    const permission = this.checkPermission();
    
    if (permission === 'default') {
      toast.info('Enable notifications', {
        description: 'Get instant updates on bookings, payments, and leads',
        action: {
          label: 'Enable',
          onClick: async () => {
            const userId = localStorage.getItem('user_id');
            await this.initialize(userId);
          }
        },
        duration: 10000
      });
    }
  }
}

// Export singleton instance
const notificationService = new NotificationService();

export default notificationService;
