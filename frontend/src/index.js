import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import "@/styles/glassmorphism.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register Service Worker for PWA (Disabled in preview/development)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', async () => {
    try {
      // First, unregister ALL old service workers completely
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      if (registrations.length > 0) {
        console.log(`Found ${registrations.length} old service worker(s), unregistering...`);
        for (const registration of registrations) {
          await registration.unregister();
          console.log('Unregistered old service worker:', registration.scope);
        }
        
        // Clear all caches
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
          console.log('Deleted cache:', cacheName);
        }
        
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Now register the new service worker
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none' // Don't use HTTP cache for service worker
      });
      
      console.log('✅ Service Worker registered successfully:', registration.scope);
      
      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60000); // Check every minute
      
      // Handle updates - silently update without prompting user
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('Service Worker update found');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New Service Worker installed - applying silently');
            // Silently activate new service worker without annoying prompt
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  });
  
  // Handle service worker controller change - log only, no auto-reload
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('Service Worker updated - changes will apply on next visit');
  });
} else if ('serviceWorker' in navigator) {
  // In development/preview, just clean up any existing service workers
  window.addEventListener('load', async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        console.log('🧹 Cleaning up service workers in development mode...');
        for (const registration of registrations) {
          await registration.unregister();
          console.log('✅ Unregistered:', registration.scope);
        }
        
        // Clear all caches
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
        console.log('✅ Service workers and caches cleaned up');
      }
    } catch (error) {
      console.log('Service worker cleanup failed:', error);
    }
  });
}
