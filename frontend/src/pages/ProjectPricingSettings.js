import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import {
  IndianRupee, Percent, Plus, Trash2, Save, Calculator,
  Settings, Building2, FileText, ChevronRight, Loader2,
  AlertCircle, CheckCircle, Info, ArrowLeft, RefreshCw
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Unit types for Indian real estate
const UNIT_TYPES = [
  { value: 'sq.yard', label: 'Sq. Yard', description: 'Square Yard (plots)' },
  { value: 'sq.ft', label: 'Sq. Ft', description: 'Square Feet (apartments)' },
  { value: 'sq.m', label: 'Sq. Meter', description: 'Square Meter' },
  { value: 'acre', label: 'Acre', description: 'Acre (large land)' },
  { value: 'gunta', label: 'Gunta', description: 'Gunta (South India)' },
  { value: 'cent', label: 'Cent', description: 'Cent (Kerala/TN)' },
  { value: 'bigha', label: 'Bigha', description: 'Bigha (North India)' },
  { value: 'marla', label: 'Marla', description: 'Marla (Punjab/Haryana)' },
  { value: 'plot', label: 'Plot', description: 'Fixed per plot' },
  { value: 'unit', label: 'Unit', description: 'Fixed per unit' },
];

// Preset charges
const CHARGE_PRESETS = [
  { label: 'Registration Charges', charge_type: 'percentage', value: 6 },
  { label: 'Stamp Duty', charge_type: 'percentage', value: 5 },
  { label: 'GST', charge_type: 'percentage', value: 5 },
  { label: 'Documentation Fee', charge_type: 'fixed', value: 5000 },
  { label: 'Development Charges', charge_type: 'fixed', value: 50000 },
  { label: 'Maintenance Deposit', charge_type: 'fixed', value: 25000 },
  { label: 'Club Membership', charge_type: 'fixed', value: 50000 },
  { label: 'Car Parking', charge_type: 'fixed', value: 300000 },
  { label: 'Legal Charges', charge_type: 'fixed', value: 10000 },
];

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

const ProjectPricingSettings = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState(null);
  const [config, setConfig] = useState({
    unit_type: 'sq.yard',
    unit_label: 'Sq. Yard',
    base_price_per_unit: 0,
    booking_amount_type: 'fixed',
    booking_amount_value: 5000,
    min_booking_amount: null,
    max_booking_amount: null,
    additional_charges: [],
    apply_gst: false,
    gst_percentage: 0,
    gst_included_in_price: false,
    allow_property_override: true,
  });
  const [newCharge, setNewCharge] = useState({
    label: '',
    charge_type: 'fixed',
    value: 0,
    description: ''
  });
  const [previewProperty, setPreviewProperty] = useState({
    area: 200,
    price: 0
  });
  const [calculatedPreview, setCalculatedPreview] = useState(null);

  const token = localStorage.getItem('token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    if (projectId) {
      loadProjectAndPricing();
    }
  }, [projectId]);

  useEffect(() => {
    calculatePreview();
  }, [config, previewProperty.area]);

  const loadProjectAndPricing = async () => {
    setLoading(true);
    try {
      // Load project details
      const projectRes = await fetch(`${API_URL}/api/projects/${projectId}`, { headers });
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProject(projectData);
      }

      // Load pricing config
      const pricingRes = await fetch(`${API_URL}/api/project-pricing/project/${projectId}`, { headers });
      if (pricingRes.ok) {
        const pricingData = await pricingRes.json();
        if (!pricingData.is_default) {
          setConfig(prev => ({ ...prev, ...pricingData }));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load pricing configuration');
    } finally {
      setLoading(false);
    }
  };

  const calculatePreview = () => {
    const area = previewProperty.area || 0;
    const baseCost = area * (config.base_price_per_unit || 0);
    
    let totalCharges = 0;
    const chargeBreakdown = [];
    
    for (const charge of config.additional_charges || []) {
      let amount = 0;
      if (charge.charge_type === 'percentage') {
        amount = (baseCost * charge.value) / 100;
      } else {
        amount = charge.value;
      }
      chargeBreakdown.push({
        label: charge.label,
        type: charge.charge_type,
        value: charge.value,
        amount
      });
      totalCharges += amount;
    }
    
    // GST
    let gstAmount = 0;
    if (config.apply_gst && config.gst_percentage > 0 && !config.gst_included_in_price) {
      gstAmount = (baseCost * config.gst_percentage) / 100;
    }
    
    const totalCost = baseCost + totalCharges + gstAmount;
    
    // Booking amount
    let bookingAmount = 0;
    if (config.booking_amount_type === 'percentage') {
      bookingAmount = (totalCost * config.booking_amount_value) / 100;
      if (config.min_booking_amount && bookingAmount < config.min_booking_amount) {
        bookingAmount = config.min_booking_amount;
      }
      if (config.max_booking_amount && bookingAmount > config.max_booking_amount) {
        bookingAmount = config.max_booking_amount;
      }
    } else {
      bookingAmount = config.booking_amount_value;
    }
    
    setCalculatedPreview({
      area,
      unitType: config.unit_label,
      basePricePerUnit: config.base_price_per_unit,
      baseCost,
      charges: chargeBreakdown,
      totalCharges,
      gstAmount,
      totalCost,
      bookingAmount,
      balanceAmount: totalCost - bookingAmount
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/project-pricing/project/${projectId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          project_id: projectId,
          ...config
        })
      });
      
      if (!res.ok) throw new Error('Failed to save');
      
      toast.success('Pricing configuration saved successfully');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save pricing configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToProperties = async () => {
    if (!confirm('This will update prices for all properties in this project. Continue?')) {
      return;
    }
    
    setSaving(true);
    try {
      // First save config
      await handleSave();
      
      // Then apply to properties
      const res = await fetch(`${API_URL}/api/project-pricing/project/${projectId}/apply-to-properties`, {
        method: 'POST',
        headers
      });
      
      if (!res.ok) throw new Error('Failed to apply');
      
      const data = await res.json();
      toast.success(`Pricing applied to ${data.updated_count} properties`);
    } catch (error) {
      console.error('Error applying:', error);
      toast.error('Failed to apply pricing to properties');
    } finally {
      setSaving(false);
    }
  };

  const addCharge = () => {
    if (!newCharge.label.trim()) {
      toast.error('Please enter charge label');
      return;
    }
    
    const charge = {
      id: crypto.randomUUID(),
      label: newCharge.label,
      charge_type: newCharge.charge_type,
      value: parseFloat(newCharge.value) || 0,
      description: newCharge.description,
      order: config.additional_charges.length
    };
    
    setConfig(prev => ({
      ...prev,
      additional_charges: [...prev.additional_charges, charge]
    }));
    
    setNewCharge({ label: '', charge_type: 'fixed', value: 0, description: '' });
    toast.success('Charge added');
  };

  const addPresetCharge = (preset) => {
    const exists = config.additional_charges.some(c => c.label === preset.label);
    if (exists) {
      toast.error('This charge already exists');
      return;
    }
    
    const charge = {
      id: crypto.randomUUID(),
      ...preset,
      order: config.additional_charges.length
    };
    
    setConfig(prev => ({
      ...prev,
      additional_charges: [...prev.additional_charges, charge]
    }));
    toast.success(`${preset.label} added`);
  };

  const removeCharge = (id) => {
    setConfig(prev => ({
      ...prev,
      additional_charges: prev.additional_charges.filter(c => c.id !== id)
    }));
  };

  const updateCharge = (id, field, value) => {
    setConfig(prev => ({
      ...prev,
      additional_charges: prev.additional_charges.map(c => 
        c.id === id ? { ...c, [field]: value } : c
      )
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6" data-testid="project-pricing-settings">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Pricing Configuration
            </h1>
            <p className="text-slate-500 mt-1">
              {project?.name} • Configure unit pricing, booking amount & additional charges
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadProjectAndPricing}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Configuration
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-6">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Unit & Base Price */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Unit Configuration
              </CardTitle>
              <CardDescription>Set the measurement unit and base price for properties</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unit Type</Label>
                  <Select 
                    value={config.unit_type} 
                    onValueChange={(value) => {
                      const unit = UNIT_TYPES.find(u => u.value === value);
                      setConfig(prev => ({ 
                        ...prev, 
                        unit_type: value,
                        unit_label: unit?.label || value
                      }));
                    }}
                  >
                    <SelectTrigger data-testid="unit-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_TYPES.map(unit => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label} - {unit.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Base Price per {config.unit_label}</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      value={config.base_price_per_unit}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        base_price_per_unit: parseFloat(e.target.value) || 0 
                      }))}
                      className="pl-9"
                      placeholder="10000"
                      data-testid="base-price-input"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Amount */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-emerald-600" />
                Booking Amount
              </CardTitle>
              <CardDescription>Default booking amount for new bookings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select 
                    value={config.booking_amount_type}
                    onValueChange={(value) => setConfig(prev => ({ 
                      ...prev, 
                      booking_amount_type: value 
                    }))}
                  >
                    <SelectTrigger data-testid="booking-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                      <SelectItem value="percentage">Percentage of Total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>
                    {config.booking_amount_type === 'fixed' ? 'Amount (₹)' : 'Percentage (%)'}
                  </Label>
                  <div className="relative">
                    {config.booking_amount_type === 'fixed' ? (
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    ) : (
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    )}
                    <Input
                      type="number"
                      value={config.booking_amount_value}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        booking_amount_value: parseFloat(e.target.value) || 0 
                      }))}
                      className="pl-9"
                      placeholder={config.booking_amount_type === 'fixed' ? '5000' : '10'}
                      data-testid="booking-amount-input"
                    />
                  </div>
                </div>
              </div>

              {config.booking_amount_type === 'percentage' && (
                <div className="grid md:grid-cols-2 gap-4 pt-2 border-t">
                  <div className="space-y-2">
                    <Label>Minimum Booking Amount</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        value={config.min_booking_amount || ''}
                        onChange={(e) => setConfig(prev => ({ 
                          ...prev, 
                          min_booking_amount: e.target.value ? parseFloat(e.target.value) : null 
                        }))}
                        className="pl-9"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Booking Amount</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        value={config.max_booking_amount || ''}
                        onChange={(e) => setConfig(prev => ({ 
                          ...prev, 
                          max_booking_amount: e.target.value ? parseFloat(e.target.value) : null 
                        }))}
                        className="pl-9"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Charges */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Additional Charges
              </CardTitle>
              <CardDescription>Registration, documentation, and other charges</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Add Presets */}
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Quick Add</Label>
                <div className="flex flex-wrap gap-2">
                  {CHARGE_PRESETS.map((preset, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => addPresetCharge(preset)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Existing Charges */}
              {config.additional_charges.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  {config.additional_charges.map((charge) => (
                    <div key={charge.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          value={charge.label}
                          onChange={(e) => updateCharge(charge.id, 'label', e.target.value)}
                          placeholder="Label"
                          className="text-sm"
                        />
                        <Select 
                          value={charge.charge_type}
                          onValueChange={(value) => updateCharge(charge.id, 'charge_type', value)}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed (₹)</SelectItem>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={charge.value}
                          onChange={(e) => updateCharge(charge.id, 'value', parseFloat(e.target.value) || 0)}
                          placeholder="Value"
                          className="text-sm"
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeCharge(charge.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Charge */}
              <div className="flex items-end gap-2 pt-4 border-t">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Add Custom Charge</Label>
                  <Input
                    value={newCharge.label}
                    onChange={(e) => setNewCharge(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Charge name"
                  />
                </div>
                <Select 
                  value={newCharge.charge_type}
                  onValueChange={(value) => setNewCharge(prev => ({ ...prev, charge_type: value }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed (₹)</SelectItem>
                    <SelectItem value="percentage">% of Base</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={newCharge.value}
                  onChange={(e) => setNewCharge(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="Value"
                  className="w-28"
                />
                <Button onClick={addCharge} data-testid="add-charge-btn">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Property Override</Label>
                  <p className="text-xs text-slate-500">Individual properties can have custom pricing</p>
                </div>
                <Switch
                  checked={config.allow_property_override}
                  onCheckedChange={(checked) => setConfig(prev => ({ 
                    ...prev, 
                    allow_property_override: checked 
                  }))}
                />
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <Label>Apply GST</Label>
                  <p className="text-xs text-slate-500">Add GST to property price</p>
                </div>
                <Switch
                  checked={config.apply_gst}
                  onCheckedChange={(checked) => setConfig(prev => ({ 
                    ...prev, 
                    apply_gst: checked 
                  }))}
                />
              </div>
              
              {config.apply_gst && (
                <div className="grid md:grid-cols-2 gap-4 pl-4">
                  <div className="space-y-2">
                    <Label>GST Percentage</Label>
                    <Input
                      type="number"
                      value={config.gst_percentage}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        gst_percentage: parseFloat(e.target.value) || 0 
                      }))}
                      placeholder="5"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch
                      checked={config.gst_included_in_price}
                      onCheckedChange={(checked) => setConfig(prev => ({ 
                        ...prev, 
                        gst_included_in_price: checked 
                      }))}
                    />
                    <Label className="text-sm">GST included in base price</Label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                Price Calculator
              </CardTitle>
              <CardDescription>Preview how prices will be calculated</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label>Sample Property Area</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={previewProperty.area}
                    onChange={(e) => setPreviewProperty(prev => ({ 
                      ...prev, 
                      area: parseFloat(e.target.value) || 0 
                    }))}
                    className="flex-1"
                    data-testid="preview-area-input"
                  />
                  <Badge variant="outline" className="px-3">{config.unit_label}</Badge>
                </div>
              </div>

              {calculatedPreview && (
                <div className="space-y-3 pt-4 border-t">
                  {/* Base Cost */}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      Base ({calculatedPreview.area} × {formatCurrency(calculatedPreview.basePricePerUnit)})
                    </span>
                    <span className="font-medium">{formatCurrency(calculatedPreview.baseCost)}</span>
                  </div>

                  {/* Additional Charges */}
                  {calculatedPreview.charges.map((charge, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-slate-600">
                        {charge.label} 
                        <span className="text-xs text-slate-400 ml-1">
                          ({charge.type === 'percentage' ? `${charge.value}%` : 'Fixed'})
                        </span>
                      </span>
                      <span className="font-medium">{formatCurrency(charge.amount)}</span>
                    </div>
                  ))}

                  {/* GST */}
                  {calculatedPreview.gstAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">
                        GST ({config.gst_percentage}%)
                      </span>
                      <span className="font-medium">{formatCurrency(calculatedPreview.gstAmount)}</span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex justify-between pt-2 border-t border-dashed">
                    <span className="font-semibold text-slate-900">Total Property Cost</span>
                    <span className="font-bold text-lg text-blue-600">
                      {formatCurrency(calculatedPreview.totalCost)}
                    </span>
                  </div>

                  {/* Booking */}
                  <div className="flex justify-between text-sm bg-emerald-50 p-2 rounded">
                    <span className="text-emerald-700">
                      Booking Amount
                      <span className="text-xs text-emerald-600 ml-1">
                        ({config.booking_amount_type === 'percentage' 
                          ? `${config.booking_amount_value}%` 
                          : 'Fixed'})
                      </span>
                    </span>
                    <span className="font-bold text-emerald-700">
                      {formatCurrency(calculatedPreview.bookingAmount)}
                    </span>
                  </div>

                  {/* Balance */}
                  <div className="flex justify-between text-sm bg-amber-50 p-2 rounded">
                    <span className="text-amber-700">Balance Amount</span>
                    <span className="font-bold text-amber-700">
                      {formatCurrency(calculatedPreview.balanceAmount)}
                    </span>
                  </div>
                </div>
              )}

              <Button 
                className="w-full mt-4"
                onClick={handleApplyToProperties}
                disabled={saving}
                variant="outline"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Apply to All Properties
              </Button>
              <p className="text-xs text-slate-500 text-center">
                This will update prices for all properties in this project
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProjectPricingSettings;
