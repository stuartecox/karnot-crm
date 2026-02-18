import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, DollarSign, BarChart3, PieChart, Target, Award,
  Building, Users, Zap, Leaf, AlertCircle, CheckCircle, Info,
  ChevronDown, ChevronUp, Download, RefreshCw, Calculator,
  Briefcase, LineChart, ArrowRight, Shield, Droplets, Sun, Flame, X
} from 'lucide-react';
import { Card, Button, Input, Section } from '../data/constants.jsx';

// Firebase Imports (Required for "Source of Truth" Sync)
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ==========================================
// KARNOT INVESTOR MODEL - LIVE SYNC VERSION
// ==========================================

const InvestorFinancialModel = () => {
  
  // === 1. DEFINE DEFAULT HARDWARE (BACKUP) ===
  // We use state now so we can overwrite these with DB values
  const [hardware, setHardware] = useState({
    AQUAHERO_200: {
      id: 'ah200',
      name: 'AquaHERO 200L',
      capacityLiters: 200,      
      recoveryRateLph: 46,      
      cop: 4.00,                
      maxDailyYield: 460,       
      priceUSD: 2235, // Default Fallback          
      powerInputKW: 0.55        
    },
    AQUAHERO_300: {
      id: 'ah300',
      name: 'AquaHERO 300L',
      capacityLiters: 300,      
      recoveryRateLph: 50,      
      cop: 3.48,                
      maxDailyYield: 500,       
      priceUSD: 2544, // Default Fallback           
      powerInputKW: 0.69        
    }
  });

  // === 2. DEFINE DEFAULT SOLVIVA SYSTEMS (BACKUP) ===
  const [solvivaSystems, setSolvivaSystems] = useState([
    { id: 'sol005', name: 'Solviva Hybrid 5.49kWp', sizeKW: 5.49, priceUSD: 11500 },
    { id: 'sol010', name: 'Solviva Hybrid 10.37kWp', sizeKW: 10.37, priceUSD: 18100 },
    { id: 'sol012', name: 'Solviva Hybrid 12.20kWp', sizeKW: 12.20, priceUSD: 20900 },
    { id: 'sol016', name: 'Solviva Hybrid 16.47kWp', sizeKW: 16.47, priceUSD: 27400 },
    { id: 'sol020', name: 'Solviva Hybrid 20.13kWp', sizeKW: 20.13, priceUSD: 31400 }
  ]);

  const [dbStatus, setDbStatus] = useState('using_defaults'); // 'loading', 'success', 'error'

  // === 3. LIVE DB SYNC (THE SOURCE OF TRUTH) ===
  useEffect(() => {
    const fetchLivePrices = async () => {
        const user = getAuth().currentUser;
        if (!user) return;

        try {
            setDbStatus('loading');
            const snap = await getDocs(collection(db, 'users', user.uid, 'products'));
            const allProducts = snap.docs.map(doc => doc.data());

            // A. UPDATE AQUAHERO PRICES
            // Find products that match our names loosely
            const db200 = allProducts.find(p => p.name?.includes('200L') && p.name?.includes('AquaHERO'));
            const db300 = allProducts.find(p => p.name?.includes('300L') && p.name?.includes('AquaHERO'));

            if (db200 || db300) {
                setHardware(prev => ({
                    AQUAHERO_200: db200 ? { ...prev.AQUAHERO_200, priceUSD: db200.salesPriceUSD || prev.AQUAHERO_200.priceUSD } : prev.AQUAHERO_200,
                    AQUAHERO_300: db300 ? { ...prev.AQUAHERO_300, priceUSD: db300.salesPriceUSD || prev.AQUAHERO_300.priceUSD } : prev.AQUAHERO_300,
                }));
            }

            // B. UPDATE SOLVIVA SYSTEMS
            // Filter for "Competitor Solar" category and map to our format
            const dbSolar = allProducts.filter(p => p.category === 'Competitor Solar');
            
            if (dbSolar.length > 0) {
                // Sort by size (kW)
                const mappedSolar = dbSolar
                    .map(p => ({
                        id: p.id || Math.random().toString(),
                        name: p.name,
                        sizeKW: p.kW_Cooling_Nominal || 0, // Assuming kW is stored here based on previous csv
                        priceUSD: p.salesPriceUSD || 0
                    }))
                    .sort((a,b) => a.sizeKW - b.sizeKW);

                if (mappedSolar.length > 0) {
                    setSolvivaSystems(mappedSolar);
                }
            }
            setDbStatus('success');
            console.log("✅ Pricing synced with Product Manager");

        } catch (error) {
            console.error("DB Sync Failed:", error);
            setDbStatus('error');
        }
    };

    fetchLivePrices();
  }, []);

  // === INVESTOR INPUTS ===
  const [inputs, setInputs] = useState({
    // Customer Profile
    heatingType: 'lpg',
    lpgPricePerBottle: 950,
    dailyLitersHotWater: 400,    
    electricityRate: 12.25,
    recoveryHours: 10,           

    // Energy-as-a-Service Model
    savingsSplitUtility: 75,     
    savingsSplitCustomer: 25,    
    karnotDiscountPercent: 15,   
    installationCostPerUnit: 350, 
    electricityNetMargin: 25,
    annualServicePerUnit: 172,

    // Solviva Solar Cross-Sell
    solvivaConversionRate: 40,
    solvivaTerm: 60,            
    selectedSolvivaSystemId: '', // Will set default in useEffect

    // Revenue Model
    carbonCreditPrice: 15,
    contractYears: 5,

    // Utility Financing
    utilityInterestRate: 8,
    utilityLoanTerm: 5,

    // Portfolio
    portfolioUnits: 250,
  });

  // Set default solar system once list is loaded
  useEffect(() => {
      if (solvivaSystems.length > 0 && !inputs.selectedSolvivaSystemId) {
          setInputs(prev => ({...prev, selectedSolvivaSystemId: solvivaSystems[0].id}));
      }
  }, [solvivaSystems]);

  const [showMath, setShowMath] = useState(false);

  // === CONSTANTS ===
  const CONFIG = {
    FX_RATE: 58.5,
    COP_ELECTRIC: 0.95,
    LPG_BURNER_EFFICIENCY: 0.85,
    KWH_PER_LITER_DELTA_T: 0.001163,
    DELTA_T: 30,                 
    LPG_KWH_PER_KG: 13.8,
    LPG_CO2_PER_KG: 3.0,
    SOLAR_FINANCING_RATE: 0.09 
  };

  // === FORMATTING ===
  const fmt = (n, decimals = 0) => (+n || 0).toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
  const fmtUSD = (n) => `$${fmt(n)}`;
  const fmtPHP = (n) => `₱${fmt(n)}`;

  // === CORE CALCULATIONS ===
  const calculations = useMemo(() => {

    // --- 1. UNIT SELECTION ---
    let selectedUnit = null;
    let unitCount = 1;

    // Use state 'hardware' instead of constant
    if (inputs.dailyLitersHotWater <= 460) {
        selectedUnit = hardware.AQUAHERO_200;
        unitCount = 1;
    } else if (inputs.dailyLitersHotWater <= 500) {
        selectedUnit = hardware.AQUAHERO_300;
        unitCount = 1;
    } else {
        selectedUnit = hardware.AQUAHERO_300;
        unitCount = Math.ceil(inputs.dailyLitersHotWater / 500);
    }

    // --- 2. ENERGY & FINANCIALS (INVESTOR VIEW) ---
    const dailyThermalKWh = inputs.dailyLitersHotWater * CONFIG.DELTA_T * CONFIG.KWH_PER_LITER_DELTA_T;
    const dailyHeatPumpKwh = dailyThermalKWh / selectedUnit.cop;
    const monthlyHeatPumpKwh = dailyHeatPumpKwh * 30;
    const heatPumpMonthlyCostPHP = monthlyHeatPumpKwh * inputs.electricityRate;

    const baseEquipmentRetail = selectedUnit.priceUSD * unitCount;
    const totalInstallation = inputs.installationCostPerUnit * unitCount;
    const packageRetailPrice = baseEquipmentRetail + totalInstallation;
    const utilityCOGS = packageRetailPrice * (1 - inputs.karnotDiscountPercent / 100);

    // Customer Baseline
    let customerCurrentMonthlyCost = 0;
    let lpgKgPerYear = 0;
    let lpgBottlesPerMonth = 0;

    if (inputs.heatingType === 'lpg') {
      const dailyLpgKg = dailyThermalKWh / (CONFIG.LPG_BURNER_EFFICIENCY * CONFIG.LPG_KWH_PER_KG);
      lpgKgPerYear = dailyLpgKg * 365;
      lpgBottlesPerMonth = (dailyLpgKg * 30) / 11;
      customerCurrentMonthlyCost = lpgBottlesPerMonth * inputs.lpgPricePerBottle;
    } else {
      const dailyResistiveKwh = dailyThermalKWh / CONFIG.COP_ELECTRIC;
      customerCurrentMonthlyCost = dailyResistiveKwh * 30 * inputs.electricityRate;
      lpgKgPerYear = (dailyResistiveKwh * 365) / CONFIG.LPG_KWH_PER_KG;
    }

    // Revenue
    const customerMonthlySavings = customerCurrentMonthlyCost - heatPumpMonthlyCostPHP;
    const monthlySubscriptionPHP = customerMonthlySavings * (inputs.savingsSplitUtility / 100);
    const monthlySubscriptionUSD = monthlySubscriptionPHP / CONFIG.FX_RATE;
    const annualSubscriptionUSD = monthlySubscriptionUSD * 12;
    const customerNetSavings = customerMonthlySavings * (inputs.savingsSplitCustomer / 100);
    const customerTotalMonthly = heatPumpMonthlyCostPHP + monthlySubscriptionPHP;

    const annualHeatPumpKwh = dailyHeatPumpKwh * 365;
    const annualElectricityRevenueUSD = (annualHeatPumpKwh * inputs.electricityRate) / CONFIG.FX_RATE;
    const annualElectricityProfitUSD = annualElectricityRevenueUSD * (inputs.electricityNetMargin / 100);

    const annualCO2Tons = (lpgKgPerYear * CONFIG.LPG_CO2_PER_KG) / 1000;
    const annualCarbonRevenueUSD = annualCO2Tons * inputs.carbonCreditPrice;
    const annualServiceRevenue = inputs.annualServicePerUnit;

    const totalAnnualOngoingRevenue = annualSubscriptionUSD + annualElectricityProfitUSD + annualServiceRevenue + annualCarbonRevenueUSD;
    const annualOperatingCosts = (baseEquipmentRetail * 0.02) + (baseEquipmentRetail * 0.01); 
    const annualNetCashFlow = totalAnnualOngoingRevenue - annualOperatingCosts;

    const utilityAnnualInterest = utilityCOGS * (inputs.utilityInterestRate / 100);
    const netProfitAfterFinance = (annualNetCashFlow - utilityAnnualInterest) * inputs.contractYears;
    const roi5Year = (netProfitAfterFinance / utilityCOGS) * 100;
    const paybackMonths = utilityCOGS / (annualNetCashFlow / 12);

    // IRR
    const cashFlows = [-utilityCOGS];
    for(let i=0; i<inputs.contractYears; i++) cashFlows.push(annualNetCashFlow);
    let irr = 0.10;
    for (let i = 0; i < 100; i++) {
        let npv = 0; let dNpv = 0;
        for (let t = 0; t < cashFlows.length; t++) {
            npv += cashFlows[t] / Math.pow(1 + irr, t);
            dNpv -= t * cashFlows[t] / Math.pow(1 + irr, t + 1);
        }
        irr -= npv / dNpv;
    }
    const irrPercent = irr * 100;

    // --- 3. SOLVIVA CROSS-SELL ---
    const selectedSolviva = solvivaSystems.find(s => s.id === inputs.selectedSolvivaSystemId) || solvivaSystems[0];
    const term = inputs.solvivaTerm;
    
    // Monthly Payment Calculation (PMT Formula)
    const ratePerPeriod = CONFIG.SOLAR_FINANCING_RATE / 12;
    const pmtFactor = (ratePerPeriod * Math.pow(1 + ratePerPeriod, term)) / (Math.pow(1 + ratePerPeriod, term) - 1);
    
    // Scenario A: Solar Only (Needs bigger system for electric showers)
    const solarOnlySystemSize = selectedSolviva.sizeKW * 1.5;
    const solarOnlyPriceUSD = selectedSolviva.priceUSD * 1.5; // Linear scaling approximation
    const solarOnlyMonthlyPaymentUSD = solarOnlyPriceUSD * pmtFactor;
    const solarOnlyMonthlyPaymentPHP = solarOnlyMonthlyPaymentUSD * CONFIG.FX_RATE;

    // Scenario B: Bundle (Solar + HP)
    const bundleSolarPaymentUSD = selectedSolviva.priceUSD * pmtFactor;
    const bundleSolarPaymentPHP = bundleSolarPaymentUSD * CONFIG.FX_RATE;
    const bundleTotalPaymentPHP = bundleSolarPaymentPHP + customerTotalMonthly; // Solar Loan + HP Sub

    // Pipeline
    const portfolioUnits = inputs.portfolioUnits;
    const solvivaCustomers = portfolioUnits * (inputs.solvivaConversionRate / 100);
    const solvivaPipelineValue = solvivaCustomers * selectedSolviva.priceUSD;

    return {
      selectedUnit,
      unitCount,
      packageRetailPrice,
      utilityCOGS,
      customerCurrentMonthlyCost,
      heatPumpMonthlyCostPHP,
      customerTotalMonthly,
      customerNetSavings,
      lpgBottlesPerMonth,
      monthlySubscriptionPHP,
      annualSubscriptionUSD,
      annualElectricityProfitUSD,
      totalAnnualOngoingRevenue,
      annualNetCashFlow,
      netProfitAfterFinance,
      roi5Year,
      irrPercent,
      paybackMonths,
      solvivaCustomers,
      solvivaPipelineValue,
      annualCO2Tons,
      // Bundle Logic
      selectedSolviva,
      solarOnlyMonthlyPaymentPHP,
      bundleSolarPaymentPHP,
      bundleTotalPaymentPHP,
      solarOnlySystemSize
    };

  }, [inputs, hardware, solvivaSystems]); // Add state dependencies

  const handleChange = (field, isNumber = false) => (e) => {
    const val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    setInputs(prev => ({ ...prev, [field]: val }));
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen font-sans">
      {/* === HEADER === */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-2xl p-8 mb-8 text-white shadow-xl">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/10 rounded-xl">
                    <Briefcase size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Karnot × Solviva Calculator</h1>
                    <p className="text-blue-200">Commercial & Residential EaaS | AquaHERO R290 Deployment</p>
                </div>
            </div>
            {/* Database Connection Status Indicator */}
            <div className="text-right">
                <div className="text-[10px] uppercase font-bold tracking-wider mb-1 text-slate-400">Pricing Source</div>
                {dbStatus === 'success' ? (
                   <div className="flex items-center justify-end gap-2 text-green-400 font-bold bg-green-900/30 px-3 py-1 rounded-full border border-green-700/50">
                       <RefreshCw size={14} /> Live Database
                   </div>
                ) : dbStatus === 'loading' ? (
                   <div className="flex items-center justify-end gap-2 text-blue-400 font-bold animate-pulse">
                       <RefreshCw size={14} className="animate-spin" /> Syncing...
                   </div>
                ) : (
                   <div className="flex items-center justify-end gap-2 text-slate-400 font-bold bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                       <Shield size={14} /> Offline Defaults
                   </div>
                )}
            </div>
        </div>
      </div>

      {/* === EXECUTIVE SUMMARY === */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-800">{fmtUSD(calculations.utilityCOGS)}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Unit Capex (1882)</div>
          </div>
          <div className="text-center border-l border-gray-100">
            <div className="text-3xl font-bold text-blue-600">{fmtUSD(calculations.annualSubscriptionUSD)}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Annual Sub Revenue</div>
          </div>
          <div className="text-center border-l border-gray-100">
            <div className="text-3xl font-bold text-green-600">{fmtUSD(calculations.annualNetCashFlow)}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Annual Net CF</div>
          </div>
          <div className="text-center border-l border-gray-100">
            <div className="text-3xl font-bold text-purple-600">{calculations.irrPercent.toFixed(1)}%</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">IRR (5-Year)</div>
          </div>
          <div className="text-center border-l border-gray-100">
            <div className="text-3xl font-bold text-orange-600">{fmtUSD(calculations.solvivaPipelineValue / 1000)}k</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Solar Pipeline</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* === INPUT PANEL === */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Calculator size={20} className="text-blue-600" /> Site Configuration
            </h3>

            <div className="space-y-5">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Daily Demand</label>
                    <div className="relative">
                        <Input
                            type="number"
                            value={inputs.dailyLitersHotWater}
                            onChange={handleChange('dailyLitersHotWater', true)}
                            className="text-lg font-bold"
                        />
                        <span className="absolute right-10 top-3 text-gray-400 text-sm">Liters/Day</span>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-3">Hardware Selected</div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-800">{calculations.unitCount}x {calculations.selectedUnit?.name}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">R290</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div>Price: <span className="font-mono text-slate-900">{fmtUSD(calculations.selectedUnit?.priceUSD)}</span></div>
                        <div>COP: <span className="font-mono text-slate-900">{calculations.selectedUnit?.cop}</span></div>
                    </div>
                </div>

                <div className="border-t pt-4">
                    <Input
                        label="LPG Price (₱/Bottle)"
                        type="number"
                        value={inputs.lpgPricePerBottle}
                        onChange={handleChange('lpgPricePerBottle', true)}
                    />
                    <Input
                        label="Elec Rate (₱/kWh)"
                        type="number"
                        value={inputs.electricityRate}
                        onChange={handleChange('electricityRate', true)}
                        className="mt-3"
                    />
                </div>
                
                <button
                    onClick={() => setShowMath(!showMath)}
                    className="w-full py-2 bg-blue-50 text-blue-600 font-bold text-sm rounded-lg border border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-2"
                >
                    <Calculator size={16} />
                    {showMath ? "Hide the Math" : "Show the Math"}
                </button>
            </div>
          </Card>
        </div>

        {/* === RESULTS PANEL === */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* SHOW MATH SECTION */}
          {showMath && (
              <div className="bg-slate-800 text-slate-200 p-6 rounded-xl shadow-inner font-mono text-sm space-y-6 border border-slate-700">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-600 pb-3">
                      <Calculator size={20} className="text-green-400"/> Engineering & Financial Assumptions
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">1. Thermal Demand</h4>
                          <div className="space-y-1">
                              <div className="flex justify-between"><span>Daily Volume:</span> <span className="text-white">{inputs.dailyLitersHotWater} L</span></div>
                              <div className="flex justify-between"><span>Delta T:</span> <span className="text-white">30°C (25°C → 55°C)</span></div>
                              <div className="flex justify-between"><span>Energy Factor:</span> <span className="text-white">0.001163 kWh/L/°C</span></div>
                              <div className="flex justify-between border-t border-slate-600 pt-1 text-green-400"><span>Daily Thermal Energy:</span> <span>{(inputs.dailyLitersHotWater * 30 * 0.001163).toFixed(2)} kWh</span></div>
                          </div>
                      </div>

                      <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">2. LPG Baseline</h4>
                          <div className="space-y-1">
                              <div className="flex justify-between"><span>LPG Energy:</span> <span className="text-white">13.8 kWh/kg</span></div>
                              <div className="flex justify-between"><span>Burner Efficiency:</span> <span className="text-white">85%</span></div>
                              <div className="flex justify-between"><span>Effective Energy:</span> <span className="text-white">11.73 kWh/kg</span></div>
                              <div className="flex justify-between border-t border-slate-600 pt-1 text-orange-400"><span>Monthly Bottles:</span> <span>{calculations.lpgBottlesPerMonth.toFixed(1)} x 11kg</span></div>
                          </div>
                      </div>

                      <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">3. Unit Economics</h4>
                          <div className="space-y-1">
                              <div className="flex justify-between"><span>Retail Price:</span> <span className="text-white">{fmtUSD(calculations.packageRetailPrice)}</span></div>
                              <div className="flex justify-between"><span>Karnot Discount:</span> <span className="text-white">{inputs.karnotDiscountPercent}%</span></div>
                              <div className="flex justify-between"><span>Cost of Goods:</span> <span className="text-white">{fmtUSD(calculations.utilityCOGS)}</span></div>
                              <div className="flex justify-between border-t border-slate-600 pt-1 text-blue-400"><span>Payback Period:</span> <span>{calculations.paybackMonths.toFixed(1)} Months</span></div>
                          </div>
                      </div>

                      <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">4. Solar Financing</h4>
                          <div className="space-y-1">
                              <div className="flex justify-between"><span>System Price:</span> <span className="text-white">{fmtUSD(calculations.selectedSolviva.priceUSD)}</span></div>
                              <div className="flex justify-between"><span>Term:</span> <span className="text-white">{inputs.solvivaTerm} Months</span></div>
                              <div className="flex justify-between"><span>Interest Rate:</span> <span className="text-white">9% APR</span></div>
                              <div className="flex justify-between border-t border-slate-600 pt-1 text-yellow-400"><span>Monthly Pmt (Est):</span> <span>{fmtPHP(calculations.bundleSolarPaymentPHP)}</span></div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* Unit Economics Card */}
          <Card>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <DollarSign size={20} className="text-green-600" /> Unit Economics (Single Site)
                </h3>
                <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full">
                    {inputs.savingsSplitUtility}% Utility Split
                </span>
            </div>

            <div className="grid grid-cols-2 gap-8">
                {/* COSTS */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase border-b pb-2">Investment (Capex)</h4>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Equipment ({calculations.unitCount}x)</span>
                        <span className="font-mono">{fmtUSD(calculations.selectedUnit?.priceUSD * calculations.unitCount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Installation (Standard Plug)</span>
                        <span className="font-mono">{fmtUSD(inputs.installationCostPerUnit * calculations.unitCount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                        <span>Karnot Discount ({inputs.karnotDiscountPercent}%)</span>
                        <span className="font-mono">-{fmtUSD(calculations.packageRetailPrice - calculations.utilityCOGS)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-800 pt-2 border-t bg-slate-50 p-2 rounded">
                        <span>Total Utility Cost</span>
                        <span>{fmtUSD(calculations.utilityCOGS)}</span>
                    </div>
                </div>

                {/* REVENUE */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase border-b pb-2">Annual Revenue (Recurring)</h4>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subscription (EaaS)</span>
                        <span className="font-mono text-blue-600 font-bold">{fmtUSD(calculations.annualSubscriptionUSD)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Electricity Profit</span>
                        <span className="font-mono">{fmtUSD(calculations.annualElectricityProfitUSD)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Service & Carbon</span>
                        <span className="font-mono">{fmtUSD(172 + calculations.annualCarbonRevenueUSD)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-green-700 pt-2 border-t bg-green-50 p-2 rounded">
                        <span>Total Annual Cash Flow</span>
                        <span>{fmtUSD(calculations.totalAnnualOngoingRevenue)}</span>
                    </div>
                </div>
            </div>
          </Card>

          {/* Solviva Cross-Sell (Responsive Grid Fix) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
             {/* Customer Savings */}
             <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white h-full flex flex-col justify-between">
                <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Users size={20} className="text-blue-400" /> Customer Savings
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <span className="text-slate-400 text-sm">Current LPG Spend</span>
                            <span className="text-xl font-bold text-red-400">{fmtPHP(calculations.customerCurrentMonthlyCost)}<span className="text-xs text-slate-500">/mo</span></span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <span className="text-slate-400 text-sm">New 1882 Payment</span>
                            <span className="text-xl font-bold text-white">{fmtPHP(calculations.customerTotalMonthly)}<span className="text-xs text-slate-500">/mo</span></span>
                        </div>
                    </div>
                </div>
                <div className="bg-green-500/20 border border-green-500/50 p-3 rounded-lg flex justify-between items-center mt-4">
                    <span className="text-green-300 font-bold">Net Monthly Savings</span>
                    <span className="text-2xl font-bold text-green-400">{fmtPHP(calculations.customerNetSavings)}</span>
                </div>
             </Card>

             {/* Solviva "Bundle" Pitch */}
             <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-100 h-full">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-orange-900 flex items-center gap-2">
                        <Sun size={20} className="text-orange-600" /> Solviva Cross-Sell
                    </h3>
                </div>
                
                <div className="flex flex-col gap-4">
                    {/* Controls */}
                    <div className="grid grid-cols-2 gap-2">
                         <div>
                            <label className="text-[10px] font-bold text-orange-800 uppercase mb-1 block">System</label>
                            <select 
                                className="w-full p-1 rounded bg-white border border-orange-200 text-sm font-bold text-gray-700"
                                value={inputs.selectedSolvivaSystemId}
                                onChange={handleChange('selectedSolvivaSystemId')}
                            >
                                {solvivaSystems.map(sys => (
                                    <option key={sys.id} value={sys.id}>{sys.name}</option>
                                ))}
                            </select>
                         </div>
                         <div>
                            <label className="text-[10px] font-bold text-orange-800 uppercase mb-1 block">Term</label>
                            <select 
                                className="w-full p-1 rounded bg-white border border-orange-200 text-sm font-bold text-gray-700"
                                value={inputs.solvivaTerm}
                                onChange={handleChange('solvivaTerm', true)}
                            >
                                <option value={36}>36 Months</option>
                                <option value={48}>48 Months</option>
                                <option value={60}>60 Months</option>
                            </select>
                         </div>
                    </div>

                    {/* The Pitch Logic */}
                    <div className="bg-white p-3 rounded-lg border border-orange-100 shadow-sm space-y-2">
                         <div className="text-xs font-bold text-orange-400 uppercase">Monthly Payment Comparison</div>
                         
                         {/* Solar Only */}
                         <div className="flex justify-between items-center opacity-75">
                            <div className="flex flex-col">
                                <span className="text-xs text-red-600 font-bold">Solar Only (Larger System)</span>
                                <span className="text-[10px] text-gray-500">Needs {(calculations.solarOnlySystemSize).toFixed(1)} kWp for electric showers</span>
                            </div>
                            <span className="text-sm font-bold text-red-600 line-through decoration-red-400 decoration-2">
                                {fmtPHP(calculations.solarOnlyMonthlyPaymentPHP)}
                            </span>
                         </div>

                         {/* Bundle */}
                         <div className="flex justify-between items-center border-t pt-2 mt-1">
                            <div className="flex flex-col">
                                <span className="text-xs text-green-700 font-bold">Bundle (Optimized + HP)</span>
                                <span className="text-[10px] text-gray-500">Smaller Solar + Heat Pump Sub</span>
                            </div>
                            <span className="text-lg font-bold text-green-700">
                                {fmtPHP(calculations.bundleTotalPaymentPHP)}
                            </span>
                         </div>
                    </div>

                    {/* Pipeline Value */}
                    <div className="flex justify-between items-end border-t border-orange-200 pt-2">
                        <div>
                            <div className="text-xs text-orange-600">Pipeline Value</div>
                            <div className="text-2xl font-bold text-orange-900">${fmt(calculations.solvivaPipelineValue / 1000)}k</div>
                        </div>
                         <div className="text-right">
                             <div className="text-xs text-orange-600">New Leads</div>
                             <div className="text-xl font-bold text-orange-900">{Math.round(calculations.solvivaCustomers)}</div>
                         </div>
                    </div>
                </div>
             </Card>
          </div>

        </div>
      </div>
      
      {/* Portfolio Footer */}
      <div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-400 text-sm">
        <p>Karnot Energy Solutions • AquaHERO R290 Investor Model • Confidential</p>
      </div>

    </div>
  );
};

export default InvestorFinancialModel;
