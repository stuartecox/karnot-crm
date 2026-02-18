import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, DollarSign, BarChart3, PieChart, Target, Award,
  Building, Users, Zap, Leaf, AlertCircle, CheckCircle, Info,
  ChevronDown, ChevronUp, Download, RefreshCw, Calculator,
  Briefcase, LineChart, ArrowRight, Shield, Droplets, Home, Flame
} from 'lucide-react';
import { Card, Button, Input, Section } from '../data/constants.jsx';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ==========================================
// KARNOT RESIDENTIAL EaaS INVESTOR MODEL
// Solviva solar powers heat pump (85% solar / 15% grid residual)
// Utility owns hardware, earns 75% of customer savings as subscription
// ==========================================

const EaaSInvestorCalculator = () => {
  const [products, setProducts]               = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // === FETCH PRODUCTS — AquaHERO ONLY ===
  useEffect(() => {
    const fetchProducts = async () => {
      const user = getAuth().currentUser;
      if (!user) { setLoadingProducts(false); return; }
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'products'));
        const all  = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const aquaHero = all
          .filter(p => {
            const isR290     = (p.Refrigerant || p.refrigerant || '').toUpperCase() === 'R290';
            const hasDHW     = parseFloat(p.kW_DHW_Nominal) > 0;
            const isAquaHero = (p.name || p['Product Name'] || '').toLowerCase().includes('aquahero');
            return isR290 && hasDHW && isAquaHero;
          })
          .sort((a, b) => parseFloat(a.salesPriceUSD) - parseFloat(b.salesPriceUSD));
        setProducts(aquaHero);
        const best = aquaHero.find(p => (p.name || '').toLowerCase().includes('300')) || aquaHero[0];
        if (best) {
          setSelectedProduct(best);
          setInputs(prev => ({ ...prev, unitPriceUSD: parseFloat(best.salesPriceUSD) || prev.unitPriceUSD }));
        }
      } catch (e) {
        console.error('EaaS product load error:', e);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  const [inputs, setInputs] = useState({
    heatingType:          'lpg',
    electricityRate:      12.25,
    lpgPricePerBottle:    950,
    dailyLiters:          2700,
    inletTemp:            25,
    targetTemp:           55,
    solarCoverPct:        85,
    customerSavingsPct:   25,
    contractMonths:       60,
    unitPriceUSD:         2544,
    installCostUSD:       600,
    annualOpexUSD:        80,
    serviceReservePct:    3,
    karnotDiscountPct:    15,
    annualServicePerUnit: 172,
    carbonCreditUSD:      15,
    electricityNetMargin: 25,
    utilityInterestRate:  8,
    solvivaConversionRate: 40,
    solvivaAvgSystemPrice: 3500,
    solvivaReferralPct:   10,
    portfolioUnits:       250,
  });

  const [showCashFlows, setShowCashFlows] = useState(false);

  const FX           = 58.5;
  const KWH_PER_L_K  = 0.001163;
  const DELTA_T      = 30;
  const LPG_EFF      = 0.85;
  const LPG_KWH_KG   = 13.8;
  const LPG_CO2_KG   = 3.0;
  const COP_ELEC     = 0.95;
  const GRID_CO2_KWH = 0.71;

  const fmt    = (n, d = 0) => (+n || 0).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
  const fmtUSD = n => `$${fmt(n)}`;
  const fmtPHP = n => `₱${fmt(n)}`;

  const calc = useMemo(() => {
    if (!selectedProduct) return null;
    const cop = parseFloat(selectedProduct.COP_DHW || selectedProduct.cop || 4.0);

    // Thermal
    const dailyThermalKWh = inputs.dailyLiters * DELTA_T * KWH_PER_L_K;
    const dailyHpKwh      = dailyThermalKWh / cop;
    const monthlyHpKwh    = dailyHpKwh * 30;

    // Baseline
    let baselineMonthlyPHP = 0, lpgBottlesPerMonth = 0, lpgKgPerYear = 0;
    if (inputs.heatingType === 'lpg') {
      const dailyLpgKg   = dailyThermalKWh / (LPG_EFF * LPG_KWH_KG);
      lpgKgPerYear       = dailyLpgKg * 365;
      lpgBottlesPerMonth = (dailyLpgKg * 30) / 11;
      baselineMonthlyPHP = lpgBottlesPerMonth * inputs.lpgPricePerBottle;
    } else {
      const dailyElecKwh = dailyThermalKWh / COP_ELEC;
      baselineMonthlyPHP = dailyElecKwh * 30 * inputs.electricityRate;
      lpgKgPerYear       = (dailyElecKwh * 365) / LPG_KWH_KG;
    }

    // HP cost — Solviva solar covers solarCoverPct%, only gridFraction uses grid
    const gridFraction     = (100 - inputs.solarCoverPct) / 100;
    const hpMonthlyGridPHP = monthlyHpKwh * gridFraction * inputs.electricityRate;

    // Savings pool
    const savingsPoolPHP     = baselineMonthlyPHP - hpMonthlyGridPHP;
    const customerSavingsPHP = savingsPoolPHP * (inputs.customerSavingsPct / 100);
    const solvivaRevPHP      = savingsPoolPHP - customerSavingsPHP;
    const solvivaMonthlyUSD  = solvivaRevPHP / FX;
    const solvivaAnnualUSD   = solvivaMonthlyUSD * 12;
    const customerNewMonthly = hpMonthlyGridPHP + solvivaRevPHP;
    const customerSavingsPct = baselineMonthlyPHP > 0
      ? ((baselineMonthlyPHP - customerNewMonthly) / baselineMonthlyPHP) * 100 : 0;

    // Investment
    const unitPrice      = parseFloat(selectedProduct.salesPriceUSD) || inputs.unitPriceUSD;
    const packageRetail  = unitPrice + inputs.installCostUSD;
    const utilityCOGS    = packageRetail * (1 - inputs.karnotDiscountPct / 100);
    const serviceReserve = utilityCOGS * (inputs.serviceReservePct / 100);

    // Revenue streams
    const annualGridKwh       = dailyHpKwh * 365 * gridFraction;
    const annualElecProfitUSD = (annualGridKwh * inputs.electricityRate / FX) * (inputs.electricityNetMargin / 100);
    const annualServiceRev    = inputs.annualServicePerUnit;
    const annualCO2Tons       = (lpgKgPerYear * LPG_CO2_KG) / 1000;
    const annualCarbonRev     = annualCO2Tons * inputs.carbonCreditUSD;
    const totalAnnualRev      = solvivaAnnualUSD + annualElecProfitUSD + annualServiceRev + annualCarbonRev;

    // Net cash flow
    const annualOpex     = inputs.annualOpexUSD;
    const annualInterest = utilityCOGS * (inputs.utilityInterestRate / 100);
    const annualNetCF    = totalAnnualRev - annualOpex - annualInterest;

    // Returns
    const contractYears  = inputs.contractMonths / 12;
    const ltvUSD         = totalAnnualRev * contractYears;
    const totalCosts     = (annualOpex + annualInterest) * contractYears;
    const netProfit5yr   = ltvUSD - totalCosts - utilityCOGS;
    const roi5yr         = utilityCOGS > 0 ? (netProfit5yr / utilityCOGS) * 100 : 0;
    const paybackMonths  = annualNetCF > 0 ? utilityCOGS / (annualNetCF / 12) : 999;

    // IRR
    const cashFlows = [-utilityCOGS, ...Array(contractYears).fill(annualNetCF)];
    let irr = 0.20;
    for (let i = 0; i < 200; i++) {
      let npv = 0, d = 0;
      cashFlows.forEach((cf, t) => {
        const f = Math.pow(1 + irr, t);
        npv += cf / f;
        if (t > 0) d -= t * cf / (f * (1 + irr));
      });
      if (Math.abs(npv) < 0.01 || Math.abs(d) < 1e-10) break;
      irr -= npv / d;
      if (irr < -0.99 || irr > 50) irr = 0.20;
    }

    const npvFn = (r) => cashFlows.reduce((s, cf, t) => s + cf / Math.pow(1 + r, t), 0);

    // Cash flow schedule
    let cum = -utilityCOGS;
    const cashFlowSchedule = [
      { year: 0, revenue: 0, opex: 0, interest: annualInterest, net: -annualInterest, cumulative: cum - annualInterest }
    ];
    cum -= annualInterest;
    for (let yr = 1; yr <= contractYears; yr++) {
      cum += annualNetCF;
      cashFlowSchedule.push({ year: yr, revenue: totalAnnualRev, opex: annualOpex, interest: annualInterest, net: annualNetCF, cumulative: cum });
    }

    // Portfolio
    const n                  = inputs.portfolioUnits;
    const solvivaLeads       = Math.round(n * inputs.solvivaConversionRate / 100);
    const solvivaReferralRev = solvivaLeads * inputs.solvivaAvgSystemPrice * (inputs.solvivaReferralPct / 100);
    const solvivaGroupRev    = solvivaLeads * inputs.solvivaAvgSystemPrice;

    return {
      cop, unitPrice, packageRetail, utilityCOGS, serviceReserve,
      dailyThermalKWh, dailyHpKwh, monthlyHpKwh,
      baselineMonthlyPHP, lpgBottlesPerMonth, lpgKgPerYear,
      hpMonthlyGridPHP, gridFraction,
      savingsPoolPHP, customerSavingsPHP, solvivaRevPHP,
      solvivaMonthlyUSD, solvivaAnnualUSD,
      customerNewMonthly, customerSavingsPct, customerNetSavingsPHP: customerSavingsPHP,
      annualElecProfitUSD, annualServiceRev, annualCarbonRev, annualCO2Tons,
      totalAnnualRev, annualOpex, annualInterest, annualNetCF,
      ltvUSD, netProfit5yr, roi5yr, paybackMonths,
      irrPct: irr * 100,
      npv8: npvFn(0.08), npv10: npvFn(0.10), npv12: npvFn(0.12),
      cashFlowSchedule,
      portfolioInvestment:   utilityCOGS * n,
      portfolioAnnualRev:    totalAnnualRev * n,
      portfolioNetProfit5yr: netProfit5yr * n,
      portfolioCO2:          annualCO2Tons * n,
      solvivaLeads, solvivaReferralRev, solvivaGroupRev,
    };
  }, [inputs, selectedProduct]);

  const handleChange = (field, asNum = false) => (e) => {
    const v = asNum ? parseFloat(e.target.value) || 0 : e.target.value;
    setInputs(prev => ({ ...prev, [field]: v }));
  };

  const handleProductSelect = (prod) => {
    setSelectedProduct(prod);
    setInputs(prev => ({ ...prev, unitPriceUSD: parseFloat(prod.salesPriceUSD) || prev.unitPriceUSD }));
  };

  if (loadingProducts) return (
    <div className="p-10 text-center">
      <RefreshCw className="animate-spin mx-auto mb-4 text-blue-600" size={48}/>
      <p className="text-gray-600 font-bold">Loading AquaHERO catalog...</p>
    </div>
  );

  if (products.length === 0) return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-8 text-center">
        <AlertCircle size={48} className="text-red-600 mx-auto mb-4"/>
        <h2 className="text-xl font-bold text-red-900 mb-2">No AquaHERO Products Found</h2>
        <p className="text-red-700">Add R290 AquaHERO products with kW_DHW_Nominal &gt; 0 in Product Manager.</p>
      </div>
    </div>
  );

  if (!calc) return null;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 font-sans text-slate-800">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-xl"><Home size={32}/></div>
            <div>
              <h1 className="text-3xl font-bold">Residential EaaS Investor Pitch</h1>
              <p className="text-slate-400 mt-1">Karnot AquaHERO R290 · Solviva Solar Powered · Energy-as-a-Service · 10 → 500 Units</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-slate-500 uppercase">500-Unit Net Profit</div>
            <div className="text-3xl font-bold text-green-400">{fmtUSD(calc.netProfit5yr * 500)}</div>
            <div className="text-xs text-slate-400">over {inputs.contractMonths} months</div>
          </div>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-6 text-white">
        <h2 className="text-sm font-bold text-emerald-100 uppercase mb-4 flex items-center gap-2"><Target size={16}/> Executive Summary — Per Unit</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div><div className="text-3xl font-bold">{fmtUSD(calc.utilityCOGS)}</div><div className="text-xs text-emerald-100">Utility Investment</div></div>
          <div><div className="text-3xl font-bold">{fmtUSD(calc.solvivaAnnualUSD)}</div><div className="text-xs text-emerald-100">Annual Subscription</div></div>
          <div><div className="text-3xl font-bold">{fmtUSD(calc.netProfit5yr)}</div><div className="text-xs text-emerald-100">5-Yr Net Profit</div></div>
          <div><div className="text-3xl font-bold">{calc.irrPct.toFixed(0)}%</div><div className="text-xs text-emerald-100">IRR</div></div>
          <div><div className="text-3xl font-bold">{Math.round(calc.paybackMonths)} mo</div><div className="text-xs text-emerald-100">Payback</div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: INPUTS */}
        <div className="space-y-5">

          {/* Product Selector */}
          <Card className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Select AquaHERO Unit</h3>
            <div className="space-y-3">
              {products.map(prod => {
                const isSel = selectedProduct?.id === prod.id;
                const name  = prod.name || prod['Product Name'] || prod.id;
                return (
                  <button key={prod.id} onClick={() => handleProductSelect(prod)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${isSel ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="font-bold text-sm text-slate-800">{name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{parseFloat(prod.kW_DHW_Nominal || 0)} kW DHW · COP {parseFloat(prod.COP_DHW || prod.cop || 0)}</div>
                    <div className={`text-lg font-bold mt-1 ${isSel ? 'text-indigo-700' : 'text-slate-700'}`}>{fmtUSD(parseFloat(prod.salesPriceUSD))}</div>
                    {isSel && <div className="text-[10px] text-indigo-500 mt-0.5 flex items-center gap-1"><CheckCircle size={10}/> Live DB price</div>}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 bg-green-50 p-3 rounded-lg border border-green-200 text-xs text-green-800">
              <strong>Live DB:</strong> Prices and COP from Firestore product catalog.
            </div>
          </Card>

          {/* Household */}
          <Card className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4">Household Profile</h3>
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Baseline Heating</label>
              <div className="flex gap-2">
                <button onClick={() => setInputs(p => ({...p, heatingType: 'electric'}))}
                  className={`flex-1 py-2 px-3 rounded font-bold text-sm transition-all ${inputs.heatingType === 'electric' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border'}`}>
                  <Zap size={14} className="inline mr-1"/> Electric
                </button>
                <button onClick={() => setInputs(p => ({...p, heatingType: 'lpg'}))}
                  className={`flex-1 py-2 px-3 rounded font-bold text-sm transition-all ${inputs.heatingType === 'lpg' ? 'bg-orange-600 text-white' : 'bg-white text-slate-600 border'}`}>
                  <Flame size={14} className="inline mr-1"/> LPG
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <Input label="Daily Hot Water (L)" type="number" value={inputs.dailyLiters} onChange={handleChange('dailyLiters', true)}/>
              <Input label="Electricity Rate (₱/kWh)" type="number" step="0.25" value={inputs.electricityRate} onChange={handleChange('electricityRate', true)}/>
              {inputs.heatingType === 'lpg' && <Input label="LPG Bottle Price (₱/11kg)" type="number" value={inputs.lpgPricePerBottle} onChange={handleChange('lpgPricePerBottle', true)}/>}
            </div>
            {/* Solar coverage slider */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label className="text-xs font-bold text-yellow-800 block mb-1">
                Solviva Solar Coverage: <span className="text-yellow-900 text-sm">{inputs.solarCoverPct}%</span>
                <span className="text-yellow-600 font-normal ml-1">({100 - inputs.solarCoverPct}% grid residual)</span>
              </label>
              <input type="range" min="70" max="95" step="5" value={inputs.solarCoverPct}
                onChange={handleChange('solarCoverPct', true)} className="w-full accent-yellow-600"/>
              <div className="text-[10px] text-yellow-700 mt-1 space-y-0.5">
                <div>HP grid cost: <strong>{fmtPHP(calc.hpMonthlyGridPHP)}/mo</strong></div>
                <div>LPG baseline: <strong>{fmtPHP(calc.baselineMonthlyPHP)}/mo</strong></div>
                <div>Savings pool: <strong>{fmtPHP(calc.savingsPoolPHP)}/mo</strong></div>
              </div>
            </div>
          </Card>

          {/* EaaS Terms */}
          <Card className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4">EaaS Contract Terms</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">
                  Customer Share: {inputs.customerSavingsPct}%
                  <span className="text-slate-400 font-normal ml-1">(Utility keeps {100 - inputs.customerSavingsPct}%)</span>
                </label>
                <input type="range" min="10" max="50" step="5" value={inputs.customerSavingsPct}
                  onChange={handleChange('customerSavingsPct', true)} className="w-full accent-indigo-600"/>
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5"><span>10%</span><span>50%</span></div>
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
              <Input label="Installation Cost / Unit ($)" type="number" value={inputs.installCostUSD} onChange={handleChange('installCostUSD', true)}/>
              <Input label="Annual Opex / Unit ($)" type="number" value={inputs.annualOpexUSD} onChange={handleChange('annualOpexUSD', true)}/>
              <Input label="Karnot Partner Discount (%)" type="number" value={inputs.karnotDiscountPct} onChange={handleChange('karnotDiscountPct', true)}/>
              <Input label="Carbon Credit ($/t CO₂)" type="number" value={inputs.carbonCreditUSD} onChange={handleChange('carbonCreditUSD', true)}/>
            </div>
          </Card>

          {/* Portfolio Slider */}
          <Card className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-3">Portfolio Slider</h3>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Units: <span className="text-indigo-700 text-base">{inputs.portfolioUnits}</span></label>
              <input type="range" min="10" max="500" step="10" value={inputs.portfolioUnits}
                onChange={handleChange('portfolioUnits', true)} className="w-full accent-green-600"/>
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5"><span>10</span><span>500</span></div>
            </div>
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-600">Investment:</span><span className="font-bold">{fmtUSD(calc.utilityCOGS * inputs.portfolioUnits)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Annual Revenue:</span><span className="font-bold text-green-700">{fmtUSD(calc.totalAnnualRev * inputs.portfolioUnits)}</span></div>
              <div className="flex justify-between border-t border-green-200 pt-1 mt-1">
                <span className="font-bold text-green-900">Net Profit ({inputs.contractMonths}mo):</span>
                <span className="font-bold text-xl text-green-900">{fmtUSD(calc.netProfit5yr * inputs.portfolioUnits)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT: RESULTS */}
        <div className="lg:col-span-2 space-y-6">

          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border-2 border-indigo-100 shadow-sm text-center">
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">IRR (Per Unit)</div>
              <div className={`text-4xl font-bold ${calc.irrPct > 30 ? 'text-green-600' : calc.irrPct > 15 ? 'text-yellow-600' : 'text-red-600'}`}>{calc.irrPct.toFixed(0)}%</div>
              <div className="text-xs text-slate-400 mt-1">{Math.round(calc.paybackMonths)}mo payback</div>
            </div>
            <div className="bg-white p-5 rounded-xl border-2 border-green-100 shadow-sm text-center">
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Monthly Revenue</div>
              <div className="text-4xl font-bold text-green-700">{fmtUSD(calc.solvivaMonthlyUSD)}</div>
              <div className="text-xs text-slate-400 mt-1">Recurring EaaS fee / unit</div>
            </div>
            <div className="bg-white p-5 rounded-xl border-2 border-blue-100 shadow-sm text-center">
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Customer Saves</div>
              <div className="text-4xl font-bold text-blue-700">{fmtPHP(calc.customerNetSavingsPHP)}</div>
              <div className="text-xs text-slate-400 mt-1">/month vs {inputs.heatingType.toUpperCase()}</div>
            </div>
          </div>

          {/* Revenue Waterfall */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><PieChart size={18} className="text-indigo-500"/> Revenue Waterfall — Per Unit, Per Month</h3>
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
                    <td className="px-4 py-3 text-slate-600">Baseline — {inputs.heatingType === 'lpg' ? `LPG (${calc.lpgBottlesPerMonth.toFixed(1)} bottles)` : 'Electric heater'}</td>
                    <td className="px-4 py-3 text-right font-bold">{fmtPHP(calc.baselineMonthlyPHP)}</td>
                    <td className="px-4 py-3 text-right text-slate-400">{fmtUSD(calc.baselineMonthlyPHP / FX)}</td>
                    <td className="px-4 py-3 text-right text-slate-400">{fmtUSD(calc.baselineMonthlyPHP / FX * 12)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-amber-600">HP grid cost ({100 - inputs.solarCoverPct}% — Solviva solar covers {inputs.solarCoverPct}%)</td>
                    <td className="px-4 py-3 text-right text-amber-600">({fmtPHP(calc.hpMonthlyGridPHP)})</td>
                    <td className="px-4 py-3 text-right text-amber-500">({fmtUSD(calc.hpMonthlyGridPHP / FX)})</td>
                    <td className="px-4 py-3 text-right text-amber-500">({fmtUSD(calc.hpMonthlyGridPHP / FX * 12)})</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="px-4 py-3 text-slate-700">Total Savings Pool</td>
                    <td className="px-4 py-3 text-right">{fmtPHP(calc.savingsPoolPHP)}</td>
                    <td className="px-4 py-3 text-right">{fmtUSD(calc.savingsPoolPHP / FX)}</td>
                    <td className="px-4 py-3 text-right">{fmtUSD(calc.savingsPoolPHP / FX * 12)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-green-600">Customer keeps ({inputs.customerSavingsPct}%) — bill discount</td>
                    <td className="px-4 py-3 text-right text-green-600">({fmtPHP(calc.customerSavingsPHP)})</td>
                    <td className="px-4 py-3 text-right text-green-500">({fmtUSD(calc.customerSavingsPHP / FX)})</td>
                    <td className="px-4 py-3 text-right text-green-500">({fmtUSD(calc.customerSavingsPHP / FX * 12)})</td>
                  </tr>
                  <tr className="bg-indigo-50 font-bold">
                    <td className="px-4 py-3 text-indigo-900">Utility EaaS Subscription ({100 - inputs.customerSavingsPct}%)</td>
                    <td className="px-4 py-3 text-right text-indigo-700">{fmtPHP(calc.solvivaRevPHP)}</td>
                    <td className="px-4 py-3 text-right text-indigo-700">{fmtUSD(calc.solvivaMonthlyUSD)}</td>
                    <td className="px-4 py-3 text-right text-indigo-700">{fmtUSD(calc.solvivaAnnualUSD)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-blue-600">+ Electricity profit ({inputs.electricityNetMargin}% margin on {100 - inputs.solarCoverPct}% grid)</td>
                    <td className="px-4 py-3 text-right text-blue-500">—</td>
                    <td className="px-4 py-3 text-right text-blue-500">—</td>
                    <td className="px-4 py-3 text-right text-blue-600">{fmtUSD(calc.annualElecProfitUSD)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-purple-600">+ Service revenue</td>
                    <td className="px-4 py-3 text-right text-purple-500">—</td>
                    <td className="px-4 py-3 text-right text-purple-500">—</td>
                    <td className="px-4 py-3 text-right text-purple-600">{fmtUSD(calc.annualServiceRev)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-emerald-600">+ Carbon credits ({calc.annualCO2Tons.toFixed(2)} t/yr)</td>
                    <td className="px-4 py-3 text-right text-emerald-500">—</td>
                    <td className="px-4 py-3 text-right text-emerald-500">—</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{fmtUSD(calc.annualCarbonRev)}</td>
                  </tr>
                  <tr className="bg-indigo-100 font-bold border-t-2 border-indigo-300">
                    <td className="px-4 py-3 text-indigo-900 text-base">Total Annual Revenue (Utility)</td>
                    <td className="px-4 py-3 text-right">—</td>
                    <td className="px-4 py-3 text-right">—</td>
                    <td className="px-4 py-3 text-right text-indigo-900 text-lg">{fmtUSD(calc.totalAnnualRev)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Investment vs Returns */}
            <div className="grid grid-cols-2 gap-4 mt-5">
              <div className="bg-white border-2 border-slate-200 p-4 rounded-lg text-sm space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Utility Investment / Unit</div>
                <div className="flex justify-between"><span className="text-slate-500">{selectedProduct?.name}</span><span className="font-bold">{fmtUSD(calc.unitPrice)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Installation</span><span className="font-bold">{fmtUSD(inputs.installCostUSD)}</span></div>
                <div className="flex justify-between text-green-600"><span>Karnot discount ({inputs.karnotDiscountPct}%)</span><span className="font-bold">-{fmtUSD(calc.packageRetail - calc.utilityCOGS)}</span></div>
                <div className="flex justify-between border-t pt-2 font-bold"><span>Net COGS</span><span className="text-blue-700">{fmtUSD(calc.utilityCOGS)}</span></div>
              </div>
              <div className="bg-white border-2 border-slate-200 p-4 rounded-lg text-sm space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Returns / Unit</div>
                <div className="flex justify-between"><span className="text-slate-500">Annual net cash flow</span><span className="font-bold text-green-700">{fmtUSD(calc.annualNetCF)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">LTV ({inputs.contractMonths}mo)</span><span className="font-bold">{fmtUSD(calc.ltvUSD)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Net profit</span><span className="font-bold text-indigo-700">{fmtUSD(calc.netProfit5yr)}</span></div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>ROI</span>
                  <span className={`text-lg ${calc.roi5yr > 100 ? 'text-green-600' : 'text-yellow-600'}`}>{calc.roi5yr.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Value */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Home size={18} className="text-blue-500"/> What the Customer Sees</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center">
                <div className="text-xs text-red-600 uppercase font-bold mb-1">Old Monthly Bill</div>
                <div className="text-2xl font-bold text-red-800">{fmtPHP(calc.baselineMonthlyPHP)}</div>
                <div className="text-xs text-red-500 mt-1">{inputs.heatingType === 'lpg' ? `${calc.lpgBottlesPerMonth.toFixed(1)} LPG bottles` : 'Electric heater'}</div>
              </div>
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
                <div className="text-xs text-green-600 uppercase font-bold mb-1">New Monthly Bill</div>
                <div className="text-2xl font-bold text-green-800">{fmtPHP(calc.customerNewMonthly)}</div>
                <div className="text-xs text-green-500 mt-1">Grid ({100 - inputs.solarCoverPct}%) + EaaS fee</div>
              </div>
              <div className="bg-blue-50 border-2 border-blue-400 p-4 rounded-lg text-center">
                <div className="text-xs text-blue-700 uppercase font-bold mb-1">Monthly Saving</div>
                <div className="text-2xl font-bold text-blue-900">{fmtPHP(calc.customerNetSavingsPHP)}</div>
                <div className="text-xs text-blue-600 mt-1">{calc.customerSavingsPct.toFixed(0)}% off old bill</div>
              </div>
            </div>
            <div className="mt-4 bg-slate-50 p-4 rounded-lg text-sm space-y-2">
              <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0"/><span><strong>Zero upfront cost</strong> — unit installed free, just pay lower monthly bill</span></div>
              <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0"/><span><strong>Solar-powered hot water</strong> — {inputs.solarCoverPct}% from Solviva solar, only {100 - inputs.solarCoverPct}% grid residual</span></div>
              <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0"/><span><strong>Unlimited hot water</strong> — {selectedProduct?.name} delivers {inputs.dailyLiters}L/day at 55°C</span></div>
              <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0"/><span><strong>PFAS-free R290</strong> — natural refrigerant, zero forever chemicals</span></div>
              <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0"/><span><strong>Carbon reduction</strong> — saves {calc.annualCO2Tons.toFixed(2)} tonnes CO₂/year per household</span></div>
            </div>
          </div>

          {/* Returns */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-100 p-5 rounded-xl border border-green-200 text-center">
              <div className="text-xs font-bold text-green-700 uppercase mb-1">IRR (Per Unit)</div>
              <div className="text-4xl font-bold text-green-800">{calc.irrPct.toFixed(0)}%</div>
              <div className="text-xs text-green-600 mt-1">Internal Rate of Return</div>
            </div>
            <div className="bg-blue-100 p-5 rounded-xl border border-blue-200 text-center">
              <div className="text-xs font-bold text-blue-700 uppercase mb-1">NPV @ 10%</div>
              <div className="text-4xl font-bold text-blue-800">{fmtUSD(calc.npv10)}</div>
              <div className="text-xs text-blue-600 mt-1">{fmtUSD(calc.npv8)} @8% · {fmtUSD(calc.npv12)} @12%</div>
            </div>
          </div>

          {/* Cash Flow Schedule */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <button onClick={() => setShowCashFlows(!showCashFlows)} className="w-full flex items-center justify-between">
              <h3 className="font-bold text-slate-700 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-600"/> Cash Flow Schedule</h3>
              {showCashFlows ? <ChevronUp/> : <ChevronDown/>}
            </button>
            {showCashFlows && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Year</th>
                      <th className="px-3 py-2 text-right">Revenue</th>
                      <th className="px-3 py-2 text-right">Opex</th>
                      <th className="px-3 py-2 text-right">Interest</th>
                      <th className="px-3 py-2 text-right">Net CF</th>
                      <th className="px-3 py-2 text-right">Cumulative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc.cashFlowSchedule.map(row => (
                      <tr key={row.year} className="border-b">
                        <td className="px-3 py-2 font-bold">{row.year}</td>
                        <td className="px-3 py-2 text-right text-green-600">{row.revenue > 0 ? fmtUSD(row.revenue) : '—'}</td>
                        <td className="px-3 py-2 text-right text-orange-500">{row.opex > 0 ? `(${fmtUSD(row.opex)})` : '—'}</td>
                        <td className="px-3 py-2 text-right text-red-500">({fmtUSD(row.interest)})</td>
                        <td className={`px-3 py-2 text-right font-bold ${row.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {row.net >= 0 ? fmtUSD(row.net) : `(${fmtUSD(Math.abs(row.net))})`}
                        </td>
                        <td className={`px-3 py-2 text-right ${row.cumulative >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {row.cumulative >= 0 ? fmtUSD(row.cumulative) : `(${fmtUSD(Math.abs(row.cumulative))})`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PORTFOLIO PROJECTION */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Building size={24} className="text-blue-600"/> Portfolio Projection: {inputs.portfolioUnits} Units</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">${(calc.utilityCOGS * inputs.portfolioUnits / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-gray-300">Utility Investment</div>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-800 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">${(calc.totalAnnualRev * inputs.portfolioUnits / 1000000).toFixed(2)}M</div>
            <div className="text-sm text-green-200">Annual Revenue</div>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">${(calc.solvivaAnnualUSD * inputs.portfolioUnits / 1000).toFixed(0)}K</div>
            <div className="text-sm text-blue-200">Annual Subscriptions</div>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">${(calc.netProfit5yr * inputs.portfolioUnits / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-purple-200">5-Year Net Profit</div>
          </div>
        </div>
        {/* Solviva Cross-Sell */}
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-4">
          <h4 className="font-bold text-yellow-800 mb-3 flex items-center gap-2"><Zap size={18}/> Solviva Solar Cross-Sell ({inputs.solvivaConversionRate}% conversion)</h4>
          <div className="grid grid-cols-3 gap-4 text-sm text-center">
            <div><div className="text-2xl font-bold text-yellow-800">{calc.solvivaLeads}</div><div className="text-xs text-gray-600">Solar customers from {inputs.portfolioUnits} EaaS deployments</div></div>
            <div><div className="text-2xl font-bold text-yellow-800">{fmtUSD(calc.solvivaReferralRev)}</div><div className="text-xs text-gray-600">Referral revenue ({inputs.solvivaReferralPct}%)</div></div>
            <div><div className="text-2xl font-bold text-yellow-800">{fmtUSD(calc.solvivaGroupRev)}</div><div className="text-xs text-gray-600">Total solar sales (group)</div></div>
          </div>
        </div>
      </div>

      {/* ================================================================
          WHY ABAITIZPOWER WINS vs COMPETING UTILITY
          ================================================================ */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-8">
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-2"><Briefcase size={24}/> Why AboitizPower Wins vs Competing Utility</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* LEFT: COMPETITIVE ADVANTAGES */}
          <div>
            <h4 className="font-bold text-blue-300 mb-4 text-sm uppercase tracking-wide">AboitizPower Competitive Advantages</h4>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Solviva Group Synergy:</strong> {inputs.solvivaConversionRate}% solar cross-sell → <strong className="text-green-300">{fmtUSD(calc.solvivaGroupRev)} group revenue</strong> from {inputs.portfolioUnits} deployments (competitor has NO solar offering)</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Regional Expansion:</strong> New PH regulations → <strong className="text-green-300">3× TAM</strong> with NCR + Region III + IV-A (competitor locked to single region)</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Existing Customer Base:</strong> Leverage current AboitizPower retail customers → faster deployment vs competitor starting from zero</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Brand Trust:</strong> AboitizPower name accelerates customer acquisition and contract conversion</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Cheaper Capital:</strong> Investment-grade <strong className="text-green-300">{inputs.utilityInterestRate}% borrowing cost</strong> vs competitor's higher rates → lower financing drag per unit</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Karnot Exclusive Discount:</strong> <strong className="text-green-300">{inputs.karnotDiscountPct}% partner discount</strong> ONLY for AboitizPower — saves {fmtUSD(calc.packageRetail - calc.utilityCOGS)} per unit vs competitor paying full retail</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Proven Margins:</strong> Model uses YOUR actual <strong className="text-green-300">{inputs.electricityNetMargin}% electricity net margin</strong> from 9M25 results</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Solar-Powered HP:</strong> Solviva covers {inputs.solarCoverPct}% of HP energy → savings pool is <strong className="text-green-300">{fmtPHP(calc.savingsPoolPHP)}/mo</strong> (vs grid-only model's smaller pool)</span>
              </li>
            </ul>
          </div>

          {/* RIGHT: REVENUE MODEL */}
          <div>
            <h4 className="font-bold text-green-300 mb-4 text-sm uppercase tracking-wide">Revenue Model (Per Unit · Live Numbers)</h4>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-start gap-3">
                <TrendingUp size={18} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Subscription ({100 - inputs.customerSavingsPct}% of savings):</strong> <strong className="text-green-300">{fmtUSD(calc.solvivaAnnualUSD)}/unit/year</strong> — pure recurring, zero incremental cost after install</span>
              </li>
              <li className="flex items-start gap-3">
                <TrendingUp size={18} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Electricity profit ({inputs.electricityNetMargin}% margin):</strong> <strong className="text-green-300">{fmtUSD(calc.annualElecProfitUSD)}/year</strong> — new sales from LPG conversion</span>
              </li>
              <li className="flex items-start gap-3">
                <TrendingUp size={18} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Service + Carbon credits:</strong> <strong className="text-green-300">{fmtUSD(calc.annualServiceRev + calc.annualCarbonRev)}/year</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <TrendingUp size={18} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Total annual revenue:</strong> <strong className="text-green-300">{fmtUSD(calc.totalAnnualRev)}/unit/year</strong></span>
              </li>
              <li className="flex items-start gap-3 bg-green-900/30 rounded-lg p-3">
                <TrendingUp size={18} className="text-yellow-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-yellow-300">{calc.irrPct.toFixed(0)}% IRR</strong> | <strong className="text-yellow-300">{Math.round(calc.paybackMonths)}mo payback</strong> | <strong className="text-yellow-300">{calc.roi5yr.toFixed(0)}% ROI</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <TrendingUp size={18} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Customer wins too:</strong> Saves <strong className="text-green-300">{fmtPHP(calc.customerNetSavingsPHP)}/month</strong> vs {inputs.heatingType.toUpperCase()} with <strong>zero upfront cost!</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <TrendingUp size={18} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Portfolio ({inputs.portfolioUnits} units):</strong> <strong className="text-green-300">{fmtUSD(calc.utilityCOGS * inputs.portfolioUnits / 1000)}K invested</strong> → <strong className="text-green-300">{fmtUSD(calc.netProfit5yr * inputs.portfolioUnits / 1000)}K net profit</strong> in {inputs.contractMonths} months</span>
              </li>
            </ul>

            <div className="mt-6 bg-gradient-to-r from-green-800 to-emerald-800 rounded-xl p-4 border border-green-600">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-xs text-green-300 uppercase mb-1">Portfolio Investment</div>
                  <div className="text-2xl font-bold">{fmtUSD(calc.utilityCOGS * inputs.portfolioUnits)}</div>
                  <div className="text-xs text-green-400">{inputs.portfolioUnits} units × {fmtUSD(calc.utilityCOGS)}</div>
                </div>
                <div>
                  <div className="text-xs text-green-300 uppercase mb-1">5-Year Return</div>
                  <div className="text-2xl font-bold text-green-300">{fmtUSD(calc.netProfit5yr * inputs.portfolioUnits)}</div>
                  <div className="text-xs text-green-400">{calc.roi5yr.toFixed(0)}% ROI · {calc.irrPct.toFixed(0)}% IRR</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default EaaSInvestorCalculator;
