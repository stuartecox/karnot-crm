import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { CONFIG } from '../utils/heatPumpLogic';
import { Card, Section, Input, Button } from '../data/constants.jsx';
import {
  Calculator, TrendingUp, DollarSign, Users, Building, Leaf,
  Zap, BarChart3, Target, Award, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, Briefcase, PieChart, ArrowRight,
  Flame, Droplets, ThermometerSun, Shield
} from 'lucide-react';

// ==========================================
// EaaS INVESTOR CALCULATOR
// Based on HeatPumpCalculator math
// For Utility Partnership / Investor Pitch
// ==========================================

const EaaSInvestorCalculator = () => {
  // === STATE ===
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCashFlows, setShowCashFlows] = useState(false);
  const [showCalculations, setShowCalculations] = useState(false);

  // Customer Profile Inputs
  const [inputs, setInputs] = useState({
    // Customer Type
    customerType: 'commercial', // residential, commercial, industrial
    heatingType: 'lpg',         // lpg, electric

    // LPG Inputs
    lpgBottlesPerMonth: 30,     // bottles per month
    lpgBottleSize: 11,          // kg per bottle
    lpgPricePerBottle: 950,     // PHP per bottle

    // Electric Inputs (if heating type is electric)
    currentMonthlyBill: 15000,  // PHP

    // Hot Water Demand
    dailyLitersHotWater: 1500,  // liters per day
    operatingHoursPerDay: 12,   // hours

    // Temperatures
    inletTemp: 25,              // °C (ground water temp)
    targetTemp: 55,             // °C (hot water target)
    ambientTemp: 30,            // °C

    // Electricity Rate
    electricityRate: 12.25,     // PHP per kWh

    // EaaS Pricing
    customerSavingsPercent: 25, // % savings we give customer

    // Contract Terms
    contractMonths: 60,         // 5 years

    // Equipment Costs (USD)
    installationCostUSD: 600,
    serviceReservePercent: 20,  // % of equipment for 5-year service

    // Financing
    interestRate: 8,            // annual %
    financingFees: 1,           // % of principal

    // Carbon Credits
    carbonCreditPrice: 15,      // USD per ton CO2

    // Portfolio
    portfolioUnits: 100,
  });

  // === CONSTANTS ===
  const FX_RATE = 58.5; // PHP to USD
  const COP_HEAT_PUMP = 3.85;
  const COP_ELECTRIC_HEATER = 0.95;
  const KWH_PER_LITER_DELTA_T = 0.001163; // kWh to raise 1L by 1°C
  const LPG_KWH_PER_KG = 13.8;
  const LPG_CO2_PER_KG = 3.0; // kg CO2 per kg LPG burned
  const GRID_CO2_PER_KWH = 0.7; // kg CO2 per kWh (PH grid)
  const PEAK_REDUCTION_KW = 3.5; // kW reduction per unit during peak

  // === LOAD PRODUCTS FROM FIREBASE ===
  useEffect(() => {
    const fetchProducts = async () => {
      const user = getAuth().currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'products'));
        const prods = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(p => p.Refrigerant === 'R290' || p.refrigerant === 'R290');
        setProducts(prods);
      } catch (e) {
        console.error('Error fetching products:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // === FORMATTING HELPERS ===
  const fmt = (n, decimals = 0) => (+n || 0).toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
  const fmtPHP = (n) => `₱${fmt(n)}`;
  const fmtUSD = (n) => `$${fmt(n)}`;

  // === MAIN CALCULATIONS ===
  const calculations = useMemo(() => {
    // --- 1. HEAT LOAD CALCULATION (from HeatPumpCalculator logic) ---
    const deltaT = inputs.targetTemp - inputs.inletTemp;
    const dailyThermalKWh = (inputs.dailyLitersHotWater * deltaT * KWH_PER_LITER_DELTA_T);

    // Performance adjustment for ambient temperature
    const ratedAmbient = 20;
    const ratedLift = 40;
    const actualLift = Math.max(1, deltaT);
    const performanceFactor = (ratedLift / actualLift) * (1 + ((inputs.ambientTemp - ratedAmbient) * 0.015));

    // --- 2. CURRENT CUSTOMER COSTS ---
    let currentMonthlyCostPHP = 0;
    let lpgKgPerMonth = 0;
    let lpgKgPerYear = 0;

    if (inputs.heatingType === 'lpg') {
      // LPG Customer
      lpgKgPerMonth = inputs.lpgBottlesPerMonth * inputs.lpgBottleSize;
      lpgKgPerYear = lpgKgPerMonth * 12;
      currentMonthlyCostPHP = inputs.lpgBottlesPerMonth * inputs.lpgPricePerBottle;
    } else {
      // Electric Customer
      // Calculate how much electricity they use for heating
      const dailyKwhElectric = dailyThermalKWh / COP_ELECTRIC_HEATER;
      const monthlyKwhElectric = dailyKwhElectric * 30;
      currentMonthlyCostPHP = monthlyKwhElectric * inputs.electricityRate;
      // Estimate equivalent LPG for carbon calc
      lpgKgPerYear = (dailyKwhElectric * 365) / LPG_KWH_PER_KG;
    }

    const currentAnnualCostPHP = currentMonthlyCostPHP * 12;
    const currentMonthlyCostUSD = currentMonthlyCostPHP / FX_RATE;
    const currentAnnualCostUSD = currentAnnualCostPHP / FX_RATE;

    // --- 3. HEAT PUMP OPERATING COSTS ---
    const dailyHeatPumpKwh = dailyThermalKWh / COP_HEAT_PUMP;
    const monthlyHeatPumpKwh = dailyHeatPumpKwh * 30;
    const annualHeatPumpKwh = dailyHeatPumpKwh * 365;

    const heatPumpMonthlyCostPHP = monthlyHeatPumpKwh * inputs.electricityRate;
    const heatPumpAnnualCostPHP = heatPumpMonthlyCostPHP * 12;
    const heatPumpMonthlyCostUSD = heatPumpMonthlyCostPHP / FX_RATE;

    // --- 4. ENERGY SAVINGS ---
    const energySavingsMonthlyCostPHP = currentMonthlyCostPHP - heatPumpMonthlyCostPHP;
    const energySavingsAnnualPHP = energySavingsMonthlyCostPHP * 12;
    const energySavingsPercentActual = (energySavingsMonthlyCostPHP / currentMonthlyCostPHP) * 100;

    // --- 5. HEAT PUMP SIZING ---
    // Required capacity based on daily demand and operating hours
    const avgPowerKW = dailyHeatPumpKwh / inputs.operatingHoursPerDay;
    const requiredCapacityKW = avgPowerKW * 1.25; // 25% safety factor
    const adjustedCapacityKW = requiredCapacityKW / performanceFactor;

    // Select appropriate heat pump from R290 range
    const r290Products = products.filter(p =>
      (p.Refrigerant === 'R290' || p.refrigerant === 'R290') &&
      (p.kW_DHW_Nominal || p.kW || 0) >= adjustedCapacityKW * 0.8
    ).sort((a, b) => (a.kW_DHW_Nominal || a.kW || 0) - (b.kW_DHW_Nominal || b.kW || 0));

    const selectedProduct = r290Products[0] || {
      name: 'Karnot iHEAT R290 - 15.5kW',
      kW_DHW_Nominal: 15.5,
      kW: 15.5,
      COP_DHW: 3.85,
      salesPriceUSD: 5140,
      Refrigerant: 'R290'
    };

    const productKW = selectedProduct.kW_DHW_Nominal || selectedProduct.kW || 15.5;
    const productCOP = selectedProduct.COP_DHW || selectedProduct.cop || 3.85;
    const productPriceUSD = selectedProduct.salesPriceUSD || 5140;

    // Tank sizing (from HeatPumpCalculator logic)
    const recoveryRateLph = (productKW * 1000) / (deltaT * 1.163);
    const avgDrawRateLph = inputs.dailyLitersHotWater / inputs.operatingHoursPerDay;
    const peakDrawRateLph = avgDrawRateLph * 1.5; // 50% peak factor
    const gapLph = Math.max(0, peakDrawRateLph - recoveryRateLph);
    const tankSizeLiters = Math.max(
      gapLph * 2, // Gap-based
      peakDrawRateLph * 0.65, // Peak buffer
      inputs.dailyLitersHotWater * 0.35 // Daily reserve
    );
    const recommendedTankSize = Math.ceil(tankSizeLiters / 100) * 100;

    // Tank cost (estimate)
    const tankCostUSD = recommendedTankSize <= 200 ? 800 :
                        recommendedTankSize <= 500 ? 1200 :
                        recommendedTankSize <= 1000 ? 1800 : 2500;

    // --- 6. EaaS PRICING MODEL ---
    // Customer gets X% savings, pays the rest to utility
    const customerSavingsPHP = energySavingsMonthlyCostPHP * (inputs.customerSavingsPercent / 100);
    const eaasMonthlyFeePHP = currentMonthlyCostPHP - customerSavingsPHP - heatPumpMonthlyCostPHP;
    const eaasMonthlyFeeUSD = eaasMonthlyFeePHP / FX_RATE;
    const eaasAnnualFeeUSD = eaasMonthlyFeeUSD * 12;

    // Customer's new total monthly cost
    const customerNewMonthlyCostPHP = heatPumpMonthlyCostPHP + eaasMonthlyFeePHP;
    const customerActualSavingsPHP = currentMonthlyCostPHP - customerNewMonthlyCostPHP;

    // --- 7. INVESTMENT COSTS ---
    const equipmentCostUSD = productPriceUSD + tankCostUSD;
    const installationCostUSD = inputs.installationCostUSD;
    const baseInvestmentUSD = equipmentCostUSD + installationCostUSD;
    const serviceReserveUSD = baseInvestmentUSD * (inputs.serviceReservePercent / 100);
    const grossOutlayUSD = baseInvestmentUSD + serviceReserveUSD;

    // Financing costs
    const contractYears = inputs.contractMonths / 12;
    const totalInterestUSD = grossOutlayUSD * (inputs.interestRate / 100) * contractYears;
    const financingFeesUSD = grossOutlayUSD * (inputs.financingFees / 100);
    const totalInvestmentUSD = grossOutlayUSD + totalInterestUSD + financingFeesUSD;

    // --- 8. REVENUE STREAMS ---
    // Stream 1: EaaS Fee (Equipment Rental)
    const contractRevenueEaaSUSD = eaasAnnualFeeUSD * contractYears;

    // Stream 2: Electricity Sales Margin (if utility captures this)
    const electricityMarginPercent = 15;
    const annualElectricitySalesUSD = (annualHeatPumpKwh * inputs.electricityRate / FX_RATE);
    const annualElectricityMarginUSD = annualElectricitySalesUSD * (electricityMarginPercent / 100);
    const contractRevenueElectricityUSD = annualElectricityMarginUSD * contractYears;

    // Stream 3: Carbon Credits
    const annualCO2AvoidedTons = (lpgKgPerYear * LPG_CO2_PER_KG) / 1000;
    const annualCarbonRevenueUSD = annualCO2AvoidedTons * inputs.carbonCreditPrice;
    const contractRevenueCarbonUSD = annualCarbonRevenueUSD * contractYears;

    // Total Revenue
    const totalAnnualRevenueUSD = eaasAnnualFeeUSD + annualElectricityMarginUSD + annualCarbonRevenueUSD;
    const totalContractRevenueUSD = totalAnnualRevenueUSD * contractYears;

    // --- 9. OPERATING COSTS ---
    const annualMaintenanceUSD = baseInvestmentUSD * 0.02; // 2%
    const annualInsuranceUSD = baseInvestmentUSD * 0.01;   // 1%
    const annualMonitoringUSD = 50;                         // Monitoring fee
    const totalAnnualOpexUSD = annualMaintenanceUSD + annualInsuranceUSD + annualMonitoringUSD;
    const contractOpexUSD = totalAnnualOpexUSD * contractYears;

    // --- 10. PROFITABILITY ---
    const netAnnualCashFlowUSD = totalAnnualRevenueUSD - totalAnnualOpexUSD;
    const netContractProfitUSD = totalContractRevenueUSD - contractOpexUSD - totalInvestmentUSD;

    // --- 11. INVESTOR METRICS ---
    // Payback Period (months)
    const monthlyNetCashFlowUSD = netAnnualCashFlowUSD / 12;
    const paybackMonths = totalInvestmentUSD / monthlyNetCashFlowUSD;

    // Simple ROI
    const roiContract = (netContractProfitUSD / totalInvestmentUSD) * 100;
    const roiAnnual = roiContract / contractYears;

    // IRR (Newton-Raphson)
    const calculateIRR = () => {
      const cashFlows = [-totalInvestmentUSD];
      for (let i = 0; i < contractYears; i++) {
        cashFlows.push(netAnnualCashFlowUSD);
      }
      let irr = 0.15;
      for (let iter = 0; iter < 100; iter++) {
        let npv = 0, derivative = 0;
        for (let t = 0; t < cashFlows.length; t++) {
          const factor = Math.pow(1 + irr, t);
          npv += cashFlows[t] / factor;
          if (t > 0) derivative -= t * cashFlows[t] / (factor * (1 + irr));
        }
        if (Math.abs(npv) < 0.01) break;
        const newIrr = irr - npv / derivative;
        if (newIrr < -0.99 || newIrr > 10 || isNaN(newIrr)) break;
        irr = newIrr;
      }
      return irr * 100;
    };
    const irrPercent = calculateIRR();

    // NPV at different discount rates
    const calculateNPV = (rate) => {
      let npv = -totalInvestmentUSD;
      for (let t = 1; t <= contractYears; t++) {
        npv += netAnnualCashFlowUSD / Math.pow(1 + rate, t);
      }
      return npv;
    };
    const npv8 = calculateNPV(0.08);
    const npv10 = calculateNPV(0.10);
    const npv12 = calculateNPV(0.12);

    // CAC & LTV (for banker metrics)
    const customerAcquisitionCost = totalInvestmentUSD; // Total cost to acquire customer
    const lifetimeValue = totalContractRevenueUSD;      // Revenue over contract
    const ltvCacRatio = lifetimeValue / customerAcquisitionCost;

    // MOIC (Multiple on Invested Capital)
    const moic = (totalContractRevenueUSD - contractOpexUSD) / totalInvestmentUSD;

    // --- 12. CASH FLOW SCHEDULE ---
    const cashFlowSchedule = [];
    let cumulativeCF = -totalInvestmentUSD;

    for (let year = 0; year <= contractYears; year++) {
      if (year === 0) {
        cashFlowSchedule.push({
          year: 0,
          investment: -totalInvestmentUSD,
          eaasRevenue: 0,
          electricityRevenue: 0,
          carbonRevenue: 0,
          opex: 0,
          netCashFlow: -totalInvestmentUSD,
          cumulative: cumulativeCF
        });
      } else {
        const netCF = netAnnualCashFlowUSD;
        cumulativeCF += netCF;
        cashFlowSchedule.push({
          year,
          investment: 0,
          eaasRevenue: eaasAnnualFeeUSD,
          electricityRevenue: annualElectricityMarginUSD,
          carbonRevenue: annualCarbonRevenueUSD,
          opex: -totalAnnualOpexUSD,
          netCashFlow: netCF,
          cumulative: cumulativeCF
        });
      }
    }

    // --- 13. PORTFOLIO PROJECTIONS ---
    const units = inputs.portfolioUnits;
    const portfolioInvestment = totalInvestmentUSD * units;
    const portfolioAnnualRevenue = totalAnnualRevenueUSD * units;
    const portfolioContractRevenue = totalContractRevenueUSD * units;
    const portfolioNetProfit = netContractProfitUSD * units;
    const portfolioCO2Reduction = annualCO2AvoidedTons * units;
    const portfolioPeakReduction = (PEAK_REDUCTION_KW * units) / 1000; // MW
    const portfolioCarbonRevenue = annualCarbonRevenueUSD * units;

    return {
      // Thermal Analysis
      dailyThermalKWh,
      dailyHeatPumpKwh,
      monthlyHeatPumpKwh,
      annualHeatPumpKwh,
      requiredCapacityKW,
      adjustedCapacityKW,
      performanceFactor,

      // Selected Equipment
      selectedProduct,
      productKW,
      productCOP,
      productPriceUSD,
      tankSizeLiters: recommendedTankSize,
      tankCostUSD,
      recoveryRateLph,
      avgDrawRateLph,
      peakDrawRateLph,

      // Customer Economics
      currentMonthlyCostPHP,
      currentAnnualCostPHP,
      currentMonthlyCostUSD,
      heatPumpMonthlyCostPHP,
      heatPumpAnnualCostPHP,
      energySavingsMonthlyCostPHP,
      energySavingsAnnualPHP,
      energySavingsPercentActual,
      customerSavingsPHP,
      customerNewMonthlyCostPHP,
      customerActualSavingsPHP,
      eaasMonthlyFeePHP,
      eaasMonthlyFeeUSD,
      eaasAnnualFeeUSD,

      // Investment
      equipmentCostUSD,
      installationCostUSD,
      baseInvestmentUSD,
      serviceReserveUSD,
      grossOutlayUSD,
      totalInterestUSD,
      financingFeesUSD,
      totalInvestmentUSD,

      // Revenue Streams
      contractRevenueEaaSUSD,
      annualElectricityMarginUSD,
      contractRevenueElectricityUSD,
      annualCO2AvoidedTons,
      annualCarbonRevenueUSD,
      contractRevenueCarbonUSD,
      totalAnnualRevenueUSD,
      totalContractRevenueUSD,

      // Costs
      totalAnnualOpexUSD,
      contractOpexUSD,

      // Profitability
      netAnnualCashFlowUSD,
      netContractProfitUSD,

      // Investor Metrics
      paybackMonths,
      roiContract,
      roiAnnual,
      irrPercent,
      npv8,
      npv10,
      npv12,
      customerAcquisitionCost,
      lifetimeValue,
      ltvCacRatio,
      moic,

      // LPG/Carbon
      lpgKgPerMonth,
      lpgKgPerYear,

      // Cash Flows
      cashFlowSchedule,
      contractYears,

      // Portfolio
      portfolioInvestment,
      portfolioAnnualRevenue,
      portfolioContractRevenue,
      portfolioNetProfit,
      portfolioCO2Reduction,
      portfolioPeakReduction,
      portfolioCarbonRevenue,
    };
  }, [inputs, products]);

  const handleChange = (field, isNumber = false) => (e) => {
    const val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    setInputs(prev => ({ ...prev, [field]: val }));
  };

  // === RENDER ===
  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* === HEADER === */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <Briefcase size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Energy Efficiency Partnership Calculator</h1>
            <p className="text-purple-200">Utility EaaS Model | R290 Heat Pump Portfolio Investment</p>
          </div>
        </div>
        <p className="text-sm text-gray-300 max-w-3xl">
          Calculate returns for deploying heat pump systems as Energy-as-a-Service. Based on real
          customer savings from LPG/electric replacement. Model includes equipment financing,
          carbon credits, and utility electricity margin.
        </p>
      </div>

      {/* === EXECUTIVE SUMMARY === */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 text-white">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Target size={20} /> Executive Summary (Per Unit)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{fmtUSD(calculations.totalInvestmentUSD)}</div>
            <div className="text-xs text-emerald-100">Investment</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{fmtUSD(calculations.totalContractRevenueUSD)}</div>
            <div className="text-xs text-emerald-100">{calculations.contractYears}-Yr Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{fmtUSD(calculations.netContractProfitUSD)}</div>
            <div className="text-xs text-emerald-100">Net Profit</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{calculations.irrPercent.toFixed(1)}%</div>
            <div className="text-xs text-emerald-100">IRR</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{Math.round(calculations.paybackMonths)} mo</div>
            <div className="text-xs text-emerald-100">Payback</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{calculations.ltvCacRatio.toFixed(2)}x</div>
            <div className="text-xs text-emerald-100">LTV/CAC</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* === INPUT PANEL === */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users size={20} className="text-blue-600" /> Customer Profile
            </h3>

            {/* Customer Type */}
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Customer Type</label>
              <select
                value={inputs.customerType}
                onChange={handleChange('customerType')}
                className="w-full p-2 border rounded-lg"
              >
                <option value="residential">Residential (Home)</option>
                <option value="commercial">Commercial (Hotel/Restaurant)</option>
                <option value="industrial">Industrial (Factory)</option>
              </select>
            </div>

            {/* Heating Type */}
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Current Heating</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setInputs(prev => ({ ...prev, heatingType: 'lpg' }))}
                  className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    inputs.heatingType === 'lpg'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Flame size={16} /> LPG/Propane
                </button>
                <button
                  onClick={() => setInputs(prev => ({ ...prev, heatingType: 'electric' }))}
                  className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    inputs.heatingType === 'electric'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Zap size={16} /> Electric
                </button>
              </div>
            </div>

            {/* LPG Inputs */}
            {inputs.heatingType === 'lpg' && (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-4">
                <h4 className="text-sm font-bold text-orange-700 mb-3 flex items-center gap-2">
                  <Flame size={16} /> LPG Consumption
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Bottles/Month"
                    type="number"
                    value={inputs.lpgBottlesPerMonth}
                    onChange={handleChange('lpgBottlesPerMonth', true)}
                  />
                  <Input
                    label="Price/Bottle (₱)"
                    type="number"
                    value={inputs.lpgPricePerBottle}
                    onChange={handleChange('lpgPricePerBottle', true)}
                  />
                </div>
                <div className="mt-3 text-sm text-orange-700">
                  <strong>Current Monthly Cost:</strong> {fmtPHP(calculations.currentMonthlyCostPHP)}
                </div>
              </div>
            )}

            {/* Electric Inputs */}
            {inputs.heatingType === 'electric' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                <Input
                  label="Current Monthly Bill (₱)"
                  type="number"
                  value={inputs.currentMonthlyBill}
                  onChange={handleChange('currentMonthlyBill', true)}
                />
              </div>
            )}

            {/* Hot Water Demand */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
              <h4 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
                <Droplets size={16} /> Hot Water Demand
              </h4>
              <Input
                label="Daily Liters"
                type="number"
                value={inputs.dailyLitersHotWater}
                onChange={handleChange('dailyLitersHotWater', true)}
              />
              <Input
                label="Operating Hours/Day"
                type="number"
                value={inputs.operatingHoursPerDay}
                onChange={handleChange('operatingHoursPerDay', true)}
                className="mt-3"
              />
            </div>

            {/* EaaS Pricing */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
              <h4 className="text-sm font-bold text-green-700 mb-3">Customer Savings %</h4>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={inputs.customerSavingsPercent}
                  onChange={handleChange('customerSavingsPercent', true)}
                  className="flex-1"
                />
                <span className="font-bold text-green-700 w-12 text-right">{inputs.customerSavingsPercent}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Customer gets {inputs.customerSavingsPercent}% of energy savings, rest goes to utility/investor
              </p>
            </div>

            {/* Advanced Settings */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <span className="text-sm font-bold text-gray-600">Advanced Settings</span>
              {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {showAdvanced && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
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
                  label="Carbon Credit ($/ton CO₂)"
                  type="number"
                  value={inputs.carbonCreditPrice}
                  onChange={handleChange('carbonCreditPrice', true)}
                />
                <Input
                  label="Electricity Rate (₱/kWh)"
                  type="number"
                  value={inputs.electricityRate}
                  onChange={handleChange('electricityRate', true)}
                  step="0.01"
                />
              </div>
            )}
          </Card>

          {/* Portfolio Slider */}
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Building size={20} className="text-purple-600" /> Portfolio Size
            </h3>
            <div className="text-center mb-4">
              <span className="text-4xl font-bold text-purple-600">{inputs.portfolioUnits}</span>
              <span className="text-gray-500 ml-2">Customers</span>
            </div>
            <input
              type="range"
              min="20"
              max="500"
              step="10"
              value={inputs.portfolioUnits}
              onChange={handleChange('portfolioUnits', true)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>20</span>
              <span>100</span>
              <span>250</span>
              <span>500</span>
            </div>
          </Card>
        </div>

        {/* === RESULTS PANEL === */}
        <div className="lg:col-span-2 space-y-6">
          {/* Equipment Selection */}
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <ThermometerSun size={20} className="text-orange-600" /> Equipment Sizing (R290 Only)
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Selected Heat Pump</div>
                <div className="font-bold text-gray-800">{calculations.selectedProduct?.name || 'Auto-selected'}</div>
                <div className="text-sm text-gray-600">
                  {calculations.productKW} kW | COP {calculations.productCOP}
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Expansion Tank</div>
                <div className="font-bold text-gray-800">{calculations.tankSizeLiters} Liters</div>
                <div className="text-sm text-gray-600">
                  Recovery: {calculations.recoveryRateLph?.toFixed(0)} L/hr
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowCalculations(!showCalculations)}
              className="text-sm text-blue-600 font-bold flex items-center gap-1"
            >
              {showCalculations ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showCalculations ? 'Hide' : 'Show'} Thermal Calculations
            </button>

            {showCalculations && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Daily Thermal Load:</span>
                  <span className="font-mono">{calculations.dailyThermalKWh?.toFixed(1)} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span>Heat Pump Daily Usage:</span>
                  <span className="font-mono">{calculations.dailyHeatPumpKwh?.toFixed(1)} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span>Required Capacity:</span>
                  <span className="font-mono">{calculations.requiredCapacityKW?.toFixed(1)} kW</span>
                </div>
                <div className="flex justify-between">
                  <span>Performance Factor:</span>
                  <span className="font-mono">{calculations.performanceFactor?.toFixed(2)}</span>
                </div>
              </div>
            )}
          </Card>

          {/* Customer Economics */}
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users size={20} className="text-green-600" /> Customer Value Proposition
            </h3>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-red-50 p-4 rounded-lg text-center border-2 border-red-200">
                <div className="text-xs font-bold text-red-600 uppercase mb-1">Current Cost</div>
                <div className="text-2xl font-bold text-red-700">{fmtPHP(calculations.currentMonthlyCostPHP)}</div>
                <div className="text-xs text-gray-500">{inputs.heatingType === 'lpg' ? 'LPG' : 'Electric'}/month</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center border-2 border-green-200">
                <div className="text-xs font-bold text-green-600 uppercase mb-1">With Karnot</div>
                <div className="text-2xl font-bold text-green-700">{fmtPHP(calculations.customerNewMonthlyCostPHP)}</div>
                <div className="text-xs text-gray-500">Total/month</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center border-2 border-blue-200">
                <div className="text-xs font-bold text-blue-600 uppercase mb-1">Customer Saves</div>
                <div className="text-2xl font-bold text-blue-700">{fmtPHP(calculations.customerActualSavingsPHP)}</div>
                <div className="text-xs text-gray-500">{inputs.customerSavingsPercent}% savings/month</div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-bold text-yellow-800 mb-2">Customer Benefits (Zero CAPEX):</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <span>Equipment worth {fmtPHP(calculations.equipmentCostUSD * FX_RATE)} - FREE</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <span>Free maintenance for {calculations.contractYears} years</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <span>No LPG fire/explosion risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <span>ESG compliance</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Investment & Revenue */}
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-green-600" /> Unit Economics
            </h3>

            <div className="grid grid-cols-2 gap-6">
              {/* Investment Breakdown */}
              <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">Investment Per Unit</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b">
                    <span>Heat Pump ({calculations.productKW} kW)</span>
                    <span className="font-semibold">{fmtUSD(calculations.productPriceUSD)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span>Tank ({calculations.tankSizeLiters}L)</span>
                    <span className="font-semibold">{fmtUSD(calculations.tankCostUSD)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span>Installation</span>
                    <span className="font-semibold">{fmtUSD(calculations.installationCostUSD)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span>Service Reserve ({inputs.serviceReservePercent}%)</span>
                    <span className="font-semibold">{fmtUSD(calculations.serviceReserveUSD)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span>Financing ({inputs.interestRate}% × {calculations.contractYears}yr)</span>
                    <span className="font-semibold">{fmtUSD(calculations.totalInterestUSD)}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-blue-50 rounded px-2 -mx-2 font-bold">
                    <span>Total Investment</span>
                    <span className="text-blue-600">{fmtUSD(calculations.totalInvestmentUSD)}</span>
                  </div>
                </div>
              </div>

              {/* Revenue Streams */}
              <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">Annual Revenue Per Unit</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                    <div className="text-xs font-bold text-purple-600 uppercase">1. EaaS Fee</div>
                    <div className="text-xl font-bold">{fmtUSD(calculations.eaasAnnualFeeUSD)}<span className="text-sm text-gray-500">/year</span></div>
                    <div className="text-xs text-gray-500">{fmtPHP(calculations.eaasMonthlyFeePHP)}/month</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <div className="text-xs font-bold text-blue-600 uppercase">2. Electricity Margin</div>
                    <div className="text-xl font-bold">{fmtUSD(calculations.annualElectricityMarginUSD)}<span className="text-sm text-gray-500">/year</span></div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <div className="text-xs font-bold text-green-600 uppercase">3. Carbon Credits</div>
                    <div className="text-xl font-bold">{fmtUSD(calculations.annualCarbonRevenueUSD)}<span className="text-sm text-gray-500">/year</span></div>
                    <div className="text-xs text-gray-500">{calculations.annualCO2AvoidedTons?.toFixed(1)} tons CO₂ @ ${inputs.carbonCreditPrice}/ton</div>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg">
                    <div className="text-xs font-bold text-emerald-700 uppercase">Total Annual Revenue</div>
                    <div className="text-2xl font-bold text-emerald-700">{fmtUSD(calculations.totalAnnualRevenueUSD)}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Investor Metrics */}
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-green-600" /> Investor Metrics (Per Unit)
            </h3>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-3 rounded-xl text-center">
                <div className="text-2xl font-bold">{Math.round(calculations.paybackMonths)} mo</div>
                <div className="text-[10px] text-blue-100 uppercase">Payback</div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-3 rounded-xl text-center">
                <div className="text-2xl font-bold">{calculations.irrPercent?.toFixed(1)}%</div>
                <div className="text-[10px] text-green-100 uppercase">IRR</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-3 rounded-xl text-center">
                <div className="text-2xl font-bold">{calculations.roiAnnual?.toFixed(1)}%</div>
                <div className="text-[10px] text-purple-100 uppercase">Annual ROI</div>
              </div>
              <div className="bg-gradient-to-br from-teal-500 to-teal-700 text-white p-3 rounded-xl text-center">
                <div className="text-2xl font-bold">{calculations.moic?.toFixed(2)}x</div>
                <div className="text-[10px] text-teal-100 uppercase">MOIC</div>
              </div>
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-3 rounded-xl text-center">
                <div className="text-2xl font-bold">{calculations.ltvCacRatio?.toFixed(2)}x</div>
                <div className="text-[10px] text-indigo-100 uppercase">LTV/CAC</div>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-700 text-white p-3 rounded-xl text-center">
                <div className="text-2xl font-bold">{fmtUSD(calculations.npv10)}</div>
                <div className="text-[10px] text-orange-100 uppercase">NPV @10%</div>
              </div>
            </div>

            {/* Cash Flow Toggle */}
            <button
              onClick={() => setShowCashFlows(!showCashFlows)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <span className="font-bold text-gray-700 flex items-center gap-2">
                <BarChart3 size={18} /> Cash Flow Schedule
              </span>
              {showCashFlows ? <ChevronUp /> : <ChevronDown />}
            </button>

            {showCashFlows && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Year</th>
                      <th className="px-3 py-2 text-right">Investment</th>
                      <th className="px-3 py-2 text-right">EaaS</th>
                      <th className="px-3 py-2 text-right">Elec Margin</th>
                      <th className="px-3 py-2 text-right">Carbon</th>
                      <th className="px-3 py-2 text-right">OPEX</th>
                      <th className="px-3 py-2 text-right">Net CF</th>
                      <th className="px-3 py-2 text-right">Cumulative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculations.cashFlowSchedule?.map(row => (
                      <tr key={row.year} className="border-b">
                        <td className="px-3 py-2 font-bold">{row.year}</td>
                        <td className="px-3 py-2 text-right text-red-600">
                          {row.investment < 0 ? `(${fmtUSD(Math.abs(row.investment))})` : '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-purple-600">
                          {row.eaasRevenue > 0 ? fmtUSD(row.eaasRevenue) : '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-blue-600">
                          {row.electricityRevenue > 0 ? fmtUSD(row.electricityRevenue) : '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-green-600">
                          {row.carbonRevenue > 0 ? fmtUSD(row.carbonRevenue) : '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-orange-600">
                          {row.opex < 0 ? `(${fmtUSD(Math.abs(row.opex))})` : '-'}
                        </td>
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
        </div>
      </div>

      {/* === PORTFOLIO PROJECTION === */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Building size={24} /> Portfolio Projection: {inputs.portfolioUnits} Customers
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold">${(calculations.portfolioInvestment / 1000000).toFixed(2)}M</div>
            <div className="text-sm text-gray-300">Total Investment</div>
          </div>
          <div className="bg-white/10 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold">${(calculations.portfolioAnnualRevenue / 1000).toFixed(0)}K</div>
            <div className="text-sm text-gray-300">Annual Revenue</div>
          </div>
          <div className="bg-white/10 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold text-green-400">${(calculations.portfolioNetProfit / 1000000).toFixed(2)}M</div>
            <div className="text-sm text-gray-300">{calculations.contractYears}-Year Net Profit</div>
          </div>
          <div className="bg-white/10 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold text-emerald-400">{calculations.roiContract?.toFixed(0)}%</div>
            <div className="text-sm text-gray-300">{calculations.contractYears}-Year ROI</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-emerald-900/50 p-4 rounded-lg text-center">
            <Leaf className="mx-auto mb-2" size={24} />
            <div className="text-2xl font-bold">{fmt(calculations.portfolioCO2Reduction)}</div>
            <div className="text-xs text-gray-300">Tons CO₂/year</div>
          </div>
          <div className="bg-blue-900/50 p-4 rounded-lg text-center">
            <Zap className="mx-auto mb-2" size={24} />
            <div className="text-2xl font-bold">{calculations.portfolioPeakReduction?.toFixed(1)} MW</div>
            <div className="text-xs text-gray-300">Peak Reduction</div>
          </div>
          <div className="bg-purple-900/50 p-4 rounded-lg text-center">
            <Users className="mx-auto mb-2" size={24} />
            <div className="text-2xl font-bold">{inputs.portfolioUnits}</div>
            <div className="text-xs text-gray-300">Customers Locked-In</div>
          </div>
          <div className="bg-teal-900/50 p-4 rounded-lg text-center">
            <Award className="mx-auto mb-2" size={24} />
            <div className="text-2xl font-bold">${fmt(calculations.portfolioCarbonRevenue)}</div>
            <div className="text-xs text-gray-300">Annual Carbon Revenue</div>
          </div>
        </div>
      </Card>

      {/* === SOLVIVA COMPARISON === */}
      <Card className="border-2 border-yellow-300">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Shield size={24} className="text-yellow-600" /> Model Comparison: Karnot vs Solviva (Solar)
        </h3>

        <p className="text-gray-600 mb-4">
          This EaaS model mirrors Solviva Energy's rent-to-own solar approach (AboitizPower-backed)
          but applied to heat pumps for commercial hot water.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Metric</th>
                <th className="px-4 py-2 text-center bg-orange-50">Karnot (Heat Pumps)</th>
                <th className="px-4 py-2 text-center bg-blue-50">Solviva (Solar)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-2 font-medium">Asset Type</td>
                <td className="px-4 py-2 text-center bg-orange-50">R290 Heat Pumps + Tanks</td>
                <td className="px-4 py-2 text-center bg-blue-50">Rooftop Solar Panels</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2 font-medium">Avg Investment</td>
                <td className="px-4 py-2 text-center bg-orange-50 font-bold">{fmtUSD(calculations.totalInvestmentUSD)}</td>
                <td className="px-4 py-2 text-center bg-blue-50">$4,000-8,000</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2 font-medium">Contract Term</td>
                <td className="px-4 py-2 text-center bg-orange-50">{calculations.contractYears} years</td>
                <td className="px-4 py-2 text-center bg-blue-50">5 years</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2 font-medium">Payback</td>
                <td className="px-4 py-2 text-center bg-orange-50 font-bold text-green-600">{Math.round(calculations.paybackMonths)} months</td>
                <td className="px-4 py-2 text-center bg-blue-50">24-36 months</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2 font-medium">IRR</td>
                <td className="px-4 py-2 text-center bg-orange-50 font-bold text-green-600">{calculations.irrPercent?.toFixed(1)}%</td>
                <td className="px-4 py-2 text-center bg-blue-50">20-30%</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2 font-medium">Revenue Streams</td>
                <td className="px-4 py-2 text-center bg-orange-50 font-bold">3 (EaaS + Elec + Carbon)</td>
                <td className="px-4 py-2 text-center bg-blue-50">2 (Rental + Elec)</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2 font-medium">CO₂ Impact/unit/year</td>
                <td className="px-4 py-2 text-center bg-orange-50 font-bold text-green-600">{calculations.annualCO2AvoidedTons?.toFixed(1)} tons</td>
                <td className="px-4 py-2 text-center bg-blue-50">2-4 tons</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">Grid Relief</td>
                <td className="px-4 py-2 text-center bg-orange-50 font-bold">{PEAK_REDUCTION_KW} kW/unit</td>
                <td className="px-4 py-2 text-center bg-blue-50">Variable (intermittent)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-bold text-green-800 mb-2">Why Karnot Competes Favorably:</h4>
          <ul className="text-sm space-y-1">
            <li className="flex items-start gap-2">
              <ArrowRight size={14} className="text-green-600 mt-1" />
              <span><strong>Higher carbon impact:</strong> LPG replacement yields more CO₂ reduction</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight size={14} className="text-green-600 mt-1" />
              <span><strong>Triple revenue:</strong> Equipment + electricity + carbon (vs 2 for solar)</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight size={14} className="text-green-600 mt-1" />
              <span><strong>Consistent grid relief:</strong> Heat pumps run on schedule, solar is intermittent</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight size={14} className="text-green-600 mt-1" />
              <span><strong>Complementary:</strong> Works alongside solar (no overlap, add-on opportunity)</span>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default EaaSInvestorCalculator;
