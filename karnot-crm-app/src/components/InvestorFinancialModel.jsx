import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, DollarSign, BarChart3, PieChart, Target, Award,
  Building, Users, Zap, Leaf, AlertCircle, CheckCircle, Info,
  ChevronDown, ChevronUp, Download, RefreshCw, Calculator,
  Briefcase, LineChart, ArrowRight, Shield, Droplets, Sun, Flame, X
} from 'lucide-react';
import { Card, Button, Input, Section } from '../data/constants.jsx';

// Firebase Imports
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ==========================================
// KARNOT INVESTOR MODEL - STRATEGIC DEAL CALCULATOR
// Focus: "Smart Bundle" vs "Big Solar" & Incremental Profit
// ==========================================

const InvestorFinancialModel = () => {
  
  // === 1. HARDWARE DEFAULTS (Source of Truth Backup) ===
  const [hardware, setHardware] = useState({
    AQUAHERO_200: {
      id: 'ah200', name: 'AquaHERO 200L',
      capacityLiters: 200, recoveryRateLph: 46, cop: 4.00,
      priceUSD: 2235, // Retail Price to Customer
      powerInputKW: 0.55        
    },
    AQUAHERO_300: {
      id: 'ah300', name: 'AquaHERO 300L',
      capacityLiters: 300, recoveryRateLph: 50, cop: 3.48,
      priceUSD: 2544, // Retail Price to Customer
      powerInputKW: 0.69        
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

  // === 3. LIVE DB SYNC ===
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
    heatingType: 'lpg',
    lpgPricePerBottle: 950,
    dailyLitersHotWater: 400,    
    electricityRate: 12.25,
    
    // Deal Structure
    karnotDiscountPercent: 20,   // Solviva gets 20% margin on the HP hardware
    installationCostPerUnit: 350, 
    installationMarginPercent: 30, // Solviva keeps 30% of install fee
    
    // Solviva Solar Config
    solvivaConversionRate: 40,
    solvivaTerm: 60,            
    selectedSolvivaSystemId: '', 
    
    portfolioUnits: 250,
  });

  // Default Solar Selection
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
    SOLAR_FINANCING_RATE: 0.09 
  };

  const fmt = (n) => (+n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const fmtUSD = (n) => `$${fmt(n)}`;
  const fmtPHP = (n) => `₱${fmt(n)}`;

  // === CORE CALCULATIONS ===
  const calculations = useMemo(() => {

    // 1. HEAT PUMP SELECTION
    let selectedUnit = null;
    let unitCount = 1;
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

    // 2. FINANCIALS - CUSTOMER SIDE
    const hpRetailPrice = selectedUnit.priceUSD * unitCount;
    const hpInstallPrice = inputs.installationCostPerUnit * unitCount;
    const hpTotalCustomerCost = hpRetailPrice + hpInstallPrice;

    // 3. FINANCIALS - SOLVIVA PROFIT (INCREMENTAL)
    // Margin on Hardware = Retail * Discount%
    const solvivaHardwareProfit = hpRetailPrice * (inputs.karnotDiscountPercent / 100);
    // Margin on Install = InstallPrice * Margin%
    const solvivaInstallProfit = hpInstallPrice * (inputs.installationMarginPercent / 100);
    const solvivaTotalExtraProfit = solvivaHardwareProfit + solvivaInstallProfit;

    // 4. COMPETITIVE ANALYSIS (THE PITCH)
    // "Scenario A: Competitor" -> Needs HUGE solar for electric showers
    // We assume they need ~10kWp to cover electric shower spikes comfortably
    const selectedSmallSolar = solvivaSystems.find(s => s.id === inputs.selectedSolvivaSystemId) || solvivaSystems[0];
    
    // Find the "Big Solar" equivalent (approx 2x size or nearest large unit)
    const targetBigSize = selectedSmallSolar.sizeKW * 1.8; 
    const competitorSolar = solvivaSystems.find(s => s.sizeKW >= targetBigSize) || solvivaSystems[solvivaSystems.length - 1];

    // Costs
    const costScenarioA = competitorSolar.priceUSD; // Big Solar Only
    const costScenarioB = selectedSmallSolar.priceUSD + hpTotalCustomerCost; // Small Solar + HP

    const customerUpfrontSavings = costScenarioA - costScenarioB;

    // 5. PIPELINE & PORTFOLIO
    const portfolioUnits = inputs.portfolioUnits;
    const solvivaCustomers = portfolioUnits * (inputs.solvivaConversionRate / 100);
    const totalExtraProfitPortfolio = solvivaCustomers * solvivaTotalExtraProfit;

    // 6. SAVINGS (LPG vs ELECTRIC)
    const dailyThermalKWh = inputs.dailyLitersHotWater * CONFIG.DELTA_T * CONFIG.KWH_PER_LITER_DELTA_T;
    const dailyHeatPumpKwh = dailyThermalKWh / selectedUnit.cop;
    
    let lpgCostMonth = 0;
    if (inputs.heatingType === 'lpg') {
       const dailyLpgKg = dailyThermalKWh / (CONFIG.LPG_BURNER_EFFICIENCY * CONFIG.LPG_KWH_PER_KG);
       lpgCostMonth = (dailyLpgKg * 30 / 11) * inputs.lpgPricePerBottle;
    }
    const hpCostMonth = dailyHeatPumpKwh * 30 * inputs.electricityRate;
    const netMonthlySavings = lpgCostMonth - hpCostMonth;

    return {
      selectedUnit,
      unitCount,
      hpRetailPrice,
      hpInstallPrice,
      hpTotalCustomerCost,
      solvivaHardwareProfit,
      solvivaInstallProfit,
      solvivaTotalExtraProfit,
      selectedSmallSolar,
      competitorSolar,
      costScenarioA,
      costScenarioB,
      customerUpfrontSavings,
      portfolioUnits,
      solvivaCustomers,
      totalExtraProfitPortfolio,
      netMonthlySavings,
      lpgCostMonth,
      hpCostMonth
    };

  }, [inputs, hardware, solvivaSystems]);

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
                    <h1 className="text-3xl font-bold tracking-tight">Karnot × Solviva Deal Calculator</h1>
                    <p className="text-blue-200">The "Smart Bundle" Strategy: Smaller Solar + Heat Pump</p>
                </div>
            </div>
            {/* Database Status */}
            <div className="text-right">
                <div className="text-[10px] uppercase font-bold tracking-wider mb-1 text-slate-400">Pricing Source</div>
                {dbStatus === 'success' ? (
                   <div className="flex items-center justify-end gap-2 text-green-400 font-bold bg-green-900/30 px-3 py-1 rounded-full border border-green-700/50">
                       <RefreshCw size={14} /> Live Database
                   </div>
                ) : (
                   <div className="flex items-center justify-end gap-2 text-blue-400 font-bold animate-pulse">
                       <RefreshCw size={14} className="animate-spin" /> Syncing...
                   </div>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* === INPUT PANEL === */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Calculator size={20} className="text-blue-600" /> Deal Parameters
            </h3>

            <div className="space-y-5">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Customer Hot Water</label>
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
                    <div className="text-xs font-bold text-slate-500 uppercase mb-3">Karnot Unit Selected</div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-800">{calculations.unitCount}x {calculations.selectedUnit?.name}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">R290</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600 border-t pt-2">
                        <span>Retail Price:</span>
                        <span className="font-mono font-bold">{fmtUSD(calculations.hpRetailPrice)}</span>
                    </div>
                </div>

                <div className="border-t pt-4">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Solviva Margins</label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <div>
                            <span className="text-[10px] text-gray-400 block mb-1">Hardware Margin %</span>
                            <Input
                                type="number"
                                value={inputs.karnotDiscountPercent}
                                onChange={handleChange('karnotDiscountPercent', true)}
                            />
                        </div>
                        <div>
                            <span className="text-[10px] text-gray-400 block mb-1">Install Fee ($)</span>
                            <Input
                                type="number"
                                value={inputs.installationCostPerUnit}
                                onChange={handleChange('installationCostPerUnit', true)}
                            />
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setShowMath(!showMath)}
                    className="w-full py-2 bg-blue-50 text-blue-600 font-bold text-sm rounded-lg border border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-2"
                >
                    <Calculator size={16} />
                    {showMath ? "Hide Financial Logic" : "Show Financial Logic"}
                </button>
            </div>
          </Card>
        </div>

        {/* === RESULTS PANEL === */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          
          {/* SHOW MATH SECTION */}
          {showMath && (
              <div className="bg-slate-800 text-slate-200 p-6 rounded-xl shadow-inner font-mono text-sm space-y-6 border border-slate-700">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-600 pb-3">
                      <Calculator size={20} className="text-green-400"/> Profit & Cost Logic
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                      <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Customer Cost Analysis</h4>
                          <div className="space-y-1">
                              <div className="flex justify-between"><span>Big Solar ({calculations.competitorSolar.sizeKW}kWp):</span> <span className="text-red-400">{fmtUSD(calculations.costScenarioA)}</span></div>
                              <div className="flex justify-between"><span>Small Solar ({calculations.selectedSmallSolar.sizeKW}kWp):</span> <span className="text-green-400">{fmtUSD(calculations.selectedSmallSolar.priceUSD)}</span></div>
                              <div className="flex justify-between"><span>+ Heat Pump (Retail):</span> <span className="text-green-400">+{fmtUSD(calculations.hpTotalCustomerCost)}</span></div>
                              <div className="flex justify-between border-t border-slate-600 pt-1 font-bold"><span>Savings:</span> <span className="text-green-400">{fmtUSD(calculations.customerUpfrontSavings)}</span></div>
                          </div>
                      </div>
                      <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Solviva Extra Profit</h4>
                          <div className="space-y-1">
                              <div className="flex justify-between"><span>HP Retail:</span> <span>{fmtUSD(calculations.hpRetailPrice)}</span></div>
                              <div className="flex justify-between"><span>HP Wholesale (80%):</span> <span>-{fmtUSD(calculations.hpRetailPrice * 0.8)}</span></div>
                              <div className="flex justify-between text-green-400"><span>= Hardware Margin:</span> <span>{fmtUSD(calculations.solvivaHardwareProfit)}</span></div>
                              <div className="flex justify-between"><span>+ Install Margin (30%):</span> <span>+{fmtUSD(calculations.solvivaInstallProfit)}</span></div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* THE STRATEGIC PITCH CARD */}
          <Card className="flex-1 bg-white border-2 border-slate-100 overflow-hidden">
             <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <Target size={20} className="text-blue-600"/> The "Smart Bundle" Advantage
                 </h3>
                 <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Perspective</span>
             </div>
             
             <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                 {/* SCENARIO A: COMPETITOR */}
                 <div className="opacity-60 relative">
                     <div className="absolute top-0 right-0 bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1 rounded">COMPETITION</div>
                     <h4 className="text-sm font-bold text-red-600 uppercase mb-2">Big Solar Only</h4>
                     <div className="text-3xl font-bold text-slate-700 mb-1">{calculations.competitorSolar.sizeKW} kWp</div>
                     <p className="text-xs text-slate-500 mb-4">Required to cover electric showers</p>
                     
                     <div className="border-t border-slate-200 pt-3">
                         <div className="flex justify-between items-center">
                             <span className="text-sm font-bold text-slate-600">Total Price</span>
                             <span className="text-2xl font-bold text-red-600 line-through decoration-2">{fmtUSD(calculations.costScenarioA)}</span>
                         </div>
                     </div>
                 </div>

                 {/* SCENARIO B: SOLVIVA */}
                 <div className="relative bg-green-50 p-4 rounded-xl border-2 border-green-500 shadow-sm transform scale-105">
                     <div className="absolute top-0 right-0 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-md">RECOMMENDED</div>
                     <h4 className="text-sm font-bold text-green-700 uppercase mb-2">Solviva Smart Bundle</h4>
                     <div className="text-3xl font-bold text-slate-800 mb-1">{calculations.selectedSmallSolar.sizeKW} kWp <span className="text-lg text-green-600">+ HP</span></div>
                     <p className="text-xs text-green-700 mb-4">Optimized load with AquaHERO</p>
                     
                     <div className="border-t border-green-200 pt-3">
                         <div className="flex justify-between items-center mb-1">
                             <span className="text-sm font-bold text-slate-700">Bundle Price</span>
                             <span className="text-2xl font-bold text-green-700">{fmtUSD(calculations.costScenarioB)}</span>
                         </div>
                         <div className="inline-block bg-green-200 text-green-800 text-xs font-bold px-2 py-1 rounded">
                             Saves Customer {fmtUSD(calculations.customerUpfrontSavings)} Upfront!
                         </div>
                     </div>
                 </div>
             </div>
          </Card>

          {/* SOLVIVA PROFIT CARD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              
              <Card className="bg-gradient-to-br from-blue-900 to-slate-900 text-white flex flex-col justify-between">
                  <div className="p-2">
                      <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                          <DollarSign size={20} className="text-green-400"/> Solviva Extra Profit
                      </h3>
                      <p className="text-xs text-blue-200 mb-6">Incremental margin per deal by adding Heat Pump</p>
                      
                      <div className="flex items-end gap-3 mb-4">
                          <span className="text-4xl font-bold text-white">{fmtUSD(calculations.solvivaTotalExtraProfit)}</span>
                          <span className="text-sm text-green-400 mb-1 font-bold">/ Unit Sold</span>
                      </div>
                      
                      <div className="space-y-2 text-xs text-blue-200 border-t border-white/10 pt-3">
                          <div className="flex justify-between">
                              <span>Hardware Margin ({inputs.karnotDiscountPercent}%):</span>
                              <span className="font-mono text-white">{fmtUSD(calculations.solvivaHardwareProfit)}</span>
                          </div>
                          <div className="flex justify-between">
                              <span>Installation Profit:</span>
                              <span className="font-mono text-white">{fmtUSD(calculations.solvivaInstallProfit)}</span>
                          </div>
                      </div>
                  </div>
              </Card>

              <Card className="bg-white border-2 border-orange-100 flex flex-col justify-between">
                  <div>
                      <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
                          <TrendingUp size={20} className="text-orange-600"/> Portfolio Impact
                      </h3>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                              <div className="text-[10px] uppercase text-slate-500 font-bold">Portfolio Size</div>
                              <div className="text-2xl font-bold text-slate-800">{inputs.portfolioUnits} units</div>
                          </div>
                          <div>
                              <div className="text-[10px] uppercase text-slate-500 font-bold">Conv. Rate</div>
                              <div className="text-2xl font-bold text-slate-800">{inputs.solvivaConversionRate}%</div>
                          </div>
                      </div>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                      <div className="text-xs font-bold text-orange-800 uppercase mb-1">Total Extra Profit Generated</div>
                      <div className="text-3xl font-bold text-orange-600">{fmtUSD(calculations.totalExtraProfitPortfolio)}</div>
                      <div className="text-[10px] text-orange-700 mt-1">From {Math.round(calculations.solvivaCustomers)} converted customers</div>
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
