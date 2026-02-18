import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, DollarSign, BarChart3, PieChart, Target, Award,
  Building, Users, Zap, Leaf, AlertCircle, CheckCircle, Info,
  ChevronDown, ChevronUp, Download, RefreshCw, Calculator,
  Briefcase, LineChart, ArrowRight, Shield, Droplets, Sun
} from 'lucide-react';
import { Card, Button, Input, Section } from '../data/constants.jsx';

// ==========================================
// KARNOT INVESTOR MODEL - 1882 ENERGY PARTNERSHIP
// Updated: Feb 2026 Pricing (AquaHERO + Solviva Solar)
// ==========================================

const InvestorFinancialModel = () => {
  
  // === HARDWARE CONSTANTS (UPDATED FEB 2026) ===
  const HARDWARE = {
    AQUAHERO_200: {
      id: 'ah200',
      name: 'AquaHERO 200L',
      capacityLiters: 200,      
      recoveryRateLph: 46,      
      cop: 4.00,                
      maxDailyYield: 460,       
      priceUSD: 2235,           
      powerInputKW: 0.55        
    },
    AQUAHERO_300: {
      id: 'ah300',
      name: 'AquaHERO 300L',
      capacityLiters: 300,      
      recoveryRateLph: 50,      
      cop: 3.48,                
      maxDailyYield: 500,       
      priceUSD: 2544,           
      powerInputKW: 0.69        
    }
  };

  // === SOLVIVA SOLAR SYSTEMS (FROM CSV) ===
  const SOLVIVA_SYSTEMS = [
    { id: 'sol005', name: 'Solviva Hybrid 5.49kWp', sizeKW: 5.49, priceUSD: 11500 },
    { id: 'sol010', name: 'Solviva Hybrid 10.37kWp', sizeKW: 10.37, priceUSD: 18100 },
    { id: 'sol012', name: 'Solviva Hybrid 12.20kWp', sizeKW: 12.20, priceUSD: 20900 },
    { id: 'sol016', name: 'Solviva Hybrid 16.47kWp', sizeKW: 16.47, priceUSD: 27400 },
    { id: 'sol020', name: 'Solviva Hybrid 20.13kWp', sizeKW: 20.13, priceUSD: 31400 }
  ];

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
    selectedSolvivaSystemId: 'sol005', // Default to 5.49kWp

    // Revenue Model
    carbonCreditPrice: 15,
    contractYears: 5,

    // Utility Financing
    utilityInterestRate: 8,
    utilityLoanTerm: 5,

    // Portfolio
    portfolioUnits: 250,
  });

  // === CONSTANTS ===
  const CONFIG = {
    FX_RATE: 58.5,
    COP_ELECTRIC: 0.95,
    LPG_BURNER_EFFICIENCY: 0.85,
    KWH_PER_LITER_DELTA_T: 0.001163,
    DELTA_T: 30,                 
    LPG_KWH_PER_KG: 13.8,
    LPG_CO2_PER_KG: 3.0,
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

    // --- STEP A: UNIT SELECTION LOGIC ---
    let selectedUnit = null;
    let unitCount = 1;
    let systemType = "Single Unit";

    if (inputs.dailyLitersHotWater <= 460) {
        selectedUnit = HARDWARE.AQUAHERO_200;
        unitCount = 1;
    } else if (inputs.dailyLitersHotWater <= 500) {
        selectedUnit = HARDWARE.AQUAHERO_300;
        unitCount = 1;
    } else {
        selectedUnit = HARDWARE.AQUAHERO_300;
        unitCount = Math.ceil(inputs.dailyLitersHotWater / 500);
        systemType = "Multi-Unit Array";
    }

    // --- STEP B: ENERGY CALCULATIONS ---
    const dailyThermalKWh = inputs.dailyLitersHotWater * CONFIG.DELTA_T * CONFIG.KWH_PER_LITER_DELTA_T;
    const dailyHeatPumpKwh = dailyThermalKWh / selectedUnit.cop;
    const monthlyHeatPumpKwh = dailyHeatPumpKwh * 30;
    const heatPumpMonthlyCostPHP = monthlyHeatPumpKwh * inputs.electricityRate;
    const totalSystemRecoveryRate = selectedUnit.recoveryRateLph * unitCount;
    const requiredRunHours = inputs.dailyLitersHotWater / totalSystemRecoveryRate;

    // --- STEP C: CAPEX ---
    const baseEquipmentRetail = selectedUnit.priceUSD * unitCount;
    const totalInstallation = inputs.installationCostPerUnit * unitCount;
    const packageRetailPrice = baseEquipmentRetail + totalInstallation;
    const utilityCOGS = packageRetailPrice * (1 - inputs.karnotDiscountPercent / 100);

    // --- STEP D: CUSTOMER BASELINE ---
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

    // --- STEP E: FINANCIALS ---
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

    const monthlyNetCF = annualNetCashFlow / 12;
    const paybackMonths = utilityCOGS / monthlyNetCF;
    const roi5Year = (netProfitAfterFinance / utilityCOGS) * 100;

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

    // --- STEP F: SOLVIVA CROSS-SELL ---
    const selectedSolviva = SOLVIVA_SYSTEMS.find(s => s.id === inputs.selectedSolvivaSystemId) || SOLVIVA_SYSTEMS[0];
    const portfolioUnits = inputs.portfolioUnits;
    
    // Calculate Portfolio Values
    const portfolioInvestment = utilityCOGS * portfolioUnits;
    const portfolioNetProfit = netProfitAfterFinance * portfolioUnits;
    
    // Solviva Pipeline Value
    const solvivaCustomers = portfolioUnits * (inputs.solvivaConversionRate / 100);
    const solvivaPipelineValue = solvivaCustomers * selectedSolviva.priceUSD;

    return {
      selectedUnit,
      unitCount,
      systemType,
      requiredRunHours,
      dailyThermalKWh,
      packageRetailPrice,
      utilityCOGS,
      customerCurrentMonthlyCost,
      heatPumpMonthlyCostPHP,
      customerTotalMonthly,
      customerNetSavings,
      lpgBottlesPerMonth,
      annualSubscriptionUSD,
      annualElectricityProfitUSD,
      totalAnnualOngoingRevenue,
      annualNetCashFlow,
      netProfitAfterFinance,
      paybackMonths,
      roi5Year,
      irrPercent,
      portfolioInvestment,
      portfolioNetProfit,
      solvivaCustomers,
      solvivaPipelineValue,
      selectedSolviva,
      annualCO2Tons
    };

  }, [inputs]);

  const handleChange = (field, isNumber = false) => (e) => {
    const val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    setInputs(prev => ({ ...prev, [field]: val }));
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* === HEADER === */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <Briefcase size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Karnot × Solviva Calculator</h1>
            <p className="text-blue-200">Commercial & Residential EaaS | AquaHERO R290 Deployment</p>
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
            <div className="text-3xl font-bold text-green-600">{Math.round(calculations.paybackMonths)} mo</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Payback Period</div>
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
                    {calculations.requiredRunHours > 10 && (
                        <div className="flex items-center gap-2 mt-2 text-amber-600 text-xs bg-amber-50 p-2 rounded">
                            <AlertCircle size={14} />
                            <span>Warning: High demand ({calculations.requiredRunHours.toFixed(1)}h run time)</span>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-3">Hardware Selected</div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-800">{calculations.unitCount}x {calculations.selectedUnit?.name}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">{calculations.systemType}</span>
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
                </div>
                
                <div>
                    <Input
                        label="Elec Rate (₱/kWh)"
                        type="number"
                        value={inputs.electricityRate}
                        onChange={handleChange('electricityRate', true)}
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Portfolio Scale</label>
                    <input
                        type="range"
                        min="50"
                        max="500"
                        step="10"
                        value={inputs.portfolioUnits}
                        onChange={handleChange('portfolioUnits', true)}
                        className="w-full accent-blue-600"
                    />
                    <div className="flex justify-between text-xs font-bold text-gray-400 mt-1">
                        <span>50 Units</span>
                        <span className="text-blue-600">{inputs.portfolioUnits} Units</span>
                        <span>500 Units</span>
                    </div>
                </div>
            </div>
          </Card>
        </div>

        {/* === RESULTS PANEL === */}
        <div className="lg:col-span-2 space-y-6">
          
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

          {/* Customer Value Prop & Solar Cross-Sell */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white">
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
                    <div className="bg-green-500/20 border border-green-500/50 p-3 rounded-lg flex justify-between items-center">
                        <span className="text-green-300 font-bold">Net Monthly Savings</span>
                        <span className="text-2xl font-bold text-green-400">{fmtPHP(calculations.customerNetSavings)}</span>
                    </div>
                </div>
             </Card>

             <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-100">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-orange-900 flex items-center gap-2">
                        <Sun size={20} className="text-orange-600" /> Solviva Cross-Sell
                    </h3>
                </div>
                
                <div className="flex flex-col h-full justify-between">
                    <div>
                         {/* System Selector */}
                        <div className="mb-4">
                            <label className="text-xs font-bold text-orange-800 uppercase mb-1 block">Target System Size</label>
                            <select 
                                className="w-full p-2 rounded bg-white border border-orange-200 text-sm font-bold text-gray-700"
                                value={inputs.selectedSolvivaSystemId}
                                onChange={handleChange('selectedSolvivaSystemId')}
                            >
                                {SOLVIVA_SYSTEMS.map(sys => (
                                    <option key={sys.id} value={sys.id}>{sys.name} ({fmtUSD(sys.priceUSD)})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded-lg border border-orange-200 shadow-sm">
                                <div className="text-2xl font-bold text-orange-600">{Math.round(calculations.solvivaCustomers)}</div>
                                <div className="text-xs text-gray-500">New Solar Leads</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-orange-200 shadow-sm">
                                <div className="text-2xl font-bold text-orange-600">${fmt(calculations.solvivaPipelineValue / 1000)}k</div>
                                <div className="text-xs text-gray-500">Pipeline Value</div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 text-xs font-bold text-orange-700 bg-orange-200/50 p-2 rounded">
                        Synergy: {inputs.solvivaConversionRate}% Conversion from Heat Pump Base
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
