import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp, DollarSign, BarChart3, PieChart, Target, Award,
  Building, Users, Zap, Leaf, AlertCircle, CheckCircle, Info,
  ChevronDown, ChevronUp, Download, RefreshCw, Calculator,
  Briefcase, LineChart, ArrowRight, Shield, Droplets, Sun, Flame,
  MapPin, MousePointer2, Search, X, FileText
} from 'lucide-react';
import { Card, Button, Input } from '../data/constants.jsx';
import { APIProvider, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import html2pdf from 'html2pdf.js';

// Firebase Imports
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// --- HELPER: GOOGLE MAPS COMPONENTS ---
const GeocoderControl = ({ address, onLocationFound }) => {
  const map = useMap();
  const geocodingLib = useMapsLibrary('geocoding');
  const [geocoder, setGeocoder] = useState(null);

  useEffect(() => {
    if (geocodingLib) setGeocoder(new geocodingLib.Geocoder());
  }, [geocodingLib]);

  const handleSearch = () => {
    if (!geocoder || !map || !address) return;
    geocoder.geocode({ address: address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const { lat, lng } = results[0].geometry.location;
        map.panTo({ lat: lat(), lng: lng() });
        map.setZoom(19);
        onLocationFound(lat(), lng());
      }
    });
  };

  return (
    <Button onClick={handleSearch} className="absolute right-2 top-2 h-8 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow-md z-10 flex items-center gap-1 text-xs">
      <Search size={14}/> Find
    </Button>
  );
};

// --- MAIN COMPONENT ---
const InvestorFinancialModel = () => {
  
  // === 1. HARDWARE DEFAULTS (Source of Truth Backup) ===
  const [hardware, setHardware] = useState({
    AQUAHERO_200: {
      id: 'ah200', name: 'AquaHERO 200L', capacityLiters: 200, recoveryRateLph: 46, cop: 4.00,
      priceUSD: 2235, powerInputKW: 0.55        
    },
    AQUAHERO_300: {
      id: 'ah300', name: 'AquaHERO 300L', capacityLiters: 300, recoveryRateLph: 50, cop: 3.48,
      priceUSD: 2544, powerInputKW: 0.69        
    }
  });

  // === 2. SOLVIVA SYSTEM DEFAULTS ===
  const [solvivaSystems, setSolvivaSystems] = useState([
    { id: 'sol005', name: 'Solviva Hybrid 5.49kWp', sizeKW: 5.49, priceUSD: 11500 },
    { id: 'sol010', name: 'Solviva Hybrid 10.37kWp', sizeKW: 10.37, priceUSD: 18100 },
    { id: 'sol012', name: 'Solviva Hybrid 12.20kWp', sizeKW: 12.20, priceUSD: 20900 },
    { id: 'sol016', name: 'Solviva Hybrid 16.47kWp', sizeKW: 16.47, priceUSD: 27400 },
    { id: 'sol020', name: 'Solviva Hybrid 20.13kWp', sizeKW: 20.13, priceUSD: 31400 }
  ]);

  const [dbStatus, setDbStatus] = useState('using_defaults');

  // === 3. GOOGLE MAPS STATE ===
  const [coordinates, setCoordinates] = useState({ lat: 14.5995, lng: 120.9842 }); // Manila default
  const [addressSearch, setAddressSearch] = useState("");
  const [solarData, setSolarData] = useState(null);
  
  // === 4. MODAL STATE ===
  const [showFixtureModal, setShowFixtureModal] = useState(false);
  const [showMath, setShowMath] = useState(false);

  // === 5. LIVE DB SYNC ===
  useEffect(() => {
    const fetchLivePrices = async () => {
        const user = getAuth().currentUser;
        if (!user) return;
        try {
            setDbStatus('loading');
            const snap = await getDocs(collection(db, 'users', user.uid, 'products'));
            const allProducts = snap.docs.map(doc => doc.data());

            // Sync Heat Pumps
            const db200 = allProducts.find(p => p.name?.includes('200L') && p.name?.includes('AquaHERO'));
            const db300 = allProducts.find(p => p.name?.includes('300L') && p.name?.includes('AquaHERO'));
            if (db200 || db300) {
                setHardware(prev => ({
                    AQUAHERO_200: db200 ? { ...prev.AQUAHERO_200, priceUSD: db200.salesPriceUSD || prev.AQUAHERO_200.priceUSD } : prev.AQUAHERO_200,
                    AQUAHERO_300: db300 ? { ...prev.AQUAHERO_300, priceUSD: db300.salesPriceUSD || prev.AQUAHERO_300.priceUSD } : prev.AQUAHERO_300,
                }));
            }

            // Sync Solar
            const dbSolar = allProducts.filter(p => p.category === 'Competitor Solar');
            if (dbSolar.length > 0) {
                const mappedSolar = dbSolar.map(p => ({
                    id: p.id || Math.random().toString(),
                    name: p.name,
                    sizeKW: p.kW_Cooling_Nominal || 0,
                    priceUSD: p.salesPriceUSD || 0
                })).sort((a,b) => a.sizeKW - b.sizeKW);
                setSolvivaSystems(mappedSolar);
            }
            setDbStatus('success');
        } catch (error) { console.error("Sync Error", error); setDbStatus('error'); }
    };
    fetchLivePrices();
  }, []);

  // === INPUTS ===
  const [inputs, setInputs] = useState({
    // Demand Profile
    dailyLitersHotWater: 400,
    showers: 3,
    people: 4,
    showerPowerKW: 3.5, // Standard electric shower
    acCount: 3,
    acHorsePower: 1.5,
    acHoursNight: 8,
    baseLoadKW: 0.5,

    // Economics
    heatingType: 'lpg', // 'lpg', 'electric', 'diesel'
    lpgPricePerBottle: 950,
    dieselPricePerLiter: 65,
    electricityRate: 12.25,
    
    // Deal Structure
    karnotDiscountPercent: 20,
    installationCostPerUnit: 350, 
    installationMarginPercent: 30,
    
    // Solviva Config
    solvivaConversionRate: 40,
    solvivaTerm: 60,            
    selectedSolvivaSystemId: '', 
    
    // Engineering
    panelWattage: 550,
    manualRoofArea: 120,
    manualSunHours: 4.5,

    portfolioUnits: 250,
  });

  const [fixtureInputs, setFixtureInputs] = useState({ showers: 3, basins: 2, sinks: 1, people: 4, hours: 8 });

  // Default Solar Selection
  useEffect(() => {
      if (solvivaSystems.length > 0 && !inputs.selectedSolvivaSystemId) {
          setInputs(prev => ({...prev, selectedSolvivaSystemId: solvivaSystems[0].id}));
      }
  }, [solvivaSystems]);

  // === CONSTANTS ===
  const CONFIG = {
    FX_RATE: 58.5,
    COP_ELECTRIC: 0.95,
    LPG_BURNER_EFFICIENCY: 0.85,
    DIESEL_EFFICIENCY: 0.85,
    DIESEL_KWH_PER_LITER: 10.0,
    KWH_PER_LITER_DELTA_T: 0.001163,
    DELTA_T: 30,                 
    LPG_KWH_PER_KG: 13.8,
    SOLAR_FINANCING_RATE: 0.09 
  };

  const fmt = (n) => (+n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const fmtUSD = (n) => `$${fmt(n)}`;
  const fmtPHP = (n) => `₱${fmt(n)}`;

  // === CALCULATIONS ===
  const analysis = useMemo(() => {
    // 1. THERMAL DEMAND & HARDWARE
    let selectedUnit = null;
    let unitCount = 1;
    if (inputs.dailyLitersHotWater <= 460) {
        selectedUnit = hardware.AQUAHERO_200;
    } else if (inputs.dailyLitersHotWater <= 500) {
        selectedUnit = hardware.AQUAHERO_300;
    } else {
        selectedUnit = hardware.AQUAHERO_300;
        unitCount = Math.ceil(inputs.dailyLitersHotWater / 500);
    }

    const dailyThermalKWh = inputs.dailyLitersHotWater * CONFIG.DELTA_T * CONFIG.KWH_PER_LITER_DELTA_T;
    const dailyHeatPumpKwh = dailyThermalKWh / selectedUnit.cop;

    // 2. LOAD PROFILING (SCENARIO A vs B)
    const kwPerHP = 0.85; 
    const acTotalKW = inputs.acCount * inputs.acHorsePower * kwPerHP;
    
    // Scenario A: Solar Only (Must support Electric Showers)
    const showerPeakKW = inputs.showers * inputs.showerPowerKW;
    const peakLoad_A = inputs.baseLoadKW + acTotalKW + showerPeakKW; 
    
    // Scenario B: Partner Model (Showers replaced by Heat Pump)
    const hpInputKW = (selectedUnit.powerInputKW * unitCount);
    const peakLoad_B = inputs.baseLoadKW + acTotalKW + hpInputKW;

    // 3. SOLAR SIZING
    const selectedSmallSolar = solvivaSystems.find(s => s.id === inputs.selectedSolvivaSystemId) || solvivaSystems[0];
    
    // Find Competitor "Big Solar" (approx 1.5x - 2x size needed for showers)
    const targetBigSize = selectedSmallSolar.sizeKW * 1.6; 
    const competitorSolar = solvivaSystems.find(s => s.sizeKW >= targetBigSize) || solvivaSystems[solvivaSystems.length - 1];

    const panelsA = Math.ceil(competitorSolar.sizeKW * 1000 / inputs.panelWattage);
    const panelsB = Math.ceil(selectedSmallSolar.sizeKW * 1000 / inputs.panelWattage);
    const panelsSaved = Math.max(0, panelsA - panelsB);

    // 4. FINANCIALS (CUSTOMER)
    const hpRetailPrice = selectedUnit.priceUSD * unitCount;
    const hpInstallPrice = inputs.installationCostPerUnit * unitCount;
    const hpTotalCustomerCost = hpRetailPrice + hpInstallPrice;

    const costScenarioA = competitorSolar.priceUSD; // Big Solar Only
    const costScenarioB = selectedSmallSolar.priceUSD + hpTotalCustomerCost; // Small Solar + HP
    const customerUpfrontSavings = costScenarioA - costScenarioB;

    // Monthly Payments (PMT)
    const ratePerPeriod = CONFIG.SOLAR_FINANCING_RATE / 12;
    const term = inputs.solvivaTerm;
    const pmtFactor = (ratePerPeriod * Math.pow(1 + ratePerPeriod, term)) / (Math.pow(1 + ratePerPeriod, term) - 1);
    
    const monthlyPaymentA_USD = costScenarioA * pmtFactor;
    const monthlyPaymentB_USD = costScenarioB * pmtFactor;

    // 5. SOLVIVA INCREMENTAL PROFIT
    const solvivaHardwareProfit = hpRetailPrice * (inputs.karnotDiscountPercent / 100);
    const solvivaInstallProfit = hpInstallPrice * (inputs.installationMarginPercent / 100);
    const solvivaTotalExtraProfit = solvivaHardwareProfit + solvivaInstallProfit;

    // 6. FUEL SAVINGS (OPERATIONAL)
    let currentMonthlyCost = 0;
    if (inputs.heatingType === 'lpg') {
       const dailyLpgKg = dailyThermalKWh / (CONFIG.LPG_BURNER_EFFICIENCY * CONFIG.LPG_KWH_PER_KG);
       currentMonthlyCost = (dailyLpgKg * 30 / 11) * inputs.lpgPricePerBottle;
    } else if (inputs.heatingType === 'electric') {
       currentMonthlyCost = (dailyThermalKWh / CONFIG.COP_ELECTRIC) * 30 * inputs.electricityRate;
    } else if (inputs.heatingType === 'diesel') {
       const dailyDieselL = dailyThermalKWh / (CONFIG.DIESEL_EFFICIENCY * CONFIG.DIESEL_KWH_PER_LITER);
       currentMonthlyCost = dailyDieselL * 30 * inputs.dieselPricePerLiter;
    }

    const hpMonthlyRunCost = dailyHeatPumpKwh * 30 * inputs.electricityRate;
    const monthlyOperationalSavings = currentMonthlyCost - hpMonthlyRunCost;

    // Net Monthly Position (Loan + Opex)
    const totalMonthlyCostA = (monthlyPaymentA_USD * CONFIG.FX_RATE) + currentMonthlyCost + (inputs.monthlyElectricBill || 5000 * 0.1); 
    const totalMonthlyCostB = (monthlyPaymentB_USD * CONFIG.FX_RATE) + hpMonthlyRunCost + (inputs.monthlyElectricBill || 5000 * 0.1);
    const monthlyAdvantage = totalMonthlyCostA - totalMonthlyCostB;

    // Portfolio
    const portfolioUnits = inputs.portfolioUnits;
    const solvivaCustomers = portfolioUnits * (inputs.solvivaConversionRate / 100);
    const totalPipelineValue = solvivaCustomers * (selectedSmallSolar.priceUSD + hpRetailPrice);
    const totalExtraProfitPortfolio = solvivaCustomers * solvivaTotalExtraProfit;

    return {
        selectedUnit, unitCount,
        dailyThermalKWh, peakLoad_A, peakLoad_B,
        panelsA, panelsB, panelsSaved,
        costScenarioA, costScenarioB, customerUpfrontSavings,
        monthlyPaymentA_USD, monthlyPaymentB_USD,
        solvivaTotalExtraProfit, solvivaHardwareProfit, solvivaInstallProfit,
        currentMonthlyCost, hpMonthlyRunCost, monthlyOperationalSavings,
        monthlyAdvantage,
        totalPipelineValue, solvivaCustomers, totalExtraProfitPortfolio,
        competitorSolar, selectedSmallSolar
    };
  }, [inputs, hardware, solvivaSystems]);

  // === HANDLERS ===
  const handleChange = (field, isNumber = false) => (e) => {
    const val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    setInputs(prev => ({ ...prev, [field]: val }));
  };

  const handleFixtureCalc = () => {
      // Simple fixture calculation logic
      const demand = (fixtureInputs.showers * 60) + (fixtureInputs.basins * 30) + (fixtureInputs.sinks * 40) + (fixtureInputs.people * 30);
      setInputs(prev => ({ ...prev, dailyLitersHotWater: demand, people: fixtureInputs.people, showers: fixtureInputs.showers }));
      setShowFixtureModal(false);
  };

  const generatePDFReport = () => {
    const element = document.getElementById('proposal-content');
    const opt = {
      margin: 0.3,
      filename: `Solviva_Karnot_Deal_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 font-sans bg-gray-50 min-h-screen">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-800 text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
                <Zap size={32}/> Solviva Strategic Engine
            </h1>
            <p className="text-orange-100 mt-1">Solar + Heat Pump Deal Architect</p>
        </div>
        <div className="text-right">
             <div className="text-[10px] uppercase font-bold tracking-wider mb-1 text-orange-200">Price Source</div>
             {dbStatus === 'success' ? (
                <span className="bg-green-500/20 text-green-100 px-3 py-1 rounded-full text-xs font-bold border border-green-400/30 flex items-center gap-2 justify-end">
                    <RefreshCw size={12}/> Live Database
                </span>
             ) : (
                <span className="bg-white/10 text-white px-3 py-1 rounded-full text-xs font-bold">Default Mode</span>
             )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* === LEFT COLUMN: TOOLS & INPUTS (4 cols) === */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* MAP TOOL */}
            <Card className="p-0 overflow-hidden relative border-0 shadow-md">
                <div className="bg-slate-800 p-3 flex justify-between items-center">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2"><MapPin size={16}/> Site Solar Scan</h3>
                </div>
                <div className="relative">
                    <div className="p-2 absolute top-0 left-0 z-10 w-full">
                        <div className="relative">
                            <input 
                                type="text" 
                                value={addressSearch}
                                onChange={(e) => setAddressSearch(e.target.value)}
                                placeholder="Search client address..."
                                className="w-full p-2 pr-16 text-xs rounded shadow border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <GeocoderControl address={addressSearch} onLocationFound={(lat, lng) => setCoordinates({lat, lng})} />
                        </div>
                    </div>
                    <div className="h-48 w-full bg-gray-200">
                        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_SOLAR_KEY}>
                            <Map defaultCenter={coordinates} defaultZoom={19} mapTypeId="hybrid" disableDefaultUI={true} />
                        </APIProvider>
                    </div>
                </div>
                <div className="p-3 bg-white grid grid-cols-2 gap-3 text-xs">
                    <div>
                        <span className="text-gray-500 block">Est. Roof Area</span>
                        <Input value={inputs.manualRoofArea} onChange={handleChange('manualRoofArea')} className="h-8 text-right" />
                    </div>
                    <div>
                        <span className="text-gray-500 block">Peak Sun Hours</span>
                        <Input value={inputs.manualSunHours} onChange={handleChange('manualSunHours')} className="h-8 text-right" />
                    </div>
                </div>
            </Card>

            {/* DEAL CONFIGURATION */}
            <Card className="p-5 space-y-4 shadow-md">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><Calculator size={18}/> Deal Inputs</h3>
                    <button onClick={() => setShowFixtureModal(true)} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                        <Droplets size={12}/> Fixture Calc
                    </button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Daily Hot Water (L)</label>
                        <Input type="number" value={inputs.dailyLitersHotWater} onChange={handleChange('dailyLitersHotWater', true)} className="font-bold text-lg" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase font-bold">Current Fuel</label>
                            <select 
                                value={inputs.heatingType} 
                                onChange={(e) => setInputs({...inputs, heatingType: e.target.value})}
                                className="w-full p-2 border rounded text-sm bg-white"
                            >
                                <option value="lpg">LPG</option>
                                <option value="electric">Electric</option>
                                <option value="diesel">Diesel</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase font-bold">Fuel Price</label>
                            <Input 
                                type="number" 
                                value={inputs.heatingType === 'lpg' ? inputs.lpgPricePerBottle : (inputs.heatingType === 'diesel' ? inputs.dieselPricePerLiter : inputs.electricityRate)} 
                                onChange={handleChange(inputs.heatingType === 'lpg' ? 'lpgPricePerBottle' : (inputs.heatingType === 'diesel' ? 'dieselPricePerLiter' : 'electricityRate'), true)}
                            />
                        </div>
                    </div>

                    <div className="border-t pt-3">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Solviva Configuration</label>
                        <select 
                            className="w-full p-2 border rounded text-sm bg-blue-50 border-blue-200 font-bold text-blue-900 mb-2"
                            value={inputs.selectedSolvivaSystemId}
                            onChange={handleChange('selectedSolvivaSystemId')}
                        >
                            {solvivaSystems.map(s => <option key={s.id} value={s.id}>{s.name} ({fmtUSD(s.priceUSD)})</option>)}
                        </select>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold">Term (Months)</label>
                                <select value={inputs.solvivaTerm} onChange={handleChange('solvivaTerm', true)} className="w-full p-2 border rounded text-sm">
                                    <option value={36}>36 Months</option>
                                    <option value={48}>48 Months</option>
                                    <option value={60}>60 Months</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold">Install Margin %</label>
                                <Input type="number" value={inputs.installationMarginPercent} onChange={handleChange('installationMarginPercent', true)} />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <Button onClick={generatePDFReport} className="w-full bg-slate-800 text-white flex items-center justify-center gap-2">
                <FileText size={16}/> Generate Proposal PDF
            </Button>

        </div>

        {/* === RIGHT COLUMN: ANALYSIS & STRATEGY (8 cols) === */}
        <div className="lg:col-span-8 space-y-6" id="proposal-content">
            
            {/* 1. THE STRATEGIC PITCH */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* COMPETITOR */}
                <div className="bg-slate-100 p-6 rounded-xl border border-slate-300 relative opacity-80">
                    <div className="absolute top-4 right-4 bg-slate-300 text-slate-600 text-[10px] font-bold px-2 py-1 rounded">TRADITIONAL SOLAR</div>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">Scenario A: Solar Only</h3>
                    <p className="text-xs text-slate-500 mb-4">Oversized to handle electric showers</p>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                            <span className="text-sm text-slate-600">System Size</span>
                            <span className="text-2xl font-bold text-slate-800">{analysis.competitorSolar.sizeKW} kWp</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                            <span className="text-sm text-slate-600">Total CAPEX</span>
                            <span className="text-2xl font-bold text-red-600">{fmtUSD(analysis.costScenarioA)}</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-sm text-slate-600">Monthly Pmt</span>
                            <span className="text-xl font-bold text-slate-700">{fmtPHP(analysis.monthlyPaymentA_USD * CONFIG.FX_RATE)}</span>
                        </div>
                    </div>
                </div>

                {/* SOLVIVA BUNDLE */}
                <div className="bg-green-50 p-6 rounded-xl border-2 border-green-500 relative shadow-lg transform scale-[1.02]">
                    <div className="absolute top-4 right-4 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded">SMART BUNDLE</div>
                    <h3 className="text-lg font-bold text-green-800 mb-1">Scenario B: Partner Model</h3>
                    <p className="text-xs text-green-600 mb-4">Optimized Solar + AquaHERO Heat Pump</p>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-green-200 pb-2">
                            <span className="text-sm text-green-700">System Size</span>
                            <span className="text-2xl font-bold text-green-900">{analysis.selectedSmallSolar.sizeKW} kWp <span className="text-sm font-normal">+ HP</span></span>
                        </div>
                        <div className="flex justify-between items-end border-b border-green-200 pb-2">
                            <span className="text-sm text-green-700">Total CAPEX</span>
                            <span className="text-2xl font-bold text-green-900">{fmtUSD(analysis.costScenarioB)}</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-sm text-green-700">Monthly Pmt</span>
                            <span className="text-xl font-bold text-green-900">{fmtPHP(analysis.monthlyPaymentB_USD * CONFIG.FX_RATE)}</span>
                        </div>
                    </div>

                    <div className="mt-4 bg-green-200/50 p-2 rounded text-center text-green-800 text-xs font-bold border border-green-300">
                        Customer saves {fmtUSD(analysis.customerUpfrontSavings)} upfront & {fmtPHP(analysis.monthlyAdvantage)}/mo
                    </div>
                </div>
            </div>

            {/* 2. SOLVIVA PROFIT BREAKDOWN */}
            <Card className="bg-gradient-to-r from-slate-900 to-blue-900 text-white border-0">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2"><DollarSign size={24} className="text-green-400"/> Solviva Incremental Profit</h3>
                    <span className="text-xs bg-white/10 px-3 py-1 rounded-full">Per Deal Analysis</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <div className="text-xs text-blue-300 uppercase mb-1">Hardware Margin</div>
                        <div className="text-3xl font-bold text-white">{fmtUSD(analysis.solvivaHardwareProfit)}</div>
                        <div className="text-[10px] text-blue-300 mt-1">{inputs.karnotDiscountPercent}% discount applied</div>
                    </div>
                    <div>
                        <div className="text-xs text-blue-300 uppercase mb-1">Install Profit</div>
                        <div className="text-3xl font-bold text-white">{fmtUSD(analysis.solvivaInstallProfit)}</div>
                        <div className="text-[10px] text-blue-300 mt-1">{inputs.installationMarginPercent}% of labor fee</div>
                    </div>
                    <div className="bg-green-600/20 p-3 rounded-lg border border-green-500/50">
                        <div className="text-xs text-green-300 uppercase mb-1">Total Extra Profit</div>
                        <div className="text-4xl font-bold text-green-400">{fmtUSD(analysis.solvivaTotalExtraProfit)}</div>
                        <div className="text-[10px] text-green-200 mt-1">Net profit per bundled unit</div>
                    </div>
                </div>
            </Card>

            {/* 3. ENGINEERING DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-4 bg-orange-50 border-orange-200">
                    <h4 className="font-bold text-orange-900 text-sm mb-3 flex items-center gap-2"><Sun size={16}/> Panel Efficiency</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Solar Only:</span> <strong>{analysis.panelsA} Panels</strong></div>
                        <div className="flex justify-between"><span>Partner Model:</span> <strong>{analysis.panelsB} Panels</strong></div>
                        <div className="border-t border-orange-200 pt-2 flex justify-between text-orange-700 font-bold">
                            <span>Saved:</span> <span>{analysis.panelsSaved} Panels</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 bg-blue-50 border-blue-200">
                    <h4 className="font-bold text-blue-900 text-sm mb-3 flex items-center gap-2"><Zap size={16}/> Load Reduction</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Peak A (Shower):</span> <strong>{analysis.peakLoad_A.toFixed(1)} kW</strong></div>
                        <div className="flex justify-between"><span>Peak B (HP):</span> <strong>{analysis.peakLoad_B.toFixed(1)} kW</strong></div>
                        <div className="border-t border-blue-200 pt-2 flex justify-between text-blue-700 font-bold">
                            <span>Reduction:</span> <span>{((1 - analysis.peakLoad_B/analysis.peakLoad_A)*100).toFixed(0)}%</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 bg-slate-50 border-slate-200">
                    <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2"><Target size={16}/> Pipeline Value</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Units:</span> <strong>{inputs.portfolioUnits}</strong></div>
                        <div className="flex justify-between"><span>Conversion:</span> <strong>{inputs.solvivaConversionRate}%</strong></div>
                        <div className="border-t border-slate-200 pt-2 flex justify-between text-slate-800 font-bold">
                            <span>Total Value:</span> <span>${fmt(analysis.totalPipelineValue/1000)}k</span>
                        </div>
                    </div>
                </Card>
            </div>

        </div>
      </div>

      {/* FIXTURE MODAL */}
      {showFixtureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800">Fixture Calculator</h3>
                    <button onClick={() => setShowFixtureModal(false)}><X size={20} className="text-slate-400"/></button>
                </div>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 items-center">
                        <label className="text-sm">Showers</label>
                        <Input type="number" value={fixtureInputs.showers} onChange={(e) => setFixtureInputs({...fixtureInputs, showers: +e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-center">
                        <label className="text-sm">Basins</label>
                        <Input type="number" value={fixtureInputs.basins} onChange={(e) => setFixtureInputs({...fixtureInputs, basins: +e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-center">
                        <label className="text-sm">Kitchen Sinks</label>
                        <Input type="number" value={fixtureInputs.sinks} onChange={(e) => setFixtureInputs({...fixtureInputs, sinks: +e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-center">
                        <label className="text-sm">Occupants</label>
                        <Input type="number" value={fixtureInputs.people} onChange={(e) => setFixtureInputs({...fixtureInputs, people: +e.target.value})} />
                    </div>
                </div>
                <Button onClick={handleFixtureCalc} className="w-full mt-6 bg-blue-600 text-white">Calculate Demand</Button>
            </div>
        </div>
      )}

    </div>
  );
};

export default InvestorFinancialModel;
