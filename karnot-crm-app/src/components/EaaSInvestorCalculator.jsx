import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Card, Input, Button } from '../data/constants.jsx';
import {
  Briefcase, TrendingUp, DollarSign, Users, Building, Leaf,
  Zap, BarChart3, Target, CheckCircle, ArrowRight,
  Flame, Droplets, ThermometerSun, Shield, PieChart, Activity
} from 'lucide-react';

// ==========================================
// SOLVIVA INVESTOR PITCH CALCULATOR
// Purpose: Show Solviva the ROI of buying Karnot units
// Model: Solviva buys hardware -> Solviva keeps 75% savings
// ==========================================

const EaaSInvestorCalculator = () => {
  // === STATE ===
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Customer Profile Inputs
  const [inputs, setInputs] = useState({
    // Customer Type
    customerType: 'commercial', 
    heatingType: 'electric',    // Default to Electric (Best ROI for Solviva)

    // Usage Defaults (Hotel/Gym profile)
    dailyLitersHotWater: 3000,  
    operatingHoursPerDay: 16,   
    lpgPricePerBottle: 1100,    
    electricityRate: 14.50,     

    // Temperatures
    inletTemp: 25,              
    targetTemp: 55,             
    ambientTemp: 30,            

    // Split Logic
    customerSavingsPercent: 25, // Customer keeps 25%
    solvivaRevenuePercent: 75,  // Solviva keeps 75% (Implied)

    // Contract Terms
    contractMonths: 60,         

    // Solviva's Investment (Karnot Selling Price)
    // NOTE: This includes Karnot's 50% Margin!
    hardwareCostUSD: 4500,      
    installationCostUSD: 1000,
    serviceReservePercent: 3,   

    // Solviva's Soft Costs
    salesCommissionUSD: 300,    
    marketingCostUSD: 200,      

    // Carbon
    carbonCreditPrice: 25,      

    // Scale
    portfolioUnits: 50,         
  });

  // === CONSTANTS ===
  const FX_RATE = 58.0; 
  const COP_HEAT_PUMP_TYPICAL = 4.2; 
  const COP_ELECTRIC_HEATER = 0.95; 
  const KWH_PER_LITER_DELTA_T = 0.001163; 
  const LPG_KWH_PER_KG = 13.8;
  const LPG_CO2_PER_KG = 3.0; 
  const GRID_CO2_PER_KWH = 0.71; 

  // === LOAD PRODUCTS ===
  useEffect(() => {
    const fetchProducts = async () => {
      const user = getAuth().currentUser;
      if (!user) { setLoading(false); return; }
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'products'));
        const prods = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(p => p.Refrigerant === 'R290' || p.refrigerant === 'R290');
        setProducts(prods);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchProducts();
  }, []);

  const fmt = (n, decimals = 0) => (+n || 0).toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
  const fmtUSD = (n) => `$${fmt(n)}`;
  const fmtPHP = (n) => `₱${fmt(n)}`;

  // === CALCULATIONS ===
  const calculations = useMemo(() => {
    // 1. Thermal Demand
    const deltaT = inputs.targetTemp - inputs.inletTemp;
    const dailyThermalKWh = (inputs.dailyLitersHotWater * deltaT * KWH_PER_LITER_DELTA_T);

    // 2. Baseline Costs (The "Old Bill")
    let currentMonthlyCostPHP = 0;
    let baselineCo2Tons = 0;

    if (inputs.heatingType === 'lpg') {
        const dailyLpgKg = dailyThermalKWh / (0.85 * LPG_KWH_PER_KG);
        const lpgBottlesPerMonth = (dailyLpgKg * 30) / 11; 
        currentMonthlyCostPHP = lpgBottlesPerMonth * inputs.lpgPricePerBottle;
        baselineCo2Tons = (dailyLpgKg * 365 * LPG_CO2_PER_KG) / 1000;
    } else {
        const dailyElecKwh = dailyThermalKWh / COP_ELECTRIC_HEATER; 
        currentMonthlyCostPHP = (dailyElecKwh * 30) * inputs.electricityRate;
        baselineCo2Tons = (dailyElecKwh * 365 * GRID_CO2_PER_KWH) / 1000;
    }
    
    // 3. New Operating Cost (Heat Pump Electricity)
    const dailyHeatPumpKwh = dailyThermalKWh / COP_HEAT_PUMP_TYPICAL;
    const monthlyHeatPumpCostPHP = (dailyHeatPumpKwh * 30) * inputs.electricityRate;
    const annualHeatPumpCo2Tons = (dailyHeatPumpKwh * 365 * GRID_CO2_PER_KWH) / 1000;

    // 4. The "Pot of Gold" (Total Savings Pool)
    const totalSavingsPoolPHP = currentMonthlyCostPHP - monthlyHeatPumpCostPHP;
    
    // 5. The Split
    const customerSavingsPHP = totalSavingsPoolPHP * (inputs.customerSavingsPercent / 100);
    const solvivaRevenuePHP = totalSavingsPoolPHP - customerSavingsPHP; // The rest goes to Solviva
    
    const solvivaMonthlyRevenueUSD = solvivaRevenuePHP / FX_RATE;
    const solvivaAnnualRevenueUSD = solvivaMonthlyRevenueUSD * 12;

    // 6. Carbon Revenue (Accrues to Asset Owner/Solviva)
    const netCo2SavedTons = Math.max(0, baselineCo2Tons - annualHeatPumpCo2Tons);
    const annualCarbonRevenueUSD = netCo2SavedTons * inputs.carbonCreditPrice;

    // 7. Solviva's Investment (CAPEX)
    const tankCostUSD = 1500; 
    // This 'hardwareCostUSD' is Karnot's Selling Price (Cost to Solviva)
    const capexUSD = inputs.hardwareCostUSD + tankCostUSD + inputs.installationCostUSD;
    const reserveUSD = capexUSD * (inputs.serviceReservePercent / 100);
    const totalInvestmentUSD = capexUSD + reserveUSD; 

    const cacUSD = inputs.salesCommissionUSD + inputs.marketingCostUSD;

    // 8. Solviva's Returns
    const totalAnnualRevenueUSD = solvivaAnnualRevenueUSD + annualCarbonRevenueUSD;
    const annualOpexUSD = 150; // Monitoring + Insurance
    const netAnnualCashFlowUSD = totalAnnualRevenueUSD - annualOpexUSD;

    // 9. Investor Metrics
    const contractYears = inputs.contractMonths / 12;
    const ltvUSD = (netAnnualCashFlowUSD * contractYears); 
    
    const paybackMonths = netAnnualCashFlowUSD > 0 ? (totalInvestmentUSD / (netAnnualCashFlowUSD/12)) : 999;
    const netProfitUSD = ltvUSD - totalInvestmentUSD - cacUSD;
    const roi = (netProfitUSD / totalInvestmentUSD) * 100;
    const ltvCacRatio = ltvUSD / (totalInvestmentUSD + cacUSD); 

    // Portfolio
    const portfolioInvestment = totalInvestmentUSD * inputs.portfolioUnits;
    const portfolioAnnualRecurringRevenue = totalAnnualRevenueUSD * inputs.portfolioUnits; 
    const portfolioTotalProfit = netProfitUSD * inputs.portfolioUnits;

    // IRR Calculation
    const irr = totalInvestmentUSD > 0 && ltvUSD > 0 
        ? ((Math.pow((ltvUSD / totalInvestmentUSD), (1/contractYears))) - 1) * 100 
        : 0;

    return {
      currentMonthlyCostPHP,
      monthlyHeatPumpCostPHP, customerSavingsPHP,
      solvivaMonthlyRevenueUSD, totalAnnualRevenueUSD,
      totalInvestmentUSD, cacUSD, ltvUSD,
      paybackMonths, roi, ltvCacRatio, irr,
      portfolioInvestment, portfolioAnnualRecurringRevenue, portfolioTotalProfit,
      netCo2SavedTons, annualCarbonRevenueUSD
    };
  }, [inputs, products]);

  const handleChange = (field, isNumber = false) => (e) => {
    const val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    setInputs(prev => ({ ...prev, [field]: val }));
  };

  if (loading) return <div className="p-10 text-center">Loading Financial Data...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
              <Briefcase size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Solviva Investor Pitch Deck</h1>
              <p className="text-slate-400">Why Solviva should deploy 50 Karnot Units (Commercial Rollout)</p>
            </div>
          </div>
          <div className="text-right">
             <div className="text-xs font-bold text-slate-500 uppercase">Est. Deal Value</div>
             <div className="text-3xl font-bold text-green-400">$300,000+</div>
          </div>
        </div>
      </div>

      {/* === TOP METRICS === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* UNIT ECONOMICS CARD */}
        <div className="bg-white p-6 rounded-xl border-2 border-indigo-100 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
             SOLVIVA RETURN
           </div>
           <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
             <Activity size={16}/> Unit Economics (Per Site)
           </h3>
           <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-4xl font-bold text-slate-800">{calculations.ltvCacRatio.toFixed(1)}x</div>
                <div className="text-xs text-slate-500 font-bold">LTV : CAPEX Ratio</div>
              </div>
              <div className="text-right">
                 <div className="text-sm text-slate-400">IRR</div>
                 <div className="text-3xl font-bold text-green-600">{calculations.irr.toFixed(1)}%</div>
              </div>
           </div>
           <div className="space-y-2 text-sm border-t pt-4">
              <div className="flex justify-between">
                 <span className="text-slate-500">Payback Period</span>
                 <span className="font-bold text-slate-800">{Math.round(calculations.paybackMonths)} Months</span>
              </div>
              <div className="flex justify-between">
                 <span className="text-slate-500">Net Profit / Unit (5yr)</span>
                 <span className="font-bold text-indigo-700">{fmtUSD(calculations.ltvUSD - calculations.totalInvestmentUSD - calculations.cacUSD)}</span>
              </div>
           </div>
        </div>

        {/* PORTFOLIO SCALE */}
        <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg lg:col-span-2 flex flex-col justify-center">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                 <Building className="text-purple-400"/> Portfolio Projections (50 Units)
              </h3>
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-xs">
                 <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Solviva View
              </div>
           </div>
           
           <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                 <div className="text-sm text-slate-400 mb-1">Solviva Investment</div>
                 <div className="text-2xl font-bold text-white">{fmtUSD(calculations.portfolioInvestment)}</div>
              </div>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                 <div className="text-sm text-slate-400 mb-1">Annual Recurring Rev</div>
                 <div className="text-2xl font-bold text-green-400">{fmtUSD(calculations.portfolioAnnualRecurringRevenue)}</div>
              </div>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                 <div className="text-sm text-slate-400 mb-1">Total Net Profit</div>
                 <div className="text-2xl font-bold text-indigo-400">{fmtUSD(calculations.portfolioTotalProfit)}</div>
              </div>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                 <div className="text-sm text-slate-400 mb-1">Carbon Impact</div>
                 <div className="text-2xl font-bold text-emerald-400">{(calculations.netCo2SavedTons * inputs.portfolioUnits).toFixed(0)} t</div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* INPUTS COLUMN */}
         <div className="space-y-6">
            <Card>
               <h3 className="font-bold text-slate-700 mb-4">Baseline Assumptions</h3>
               
               <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Customer Baseline</label>
                  <div className="flex gap-2">
                     <button 
                       onClick={() => setInputs(p => ({...p, heatingType: 'lpg'}))}
                       className={`flex-1 py-2 px-3 rounded font-bold text-sm transition-all ${inputs.heatingType === 'lpg' ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
                     >
                       <Flame size={16} className="inline mr-1"/> LPG
                     </button>
                     <button 
                       onClick={() => setInputs(p => ({...p, heatingType: 'electric'}))}
                       className={`flex-1 py-2 px-3 rounded font-bold text-sm transition-all ${inputs.heatingType === 'electric' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
                     >
                       <Zap size={16} className="inline mr-1"/> Electric
                     </button>
                  </div>
               </div>

               <div className="space-y-4">
                  <Input label="Portfolio Size (Units)" type="number" value={inputs.portfolioUnits} onChange={handleChange('portfolioUnits', true)} />
                  <Input label="Daily Hot Water (L)" type="number" value={inputs.dailyLitersHotWater} onChange={handleChange('dailyLitersHotWater', true)} />
                  
                  <div className="border-t pt-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Solviva's Cost Basis</h4>
                    <Input label="Hardware Cost (From Karnot)" type="number" value={inputs.hardwareCostUSD} onChange={handleChange('hardwareCostUSD', true)} />
                    <Input label="Install Cost (Est.)" type="number" value={inputs.installationCostUSD} onChange={handleChange('installationCostUSD', true)} />
                  </div>
               </div>
            </Card>

            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
               <h4 className="font-bold text-green-800 text-sm mb-2 flex items-center gap-2">
                  <Shield size={16}/> Karnot Strategy
               </h4>
               <p className="text-xs text-green-700 leading-relaxed">
                  <strong>We act as the Technology Provider.</strong><br/>
                  We sell the hardware to Solviva at <strong>${inputs.hardwareCostUSD}</strong>/unit (including our margin). 
                  Solviva owns the asset and collects the recurring revenue shown on the right.
               </p>
            </div>
         </div>

         {/* DETAILED BREAKDOWN */}
         <div className="lg:col-span-2">
            <Card>
               <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <PieChart size={20} className="text-indigo-500"/> Solviva Revenue Waterfall (Per Unit)
               </h3>
               
               <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                        <tr>
                           <th className="px-4 py-3">Component</th>
                           <th className="px-4 py-3 text-right">Monthly (₱)</th>
                           <th className="px-4 py-3 text-right">Monthly ($)</th>
                           <th className="px-4 py-3 text-right">Annual ($)</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        <tr>
                           <td className="px-4 py-3 font-medium text-slate-600">
                               Customer Baseline ({inputs.heatingType === 'lpg' ? 'LPG' : 'Electric'})
                           </td>
                           <td className="px-4 py-3 text-right font-bold">{fmtPHP(calculations.currentMonthlyCostPHP)}</td>
                           <td className="px-4 py-3 text-right text-slate-400">-</td>
                           <td className="px-4 py-3 text-right text-slate-400">-</td>
                        </tr>
                        <tr>
                           <td className="px-4 py-3 font-medium text-red-500">New Elec Cost (Paid to Grid)</td>
                           <td className="px-4 py-3 text-right text-red-500">({fmtPHP(calculations.monthlyHeatPumpCostPHP)})</td>
                           <td className="px-4 py-3 text-right text-red-500">-</td>
                           <td className="px-4 py-3 text-right text-red-500">-</td>
                        </tr>
                        <tr className="bg-slate-50">
                           <td className="px-4 py-3 font-bold text-slate-700">Total Savings Pool</td>
                           <td className="px-4 py-3 text-right font-bold text-slate-800">
                               {fmtPHP(calculations.currentMonthlyCostPHP - calculations.monthlyHeatPumpCostPHP)}
                           </td>
                           <td className="px-4 py-3 text-right text-slate-800">-</td>
                           <td className="px-4 py-3 text-right text-slate-800">-</td>
                        </tr>
                        <tr>
                           <td className="px-4 py-3 font-medium text-green-600">Customer Share ({inputs.customerSavingsPercent}%)</td>
                           <td className="px-4 py-3 text-right text-green-600">({fmtPHP(calculations.customerSavingsPHP)})</td>
                           <td className="px-4 py-3 text-right text-green-600">-</td>
                           <td className="px-4 py-3 text-right text-green-600">-</td>
                        </tr>
                        <tr className="bg-indigo-50 font-bold">
                           <td className="px-4 py-3 text-indigo-900">Solviva Revenue ({100 - inputs.customerSavingsPercent}%)</td>
                           <td className="px-4 py-3 text-right text-indigo-700">
                               {fmtPHP(calculations.currentMonthlyCostPHP - calculations.monthlyHeatPumpCostPHP - calculations.customerSavingsPHP)}
                           </td>
                           <td className="px-4 py-3 text-right text-indigo-700">{fmtUSD(calculations.solvivaMonthlyRevenueUSD)}</td>
                           <td className="px-4 py-3 text-right text-indigo-700">{fmtUSD(calculations.totalAnnualRevenueUSD)}</td>
                        </tr>
                        <tr className="bg-emerald-50 font-bold">
                           <td className="px-4 py-3 text-emerald-900">+ Carbon Credits</td>
                           <td className="px-4 py-3 text-right text-emerald-700">-</td>
                           <td className="px-4 py-3 text-right text-emerald-700">-</td>
                           <td className="px-4 py-3 text-right text-emerald-700">{fmtUSD(calculations.annualCarbonRevenueUSD)}</td>
                        </tr>
                     </tbody>
                  </table>
               </div>
            </Card>

            <div className="grid grid-cols-2 gap-4 mt-6">
               <div className="bg-green-100 p-4 rounded-xl border border-green-200 text-center">
                  <div className="text-xs font-bold text-green-700 uppercase mb-1">Internal Rate of Return</div>
                  <div className="text-3xl font-bold text-green-800">{calculations.irr.toFixed(1)}%</div>
                  <div className="text-xs text-green-600">Solviva's Project IRR</div>
               </div>
               <div className="bg-blue-100 p-4 rounded-xl border border-blue-200 text-center">
                  <div className="text-xs font-bold text-blue-700 uppercase mb-1">MOIC</div>
                  <div className="text-3xl font-bold text-blue-800">{(calculations.ltvUSD / calculations.totalInvestmentUSD).toFixed(2)}x</div>
                  <div className="text-xs text-blue-600">Money on Invested Capital</div>
               </div>
            </div>
         </div>

      </div>
    </div>
  );
};

export default EaaSInvestorCalculator;
