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
// EaaS INVESTOR CALCULATOR (FINANCIAL MODEL)
// Focus: LTV, CAC, IRR, MOIC for 50-Unit Rollout
// ==========================================

const EaaSInvestorCalculator = () => {
  // === STATE ===
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCashFlows, setShowCashFlows] = useState(false);

  // Customer Profile Inputs
  const [inputs, setInputs] = useState({
    // Customer Type
    customerType: 'commercial', // residential, commercial, industrial
    heatingType: 'lpg',         // lpg, electric

    // Usage Defaults (Hotel/Gym profile)
    dailyLitersHotWater: 2500,  
    operatingHoursPerDay: 16,   
    lpgPricePerBottle: 1100,    // Price is rising
    electricityRate: 14.50,     // Commercial rate

    // Temperatures
    inletTemp: 25,              
    targetTemp: 55,             
    ambientTemp: 30,            

    // EaaS Pricing
    customerSavingsPercent: 20, // We take more margin, give them 20% savings

    // Contract Terms
    contractMonths: 60,         

    // Equipment Costs (USD) - "Retail" Price to Investor
    installationCostUSD: 800,
    serviceReservePercent: 5,   // Maintenance reserve

    // CAC Inputs (New!)
    salesCommissionUSD: 300,    // Paid to agent
    marketingCostUSD: 200,      // Ads/Lead gen per closed deal

    // Financing
    interestRate: 0,            // Equity funded for now
    
    // Carbon Credits
    carbonCreditPrice: 20,      // Future proofing

    // Portfolio
    portfolioUnits: 50,         // THE TARGET BATCH
  });

  // === CONSTANTS ===
  const FX_RATE = 58.0; 
  const COP_HEAT_PUMP_TYPICAL = 4.2; 
  const KWH_PER_LITER_DELTA_T = 0.001163; 
  const LPG_KWH_PER_KG = 13.8;
  const LPG_CO2_PER_KG = 3.0; 

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

    // 2. Baseline Costs (LPG)
    // LPG Burner Efficiency ~85%
    const dailyLpgKg = dailyThermalKWh / (0.85 * LPG_KWH_PER_KG);
    const lpgBottlesPerMonth = (dailyLpgKg * 30) / 11; // 11kg bottle
    const currentMonthlyCostPHP = lpgBottlesPerMonth * inputs.lpgPricePerBottle;
    
    // 3. Select Heat Pump (Sizing)
    const requiredOutputKW = dailyThermalKWh / inputs.operatingHoursPerDay;
    // Find best fit product or default
    const selectedProduct = products.find(p => (p.kW_DHW_Nominal || p.kW) >= requiredOutputKW) || {
      name: 'Karnot iHEAT R290 - 15.5kW',
      kW: 15.5,
      salesPriceUSD: 3800 // Karnot "Retail" Price to Project
    };
    
    const productPriceUSD = selectedProduct.salesPriceUSD || 3800;
    const productKW = selectedProduct.kW || 15.5;

    // 4. New Operating Cost (Electricity)
    const dailyHeatPumpKwh = dailyThermalKWh / COP_HEAT_PUMP_TYPICAL;
    const monthlyHeatPumpCostPHP = (dailyHeatPumpKwh * 30) * inputs.electricityRate;

    // 5. Margin & EaaS Fee
    const grossSavingsPHP = currentMonthlyCostPHP - monthlyHeatPumpCostPHP;
    const customerSavingsPHP = currentMonthlyCostPHP * (inputs.customerSavingsPercent / 100);
    
    // The "Spread" (Karnot Revenue)
    const karnotMonthlyRevenuePHP = grossSavingsPHP - customerSavingsPHP;
    const karnotMonthlyRevenueUSD = karnotMonthlyRevenuePHP / FX_RATE;
    const karnotAnnualRevenueUSD = karnotMonthlyRevenueUSD * 12;

    // 6. Carbon Revenue
    const annualLpgKg = dailyLpgKg * 365;
    const annualCo2Tons = (annualLpgKg * LPG_CO2_PER_KG) / 1000;
    const annualCarbonRevenueUSD = annualCo2Tons * inputs.carbonCreditPrice;

    // 7. Unit Economics (Per Unit)
    const tankCostUSD = 1200; // Est. 500L Tank
    const capexUSD = productPriceUSD + tankCostUSD + inputs.installationCostUSD;
    const reserveUSD = capexUSD * (inputs.serviceReservePercent / 100);
    const totalInvestmentUSD = capexUSD + reserveUSD; // THIS IS THE INVESTOR'S COST

    const cacUSD = inputs.salesCommissionUSD + inputs.marketingCostUSD;

    const totalAnnualRevenueUSD = karnotAnnualRevenueUSD + annualCarbonRevenueUSD;
    const annualOpexUSD = 100; // Monitoring + Insurance
    const netAnnualCashFlowUSD = totalAnnualRevenueUSD - annualOpexUSD;

    // 8. LTV & Payback
    const contractYears = inputs.contractMonths / 12;
    const ltvUSD = (netAnnualCashFlowUSD * contractYears); // Gross Profit over contract
    const netProfitUSD = ltvUSD - totalInvestmentUSD - cacUSD;
    
    const paybackMonths = (totalInvestmentUSD / (netAnnualCashFlowUSD/12));
    const roi = (netProfitUSD / totalInvestmentUSD) * 100;
    const ltvCacRatio = ltvUSD / (totalInvestmentUSD + cacUSD); // Conservative LTV:CAC (counting capex as cost)

    // 9. Portfolio (50 Units)
    const portfolioInvestment = totalInvestmentUSD * inputs.portfolioUnits;
    const portfolioAnnualRecurringRevenue = totalAnnualRevenueUSD * inputs.portfolioUnits; // ARR
    const portfolioTotalProfit = netProfitUSD * inputs.portfolioUnits;

    // IRR Approx
    const irr = ((Math.pow((ltvUSD / totalInvestmentUSD), (1/contractYears))) - 1) * 100;

    return {
      dailyLpgKg, lpgBottlesPerMonth, currentMonthlyCostPHP,
      monthlyHeatPumpCostPHP, customerSavingsPHP,
      karnotMonthlyRevenueUSD, totalAnnualRevenueUSD,
      totalInvestmentUSD, cacUSD, ltvUSD,
      paybackMonths, roi, ltvCacRatio, irr,
      portfolioInvestment, portfolioAnnualRecurringRevenue, portfolioTotalProfit,
      annualCo2Tons
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
              <h1 className="text-3xl font-bold">Project "Cosmos" Financial Model</h1>
              <p className="text-slate-400">50-Unit Commercial Heat Pump Rollout | Series Seed / Bridge</p>
            </div>
          </div>
          <div className="text-right">
             <div className="text-xs font-bold text-slate-500 uppercase">Target Raise</div>
             <div className="text-3xl font-bold text-green-400">$250,000</div>
          </div>
        </div>
      </div>

      {/* === THE "MONEY SLIDE" (UNIT ECONOMICS) === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LTV:CAC CARD - THE MOST IMPORTANT METRIC */}
        <div className="bg-white p-6 rounded-xl border-2 border-indigo-100 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
             VC METRIC
           </div>
           <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
             <Activity size={16}/> Unit Economics
           </h3>
           <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-4xl font-bold text-slate-800">{calculations.ltvCacRatio.toFixed(1)}x</div>
                <div className="text-xs text-slate-500 font-bold">LTV : CAPEX Ratio</div>
              </div>
              <div className="text-right">
                 <div className="text-sm text-slate-400">Payback</div>
                 <div className="text-xl font-bold text-green-600">{Math.round(calculations.paybackMonths)} Mo</div>
              </div>
           </div>
           <div className="space-y-2 text-sm border-t pt-4">
              <div className="flex justify-between">
                 <span className="text-slate-500">Lifetime Value (5yr)</span>
                 <span className="font-bold text-green-700">{fmtUSD(calculations.ltvUSD)}</span>
              </div>
              <div className="flex justify-between">
                 <span className="text-slate-500">Total CAPEX + CAC</span>
                 <span className="font-bold text-red-700">{fmtUSD(calculations.totalInvestmentUSD + calculations.cacUSD)}</span>
              </div>
              <div className="flex justify-between font-bold bg-indigo-50 p-2 rounded">
                 <span className="text-indigo-900">Net Profit / Unit</span>
                 <span className="text-indigo-700">{fmtUSD(calculations.ltvUSD - calculations.totalInvestmentUSD - calculations.cacUSD)}</span>
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
                 <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Live Model
              </div>
           </div>
           
           <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                 <div className="text-sm text-slate-400 mb-1">Total Deployment</div>
                 <div className="text-2xl font-bold">{fmtUSD(calculations.portfolioInvestment)}</div>
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
                 <div className="text-2xl font-bold text-emerald-400">{(calculations.annualCo2Tons * inputs.portfolioUnits).toFixed(0)} t</div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* INPUTS COLUMN */}
         <div className="space-y-6">
            <Card>
               <h3 className="font-bold text-slate-700 mb-4">Input Assumptions</h3>
               <div className="space-y-4">
                  <Input label="Portfolio Size (Units)" type="number" value={inputs.portfolioUnits} onChange={handleChange('portfolioUnits', true)} />
                  <Input label="LPG Price (₱/Bottle)" type="number" value={inputs.lpgPricePerBottle} onChange={handleChange('lpgPricePerBottle', true)} />
                  <Input label="Install Cost ($)" type="number" value={inputs.installationCostUSD} onChange={handleChange('installationCostUSD', true)} />
                  
                  <div className="border-t pt-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Acquisition Costs (CAC)</h4>
                    <div className="grid grid-cols-2 gap-2">
                       <Input label="Sales Comm ($)" type="number" value={inputs.salesCommissionUSD} onChange={handleChange('salesCommissionUSD', true)} />
                       <Input label="Marketing ($)" type="number" value={inputs.marketingCostUSD} onChange={handleChange('marketingCostUSD', true)} />
                    </div>
                  </div>
               </div>
            </Card>

            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
               <h4 className="font-bold text-yellow-800 text-sm mb-2 flex items-center gap-2">
                  <Shield size={16}/> Business Model Note
               </h4>
               <p className="text-xs text-yellow-700 leading-relaxed">
                  This model assumes <strong>Karnot Inc.</strong> acts as the Equipment Supplier to the <strong>Project SPV</strong>. 
                  The "Investment Cost" shown here is the SPV's buy price.
                  <br/><br/>
                  <strong>Hidden Margin:</strong> Karnot retains approx 50% margin on the hardware sale <em>before</em> the project starts. This margin is NOT shown in this investor view.
               </p>
            </div>
         </div>

         {/* DETAILED BREAKDOWN */}
         <div className="lg:col-span-2">
            <Card>
               <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <PieChart size={20} className="text-indigo-500"/> Revenue & Cash Flow Structure (Per Unit)
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
                           <td className="px-4 py-3 font-medium text-slate-600">Customer Baseline (LPG)</td>
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
                        <tr>
                           <td className="px-4 py-3 font-medium text-green-600">Customer Savings (Guaranteed)</td>
                           <td className="px-4 py-3 text-right text-green-600">{fmtPHP(calculations.customerSavingsPHP)}</td>
                           <td className="px-4 py-3 text-right text-green-600">-</td>
                           <td className="px-4 py-3 text-right text-green-600">-</td>
                        </tr>
                        <tr className="bg-indigo-50 font-bold">
                           <td className="px-4 py-3 text-indigo-900">Net EaaS Revenue (To Karnot)</td>
                           <td className="px-4 py-3 text-right text-indigo-700">{fmtPHP(calculations.currentMonthlyCostPHP - calculations.monthlyHeatPumpCostPHP - calculations.customerSavingsPHP)}</td>
                           <td className="px-4 py-3 text-right text-indigo-700">{fmtUSD(calculations.karnotMonthlyRevenueUSD)}</td>
                           <td className="px-4 py-3 text-right text-indigo-700">{fmtUSD(calculations.karnotMonthlyRevenueUSD * 12)}</td>
                        </tr>
                        <tr className="bg-emerald-50 font-bold">
                           <td className="px-4 py-3 text-emerald-900">+ Carbon Revenue</td>
                           <td className="px-4 py-3 text-right text-emerald-700">-</td>
                           <td className="px-4 py-3 text-right text-emerald-700">-</td>
                           <td className="px-4 py-3 text-right text-emerald-700">{fmtUSD(calculations.annualCo2Tons * inputs.carbonCreditPrice)}</td>
                        </tr>
                     </tbody>
                  </table>
               </div>
            </Card>

            <div className="grid grid-cols-2 gap-4 mt-6">
               <div className="bg-green-100 p-4 rounded-xl border border-green-200 text-center">
                  <div className="text-xs font-bold text-green-700 uppercase mb-1">Internal Rate of Return</div>
                  <div className="text-3xl font-bold text-green-800">{calculations.irr.toFixed(1)}%</div>
                  <div className="text-xs text-green-600">Unlevered IRR</div>
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
