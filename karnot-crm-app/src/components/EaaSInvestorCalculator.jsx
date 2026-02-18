import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Card, Input, Button } from '../data/constants.jsx';
import {
  Briefcase, TrendingUp, DollarSign, Users, Building, Leaf,
  Zap, BarChart3, Target, CheckCircle, ArrowRight,
  Flame, Droplets, ThermometerSun, Shield, PieChart, Activity,
  Home, AlertTriangle
} from 'lucide-react';

// ==========================================
// RESIDENTIAL EaaS INVESTOR PITCH CALCULATOR
// Focus: Karnot AquaHERO R290 (200L / 300L)
// Model: Solviva buys & owns hardware,
//        splits savings with homeowner (75/25)
// Portfolio: 10 → 500 units slider + table
// ==========================================

const FX_RATE        = 58.0;
const COP_ELEC_HTR   = 0.95;
const KWH_PER_L_K    = 0.001163;
const LPG_KWH_PER_KG = 13.8;
const LPG_EFF        = 0.85;
const LPG_CO2_KG     = 3.0;
const GRID_CO2_KWH   = 0.71;

const PORTFOLIO_STEPS = [10, 25, 50, 75, 100, 150, 200, 300, 400, 500];

const EaaSInvestorCalculator = () => {

  const [products, setProducts]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [inputs, setInputs] = useState({
    heatingType:         'electric',
    electricityRate:     12.50,
    lpgPricePerBottle:   1100,
    dailyLiters:         300,
    inletTemp:           25,
    targetTemp:          55,
    customerSavingsPct:  25,
    contractMonths:      60,
    unitPriceUSD:        2544,
    installCostUSD:      400,
    annualOpexUSD:       80,
    serviceReservePct:   3,
    salesCommUSD:        150,
    marketingUSD:        100,
    carbonCreditUSD:     25,
    portfolioUnits:      50,
  });

  useEffect(() => {
    const fetchProducts = async () => {
      const user = getAuth().currentUser;
      if (!user) { setLoading(false); return; }
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'products'));
        const all  = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const aquaHero = all
          .filter(p => {
            const isR290 = (p.Refrigerant || p.refrigerant || '').toUpperCase() === 'R290';
            const hasDHW = parseFloat(p.kW_DHW_Nominal) > 0;
            return isR290 && hasDHW;
          })
          .sort((a, b) => parseFloat(a.salesPriceUSD) - parseFloat(b.salesPriceUSD));
        setProducts(aquaHero);
        const best = aquaHero.find(p => parseFloat(p.salesPriceUSD) >= 2500) || aquaHero[0];
        if (best) {
          setSelectedProduct(best);
          setInputs(prev => ({ ...prev, unitPriceUSD: parseFloat(best.salesPriceUSD) || prev.unitPriceUSD }));
        }
      } catch (e) {
        console.error('EaaS product load error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const fmt    = (n, d = 0) => (+n || 0).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
  const fmtUSD = n => `$${fmt(n)}`;
  const fmtPHP = n => `₱${fmt(n)}`;

  const calc = useMemo(() => {
    const p       = inputs;
    const deltaT  = p.targetTemp - p.inletTemp;
    const dailyTh = p.dailyLiters * deltaT * KWH_PER_L_K;
    const cop     = selectedProduct ? parseFloat(selectedProduct.COP_DHW || selectedProduct.cop || 4.0) : 4.0;

    const hpDailyKWh       = dailyTh / cop;
    const hpMonthlyKWh     = hpDailyKWh * 30;
    const hpMonthlyCostPHP = hpMonthlyKWh * p.electricityRate;

    let baselineMonthlyCostPHP = 0;
    let baselineCO2Annual      = 0;

    if (p.heatingType === 'lpg') {
      const dailyLpgKg       = dailyTh / (LPG_EFF * LPG_KWH_PER_KG);
      const bottlesPerMonth  = (dailyLpgKg * 30) / 11;
      baselineMonthlyCostPHP = bottlesPerMonth * p.lpgPricePerBottle;
      baselineCO2Annual      = (dailyLpgKg * 365 * LPG_CO2_KG) / 1000;
    } else {
      const elecDailyKWh     = dailyTh / COP_ELEC_HTR;
      baselineMonthlyCostPHP = (elecDailyKWh * 30) * p.electricityRate;
      baselineCO2Annual      = (elecDailyKWh * 365 * GRID_CO2_KWH) / 1000;
    }

    const hpCO2Annual        = (hpDailyKWh * 365 * GRID_CO2_KWH) / 1000;
    const netCO2SavedTons    = Math.max(0, baselineCO2Annual - hpCO2Annual);
    const annualCarbonRevUSD = netCO2SavedTons * p.carbonCreditUSD;

    const savingsPoolPHP     = baselineMonthlyCostPHP - hpMonthlyCostPHP;
    const customerSavingsPHP = savingsPoolPHP * (p.customerSavingsPct / 100);
    const solvivaRevenuePHP  = savingsPoolPHP - customerSavingsPHP;
    const solvivaMonthlyUSD  = solvivaRevenuePHP / FX_RATE;
    const solvivaAnnualUSD   = (solvivaMonthlyUSD * 12) + annualCarbonRevUSD;

    const capexUSD           = p.unitPriceUSD + p.installCostUSD;
    const reserveUSD         = capexUSD * (p.serviceReservePct / 100);
    const totalInvestmentUSD = capexUSD + reserveUSD;
    const cacUSD             = p.salesCommUSD + p.marketingUSD;

    const contractYears = p.contractMonths / 12;
    const netAnnualUSD  = solvivaAnnualUSD - p.annualOpexUSD;
    const ltvUSD        = netAnnualUSD * contractYears;
    const netProfitUSD  = ltvUSD - totalInvestmentUSD - cacUSD;
    const roi           = totalInvestmentUSD > 0 ? (netProfitUSD / totalInvestmentUSD) * 100 : 0;
    const paybackMonths = netAnnualUSD > 0 ? totalInvestmentUSD / (netAnnualUSD / 12) : 999;
    const moic          = totalInvestmentUSD > 0 ? ltvUSD / totalInvestmentUSD : 0;
    const irr           = totalInvestmentUSD > 0 && ltvUSD > 0 && contractYears > 0
      ? ((Math.pow(ltvUSD / totalInvestmentUSD, 1 / contractYears)) - 1) * 100 : 0;

    const eaasFeeMonthlyPHP  = solvivaRevenuePHP;
    const customerNewBillPHP = hpMonthlyCostPHP + eaasFeeMonthlyPHP;
    const customerSavingsPct = baselineMonthlyCostPHP > 0
      ? ((baselineMonthlyCostPHP - customerNewBillPHP) / baselineMonthlyCostPHP) * 100 : 0;

    const portfolio = PORTFOLIO_STEPS.map(n => ({
      units:      n,
      investment: totalInvestmentUSD * n,
      arr:        solvivaAnnualUSD * n,
      netAnnual:  netAnnualUSD * n,
      ltv:        ltvUSD * n,
      netProfit:  netProfitUSD * n,
      co2Saved:   netCO2SavedTons * n,
    }));

    return {
      dailyTh, hpDailyKWh, hpMonthlyKWh, hpMonthlyCostPHP, cop,
      baselineMonthlyCostPHP,
      netCO2SavedTons, annualCarbonRevUSD,
      savingsPoolPHP, customerSavingsPHP, solvivaRevenuePHP,
      solvivaMonthlyUSD, solvivaAnnualUSD,
      capexUSD, reserveUSD, totalInvestmentUSD, cacUSD,
      netAnnualUSD, ltvUSD, netProfitUSD, roi,
      paybackMonths, moic, irr,
      eaasFeeMonthlyPHP, customerNewBillPHP, customerSavingsPct,
      portfolio,
    };
  }, [inputs, selectedProduct]);

  const handleChange = (field, asNumber = false) => (e) => {
    const v = asNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    setInputs(prev => ({ ...prev, [field]: v }));
  };

  const handleProductSelect = (prod) => {
    setSelectedProduct(prod);
    setInputs(prev => ({ ...prev, unitPriceUSD: parseFloat(prod.salesPriceUSD) || prev.unitPriceUSD }));
  };

  const portfolioRow = calc.portfolio.find(r => r.units === inputs.portfolioUnits)
    || calc.portfolio[calc.portfolio.length - 1];

  if (loading) return (
    <div className="p-10 text-center">
      <div className="text-xl font-bold mb-2">Loading Product Data...</div>
      <div className="text-sm text-slate-500">Fetching AquaHERO catalog from Firestore</div>
    </div>
  );

  if (products.length === 0) return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-8 text-center">
        <AlertTriangle size={48} className="text-red-600 mx-auto mb-4"/>
        <h2 className="text-xl font-bold text-red-900 mb-2">No AquaHERO Products Found</h2>
        <p className="text-red-700">Add R290 products with kW_DHW_Nominal &gt; 0 in Product Manager.</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 font-sans text-slate-800">

      {/* HEADER */}
      <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
              <Home size={32}/>
            </div>
            <div>
              <h1 className="text-3xl font-bold">Residential EaaS Investor Pitch</h1>
              <p className="text-slate-400 mt-1">Karnot AquaHERO R290 · Energy-as-a-Service · 10 → 500 Units</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-slate-500 uppercase">500-Unit Net Profit</div>
            <div className="text-3xl font-bold text-green-400">
              {fmtUSD(calc.portfolio[calc.portfolio.length - 1]?.netProfit)}
            </div>
            <div className="text-xs text-slate-400">over {inputs.contractMonths} months</div>
          </div>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* Product selector */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-5">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Select AquaHERO Unit</h3>
          <div className="space-y-3">
            {products.map(prod => {
              const isSelected = selectedProduct?.id === prod.id;
              const name = prod.name || prod['Product Name'] || prod.id;
              return (
                <button
                  key={prod.id}
                  onClick={() => handleProductSelect(prod)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-sm text-slate-800">{name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {parseFloat(prod.kW_DHW_Nominal || 0)} kW DHW · COP {parseFloat(prod.COP_DHW || prod.cop || 0)}
                  </div>
                  <div className={`text-lg font-bold mt-1 ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {fmtUSD(parseFloat(prod.salesPriceUSD))}
                  </div>
                  {isSelected && (
                    <div className="text-[10px] text-indigo-500 mt-0.5 flex items-center gap-1">
                      <CheckCircle size={10}/> Live DB price
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 bg-green-50 p-3 rounded-lg border border-green-200 text-xs text-green-800">
            <strong>Live DB:</strong> Prices and COP pulled from Firestore product catalog.
          </div>
        </div>

        {/* IRR */}
        <div className="bg-white p-6 rounded-xl border-2 border-indigo-100 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
            <Activity size={14}/> IRR (Per Unit)
          </div>
          <div>
            <div className={`text-5xl font-bold ${calc.irr > 15 ? 'text-green-600' : calc.irr > 8 ? 'text-yellow-600' : 'text-red-600'}`}>
              {calc.irr.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400 mt-1">Internal Rate of Return</div>
          </div>
          <div className="text-sm space-y-1 border-t pt-3 mt-3">
            <div className="flex justify-between"><span className="text-slate-500">Payback</span><span className="font-bold">{Math.round(calc.paybackMonths)} mo</span></div>
            <div className="flex justify-between"><span className="text-slate-500">MOIC</span><span className="font-bold text-indigo-700">{calc.moic.toFixed(2)}x</span></div>
          </div>
        </div>

        {/* Monthly revenue */}
        <div className="bg-white p-6 rounded-xl border-2 border-green-100 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
            <DollarSign size={14}/> Monthly Revenue (Per Unit)
          </div>
          <div>
            <div className="text-5xl font-bold text-green-700">{fmtUSD(calc.solvivaMonthlyUSD)}</div>
            <div className="text-xs text-slate-400 mt-1">Solviva recurring EaaS fee</div>
          </div>
          <div className="text-sm space-y-1 border-t pt-3 mt-3">
            <div className="flex justify-between"><span className="text-slate-500">Annual (incl. carbon)</span><span className="font-bold text-green-700">{fmtUSD(calc.solvivaAnnualUSD)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">{inputs.contractMonths}mo LTV</span><span className="font-bold">{fmtUSD(calc.ltvUSD)}</span></div>
          </div>
        </div>

        {/* Customer saving */}
        <div className="bg-white p-6 rounded-xl border-2 border-blue-100 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
            <Home size={14}/> Customer Benefit
          </div>
          <div>
            <div className="text-5xl font-bold text-blue-700">{calc.customerSavingsPct.toFixed(0)}%</div>
            <div className="text-xs text-slate-400 mt-1">Bill reduction for homeowner</div>
          </div>
          <div className="text-sm space-y-1 border-t pt-3 mt-3">
            <div className="flex justify-between"><span className="text-slate-500">Old bill</span><span className="font-bold text-red-600">{fmtPHP(calc.baselineMonthlyCostPHP)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">New bill</span><span className="font-bold text-green-700">{fmtPHP(calc.customerNewBillPHP)}</span></div>
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* INPUTS */}
        <div className="space-y-5">

          <Card className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4">Household Profile</h3>
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Current Heating Baseline</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setInputs(p => ({...p, heatingType: 'electric'}))}
                  className={`flex-1 py-2 px-3 rounded font-bold text-sm transition-all ${inputs.heatingType === 'electric' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
                >
                  <Zap size={14} className="inline mr-1"/> Electric
                </button>
                <button
                  onClick={() => setInputs(p => ({...p, heatingType: 'lpg'}))}
                  className={`flex-1 py-2 px-3 rounded font-bold text-sm transition-all ${inputs.heatingType === 'lpg' ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
                >
                  <Flame size={14} className="inline mr-1"/> LPG
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <Input label="Daily Hot Water (L)" type="number" value={inputs.dailyLiters} onChange={handleChange('dailyLiters', true)} />
              <Input label="Electricity Rate (₱/kWh)" type="number" step="0.5" value={inputs.electricityRate} onChange={handleChange('electricityRate', true)} />
              {inputs.heatingType === 'lpg' && (
                <Input label="LPG Bottle Price (₱/11kg)" type="number" value={inputs.lpgPricePerBottle} onChange={handleChange('lpgPricePerBottle', true)} />
              )}
              <div className="grid grid-cols-2 gap-3">
                <Input label="Inlet Temp (°C)" type="number" value={inputs.inletTemp} onChange={handleChange('inletTemp', true)} />
                <Input label="Target Temp (°C)" type="number" value={inputs.targetTemp} onChange={handleChange('targetTemp', true)} />
              </div>
            </div>
          </Card>

          <Card className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4">EaaS Contract Terms</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">
                  Customer Share: {inputs.customerSavingsPct}%
                  <span className="text-slate-400 font-normal ml-1">(Solviva keeps {100 - inputs.customerSavingsPct}%)</span>
                </label>
                <input type="range" min="10" max="50" step="5" value={inputs.customerSavingsPct} onChange={handleChange('customerSavingsPct', true)} className="w-full accent-indigo-600"/>
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5"><span>10% to customer</span><span>50% to customer</span></div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Contract Term</label>
                <select value={inputs.contractMonths} onChange={handleChange('contractMonths', true)} className="w-full p-2 border border-slate-300 rounded text-sm">
                  <option value="36">36 months (3 yr)</option>
                  <option value="48">48 months (4 yr)</option>
                  <option value="60">60 months (5 yr)</option>
                  <option value="84">84 months (7 yr)</option>
                  <option value="120">120 months (10 yr)</option>
                </select>
              </div>
              <Input label="Installation Cost / Unit ($)" type="number" value={inputs.installCostUSD} onChange={handleChange('installCostUSD', true)} />
              <Input label="Annual Opex / Unit ($)" type="number" value={inputs.annualOpexUSD} onChange={handleChange('annualOpexUSD', true)} />
              <Input label="Carbon Credit Price ($/t CO₂)" type="number" value={inputs.carbonCreditUSD} onChange={handleChange('carbonCreditUSD', true)} />
            </div>
          </Card>

          <Card className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-3">Portfolio Slider</h3>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                Units: <span className="text-indigo-700 text-base">{inputs.portfolioUnits}</span>
              </label>
              <input type="range" min="10" max="500" step="10" value={inputs.portfolioUnits} onChange={handleChange('portfolioUnits', true)} className="w-full accent-green-600"/>
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5"><span>10</span><span>500</span></div>
            </div>
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-600">Investment:</span><span className="font-bold">{fmtUSD(portfolioRow.investment)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Annual Revenue:</span><span className="font-bold text-green-700">{fmtUSD(portfolioRow.arr)}</span></div>
              <div className="flex justify-between border-t border-green-200 pt-1 mt-1">
                <span className="font-bold text-green-900">Net Profit ({inputs.contractMonths}mo):</span>
                <span className="font-bold text-xl text-green-900">{fmtUSD(portfolioRow.netProfit)}</span>
              </div>
            </div>
          </Card>

          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
            <h4 className="font-bold text-indigo-800 text-sm mb-2 flex items-center gap-2"><Shield size={16}/> Karnot Role</h4>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Karnot acts as <strong>Technology Provider</strong> — we sell the AquaHERO at{' '}
              <strong>{fmtUSD(inputs.unitPriceUSD)}</strong>/unit. Solviva owns the asset and collects all recurring EaaS revenue.
            </p>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:col-span-2 space-y-6">

          {/* Revenue waterfall */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <PieChart size={20} className="text-indigo-500"/> Revenue Waterfall — Per Unit, Per Month
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Component</th>
                    <th className="px-4 py-3 text-right">PHP / mo</th>
                    <th className="px-4 py-3 text-right">USD / mo</th>
                    <th className="px-4 py-3 text-right">USD / yr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 text-slate-600">Baseline — {inputs.heatingType === 'lpg' ? 'LPG cylinders' : 'Electric storage heater'}</td>
                    <td className="px-4 py-3 text-right font-bold">{fmtPHP(calc.baselineMonthlyCostPHP)}</td>
                    <td className="px-4 py-3 text-right text-slate-400">{fmtUSD(calc.baselineMonthlyCostPHP / FX_RATE)}</td>
                    <td className="px-4 py-3 text-right text-slate-400">{fmtUSD(calc.baselineMonthlyCostPHP / FX_RATE * 12)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-red-500">Heat pump electricity (paid to grid)</td>
                    <td className="px-4 py-3 text-right text-red-500">({fmtPHP(calc.hpMonthlyCostPHP)})</td>
                    <td className="px-4 py-3 text-right text-red-400">({fmtUSD(calc.hpMonthlyCostPHP / FX_RATE)})</td>
                    <td className="px-4 py-3 text-right text-red-400">({fmtUSD(calc.hpMonthlyCostPHP / FX_RATE * 12)})</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="px-4 py-3 text-slate-700">Total Savings Pool</td>
                    <td className="px-4 py-3 text-right">{fmtPHP(calc.savingsPoolPHP)}</td>
                    <td className="px-4 py-3 text-right">{fmtUSD(calc.savingsPoolPHP / FX_RATE)}</td>
                    <td className="px-4 py-3 text-right">{fmtUSD(calc.savingsPoolPHP / FX_RATE * 12)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-green-600">Customer keeps ({inputs.customerSavingsPct}%) — bill discount</td>
                    <td className="px-4 py-3 text-right text-green-600">({fmtPHP(calc.customerSavingsPHP)})</td>
                    <td className="px-4 py-3 text-right text-green-500">({fmtUSD(calc.customerSavingsPHP / FX_RATE)})</td>
                    <td className="px-4 py-3 text-right text-green-500">({fmtUSD(calc.customerSavingsPHP / FX_RATE * 12)})</td>
                  </tr>
                  <tr className="bg-indigo-50 font-bold">
                    <td className="px-4 py-3 text-indigo-900">Solviva EaaS Fee ({100 - inputs.customerSavingsPct}%)</td>
                    <td className="px-4 py-3 text-right text-indigo-700">{fmtPHP(calc.solvivaRevenuePHP)}</td>
                    <td className="px-4 py-3 text-right text-indigo-700">{fmtUSD(calc.solvivaMonthlyUSD)}</td>
                    <td className="px-4 py-3 text-right text-indigo-700">{fmtUSD(calc.solvivaMonthlyUSD * 12)}</td>
                  </tr>
                  <tr className="bg-emerald-50 font-bold">
                    <td className="px-4 py-3 text-emerald-800">+ Carbon Credits ({calc.netCO2SavedTons.toFixed(2)} t/yr)</td>
                    <td className="px-4 py-3 text-right text-emerald-500">—</td>
                    <td className="px-4 py-3 text-right text-emerald-500">—</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{fmtUSD(calc.annualCarbonRevUSD)}</td>
                  </tr>
                  <tr className="bg-indigo-100 font-bold text-base border-t-2 border-indigo-300">
                    <td className="px-4 py-3 text-indigo-900">Total Solviva Annual Revenue</td>
                    <td className="px-4 py-3 text-right text-indigo-900">—</td>
                    <td className="px-4 py-3 text-right text-indigo-900">—</td>
                    <td className="px-4 py-3 text-right text-indigo-900 text-lg">{fmtUSD(calc.solvivaAnnualUSD)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-5">
              <div className="bg-white border-2 border-slate-200 p-4 rounded-lg text-sm space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Solviva Investment / Unit</div>
                <div className="flex justify-between"><span className="text-slate-500">Unit price (Karnot)</span><span className="font-bold">{fmtUSD(inputs.unitPriceUSD)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Installation</span><span className="font-bold">{fmtUSD(inputs.installCostUSD)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Service reserve ({inputs.serviceReservePct}%)</span><span className="font-bold">{fmtUSD(calc.reserveUSD)}</span></div>
                <div className="flex justify-between border-t pt-2 mt-2 font-bold"><span>Total CAPEX</span><span className="text-indigo-700">{fmtUSD(calc.totalInvestmentUSD)}</span></div>
              </div>
              <div className="bg-white border-2 border-slate-200 p-4 rounded-lg text-sm space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Returns / Unit</div>
                <div className="flex justify-between"><span className="text-slate-500">Net annual cash flow</span><span className="font-bold text-green-700">{fmtUSD(calc.netAnnualUSD)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Contract LTV ({inputs.contractMonths}mo)</span><span className="font-bold">{fmtUSD(calc.ltvUSD)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Net profit / unit</span><span className="font-bold text-indigo-700">{fmtUSD(calc.netProfitUSD)}</span></div>
                <div className="flex justify-between border-t pt-2 mt-2 font-bold">
                  <span>ROI</span>
                  <span className={`text-lg ${calc.roi > 50 ? 'text-green-600' : calc.roi > 20 ? 'text-yellow-600' : 'text-red-600'}`}>{calc.roi.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* PORTFOLIO SCALE TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-700 mb-1 flex items-center gap-2">
              <BarChart3 size={20} className="text-green-500"/> Portfolio Scale — 10 to 500 Units
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              All USD · {inputs.contractMonths}-month contracts · {inputs.heatingType === 'electric' ? 'Electric' : 'LPG'} baseline ·
              Customer saves {inputs.customerSavingsPct}% · Click any row to select
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Units</th>
                    <th className="px-3 py-2 text-right">Investment</th>
                    <th className="px-3 py-2 text-right">ARR</th>
                    <th className="px-3 py-2 text-right">Net Annual</th>
                    <th className="px-3 py-2 text-right">LTV</th>
                    <th className="px-3 py-2 text-right">Net Profit</th>
                    <th className="px-3 py-2 text-right">CO₂ t/yr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calc.portfolio.map(row => {
                    const hl = row.units === inputs.portfolioUnits;
                    return (
                      <tr
                        key={row.units}
                        onClick={() => setInputs(p => ({...p, portfolioUnits: row.units}))}
                        className={`cursor-pointer transition-colors ${hl ? 'bg-indigo-50 font-bold' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-3 py-2.5">
                          <span className={`flex items-center gap-1 ${hl ? 'text-indigo-700' : ''}`}>
                            {hl && <ArrowRight size={12} className="text-indigo-500"/>}{row.units}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono">{fmtUSD(row.investment)}</td>
                        <td className={`px-3 py-2.5 text-right font-mono ${hl ? 'text-green-700' : 'text-green-600'}`}>{fmtUSD(row.arr)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{fmtUSD(row.netAnnual)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{fmtUSD(row.ltv)}</td>
                        <td className={`px-3 py-2.5 text-right font-mono font-bold ${row.netProfit > 0 ? 'text-indigo-700' : 'text-red-500'}`}>
                          {fmtUSD(row.netProfit)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-emerald-600">{row.co2Saved.toFixed(0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bar chart */}
            <div className="mt-6">
              <div className="text-xs font-bold text-slate-500 uppercase mb-3">Net Profit Visualised</div>
              <div className="space-y-2">
                {calc.portfolio.map(row => {
                  const maxP = calc.portfolio[calc.portfolio.length - 1].netProfit || 1;
                  const pct  = Math.max(0, (row.netProfit / maxP) * 100);
                  const hl   = row.units === inputs.portfolioUnits;
                  return (
                    <div
                      key={row.units}
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => setInputs(p => ({...p, portfolioUnits: row.units}))}
                    >
                      <div className="w-10 text-right text-xs font-mono text-slate-400">{row.units}</div>
                      <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                        <div
                          className={`h-full rounded-full flex items-center px-2 transition-all ${hl ? 'bg-indigo-600' : 'bg-indigo-300'}`}
                          style={{ width: `${Math.max(pct, 1.5)}%` }}
                        >
                          {pct > 18 && <span className="text-white text-[10px] font-bold whitespace-nowrap">{fmtUSD(row.netProfit)}</span>}
                        </div>
                      </div>
                      {pct <= 18 && <div className="text-xs font-bold text-indigo-700 w-20">{fmtUSD(row.netProfit)}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* IRR / MOIC */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-100 p-5 rounded-xl border border-green-200 text-center">
              <div className="text-xs font-bold text-green-700 uppercase mb-1">IRR (Per Unit)</div>
              <div className="text-4xl font-bold text-green-800">{calc.irr.toFixed(1)}%</div>
              <div className="text-xs text-green-600 mt-1">Internal Rate of Return</div>
            </div>
            <div className="bg-blue-100 p-5 rounded-xl border border-blue-200 text-center">
              <div className="text-xs font-bold text-blue-700 uppercase mb-1">MOIC</div>
              <div className="text-4xl font-bold text-blue-800">{calc.moic.toFixed(2)}x</div>
              <div className="text-xs text-blue-600 mt-1">Money on Invested Capital</div>
            </div>
          </div>

          {/* CUSTOMER PITCH */}
          <div className="bg-white rounded-xl border-2 border-blue-200 p-6">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Home size={18} className="text-blue-500"/> What the Homeowner Sees
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="text-xs text-red-600 uppercase font-bold mb-1">Old Monthly Bill</div>
                <div className="text-2xl font-bold text-red-800">{fmtPHP(calc.baselineMonthlyCostPHP)}</div>
                <div className="text-xs text-red-500 mt-1">{inputs.heatingType === 'electric' ? 'Electric storage heater' : 'LPG cylinders'}</div>
              </div>
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="text-xs text-green-600 uppercase font-bold mb-1">New Monthly Bill</div>
                <div className="text-2xl font-bold text-green-800">{fmtPHP(calc.customerNewBillPHP)}</div>
                <div className="text-xs text-green-500 mt-1">HP electricity + EaaS fee</div>
              </div>
              <div className="bg-blue-50 border-2 border-blue-400 p-4 rounded-lg">
                <div className="text-xs text-blue-700 uppercase font-bold mb-1">Monthly Saving</div>
                <div className="text-2xl font-bold text-blue-900">{fmtPHP(calc.baselineMonthlyCostPHP - calc.customerNewBillPHP)}</div>
                <div className="text-xs text-blue-600 mt-1">{calc.customerSavingsPct.toFixed(0)}% off old bill</div>
              </div>
            </div>
            <div className="mt-4 bg-slate-50 p-4 rounded-lg text-sm space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0"/>
                <span><strong>Zero upfront cost</strong> — unit installed free, just pay lower monthly bill</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0"/>
                <span><strong>Unlimited hot water</strong> — {selectedProduct ? (selectedProduct.name || selectedProduct['Product Name']) : 'AquaHERO'} delivers {inputs.dailyLiters}L/day at up to 65°C</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0"/>
                <span><strong>PFAS-free R290</strong> — natural refrigerant, zero forever chemicals</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0"/>
                <span><strong>Carbon reduction</strong> — saves {calc.netCO2SavedTons.toFixed(2)} tonnes CO₂/year per household</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EaaSInvestorCalculator;
