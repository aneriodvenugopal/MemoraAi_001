import React from 'react';
import CalendarScheduler from '../components/CalendarScheduler';
import { useAuth } from '../contexts/AuthContext';

const CalendarPage = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold">Follow-up Calendar</h2>
        <p className="text-gray-500">Manage your site visits and follow-ups with smart scheduling</p>
      </div>

      {/* Calendar Scheduler Component */}
      <CalendarScheduler 
        leads={[]} 
        onScheduleCreated={() => {
          // Optionally refresh or do something when schedule is created
          console.log('Schedule created');
        }} 
      />
    </div>
  );
};

export default CalendarPage;
