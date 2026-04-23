import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, Shield, Eye, EyeOff, Download, XCircle, 
  Users, MapPin, Hash, RefreshCw, ArrowLeft,
  AlertTriangle, Lock, Unlock, Trash2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const VotersAdmin = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [wards, setWards] = useState([]);
  const [wardSettings, setWardSettings] = useState({});
  const [stats, setStats] = useState(null);

  // Fetch ward data and settings
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch wards
      const wardsRes = await fetch(`${API_URL}/api/voters/wards?village=aliyabad`);
      const wardsData = await wardsRes.json();
      
      // Fetch settings
      const settingsRes = await fetch(`${API_URL}/api/voters/admin/settings`);
      const settingsData = await settingsRes.json();
      
      // Fetch stats
      const statsRes = await fetch(`${API_URL}/api/voters/stats`);
      const statsData = await statsRes.json();
      
      if (wardsData.success) {
        setWards(wardsData.wards || []);
      }
      
      if (settingsData.success) {
        setWardSettings(settingsData.settings || {});
      }
      
      if (statsData.success) {
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle ward visibility
  const toggleWardVisibility = async (wardNo) => {
    const currentSetting = wardSettings[wardNo] || { visible: true, export_enabled: true };
    const newVisible = !currentSetting.visible;
    
    setWardSettings(prev => ({
      ...prev,
      [wardNo]: { ...currentSetting, visible: newVisible }
    }));
    
    try {
      const response = await fetch(`${API_URL}/api/voters/admin/ward-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ward_no: wardNo,
          visible: newVisible,
          export_enabled: currentSetting.export_enabled
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Ward ${wardNo} ${newVisible ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      toast.error('Failed to update setting');
      // Revert on error
      setWardSettings(prev => ({
        ...prev,
        [wardNo]: currentSetting
      }));
    }
  };

  // Toggle ward export
  const toggleWardExport = async (wardNo) => {
    const currentSetting = wardSettings[wardNo] || { visible: true, export_enabled: true };
    const newExportEnabled = !currentSetting.export_enabled;
    
    setWardSettings(prev => ({
      ...prev,
      [wardNo]: { ...currentSetting, export_enabled: newExportEnabled }
    }));
    
    try {
      const response = await fetch(`${API_URL}/api/voters/admin/ward-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ward_no: wardNo,
          visible: currentSetting.visible,
          export_enabled: newExportEnabled
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Ward ${wardNo} export ${newExportEnabled ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      toast.error('Failed to update setting');
      setWardSettings(prev => ({
        ...prev,
        [wardNo]: currentSetting
      }));
    }
  };

  // Delete ward data
  const deleteWard = async (wardNo) => {
    if (!window.confirm(`Are you sure you want to DELETE ALL VOTERS from Ward ${wardNo}? This cannot be undone!`)) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/voters/clear?village=aliyabad&ward_no=${wardNo}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Deleted ${data.deleted_count} voters from Ward ${wardNo}`);
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to delete ward data');
    }
  };

  const getWardSetting = (wardNo) => {
    return wardSettings[wardNo] || { visible: true, export_enabled: true };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-4 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-sky-500" />
                  Voters Admin Settings
                </h1>
                <p className="text-gray-500 text-sm">Manage ward visibility and export permissions</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => navigate('/voters-bulk-update')}
              >
                <Users className="w-4 h-4 mr-2" />
                Bulk Update
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={fetchData}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Total Voters</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.total?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Hash className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Total Wards</p>
                  <p className="text-2xl font-bold text-gray-900">{wards.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Visible Wards</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {wards.filter(w => getWardSetting(w.ward_no).visible).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                  <Download className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Export Enabled</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {wards.filter(w => getWardSetting(w.ward_no).export_enabled).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ward Settings Table */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              Ward Settings
            </CardTitle>
            <CardDescription className="text-gray-500">
              Control visibility and export permissions for each ward
            </CardDescription>
          </CardHeader>
          <CardContent>
            {wards.length > 0 ? (
              <div className="space-y-3">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <div className="col-span-2">Ward</div>
                  <div className="col-span-2">Voters</div>
                  <div className="col-span-2 text-center">Show List</div>
                  <div className="col-span-2 text-center">Enable Export</div>
                  <div className="col-span-2 text-center">Status</div>
                  <div className="col-span-2 text-center">Actions</div>
                </div>
                
                {wards.map((ward) => {
                  const setting = getWardSetting(ward.ward_no);
                  return (
                    <div
                      key={ward.ward_no}
                      className={`grid grid-cols-12 gap-4 p-4 rounded-lg border transition-colors ${
                        setting.visible 
                          ? 'bg-white border-gray-200' 
                          : 'bg-gray-50 border-gray-200 opacity-60'
                      }`}
                    >
                      {/* Ward Number */}
                      <div className="col-span-2 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          setting.visible ? 'bg-indigo-100' : 'bg-gray-200'
                        }`}>
                          <span className={`text-lg font-bold ${setting.visible ? 'text-indigo-600' : 'text-gray-400'}`}>
                            {ward.ward_no}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Ward {ward.ward_no}</p>
                        </div>
                      </div>
                      
                      {/* Voter Count */}
                      <div className="col-span-2 flex items-center">
                        <span className="text-gray-700">{ward.voter_count?.toLocaleString()} voters</span>
                      </div>
                      
                      {/* Visibility Toggle */}
                      <div className="col-span-2 flex items-center justify-center">
                        <button
                          onClick={() => toggleWardVisibility(ward.ward_no)}
                          className={`p-2 rounded-lg transition-colors ${
                            setting.visible 
                              ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                              : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                          }`}
                          title={setting.visible ? 'Click to hide' : 'Click to show'}
                        >
                          {setting.visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </button>
                      </div>
                      
                      {/* Export Toggle */}
                      <div className="col-span-2 flex items-center justify-center">
                        <button
                          onClick={() => toggleWardExport(ward.ward_no)}
                          className={`p-2 rounded-lg transition-colors ${
                            setting.export_enabled 
                              ? 'bg-sky-100 text-sky-600 hover:bg-sky-200' 
                              : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                          }`}
                          title={setting.export_enabled ? 'Click to disable export' : 'Click to enable export'}
                        >
                          {setting.export_enabled ? <Download className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </button>
                      </div>
                      
                      {/* Status */}
                      <div className="col-span-2 flex items-center justify-center">
                        {setting.visible ? (
                          <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                            <Unlock className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                            <Lock className="w-3 h-3" />
                            Hidden
                          </span>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="col-span-2 flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                          onClick={() => navigate(`/voterslist/aliyabad/ward/${ward.ward_no}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteWard(ward.ward_no)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No wards found</p>
                <p className="text-sm text-gray-400">Import voter data to see wards here</p>
                <Button
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => navigate('/voterslist-import')}
                >
                  Import Voters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-medium text-gray-900 mb-2">Admin Controls</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>Show List:</strong> Toggle to show/hide ward from regular users</li>
                  <li><strong>Enable Export:</strong> Toggle to allow/block Excel export for the ward</li>
                  <li>Hidden wards are only visible to admins</li>
                  <li>Users assigned to a ward can only see their ward&apos;s data</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VotersAdmin;
