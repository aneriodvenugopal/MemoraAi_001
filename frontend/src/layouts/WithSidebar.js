import React from 'react';
import BusinessAdminLayout from '../layouts/BusinessAdminLayout';

/**
 * WithSidebar wraps any existing page component with the premium navy sidebar
 * without forcing a new header — each wrapped page keeps its own headers/toolbars.
 */
export default function WithSidebar({ children }) {
  return (
    <BusinessAdminLayout>
      {children}
    </BusinessAdminLayout>
  );
}
