import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, DollarSign, BarChart3, PieChart, Target, Award,
  Building, Users, Zap, Leaf, AlertCircle, CheckCircle, Info,
  ChevronDown, ChevronUp, Download, RefreshCw, Calculator,
  Briefcase, LineChart, ArrowRight, Shield
} from 'lucide-react';
import { Card, Button, Input, Section } from '../data/constants.jsx';

// ==========================================
// SOLVIVA-STYLE INVESTOR FINANCIAL MODEL
// For Karnot Heat Pump Rent-to-Own Portfolio
// ==========================================

const InvestorFinancialModel = () => {
  // === INVESTOR INPUTS ===
  const [inputs, setInputs] = useState({
    // Unit Economics
    currency: 'PHP',
    equipmentCostUSD: 3500,      // Heat pump system cost
    installationCostUSD: 600,    // Installation cost
    serviceReservePercent: 20,   // 5-year service reserve

    // Customer Profile
    heatingType: 'lpg',          // What customer is replacing
    lpgBottlesPerMonth: 28,      // LPG consumption (for SME)
    lpgPricePerBottle: 950,      // PHP per 11kg bottle
    dailyLitersHotWater: 1500,   // Daily hot water demand
    electricityRate: 12.25,      // PHP per kWh

    // Revenue Model
    monthlyEaaSFee: 23500,       // Monthly Energy-as-a-Service fee (PHP)
    electricityMargin: 15,       // % margin on electricity sales
    carbonCreditPrice: 15,       // USD per ton CO2
    contractYears: 5,            // Contract term

    // Financing
    interestRate: 8,             // Annual interest rate
    financingTerm: 5,            // Loan term years

    // Portfolio
    portfolioUnits: 250,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCashFlows, setShowCashFlows] = useState(false);
  const [showComparison, setShowComparison] = useState(true);

  // === CONSTANTS ===
  const CONFIG = {
    FX_RATE: 58.5,               // PHP to USD
    COP_HEAT_PUMP: 3.85,         // Coefficient of Performance
    COP_ELECTRIC: 0.95,          // Electric heater efficiency
    KWH_PER_LITER_HOTWATER: 0.0581, // kWh to heat 1L by ~40°C
    LPG_KWH_PER_KG: 12.35,       // Energy content of LPG
    LPG_CO2_PER_KG: 3.0,         // kg CO2 per kg LPG
    PEAK_REDUCTION_KW: 3.5,      // Peak demand reduction per unit
    GRID_EMISSION_FACTOR: 0.7,   // kg CO2 per kWh (PH grid)
  };

  // === CURRENCY FORMATTING ===
  const fxRate = inputs.currency === 'USD' ? 1 : CONFIG.FX_RATE;
  const symbol = inputs.currency === 'USD' ? '$' : '₱';
  const fmt = (n, decimals = 0) => (+n || 0).toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
  const fmtUSD = (n) => `$${fmt(n)}`;
  const fmtLocal = (n) => `${symbol}${fmt(n)}`;

  // === CORE CALCULATIONS ===
  const calculations = useMemo(() => {
    // --- UNIT ECONOMICS ---
    // Investment per unit
    const equipmentCost = inputs.equipmentCostUSD;
    const installationCost = inputs.installationCostUSD;
    const baseInvestment = equipmentCost + installationCost;
    const serviceReserve = baseInvestment * (inputs.serviceReservePercent / 100);
    const netOutlay = baseInvestment + serviceReserve;

    // Financing costs (simple interest for illustration)
    const totalInterest = netOutlay * (inputs.interestRate / 100) * inputs.financingTerm;
    const financingFees = netOutlay * 0.01; // 1% origination
    const totalInvestmentUSD = netOutlay + totalInterest + financingFees;

    // --- CUSTOMER CURRENT COSTS ---
    let customerCurrentMonthlyCost = 0;
    let lpgKgPerYear = 0;

    if (inputs.heatingType === 'lpg') {
      // LPG customer
      customerCurrentMonthlyCost = inputs.lpgBottlesPerMonth * inputs.lpgPricePerBottle;
      lpgKgPerYear = inputs.lpgBottlesPerMonth * 11 * 12; // kg per year
    } else {
      // Electric customer
      const dailyKwh = (inputs.dailyLitersHotWater * CONFIG.KWH_PER_LITER_HOTWATER) / CONFIG.COP_ELECTRIC;
      customerCurrentMonthlyCost = dailyKwh * 30 * inputs.electricityRate;
      lpgKgPerYear = (dailyKwh * 365) / CONFIG.LPG_KWH_PER_KG; // Equivalent for carbon
    }
    const customerCurrentMonthlyUSD = customerCurrentMonthlyCost / CONFIG.FX_RATE;

    // --- HEAT PUMP OPERATING COST ---
    const dailyHeatPumpKwh = (inputs.dailyLitersHotWater * CONFIG.KWH_PER_LITER_HOTWATER) / CONFIG.COP_HEAT_PUMP;
    const monthlyHeatPumpKwh = dailyHeatPumpKwh * 30;
    const heatPumpMonthlyCostPHP = monthlyHeatPumpKwh * inputs.electricityRate;
    const heatPumpMonthlyCostUSD = heatPumpMonthlyCostPHP / CONFIG.FX_RATE;

    // --- CUSTOMER VALUE PROPOSITION ---
    const energySavingsPHP = customerCurrentMonthlyCost - heatPumpMonthlyCostPHP;
    const energySavingsUSD = energySavingsPHP / CONFIG.FX_RATE;
    const monthlyFeePHP = inputs.monthlyEaaSFee;
    const monthlyFeeUSD = monthlyFeePHP / CONFIG.FX_RATE;
    const customerNetPositionPHP = energySavingsPHP - monthlyFeePHP + heatPumpMonthlyCostPHP;

    // --- REVENUE STREAMS (Per Unit, Annual) ---
    // 1. Equipment Rental / EaaS Fee
    const annualRentalUSD = monthlyFeeUSD * 12;

    // 2. Electricity Sales Margin
    const annualElectricityKwh = monthlyHeatPumpKwh * 12;
    const electricityCostToKarnot = annualElectricityKwh * (inputs.electricityRate * 0.85) / CONFIG.FX_RATE; // Bulk rate
    const electricityChargedToCustomer = annualElectricityKwh * inputs.electricityRate / CONFIG.FX_RATE;
    const annualElectricityMarginUSD = (electricityChargedToCustomer - electricityCostToKarnot) * (inputs.electricityMargin / 100);

    // 3. Carbon Credits
    const annualCO2TonsAvoided = (lpgKgPerYear * CONFIG.LPG_CO2_PER_KG) / 1000;
    const annualCarbonRevenueUSD = annualCO2TonsAvoided * inputs.carbonCreditPrice;

    // Total Revenue per Unit
    const totalAnnualRevenueUSD = annualRentalUSD + annualElectricityMarginUSD + annualCarbonRevenueUSD;

    // --- OPERATING COSTS (Per Unit, Annual) ---
    const maintenanceCostUSD = baseInvestment * 0.02; // 2% of equipment
    const insuranceCostUSD = baseInvestment * 0.01;   // 1% of equipment
    const customerAcquisitionCostUSD = 150;           // CAC per unit
    const totalOperatingCostsUSD = maintenanceCostUSD + insuranceCostUSD;

    // --- PROFITABILITY ---
    const netAnnualCashFlowUSD = totalAnnualRevenueUSD - totalOperatingCostsUSD;
    const total5YearRevenueUSD = totalAnnualRevenueUSD * inputs.contractYears;
    const total5YearCostsUSD = totalOperatingCostsUSD * inputs.contractYears;
    const netProfit5YearUSD = total5YearRevenueUSD - total5YearCostsUSD - totalInvestmentUSD;

    // --- KEY METRICS ---
    // Payback Period (months)
    const monthlyNetCashFlow = netAnnualCashFlowUSD / 12;
    const paybackMonths = totalInvestmentUSD / monthlyNetCashFlow;

    // Simple ROI
    const roi5Year = ((netProfit5YearUSD / totalInvestmentUSD) * 100);
    const roiAnnual = roi5Year / inputs.contractYears;

    // IRR Calculation (Newton-Raphson approximation)
    const calculateIRR = () => {
      const cashFlows = [-totalInvestmentUSD];
      for (let i = 0; i < inputs.contractYears; i++) {
        cashFlows.push(netAnnualCashFlowUSD);
      }

      let irr = 0.15; // Initial guess
      for (let iter = 0; iter < 100; iter++) {
        let npv = 0;
        let derivative = 0;
        for (let t = 0; t < cashFlows.length; t++) {
          const factor = Math.pow(1 + irr, t);
          npv += cashFlows[t] / factor;
          if (t > 0) derivative -= t * cashFlows[t] / (factor * (1 + irr));
        }
        if (Math.abs(npv) < 0.01) break;
        irr = irr - npv / derivative;
        if (irr < -0.99 || irr > 10) irr = 0.15;
      }
      return irr * 100;
    };
    const irrPercent = calculateIRR();

    // NPV at various discount rates
    const calculateNPV = (rate) => {
      let npv = -totalInvestmentUSD;
      for (let t = 1; t <= inputs.contractYears; t++) {
        npv += netAnnualCashFlowUSD / Math.pow(1 + rate, t);
      }
      return npv;
    };

    const npv8 = calculateNPV(0.08);
    const npv10 = calculateNPV(0.10);
    const npv12 = calculateNPV(0.12);

    // --- CASH FLOW SCHEDULE ---
    const cashFlowSchedule = [];
    let cumulativeCashFlow = -totalInvestmentUSD;

    for (let year = 0; year <= inputs.contractYears; year++) {
      if (year === 0) {
        cashFlowSchedule.push({
          year: 0,
          investment: -totalInvestmentUSD,
          revenue: 0,
          opex: 0,
          netCashFlow: -totalInvestmentUSD,
          cumulative: cumulativeCashFlow
        });
      } else {
        const netCF = netAnnualCashFlowUSD;
        cumulativeCashFlow += netCF;
        cashFlowSchedule.push({
          year,
          investment: 0,
          revenue: totalAnnualRevenueUSD,
          opex: -totalOperatingCostsUSD,
          netCashFlow: netCF,
          cumulative: cumulativeCashFlow
        });
      }
    }

    // --- PORTFOLIO PROJECTIONS ---
    const units = inputs.portfolioUnits;
    const portfolioInvestment = totalInvestmentUSD * units;
    const portfolioAnnualRevenue = totalAnnualRevenueUSD * units;
    const portfolioNetProfit5Year = netProfit5YearUSD * units;
    const portfolioCO2Reduction = annualCO2TonsAvoided * units;
    const portfolioPeakReduction = (CONFIG.PEAK_REDUCTION_KW * units) / 1000; // MW
    const portfolioCarbonRevenue = annualCarbonRevenueUSD * units;

    // --- SOLVIVA COMPARISON ---
    const solvivaComparison = {
      karnot: {
        name: 'Karnot Heat Pumps',
        assetType: 'Heat Pump Systems',
        avgTicket: totalInvestmentUSD,
        contractTerm: inputs.contractYears,
        paybackMonths: Math.round(paybackMonths),
        irr: irrPercent.toFixed(1),
        revenueStreams: 3,
        carbonImpact: annualCO2TonsAvoided.toFixed(1),
      },
      solviva: {
        name: 'Solviva Solar',
        assetType: 'Rooftop Solar Systems',
        avgTicket: 4500,
        contractTerm: 5,
        paybackMonths: 24,
        irr: '25-35',
        revenueStreams: 2,
        carbonImpact: 3.5,
      }
    };

    return {
      // Unit Economics
      equipmentCost,
      installationCost,
      baseInvestment,
      serviceReserve,
      totalInvestmentUSD,

      // Customer
      customerCurrentMonthlyCost,
      customerCurrentMonthlyUSD,
      heatPumpMonthlyCostPHP,
      heatPumpMonthlyCostUSD,
      energySavingsPHP,
      energySavingsUSD,
      monthlyFeePHP,
      monthlyFeeUSD,
      customerNetPositionPHP,

      // Revenue Streams
      annualRentalUSD,
      annualElectricityMarginUSD,
      annualCarbonRevenueUSD,
      totalAnnualRevenueUSD,

      // Costs
      totalOperatingCostsUSD,
      maintenanceCostUSD,
      insuranceCostUSD,

      // Profitability
      netAnnualCashFlowUSD,
      total5YearRevenueUSD,
      netProfit5YearUSD,

      // Key Metrics
      paybackMonths,
      roi5Year,
      roiAnnual,
      irrPercent,
      npv8,
      npv10,
      npv12,

      // Carbon
      lpgKgPerYear,
      annualCO2TonsAvoided,

      // Cash Flows
      cashFlowSchedule,

      // Portfolio
      portfolioInvestment,
      portfolioAnnualRevenue,
      portfolioNetProfit5Year,
      portfolioCO2Reduction,
      portfolioPeakReduction,
      portfolioCarbonRevenue,

      // Comparison
      solvivaComparison,
    };
  }, [inputs]);

  const handleChange = (field, isNumber = false) => (e) => {
    const val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    setInputs(prev => ({ ...prev, [field]: val }));
  };

  // === SENSITIVITY ANALYSIS ===
  const sensitivityData = useMemo(() => {
    const scenarios = [];
    const baseFee = inputs.monthlyEaaSFee;

    [-20, -10, 0, 10, 20].forEach(feeChange => {
      const testFee = baseFee * (1 + feeChange / 100);
      const testInputs = { ...inputs, monthlyEaaSFee: testFee };

      // Recalculate key metrics
      const monthlyFeeUSD = testFee / CONFIG.FX_RATE;
      const annualRental = monthlyFeeUSD * 12;
      const totalRevenue = annualRental + calculations.annualElectricityMarginUSD + calculations.annualCarbonRevenueUSD;
      const netCashFlow = totalRevenue - calculations.totalOperatingCostsUSD;
      const payback = calculations.totalInvestmentUSD / (netCashFlow / 12);

      // Simple IRR approximation
      let irr = ((netCashFlow * 5 - calculations.totalInvestmentUSD) / calculations.totalInvestmentUSD) / 5 * 100;
      irr = Math.max(0, irr * 1.5); // Rough adjustment

      scenarios.push({
        feeChange,
        fee: testFee,
        paybackMonths: Math.round(payback),
        irr: irr.toFixed(1),
      });
    });

    return scenarios;
  }, [inputs, calculations]);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* === HEADER === */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <Briefcase size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Karnot Energy Investment Model</h1>
            <p className="text-blue-200">Heat Pump Rent-to-Own Portfolio | Solviva-Style EaaS</p>
          </div>
        </div>
        <p className="text-sm text-gray-300 max-w-3xl">
          This model demonstrates Karnot's utility-partnership opportunity, mirroring Solviva Energy's proven
          rent-to-own solar model but applied to commercial heat pump deployments for LPG replacement.
        </p>
      </div>

      {/* === EXECUTIVE SUMMARY === */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 mb-8 text-white">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Target size={20} /> Executive Summary (Per Unit)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{fmtUSD(calculations.totalInvestmentUSD)}</div>
            <div className="text-xs text-emerald-100">Total Investment</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{fmtUSD(calculations.total5YearRevenueUSD)}</div>
            <div className="text-xs text-emerald-100">5-Year Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{fmtUSD(calculations.netProfit5YearUSD)}</div>
            <div className="text-xs text-emerald-100">5-Year Net Profit</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{calculations.irrPercent.toFixed(1)}%</div>
            <div className="text-xs text-emerald-100">IRR</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{Math.round(calculations.paybackMonths)} mo</div>
            <div className="text-xs text-emerald-100">Payback Period</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* === INPUT PANEL === */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Calculator size={20} className="text-blue-600" /> Model Inputs
            </h3>

            {/* Currency Toggle */}
            <div className="flex gap-2 mb-4">
              {['PHP', 'USD'].map(curr => (
                <button
                  key={curr}
                  onClick={() => setInputs(prev => ({ ...prev, currency: curr }))}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                    inputs.currency === curr
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {curr === 'PHP' ? '₱ PHP' : '$ USD'}
                </button>
              ))}
            </div>

            {/* Customer Profile */}
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Customer Heating Source</label>
              <select
                value={inputs.heatingType}
                onChange={handleChange('heatingType')}
                className="w-full p-2 border rounded-lg"
              >
                <option value="lpg">LPG / Propane</option>
                <option value="electric">Grid Electric</option>
              </select>
            </div>

            {inputs.heatingType === 'lpg' && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Input
                  label="LPG Bottles/Month"
                  type="number"
                  value={inputs.lpgBottlesPerMonth}
                  onChange={handleChange('lpgBottlesPerMonth', true)}
                />
                <Input
                  label={`Price/Bottle (${symbol})`}
                  type="number"
                  value={inputs.lpgPricePerBottle}
                  onChange={handleChange('lpgPricePerBottle', true)}
                />
              </div>
            )}

            <Input
              label="Daily Hot Water (Liters)"
              type="number"
              value={inputs.dailyLitersHotWater}
              onChange={handleChange('dailyLitersHotWater', true)}
              className="mb-4"
            />

            <Input
              label={`Monthly EaaS Fee (${symbol})`}
              type="number"
              value={inputs.monthlyEaaSFee}
              onChange={handleChange('monthlyEaaSFee', true)}
              className="mb-4"
            />

            {/* Advanced Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4"
            >
              <span className="text-sm font-bold text-gray-600">Advanced Settings</span>
              {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {showAdvanced && (
              <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <Input
                  label="Equipment Cost (USD)"
                  type="number"
                  value={inputs.equipmentCostUSD}
                  onChange={handleChange('equipmentCostUSD', true)}
                />
                <Input
                  label="Installation Cost (USD)"
                  type="number"
                  value={inputs.installationCostUSD}
                  onChange={handleChange('installationCostUSD', true)}
                />
                <Input
                  label="Interest Rate (%)"
                  type="number"
                  value={inputs.interestRate}
                  onChange={handleChange('interestRate', true)}
                />
                <Input
                  label="Carbon Credit ($/ton)"
                  type="number"
                  value={inputs.carbonCreditPrice}
                  onChange={handleChange('carbonCreditPrice', true)}
                />
              </div>
            )}

            {/* Portfolio Slider */}
            <div className="mt-6 pt-4 border-t">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Portfolio Size</label>
              <div className="text-center mb-2">
                <span className="text-3xl font-bold text-blue-600">{inputs.portfolioUnits}</span>
                <span className="text-gray-500 ml-2">Units</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="25"
                value={inputs.portfolioUnits}
                onChange={handleChange('portfolioUnits', true)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>50</span>
                <span>500</span>
              </div>
            </div>
          </Card>
        </div>

        {/* === RESULTS PANEL === */}
        <div className="lg:col-span-2 space-y-6">
          {/* Unit Economics */}
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-green-600" /> Unit Economics
            </h3>

            <div className="grid grid-cols-2 gap-6">
              {/* Investment Breakdown */}
              <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">Investment Per Unit</h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Equipment</span>
                    <span className="font-semibold">{fmtUSD(calculations.equipmentCost)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Installation</span>
                    <span className="font-semibold">{fmtUSD(calculations.installationCost)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Service Reserve (5yr)</span>
                    <span className="font-semibold">{fmtUSD(calculations.serviceReserve)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Financing Costs</span>
                    <span className="font-semibold">{fmtUSD(calculations.totalInvestmentUSD - calculations.baseInvestment - calculations.serviceReserve)}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-blue-50 rounded-lg px-3 -mx-3">
                    <span className="font-bold text-gray-800">Total Investment</span>
                    <span className="font-bold text-blue-600 text-lg">{fmtUSD(calculations.totalInvestmentUSD)}</span>
                  </div>
                </div>
              </div>

              {/* Revenue Streams */}
              <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">Annual Revenue Per Unit</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-l-4 border-blue-500">
                    <div className="text-xs font-bold text-blue-600 uppercase">1. Equipment Rental (EaaS)</div>
                    <div className="text-xl font-bold text-gray-800">{fmtUSD(calculations.annualRentalUSD)}<span className="text-sm text-gray-500">/year</span></div>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border-l-4 border-green-500">
                    <div className="text-xs font-bold text-green-600 uppercase">2. Electricity Margin</div>
                    <div className="text-xl font-bold text-gray-800">{fmtUSD(calculations.annualElectricityMarginUSD)}<span className="text-sm text-gray-500">/year</span></div>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg border-l-4 border-emerald-500">
                    <div className="text-xs font-bold text-emerald-600 uppercase">3. Carbon Credits</div>
                    <div className="text-xl font-bold text-gray-800">{fmtUSD(calculations.annualCarbonRevenueUSD)}<span className="text-sm text-gray-500">/year</span></div>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg">
                    <div className="text-xs font-bold text-purple-600 uppercase">Total Annual Revenue</div>
                    <div className="text-2xl font-bold text-purple-700">{fmtUSD(calculations.totalAnnualRevenueUSD)}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Customer Value Proposition */}
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users size={20} className="text-orange-600" /> Customer Value Proposition
            </h3>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <div className="text-xs font-bold text-red-600 uppercase mb-1">Current Monthly Cost</div>
                <div className="text-2xl font-bold text-red-700">{fmtLocal(calculations.customerCurrentMonthlyCost)}</div>
                <div className="text-xs text-gray-500">{inputs.heatingType === 'lpg' ? 'LPG' : 'Electric'}</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <div className="text-xs font-bold text-green-600 uppercase mb-1">With Karnot</div>
                <div className="text-2xl font-bold text-green-700">{fmtLocal(calculations.monthlyFeePHP)}</div>
                <div className="text-xs text-gray-500">EaaS Fee</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <div className="text-xs font-bold text-blue-600 uppercase mb-1">Customer Saves</div>
                <div className="text-2xl font-bold text-blue-700">{fmtLocal(calculations.energySavingsPHP - calculations.monthlyFeePHP)}/mo</div>
                <div className="text-xs text-gray-500">Net Savings</div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                <Award size={16} /> Customer Gets (Zero CAPEX):
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>Zero upfront cost</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>Free maintenance</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>No LPG fire risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>ESG compliance</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Key Investment Metrics */}
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-green-600" /> Investment Returns
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-4 rounded-xl text-center">
                <div className="text-3xl font-bold">{Math.round(calculations.paybackMonths)} mo</div>
                <div className="text-xs text-blue-100">Payback Period</div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-4 rounded-xl text-center">
                <div className="text-3xl font-bold">{calculations.irrPercent.toFixed(1)}%</div>
                <div className="text-xs text-green-100">IRR</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-4 rounded-xl text-center">
                <div className="text-3xl font-bold">{calculations.roiAnnual.toFixed(1)}%</div>
                <div className="text-xs text-purple-100">Annual ROI</div>
              </div>
              <div className="bg-gradient-to-br from-teal-500 to-teal-700 text-white p-4 rounded-xl text-center">
                <div className="text-3xl font-bold">{fmtUSD(calculations.npv10)}</div>
                <div className="text-xs text-teal-100">NPV @10%</div>
              </div>
            </div>

            {/* NPV Sensitivity */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-bold text-gray-600 mb-3">NPV at Different Discount Rates</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-800">{fmtUSD(calculations.npv8)}</div>
                  <div className="text-xs text-gray-500">@ 8%</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{fmtUSD(calculations.npv10)}</div>
                  <div className="text-xs text-gray-500">@ 10%</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-800">{fmtUSD(calculations.npv12)}</div>
                  <div className="text-xs text-gray-500">@ 12%</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Cash Flow Schedule */}
          <Card>
            <button
              onClick={() => setShowCashFlows(!showCashFlows)}
              className="w-full flex items-center justify-between"
            >
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <BarChart3 size={20} className="text-indigo-600" /> Cash Flow Schedule
              </h3>
              {showCashFlows ? <ChevronUp /> : <ChevronDown />}
            </button>

            {showCashFlows && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Year</th>
                      <th className="px-3 py-2 text-right">Investment</th>
                      <th className="px-3 py-2 text-right">Revenue</th>
                      <th className="px-3 py-2 text-right">OPEX</th>
                      <th className="px-3 py-2 text-right">Net CF</th>
                      <th className="px-3 py-2 text-right">Cumulative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculations.cashFlowSchedule.map(row => (
                      <tr key={row.year} className="border-b">
                        <td className="px-3 py-2 font-bold">{row.year}</td>
                        <td className="px-3 py-2 text-right text-red-600">{row.investment < 0 ? `(${fmtUSD(Math.abs(row.investment))})` : '-'}</td>
                        <td className="px-3 py-2 text-right text-green-600">{row.revenue > 0 ? fmtUSD(row.revenue) : '-'}</td>
                        <td className="px-3 py-2 text-right text-orange-600">{row.opex < 0 ? `(${fmtUSD(Math.abs(row.opex))})` : '-'}</td>
                        <td className={`px-3 py-2 text-right font-bold ${row.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {row.netCashFlow >= 0 ? fmtUSD(row.netCashFlow) : `(${fmtUSD(Math.abs(row.netCashFlow))})`}
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
          </Card>

          {/* Sensitivity Analysis */}
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <LineChart size={20} className="text-purple-600" /> Sensitivity Analysis
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Fee Change</th>
                    <th className="px-4 py-2 text-right">Monthly Fee</th>
                    <th className="px-4 py-2 text-right">Payback (mo)</th>
                    <th className="px-4 py-2 text-right">IRR</th>
                  </tr>
                </thead>
                <tbody>
                  {sensitivityData.map(row => (
                    <tr key={row.feeChange} className={`border-b ${row.feeChange === 0 ? 'bg-blue-50 font-bold' : ''}`}>
                      <td className="px-4 py-2">{row.feeChange >= 0 ? '+' : ''}{row.feeChange}%</td>
                      <td className="px-4 py-2 text-right">{fmtLocal(row.fee)}</td>
                      <td className="px-4 py-2 text-right">{row.paybackMonths}</td>
                      <td className="px-4 py-2 text-right">{row.irr}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* === PORTFOLIO PROJECTION === */}
      <Card className="mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Building size={24} className="text-blue-600" /> Portfolio Projection: {inputs.portfolioUnits} Units
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">${(calculations.portfolioInvestment / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-gray-300">Total Investment</div>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">${(calculations.portfolioAnnualRevenue / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-blue-200">Annual Revenue</div>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-800 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">${(calculations.portfolioNetProfit5Year / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-green-200">5-Year Net Profit</div>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">{calculations.roi5Year.toFixed(0)}%</div>
            <div className="text-sm text-purple-200">5-Year ROI</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-emerald-50 p-4 rounded-lg text-center border border-emerald-200">
            <Leaf className="mx-auto text-emerald-600 mb-2" size={24} />
            <div className="text-2xl font-bold text-emerald-700">{fmt(calculations.portfolioCO2Reduction)}</div>
            <div className="text-xs text-gray-600">Tons CO₂/year Avoided</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
            <Zap className="mx-auto text-blue-600 mb-2" size={24} />
            <div className="text-2xl font-bold text-blue-700">{calculations.portfolioPeakReduction.toFixed(1)} MW</div>
            <div className="text-xs text-gray-600">Peak Demand Reduction</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg text-center border border-orange-200">
            <Users className="mx-auto text-orange-600 mb-2" size={24} />
            <div className="text-2xl font-bold text-orange-700">{inputs.portfolioUnits}</div>
            <div className="text-xs text-gray-600">Customers Locked-In</div>
          </div>
          <div className="bg-teal-50 p-4 rounded-lg text-center border border-teal-200">
            <Award className="mx-auto text-teal-600 mb-2" size={24} />
            <div className="text-2xl font-bold text-teal-700">${fmt(calculations.portfolioCarbonRevenue)}</div>
            <div className="text-xs text-gray-600">Annual Carbon Revenue</div>
          </div>
        </div>
      </Card>

      {/* === SOLVIVA COMPARISON === */}
      <Card className="mb-8 border-2 border-yellow-300">
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="w-full flex items-center justify-between mb-4"
        >
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Shield size={24} className="text-yellow-600" /> Solviva Model Comparison
          </h3>
          {showComparison ? <ChevronUp /> : <ChevronDown />}
        </button>

        {showComparison && (
          <>
            <p className="text-gray-600 mb-6">
              Karnot's heat pump rent-to-own model mirrors <strong>Solviva Energy's</strong> proven approach
              (backed by AboitizPower) but applies it to commercial hot water, offering <strong>similar or better returns</strong>.
            </p>

            <div className="grid grid-cols-2 gap-6">
              {/* Karnot */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border-2 border-orange-300">
                <h4 className="text-lg font-bold text-orange-700 mb-4 flex items-center gap-2">
                  <Zap size={20} /> Karnot Heat Pumps
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Asset Type</span>
                    <span className="font-bold">Heat Pump Systems</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Investment</span>
                    <span className="font-bold">{fmtUSD(calculations.solvivaComparison.karnot.avgTicket)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contract Term</span>
                    <span className="font-bold">{calculations.solvivaComparison.karnot.contractTerm} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payback</span>
                    <span className="font-bold text-green-600">{calculations.solvivaComparison.karnot.paybackMonths} months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">IRR</span>
                    <span className="font-bold text-green-600">{calculations.solvivaComparison.karnot.irr}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue Streams</span>
                    <span className="font-bold">{calculations.solvivaComparison.karnot.revenueStreams}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CO₂/unit/year</span>
                    <span className="font-bold text-emerald-600">{calculations.solvivaComparison.karnot.carbonImpact} tons</span>
                  </div>
                </div>
              </div>

              {/* Solviva */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-300">
                <h4 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2">
                  <Building size={20} /> Solviva Solar (AboitizPower)
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Asset Type</span>
                    <span className="font-bold">Rooftop Solar</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Investment</span>
                    <span className="font-bold">{fmtUSD(calculations.solvivaComparison.solviva.avgTicket)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contract Term</span>
                    <span className="font-bold">{calculations.solvivaComparison.solviva.contractTerm} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payback</span>
                    <span className="font-bold">{calculations.solvivaComparison.solviva.paybackMonths} months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">IRR</span>
                    <span className="font-bold">{calculations.solvivaComparison.solviva.irr}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue Streams</span>
                    <span className="font-bold">{calculations.solvivaComparison.solviva.revenueStreams}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CO₂/unit/year</span>
                    <span className="font-bold">{calculations.solvivaComparison.solviva.carbonImpact} tons</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                <CheckCircle size={18} /> Why Karnot Competes Favorably
              </h4>
              <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-start gap-2">
                  <ArrowRight size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Higher carbon impact:</strong> LPG replacement yields 3x more CO₂ reduction per unit than solar</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Triple revenue:</strong> Equipment rental + electricity margin + carbon credits (vs. 2 for solar)</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Grid relief:</strong> 3.5kW peak reduction per unit helps utilities defer infrastructure</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Proven model:</strong> Same EaaS structure that AboitizPower validated with Solviva</span>
                </li>
              </ul>
            </div>
          </>
        )}
      </Card>

      {/* === INVESTMENT THESIS === */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Briefcase size={24} /> Investment Thesis Summary
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-bold text-blue-300 mb-3">The Opportunity</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span>$2B+ commercial water heating market in Philippines (mostly LPG)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span>Proven rent-to-own model (Solviva/AboitizPower) adapted for heat pumps</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span>R290 natural refrigerant meets 2026 global HFC phasedown</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span>Triple revenue stream: rental + electricity + carbon</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-green-300 mb-3">Returns Profile</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <TrendingUp size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong>{calculations.irrPercent.toFixed(0)}% IRR</strong> per unit (vs 20-25% typical infrastructure)</span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUp size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong>{Math.round(calculations.paybackMonths)} month</strong> payback on deployed capital</span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUp size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong>5-year contracts</strong> provide predictable, recurring revenue</span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUp size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong>Asset-backed:</strong> Equipment remains Karnot property</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">Portfolio Investment</div>
              <div className="text-2xl font-bold">${(calculations.portfolioInvestment / 1000000).toFixed(1)}M for {inputs.portfolioUnits} units</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">5-Year Projected Return</div>
              <div className="text-2xl font-bold text-green-400">${(calculations.portfolioNetProfit5Year / 1000000).toFixed(1)}M ({calculations.roi5Year.toFixed(0)}% ROI)</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InvestorFinancialModel;
