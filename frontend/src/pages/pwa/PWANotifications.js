import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services';
import { toast } from 'sonner';
import { ArrowLeft, Check, Trash2, Bell, CheckCheck } from 'lucide-react';

const PWANotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unread
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications(50, filter === 'unread');
      setNotifications(data.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead([notificationId]);
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ));
      toast.success('Marked as read');
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      
      // Clear app badge
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge();
      }
      
      toast.success('All marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      payment: '💰',
      booking: '📅',
      lead: '👤',
      system: '⚙️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  };

  const getNotificationColor = (type) => {
    const colors = {
      payment: 'bg-green-100 border-green-300',
      booking: 'bg-blue-100 border-blue-300',
      lead: 'bg-purple-100 border-purple-300',
      system: 'bg-gray-100 border-gray-300',
      success: 'bg-green-100 border-green-300',
      warning: 'bg-blue-100 border-blue-300',
      error: 'bg-red-100 border-red-300',
      info: 'bg-blue-100 border-blue-300'
    };
    return colors[type] || 'bg-gray-100 border-gray-300';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="pwa-notifications min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white p-6 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/pwa/dashboard')}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <h1 className="text-xl font-bold">Notifications</h1>
          
          <button
            onClick={handleMarkAllAsRead}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            title="Mark all as read"
          >
            <CheckCheck className="w-6 h-6" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-white/10 backdrop-blur-sm rounded-xl p-1">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
              filter === 'all'
                ? 'bg-white text-ocean-primary shadow-lg'
                : 'text-white/80'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
              filter === 'unread'
                ? 'bg-white text-ocean-primary shadow-lg'
                : 'text-white/80'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-12 h-12 border-4 border-ocean-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notifications</h3>
            <p className="text-gray-600">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-2xl shadow-md overflow-hidden transition-all ${
                  !notification.read ? 'ring-2 ring-ocean-primary/20' : ''
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-3xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className={`font-semibold ${
                          !notification.read ? 'text-ocean-primary' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-ocean-primary rounded-full flex-shrink-0 mt-2 ml-2"></div>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {formatTime(notification.created_at)}
                        </span>
                        
                        <div className="flex items-center space-x-1">
                          {!notification.read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4 text-ocean-primary" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-around shadow-lg">
        <button
          onClick={() => navigate('/pwa/dashboard')}
          className="flex flex-col items-center space-y-1 text-gray-600"
        >
          <Bell className="w-6 h-6" />
          <span className="text-xs font-semibold">Home</span>
        </button>
        
        <button className="flex flex-col items-center space-y-1 text-ocean-primary">
          <Bell className="w-6 h-6" />
          <span className="text-xs font-semibold">Alerts</span>
        </button>
        
        <button
          onClick={() => navigate('/pwa/profile')}
          className="flex flex-col items-center space-y-1 text-gray-600"
        >
          <Bell className="w-6 h-6" />
          <span className="text-xs font-semibold">Profile</span>
        </button>
      </div>
    </div>
  );
};

export default PWANotifications;
