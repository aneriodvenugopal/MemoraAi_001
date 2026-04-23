/**
 * RETOERP Chatbot Widget - Embeddable Script
 * 
 * Usage:
 * <script src="https://your-domain.com/chatbot-embed.js" 
 *         data-tenant-id="your-tenant-id" 
 *         data-position="bottom-right"
 *         data-primary-color="#3b82f6"></script>
 */

(function() {
  // Get script attributes
  const script = document.currentScript || document.querySelector('script[src*="chatbot-embed.js"]');
  const tenantId = script?.getAttribute('data-tenant-id') || null;
  const position = script?.getAttribute('data-position') || 'bottom-right';
  const primaryColor = script?.getAttribute('data-primary-color') || '#3b82f6';
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    initChatbot();
  }
  
  function initChatbot() {
    // Create container
    const container = document.createElement('div');
    container.id = 'retoerp-chatbot-container';
    document.body.appendChild(container);
    
    // Load React app
    const reactScript = document.createElement('script');
    reactScript.src = 'https://unpkg.com/react@18/umd/react.production.min.js';
    reactScript.crossOrigin = 'anonymous';
    
    const reactDOMScript = document.createElement('script');
    reactDOMScript.src = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
    reactDOMScript.crossOrigin = 'anonymous';
    
    document.head.appendChild(reactScript);
    document.head.appendChild(reactDOMScript);
    
    // Wait for React to load, then render widget
    reactDOMScript.onload = function() {
      // Store config globally
      window.RETOERP_CHATBOT_CONFIG = {
        tenantId: tenantId,
        position: position,
        primaryColor: primaryColor,
        backendUrl: 'https://retomerp-memora.preview.emergentagent.com/api'
      };
      
      // Load chat widget bundle
      const widgetScript = document.createElement('script');
      widgetScript.src = window.location.origin + '/static/js/chatbot-widget.bundle.js';
      document.body.appendChild(widgetScript);
    };
  }
})();
