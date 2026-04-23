// Dynamic property configuration
export const PROPERTY_TYPES = [
  {
    id: 'land',
    label: 'Land',
    icon: '🏞️',
    enabled: true,
    units: ['acres', 'guntas', 'hectares', 'cents'],
    defaultUnit: 'acres',
    fields: ['size', 'cost', 'location', 'facing', 'soilType', 'roadAccess']
  },
  {
    id: 'plot',
    label: 'Plot',
    icon: '📐',
    enabled: true,
    units: ['sq_yards', 'sq_feet', 'sq_meters'],
    defaultUnit: 'sq_yards',
    fields: ['size', 'cost', 'location', 'facing', 'plotType', 'dtcpApproved']
  },
  {
    id: 'flat',
    label: 'Flat',
    icon: '🏢',
    enabled: true,
    units: ['sq_feet', 'sq_meters'],
    defaultUnit: 'sq_feet',
    fields: ['size', 'cost', 'location', 'bhk', 'floor', 'totalFloors', 'parking', 'amenities']
  },
  {
    id: 'independent_house',
    label: 'Independent House',
    icon: '🏡',
    enabled: true,
    units: ['sq_feet', 'sq_yards', 'sq_meters'],
    defaultUnit: 'sq_feet',
    fields: ['size', 'cost', 'location', 'bhk', 'floors', 'parking', 'garden']
  },
  {
    id: 'villa',
    label: 'Villa',
    icon: '🏰',
    enabled: true,
    units: ['sq_feet', 'sq_yards', 'sq_meters'],
    defaultUnit: 'sq_feet',
    fields: ['size', 'cost', 'location', 'bhk', 'floors', 'parking', 'amenities', 'gatedCommunity']
  },
  {
    id: 'farmhouse',
    label: 'Farm House',
    icon: '🌾',
    enabled: false, // Can be toggled
    units: ['acres', 'hectares'],
    defaultUnit: 'acres',
    fields: ['size', 'cost', 'location', 'waterSource', 'electricity', 'cropHistory']
  }
];

export const NEGOTIABLE_OPTIONS = [
  {
    id: 'yes',
    label: 'Yes',
    icon: '✅',
    value: true
  },
  {
    id: 'no',
    label: 'No',
    icon: '❌',
    value: false
  }
];

export const FACING_OPTIONS = [
  { id: 'east', label: 'East', icon: '🌅', value: 'east' },
  { id: 'west', label: 'West', icon: '🌇', value: 'west' },
  { id: 'north', label: 'North', icon: '🧭', value: 'north' },
  { id: 'south', label: 'South', icon: '🧭', value: 'south' }
];

export const BHK_OPTIONS = [
  { id: '1bhk', label: '1 BHK', icon: '🛏️', value: '1' },
  { id: '2bhk', label: '2 BHK', icon: '🛏️🛏️', value: '2' },
  { id: '3bhk', label: '3 BHK', icon: '🏠', value: '3' },
  { id: '4bhk', label: '4+ BHK', icon: '🏡', value: '4+' }
];

// Default distance settings
export const DISTANCE_OPTIONS = [
  { id: '1km', label: '1 km', value: 1 },
  { id: '5km', label: '5 km', value: 5 },
  { id: '10km', label: '10 km', value: 10 },
  { id: '25km', label: '25 km', value: 25 },
  { id: '50km', label: '50 km', value: 50 },
  { id: 'all', label: 'All', value: 999 }
];

// Professional color scheme
export const COLORS = {
  primary: '#1E88E5', // Professional blue
  secondary: '#43A047', // Professional green
  success: '#4CAF50',
  warning: '#FFC107',
  danger: '#F44336',
  background: '#F8F9FA',
  cardBg: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0'
};

// Get enabled property types
export const getEnabledPropertyTypes = () => {
  return PROPERTY_TYPES.filter(type => type.enabled);
};

// Get fields for property type
export const getFieldsForPropertyType = (typeId) => {
  const type = PROPERTY_TYPES.find(t => t.id === typeId);
  return type ? type.fields : [];
};

// Get units for property type
export const getUnitsForPropertyType = (typeId) => {
  const type = PROPERTY_TYPES.find(t => t.id === typeId);
  return type ? type.units : [];
};
