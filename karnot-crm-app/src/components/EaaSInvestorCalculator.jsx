import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, DollarSign, BarChart3, Target, Award,
  Building, Users, Zap, Leaf, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, RefreshCw, Calculator,
  Briefcase, Droplets, Home, Thermometer, Battery, Sun
} from 'lucide-react';
import { Card, Button, Input } from '../data/constants.jsx';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ==========================================
// SOLVIVA RESIDENTIAL EaaS INVESTOR MODEL
// Electric shower baseline → AquaHERO R290 heat pump
// 85% solar powered (Solviva solar system)
// Proper thermal storage sizing (200L / 300L tank buffer)
// Max residential flow: 500 L/day
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
        // Default to 200L (better investor story at residential scale)
        const best = aquaHero.find(p => (p.name || '').toLowerCase().includes('200')) || aquaHero[0];
        if (best) setSelectedProduct(best);
      } catch (e) {
        console.error('Solviva EaaS product load error:', e);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  // === INPUTS ===
  const [inputs, setInputs] = useState({
    // Household hot water
    dailyLiters:          500,   // Max residential — slider capped at 500L
    inletTempC:           25,    // Typical PH ground/mains temp
    targetTempC:          55,    // Delivery temperature
    electricityRate:      12.25, // PHP/kWh (Meralco average)

    // Solar system (Solviva solar)
    solarCoverPct:        85,    // % of HP electricity from solar
    solarWindowHours:     8,     // Hours per day HP can run on solar (8am-4pm)

    // EaaS commercial terms
    customerSavingsPct:   25,    // Customer keeps 25%, Solviva takes 75%
    contractYears:        7,     // 7yr default — best balance for residential

    // Costs
    installCostUSD:       600,
    annualOpexUSD:        80,
    karnotDiscountPct:    15,    // Exclusive Solviva partner discount

    // Additional revenue
    annualServiceUSD:     172,
    carbonCreditUSD:      15,

    // Financing
    utilityInterestRate:  8,

    // Solviva solar cross-sell
    solvivaConversionRate: 60,   // Higher for residential — they already have the relationship
    solvivaAvgSystemPrice: 3500,
    solvivaReferralPct:   10,

    // Portfolio
    portfolioUnits:       250,
  });

  const [showCashFlows,  setShowCashFlows]  = useState(false);
  const [showThermal,    setShowThermal]    = useState(false);

  // === CONSTANTS ===
  const FX          = 58.5;
  const KWH_PER_L_K = 0.001163;
  const COP_ELEC    = 0.95;   // Electric shower / immersion heater efficiency
  const CO2_GRID    = 0.71;   // kg CO2 per kWh (Philippine grid)
  const CO2_ELEC    = 0.71;   // Same — baseline is grid electric

  const fmt    = (n, d = 0) => (+n || 0).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
  const fmtUSD = n => `$${fmt(n)}`;
  const fmtPHP = n => `₱${fmt(n)}`;
  const fmtKWh = n => `${fmt(n, 1)} kWh`;

  // === PARSE TANK VOLUME FROM PRODUCT NAME ===
  const getTankVolume = (prod) => {
    if (!prod) return 0;
    const name = (prod.name || prod['Product Name'] || '').toLowerCase();
    if (name.includes('300')) return 300;
    if (name.includes('200')) return 200;
    if (name.includes('150')) return 150;
    return parseFloat(prod.tankVolume || 0) || 200;
  };

  // === CORE CALCULATIONS ===
  const calc = useMemo(() => {
    if (!selectedProduct) return null;

    const tankVolume    = getTankVolume(selectedProduct);
    const cop           = parseFloat(selectedProduct.COP_DHW || selectedProduct.cop || 4.0);
    const hpRatedKW     = parseFloat(selectedProduct.kW_DHW_Nominal || 2.5);
    const unitPriceUSD  = parseFloat(selectedProduct.salesPriceUSD || 2000);

    // ── STEP A: THERMAL DEMAND ──
    const deltaT          = inputs.targetTempC - inputs.inletTempC;
    const dailyThermalKWh = inputs.dailyLiters * deltaT * KWH_PER_L_K;

    // ── STEP B: TANK STORAGE ANALYSIS ──
    // Tank stores heat during solar hours, supplies demand overnight
    const tankStoredKWh    = tankVolume * deltaT * KWH_PER_L_K;
    const nightDemandKWh   = dailyThermalKWh * 0.60;  // 60% drawn in evening/morning
    const dayDemandKWh     = dailyThermalKWh * 0.40;  // 40% during solar hours
    const tankCoversNight  = tankStoredKWh >= nightDemandKWh;
    const tankCoverPct     = Math.min(100, (tankStoredKWh / nightDemandKWh) * 100);

    // HP must recover: full daily demand during solar window
    // (tank buffers overnight, HP re-charges during day)
    const hpRecoveryKWh    = dailyThermalKWh; // recover full daily demand during solar hours
    const hpKWRequired     = hpRecoveryKWh / inputs.solarWindowHours;
    const hpCapacityOK     = hpRatedKW >= hpKWRequired;

    // ── STEP C: ELECTRIC BASELINE (what customer currently pays) ──
    // Electric shower / immersion heater — COP ≈ 0.95
    const dailyBaselineKWh    = dailyThermalKWh / COP_ELEC;
    const monthlyBaselineKWh  = dailyBaselineKWh * 30;
    const monthlyBaselinePHP  = monthlyBaselineKWh * inputs.electricityRate;
    const annualBaselineKWh   = dailyBaselineKWh * 365;
    const annualBaselineCO2   = (annualBaselineKWh * CO2_ELEC) / 1000; // tonnes

    // ── STEP D: HEAT PUMP OPERATING COST ──
    // Solviva solar covers solarCoverPct%, only residual uses grid
    const dailyHpKWh         = dailyThermalKWh / cop;
    const monthlyHpKWh       = dailyHpKWh * 30;
    const gridFraction        = (100 - inputs.solarCoverPct) / 100;
    const monthlyHpGridKWh   = monthlyHpKWh * gridFraction;
    const monthlyHpGridPHP   = monthlyHpGridKWh * inputs.electricityRate;
    const annualHpKWh        = dailyHpKWh * 365;
    const annualHpGridKWh    = annualHpKWh * gridFraction;
    const annualHpCO2        = (annualHpGridKWh * CO2_GRID) / 1000; // tonnes

    // ── STEP E: SAVINGS POOL ──
    const savingsPoolPHP      = monthlyBaselinePHP - monthlyHpGridPHP;
    const customerSharePHP    = savingsPoolPHP * (inputs.customerSavingsPct / 100);
    const solvivaSharePHP     = savingsPoolPHP - customerSharePHP;
    const solvivaMonthlyUSD   = solvivaSharePHP / FX;
    const solvivaAnnualUSD    = solvivaMonthlyUSD * 12;

    // Customer new total monthly bill (grid residual + Solviva subscription)
    const customerNewMonthly  = monthlyHpGridPHP + solvivaSharePHP;
    const customerSavingsPctActual = monthlyBaselinePHP > 0
      ? ((monthlyBaselinePHP - customerNewMonthly) / monthlyBaselinePHP) * 100 : 0;

    // ── STEP F: CARBON SAVINGS ──
    const annualCO2Saved    = annualBaselineCO2 - annualHpCO2;
    const annualCarbonRevUSD = annualCO2Saved * inputs.carbonCreditUSD;

    // ── STEP G: UTILITY INVESTMENT ──
    const packageRetail   = unitPriceUSD + inputs.installCostUSD;
    const utilityCOGS     = packageRetail * (1 - inputs.karnotDiscountPct / 100);

    // ── STEP H: REVENUE STREAMS ──
    // 1. EaaS subscription (primary — 75% of savings, recurring)
    // 2. Service revenue
    // 3. Carbon credits
    // NOTE: No electricity margin — customer pays Meralco directly for 15% grid residual
    const totalAnnualRev = solvivaAnnualUSD + inputs.annualServiceUSD + annualCarbonRevUSD;

    // ── STEP I: COSTS & NET CASH FLOW ──
    const annualInterest = utilityCOGS * (inputs.utilityInterestRate / 100);
    const annualNetCF    = totalAnnualRev - inputs.annualOpexUSD - annualInterest;

    // ── STEP J: RETURNS OVER CONTRACT TERM ──
    const ltvUSD       = totalAnnualRev * inputs.contractYears;
    const totalCosts   = (inputs.annualOpexUSD + annualInterest) * inputs.contractYears;
    const netProfit    = ltvUSD - totalCosts - utilityCOGS;
    const roi          = utilityCOGS > 0 ? (netProfit / utilityCOGS) * 100 : 0;
    const paybackMonths = annualNetCF > 0 ? (utilityCOGS / (annualNetCF / 12)) : 999;

    // ── STEP K: IRR ──
    const cashFlows = [-utilityCOGS, ...Array(inputs.contractYears).fill(annualNetCF)];
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
    const npvFn = r => cashFlows.reduce((s, cf, t) => s + cf / Math.pow(1 + r, t), 0);

    // ── STEP L: CASH FLOW SCHEDULE ──
    let cum = -utilityCOGS - annualInterest;
    const schedule = [{ year: 0, revenue: 0, opex: 0, interest: annualInterest, net: -annualInterest, cumulative: cum }];
    for (let yr = 1; yr <= inputs.contractYears; yr++) {
      cum += annualNetCF;
      schedule.push({ year: yr, revenue: totalAnnualRev, opex: inputs.annualOpexUSD, interest: annualInterest, net: annualNetCF, cumulative: cum });
    }

    // ── STEP M: PORTFOLIO ──
    const n = inputs.portfolioUnits;
    const solvivaLeads       = Math.round(n * inputs.solvivaConversionRate / 100);
    const solvivaReferralRev = solvivaLeads * inputs.solvivaAvgSystemPrice * (inputs.solvivaReferralPct / 100);
    const solvivaGroupRev    = solvivaLeads * inputs.solvivaAvgSystemPrice;

    return {
      // Product
      tankVolume, cop, hpRatedKW, unitPriceUSD,
      // Thermal sizing
      deltaT, dailyThermalKWh,
      tankStoredKWh, nightDemandKWh, dayDemandKWh,
      tankCoversNight, tankCoverPct,
      hpKWRequired, hpCapacityOK,
      // Baseline
      dailyBaselineKWh, monthlyBaselineKWh, monthlyBaselinePHP, annualBaselineKWh, annualBaselineCO2,
      // HP costs
      dailyHpKWh, monthlyHpKWh, gridFraction, monthlyHpGridKWh, monthlyHpGridPHP, annualHpKWh, annualHpGridKWh, annualHpCO2,
      // Savings
      savingsPoolPHP, customerSharePHP, solvivaSharePHP,
      solvivaMonthlyUSD, solvivaAnnualUSD,
      customerNewMonthly, customerSavingsPctActual,
      // Carbon
      annualCO2Saved, annualCarbonRevUSD,
      // Investment
      packageRetail, utilityCOGS,
      // Revenue
      totalAnnualRev, annualInterest, annualNetCF,
      // Returns
      ltvUSD, netProfit, roi, paybackMonths,
      irrPct: irr * 100,
      npv8: npvFn(0.08), npv10: npvFn(0.10), npv12: npvFn(0.12),
      // Schedule
      schedule,
      // Portfolio
      portfolioInvestment:  utilityCOGS * n,
      portfolioAnnualRev:   totalAnnualRev * n,
      portfolioNetProfit:   netProfit * n,
      portfolioCO2:         annualCO2Saved * n,
      solvivaLeads, solvivaReferralRev, solvivaGroupRev,
    };
  }, [inputs, selectedProduct]);

  const set = (field, asNum = false) => (e) => {
    const v = asNum ? parseFloat(e.target.value) || 0 : e.target.value;
    setInputs(prev => ({ ...prev, [field]: v }));
  };

  const handleProductSelect = (prod) => setSelectedProduct(prod);

  if (loadingProducts) return (
    <div className="p-10 text-center">
      <RefreshCw className="animate-spin mx-auto mb-4 text-blue-600" size={48}/>
      <p className="font-bold text-gray-600">Loading AquaHERO catalog from Firestore...</p>
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

  const irrColor = calc.irrPct > 35 ? 'text-green-600' : calc.irrPct > 20 ? 'text-yellow-600' : 'text-red-600';
  const roiColor = calc.roi > 100 ? 'text-green-600' : calc.roi > 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 font-sans text-slate-800">

      {/* ── HEADER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500 rounded-xl shadow-lg shadow-orange-500/30">
              <Sun size={32}/>
            </div>
            <div>
              <div className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">Solviva Energy Solutions</div>
              <h1 className="text-3xl font-bold">Residential EaaS Investor Model</h1>
              <p className="text-slate-400 mt-1">
                AquaHERO R290 · Solar-Powered Hot Water · No Upfront Cost · Max {inputs.dailyLiters}L/day
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-slate-500 uppercase">{inputs.portfolioUnits}-Unit Net Profit</div>
            <div className="text-3xl font-bold text-orange-400">{fmtUSD(calc.netProfit * inputs.portfolioUnits)}</div>
            <div className="text-xs text-slate-400">over {inputs.contractYears} years</div>
          </div>
        </div>
      </div>

      {/* ── EXEC SUMMARY STRIP ── */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-6 text-white shadow-lg">
        <h2 className="text-xs font-bold text-orange-100 uppercase mb-4 flex items-center gap-2">
          <Target size={14}/> Executive Summary — Per Unit · {selectedProduct?.name}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold">{fmtUSD(calc.utilityCOGS)}</div>
            <div className="text-xs text-orange-100">Solviva Investment</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{fmtUSD(calc.solvivaAnnualUSD)}</div>
            <div className="text-xs text-orange-100">Annual Subscription</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{fmtUSD(calc.netProfit)}</div>
            <div className="text-xs text-orange-100">{inputs.contractYears}-Yr Net Profit</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{calc.irrPct.toFixed(0)}%</div>
            <div className="text-xs text-orange-100">IRR</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{Math.round(calc.paybackMonths)} mo</div>
            <div className="text-xs text-orange-100">Payback</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT: INPUTS ── */}
        <div className="space-y-5">

          {/* Product Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
              <Droplets size={14}/> Select AquaHERO Unit
            </h3>
            <div className="space-y-3">
              {products.map(prod => {
                const isSel    = selectedProduct?.id === prod.id;
                const name     = prod.name || prod['Product Name'] || prod.id;
                const tankVol  = getTankVolume(prod);
                const cop      = parseFloat(prod.COP_DHW || prod.cop || 0);
                const kw       = parseFloat(prod.kW_DHW_Nominal || 0);
                return (
                  <button key={prod.id} onClick={() => handleProductSelect(prod)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSel ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-800">{name}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {kw} kW DHW · COP {cop} · {tankVol}L tank
                        </div>
                      </div>
                      <div className={`text-lg font-bold ${isSel ? 'text-orange-600' : 'text-slate-700'}`}>
                        {fmtUSD(parseFloat(prod.salesPriceUSD))}
                      </div>
                    </div>
                    {isSel && (
                      <div className="mt-2 flex items-center gap-4 text-xs">
                        <span className={`flex items-center gap-1 ${calc.hpCapacityOK ? 'text-green-600' : 'text-red-600'}`}>
                          {calc.hpCapacityOK ? <CheckCircle size={12}/> : <AlertCircle size={12}/>}
                          {calc.hpKWRequired.toFixed(2)} kW required
                        </span>
                        <span className={`flex items-center gap-1 ${calc.tankCoversNight ? 'text-green-600' : 'text-amber-600'}`}>
                          <Battery size={12}/>
                          Tank covers {calc.tankCoverPct.toFixed(0)}% of night demand
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Household Inputs */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Home size={16}/> Household Profile</h3>

            {/* Daily litres slider — capped at 500L */}
            <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="text-xs font-bold text-blue-800 block mb-1">
                Daily Hot Water: <span className="text-blue-900 text-base">{inputs.dailyLiters}L</span>
                <span className="text-blue-500 font-normal ml-2">(max 500L residential)</span>
              </label>
              <input type="range" min="100" max="500" step="50" value={inputs.dailyLiters}
                onChange={set('dailyLiters', true)} className="w-full accent-blue-600"/>
              <div className="flex justify-between text-[10px] text-blue-500 mt-0.5">
                <span>100L (1-2 person)</span><span>300L (family)</span><span>500L (large)</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-blue-700">
                <span>Daily thermal: <strong>{fmtKWh(calc.dailyThermalKWh)}</strong></span>
                <span>HP needed: <strong>{calc.hpKWRequired.toFixed(2)} kW</strong></span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Inlet Temp (°C)" type="number" value={inputs.inletTempC} onChange={set('inletTempC', true)}/>
                <Input label="Target Temp (°C)" type="number" value={inputs.targetTempC} onChange={set('targetTempC', true)}/>
              </div>
              <Input label="Electricity Rate (₱/kWh)" type="number" step="0.25" value={inputs.electricityRate} onChange={set('electricityRate', true)}/>
            </div>

            {/* Electric baseline info */}
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs">
              <div className="font-bold text-red-700 mb-1">Customer's Current Electric Bill (Hot Water)</div>
              <div className="text-red-600">{fmtKWh(calc.dailyBaselineKWh)}/day × ₱{inputs.electricityRate} = <strong>{fmtPHP(calc.monthlyBaselinePHP)}/month</strong></div>
              <div className="text-red-500 mt-0.5">Electric shower / immersion heater (COP ≈ 0.95)</div>
            </div>

            {/* Solar slider */}
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label className="text-xs font-bold text-yellow-800 block mb-1">
                Solviva Solar Coverage: <span className="text-yellow-900">{inputs.solarCoverPct}%</span>
                <span className="text-yellow-600 font-normal ml-1">({100 - inputs.solarCoverPct}% grid residual)</span>
              </label>
              <input type="range" min="70" max="95" step="5" value={inputs.solarCoverPct}
                onChange={set('solarCoverPct', true)} className="w-full accent-yellow-600"/>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-yellow-700 mt-1">
                <span>HP grid cost: <strong>{fmtPHP(calc.monthlyHpGridPHP)}/mo</strong></span>
                <span>Solar recovery: <strong>{inputs.solarWindowHours}hr window</strong></span>
              </div>
            </div>
          </div>

          {/* EaaS Terms */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Briefcase size={16}/> EaaS Contract Terms</h3>
            <div className="space-y-4">

              {/* Customer split slider */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">
                  Customer Share: <span className="text-slate-800">{inputs.customerSavingsPct}%</span>
                  <span className="text-orange-600 font-normal ml-1">(Solviva keeps {100 - inputs.customerSavingsPct}%)</span>
                </label>
                <input type="range" min="10" max="40" step="5" value={inputs.customerSavingsPct}
                  onChange={set('customerSavingsPct', true)} className="w-full accent-orange-500"/>
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5"><span>10% customer</span><span>40% customer</span></div>
              </div>

              {/* Contract term */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Contract Term</label>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 7, 10].map(yr => (
                    <button key={yr} onClick={() => setInputs(p => ({...p, contractYears: yr}))}
                      className={`py-2 rounded-lg font-bold text-sm transition-all ${inputs.contractYears === yr ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {yr}yr
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 text-center">7yr recommended — balances investor IRR vs contract risk</div>
              </div>

              <Input label="Installation / Unit ($)" type="number" value={inputs.installCostUSD} onChange={set('installCostUSD', true)}/>
              <Input label="Annual Opex / Unit ($)" type="number" value={inputs.annualOpexUSD} onChange={set('annualOpexUSD', true)}/>
              <Input label="Karnot Partner Discount (%)" type="number" value={inputs.karnotDiscountPct} onChange={set('karnotDiscountPct', true)}/>
              <Input label="Carbon Credit ($/t CO₂)" type="number" value={inputs.carbonCreditUSD} onChange={set('carbonCreditUSD', true)}/>
              <Input label="Utility Interest Rate (%)" type="number" value={inputs.utilityInterestRate} onChange={set('utilityInterestRate', true)}/>
            </div>
          </div>

          {/* Portfolio Slider */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Building size={16}/> Portfolio Size</h3>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                Units: <span className="text-orange-600 text-xl font-bold">{inputs.portfolioUnits}</span>
              </label>
              <input type="range" min="10" max="500" step="10" value={inputs.portfolioUnits}
                onChange={set('portfolioUnits', true)} className="w-full accent-orange-500"/>
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5"><span>10</span><span>500</span></div>
            </div>
            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">Total investment:</span><span className="font-bold">{fmtUSD(calc.portfolioInvestment)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Annual revenue:</span><span className="font-bold text-green-700">{fmtUSD(calc.portfolioAnnualRev)}</span></div>
              <div className="flex justify-between border-t border-orange-200 pt-1 mt-1">
                <span className="font-bold text-orange-900">Net profit ({inputs.contractYears}yr):</span>
                <span className={`font-bold text-xl ${calc.portfolioNetProfit > 0 ? 'text-orange-700' : 'text-red-600'}`}>
                  {fmtUSD(calc.portfolioNetProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: RESULTS ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border-2 border-orange-100 shadow-sm text-center">
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">IRR ({inputs.contractYears}yr)</div>
              <div className={`text-4xl font-bold ${irrColor}`}>{calc.irrPct.toFixed(0)}%</div>
              <div className="text-xs text-slate-400 mt-1">{Math.round(calc.paybackMonths)}mo payback</div>
            </div>
            <div className="bg-white p-5 rounded-xl border-2 border-green-100 shadow-sm text-center">
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Monthly Revenue</div>
              <div className="text-4xl font-bold text-green-700">{fmtUSD(calc.solvivaMonthlyUSD)}</div>
              <div className="text-xs text-slate-400 mt-1">Recurring / unit</div>
            </div>
            <div className="bg-white p-5 rounded-xl border-2 border-blue-100 shadow-sm text-center">
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Customer Saves</div>
              <div className="text-4xl font-bold text-blue-700">{fmtPHP(calc.customerSharePHP)}</div>
              <div className="text-xs text-slate-400 mt-1">/month · {calc.customerSavingsPctActual.toFixed(0)}% off bill</div>
            </div>
          </div>

          {/* Thermal Storage Engineering Panel */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <button onClick={() => setShowThermal(!showThermal)} className="w-full flex items-center justify-between">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Thermometer size={18} className="text-orange-500"/> Thermal Storage Engineering
                <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${calc.hpCapacityOK && calc.tankCoversNight ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {calc.hpCapacityOK && calc.tankCoversNight ? '✓ Correctly sized' : '⚠ Review sizing'}
                </span>
              </h3>
              {showThermal ? <ChevronUp/> : <ChevronDown/>}
            </button>

            {/* Always show summary row */}
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-xs text-blue-600 uppercase font-bold mb-1">Daily Thermal</div>
                <div className="text-xl font-bold text-blue-800">{fmtKWh(calc.dailyThermalKWh)}</div>
                <div className="text-[10px] text-blue-500">{inputs.dailyLiters}L × {calc.deltaT}°C ΔT</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg text-center">
                <div className="text-xs text-orange-600 uppercase font-bold mb-1">Tank Storage</div>
                <div className="text-xl font-bold text-orange-800">{fmtKWh(calc.tankStoredKWh)}</div>
                <div className="text-[10px] text-orange-500">{calc.tankVolume}L × {calc.deltaT}°C</div>
              </div>
              <div className={`p-3 rounded-lg text-center ${calc.hpCapacityOK ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className={`text-xs uppercase font-bold mb-1 ${calc.hpCapacityOK ? 'text-green-600' : 'text-red-600'}`}>HP Recovery</div>
                <div className={`text-xl font-bold ${calc.hpCapacityOK ? 'text-green-800' : 'text-red-800'}`}>{calc.hpKWRequired.toFixed(2)} kW</div>
                <div className={`text-[10px] ${calc.hpCapacityOK ? 'text-green-500' : 'text-red-500'}`}>Rated: {calc.hpRatedKW} kW {calc.hpCapacityOK ? '✓' : '✗'}</div>
              </div>
              <div className={`p-3 rounded-lg text-center ${calc.tankCoversNight ? 'bg-green-50' : 'bg-amber-50'}`}>
                <div className={`text-xs uppercase font-bold mb-1 ${calc.tankCoversNight ? 'text-green-600' : 'text-amber-600'}`}>Night Buffer</div>
                <div className={`text-xl font-bold ${calc.tankCoversNight ? 'text-green-800' : 'text-amber-800'}`}>{calc.tankCoverPct.toFixed(0)}%</div>
                <div className={`text-[10px] ${calc.tankCoversNight ? 'text-green-500' : 'text-amber-500'}`}>{calc.tankCoversNight ? 'Tank sufficient' : 'Top-up needed'}</div>
              </div>
            </div>

            {showThermal && (
              <div className="mt-4 space-y-3 text-sm">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-bold text-slate-700 mb-3">Daily Operation Cycle</h4>
                  <div className="space-y-2 text-slate-600">
                    <div className="flex items-start gap-3">
                      <div className="w-24 text-xs font-bold text-slate-500 pt-0.5">6pm – 6am</div>
                      <div>Household draws hot water from tank · <strong>{fmtKWh(calc.nightDemandKWh)}</strong> night demand (60%) · Tank stores <strong>{fmtKWh(calc.tankStoredKWh)}</strong> {calc.tankCoversNight ? '→ ✓ sufficient' : '→ HP top-up required'}</div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-24 text-xs font-bold text-slate-500 pt-0.5">8am – 4pm</div>
                      <div>Solviva solar powers AquaHERO · HP runs at <strong>{calc.hpKWRequired.toFixed(2)} kW</strong> for <strong>{inputs.solarWindowHours}hrs</strong> · Recovers full <strong>{fmtKWh(calc.dailyThermalKWh)}</strong> daily demand · Solar covers <strong>{inputs.solarCoverPct}%</strong></div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-24 text-xs font-bold text-slate-500 pt-0.5">Grid residual</div>
                      <div>Only <strong>{100 - inputs.solarCoverPct}%</strong> from grid · <strong>{fmtKWh(calc.monthlyHpGridKWh)}</strong>/month · Cost: <strong>{fmtPHP(calc.monthlyHpGridPHP)}/mo</strong></div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-24 text-xs font-bold text-slate-500 pt-0.5">vs. Electric</div>
                      <div>Old electric shower used <strong>{fmtKWh(calc.dailyBaselineKWh)}/day</strong> (COP 0.95) · HP uses <strong>{fmtKWh(calc.dailyHpKWh)}/day</strong> (COP {calc.cop}) · <strong>{((1 - calc.dailyHpKWh/calc.dailyBaselineKWh)*100).toFixed(0)}%</strong> less electricity</div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2"><Leaf size={14}/> Carbon Savings</h4>
                  <div className="grid grid-cols-3 gap-3 text-center text-sm">
                    <div><div className="font-bold text-red-600">{calc.annualBaselineCO2.toFixed(2)} t</div><div className="text-[10px] text-slate-500">CO₂/yr baseline</div></div>
                    <div><div className="font-bold text-green-600">{calc.annualHpCO2.toFixed(2)} t</div><div className="text-[10px] text-slate-500">CO₂/yr with AquaHERO</div></div>
                    <div><div className="font-bold text-emerald-600">{calc.annualCO2Saved.toFixed(2)} t</div><div className="text-[10px] text-slate-500">CO₂ saved = {fmtUSD(calc.annualCarbonRevUSD)}/yr</div></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Revenue Waterfall */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <DollarSign size={18} className="text-green-500"/> Revenue Waterfall — Per Unit
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Component</th>
                    <th className="px-4 py-3 text-right">PHP/mo</th>
                    <th className="px-4 py-3 text-right">USD/mo</th>
                    <th className="px-4 py-3 text-right">USD/yr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-red-50">
                    <td className="px-4 py-3 text-red-700 font-medium">Baseline — Electric shower (COP 0.95)</td>
                    <td className="px-4 py-3 text-right font-bold text-red-700">{fmtPHP(calc.monthlyBaselinePHP)}</td>
                    <td className="px-4 py-3 text-right text-red-400">{fmtUSD(calc.monthlyBaselinePHP/FX)}</td>
                    <td className="px-4 py-3 text-right text-red-400">{fmtUSD(calc.monthlyBaselinePHP/FX*12)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-amber-600">
                      HP grid cost ({100-inputs.solarCoverPct}% — {inputs.solarCoverPct}% Solviva solar)
                    </td>
                    <td className="px-4 py-3 text-right text-amber-600">({fmtPHP(calc.monthlyHpGridPHP)})</td>
                    <td className="px-4 py-3 text-right text-amber-500">({fmtUSD(calc.monthlyHpGridPHP/FX)})</td>
                    <td className="px-4 py-3 text-right text-amber-500">({fmtUSD(calc.monthlyHpGridPHP/FX*12)})</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="px-4 py-3 text-slate-700">Total Savings Pool</td>
                    <td className="px-4 py-3 text-right">{fmtPHP(calc.savingsPoolPHP)}</td>
                    <td className="px-4 py-3 text-right">{fmtUSD(calc.savingsPoolPHP/FX)}</td>
                    <td className="px-4 py-3 text-right">{fmtUSD(calc.savingsPoolPHP/FX*12)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-green-600">Customer keeps ({inputs.customerSavingsPct}%) — guaranteed bill discount</td>
                    <td className="px-4 py-3 text-right text-green-600">({fmtPHP(calc.customerSharePHP)})</td>
                    <td className="px-4 py-3 text-right text-green-500">({fmtUSD(calc.customerSharePHP/FX)})</td>
                    <td className="px-4 py-3 text-right text-green-500">({fmtUSD(calc.customerSharePHP/FX*12)})</td>
                  </tr>
                  <tr className="bg-orange-50 font-bold">
                    <td className="px-4 py-3 text-orange-900">Solviva EaaS Subscription ({100-inputs.customerSavingsPct}%)</td>
                    <td className="px-4 py-3 text-right text-orange-700">{fmtPHP(calc.solvivaSharePHP)}</td>
                    <td className="px-4 py-3 text-right text-orange-700">{fmtUSD(calc.solvivaMonthlyUSD)}</td>
                    <td className="px-4 py-3 text-right text-orange-700">{fmtUSD(calc.solvivaAnnualUSD)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-purple-600">+ Service revenue</td>
                    <td className="px-4 py-3 text-right text-purple-400">—</td>
                    <td className="px-4 py-3 text-right text-purple-400">—</td>
                    <td className="px-4 py-3 text-right text-purple-600">{fmtUSD(inputs.annualServiceUSD)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-emerald-600">+ Carbon credits ({calc.annualCO2Saved.toFixed(2)} t/yr)</td>
                    <td className="px-4 py-3 text-right text-emerald-400">—</td>
                    <td className="px-4 py-3 text-right text-emerald-400">—</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{fmtUSD(calc.annualCarbonRevUSD)}</td>
                  </tr>
                  <tr className="bg-orange-100 font-bold border-t-2 border-orange-300">
                    <td className="px-4 py-3 text-orange-900 text-base">Total Annual Revenue (Solviva)</td>
                    <td className="px-4 py-3 text-right">—</td>
                    <td className="px-4 py-3 text-right">—</td>
                    <td className="px-4 py-3 text-right text-orange-900 text-lg">{fmtUSD(calc.totalAnnualRev)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-red-500">– Opex + Financing cost</td>
                    <td className="px-4 py-3 text-right">—</td>
                    <td className="px-4 py-3 text-right">—</td>
                    <td className="px-4 py-3 text-right text-red-500">({fmtUSD(inputs.annualOpexUSD + calc.annualInterest)})</td>
                  </tr>
                  <tr className="bg-green-50 font-bold border-t-2 border-green-300">
                    <td className="px-4 py-3 text-green-900 text-base">Net Annual Cash Flow</td>
                    <td className="px-4 py-3 text-right">—</td>
                    <td className="px-4 py-3 text-right">—</td>
                    <td className={`px-4 py-3 text-right text-lg font-bold ${calc.annualNetCF >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtUSD(calc.annualNetCF)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Investment vs Returns */}
            <div className="grid grid-cols-2 gap-4 mt-5">
              <div className="border-2 border-slate-200 p-4 rounded-lg text-sm space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Solviva Investment / Unit</div>
                <div className="flex justify-between"><span className="text-slate-500">{selectedProduct?.name}</span><span className="font-bold">{fmtUSD(calc.unitPriceUSD)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Installation</span><span className="font-bold">{fmtUSD(inputs.installCostUSD)}</span></div>
                <div className="flex justify-between text-green-600"><span>Karnot discount ({inputs.karnotDiscountPct}%)</span><span className="font-bold">-{fmtUSD(calc.packageRetail - calc.utilityCOGS)}</span></div>
                <div className="flex justify-between border-t pt-2 font-bold"><span>Net COGS</span><span className="text-orange-700">{fmtUSD(calc.utilityCOGS)}</span></div>
              </div>
              <div className="border-2 border-slate-200 p-4 rounded-lg text-sm space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Returns / Unit ({inputs.contractYears}yr)</div>
                <div className="flex justify-between"><span className="text-slate-500">LTV</span><span className="font-bold">{fmtUSD(calc.ltvUSD)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Net profit</span><span className="font-bold">{fmtUSD(calc.netProfit)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Payback</span><span className="font-bold">{Math.round(calc.paybackMonths)} months</span></div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>ROI</span>
                  <span className={`text-lg ${roiColor}`}>{calc.roi.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Value */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Users size={18} className="text-blue-500"/> What the Customer Sees
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center">
                <div className="text-xs text-red-600 uppercase font-bold mb-1">Old Monthly Bill</div>
                <div className="text-2xl font-bold text-red-800">{fmtPHP(calc.monthlyBaselinePHP)}</div>
                <div className="text-xs text-red-500 mt-1">Electric shower</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-center">
                <div className="text-xs text-blue-600 uppercase font-bold mb-1">New Monthly Bill</div>
                <div className="text-2xl font-bold text-blue-800">{fmtPHP(calc.customerNewMonthly)}</div>
                <div className="text-xs text-blue-500 mt-1">Grid ({100-inputs.solarCoverPct}%) + EaaS fee</div>
              </div>
              <div className="bg-green-50 border-2 border-green-400 p-4 rounded-lg text-center">
                <div className="text-xs text-green-700 uppercase font-bold mb-1">Monthly Saving</div>
                <div className="text-2xl font-bold text-green-900">{fmtPHP(calc.customerSharePHP)}</div>
                <div className="text-xs text-green-600 mt-1">{calc.customerSavingsPctActual.toFixed(0)}% off old bill</div>
              </div>
            </div>
            <div className="mt-4 bg-slate-50 p-4 rounded-lg text-sm space-y-2">
              <div className="flex items-start gap-2"><CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0"/><span><strong>Zero upfront cost</strong> — AquaHERO installed free, just pay reduced monthly bill</span></div>
              <div className="flex items-start gap-2"><CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0"/><span><strong>Solar-powered hot water</strong> — {inputs.solarCoverPct}% from Solviva solar, only {100-inputs.solarCoverPct}% grid residual</span></div>
              <div className="flex items-start gap-2"><CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0"/><span><strong>Unlimited {inputs.dailyLiters}L/day</strong> at 55°C — tank stores overnight, solar recharges daily</span></div>
              <div className="flex items-start gap-2"><CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0"/><span><strong>PFAS-free R290 refrigerant</strong> — zero forever chemicals, compliant with 2027+ regulations</span></div>
              <div className="flex items-start gap-2"><CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0"/><span><strong>Saves {calc.annualCO2Saved.toFixed(2)} tonnes CO₂/year</strong> vs electric shower baseline</span></div>
            </div>
          </div>

          {/* Returns grid */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-orange-400 to-orange-600 text-white p-4 rounded-xl text-center shadow">
              <div className="text-xs uppercase font-bold text-orange-100 mb-1">IRR</div>
              <div className="text-3xl font-bold">{calc.irrPct.toFixed(0)}%</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-4 rounded-xl text-center shadow">
              <div className="text-xs uppercase font-bold text-green-100 mb-1">ROI</div>
              <div className="text-3xl font-bold">{calc.roi.toFixed(0)}%</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-4 rounded-xl text-center shadow">
              <div className="text-xs uppercase font-bold text-blue-100 mb-1">Payback</div>
              <div className="text-3xl font-bold">{Math.round(calc.paybackMonths)}mo</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-4 rounded-xl text-center shadow">
              <div className="text-xs uppercase font-bold text-purple-100 mb-1">NPV @10%</div>
              <div className="text-3xl font-bold">{fmtUSD(calc.npv10)}</div>
            </div>
          </div>

          {/* NPV sensitivity */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h4 className="text-sm font-bold text-slate-600 mb-3">NPV Sensitivity (Discount Rate)</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className={`text-xl font-bold ${calc.npv8 > 0 ? 'text-green-700' : 'text-red-600'}`}>{fmtUSD(calc.npv8)}</div><div className="text-xs text-slate-500">@ 8%</div></div>
              <div><div className={`text-xl font-bold ${calc.npv10 > 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmtUSD(calc.npv10)}</div><div className="text-xs text-slate-500">@ 10%</div></div>
              <div><div className={`text-xl font-bold ${calc.npv12 > 0 ? 'text-slate-700' : 'text-red-600'}`}>{fmtUSD(calc.npv12)}</div><div className="text-xs text-slate-500">@ 12%</div></div>
            </div>
          </div>

          {/* Cash Flow Schedule */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <button onClick={() => setShowCashFlows(!showCashFlows)} className="w-full flex items-center justify-between">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <BarChart3 size={18} className="text-indigo-500"/> Cash Flow Schedule ({inputs.contractYears}yr)
              </h3>
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
                    {calc.schedule.map(row => (
                      <tr key={row.year} className={`border-b ${row.cumulative >= 0 && row.year > 0 ? 'bg-green-50/30' : ''}`}>
                        <td className="px-3 py-2 font-bold">{row.year === 0 ? 'Y0' : `Y${row.year}`}</td>
                        <td className="px-3 py-2 text-right text-green-600">{row.revenue > 0 ? fmtUSD(row.revenue) : '—'}</td>
                        <td className="px-3 py-2 text-right text-orange-500">{row.opex > 0 ? `(${fmtUSD(row.opex)})` : '—'}</td>
                        <td className="px-3 py-2 text-right text-red-400">({fmtUSD(row.interest)})</td>
                        <td className={`px-3 py-2 text-right font-bold ${row.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {row.net >= 0 ? fmtUSD(row.net) : `(${fmtUSD(Math.abs(row.net))})`}
                        </td>
                        <td className={`px-3 py-2 text-right font-bold ${row.cumulative >= 0 ? 'text-green-600' : 'text-red-500'}`}>
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

      {/* ── PORTFOLIO PROJECTION ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Building size={24} className="text-orange-500"/> Portfolio Projection — {inputs.portfolioUnits} Residential Units
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">${(calc.portfolioInvestment/1000000).toFixed(1)}M</div>
            <div className="text-sm text-gray-300">Solviva Investment</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-700 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">${(calc.portfolioAnnualRev/1000).toFixed(0)}K</div>
            <div className="text-sm text-orange-200">Annual Revenue</div>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-800 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">${(calc.portfolioNetProfit/1000000).toFixed(1)}M</div>
            <div className="text-sm text-green-200">{inputs.contractYears}-Year Net Profit</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">{fmt(calc.portfolioCO2)} t</div>
            <div className="text-sm text-emerald-200">CO₂ Saved / Year</div>
          </div>
        </div>

        {/* Solviva solar cross-sell */}
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-5">
          <h4 className="font-bold text-yellow-800 mb-3 flex items-center gap-2"><Sun size={18}/> Solviva Solar Cross-Sell — Natural Upsell from EaaS Relationship</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-yellow-800">{calc.solvivaLeads}</div>
              <div className="text-xs text-slate-600">{inputs.solvivaConversionRate}% of {inputs.portfolioUnits} EaaS customers add solar</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-800">{fmtUSD(calc.solvivaReferralRev)}</div>
              <div className="text-xs text-slate-600">Referral revenue ({inputs.solvivaReferralPct}%)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-800">{fmtUSD(calc.solvivaGroupRev)}</div>
              <div className="text-xs text-slate-600">Total solar revenue (Solviva group)</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── WHY SOLVIVA WINS ── */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-8">
        <h3 className="text-2xl font-bold mb-2 flex items-center gap-2"><Award size={24}/> Why Solviva Wins the Residential Market</h3>
        <p className="text-slate-400 text-sm mb-6">Solviva Energy Solutions — daughter company of AboitizPower · Exclusive Karnot partner</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* LEFT: COMPETITIVE ADVANTAGES */}
          <div>
            <h4 className="font-bold text-orange-400 mb-4 text-sm uppercase tracking-wide">Competitive Advantages</h4>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-start gap-3">
                <CheckCircle size={17} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Solar + Heat Pump Bundle:</strong> Solviva solar powers the AquaHERO — customer gets solar hot water with <strong className="text-green-300">zero upfront cost</strong>. No competitor offers this integrated EaaS bundle.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={17} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">AboitizPower Parent Brand:</strong> Established trust across Luzon residential market → faster customer acquisition vs unknown competitors.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={17} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Existing Customer Base:</strong> Deploy to current AboitizPower electricity customers — pre-qualified, bill-paying, meter-connected.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={17} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Karnot Exclusive Discount:</strong> <strong className="text-green-300">{inputs.karnotDiscountPct}% off</strong> — saves {fmtUSD(calc.packageRetail - calc.utilityCOGS)} per unit vs full retail. No other partner gets this.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={17} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">PFAS-Free R290 Technology:</strong> Ahead of 2027 global refrigerant regulations. Competitors still selling F-gas units facing mandatory replacement.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={17} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Cross-Sell Flywheel:</strong> EaaS relationship → <strong className="text-green-300">{inputs.solvivaConversionRate}% conversion</strong> to Solviva solar → {fmtUSD(calc.solvivaGroupRev)} group solar revenue from {inputs.portfolioUnits} deployments.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={17} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Cheap Capital Advantage:</strong> Investment-grade <strong className="text-green-300">{inputs.utilityInterestRate}% borrowing cost</strong> → lower financing drag per unit than any startup competitor.</span>
              </li>
            </ul>
          </div>

          {/* RIGHT: LIVE NUMBERS */}
          <div>
            <h4 className="font-bold text-green-400 mb-4 text-sm uppercase tracking-wide">Revenue Model — Live Numbers</h4>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-start gap-3">
                <TrendingUp size={17} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">EaaS Subscription ({100-inputs.customerSavingsPct}% of savings):</strong> <strong className="text-green-300">{fmtUSD(calc.solvivaAnnualUSD)}/unit/year</strong> — pure recurring, no incremental cost after install</span>
              </li>
              <li className="flex items-start gap-3">
                <TrendingUp size={17} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Service + Carbon credits:</strong> <strong className="text-green-300">{fmtUSD(inputs.annualServiceUSD + calc.annualCarbonRevUSD)}/year</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <TrendingUp size={17} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Total annual revenue:</strong> <strong className="text-green-300">{fmtUSD(calc.totalAnnualRev)}/unit/year</strong></span>
              </li>
              <li className="flex items-start gap-3 bg-orange-900/30 rounded-lg p-3 my-1">
                <TrendingUp size={17} className="text-orange-300 mt-0.5 flex-shrink-0"/>
                <span>
                  <strong className="text-orange-200">{calc.irrPct.toFixed(0)}% IRR</strong>{' '}
                  | <strong className="text-orange-200">{Math.round(calc.paybackMonths)}mo payback</strong>{' '}
                  | <strong className="text-orange-200">{calc.roi.toFixed(0)}% ROI</strong>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <TrendingUp size={17} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Customer wins:</strong> Saves <strong className="text-green-300">{fmtPHP(calc.customerSharePHP)}/month</strong> on hot water bill — <strong>zero upfront cost</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <TrendingUp size={17} className="text-green-400 mt-0.5 flex-shrink-0"/>
                <span><strong className="text-white">Portfolio ({inputs.portfolioUnits} units):</strong> <strong className="text-green-300">{fmtUSD(calc.portfolioInvestment)} deployed</strong> → <strong className="text-green-300">{fmtUSD(calc.portfolioNetProfit)} net profit</strong> over {inputs.contractYears} years</span>
              </li>
            </ul>

            <div className="mt-5 bg-gradient-to-r from-orange-800 to-amber-800 rounded-xl p-4 border border-orange-600">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-xs text-orange-300 uppercase mb-1">Total Investment</div>
                  <div className="text-2xl font-bold">{fmtUSD(calc.portfolioInvestment)}</div>
                  <div className="text-xs text-orange-400">{inputs.portfolioUnits} units × {fmtUSD(calc.utilityCOGS)}</div>
                </div>
                <div>
                  <div className="text-xs text-orange-300 uppercase mb-1">{inputs.contractYears}-Year Return</div>
                  <div className="text-2xl font-bold text-green-300">{fmtUSD(calc.portfolioNetProfit)}</div>
                  <div className="text-xs text-orange-400">{calc.roi.toFixed(0)}% ROI · {calc.irrPct.toFixed(0)}% IRR</div>
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
