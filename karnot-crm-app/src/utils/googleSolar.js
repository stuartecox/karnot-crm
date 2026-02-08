// src/utils/googleSolar.js

const GOOGLE_API_KEY = "AIzaSyAE1x3m2oghe-5lb-ECuC7OgMKs65apHWI"; // <--- Insert your Key here

export const fetchSolarPotential = async (lat, lng) => {
  try {
    // 1. Get Building Insights
    const response = await fetch(
      `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${GOOGLE_API_KEY}`
    );

    if (!response.ok) throw new Error("Failed to fetch solar data");
    
    const data = await response.json();
    const solarPotential = data.solarPotential;
    
    // 2. Extract key metrics for sizing
    return {
      maxPanels: solarPotential.maxArrayPanelsCount,
      maxArrayAreaSqM: solarPotential.maxArrayAreaMeters2,
      // Google gives specific panel capacity, but let's assume standard 450W for sizing checks
      maxKwp: (solarPotential.maxArrayPanelsCount * 0.450), 
      sunshineHours: solarPotential.maxSunshineHoursPerYear,
      carbonOffsetFactor: solarPotential.carbonOffsetFactorKgPerMwh,
      
      // Roof segments (pitch/azimuth) could be used for advanced yield calc later
      roofSegments: solarPotential.roofSegmentStats
    };
  } catch (error) {
    console.error("Solar API Error:", error);
    return null;
  }
};
