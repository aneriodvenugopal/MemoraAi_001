import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Video, Phone, MapPin, AlertCircle, CheckCircle, Calendar as CalIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const CalendarScheduler = ({ leads, onScheduleCreated }) => {
  const { user } = useAuth();
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState('all'); // all, past, today, future
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  
  const [scheduleData, setScheduleData] = useState({
    followup_type: 'site_visit',
    scheduled_time: '',
    duration_minutes: 60,
    notes: '',
    add_video_conference: false,
  });

  useEffect(() => {
    fetchCalendarEvents();
    checkGoogleConnection();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [calendarEvents, viewFilter]);

  const checkGoogleConnection = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/auth/google/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setGoogleConnected(data.google_connected && data.has_valid_tokens);
    } catch (error) {
      console.error('Failed to check Google connection:', error);
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/calendar/events?view=all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCalendarEvents(data.all_events || []);
      }
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    let filtered = [...calendarEvents];

    if (viewFilter === 'past') {
      filtered = filtered.filter(e => new Date(e.scheduled_time) < now);
    } else if (viewFilter === 'today') {
      filtered = filtered.filter(e => {
        const eventTime = new Date(e.scheduled_time);
        return eventTime >= todayStart && eventTime < todayEnd;
      });
    } else if (viewFilter === 'future') {
      filtered = filtered.filter(e => new Date(e.scheduled_time) >= todayEnd);
    }

    // Sort by time (ascending - nearest first)
    filtered.sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));

    setFilteredEvents(filtered);
  };

  const getUrgencyColor = (scheduledTime) => {
    const now = new Date();
    const eventTime = new Date(scheduledTime);
    const diffMinutes = (eventTime - now) / (1000 * 60);

    if (diffMinutes < 0) {
      return { color: 'red', label: 'Overdue', icon: AlertCircle };
    } else if (diffMinutes <= 60) {
      return { color: 'orange', label: 'Urgent', icon: Clock };
    } else {
      return { color: 'green', label: 'Upcoming', icon: CheckCircle };
    }
  };

  const formatTimeDisplay = (scheduledTime) => {
    const now = new Date();
    const eventTime = new Date(scheduledTime);
    const diffMinutes = Math.abs((eventTime - now) / (1000 * 60));

    const timeStr = eventTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (eventTime < now) {
      if (diffMinutes < 60) {
        return `${timeStr} (${Math.floor(diffMinutes)} mins ago)`;
      } else if (diffMinutes < 1440) {
        return `${timeStr} (${Math.floor(diffMinutes / 60)} hours ago)`;
      } else {
        return `${timeStr} (${Math.floor(diffMinutes / 1440)} days ago)`;
      }
    } else {
      if (diffMinutes < 60) {
        return `${timeStr} (in ${Math.floor(diffMinutes)} mins)`;
      } else if (diffMinutes < 1440) {
        return `${timeStr} (in ${Math.floor(diffMinutes / 60)} hours)`;
      } else {
        return `${timeStr} (in ${Math.floor(diffMinutes / 1440)} days)`;
      }
    }
  };

  const handleScheduleVisit = async () => {
    if (!scheduleData.scheduled_time) {
      toast.error('Please select date and time');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/calendar/create-event`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead_id: selectedLead.id,
          ...scheduleData,
          client_email: selectedLead.email
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.google_synced 
          ? '✅ Visit scheduled and added to Google Calendar!' 
          : '✅ Visit scheduled successfully!');
        
        if (data.meet_link) {
          toast.info(`📹 Google Meet link: ${data.meet_link}`);
        }

        setShowScheduleDialog(false);
        fetchCalendarEvents();
        
        if (onScheduleCreated) {
          onScheduleCreated(data.event);
        }
      } else {
        toast.error('Failed to schedule visit');
      }
    } catch (error) {
      console.error('Schedule error:', error);
      toast.error('Failed to schedule visit');
    }
  };

  const connectGoogle = async () => {
    try {
      // Get the authorization URL from backend
      const response = await fetch(`${API_URL}/api/auth/google/login`);
      const data = await response.json();
      
      if (data.authorization_url) {
        // Redirect to Google OAuth page
        window.location.href = data.authorization_url;
      } else {
        toast.error('Failed to start Google authentication');
      }
    } catch (error) {
      console.error('Google auth error:', error);
      toast.error('Failed to connect Google Calendar');
    }
  };

  // Calculate counts
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const pastCount = calendarEvents.filter(e => new Date(e.scheduled_time) < now).length;
  const todayCount = calendarEvents.filter(e => {
    const t = new Date(e.scheduled_time);
    return t >= todayStart && t < todayEnd;
  }).length;
  const futureCount = calendarEvents.filter(e => new Date(e.scheduled_time) >= todayEnd).length;

  return (
    <div className="space-y-6">
      {/* Google Connection Banner */}
      {!googleConnected && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900">Connect Google Calendar</h3>
                  <p className="text-sm text-blue-700">
                    Auto-sync site visits, get Google Meet links, and never miss an appointment
                  </p>
                </div>
              </div>
              <Button onClick={connectGoogle} className="bg-blue-600 hover:bg-blue-700">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Connect Google
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar View Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalIcon className="w-5 h-5" />
              Follow-up Calendar
            </CardTitle>
            {googleConnected && (
              <Badge variant="success" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Google Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Category Cards with Counts */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card 
              className={`cursor-pointer transition-all ${viewFilter === 'past' ? 'ring-2 ring-red-500' : 'hover:shadow-md'}`}
              onClick={() => setViewFilter(viewFilter === 'past' ? 'all' : 'past')}
            >
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{pastCount}</div>
                  <div className="text-sm text-gray-600 mt-1">🔴 Previous Leads</div>
                  <div className="text-xs text-gray-500 mt-1">Overdue</div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${viewFilter === 'today' ? 'ring-2 ring-orange-500' : 'hover:shadow-md'}`}
              onClick={() => setViewFilter(viewFilter === 'today' ? 'all' : 'today')}
            >
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{todayCount}</div>
                  <div className="text-sm text-gray-600 mt-1">🟡 Present Day Leads</div>
                  <div className="text-xs text-gray-500 mt-1">Today's schedule</div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${viewFilter === 'future' ? 'ring-2 ring-green-500' : 'hover:shadow-md'}`}
              onClick={() => setViewFilter(viewFilter === 'future' ? 'all' : 'future')}
            >
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{futureCount}</div>
                  <div className="text-sm text-gray-600 mt-1">🟢 Future Leads</div>
                  <div className="text-xs text-gray-500 mt-1">Upcoming</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtered List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading calendar...</div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {viewFilter === 'all' ? 'No scheduled visits yet' : `No ${viewFilter} visits`}
              </div>
            ) : (
              filteredEvents.map((event) => {
                const urgency = getUrgencyColor(event.scheduled_time);
                const UrgencyIcon = urgency.icon;
                const eventDate = new Date(event.scheduled_time);

                return (
                  <Card key={event.id} className={`${
                    urgency.color === 'red' ? 'border-l-4 border-l-red-500' :
                    urgency.color === 'orange' ? 'border-l-4 border-l-orange-500' :
                    'border-l-4 border-l-green-500'
                  }`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        {/* Left side - Event details */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="capitalize">
                              {event.followup_type.replace('_', ' ')}
                            </Badge>
                            {event.meet_link && (
                              <a
                                href={event.meet_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Video className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                          
                          <div className="font-semibold text-lg">{event.lead_name}</div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            {event.lead_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {event.lead_phone}
                              </span>
                            )}
                          </div>
                          
                          {event.notes && (
                            <p className="text-sm text-gray-600 mt-2">{event.notes}</p>
                          )}
                          
                          <div className="flex gap-2 mt-3">
                            {event.calendar_link && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(event.calendar_link, '_blank')}
                              >
                                <CalendarIcon className="w-3 h-3 mr-1" />
                                View in Calendar
                              </Button>
                            )}
                            {event.meet_link && (
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => window.open(event.meet_link, '_blank')}
                              >
                                <Video className="w-3 h-3 mr-1" />
                                Start Video Call
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Right side - Time with color flag */}
                        <div className={`text-right ml-4 px-4 py-2 rounded-lg ${
                          urgency.color === 'red' ? 'bg-red-50 border-2 border-red-200' :
                          urgency.color === 'orange' ? 'bg-orange-50 border-2 border-orange-200' :
                          'bg-green-50 border-2 border-green-200'
                        }`}>
                          <div className="flex items-center gap-2 justify-end mb-1">
                            <UrgencyIcon className={`w-4 h-4 ${
                              urgency.color === 'red' ? 'text-red-600' :
                              urgency.color === 'orange' ? 'text-orange-600' :
                              'text-green-600'
                            }`} />
                            <span className={`text-xs font-semibold ${
                              urgency.color === 'red' ? 'text-red-700' :
                              urgency.color === 'orange' ? 'text-orange-700' :
                              'text-green-700'
                            }`}>
                              {urgency.label}
                            </span>
                          </div>
                          <div className={`text-sm font-bold ${
                            urgency.color === 'red' ? 'text-red-800' :
                            urgency.color === 'orange' ? 'text-orange-800' :
                            'text-green-800'
                          }`}>
                            {formatTimeDisplay(event.scheduled_time)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {eventDate.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Visit Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Site Visit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Visit Type</label>
              <Select
                value={scheduleData.followup_type}
                onValueChange={(value) => setScheduleData(prev => ({ ...prev, followup_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="site_visit">Site Visit</SelectItem>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Date & Time</label>
              <Input
                type="datetime-local"
                value={scheduleData.scheduled_time}
                onChange={(e) => setScheduleData(prev => ({ ...prev, scheduled_time: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Duration (minutes)</label>
              <Input
                type="number"
                value={scheduleData.duration_minutes}
                onChange={(e) => setScheduleData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={scheduleData.notes}
                onChange={(e) => setScheduleData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Visit notes..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="video"
                checked={scheduleData.add_video_conference}
                onChange={(e) => setScheduleData(prev => ({ ...prev, add_video_conference: e.target.checked }))}
              />
              <label htmlFor="video" className="text-sm">
                Add Google Meet link for virtual tour
              </label>
            </div>

            <Button onClick={handleScheduleVisit} className="w-full">
              Schedule Visit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarScheduler;
