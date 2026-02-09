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

// --- HELPER: ADDRESS SEARCH ---
const GeocoderControl = ({ address, onLocationFound }) => {
  const map = useMap();
  const geocodingLib = useMapsLibrary('geocoding');
  const [geocoder, setGeocoder] = useState(null);

  useEffect(() => {
    if (geocodingLib) {
      setGeocoder(new geocodingLib.Geocoder());
    }
  }, [geocodingLib]);

  const handleSearch = () => {
    if (!geocoder || !map || !address) return;

    geocoder.geocode({ address: address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        const newLat = location.lat();
        const newLng = location.lng();
        
        map.panTo({ lat: newLat, lng: newLng });
        map.setZoom(19);
        onLocationFound(newLat, newLng);
      } else {
        alert("Location not found. Try a different address format.");
      }
    });
  };

  return (
    <Button onClick={handleSearch} className="absolute right-1 top-1 h-8 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow-md z-10 flex items-center gap-1">
      <Search size={14}/> Find
    </Button>
  );
};

// --- HELPER: MAP CENTER UPDATE ---
const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo({ lat, lng });
    }
  }, [map, lat, lng]);
  return null;
};

// --- HELPER: DRAG EVENT LISTENER ---
const MapEvents = ({ onDragEnd }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('idle', () => {
      const center = map.getCenter();
      if (center) {
        onDragEnd(center.lat(), center.lng());
      }
    });
    return () => google.maps.event.removeListener(listener);
  }, [map, onDragEnd]);
  return null;
};


const SolvivaPartnerCalculator = () => {
  // === STATE ===
  const [solvivaProducts, setSolvivaProducts] = useState([]);
  const [karnotProducts, setKarnotProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMath, setShowMath] = useState(false);
  const [showFixtureModal, setShowFixtureModal] = useState(false);
  const [showCustomerBenefits, setShowCustomerBenefits] = useState(true);
  const [showSolvivaBenefits, setShowSolvivaBenefits] = useState(true);
  
  // Google Solar Data
  const [coordinates, setCoordinates] = useState({ lat: 16.023497, lng: 120.430082 }); 
  const [addressSearch, setAddressSearch] = useState("Cosmos Farm, Pangasinan"); 
  const [solarData, setSolarData] = useState(null);
  const [fetchingSolar, setFetchingSolar] = useState(false);
  
  // Inputs
  const [inputs, setInputs] = useState({
    // Water Heating Demand
    showers: 3,
    people: 4,
    showerPowerKW: 3.5,
    
    // Cooling Load
    acCount: 3,
    acHorsePower: 1.5, 
    acHoursNight: 8,
    
    // Base Load
    baseLoadKW: 0.5,
    
    // Current Heating Method (for cost comparison)
    currentHeating: 'electric', // 'electric', 'lpg', 'diesel'
    
    // Financials
    electricityRate: 12.50, // PHP per kWh
    lpgPrice: 1100,  // PHP per 11kg tank
    lpgSize: 11,     // kg
    dieselPrice: 60, // PHP per liter
    
    // Financing
    downPayment: 20, // %
    interestRate: 8, // % annual
    loanTermYears: 5,

    // Manual Override Defaults (Solar)
    manualRoofArea: 100, 
    manualSunHours: 5.5,
    
    // Engineering Physics
    inletTemp: 25,
    targetTemp: 55,
    panelWattage: 550,
    recoveryHours: 10,
    
    // Cost Assumptions
    externalTankCostPerLiter: 2.5, // USD per liter
    installationCostPerUnit: 600, // USD per heat pump installation
    annualServicePerUnit: 172, // USD per unit per year (Luzon rate)
  });

  const [fixtureInputs, setFixtureInputs] = useState({ 
    showers: 0, basins: 0, sinks: 0, people: 0, hours: 8 
  });

  // === 1. LOAD DATA (FETCH BOTH CATALOGS) ===
  useEffect(() => {
    const loadData = async () => {
      const user = getAuth().currentUser;
      if (!user) return;
      
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'products'));
        const allProds = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Filter 1: Solviva Solar Kits
        const competitors = allProds
          .filter(p => p.category === 'Competitor Solar')
          .sort((a, b) => (a.kW_Cooling_Nominal || 0) - (b.kW_Cooling_Nominal || 0));
          
        // Filter 2: Karnot Heat Pumps
        const heatPumps = allProds
          .filter(p => {
             const cat = (p.category || '').toLowerCase();
             const name = (p.name || '').toLowerCase();
             return (cat.includes('heat pump') || cat.includes('heater') || name.includes('aquahero')) && !name.includes('ivolt');
          })
          .sort((a, b) => (a.kW_DHW_Nominal || 0) - (b.kW_DHW_Nominal || 0));

        setSolvivaProducts(competitors);
        setKarnotProducts(heatPumps);
      } catch (err) {
        console.error("Error loading products:", err);
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

      setInputs(prev => ({
        ...prev,
        manualRoofArea: newArea,
        manualSunHours: newSun
      }));
    } else {
      console.warn("No Solar Data Found.");
    }
    setFetchingSolar(false);
  };

  const getStaticMapUrl = () => {
    const key = import.meta.env.VITE_GOOGLE_SOLAR_KEY;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${coordinates.lat},${coordinates.lng}&zoom=20&size=600x400&maptype=satellite&key=${key}`;
  };

  const handleMapIdle = useCallback((lat, lng) => {
    setCoordinates({ lat, lng });
  }, []);

  const handleAddressFound = useCallback((lat, lng) => {
    setCoordinates({ lat, lng });
  }, []);

  // === FIXTURE CALCULATOR HANDLERS ===
  const handleFixtureChange = (field) => (e) => {
    setFixtureInputs(prev => ({ ...prev, [field]: parseInt(e.target.value) || 0 }));
  };

  const applyFixtureCalculation = () => {
    const liters = calculateFixtureDemand(fixtureInputs);
    setInputs(prev => ({
      ...prev,
      people: fixtureInputs.people || prev.people,
    }));
    setShowFixtureModal(false);
  };

  // === 3. COMPREHENSIVE ANALYSIS LOGIC ===
  const analysis = useMemo(() => {
    // --- STEP A: SIZE THE THERMAL LOAD ---
    const dailyLiters = (inputs.people * 50) + (inputs.showers * 60);
    
    const deltaT = inputs.targetTemp - inputs.inletTemp;
    const dailyThermalKWh = (dailyLiters * deltaT * 1.163) / 1000;
    
    const requiredRecoveryKW = dailyThermalKWh / inputs.recoveryHours;

    // --- STEP B: SELECT THE MACHINE ---
    // Find the smallest Karnot unit that meets the required Recovery KW
    let selectedKarnot = karnotProducts.find(p => (p.kW_DHW_Nominal || p.kW || 0) >= requiredRecoveryKW);
    
    // If no product meets requirement, use the largest available
    if (!selectedKarnot && karnotProducts.length > 0) {
      selectedKarnot = karnotProducts[karnotProducts.length - 1];
    }
    
    // If still no products (empty database), show error state
    if (!selectedKarnot) {
      return {
        error: true,
        message: "No Karnot heat pump products found in database. Please add products in Product Manager.",
        dailyLiters, 
        dailyThermalKWh, 
        requiredRecoveryKW
      };
    }

    // --- STEP C: TANK MATH ---
    const requiredTotalVolume = Math.ceil(dailyLiters / 100) * 100;
    
    let integratedTankVolume = selectedKarnot.tankVolume || 0;
    if (!integratedTankVolume) {
        if (selectedKarnot.name?.includes("200")) integratedTankVolume = 200;
        else if (selectedKarnot.name?.includes("300")) integratedTankVolume = 300;
    }
    
    const externalTankNeeded = Math.max(0, requiredTotalVolume - integratedTankVolume);
    const externalTankCost = externalTankNeeded * inputs.externalTankCostPerLiter;

    // --- STEP D: ELECTRICAL LOADS (SCENARIO A vs B) ---
    const kwPerHP = 0.85; 
    const acTotalKW = inputs.acCount * inputs.acHorsePower * kwPerHP;
    
    // Scenario A: Solar Only (Must support Electric Showers)
    const showerPeakKW = inputs.showers * inputs.showerPowerKW;
    const peakLoad_A = inputs.baseLoadKW + acTotalKW + showerPeakKW; 
    
    // Scenario B: Partner Model (Showers replaced by Heat Pump)
    const hpInputKW = (selectedKarnot.kW_DHW_Nominal || 3.5) / (selectedKarnot.cop || 4.2);
    const peakLoad_B = inputs.baseLoadKW + acTotalKW + hpInputKW;         
    
    // --- STEP E: SELECT SOLVIVA SYSTEMS ---
    const targetInverterA = peakLoad_A * 1.2;
    const targetInverterB = peakLoad_B * 1.2;

    let planA = solvivaProducts.find(p => (p.kW_Cooling_Nominal || 0) >= targetInverterA);
    if (!planA && solvivaProducts.length > 0) {
      planA = solvivaProducts[solvivaProducts.length - 1]; // Use largest if none fit
    }
    if (!planA) {
      return {
        error: true,
        message: "No Solviva solar products found in database. Please add Competitor Solar products in Product Manager.",
        dailyLiters,
        dailyThermalKWh,
        selectedKarnot
      };
    }
               
    let planB = solvivaProducts.find(p => (p.kW_Cooling_Nominal || 0) >= targetInverterB);
    if (!planB && solvivaProducts.length > 0) {
      planB = solvivaProducts[0]; // Use smallest available
    }
    if (!planB) {
      planB = planA; // Fallback to planA if nothing else available
    }

    // --- STEP F: PANEL COUNTS ---
    const panelsA = Math.ceil((planA?.kW_Cooling_Nominal || 0) * 1000 / inputs.panelWattage);
    const panelsB = Math.ceil((planB?.kW_Cooling_Nominal || 0) * 1000 / inputs.panelWattage);
    const panelsSaved = Math.max(0, panelsA - panelsB);

    // --- STEP G: TOTAL PROJECT COSTS ---
    const costA = planA?.salesPriceUSD || 0;
    const costB_Solar = planB?.salesPriceUSD || 0;
    const costKarnot = selectedKarnot.salesPriceUSD || 0;
    const installationCost = inputs.installationCostPerUnit;
    const costB_Total = costB_Solar + costKarnot + externalTankCost + installationCost;
    
    // CAPEX Comparison
    const capexSavings = costA - costB_Total;
    
    // --- STEP H: FUEL COST COMPARISONS (CURRENT vs HEAT PUMP) ---
    // Calculate current annual fuel cost in PHP
    let currentAnnualFuelCost = 0;
    
    if (inputs.currentHeating === 'electric') {
      // Electric shower: 3.5kW × 10 min (0.167 hrs) per shower
      const showerEnergyPerUse = inputs.showerPowerKW * 0.167;
      const dailyShowerKWh = showerEnergyPerUse * inputs.showers;
      const annualShowerKWh = dailyShowerKWh * 365;
      currentAnnualFuelCost = annualShowerKWh * inputs.electricityRate; // PHP
    } else if (inputs.currentHeating === 'lpg') {
      // LPG: ~13.6 kWh per kg, efficiency ~80%
      const kWhPerKg = 13.6 * 0.80;
      const kgNeededDaily = dailyThermalKWh / kWhPerKg;
      const kgNeededAnnual = kgNeededDaily * 365;
      const tanksNeededAnnual = kgNeededAnnual / inputs.lpgSize;
      currentAnnualFuelCost = tanksNeededAnnual * inputs.lpgPrice; // PHP
    } else if (inputs.currentHeating === 'diesel') {
      // Diesel: ~10 kWh per liter, efficiency ~85%
      const kWhPerLiter = 10 * 0.85;
      const litersDaily = dailyThermalKWh / kWhPerLiter;
      const litersAnnual = litersDaily * 365;
      currentAnnualFuelCost = litersAnnual * inputs.dieselPrice; // PHP
    }
    
    // 2. Heat Pump Annual Operating Cost (electricity only)
    const hpDailyKWh = dailyThermalKWh / (selectedKarnot.cop || 4.2);
    const hpMonthlyKWh = hpDailyKWh * 30;
    const hpAnnualKWh = hpDailyKWh * 365;
    
    // Solar covers heat pump during daylight hours (~70% of demand)
    // Remaining 30% comes from grid
    const solarCoveragePercent = 0.70;
    const gridKWh = hpAnnualKWh * (1 - solarCoveragePercent);
    const hpAnnualCost = gridKWh * inputs.electricityRate; // PHP
    
    // Fuel Savings = What you SAVE by switching from electric/LPG to heat pump
    const annualFuelSavings = currentAnnualFuelCost - hpAnnualCost; // PHP
    const fiveYearFuelSavings = annualFuelSavings * 5;
    
    // --- STEP I: SOLAR GENERATION VALUE ---
    // This is the value of electricity the solar system produces
    // All household loads (AC + base + heat pump) use solar during day
    const totalDailyLoad = (inputs.baseLoadKW + acTotalKW) * inputs.acHoursNight / 24; // Average daily usage
    const heatPumpLoad = hpDailyKWh;
    const totalDailyKWh = (totalDailyLoad * 24) + heatPumpLoad;
    
    // Solar generation per month (kW × sun hours × days)
    const monthlyGenB_kWh = (planB?.kW_Cooling_Nominal || 0) * inputs.manualSunHours * 30;
    const annualGenB_kWh = monthlyGenB_kWh * 12;
    
    // Solar value = amount of grid electricity REPLACED by solar
    const solarOffsetKWh = Math.min(annualGenB_kWh, totalDailyKWh * 365); // Can't offset more than you use
    const annualSolarValue = solarOffsetKWh * inputs.electricityRate; // PHP
    const fiveYearSolarValue = annualSolarValue * 5;
    
    // --- STEP J: TOTAL VALUE PROPOSITION ---
    // CAPEX savings (USD) + Operating savings (PHP converted to USD)
    const fiveYearOperatingSavings = (fiveYearFuelSavings + fiveYearSolarValue) / 58; // Convert PHP to USD
    const fiveYearTotalSavings = capexSavings + fiveYearOperatingSavings;
    
    // --- STEP K: FINANCING CALCULATIONS ---
    const downPaymentAmount = costB_Total * (inputs.downPayment / 100);
    const loanAmount = costB_Total - downPaymentAmount;
    const monthlyRate = inputs.interestRate / 100 / 12;
    const numPayments = inputs.loanTermYears * 12;
    const monthlyPayment = loanAmount > 0 
      ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0;
    
    // Monthly savings in PHP
    const monthlySavings = (annualFuelSavings + annualSolarValue) / 12;
    // Monthly payment in PHP (convert from USD)
    const monthlyPaymentPHP = monthlyPayment * 58;
    const netMonthlyCashFlow = monthlySavings - monthlyPaymentPHP;
    
    // Simple Payback (in years)
    const totalAnnualSavings = annualFuelSavings + annualSolarValue; // PHP
    const totalSystemCostPHP = costB_Total * 58; // Convert USD to PHP
    const simplePayback = totalAnnualSavings > 0 ? totalSystemCostPHP / totalAnnualSavings : 999;

    // --- STEP L: SOLVIVA BUSINESS METRICS ---
    // Using actual database pricing
    const karnotCostPrice = selectedKarnot.costPriceUSD || (costKarnot * 0.67); // Fallback to 67% if cost not in DB
    
    const solvivaUnitMargin = (costB_Solar * 0.35); // Assume 35% margin on solar kit
    const karnotCommission = costKarnot * 0.15; // 15% commission on Karnot sales price
    const installationRevenue = installationCost * 0.20; // 20% margin on installation coordination
    const annualServiceRevenue = inputs.annualServicePerUnit; // Annual service contract revenue
    const fiveYearServiceRevenue = annualServiceRevenue * 5;
    
    const totalPartnerRevenueUpfront = solvivaUnitMargin + karnotCommission + installationRevenue;
    const totalPartnerRevenueFiveYear = totalPartnerRevenueUpfront + fiveYearServiceRevenue;
    const revenueIncrease = costA > 0 ? ((totalPartnerRevenueUpfront) / (costA * 0.35) - 1) * 100 : 0;

    return {
      // Thermal
      dailyLiters, 
      dailyThermalKWh, 
      requiredRecoveryKW,
      // Machine
      selectedKarnot, 
      hpInputKW,
      hpDailyKWh,
      hpMonthlyKWh,
      hpAnnualKWh,
      // Tank
      requiredTotalVolume, 
      integratedTankVolume, 
      externalTankNeeded,
      externalTankCost,
      // Electrical
      peakLoad_A, 
      peakLoad_B,
      showerPeakKW,
      // Solar
      planA, 
      planB, 
      panelsA, 
      panelsB, 
      panelsSaved,
      // Costs
      costA, 
      costB_Total, 
      costKarnot,
      installationCost,
      capexSavings,
      // Fuel Economics
      currentAnnualFuelCost,
      hpAnnualCost,
      annualFuelSavings,
      fiveYearFuelSavings,
      // Solar Value
      monthlyGenB_kWh,
      annualGenB_kWh,
      solarOffsetKWh,
      annualSolarValue,
      fiveYearSolarValue,
      // Total Value
      fiveYearOperatingSavings,
      fiveYearTotalSavings,
      // Financing
      downPaymentAmount,
      loanAmount,
      monthlyPayment,
      monthlyPaymentPHP,
      monthlySavings,
      netMonthlyCashFlow,
      simplePayback,
      // Solviva Metrics
      solvivaUnitMargin,
      karnotCommission,
      installationRevenue,
      annualServiceRevenue,
      fiveYearServiceRevenue,
      totalPartnerRevenueUpfront,
      totalPartnerRevenueFiveYear,
      revenueIncrease
    };
  }, [inputs, solvivaProducts, karnotProducts]); 

  // === 4. ENHANCED PDF GENERATOR ===
  const generatePDFReport = () => {
    const mapImgUrl = getStaticMapUrl();
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
          <div>
            <div style="color: #64748b;">Available Roof Area:</div>
            <div style="font-weight: bold; font-size: 14px;">${inputs.manualRoofArea} m²</div>
          </div>
          <div>
            <div style="color: #64748b;">Peak Sun Hours:</div>
            <div style="font-weight: bold; font-size: 14px;">${inputs.manualSunHours} hrs/day</div>
          </div>
          <div>
            <div style="color: #64748b;">Data Source:</div>
            <div style="font-weight: bold; font-size: 14px;">${solarData.source}</div>
          </div>
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
          <div style="font-size: 10px; margin-bottom: 4px;"><strong>${analysis.planA?.name}</strong></div>
          <div style="font-size: 10px; margin-bottom: 4px;">Peak Load: <strong>${analysis.peakLoad_A.toFixed(1)} kW</strong></div>
          <div style="font-size: 10px; margin-bottom: 10px;">Solar Panels: <strong>${analysis.panelsA} × 550W</strong></div>
          <div style="font-size: 20px; font-weight: bold; color: #dc3545;">$${analysis.costA.toLocaleString()}</div>
        </div>

        <div style="background: #f0fff4; padding: 12px; border-radius: 6px; border: 2px solid #28a745;">
          <div style="font-size: 14px; font-weight: bold; color: #28a745; margin-bottom: 8px;">Scenario B: Optimized Partner Model</div>
          <div style="font-size: 10px; margin-bottom: 4px;"><strong>${analysis.planB?.name}</strong> + ${analysis.selectedKarnot.name}</div>
          <div style="font-size: 10px; margin-bottom: 4px;">Peak Load: <strong>${analysis.peakLoad_B.toFixed(1)} kW</strong> (${((1 - analysis.peakLoad_B/analysis.peakLoad_A) * 100).toFixed(0)}% reduction)</div>
          <div style="font-size: 10px; margin-bottom: 10px;">Solar Panels: <strong>${analysis.panelsB} × 550W</strong> (Saved ${analysis.panelsSaved})</div>
          <div style="font-size: 20px; font-weight: bold; color: #28a745;">$${analysis.costB_Total.toLocaleString()}</div>
          <div style="font-size: 9px; color: #28a745; margin-top: 4px;">CAPEX Savings: <strong>$${analysis.capexSavings.toLocaleString()}</strong></div>
        </div>
      </div>

      <div style="background: #1e293b; color: white; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
        <h3 style="font-size: 12px; font-weight: bold; margin-bottom: 10px; color: #94a3b8;">5-Year Financial Impact (Customer)</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; font-size: 10px;">
          <div>
            <div style="color: #94a3b8; margin-bottom: 3px;">CAPEX Savings</div>
            <div style="font-size: 16px; font-weight: bold;">₱${(analysis.capexSavings * 58).toLocaleString()}</div>
          </div>
          <div>
            <div style="color: #94a3b8; margin-bottom: 3px;">Fuel Savings</div>
            <div style="font-size: 16px; font-weight: bold; color: #fbbf24;">₱${(analysis.fiveYearFuelSavings * 58).toLocaleString()}</div>
          </div>
          <div>
            <div style="color: #94a3b8; margin-bottom: 3px;">Solar Value</div>
            <div style="font-size: 16px; font-weight: bold; color: #fbbf24;">₱${(analysis.fiveYearSolarValue * 58).toLocaleString()}</div>
          </div>
          <div style="text-align: right;">
            <div style="color: #94a3b8; margin-bottom: 3px;">Total Benefit</div>
            <div style="font-size: 20px; font-weight: bold; color: #10b981;">₱${(analysis.fiveYearTotalSavings * 58).toLocaleString()}</div>
          </div>
        </div>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #475569; font-size: 10px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
            <div>
              <div style="color: #94a3b8;">Monthly Savings:</div>
              <div style="font-weight: bold;">₱${(analysis.monthlySavings * 58).toLocaleString()}</div>
            </div>
            <div>
              <div style="color: #94a3b8;">Simple Payback:</div>
              <div style="font-weight: bold;">${analysis.simplePayback.toFixed(1)} years</div>
            </div>
            <div>
              <div style="color: #94a3b8;">Net Cash Flow:</div>
              <div style="font-weight: bold; color: ${analysis.netMonthlyCashFlow > 0 ? '#10b981' : '#fbbf24'}">₱${(analysis.netMonthlyCashFlow * 58).toLocaleString()}/mo</div>
            </div>
          </div>
        </div>
      </div>

      <div style="background: #fffbeb; padding: 15px; border-radius: 6px; border: 2px solid #f59e0b;">
        <h3 style="font-size: 12px; font-weight: bold; margin-bottom: 10px; color: #92400e;">Solviva Partnership Benefits</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 10px;">
          <div>
            <div style="color: #78350f;">Solar Kit Margin:</div>
            <div style="font-weight: bold; font-size: 14px;">$${analysis.solvivaUnitMargin.toLocaleString()}</div>
          </div>
          <div>
            <div style="color: #78350f;">Karnot Referral:</div>
            <div style="font-weight: bold; font-size: 14px;">$${analysis.karnotCommission.toLocaleString()}</div>
          </div>
          <div style="text-align: right;">
            <div style="color: #78350f;">Total per Deal:</div>
            <div style="font-weight: bold; font-size: 16px; color: #f59e0b;">$${analysis.totalPartnerRevenueUpfront.toLocaleString()}</div>
          </div>
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

  // Error state: No products found
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
              Go to <strong>Product Manager</strong> → Add products with correct categories and pricing (salesPriceUSD, costPriceUSD)
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
            <p className="text-orange-100 mt-2">
              Engineering-Optimized Solar + Heat Pump Solutions
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-orange-200 uppercase">Live Database</div>
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
              
              {/* SOLAR DATA DISPLAY */}
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
                  <Input 
                    label="Electric Showers" 
                    type="number" 
                    value={inputs.showers} 
                    onChange={(e) => setInputs({...inputs, showers: +e.target.value})} 
                  />
                  <Input 
                    label="Occupants" 
                    type="number" 
                    value={inputs.people} 
                    onChange={(e) => setInputs({...inputs, people: +e.target.value})} 
                  />
               </div>
               <div className="grid grid-cols-2 gap-3">
                  <Input 
                    label="AC Units" 
                    type="number" 
                    value={inputs.acCount} 
                    onChange={(e) => setInputs({...inputs, acCount: +e.target.value})} 
                  />
                  <Input 
                    label="AC HP Each" 
                    type="number" 
                    step="0.5" 
                    value={inputs.acHorsePower} 
                    onChange={(e) => setInputs({...inputs, acHorsePower: +e.target.value})} 
                  />
               </div>
               
               <div className="border-t pt-3 mt-3">
                 <label className="text-xs font-bold text-slate-600 mb-2 block">Current Heating Method</label>
                 <select 
                   value={inputs.currentHeating}
                   onChange={(e) => setInputs({...inputs, currentHeating: e.target.value})}
                   className="w-full p-2 border border-slate-300 rounded text-sm"
                 >
                   <option value="electric">Electric Shower</option>
                   <option value="lpg">LPG Heater</option>
                   <option value="diesel">Diesel Heater</option>
                 </select>
               </div>
               
               <div className="flex gap-2 mt-4">
                 <button 
                   onClick={() => setShowMath(!showMath)}
                   className="flex-1 text-xs text-blue-600 font-bold hover:underline flex items-center justify-center gap-1 border rounded bg-blue-50 py-2"
                 >
                   <Calculator size={14}/> {showMath ? "Hide" : "Show"} Math
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
                  
                  {/* THERMAL LOAD */}
                  <div className="bg-white p-3 rounded border border-slate-200">
                     <div className="text-xs font-bold text-slate-400 uppercase mb-2">1. Thermal Load</div>
                     <div className="flex justify-between border-b border-slate-100 py-1 text-xs">
                        <span>Daily Usage:</span> <span className="font-mono">{analysis.dailyLiters.toFixed(0)} L</span>
                     </div>
                     <div className="flex justify-between border-b border-slate-100 py-1 text-xs">
                        <span>Delta T:</span> <span className="font-mono">{inputs.targetTemp - inputs.inletTemp}°C</span>
                     </div>
                     <div className="flex justify-between border-b border-slate-100 py-1 text-xs">
                        <span>Energy:</span> <span className="font-mono">{analysis.dailyThermalKWh.toFixed(1)} kWh</span>
                     </div>
                     <div className="flex justify-between py-1 font-bold text-blue-600 text-xs">
                        <span>Req. KW:</span> <span className="font-mono">{analysis.requiredRecoveryKW.toFixed(1)} kW</span>
                     </div>
                  </div>

                  {/* MACHINE SELECTION */}
                  <div className="bg-white p-3 rounded border border-slate-200">
                     <div className="text-xs font-bold text-slate-400 uppercase mb-2">2. Heat Pump</div>
                     <div className="flex justify-between border-b border-slate-100 py-1 text-xs">
                        <span>Model:</span> <span className="font-mono text-[10px] truncate max-w-[100px]">{analysis.selectedKarnot.name}</span>
                     </div>
                     <div className="flex justify-between border-b border-slate-100 py-1 text-xs">
                        <span>Output:</span> <span className="font-mono">{analysis.selectedKarnot.kW_DHW_Nominal || analysis.selectedKarnot.kW || 3.5} kW</span>
                     </div>
                     <div className="flex justify-between border-b border-slate-100 py-1 text-xs">
                        <span>COP:</span> <span className="font-mono">{analysis.selectedKarnot.cop || 4.2}</span>
                     </div>
                     <div className="flex justify-between py-1 font-bold text-orange-600 text-xs">
                        <span>Input:</span> <span className="font-mono">{analysis.hpInputKW.toFixed(2)} kW</span>
                     </div>
                  </div>

                  {/* SOLAR SIZING */}
                  <div className="bg-white p-3 rounded border border-slate-200">
                     <div className="text-xs font-bold text-slate-400 uppercase mb-2">3. Solar Systems</div>
                     <div className="space-y-2">
                        <div>
                           <div className="text-[10px] text-red-500 font-bold">SOLAR ONLY</div>
                           <div className="flex justify-between font-mono text-xs">
                              <span>Load:</span> <span>{analysis.peakLoad_A.toFixed(1)} kW</span>
                           </div>
                           <div className="flex justify-between font-mono text-xs font-bold">
                              <span>Panels:</span> <span>{analysis.panelsA} × 550W</span>
                           </div>
                        </div>
                        <div className="border-t border-slate-100 pt-1">
                           <div className="text-[10px] text-green-600 font-bold">PARTNER</div>
                           <div className="flex justify-between font-mono text-xs">
                              <span>Load:</span> <span>{analysis.peakLoad_B.toFixed(1)} kW</span>
                           </div>
                           <div className="flex justify-between font-mono text-xs font-bold">
                              <span>Panels:</span> <span>{analysis.panelsB} × 550W</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* COMPARISON CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* SCENARIO A */}
            <div className="p-6 rounded-xl border-2 border-red-500 bg-red-50">
              <div className="flex justify-between mb-4">
                <h3 className="font-bold text-slate-700">Scenario A: Solar Only</h3>
                <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">High Load</span>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-slate-500 font-bold">Required Inverter</p>
                  <p className="text-2xl font-bold text-red-600">{analysis.peakLoad_A.toFixed(1)} kW</p>
                  <p className="text-xs text-slate-600 mt-1">
                    <Flame size={12} className="inline"/> {analysis.showerPeakKW.toFixed(1)} kW shower spike
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{analysis.panelsA}× Solar Panels</p>
                </div>
                <div className="pt-4 border-t border-red-200">
                  <p className="text-xs uppercase text-slate-500 font-bold">Solviva System Cost</p>
                  <p className="text-2xl font-bold text-slate-800">${analysis.costA.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500">{analysis.planA?.name}</p>
                </div>
              </div>
            </div>

            {/* SCENARIO B */}
            <div className="p-6 rounded-xl border-2 border-green-500 bg-green-50">
              <div className="flex justify-between mb-4">
                <h3 className="font-bold text-green-800">Scenario B: Partner Model</h3>
                <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">Optimized</span>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-green-700 font-bold">Optimized Inverter</p>
                  <p className="text-2xl font-bold text-green-700">{analysis.peakLoad_B.toFixed(1)} kW</p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <CheckCircle size={12}/> {((1 - analysis.peakLoad_B/analysis.peakLoad_A) * 100).toFixed(0)}% load reduction
                  </p>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <ArrowRight size={12}/> Saved {analysis.panelsSaved} panels
                  </p>
                </div>
                <div className="pt-4 border-t border-green-200">
                  <p className="text-xs uppercase text-green-700 font-bold">Total System Cost</p>
                  <p className="text-2xl font-bold text-green-900">${analysis.costB_Total.toLocaleString()}</p>
                  <p className="text-[10px] text-green-700">{analysis.planB?.name} + {analysis.selectedKarnot.name}</p>
                  <p className="text-xs font-bold text-green-600 mt-2">CAPEX Savings: ${analysis.capexSavings.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* CUSTOMER BENEFITS */}
          <div className="bg-white rounded-xl border-2 border-blue-200 overflow-hidden">
            <button
              onClick={() => setShowCustomerBenefits(!showCustomerBenefits)}
              className="w-full bg-blue-50 p-4 flex justify-between items-center hover:bg-blue-100 transition-colors"
            >
              <h3 className="font-bold text-blue-900 flex items-center gap-2">
                <Target size={18}/> Customer Value Proposition
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-blue-600">
                  ₱{(analysis.fiveYearTotalSavings * 58 / 1000).toFixed(0)}K
                </span>
                <span className="text-xs text-blue-600">5-yr savings</span>
              </div>
            </button>
            {showCustomerBenefits && (
              <div className="p-6 space-y-4">
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
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0"/>
                      <span><strong>Lower Upfront Cost:</strong> Save ${analysis.capexSavings.toLocaleString()} vs solar-only solution</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0"/>
                      <span><strong>Positive Cash Flow:</strong> Monthly savings (₱{analysis.monthlySavings.toLocaleString()}) exceed loan payment (₱{analysis.monthlyPaymentPHP.toLocaleString()})</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0"/>
                      <span><strong>Fast Payback:</strong> {analysis.simplePayback.toFixed(1)} year simple payback period</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0"/>
                      <span><strong>Energy Independence:</strong> Reduce grid reliance by {((analysis.monthlyGenB_kWh + analysis.hpMonthlyKWh * 0.7) / (analysis.monthlyGenB_kWh + analysis.hpMonthlyKWh) * 100).toFixed(0)}%</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0"/>
                      <span><strong>Premium Comfort:</strong> Unlimited hot water vs electric shower limitations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0"/>
                      <span><strong>PFAS-Free:</strong> Clean R290 refrigerant (zero forever chemicals)</span>
                    </li>
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
              <h3 className="font-bold text-orange-900 flex items-center gap-2">
                <Award size={18}/> Solviva Partnership Benefits
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-orange-600">
                  ${analysis.totalPartnerRevenueUpfront.toLocaleString()}
                </span>
                <span className="text-xs text-orange-600">per deal</span>
              </div>
            </button>
            {showSolvivaBenefits && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <div className="text-xs text-blue-700 mb-1">Solar Margin</div>
                    <div className="text-xl font-bold text-blue-900">${analysis.solvivaUnitMargin.toLocaleString()}</div>
                    <div className="text-xs text-blue-600">Your core business</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                    <div className="text-xs text-purple-700 mb-1">Karnot Commission</div>
                    <div className="text-xl font-bold text-purple-900">${analysis.karnotCommission.toLocaleString()}</div>
                    <div className="text-xs text-purple-600">15% referral fee</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                    <div className="text-xs text-orange-700 mb-1">Install + Service</div>
                    <div className="text-xl font-bold text-orange-900">${(analysis.installationRevenue + analysis.annualServiceRevenue).toLocaleString()}</div>
                    <div className="text-xs text-orange-600">Year 1 revenue</div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-300">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-xs text-green-700 mb-1">Upfront Revenue</div>
                      <div className="text-2xl font-bold text-green-900">${analysis.totalPartnerRevenueUpfront.toLocaleString()}</div>
                      <div className="text-xs text-green-600">At installation</div>
                    </div>
                    <div>
                      <div className="text-xs text-emerald-700 mb-1">5-Year Total</div>
                      <div className="text-2xl font-bold text-emerald-900">${analysis.totalPartnerRevenueFiveYear.toLocaleString()}</div>
                      <div className="text-xs text-emerald-600">Inc. service revenue</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-bold text-slate-700 mb-3 text-sm">Strategic Advantages:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <TrendingUp size={16} className="text-orange-600 mt-0.5 flex-shrink-0"/>
                      <span><strong>Higher Revenue per Deal:</strong> Earn ${analysis.totalPartnerRevenueUpfront.toLocaleString()} upfront + ${analysis.fiveYearServiceRevenue.toLocaleString()} service revenue (5yr) vs ${analysis.solvivaUnitMargin.toLocaleString()} (solar only)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <TrendingUp size={16} className="text-orange-600 mt-0.5 flex-shrink-0"/>
                      <span><strong>Easier Customer Acquisition:</strong> Lower CAPEX means more customers can afford your solution</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <TrendingUp size={16} className="text-orange-600 mt-0.5 flex-shrink-0"/>
                      <span><strong>Market Differentiation:</strong> Only solar company offering comprehensive energy solution</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <TrendingUp size={16} className="text-orange-600 mt-0.5 flex-shrink-0"/>
                      <span><strong>Reduced System Size:</strong> Sell smaller inverters ({analysis.peakLoad_B.toFixed(1)} vs {analysis.peakLoad_A.toFixed(1)} kW) at higher margins</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <TrendingUp size={16} className="text-orange-600 mt-0.5 flex-shrink-0"/>
                      <span><strong>Customer Loyalty:</strong> Integrated solution creates long-term relationship</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <TrendingUp size={16} className="text-orange-600 mt-0.5 flex-shrink-0"/>
                      <span><strong>Risk Sharing:</strong> Karnot handles heat pump installation & warranty</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <TrendingUp size={16} className="text-orange-600 mt-0.5 flex-shrink-0"/>
                      <span><strong>Financing Edge:</strong> Positive cash flow makes customer financing approval easier</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* ACTIONS */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold mb-1">Ready to Present</h3>
              <p className="text-sm text-slate-300">
                Generate comprehensive PDF proposal with all financials
              </p>
            </div>
            <Button 
              onClick={generatePDFReport} 
              className="bg-orange-600 hover:bg-orange-700 text-white border-none text-lg px-6 py-3"
            >
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
              <button onClick={() => setShowFixtureModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24}/>
              </button>
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
