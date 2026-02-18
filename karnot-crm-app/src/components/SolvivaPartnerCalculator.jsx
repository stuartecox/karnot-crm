import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { fetchSolarPotential } from '../utils/googleSolar';
import { calculateFixtureDemand } from '../utils/heatPumpLogic'; 
import html2pdf from 'html2pdf.js';
import { APIProvider, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Card, Input, Button } from '../data/constants.jsx';
import {
  Zap, MapPin, CheckCircle, AlertTriangle, ArrowRight, 
  Battery, Moon, Sun, DollarSign, Search, FileText, Download,
  Layers, Edit3, RefreshCw, Save, MousePointer2, Locate, Calculator, 
  Info, X, TrendingUp, Droplets, ThermometerSun, PiggyBank, Target,
  Award, BarChart3, Flame
} from 'lucide-react';

// =============================================================================
// FALLBACK PRICING TABLE
// Used ONLY if a term/size combo is not found in the Firestore database.
// When you add more term entries to Firestore, they will automatically
// take precedence over these fallback values.
// =============================================================================
const SOLVIVA_PRICING_FALLBACK = {
  hybrid: {
    12: { 5.49: 35200, 6.10: 38000, 8.54: 49300, 10.37: 55700, 12.20: 64100, 16.47: 84200, 20.13: 96500 },
    24: { 5.49: 19900, 6.10: 21600, 8.54: 27800, 10.37: 31500, 12.20: 36200, 16.47: 47600, 20.13: 54500 },
    36: { 5.49: 15000, 6.10: 16200, 8.54: 21000, 10.37: 23700, 12.20: 27200, 16.47: 35800, 20.13: 41000 },
    48: { 5.49: 12700, 6.10: 13800, 8.54: 17800, 10.37: 20100, 12.20: 23100, 16.47: 30400, 20.13: 34800 },
    60: { 5.49: 11500, 6.10: 12400, 8.54: 16000, 10.37: 18100, 12.20: 20900, 16.47: 27400, 20.13: 31400 }
  },
  ready: {
    12: { 5.49: 24000, 6.10: 27000, 8.54: 38083, 10.37: 44500, 12.20: 52833, 16.47: 73737, 20.13: 85250 },
    24: { 5.49: 13560, 6.10: 15255, 8.54: 21517, 10.37: 25142, 12.20: 29850, 16.47: 41245, 20.13: 48166 },
    36: { 5.49: 10215, 6.10: 11492, 8.54: 16209, 10.37: 18940, 12.20: 22487, 16.47: 31071, 20.13: 36285 },
    48: { 5.49: 8657, 6.10: 9739, 8.54: 13737, 10.37: 16052, 12.20: 19058, 16.47: 26332, 20.13: 30751 },
    60: { 5.49: 7826, 6.10: 8804, 8.54: 12418, 10.37: 14511, 12.20: 17228, 16.47: 23804, 20.13: 27799 }
  }
};

// System sizes available (kWp) — used for nearest-match lookup
const SYSTEM_SIZES = [5.49, 6.10, 8.54, 10.37, 12.20, 16.47, 20.13];

// =============================================================================
// PRICING TABLE BUILDER
// Parses Firestore Competitor Solar products and builds a lookup structure:
//   { hybrid: { 60: { 5.49: 11500, ... } }, ready: { 60: { 5.49: 7826, ... } } }
//
// Product ID convention: sol-hyb-XXX (hybrid) | sol-rdy-XXX (ready)
// Specs field convention: "Term: 60 Months | Includes Battery"
//                          "Term: 24 Months | No Battery"
// salesPriceUSD field contains the PHP monthly payment for that term/size.
// =============================================================================
const buildPricingFromProducts = (solvivaProducts) => {
  // Start with a deep clone of the fallback so every term/size is covered
  const pricing = {
    hybrid: {},
    ready: {}
  };

  // Populate fallback values first
  Object.entries(SOLVIVA_PRICING_FALLBACK.hybrid).forEach(([term, sizes]) => {
    pricing.hybrid[Number(term)] = { ...sizes };
  });
  Object.entries(SOLVIVA_PRICING_FALLBACK.ready).forEach(([term, sizes]) => {
    pricing.ready[Number(term)] = { ...sizes };
  });

  // Override with live DB values
  let dbOverrides = 0;
  solvivaProducts.forEach(p => {
    const id = (p.id || '').toLowerCase();
    const specs = (p.Specs || p.specs || '').toLowerCase();
    const kw = parseFloat(p.kW_Cooling_Nominal);
    const price = parseFloat(p.salesPriceUSD); // NOTE: field name is salesPriceUSD but stores PHP monthly payment

    if (!kw || !price) return;

    // Determine product type from ID or Specs
    let productType = null;
    if (id.startsWith('sol-hyb') || specs.includes('includes battery')) {
      productType = 'hybrid';
    } else if (id.startsWith('sol-rdy') || specs.includes('no battery')) {
      productType = 'ready';
    }
    if (!productType) return;

    // Extract term from Specs: "Term: 60 Months | ..."
    const termMatch = specs.match(/term:\s*(\d+)\s*month/i) || 
                      (p.Specs || '').match(/Term:\s*(\d+)\s*Month/i);
    const term = termMatch ? parseInt(termMatch[1]) : null;
    if (!term) return;

    // Normalise kW to nearest standard size for reliable lookup
    const nearestKw = SYSTEM_SIZES.find(s => Math.abs(s - kw) < 0.05) || kw;

    if (!pricing[productType][term]) {
      pricing[productType][term] = {};
    }
    pricing[productType][term][nearestKw] = price;
    dbOverrides++;
  });

  console.log(`=== SOLVIVA PRICING TABLE: ${dbOverrides} DB overrides applied ===`);
  console.log('Hybrid 60mo:', pricing.hybrid[60]);
  console.log('Ready  60mo:', pricing.ready[60]);

  return pricing;
};

// =============================================================================
// PRICING HELPERS (unchanged API — rest of component calls these same functions)
// =============================================================================
const findNearestSystem = (requiredKW) => {
  return SYSTEM_SIZES.find(size => size >= requiredKW) || SYSTEM_SIZES[SYSTEM_SIZES.length - 1];
};

// Now accepts the live pricingTable built from the DB
const getSolvivaPayment = (systemSize, productType, term, pricingTable) => {
  const termPricing = pricingTable?.[productType]?.[term];
  if (!termPricing) return SOLVIVA_PRICING_FALLBACK[productType]?.[term]?.[systemSize] || 0;
  return termPricing[systemSize] || 0;
};

const getHeatPumpFinancing = (principal, months) => {
  const rate = 0.09 / 12;
  if (months === 12) return principal * 1.05 / 12;
  return principal * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
};

// --- HELPER: ADDRESS SEARCH ---
const GeocoderControl = ({ address, onLocationFound }) => {
  const map = useMap();
  const geocodingLib = useMapsLibrary('geocoding');
  const [geocoder, setGeocoder] = useState(null);

  useEffect(() => {
    if (geocodingLib) setGeocoder(new geocodingLib.Geocoder());
  }, [geocodingLib]);

  const handleSearch = () => {
    if (!geocoder || !map || !address) return;
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        map.panTo({ lat: loc.lat(), lng: loc.lng() });
        map.setZoom(19);
        onLocationFound(loc.lat(), loc.lng());
      } else {
        alert('Location not found. Try a different address format.');
      }
    });
  };

  return (
    <Button onClick={handleSearch} className="absolute right-1 top-1 h-8 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow-md z-10 flex items-center gap-1">
      <Search size={14}/> Find
    </Button>
  );
};

const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => { if (map) map.panTo({ lat, lng }); }, [map, lat, lng]);
  return null;
};

const MapEvents = ({ onDragEnd }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('idle', () => {
      const center = map.getCenter();
      if (center) onDragEnd(center.lat(), center.lng());
    });
    return () => google.maps.event.removeListener(listener);
  }, [map, onDragEnd]);
  return null;
};


const SolvivaPartnerCalculator = () => {
  // === STATE ===
  const [solvivaProducts, setSolvivaProducts] = useState([]);
  const [karnotProducts, setKarnotProducts] = useState([]);
  const [solvivaPricing, setSolvivaPricing] = useState(null); // built from DB
  const [loading, setLoading] = useState(true);
  const [pricingSource, setPricingSource] = useState({ dbCount: 0, fallbackCount: 0 }); // for UI indicator
  const [showMath, setShowMath] = useState(false);
  const [showFixtureModal, setShowFixtureModal] = useState(false);
  const [showCustomerBenefits, setShowCustomerBenefits] = useState(true);
  const [showSolvivaBenefits, setShowSolvivaBenefits] = useState(true);
  
  // Google Solar Data
  const [coordinates, setCoordinates] = useState({ lat: 16.023497, lng: 120.430082 }); 
  const [addressSearch, setAddressSearch] = useState('Cosmos Farm, Pangasinan'); 
  const [solarData, setSolarData] = useState(null);
  const [fetchingSolar, setFetchingSolar] = useState(false);
  
  // Inputs
  const [inputs, setInputs] = useState({
    showers: 3,
    people: 4,
    showerPowerKW: 3.5,
    acCount: 3,
    acHorsePower: 1.5, 
    acHoursNight: 8,
    baseLoadKW: 0.5,
    currentHeating: 'electric',
    electricityRate: 12.50,
    lpgPrice: 1100,
    lpgSize: 11,
    dieselPrice: 60,
    downPayment: 20,
    interestRate: 8,
    loanTermYears: 5,
    manualRoofArea: 100, 
    manualSunHours: 5.5,
    inletTemp: 25,
    targetTemp: 55,
    panelWattage: 550,
    recoveryHours: 10,
    solvivaProductType: 'hybrid',
    solvivaFinancingTerm: 60,
    monthlyElectricBill: 8000,
    externalTankCostPerLiter: 2.5,
    installationCostPerUnit: 600,
    annualServicePerUnit: 172,
  });

  const [fixtureInputs, setFixtureInputs] = useState({ 
    showers: 0, basins: 0, sinks: 0, people: 0, hours: 8 
  });

  // === 1. LOAD DATA — builds pricing table from DB ===
  useEffect(() => {
    const loadData = async () => {
      const user = getAuth().currentUser;
      if (!user) return;
      
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'products'));
        const allProds = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Solviva Solar competitors
        const competitors = allProds
          .filter(p => p.category === 'Competitor Solar')
          .sort((a, b) => (a.kW_Cooling_Nominal || 0) - (b.kW_Cooling_Nominal || 0));

        // -------------------------------------------------------
        // BUILD LIVE PRICING TABLE FROM DB
        // -------------------------------------------------------
        const livePricing = buildPricingFromProducts(competitors);
        setSolvivaPricing(livePricing);

        // Count how many DB entries vs fallback (for UI indicator)
        let dbCount = 0;
        competitors.forEach(p => {
          const specs = (p.Specs || p.specs || '');
          const termMatch = specs.match(/Term:\s*(\d+)\s*Month/i);
          if (termMatch && parseFloat(p.kW_Cooling_Nominal) && parseFloat(p.salesPriceUSD)) dbCount++;
        });
        const totalCells = Object.keys(SOLVIVA_PRICING_FALLBACK.hybrid).length * SYSTEM_SIZES.length * 2;
        setPricingSource({ dbCount, fallbackCount: totalCells - dbCount });

        // Karnot Heat Pumps
        const heatPumps = allProds
          .filter(p => {
            const hasHeating = (p.kW_DHW_Nominal && p.kW_DHW_Nominal > 0) || 
                               (p.kW_Heating_Nominal && p.kW_Heating_Nominal > 0);
            const notSolar = p.category !== 'Competitor Solar';
            const isR290 = (p.Refrigerant || p.refrigerant || '').toUpperCase().includes('R290');
            return hasHeating && notSolar && isR290;
          })
          .sort((a, b) => (a.kW_DHW_Nominal || a.kW_Heating_Nominal || 0) - (b.kW_DHW_Nominal || b.kW_Heating_Nominal || 0));

        setSolvivaProducts(competitors);
        setKarnotProducts(heatPumps);
        
        console.log('=== LOADED PRODUCTS ===');
        console.log('Karnot Heat Pumps:', heatPumps.length);
        heatPumps.forEach(p => console.log(`  - ${p.name}: $${p.salesPriceUSD} (${p.kW_DHW_Nominal || 0} kW DHW)`));
        console.log('Solviva Solar (DB records):', competitors.length);
      } catch (err) {
        console.error('Error loading products:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // === 2. SOLAR API HANDLER ===
  const handleSolarLookup = async () => {
    setFetchingSolar(true);
    const data = await fetchSolarPotential(coordinates.lat, coordinates.lng);
    if (data) {
      setSolarData(data);
      let newArea = inputs.manualRoofArea;
      let newSun = inputs.manualSunHours;
      if (data.source === 'GOOGLE') {
        newArea = Math.floor(data.maxArrayAreaSqM);
        newSun = parseFloat(data.sunshineHours.toFixed(1));
      } else if (data.source === 'OPEN_METEO') {
        newSun = parseFloat(data.peakSunHoursPerDay.toFixed(2));
      }
      setInputs(prev => ({ ...prev, manualRoofArea: newArea, manualSunHours: newSun }));
    } else {
      console.warn('No Solar Data Found.');
    }
    setFetchingSolar(false);
  };

  const getStaticMapUrl = () => {
    const key = import.meta.env.VITE_GOOGLE_SOLAR_KEY;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${coordinates.lat},${coordinates.lng}&zoom=20&size=600x400&maptype=satellite&key=${key}`;
  };

  const handleMapIdle = useCallback((lat, lng) => setCoordinates({ lat, lng }), []);
  const handleAddressFound = useCallback((lat, lng) => setCoordinates({ lat, lng }), []);

  const handleFixtureChange = (field) => (e) => {
    setFixtureInputs(prev => ({ ...prev, [field]: parseInt(e.target.value) || 0 }));
  };

  const applyFixtureCalculation = () => {
    setInputs(prev => ({ ...prev, people: fixtureInputs.people || prev.people }));
    setShowFixtureModal(false);
  };

  // === 3. COMPREHENSIVE ANALYSIS LOGIC ===
  const analysis = useMemo(() => {
    // Guard: pricing table must be ready
    if (!solvivaPricing) return { error: true, message: 'Loading pricing data...' };

    // --- STEP A: SIZE THE THERMAL LOAD ---
    const dailyLiters = (inputs.people * 50) + (inputs.showers * 60);
    const deltaT = inputs.targetTemp - inputs.inletTemp;
    const dailyThermalKWh = (dailyLiters * deltaT * 1.163) / 1000;
    const requiredRecoveryKW = dailyThermalKWh / inputs.recoveryHours;

    // --- STEP B: SELECT THE MACHINE (FROM DATABASE) ---
    let selectedKarnot = karnotProducts.find(p => (p.kW_DHW_Nominal || p.kW || 0) >= requiredRecoveryKW);
    if (!selectedKarnot && karnotProducts.length > 0) {
      selectedKarnot = karnotProducts[karnotProducts.length - 1];
    }
    if (!selectedKarnot) {
      return {
        error: true,
        message: 'No Karnot heat pump products found in database. Please add products in Product Manager.',
        dailyLiters, dailyThermalKWh, requiredRecoveryKW
      };
    }

    // --- STEP C: TANK MATH ---
    const requiredTotalVolume = Math.round(dailyLiters / 100) * 100;
    let integratedTankVolume = selectedKarnot.tankVolume || 0;
    if (!integratedTankVolume && selectedKarnot.name) {
      const name = selectedKarnot.name.toLowerCase();
      if (name.includes('aquahero')) {
        if (name.includes('200l') || name.includes('200 l')) integratedTankVolume = 200;
        else if (name.includes('300l') || name.includes('300 l')) integratedTankVolume = 300;
      }
    }
    const externalTankNeeded = Math.max(0, requiredTotalVolume - integratedTankVolume);
    const externalTankCost = externalTankNeeded * inputs.externalTankCostPerLiter;

    // --- STEP D: ELECTRICAL LOADS ---
    const kwPerHP = 0.85; 
    const acTotalKW = inputs.acCount * inputs.acHorsePower * kwPerHP;
    const showerPeakKW = inputs.showers * inputs.showerPowerKW;
    const peakLoad_A = inputs.baseLoadKW + acTotalKW + showerPeakKW; 
    const hpInputKW = (selectedKarnot.kW_DHW_Nominal || 3.5) / (selectedKarnot.cop || 4.2);
    const peakLoad_B = inputs.baseLoadKW + acTotalKW + hpInputKW;         
    
    // --- STEP E: SELECT SOLVIVA SYSTEMS USING LIVE PRICING TABLE ---
    const targetInverterA = peakLoad_A * 1.2;
    const targetInverterB = peakLoad_B * 1.2;
    const systemSize_A = findNearestSystem(targetInverterA);
    const systemSize_B = findNearestSystem(targetInverterB);
    
    // *** LIVE DB LOOKUP — passes solvivaPricing built from Firestore ***
    const solvivaPayment_A = getSolvivaPayment(systemSize_A, inputs.solvivaProductType, inputs.solvivaFinancingTerm, solvivaPricing);
    const solvivaPayment_B = getSolvivaPayment(systemSize_B, inputs.solvivaProductType, inputs.solvivaFinancingTerm, solvivaPricing);

    const planA = solvivaProducts.find(p => Math.abs((p.kW_Cooling_Nominal || 0) - systemSize_A) < 0.1);
    const planB = solvivaProducts.find(p => Math.abs((p.kW_Cooling_Nominal || 0) - systemSize_B) < 0.1);

    if (!planA || !planB) {
      return {
        error: true,
        message: 'Solviva products not found in database. Ensure kW_Cooling_Nominal matches: 5.49, 6.10, 8.54, 10.37, 12.20, 16.47, 20.13',
        dailyLiters, dailyThermalKWh, selectedKarnot
      };
    }

    // --- STEP F: PANEL COUNTS ---
    const panelsA = Math.ceil(systemSize_A * 1000 / inputs.panelWattage);
    const panelsB = Math.ceil(systemSize_B * 1000 / inputs.panelWattage);
    const panelsSaved = Math.max(0, panelsA - panelsB);

    // --- STEP G: TOTAL PROJECT COSTS ---
    const costA = planA?.salesPriceUSD || 0;
    const costB_Solar = planB?.salesPriceUSD || 0;
    const costKarnot = selectedKarnot.salesPriceUSD || 0;
    const installationCost = inputs.installationCostPerUnit;
    const costB_Total = costB_Solar + costKarnot + externalTankCost + installationCost;
    const capexSavings = costA - costB_Total;
    
    // --- STEP H: FUEL COST COMPARISONS ---
    let currentAnnualFuelCost = 0;
    if (inputs.currentHeating === 'electric') {
      const dailyShowerKWh = (inputs.showerPowerKW * 0.167) * inputs.showers;
      currentAnnualFuelCost = dailyShowerKWh * 365 * inputs.electricityRate;
    } else if (inputs.currentHeating === 'lpg') {
      const kgNeededAnnual = (dailyThermalKWh / (13.6 * 0.80)) * 365;
      currentAnnualFuelCost = (kgNeededAnnual / inputs.lpgSize) * inputs.lpgPrice;
    } else if (inputs.currentHeating === 'diesel') {
      const litersAnnual = (dailyThermalKWh / (10 * 0.85)) * 365;
      currentAnnualFuelCost = litersAnnual * inputs.dieselPrice;
    }
    
    const hpDailyKWh = dailyThermalKWh / (selectedKarnot.cop || 4.2);
    const hpMonthlyKWh = hpDailyKWh * 30;
    const hpAnnualKWh = hpDailyKWh * 365;
    const gridKWh = hpAnnualKWh * 0.30; // 70% solar covered
    const hpAnnualCost = gridKWh * inputs.electricityRate;
    const annualFuelSavings = currentAnnualFuelCost - hpAnnualCost;
    const fiveYearFuelSavings = annualFuelSavings * 5;
    
    // --- STEP I: SOLAR GENERATION VALUE ---
    const monthlyGenB_kWh = systemSize_B * inputs.manualSunHours * 30;
    const annualGenB_kWh = monthlyGenB_kWh * 12;
    const totalDailyKWh = ((inputs.baseLoadKW + acTotalKW) * inputs.acHoursNight / 24 * 24) + hpDailyKWh;
    const solarOffsetKWh = Math.min(annualGenB_kWh, totalDailyKWh * 365);
    const annualSolarValue = solarOffsetKWh * inputs.electricityRate;
    const fiveYearSolarValue = annualSolarValue * 5;
    
    // --- STEP J: TOTAL VALUE ---
    const fiveYearOperatingSavings = (fiveYearFuelSavings + fiveYearSolarValue) / 58;
    const fiveYearTotalSavings = capexSavings + fiveYearOperatingSavings;
    
    // --- STEP K: TRADITIONAL FINANCING ---
    const downPaymentAmount = costB_Total * (inputs.downPayment / 100);
    const loanAmount = costB_Total - downPaymentAmount;
    const monthlyRate = inputs.interestRate / 100 / 12;
    const numPayments = inputs.loanTermYears * 12;
    const monthlyPayment = loanAmount > 0 
      ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0;

    // --- STEP L: SOLVIVA MONTHLY PAYMENT MODEL (uses live pricing) ---
    const monthlyPayment_SolarOnly_PHP = solvivaPayment_A;
    const monthlyPayment_SolarOnly_USD = Math.round(monthlyPayment_SolarOnly_PHP / 58);

    const monthlyPayment_Solar_PHP = solvivaPayment_B;
    const heatPumpTotal = costKarnot + externalTankCost + installationCost;
    const monthlyPayment_HeatPump_USD = getHeatPumpFinancing(heatPumpTotal, inputs.solvivaFinancingTerm);
    const monthlyPayment_HeatPump_PHP = Math.round(monthlyPayment_HeatPump_USD * 58);
    const monthlyPayment_Partner_Total_PHP = monthlyPayment_Solar_PHP + monthlyPayment_HeatPump_PHP;
    const monthlyPayment_Partner_Total_USD = Math.round(monthlyPayment_Partner_Total_PHP / 58);

    const dailyShowerKWh = (inputs.showerPowerKW * 0.167) * inputs.showers;
    const residualBill_SolarOnly = (dailyShowerKWh * 30 * inputs.electricityRate) + (inputs.monthlyElectricBill * 0.15);
    const hpMonthlyCost = hpDailyKWh * 30 * inputs.electricityRate * 0.30;
    const residualBill_Partner = hpMonthlyCost + (inputs.monthlyElectricBill * 0.10);

    const netMonthlyCost_SolarOnly = monthlyPayment_SolarOnly_PHP + residualBill_SolarOnly;
    const netMonthlyCost_Partner = monthlyPayment_Partner_Total_PHP + residualBill_Partner;
    const monthlyAdvantage_Customer = netMonthlyCost_SolarOnly - netMonthlyCost_Partner;

    return {
      dailyLiters: Math.round(dailyLiters), 
      dailyThermalKWh: Math.round(dailyThermalKWh * 10) / 10, 
      requiredRecoveryKW: Math.round(requiredRecoveryKW * 10) / 10,
      selectedKarnot, 
      hpInputKW: Math.round(hpInputKW * 100) / 100,
      hpDailyKWh: Math.round(hpDailyKWh * 10) / 10,
      hpMonthlyKWh: Math.round(hpMonthlyKWh),
      hpAnnualKWh: Math.round(hpAnnualKWh),
      requiredTotalVolume: Math.round(dailyLiters / 100) * 100, 
      integratedTankVolume, 
      externalTankNeeded,
      externalTankCost: Math.round(externalTankCost),
      peakLoad_A: Math.round(peakLoad_A * 10) / 10, 
      peakLoad_B: Math.round(peakLoad_B * 10) / 10,
      showerPeakKW: Math.round(showerPeakKW * 10) / 10,
      systemSize_A, systemSize_B,
      planA, planB, 
      panelsA, panelsB, panelsSaved,
      costA: Math.round(costA), 
      costB_Total: Math.round(costB_Total), 
      costKarnot: Math.round(costKarnot),
      installationCost: Math.round(installationCost),
      capexSavings: Math.round(capexSavings),
      currentAnnualFuelCost: Math.round(currentAnnualFuelCost),
      hpAnnualCost: Math.round(hpAnnualCost),
      annualFuelSavings: Math.round(annualFuelSavings),
      fiveYearFuelSavings: Math.round(fiveYearFuelSavings),
      monthlyGenB_kWh: Math.round(monthlyGenB_kWh),
      annualGenB_kWh: Math.round(annualGenB_kWh),
      solarOffsetKWh: Math.round(solarOffsetKWh),
      annualSolarValue: Math.round(annualSolarValue),
      fiveYearSolarValue: Math.round(fiveYearSolarValue),
      fiveYearOperatingSavings: Math.round(fiveYearOperatingSavings),
      fiveYearTotalSavings: Math.round(fiveYearTotalSavings),
      downPaymentAmount: Math.round(downPaymentAmount),
      loanAmount: Math.round(loanAmount),
      monthlyPayment: Math.round(monthlyPayment),
      monthlyPaymentPHP: Math.round(monthlyPayment * 58),
      monthlySavings: Math.round((annualFuelSavings + annualSolarValue) / 12),
      netMonthlyCashFlow: Math.round(((annualFuelSavings + annualSolarValue) / 12) - (monthlyPayment * 58)),
      simplePayback: Math.round((costB_Total * 58) / (annualFuelSavings + annualSolarValue) * 10) / 10,
      heatPumpRevenue: Math.round(costKarnot),
      installationRevenue: Math.round(installationCost * 0.20),
      annualServiceRevenue: Math.round(inputs.annualServicePerUnit),
      fiveYearServiceRevenue: Math.round(inputs.annualServicePerUnit * 5),
      totalPartnerRevenueUpfront: Math.round(costKarnot + (installationCost * 0.20)),
      totalPartnerRevenueFiveYear: Math.round(costKarnot + (installationCost * 0.20) + (inputs.annualServicePerUnit * 5)),
      revenueIncrease: Infinity,
      monthlyPayment_SolarOnly_PHP: Math.round(monthlyPayment_SolarOnly_PHP),
      monthlyPayment_SolarOnly_USD,
      monthlyPayment_Solar_PHP: Math.round(monthlyPayment_Solar_PHP),
      monthlyPayment_HeatPump_PHP,
      monthlyPayment_HeatPump_USD: Math.round(monthlyPayment_HeatPump_USD),
      monthlyPayment_Partner_Total_PHP: Math.round(monthlyPayment_Partner_Total_PHP),
      monthlyPayment_Partner_Total_USD,
      residualBill_SolarOnly: Math.round(residualBill_SolarOnly),
      residualBill_Partner: Math.round(residualBill_Partner),
      netMonthlyCost_SolarOnly: Math.round(netMonthlyCost_SolarOnly),
      netMonthlyCost_Partner: Math.round(netMonthlyCost_Partner),
      monthlyAdvantage_Customer: Math.round(monthlyAdvantage_Customer),
    };
  }, [inputs, solvivaProducts, karnotProducts, solvivaPricing]); // <-- solvivaPricing added as dependency

  // === 4. PDF GENERATOR (unchanged) ===
  const generatePDFReport = () => {
    const element = document.createElement('div');
    element.style.padding = '20px';
    element.style.fontFamily = 'Helvetica, Arial, sans-serif';
    element.style.fontSize = '11px';
    
    element.innerHTML = `
      <div style="border-bottom: 4px solid #F56600; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="margin: 0; color: #131B28; font-size: 24px;">Solviva + Karnot Partnership Proposal</h1>
          <h2 style="margin: 5px 0 0; color: #666; font-size: 14px; font-weight: normal;">Engineering-Optimized Solar + Heat Pump Solution</h2>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 10px;">${new Date().toLocaleDateString()}</div>
          <div style="font-weight: bold; color: #F56600; font-size: 10px;">CONFIDENTIAL</div>
        </div>
      </div>

      ${solarData ? `
      <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 15px;">
        <h3 style="font-size: 12px; font-weight: bold; margin-bottom: 8px; color: #334155;">Solar Potential Analysis</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 10px;">
          <div><div style="color: #64748b;">Available Roof Area:</div><div style="font-weight: bold; font-size: 14px;">${inputs.manualRoofArea} m²</div></div>
          <div><div style="color: #64748b;">Peak Sun Hours:</div><div style="font-weight: bold; font-size: 14px;">${inputs.manualSunHours} hrs/day</div></div>
          <div><div style="color: #64748b;">Data Source:</div><div style="font-weight: bold; font-size: 14px;">${solarData.source}</div></div>
        </div>
      </div>
      ` : ''}

      <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 15px;">
        <h3 style="font-size: 12px; font-weight: bold; margin-bottom: 8px; color: #334155;">Engineering Sizing Summary</h3>
        <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
            <tr>
                <td style="padding: 3px; color: #64748b;">Daily Hot Water:</td>
                <td style="padding: 3px; font-weight: bold;">${analysis.dailyLiters.toLocaleString()} Liters</td>
                <td style="padding: 3px; color: #64748b;">Thermal Energy:</td>
                <td style="padding: 3px; font-weight: bold;">${analysis.dailyThermalKWh.toFixed(1)} kWh</td>
            </tr>
            <tr>
                <td style="padding: 3px; color: #64748b;">Selected Heat Pump:</td>
                <td style="padding: 3px; font-weight: bold; color: #F56600;">${analysis.selectedKarnot.name}</td>
                <td style="padding: 3px; color: #64748b;">Recovery Rate:</td>
                <td style="padding: 3px; font-weight: bold;">${analysis.selectedKarnot.kW_DHW_Nominal || analysis.selectedKarnot.kW || 3.5} kW</td>
            </tr>
            <tr>
                <td style="padding: 3px; color: #64748b;">Integrated Tank:</td>
                <td style="padding: 3px; font-weight: bold;">${analysis.integratedTankVolume} L</td>
                <td style="padding: 3px; color: #64748b;">External Tank:</td>
                <td style="padding: 3px; font-weight: bold;">${analysis.externalTankNeeded > 0 ? analysis.externalTankNeeded + ' L' : 'None Required'}</td>
            </tr>
        </table>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div style="background: #fff5f5; padding: 12px; border-radius: 6px; border: 2px solid #dc3545;">
          <div style="font-size: 14px; font-weight: bold; color: #dc3545; margin-bottom: 8px;">Scenario A: Solar Only</div>
          <div style="font-size: 10px; margin-bottom: 4px;"><strong>${analysis.systemSize_A} kWp Solviva ${inputs.solvivaProductType === 'hybrid' ? 'Hybrid' : 'Ready'}</strong></div>
          <div style="font-size: 10px; margin-bottom: 4px;">Peak Load: <strong>${analysis.peakLoad_A.toFixed(1)} kW</strong></div>
          <div style="font-size: 10px; margin-bottom: 10px;">Solar Panels: <strong>${analysis.panelsA} × 550W</strong></div>
          <div style="font-size: 20px; font-weight: bold; color: #dc3545;">₱${analysis.monthlyPayment_SolarOnly_PHP.toLocaleString()}/mo</div>
          <div style="font-size: 9px; color: #666; margin-top: 4px;">${inputs.solvivaFinancingTerm} months • CAPEX: $${analysis.costA.toLocaleString()}</div>
        </div>
        <div style="background: #f0fff4; padding: 12px; border-radius: 6px; border: 2px solid #28a745;">
          <div style="font-size: 14px; font-weight: bold; color: #28a745; margin-bottom: 8px;">Scenario B: Optimized Partner Model</div>
          <div style="font-size: 10px; margin-bottom: 4px;"><strong>${analysis.systemSize_B} kWp + ${analysis.selectedKarnot.name}</strong></div>
          <div style="font-size: 10px; margin-bottom: 4px;">Peak Load: <strong>${analysis.peakLoad_B.toFixed(1)} kW</strong> (${((1 - analysis.peakLoad_B/analysis.peakLoad_A) * 100).toFixed(0)}% reduction)</div>
          <div style="font-size: 10px; margin-bottom: 10px;">Solar Panels: <strong>${analysis.panelsB} × 550W</strong> (Saved ${analysis.panelsSaved})</div>
          <div style="font-size: 20px; font-weight: bold; color: #28a745;">₱${analysis.monthlyPayment_Partner_Total_PHP.toLocaleString()}/mo</div>
          <div style="font-size: 9px; color: #666; margin-top: 4px;">${inputs.solvivaFinancingTerm} months • Solar: ₱${analysis.monthlyPayment_Solar_PHP.toLocaleString()} + HP: ₱${analysis.monthlyPayment_HeatPump_PHP.toLocaleString()}</div>
        </div>
      </div>

      <div style="background: #fffbeb; padding: 12px; border-radius: 6px; border: 2px solid #f59e0b; margin-bottom: 15px;">
        <h3 style="font-size: 12px; font-weight: bold; margin-bottom: 8px; color: #92400e;">Customer Monthly Savings</h3>
        <div style="text-align: center;">
          <div style="font-size: 28px; font-weight: bold; color: #f59e0b;">₱${analysis.monthlyAdvantage_Customer.toLocaleString()}/month</div>
          <div style="font-size: 10px; color: #78350f; margin-top: 4px;">Partner model costs less per month than solar-only</div>
        </div>
      </div>

      <div style="background: #1e293b; color: white; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
        <h3 style="font-size: 12px; font-weight: bold; margin-bottom: 10px; color: #94a3b8;">5-Year Financial Impact (Customer)</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; font-size: 10px;">
          <div><div style="color: #94a3b8; margin-bottom: 3px;">CAPEX Savings</div><div style="font-size: 16px; font-weight: bold;">₱${(analysis.capexSavings * 58).toLocaleString()}</div></div>
          <div><div style="color: #94a3b8; margin-bottom: 3px;">Fuel Savings</div><div style="font-size: 16px; font-weight: bold; color: #fbbf24;">₱${analysis.fiveYearFuelSavings.toLocaleString()}</div></div>
          <div><div style="color: #94a3b8; margin-bottom: 3px;">Solar Value</div><div style="font-size: 16px; font-weight: bold; color: #fbbf24;">₱${analysis.fiveYearSolarValue.toLocaleString()}</div></div>
          <div style="text-align: right;"><div style="color: #94a3b8; margin-bottom: 3px;">Total Benefit</div><div style="font-size: 20px; font-weight: bold; color: #10b981;">₱${(analysis.fiveYearTotalSavings * 58).toLocaleString()}</div></div>
        </div>
      </div>

      <div style="background: #fffbeb; padding: 15px; border-radius: 6px; border: 2px solid #f59e0b;">
        <h3 style="font-size: 12px; font-weight: bold; margin-bottom: 10px; color: #92400e;">Solviva Incremental Revenue (Per Customer)</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 10px;">
          <div><div style="color: #78350f;">Heat Pump Sale:</div><div style="font-weight: bold; font-size: 14px;">$${analysis.heatPumpRevenue.toLocaleString()}</div></div>
          <div><div style="color: #78350f;">Installation Fee:</div><div style="font-weight: bold; font-size: 14px;">$${analysis.installationRevenue.toLocaleString()}</div></div>
          <div style="text-align: right;"><div style="color: #78350f;">Extra Revenue:</div><div style="font-weight: bold; font-size: 16px; color: #f59e0b;">$${analysis.totalPartnerRevenueUpfront.toLocaleString()}</div></div>
        </div>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #f59e0b; text-align: center; font-size: 11px; color: #78350f;">
          <strong>5-Year Total:</strong> $${analysis.totalPartnerRevenueFiveYear.toLocaleString()} (includes $${analysis.fiveYearServiceRevenue.toLocaleString()} service revenue)
        </div>
      </div>
    `;

    const opt = {
      margin: 0.4,
      filename: `Solviva_Karnot_Proposal_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  if (loading) return (
    <div className="p-10 text-center">
      <div className="text-xl font-bold mb-2">Loading Database...</div>
      <div className="text-sm text-slate-500">Fetching Solviva & Karnot Product Catalogs</div>
    </div>
  );

  if (analysis.error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-8 text-center">
          <AlertTriangle size={48} className="text-red-600 mx-auto mb-4"/>
          <h2 className="text-2xl font-bold text-red-900 mb-2">Database Configuration Required</h2>
          <p className="text-red-700 mb-4">{analysis.message}</p>
          <div className="bg-white rounded-lg p-4 text-left text-sm space-y-2">
            <p className="font-bold text-slate-900">Required Products:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li><strong>Karnot Heat Pumps:</strong> Category must include "heat pump", "heater", or "AquaHERO"</li>
              <li><strong>Solviva Solar Kits:</strong> Category = "Competitor Solar"</li>
            </ul>
            <p className="mt-4 text-slate-600">
              Go to <strong>Product Manager</strong> → Add products with correct categories and pricing
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Zap size={32}/> Solviva + Karnot Partnership Calculator
            </h1>
            <p className="text-orange-100 mt-2">Engineering-Optimized Solar + Heat Pump Solutions</p>
          </div>
          <div className="text-right">
            {/* DB PRICING SOURCE INDICATOR */}
            <div className={`text-xs font-bold uppercase mb-1 ${pricingSource.dbCount > 0 ? 'text-green-200' : 'text-yellow-200'}`}>
              {pricingSource.dbCount > 0 
                ? `✓ Pricing: ${pricingSource.dbCount} DB entries` 
                : '⚠ Pricing: fallback only'}
            </div>
            <div className="text-white font-bold flex items-center gap-1 justify-end text-lg">
              <CheckCircle size={18}/> {karnotProducts.length} Karnot / {solvivaProducts.length} Solviva
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: INPUTS */}
        <div className="space-y-6">
          
          {/* MAP CARD */}
          <Card className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-green-500"/> Site Solar Analysis
            </h3>
            <div className="space-y-3">
              <div className="relative mb-2">
                <input 
                  type="text"
                  value={addressSearch}
                  onChange={(e) => setAddressSearch(e.target.value)}
                  className="w-full p-2 pr-20 border border-slate-300 rounded text-sm"
                  placeholder="Enter address..."
                />
              </div>
              <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-300 relative mb-3 shadow-inner">
                <APIProvider apiKey={import.meta.env.VITE_GOOGLE_SOLAR_KEY}>
                  <Map
                    style={{width: '100%', height: '100%'}}
                    defaultCenter={coordinates}
                    defaultZoom={19}
                    mapTypeId="hybrid"
                    gestureHandling={'cooperative'} 
                    disableDefaultUI={false} 
                  >
                    <GeocoderControl address={addressSearch} onLocationFound={handleAddressFound} />
                    <RecenterMap lat={coordinates.lat} lng={coordinates.lng} />
                    <MapEvents onDragEnd={handleMapIdle} />
                  </Map>
                </APIProvider>
                <div className="absolute bottom-2 left-2 bg-white/90 text-slate-800 text-[10px] px-2 py-1 rounded font-bold flex items-center gap-1 shadow-sm border border-gray-200">
                  <MousePointer2 size={10}/> Drag to adjust
                </div>
              </div>
              
              {solarData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs">
                  <div className="font-bold text-green-800 mb-2 flex items-center gap-1">
                    <Sun size={14}/> Solar Potential Detected
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-green-600">Roof Area:</div>
                      <div className="font-bold text-green-900">{inputs.manualRoofArea} m²</div>
                    </div>
                    <div>
                      <div className="text-green-600">Peak Sun:</div>
                      <div className="font-bold text-green-900">{inputs.manualSunHours} hrs/day</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-green-600 mt-2">Source: {solarData.source}</div>
                </div>
              )}
              
              <Button 
                onClick={handleSolarLookup} 
                disabled={fetchingSolar} 
                className="w-full flex items-center justify-center gap-2 shadow-sm bg-green-600 hover:bg-green-700 text-white"
              >
                {fetchingSolar ? 'Scanning...' : <><RefreshCw size={16}/> Scan Solar Potential</>}
              </Button>
            </div>
          </Card>

          {/* INPUTS CARD */}
          <Card className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Edit3 size={18} className="text-blue-500"/> Load Inputs
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Electric Showers" type="number" value={inputs.showers} onChange={(e) => setInputs({...inputs, showers: +e.target.value})} />
                <Input label="Occupants" type="number" value={inputs.people} onChange={(e) => setInputs({...inputs, people: +e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="AC Units" type="number" value={inputs.acCount} onChange={(e) => setInputs({...inputs, acCount: +e.target.value})} />
                <Input label="AC HP Each" type="number" step="0.5" value={inputs.acHorsePower} onChange={(e) => setInputs({...inputs, acHorsePower: +e.target.value})} />
              </div>
               
              <div className="border-t pt-3 mt-3">
                <label className="text-xs font-bold text-slate-600 mb-2 block">Solviva Product Type</label>
                <select 
                  value={inputs.solvivaProductType}
                  onChange={(e) => setInputs({...inputs, solvivaProductType: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded text-sm mb-3"
                >
                  <option value="hybrid">Hybrid (with battery)</option>
                  <option value="ready">Hybrid-Ready (no battery)</option>
                </select>

                <label className="text-xs font-bold text-slate-600 mb-2 block">Financing Term</label>
                <select 
                  value={inputs.solvivaFinancingTerm}
                  onChange={(e) => setInputs({...inputs, solvivaFinancingTerm: +e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded text-sm"
                >
                  <option value="12">12 months</option>
                  <option value="24">24 months</option>
                  <option value="36">36 months</option>
                  <option value="48">48 months</option>
                  <option value="60">60 months ✓ DB</option>
                </select>
                {/* Show which terms have live DB pricing */}
                <div className="text-[10px] text-slate-500 mt-1">
                  ✓ DB = live Firestore price • others use fallback table
                </div>
              </div>
               
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => setShowMath(!showMath)}
                  className="flex-1 text-xs text-blue-600 font-bold hover:underline flex items-center justify-center gap-1 border rounded bg-blue-50 py-2"
                >
                  <Calculator size={14}/> {showMath ? 'Hide' : 'Show'} Math
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: ANALYSIS & RESULTS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* ENGINEERING BREAKDOWN */}
          {showMath && (
            <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 text-sm">
              <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Calculator size={16}/> Detailed Engineering Calculations
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded border border-slate-200">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-2">1. Thermal Load</div>
                  <div className="flex justify-between border-b border-slate-100 py-1 text-xs"><span>Daily Usage:</span><span className="font-mono">{analysis.dailyLiters.toFixed(0)} L</span></div>
                  <div className="flex justify-between border-b border-slate-100 py-1 text-xs"><span>Delta T:</span><span className="font-mono">{inputs.targetTemp - inputs.inletTemp}°C</span></div>
                  <div className="flex justify-between border-b border-slate-100 py-1 text-xs"><span>Energy:</span><span className="font-mono">{analysis.dailyThermalKWh.toFixed(1)} kWh</span></div>
                  <div className="flex justify-between py-1 font-bold text-blue-600 text-xs"><span>Req. KW:</span><span className="font-mono">{analysis.requiredRecoveryKW.toFixed(1)} kW</span></div>
                </div>
                <div className="bg-white p-3 rounded border border-slate-200">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-2">2. Heat Pump</div>
                  <div className="flex justify-between border-b border-slate-100 py-1 text-xs"><span>Model:</span><span className="font-mono text-[10px] truncate max-w-[100px]">{analysis.selectedKarnot.name}</span></div>
                  <div className="flex justify-between border-b border-slate-100 py-1 text-xs"><span>Output:</span><span className="font-mono">{analysis.selectedKarnot.kW_DHW_Nominal || analysis.selectedKarnot.kW || 3.5} kW</span></div>
                  <div className="flex justify-between border-b border-slate-100 py-1 text-xs"><span>COP:</span><span className="font-mono">{analysis.selectedKarnot.cop || 4.2}</span></div>
                  <div className="flex justify-between py-1 font-bold text-orange-600 text-xs"><span>Input:</span><span className="font-mono">{analysis.hpInputKW.toFixed(2)} kW</span></div>
                </div>
                <div className="bg-white p-3 rounded border border-slate-200">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-2">3. Solar Systems</div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-[10px] text-red-500 font-bold">SOLAR ONLY</div>
                      <div className="flex justify-between font-mono text-xs"><span>Load:</span><span>{analysis.peakLoad_A.toFixed(1)} kW</span></div>
                      <div className="flex justify-between font-mono text-xs font-bold"><span>System:</span><span>{analysis.systemSize_A} kWp</span></div>
                    </div>
                    <div className="border-t border-slate-100 pt-1">
                      <div className="text-[10px] text-green-600 font-bold">PARTNER</div>
                      <div className="flex justify-between font-mono text-xs"><span>Load:</span><span>{analysis.peakLoad_B.toFixed(1)} kW</span></div>
                      <div className="flex justify-between font-mono text-xs font-bold"><span>System:</span><span>{analysis.systemSize_B} kWp</span></div>
                    </div>
                  </div>
                  {/* Pricing source indicator in math panel */}
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Pricing Source</div>
                    <div className={`text-[10px] font-mono ${pricingSource.dbCount > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                      {inputs.solvivaFinancingTerm === 60 && pricingSource.dbCount > 0 
                        ? '✓ Live DB price' 
                        : '⚠ Fallback table'}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      A: ₱{analysis.monthlyPayment_SolarOnly_PHP.toLocaleString()}/mo<br/>
                      B: ₱{analysis.monthlyPayment_Solar_PHP.toLocaleString()}/mo
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPARISON CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-xl border-2 border-red-500 bg-red-50">
              <div className="flex justify-between mb-4">
                <h3 className="font-bold text-slate-700">Scenario A: Solar Only</h3>
                <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">High Load</span>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-slate-500 font-bold">Required System</p>
                  <p className="text-2xl font-bold text-red-600">{analysis.systemSize_A} kWp</p>
                  <p className="text-xs text-slate-600 mt-1"><Flame size={12} className="inline"/> {analysis.showerPeakKW.toFixed(1)} kW shower spike</p>
                  <p className="text-xs text-slate-500 mt-1">{analysis.panelsA}× Solar Panels</p>
                </div>
                <div className="pt-4 border-t border-red-200">
                  <p className="text-xs uppercase text-slate-500 font-bold">Monthly Payment</p>
                  <p className="text-2xl font-bold text-slate-800">₱{analysis.monthlyPayment_SolarOnly_PHP.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500">{inputs.solvivaFinancingTerm} months • CAPEX: ${analysis.costA.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl border-2 border-green-500 bg-green-50">
              <div className="flex justify-between mb-4">
                <h3 className="font-bold text-green-800">Scenario B: Partner Model</h3>
                <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">Optimized</span>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-green-700 font-bold">Optimized System</p>
                  <p className="text-2xl font-bold text-green-700">{analysis.systemSize_B} kWp + HP</p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><CheckCircle size={12}/> {((1 - analysis.peakLoad_B/analysis.peakLoad_A) * 100).toFixed(0)}% load reduction</p>
                  <p className="text-xs text-green-600 flex items-center gap-1"><ArrowRight size={12}/> Saved {analysis.panelsSaved} panels</p>
                </div>
                <div className="pt-4 border-t border-green-200">
                  <p className="text-xs uppercase text-green-700 font-bold">Monthly Payment</p>
                  <p className="text-2xl font-bold text-green-900">₱{analysis.monthlyPayment_Partner_Total_PHP.toLocaleString()}</p>
                  <p className="text-[10px] text-green-700">Solar: ₱{analysis.monthlyPayment_Solar_PHP.toLocaleString()} + HP: ₱{analysis.monthlyPayment_HeatPump_PHP.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* MONTHLY PAYMENT COMPARISON */}
          <div className="bg-white rounded-xl border-2 border-orange-200 p-6">
            <h3 className="font-bold text-orange-900 mb-4 flex items-center gap-2">
              <DollarSign size={18}/> Monthly Payment Breakdown
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 border-2 border-red-300 p-4 rounded-lg">
                <div className="text-sm font-bold mb-3 text-red-900">Solar Only</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">Solviva Payment:</span><span className="font-bold">₱{analysis.monthlyPayment_SolarOnly_PHP.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Grid Bill:</span><span className="font-bold">₱{analysis.residualBill_SolarOnly.toLocaleString()}</span></div>
                  <div className="border-t-2 border-red-300 pt-2 mt-2">
                    <div className="flex justify-between"><span className="font-bold text-red-900">Total/Month:</span><span className="font-bold text-xl text-red-900">₱{analysis.netMonthlyCost_SolarOnly.toLocaleString()}</span></div>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 border-2 border-green-500 p-4 rounded-lg">
                <div className="text-sm font-bold mb-3 text-green-900">Partner Model</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">Solar Payment:</span><span className="font-bold">₱{analysis.monthlyPayment_Solar_PHP.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Heat Pump:</span><span className="font-bold">₱{analysis.monthlyPayment_HeatPump_PHP.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Grid Bill:</span><span className="font-bold">₱{analysis.residualBill_Partner.toLocaleString()}</span></div>
                  <div className="border-t-2 border-green-500 pt-2 mt-2">
                    <div className="flex justify-between"><span className="font-bold text-green-900">Total/Month:</span><span className="font-bold text-xl text-green-900">₱{analysis.netMonthlyCost_Partner.toLocaleString()}</span></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border-2 border-yellow-400 p-4 mt-4 rounded-lg text-center">
              <div className="text-sm text-yellow-800 mb-1">Customer Monthly Advantage</div>
              <div className="text-3xl font-bold text-yellow-900">₱{analysis.monthlyAdvantage_Customer.toLocaleString()}/month</div>
              <div className="text-xs text-yellow-700 mt-1">Partner model saves money every month vs solar-only</div>
            </div>
          </div>
         
          {/* CUSTOMER BENEFITS */}
          <div className="bg-white rounded-xl border-2 border-blue-200 overflow-hidden">
            <button
              onClick={() => setShowCustomerBenefits(!showCustomerBenefits)}
              className="w-full bg-blue-50 p-4 flex justify-between items-center hover:bg-blue-100 transition-colors"
            >
              <h3 className="font-bold text-blue-900 flex items-center gap-2"><Target size={18}/> Customer Value Proposition</h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-blue-600">₱{(analysis.fiveYearTotalSavings * 58 / 1000).toFixed(0)}K</span>
                <span className="text-xs text-blue-600">5-yr savings</span>
              </div>
            </button>
            {showCustomerBenefits && (
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border-2 border-slate-200">
                  <h4 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2"><Calculator size={16}/> Detailed Financial Calculations</h4>
                  
                  <div className="bg-white p-3 rounded-lg mb-3">
                    <div className="text-xs font-bold text-orange-600 mb-2">HEAT PUMP FINANCING</div>
                    <div className="space-y-1 text-xs font-mono">
                      <div className="flex justify-between"><span>Heat Pump ({analysis.selectedKarnot.name}):</span><span className="font-bold">${analysis.costKarnot.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>External Tank ({analysis.externalTankNeeded}L @ $2.50/L):</span><span className="font-bold">${analysis.externalTankCost.toLocaleString()}</span></div>
                      {analysis.externalTankNeeded > 0 && (
                        <div className="text-[9px] text-amber-600 bg-amber-50 p-1 rounded mt-1">⚠️ Tank sizing is conservative. Actual requirement may be lower.</div>
                      )}
                      <div className="flex justify-between"><span>Installation:</span><span className="font-bold">${analysis.installationCost.toLocaleString()}</span></div>
                      <div className="flex justify-between border-t pt-1 mt-1"><span className="font-bold">Total:</span><span className="font-bold text-orange-600">${(analysis.costKarnot + analysis.externalTankCost + analysis.installationCost).toLocaleString()}</span></div>
                      <div className="flex justify-between text-[10px] text-slate-500 mt-2"><span>Financing: {inputs.solvivaFinancingTerm} months @ 9% APR</span><span className="font-bold">₱{analysis.monthlyPayment_HeatPump_PHP.toLocaleString()}/mo</span></div>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg mb-3">
                    <div className="text-xs font-bold text-blue-600 mb-2">
                      SOLVIVA SOLAR PACKAGES ({inputs.solvivaFinancingTerm} months
                      {inputs.solvivaFinancingTerm === 60 && pricingSource.dbCount > 0 ? ' · ✓ Live DB' : ' · fallback'})
                    </div>
                    <div className="space-y-1 text-xs font-mono">
                      <div className="flex justify-between"><span>Solar Only ({analysis.systemSize_A} kWp):</span><span className="font-bold text-red-600">₱{analysis.monthlyPayment_SolarOnly_PHP.toLocaleString()}/mo</span></div>
                      <div className="flex justify-between"><span>Partner Solar ({analysis.systemSize_B} kWp):</span><span className="font-bold text-green-600">₱{analysis.monthlyPayment_Solar_PHP.toLocaleString()}/mo</span></div>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-xs font-bold text-purple-600 mb-2">TOTAL MONTHLY COSTS</div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="bg-red-50 p-2 rounded"><div className="font-bold text-red-600 mb-1">Solar Only</div><div className="space-y-0.5"><div className="flex justify-between"><span>Solviva:</span><span>₱{analysis.monthlyPayment_SolarOnly_PHP.toLocaleString()}</span></div><div className="flex justify-between"><span>Grid:</span><span>₱{analysis.residualBill_SolarOnly.toLocaleString()}</span></div><div className="flex justify-between border-t pt-0.5 font-bold"><span>Total:</span><span>₱{analysis.netMonthlyCost_SolarOnly.toLocaleString()}</span></div></div></div>
                      <div className="bg-green-50 p-2 rounded"><div className="font-bold text-green-600 mb-1">Partner Model</div><div className="space-y-0.5"><div className="flex justify-between"><span>Solar:</span><span>₱{analysis.monthlyPayment_Solar_PHP.toLocaleString()}</span></div><div className="flex justify-between"><span>Heat Pump:</span><span>₱{analysis.monthlyPayment_HeatPump_PHP.toLocaleString()}</span></div><div className="flex justify-between"><span>Grid:</span><span>₱{analysis.residualBill_Partner.toLocaleString()}</span></div><div className="flex justify-between border-t pt-0.5 font-bold"><span>Total:</span><span>₱{analysis.netMonthlyCost_Partner.toLocaleString()}</span></div></div></div>
                    </div>
                    <div className="mt-2 p-2 bg-yellow-50 rounded text-center"><div className="text-[10px] text-yellow-700">Monthly Savings</div><div className="text-lg font-bold text-yellow-900">₱{analysis.monthlyAdvantage_Customer.toLocaleString()}</div></div>
                  </div>

                  <div className="bg-white p-3 rounded-lg mt-3">
                    <div className="text-xs font-bold text-indigo-600 mb-2">5-YEAR VALUE</div>
                    <div className="space-y-1 text-xs font-mono">
                      <div className="flex justify-between"><span>CAPEX Savings:</span><span>₱{(analysis.capexSavings * 58).toLocaleString()}</span></div>
                      <div className="text-[10px] text-slate-500 pl-4">Solar A: ${analysis.costA.toLocaleString()} vs B: ${analysis.costB_Total.toLocaleString()}</div>
                      <div className="flex justify-between mt-1"><span>Fuel Savings (5yr):</span><span>₱{analysis.fiveYearFuelSavings.toLocaleString()}</span></div>
                      <div className="text-[10px] text-slate-500 pl-4">₱{analysis.annualFuelSavings.toLocaleString()}/yr × 5</div>
                      <div className="flex justify-between mt-1"><span>Solar Value (5yr):</span><span>₱{analysis.fiveYearSolarValue.toLocaleString()}</span></div>
                      <div className="text-[10px] text-slate-500 pl-4">{analysis.annualGenB_kWh.toLocaleString()} kWh/yr × ₱{inputs.electricityRate} × 5</div>
                      <div className="flex justify-between border-t-2 pt-1 mt-2 font-bold text-indigo-900"><span>TOTAL:</span><span className="text-lg">₱{((analysis.capexSavings * 58) + analysis.fiveYearFuelSavings + analysis.fiveYearSolarValue).toLocaleString()}</span></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                    <div className="text-xs text-green-700 mb-1">CAPEX Advantage</div>
                    <div className="text-xl font-bold text-green-900">₱{(analysis.capexSavings * 58 / 1000).toFixed(0)}K</div>
                    <div className="text-xs text-green-600">Lower upfront cost</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
                    <div className="text-xs text-yellow-700 mb-1">Fuel Savings</div>
                    <div className="text-xl font-bold text-yellow-900">₱{(analysis.fiveYearFuelSavings / 1000).toFixed(0)}K</div>
                    <div className="text-xs text-yellow-600">5 years vs {inputs.currentHeating}</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                    <div className="text-xs text-orange-700 mb-1">Solar Value</div>
                    <div className="text-xl font-bold text-orange-900">₱{(analysis.fiveYearSolarValue / 1000).toFixed(0)}K</div>
                    <div className="text-xs text-orange-600">Electricity offset</div>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-bold text-slate-700 mb-3 text-sm">Key Benefits:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2"><CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0"/><span><strong>Lower Upfront Cost:</strong> Save ${analysis.capexSavings.toLocaleString()} vs solar-only solution</span></li>
                    <li className="flex items-start gap-2"><CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0"/><span><strong>Positive Cash Flow:</strong> Save ₱{analysis.monthlyAdvantage_Customer.toLocaleString()}/month vs solar-only</span></li>
                    <li className="flex items-start gap-2"><CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0"/><span><strong>Fast Payback:</strong> {analysis.simplePayback.toFixed(1)} year simple payback period</span></li>
                    <li className="flex items-start gap-2"><CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0"/><span><strong>Premium Comfort:</strong> Unlimited hot water vs electric shower limitations</span></li>
                    <li className="flex items-start gap-2"><CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0"/><span><strong>PFAS-Free:</strong> Clean R290 refrigerant (zero forever chemicals)</span></li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* SOLVIVA BENEFITS */}
          <div className="bg-white rounded-xl border-2 border-orange-200 overflow-hidden">
            <button
              onClick={() => setShowSolvivaBenefits(!showSolvivaBenefits)}
              className="w-full bg-orange-50 p-4 flex justify-between items-center hover:bg-orange-100 transition-colors"
            >
              <h3 className="font-bold text-orange-900 flex items-center gap-2"><Award size={18}/> Solviva Partnership Benefits</h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-orange-600">${analysis.totalPartnerRevenueUpfront.toLocaleString()}</span>
                <span className="text-xs text-orange-600">per deal</span>
              </div>
            </button>
            {showSolvivaBenefits && (
              <div className="p-6 space-y-4">
                <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg mb-4">
                  <h4 className="font-bold text-blue-900 mb-2 text-sm">💡 Key Insight</h4>
                  <p className="text-sm text-blue-800">This shows the <strong>EXTRA revenue</strong> Solviva earns by adding Karnot heat pumps to their solar deals. Solar-only = $0 extra revenue.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                    <div className="text-xs text-purple-700 mb-1">Heat Pump Sale</div>
                    <div className="text-xl font-bold text-purple-900">${analysis.heatPumpRevenue.toLocaleString()}</div>
                    <div className="text-xs text-purple-600">Incremental revenue</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                    <div className="text-xs text-orange-700 mb-1">Install + Service (Yr 1)</div>
                    <div className="text-xl font-bold text-orange-900">${(analysis.installationRevenue + analysis.annualServiceRevenue).toLocaleString()}</div>
                    <div className="text-xs text-orange-600">Ongoing revenue</div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-300">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-xs text-green-700 mb-1">Incremental Revenue (Upfront)</div>
                      <div className="text-2xl font-bold text-green-900">${analysis.totalPartnerRevenueUpfront.toLocaleString()}</div>
                      <div className="text-xs text-green-600">Extra per deal</div>
                    </div>
                    <div>
                      <div className="text-xs text-emerald-700 mb-1">5-Year Incremental</div>
                      <div className="text-2xl font-bold text-emerald-900">${analysis.totalPartnerRevenueFiveYear.toLocaleString()}</div>
                      <div className="text-xs text-emerald-600">Inc. service revenue</div>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-bold text-slate-700 mb-3 text-sm">Strategic Advantages:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2"><TrendingUp size={16} className="text-orange-600 mt-0.5 flex-shrink-0"/><span><strong>Additional Revenue Stream:</strong> Earn ${analysis.totalPartnerRevenueUpfront.toLocaleString()} extra per deal + ${analysis.fiveYearServiceRevenue.toLocaleString()} over 5 years</span></li>
                    <li className="flex items-start gap-2"><TrendingUp size={16} className="text-orange-600 mt-0.5 flex-shrink-0"/><span><strong>Easier Customer Acquisition:</strong> Lower monthly payment means more customers can afford your solution</span></li>
                    <li className="flex items-start gap-2"><TrendingUp size={16} className="text-orange-600 mt-0.5 flex-shrink-0"/><span><strong>Market Differentiation:</strong> Only solar company offering comprehensive energy solution</span></li>
                    <li className="flex items-start gap-2"><TrendingUp size={16} className="text-orange-600 mt-0.5 flex-shrink-0"/><span><strong>Reduced System Size:</strong> Sell smaller systems ({analysis.systemSize_B} vs {analysis.systemSize_A} kWp) at higher margins</span></li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* ACTIONS */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold mb-1">Ready to Present</h3>
              <p className="text-sm text-slate-300">Generate comprehensive PDF proposal with all financials</p>
            </div>
            <Button onClick={generatePDFReport} className="bg-orange-600 hover:bg-orange-700 text-white border-none text-lg px-6 py-3">
              <Download className="mr-2" size={20}/> Generate PDF
            </Button>
          </div>
        </div>
      </div>

      {/* FIXTURE MODAL */}
      {showFixtureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Estimate via Fixtures</h3>
              <button onClick={() => setShowFixtureModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>
            <div className="space-y-4">
              <Input label="Number of Showers" type="number" value={fixtureInputs.showers} onChange={handleFixtureChange('showers')} />
              <Input label="Number of Basins" type="number" value={fixtureInputs.basins} onChange={handleFixtureChange('basins')} />
              <Input label="Number of Sinks" type="number" value={fixtureInputs.sinks} onChange={handleFixtureChange('sinks')} />
              <Input label="Occupants" type="number" value={fixtureInputs.people} onChange={handleFixtureChange('people')} />
              <Input label="Operating Hours/Day" type="number" value={fixtureInputs.hours} onChange={handleFixtureChange('hours')} />
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowFixtureModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={applyFixtureCalculation} className="flex-1 bg-blue-600 hover:bg-blue-700">Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolvivaPartnerCalculator;
