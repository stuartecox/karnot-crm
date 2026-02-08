// src/utils/googleSolar.js

// 1. Get the key securely from the environment
// NOTE: If using Vite, change this to: import.meta.env.VITE_GOOGLE_SOLAR_KEY
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_SOLAR_KEY; 

/**
 * Fetches solar potential data for a specific location (Lat/Lng).
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object|null>} - Returns formatted solar data or null if failed/no data.
 */
export const fetchSolarPotential = async (lat, lng) => {
  // Safety check for the key
  if (!GOOGLE_API_KEY) {
    console.error("❌ Missing Google Solar API Key! Check your .env file.");
    return null;
  }

  try {
    // 2. Call the Google Solar API (Building Insights Endpoint)
    const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(url);

    // Handle errors (e.g., location not covered, quota exceeded)
    if (!response.ok) {
      const errData = await response.json();
      console.warn("⚠️ Solar API Error:", errData.error?.message || response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    // 3. Extract the critical data points
    // The API returns a lot; we only grab what the calculator needs.
    const solarPotential = data.solarPotential;
    
    // Calculate Max System Size (kWp)
    // Google provides `maxArrayPanelsCount`. We assume a standard 450W panel for the calc.
    const ASSUMED_PANEL_WATTAGE = 450; 
    const maxKwp = (solarPotential.maxArrayPanelsCount * ASSUMED_PANEL_WATTAGE) / 1000;

    return {
      // Basic Specs
      maxPanels: solarPotential.maxArrayPanelsCount,
      maxArrayAreaSqM: solarPotential.maxArrayAreaMeters2,
      maxKwp: maxKwp, 
      
      // Energy & Environment
      sunshineHours: solarPotential.maxSunshineHoursPerYear,
      carbonOffsetFactor: solarPotential.carbonOffsetFactorKgPerMwh,
      
      // Financials (Google provides financial analyses, but we use just the raw potential here)
      // You can expand this later to use `solarPotential.financialAnalyses` if needed.
      
      // Technical details for the map overlay (optional future feature)
      center: data.center,
      imageryQuality: data.imageryQuality
    };

  } catch (error) {
    console.error("❌ Network or Parsing Error:", error);
    return null;
  }
};
