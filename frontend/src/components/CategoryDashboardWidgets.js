import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building, Users, MapPin, CalendarCheck, Star, Clock, IndianRupee,
  Stethoscope, FlaskConical, Activity, PartyPopper, Calendar, MessageSquare,
  Package, Truck, Building2, Scissors, Footprints, Heart,
  GraduationCap, Presentation, CheckCircle, Flame, Bell, Brain
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ICON_MAP = {
  building: Building,
  users: Users,
  'map-pin': MapPin,
  'calendar-check': CalendarCheck,
  star: Star,
  clock: Clock,
  'indian-rupee': IndianRupee,
  stethoscope: Stethoscope,
  'flask-conical': FlaskConical,
  activity: Activity,
  'party-popper': PartyPopper,
  calendar: Calendar,
  'message-square': MessageSquare,
  package: Package,
  truck: Truck,
  'building-2': Building2,
  scissors: Scissors,
  footprints: Footprints,
  heart: Heart,
  'graduation-cap': GraduationCap,
  presentation: Presentation,
  'check-circle': CheckCircle,
};

const COLOR_MAP = {
  blue: 'from-blue-500 to-blue-600',
  cyan: 'from-cyan-500 to-cyan-600',
  green: 'from-green-500 to-green-600',
  emerald: 'from-emerald-500 to-emerald-600',
  purple: 'from-purple-500 to-purple-600',
  violet: 'from-violet-500 to-violet-600',
  indigo: 'from-indigo-500 to-indigo-600',
  amber: 'from-amber-500 to-amber-600',
  orange: 'from-orange-500 to-orange-600',
  teal: 'from-teal-500 to-teal-600',
  pink: 'from-pink-500 to-pink-600',
  rose: 'from-rose-500 to-rose-600',
  red: 'from-red-500 to-red-600',
  lime: 'from-lime-500 to-lime-600',
};

export default function CategoryDashboardWidgets() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API}/memoraai/dashboard/category-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setData(await res.json());
        }
      } catch (e) {
        console.error('Failed to fetch category stats', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading || !data || !data.widgets || data.widgets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4" data-testid="category-dashboard-widgets">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          {data.category_name} Overview
        </h3>
        <div className="flex gap-2">
          {data.summary?.hot_sales > 0 && (
            <Badge className="bg-orange-100 text-orange-700 gap-1">
              <Flame className="w-3 h-3" /> {data.summary.hot_sales} Hot Sales
            </Badge>
          )}
          {data.summary?.new_alerts > 0 && (
            <Badge className="bg-red-100 text-red-700 gap-1">
              <Bell className="w-3 h-3" /> {data.summary.new_alerts} Alerts
            </Badge>
          )}
          {data.summary?.memories > 0 && (
            <Badge className="bg-purple-100 text-purple-700 gap-1">
              <Brain className="w-3 h-3" /> {data.summary.memories} Memories
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.widgets.map((widget, idx) => {
          const Icon = ICON_MAP[widget.icon] || Star;
          const gradient = COLOR_MAP[widget.color] || COLOR_MAP.blue;
          return (
            <Card
              key={widget.key}
              className="hover:shadow-md transition-shadow"
              data-testid={`widget-${widget.key}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">{widget.label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : (widget.value ?? 0).toString()}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-md`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
