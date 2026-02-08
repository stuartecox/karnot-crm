// src/utils/googleSolar.js

// ✅ Correct way for Vite + Netlify:
// Variable must start with VITE_ to be exposed to the browser
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_SOLAR_KEY; 

/**
 * Fetches solar potential data for a specific location (Lat/Lng).
 */
export const fetchSolarPotential = async (lat, lng) => {
  // Safety check for the key
  if (!GOOGLE_API_KEY) {
    console.error("❌ Missing Google Solar API Key! Check your Netlify Environment Variables. Key must be named 'VITE_GOOGLE_SOLAR_KEY'");
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
    const solarPotential = data.solarPotential;
    
    // 3. Extract key metrics
    const ASSUMED_PANEL_WATTAGE = 450; 
    const maxKwp = (solarPotential.maxArrayPanelsCount * ASSUMED_PANEL_WATTAGE) / 1000;

    return {
      maxPanels: solarPotential.maxArrayPanelsCount,
      maxArrayAreaSqM: solarPotential.maxArrayAreaMeters2,
      maxKwp: maxKwp, 
      sunshineHours: solarPotential.maxSunshineHoursPerYear,
      carbonOffsetFactor: solarPotential.carbonOffsetFactorKgPerMwh,
      center: data.center,
      imageryQuality: data.imageryQuality
    };

  } catch (error) {
    console.error("❌ Network or Parsing Error:", error);
    return null;
  }
};
