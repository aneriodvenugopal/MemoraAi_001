// Toast Notification Component
import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import './Toast.css';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle size={20} color="#4CAF50" />,
    error: <AlertCircle size={20} color="#F44336" />,
    info: <Info size={20} color="#2196F3" />
  };

  const backgrounds = {
    success: '#E8F5E9',
    error: '#FFEBEE',
    info: '#E3F2FD'
  };

  return (
    <div className="toast" style={{ background: backgrounds[type] }}>
      <div className="toast-content">
        {icons[type]}
        <span>{message}</span>
      </div>
      <button onClick={onClose} className="toast-close">
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
