// Unit conversion utilities for Indian real estate

export const CONVERSIONS = {
  // Base conversions to square feet
  squareFeet: 1,
  squareYards: 9, // 1 sq yard = 9 sq feet
  squareMeters: 10.764, // 1 sq meter = 10.764 sq feet
  acres: 43560, // 1 acre = 43560 sq feet
  guntas: 1089, // 1 gunta = 1089 sq feet
  cents: 435.6, // 1 cent = 435.6 sq feet
};

export const GUNTAS_PER_ACRE = 40;
export const CENTS_PER_ACRE = 100;

/**
 * Convert area to square feet
 */
export const toSquareFeet = (value, unit) => {
  return value * (CONVERSIONS[unit] || 1);
};

/**
 * Convert square feet to any unit
 */
export const fromSquareFeet = (sqFeet, unit) => {
  return sqFeet / (CONVERSIONS[unit] || 1);
};

/**
 * Format land area in Acres + Guntas format
 */
export const formatLandArea = (acres, guntas) => {
  const acresPart = parseInt(acres) || 0;
  const guntasPart = parseInt(guntas) || 0;
  
  // Convert to total square feet
  const totalSqFt = (acresPart * CONVERSIONS.acres) + (guntasPart * CONVERSIONS.guntas);
  
  // Calculate all conversions
  const totalAcres = totalSqFt / CONVERSIONS.acres;
  const totalGuntas = totalSqFt / CONVERSIONS.guntas;
  const totalSqYards = totalSqFt / CONVERSIONS.squareYards;
  const totalSqMeters = totalSqFt / CONVERSIONS.squareMeters;
  
  return {
    display: `${acresPart} Acre${acresPart !== 1 ? 's' : ''} ${guntasPart} Gunta${guntasPart !== 1 ? 's' : ''}`,
    telugu: `${acresPart} ఎకరం ${guntasPart} గుంటలు`,
    hindi: `${acresPart} एकड़ ${guntasPart} गुंटा`,
    conversions: {
      totalAcres: totalAcres.toFixed(2),
      totalGuntas: totalGuntas.toFixed(2),
      squareFeet: totalSqFt.toFixed(0),
      squareYards: totalSqYards.toFixed(0),
      squareMeters: totalSqMeters.toFixed(2)
    },
    readable: `${totalSqFt.toFixed(0)} Sq Ft | ${totalSqYards.toFixed(0)} Sq Yds | ${totalSqMeters.toFixed(2)} Sq M`
  };
};

/**
 * Format plot area with conversions
 */
export const formatPlotArea = (value, unit) => {
  const sqFeet = toSquareFeet(value, unit);
  
  return {
    display: `${value} ${getUnitLabel(unit)}`,
    conversions: {
      squareFeet: sqFeet.toFixed(0),
      squareYards: fromSquareFeet(sqFeet, 'squareYards').toFixed(0),
      squareMeters: fromSquareFeet(sqFeet, 'squareMeters').toFixed(2),
      acres: fromSquareFeet(sqFeet, 'acres').toFixed(3)
    },
    readable: `${sqFeet.toFixed(0)} Sq Ft | ${fromSquareFeet(sqFeet, 'squareYards').toFixed(0)} Sq Yds | ${fromSquareFeet(sqFeet, 'acres').toFixed(3)} Acres`
  };
};

/**
 * Format flat/villa area
 */
export const formatBuiltUpArea = (value, unit) => {
  const sqFeet = toSquareFeet(value, unit);
  
  return {
    display: `${value} ${getUnitLabel(unit)}`,
    conversions: {
      squareFeet: sqFeet.toFixed(0),
      squareMeters: fromSquareFeet(sqFeet, 'squareMeters').toFixed(2),
      squareYards: fromSquareFeet(sqFeet, 'squareYards').toFixed(0)
    },
    readable: `${sqFeet.toFixed(0)} Sq Ft | ${fromSquareFeet(sqFeet, 'squareMeters').toFixed(2)} Sq M`
  };
};

/**
 * Get unit label
 */
export const getUnitLabel = (unit) => {
  const labels = {
    squareFeet: 'Sq Ft',
    squareYards: 'Sq Yds',
    squareMeters: 'Sq M',
    acres: 'Acres',
    guntas: 'Guntas',
    cents: 'Cents'
  };
  return labels[unit] || unit;
};

/**
 * Get appropriate units for property type
 */
export const getUnitsForPropertyType = (propertyType) => {
  const unitsMap = {
    lands: ['acres', 'guntas'],
    farmLands: ['acres', 'guntas'],
    farmPlot: ['acres', 'guntas', 'cents'],
    plot: ['squareYards', 'squareMeters'],
    flat: ['squareFeet', 'squareMeters'],
    villa: ['squareFeet', 'squareMeters'],
    house: ['squareFeet', 'squareMeters']
  };
  return unitsMap[propertyType] || ['squareFeet'];
};

/**
 * Calculate price per unit
 */
export const calculatePricePerUnit = (totalPrice, area, unit) => {
  const sqFeet = toSquareFeet(area, unit);
  const pricePerSqFt = totalPrice / sqFeet;
  
  return {
    perSquareFoot: pricePerSqFt.toFixed(0),
    perSquareYard: (pricePerSqFt * CONVERSIONS.squareYards).toFixed(0),
    perGunta: (pricePerSqFt * CONVERSIONS.guntas).toFixed(0),
    perCent: (pricePerSqFt * CONVERSIONS.cents).toFixed(0)
  };
};
