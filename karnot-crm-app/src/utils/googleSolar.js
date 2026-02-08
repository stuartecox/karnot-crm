// src/utils/googleSolar.js

// 1. Get the key securely
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_SOLAR_KEY; 

/**
 * Fetches solar data. Tries Google Solar API first.
 * If that fails (404), falls back to Open-Meteo for Irradiance data.
 */
export const fetchSolarPotential = async (lat, lng) => {
  // Safety check
  if (!GOOGLE_API_KEY) {
    console.error("❌ Missing Google Solar API Key!");
    return null;
  }

  try {
    // --- ATTEMPT 1: GOOGLE SOLAR API (Roof + Sun) ---
    console.log("📡 contacting Google Solar API...");
    const googleUrl = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${GOOGLE_API_KEY}`;
    
    const googleResponse = await fetch(googleUrl);

    if (googleResponse.ok) {
      // ✅ SUCCESS: Google has data for this roof!
      const data = await googleResponse.json();
      const solarPotential = data.solarPotential;
      
      const ASSUMED_PANEL_WATTAGE = 450; 
      const maxKwp = (solarPotential.maxArrayPanelsCount * ASSUMED_PANEL_WATTAGE) / 1000;

      return {
        source: 'GOOGLE',
        maxPanels: solarPotential.maxArrayPanelsCount,
        maxArrayAreaSqM: solarPotential.maxArrayAreaMeters2,
        maxKwp: maxKwp, 
        sunshineHours: solarPotential.maxSunshineHoursPerYear,
        carbonOffsetFactor: solarPotential.carbonOffsetFactorKgPerMwh,
        center: data.center,
        imageryQuality: data.imageryQuality
      };
    } 
    
    // --- ATTEMPT 2: FALLBACK TO OPEN-METEO (Sun Only) ---
    console.warn("⚠️ Google Solar 404. Switching to Open-Meteo for Sun Data...");
    
    // Fetch last year's solar radiation data to calculate average Peak Sun Hours
    const today = new Date();
    const lastYear = today.getFullYear() - 1;
    const start = `${lastYear}-01-01`;
    const end = `${lastYear}-12-31`;
    
    // Open-Meteo API (Free, No Key needed for low volume)
    // "daily=shortwave_radiation_sum" gives MJ/m² per day
    const meteoUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${start}&end_date=${end}&daily=shortwave_radiation_sum&timezone=auto`;
    
    const meteoResponse = await fetch(meteoUrl);
    
    if (meteoResponse.ok) {
      const meteoData = await meteoResponse.json();
      const dailyRadiation = meteoData.daily.shortwave_radiation_sum; // Array of 365 days (MJ/m²)
      
      // Calculate Average Daily MJ/m²
      const totalRad = dailyRadiation.reduce((a, b) => a + (b || 0), 0);
      const avgDailyMJ = totalRad / dailyRadiation.length;
      
      // Convert MJ/m² to kWh/m² (1 kWh = 3.6 MJ)
      // Peak Sun Hours = kWh/m²/day
      const peakSunHours = avgDailyMJ / 3.6;
      
      // Annual Sun Hours = Peak Sun Hours * 365
      const annualSunHours = peakSunHours * 365;

      return {
        source: 'OPEN_METEO',
        maxPanels: 0, // Cannot measure roof
        maxArrayAreaSqM: 0, // Cannot measure roof
        maxKwp: 0, // Will be calculated from manual input
        sunshineHours: annualSunHours, // ✅ REAL DATA from Weather Satellite
        peakSunHoursPerDay: peakSunHours,
        carbonOffsetFactor: 0.7 // Default for Philippines grid
      };
    }

  } catch (error) {
    console.error("❌ Solar Data Error:", error);
    return null;
  }
  
  return null;
};
