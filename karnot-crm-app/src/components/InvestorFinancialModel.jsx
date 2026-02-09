import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, DollarSign, BarChart3, PieChart, Target, Award,
  Building, Users, Zap, Leaf, AlertCircle, CheckCircle, Info,
  ChevronDown, ChevronUp, Download, RefreshCw, Calculator,
  Briefcase, LineChart, ArrowRight, Shield, Droplets
} from 'lucide-react';
import { Card, Button, Input, Section } from '../data/constants.jsx';

// Firebase imports
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ==========================================
// KARNOT INVESTOR MODEL - 1882 ENERGY PARTNERSHIP
// Utility purchases heat pumps upfront, finances customer deployments
// ==========================================

const InvestorFinancialModel = () => {
  // === DATABASE STATE ===
  const [dbProducts, setDbProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [karnotProducts, setKarnotProducts] = useState([]);

  // === FETCH PRODUCTS FROM DATABASE ===
  useEffect(() => {
    const fetchProducts = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setLoadingProducts(false);
        return;
      }

      try {
        const snapshot = await getDocs(collection(db, 'users', user.uid, 'products'));
        const allProds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filter: R290 heat pumps only (natural refrigerant)
        const heatPumps = allProds
          .filter(p => {
            const hasHeating = (p.kW_DHW_Nominal && p.kW_DHW_Nominal > 0) || 
                              (p.kW_Heating_Nominal && p.kW_Heating_Nominal > 0);
            const notSolar = p.category !== 'Competitor Solar';
            const isR290 = (p.Refrigerant || p.refrigerant || '').toUpperCase().includes('R290');
            return hasHeating && notSolar && isR290;
          })
          .sort((a, b) => (a.kW_DHW_Nominal || a.kW_Heating_Nominal || 0) - (b.kW_DHW_Nominal || b.kW_Heating_Nominal || 0));

        setDbProducts(allProds);
        setKarnotProducts(heatPumps);
        console.log('Loaded R290 heat pumps:', heatPumps.length);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // === INVESTOR INPUTS ===
  const [inputs, setInputs] = useState({
    // Customer Profile
    heatingType: 'lpg',          
    lpgPricePerBottle: 950,      
    dailyLitersHotWater: 1500,   
    electricityRate: 12.25,      
    recoveryHours: 10,           // Hours to heat full tank

    // Utility Partnership Model (1882 Energy)
    equipmentMarginPercent: 15,  // Utility's markup on equipment sale
    electricityNetMargin: 25,    // Net margin on electricity sales (after generation, T&D)
    installationCostPerUnit: 600,
    annualServicePerUnit: 172,   
    externalTankCostPerLiter: 2.50,

    // Customer Financing (Utility finances customer)
    customerFinancingTerm: 60,   // Months
    customerAPR: 9,              // Annual interest rate

    // Revenue Model
    carbonCreditPrice: 15,       // USD per ton CO2
    contractYears: 5,

    // Utility Financing (Utility borrows to fund deployments)
    utilityInterestRate: 8,      // Utility's cost of capital
    utilityLoanTerm: 5,

    // Portfolio
    portfolioUnits: 250,
    
    // Solviva Solar Cross-Sell
    solvivaConversionRate: 30,   // % of customers who add solar
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCashFlows, setShowCashFlows] = useState(false);
  const [showComparison, setShowComparison] = useState(true);

  // === CONSTANTS ===
  const CONFIG = {
    FX_RATE: 58.5,               
    COP_HEAT_PUMP: 4.2,          
    COP_ELECTRIC: 0.95,          
    LPG_BURNER_EFFICIENCY: 0.85, 
    KWH_PER_LITER_DELTA_T: 0.001163,
    DELTA_T: 30,                 
    LPG_KWH_PER_KG: 13.8,        
    LPG_CO2_PER_KG: 3.0,         
    PEAK_REDUCTION_KW: 3.5,      
    GRID_EMISSION_FACTOR: 0.7,   
  };

  // === CURRENCY FORMATTING ===
  const fmt = (n, decimals = 0) => (+n || 0).toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
  const fmtUSD = (n) => `$${fmt(n)}`;
  const fmtPHP = (n) => `₱${fmt(n)}`;

  // === CORE CALCULATIONS ===
  const calculations = useMemo(() => {
    if (karnotProducts.length === 0) {
      return {
        error: 'No R290 heat pumps found in database. Please add products first.',
        equipmentCost: 0,
        totalInvestmentUSD: 0,
      };
    }

    // --- STEP A: CALCULATE THERMAL DEMAND ---
    const dailyLiters = inputs.dailyLitersHotWater;
    const dailyThermalKWh = dailyLiters * CONFIG.DELTA_T * CONFIG.KWH_PER_LITER_DELTA_T;
    const requiredRecoveryKW = dailyThermalKWh / inputs.recoveryHours;

    console.log('=== HEAT PUMP SELECTION ===');
    console.log(`Daily: ${dailyLiters}L = ${dailyThermalKWh.toFixed(2)} kWh`);
    console.log(`Required: ${requiredRecoveryKW.toFixed(2)} kW recovery`);

    // --- STEP B: SELECT HEAT PUMP FROM DATABASE ---
    let selectedKarnot = karnotProducts.find(p => 
      (p.kW_DHW_Nominal || p.kW_Heating_Nominal || 0) >= requiredRecoveryKW
    );

    if (!selectedKarnot && karnotProducts.length > 0) {
      selectedKarnot = karnotProducts[karnotProducts.length - 1];
      console.log('⚠️ No product meets requirement, using largest');
    }

    if (!selectedKarnot) {
      return { error: 'No suitable heat pump found' };
    }

    console.log('✅ Selected:', selectedKarnot.name, `$${selectedKarnot.salesPriceUSD}`);

    const heatPumpPriceUSD = selectedKarnot.salesPriceUSD || 0;
    const heatPumpCOP = selectedKarnot.COP_DHW || CONFIG.COP_HEAT_PUMP;

    // --- STEP C: TANK SIZING ---
    // Tank only needs to cover NON-SUNSHINE hours (morning peak before solar recovery)
    // Typically 40% of daily demand (6-9am peak before heat pump recovers during day)
    const peakHoursDemand = Math.round(dailyLiters * 0.4); // 40% for non-sunshine hours
    const requiredTotalVolume = Math.round(peakHoursDemand / 100) * 100; // Round to nearest 100L
    
    let integratedTankVolume = selectedKarnot.tankVolume || 0;
    if (!integratedTankVolume && selectedKarnot.name) {
      const name = selectedKarnot.name.toLowerCase();
      if (name.includes('aquahero')) {
        if (name.includes('200l')) integratedTankVolume = 200;
        else if (name.includes('300l')) integratedTankVolume = 300;
      }
    }

    const externalTankNeeded = Math.max(0, requiredTotalVolume - integratedTankVolume);
    const externalTankCost = externalTankNeeded * inputs.externalTankCostPerLiter;

    // --- STEP D: UTILITY INVESTMENT & PRICING ---
    const equipmentCost = heatPumpPriceUSD;
    const installationCost = inputs.installationCostPerUnit;
    const tankCost = externalTankCost;
    
    // Karnot sells to 1882 at full price
    const karnotSalePrice = equipmentCost + installationCost + tankCost;
    
    // 1882 marks up equipment by X% before financing to customer
    const customerEquipmentPrice = karnotSalePrice * (1 + inputs.equipmentMarginPercent / 100);
    const equipmentMarginUSD = customerEquipmentPrice - karnotSalePrice;
    
    // 1882's upfront cost (what they pay Karnot)
    const utilityCOGS = karnotSalePrice;

    console.log(`Karnot sale: $${karnotSalePrice}, 1882 markup: ${inputs.equipmentMarginPercent}%, Customer pays: $${customerEquipmentPrice}`);
    console.log(`1882 equipment margin: $${equipmentMarginUSD}`);

    // --- STEP E: CUSTOMER FINANCING ---
    // Customer finances the equipment (with markup) over X months at Y% APR
    const principal = customerEquipmentPrice * CONFIG.FX_RATE; // PHP
    const monthlyRate = inputs.customerAPR / 100 / 12;
    const numPayments = inputs.customerFinancingTerm;
    
    const customerMonthlyPayment = numPayments > 0 && monthlyRate > 0
      ? (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0;

    const totalFinancingCost = (customerMonthlyPayment * numPayments) - principal;
    const totalCustomerPays = customerMonthlyPayment * numPayments;

    // --- STEP F: CUSTOMER CURRENT COSTS ---
    let customerCurrentMonthlyCost = 0;
    let lpgKgPerYear = 0;

    if (inputs.heatingType === 'lpg') {
      const dailyLpgKg = dailyThermalKWh / (CONFIG.LPG_BURNER_EFFICIENCY * CONFIG.LPG_KWH_PER_KG);
      const lpgKgPerMonth = dailyLpgKg * 30;
      lpgKgPerYear = dailyLpgKg * 365;
      const lpgBottlesPerMonth = lpgKgPerMonth / 11;
      customerCurrentMonthlyCost = lpgBottlesPerMonth * inputs.lpgPricePerBottle;
    } else {
      const dailyKwh = dailyThermalKWh / CONFIG.COP_ELECTRIC;
      customerCurrentMonthlyCost = dailyKwh * 30 * inputs.electricityRate;
      lpgKgPerYear = (dailyKwh * 365) / CONFIG.LPG_KWH_PER_KG;
    }

    // --- STEP G: HEAT PUMP OPERATING COST (CUSTOMER PAYS MERALCO) ---
    const dailyHeatPumpKwh = dailyThermalKWh / heatPumpCOP;
    const monthlyHeatPumpKwh = dailyHeatPumpKwh * 30;
    const heatPumpMonthlyCostPHP = monthlyHeatPumpKwh * inputs.electricityRate;

    // Customer net position
    const customerMonthlySavings = customerCurrentMonthlyCost - heatPumpMonthlyCostPHP;
    const customerNetPosition = customerMonthlySavings - customerMonthlyPayment;

    // --- STEP H: UTILITY REVENUE STREAMS ---
    // 1. Equipment margin (upfront)
    const upfrontEquipmentMargin = equipmentMarginUSD;
    
    // 2. Electricity revenue (NEW demand from heat pump)
    // monthlyHeatPumpKwh already calculated in STEP G
    const annualHeatPumpKwh = dailyHeatPumpKwh * 365;
    const annualElectricityRevenue = annualHeatPumpKwh * inputs.electricityRate; // PHP
    const annualElectricityRevenueUSD = annualElectricityRevenue / CONFIG.FX_RATE;
    
    // Net margin on electricity (25% after generation, T&D, OPEX)
    const annualElectricityProfitUSD = annualElectricityRevenueUSD * (inputs.electricityNetMargin / 100);
    
    // 3. Service revenue
    const annualServiceRevenue = inputs.annualServicePerUnit;
    
    // 4. Carbon credits
    const annualCO2TonsAvoided = (lpgKgPerYear * CONFIG.LPG_CO2_PER_KG) / 1000;
    const annualCarbonRevenueUSD = annualCO2TonsAvoided * inputs.carbonCreditPrice;

    // Total annual ongoing revenue
    const totalAnnualOngoingRevenue = annualElectricityProfitUSD + annualServiceRevenue + annualCarbonRevenueUSD;

    console.log(`Annual electricity: ${annualHeatPumpKwh.toFixed(0)} kWh = $${annualElectricityRevenueUSD.toFixed(0)} revenue, $${annualElectricityProfitUSD.toFixed(0)} profit (${inputs.electricityNetMargin}% margin)`);

    // --- STEP I: UTILITY COSTS (ONGOING) ---
    const annualMaintenanceCost = equipmentCost * 0.02; // 2%
    const annualInsuranceCost = equipmentCost * 0.01; // 1%
    const annualOperatingCosts = annualMaintenanceCost + annualInsuranceCost;

    // --- STEP J: UTILITY CASH FLOWS ---
    // Year 0: Upfront equipment margin
    const year0CashFlow = upfrontEquipmentMargin;

    // Year 1-5: Electricity profit + Service + Carbon - Operating costs
    const annualNetCashFlow = totalAnnualOngoingRevenue - annualOperatingCosts;

    // Total 5-year
    const total5YearRevenue = year0CashFlow + (totalAnnualOngoingRevenue * inputs.contractYears);
    const total5YearCosts = annualOperatingCosts * inputs.contractYears;
    const netProfit5Year = total5YearRevenue - total5YearCosts;

    // --- STEP K: UTILITY FINANCING COST ---
    // If utility borrows to fund deployments
    const utilityDebtPrincipal = utilityCOGS; // What utility actually pays
    const utilityAnnualInterest = utilityDebtPrincipal * (inputs.utilityInterestRate / 100);
    const utilityTotalInterest = utilityAnnualInterest * inputs.utilityLoanTerm;
    const utilityTotalDebtCost = utilityDebtPrincipal + utilityTotalInterest;

    // Net profit after financing
    const netProfitAfterFinancing = netProfit5Year - utilityTotalInterest;

    // --- STEP L: KEY METRICS ---
    // Simple payback (months)
    const monthlyNetCashFlow = annualNetCashFlow / 12;
    const paybackMonths = utilityCOGS / (monthlyNetCashFlow + (year0CashFlow / 60)); // Spread upfront over term

    // ROI
    const roi5Year = (netProfitAfterFinancing / utilityDebtPrincipal) * 100;
    const roiAnnual = roi5Year / inputs.contractYears;

    // IRR (simplified)
    const cashFlows = [-utilityDebtPrincipal, year0CashFlow];
    for (let i = 0; i < inputs.contractYears; i++) {
      cashFlows.push(annualNetCashFlow);
    }

    let irr = 0.15;
    for (let iter = 0; iter < 100; iter++) {
      let npv = 0, deriv = 0;
      for (let t = 0; t < cashFlows.length; t++) {
        const factor = Math.pow(1 + irr, t);
        npv += cashFlows[t] / factor;
        if (t > 0) deriv -= t * cashFlows[t] / (factor * (1 + irr));
      }
      if (Math.abs(npv) < 0.01) break;
      irr = irr - npv / deriv;
      if (irr < -0.99 || irr > 10) irr = 0.15;
    }
    const irrPercent = irr * 100;

    // NPV
    const calculateNPV = (rate) => {
      let npv = 0;
      for (let t = 0; t < cashFlows.length; t++) {
        npv += cashFlows[t] / Math.pow(1 + rate, t);
      }
      return npv;
    };

    const npv8 = calculateNPV(0.08);
    const npv10 = calculateNPV(0.10);
    const npv12 = calculateNPV(0.12);

    // --- STEP M: CASH FLOW SCHEDULE ---
    const cashFlowSchedule = [];
    let cumulativeCashFlow = 0;

    cashFlowSchedule.push({
      year: 0,
      upfrontMargin: year0CashFlow,
      serviceRevenue: 0,
      carbonRevenue: 0,
      opex: 0,
      financing: -utilityAnnualInterest,
      netCashFlow: year0CashFlow - utilityAnnualInterest,
      cumulative: year0CashFlow - utilityAnnualInterest
    });

    cumulativeCashFlow = year0CashFlow - utilityAnnualInterest;

    for (let year = 1; year <= inputs.contractYears; year++) {
      const netCF = annualNetCashFlow - utilityAnnualInterest;
      cumulativeCashFlow += netCF;
      cashFlowSchedule.push({
        year,
        upfrontMargin: 0,
        serviceRevenue: annualServiceRevenue,
        carbonRevenue: annualCarbonRevenueUSD,
        opex: -annualOperatingCosts,
        financing: -utilityAnnualInterest,
        netCashFlow: netCF,
        cumulative: cumulativeCashFlow
      });
    }

    // --- STEP N: PORTFOLIO METRICS ---
    const units = inputs.portfolioUnits;
    const portfolioInvestment = utilityDebtPrincipal * units;
    const portfolioAnnualRevenue = totalAnnualOngoingRevenue * units;
    const portfolioUpfrontMargin = year0CashFlow * units;
    const portfolioNetProfit5Year = netProfitAfterFinancing * units;
    const portfolioCO2Reduction = annualCO2TonsAvoided * units;
    const portfolioPeakReduction = (CONFIG.PEAK_REDUCTION_KW * units) / 1000; // MW
    const portfolioElectricityProfit = annualElectricityProfitUSD * units;
    
    // Solviva Solar Cross-Sell (sister company revenue)
    const solvivaCustomers = units * (inputs.solvivaConversionRate / 100);
    const solvivaAvgSystemUSD = 3500; // Approx 6.10 kWp system
    const solvivaReferralFee = solvivaAvgSystemUSD * 0.05; // 5% referral to 1882
    const solvivaReferralRevenue = solvivaCustomers * solvivaReferralFee;

    return {
      // Product Selection
      selectedKarnot,
      heatPumpPriceUSD: equipmentCost,
      integratedTankVolume,
      externalTankNeeded,
      externalTankCost: tankCost,
      requiredRecoveryKW,
      
      // Costs
      equipmentCost,
      installationCost,
      tankCost,
      karnotSalePrice,
      customerEquipmentPrice,
      equipmentMarginUSD,
      utilityCOGS,
      utilityDebtPrincipal,
      utilityTotalInterest,
      utilityTotalDebtCost,

      // Utility Revenue
      upfrontEquipmentMargin,
      year0CashFlow,
      annualElectricityRevenueUSD,
      annualElectricityProfitUSD,
      annualServiceRevenue,
      annualCarbonRevenueUSD,
      totalAnnualOngoingRevenue,
      annualOperatingCosts,
      annualNetCashFlow,
      total5YearRevenue,
      netProfit5Year,
      netProfitAfterFinancing,

      // Customer
      customerCurrentMonthlyCost,
      heatPumpMonthlyCostPHP,
      customerMonthlySavings,
      customerMonthlyPayment,
      customerNetPosition,
      totalFinancingCost,
      customerAPR: inputs.customerAPR,
      customerFinancingTerm: inputs.customerFinancingTerm,

      // Metrics
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
      portfolioUpfrontMargin,
      portfolioNetProfit5Year,
      portfolioCO2Reduction,
      portfolioPeakReduction,
      portfolioElectricityProfit,
      solvivaCustomers,
      solvivaReferralRevenue,
    };
  }, [inputs, karnotProducts]);

  const handleChange = (field, isNumber = false) => (e) => {
    const val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    setInputs(prev => ({ ...prev, [field]: val }));
  };

  if (loadingProducts) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-20">
          <RefreshCw className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-600 font-bold">Loading heat pump inventory...</p>
        </div>
      </div>
    );
  }

  if (calculations.error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-red-600" size={48} />
          <h2 className="text-xl font-bold text-red-900 mb-2">Error</h2>
          <p className="text-red-700">{calculations.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* === HEADER === */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <Briefcase size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Karnot Utility Partnership Model</h1>
            <p className="text-blue-200">1882 Energy Ventures × AboitizPower | Heat Pump Deployment Fund</p>
          </div>
        </div>
        <p className="text-sm text-gray-300 max-w-3xl">
          Utility purchases R290 heat pumps from Karnot, finances customer deployments, earns margin + service revenue + carbon credits.
          Selected product: <strong>{calculations.selectedKarnot?.name}</strong>
        </p>
      </div>

      {/* === EXECUTIVE SUMMARY === */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 mb-8 text-white">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Target size={20} /> Executive Summary (Per Unit)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{fmtUSD(calculations.utilityCOGS)}</div>
            <div className="text-xs text-emerald-100">Utility Investment</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{fmtUSD(calculations.upfrontEquipmentMargin)}</div>
            <div className="text-xs text-emerald-100">Upfront Margin</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{fmtUSD(calculations.netProfitAfterFinancing)}</div>
            <div className="text-xs text-emerald-100">5-Yr Net Profit</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{calculations.irrPercent.toFixed(1)}%</div>
            <div className="text-xs text-emerald-100">IRR</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{Math.round(calculations.paybackMonths)} mo</div>
            <div className="text-xs text-emerald-100">Payback</div>
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

            {/* Customer Profile */}
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Customer Type</label>
              <select
                value={inputs.heatingType}
                onChange={handleChange('heatingType')}
                className="w-full p-2 border rounded-lg"
              >
                <option value="lpg">LPG / Propane</option>
                <option value="electric">Grid Electric</option>
              </select>
            </div>

            <Input
              label="Daily Hot Water (Liters)"
              type="number"
              value={inputs.dailyLitersHotWater}
              onChange={handleChange('dailyLitersHotWater', true)}
              className="mb-4"
            />

            {inputs.heatingType === 'lpg' && (
              <Input
                label="LPG Price/Bottle (PHP)"
                type="number"
                value={inputs.lpgPricePerBottle}
                onChange={handleChange('lpgPricePerBottle', true)}
                className="mb-4"
              />
            )}

            <Input
              label="Electricity Rate (PHP/kWh)"
              type="number"
              value={inputs.electricityRate}
              onChange={handleChange('electricityRate', true)}
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
                  label="Utility Margin (%)"
                  type="number"
                  value={inputs.utilityMarginPercent}
                  onChange={handleChange('utilityMarginPercent', true)}
                />
                <Input
                  label="Customer APR (%)"
                  type="number"
                  value={inputs.customerAPR}
                  onChange={handleChange('customerAPR', true)}
                />
                <Input
                  label="Customer Term (months)"
                  type="number"
                  value={inputs.customerFinancingTerm}
                  onChange={handleChange('customerFinancingTerm', true)}
                />
                <Input
                  label="Utility Interest Rate (%)"
                  type="number"
                  value={inputs.utilityInterestRate}
                  onChange={handleChange('utilityInterestRate', true)}
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
          {/* Product Selection */}
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
            <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
              <Droplets size={20} /> Selected Heat Pump
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-orange-700 mb-1">Product</div>
                <div className="font-bold text-lg text-orange-900">{calculations.selectedKarnot.name}</div>
              </div>
              <div>
                <div className="text-sm text-orange-700 mb-1">Heating Capacity</div>
                <div className="font-bold text-lg text-orange-900">{calculations.requiredRecoveryKW.toFixed(1)} kW required / {(calculations.selectedKarnot.kW_DHW_Nominal || 0).toFixed(1)} kW rated</div>
              </div>
              <div>
                <div className="text-sm text-orange-700 mb-1">Equipment Price</div>
                <div className="font-bold text-lg text-orange-900">{fmtUSD(calculations.equipmentCost)}</div>
              </div>
              <div>
                <div className="text-sm text-orange-700 mb-1">Tank Configuration</div>
                <div className="font-bold text-lg text-orange-900">
                  {calculations.integratedTankVolume > 0 ? `${calculations.integratedTankVolume}L integrated` : 'No tank'}
                  {calculations.externalTankNeeded > 0 && ` + ${calculations.externalTankNeeded}L external`}
                </div>
              </div>
            </div>
          </Card>

          {/* Unit Economics */}
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-green-600" /> Unit Economics
            </h3>

            <div className="grid grid-cols-2 gap-6">
              {/* Costs */}
              <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">Utility Investment</h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Heat Pump</span>
                    <span className="font-semibold">{fmtUSD(calculations.equipmentCost)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Installation</span>
                    <span className="font-semibold">{fmtUSD(calculations.installationCost)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">External Tank</span>
                    <span className="font-semibold">{fmtUSD(calculations.tankCost)}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-purple-50 rounded-lg px-3 -mx-3">
                    <span className="font-bold text-gray-800">Karnot Sale Price</span>
                    <span className="font-bold text-purple-600 text-lg">{fmtUSD(calculations.karnotSalePrice)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">1882 Markup ({inputs.equipmentMarginPercent}%)</span>
                    <span className="font-semibold text-green-600">{fmtUSD(calculations.equipmentMarginUSD)}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-blue-50 rounded-lg px-3 -mx-3">
                    <span className="font-bold text-gray-800">Customer Pays</span>
                    <span className="font-bold text-blue-600 text-lg">{fmtUSD(calculations.customerEquipmentPrice)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">1882 COGS (upfront)</span>
                    <span className="font-semibold text-red-600">{fmtUSD(calculations.utilityCOGS)}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-green-50 rounded-lg px-3 -mx-3 mt-2">
                    <span className="font-bold text-gray-800">Equipment Margin</span>
                    <span className="font-bold text-green-600 text-lg">{fmtUSD(calculations.upfrontEquipmentMargin)}</span>
                  </div>
                </div>
              </div>

              {/* Revenue Streams */}
              <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">Annual Revenue Per Unit</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-l-4 border-blue-500">
                    <div className="text-xs font-bold text-blue-600 uppercase">1. Electricity Profit</div>
                    <div className="text-xl font-bold text-gray-800">{fmtUSD(calculations.annualElectricityProfitUSD)}<span className="text-sm text-gray-500">/year ({inputs.electricityNetMargin}%)</span></div>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border-l-4 border-purple-500">
                    <div className="text-xs font-bold text-purple-600 uppercase">2. Service Revenue</div>
                    <div className="text-xl font-bold text-gray-800">{fmtUSD(calculations.annualServiceRevenue)}<span className="text-sm text-gray-500">/year</span></div>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg border-l-4 border-emerald-500">
                    <div className="text-xs font-bold text-emerald-600 uppercase">3. Carbon Credits</div>
                    <div className="text-xl font-bold text-gray-800">{fmtUSD(calculations.annualCarbonRevenueUSD)}<span className="text-sm text-gray-500">/year</span></div>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-red-50 to-red-100 rounded-lg border-l-4 border-red-500">
                    <div className="text-xs font-bold text-red-600 uppercase">Operating Costs</div>
                    <div className="text-xl font-bold text-gray-800">({fmtUSD(calculations.annualOperatingCosts)})<span className="text-sm text-gray-500">/year</span></div>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg">
                    <div className="text-xs font-bold text-purple-600 uppercase">Net Annual CF</div>
                    <div className="text-2xl font-bold text-purple-700">{fmtUSD(calculations.annualNetCashFlow)}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Customer Value */}
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users size={20} className="text-orange-600" /> Customer Value Proposition
            </h3>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <div className="text-xs font-bold text-red-600 uppercase mb-1">Current Cost</div>
                <div className="text-2xl font-bold text-red-700">{fmtPHP(calculations.customerCurrentMonthlyCost)}</div>
                <div className="text-xs text-gray-500">{inputs.heatingType === 'lpg' ? 'LPG' : 'Electric'}</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <div className="text-xs font-bold text-blue-600 uppercase mb-1">Heat Pump Elec</div>
                <div className="text-2xl font-bold text-blue-700">{fmtPHP(calculations.heatPumpMonthlyCostPHP)}</div>
                <div className="text-xs text-gray-500">Paid to Meralco</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg text-center">
                <div className="text-xs font-bold text-purple-600 uppercase mb-1">Equipment Payment</div>
                <div className="text-2xl font-bold text-purple-700">{fmtPHP(calculations.customerMonthlyPayment)}</div>
                <div className="text-xs text-gray-500">{inputs.customerFinancingTerm}mo @ {inputs.customerAPR}%</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <div className="text-xs font-bold text-green-600 uppercase mb-1">Net Savings</div>
                <div className="text-2xl font-bold text-green-700">{fmtPHP(calculations.customerNetPosition)}</div>
                <div className="text-xs text-gray-500">Per month</div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                <Award size={16} /> Customer Benefits:
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>Lower monthly cost</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>No upfront CAPEX</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>Free maintenance</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>ESG compliance</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Key Metrics */}
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
                      <th className="px-3 py-2 text-right">Upfront Margin</th>
                      <th className="px-3 py-2 text-right">Service</th>
                      <th className="px-3 py-2 text-right">Carbon</th>
                      <th className="px-3 py-2 text-right">OPEX</th>
                      <th className="px-3 py-2 text-right">Financing</th>
                      <th className="px-3 py-2 text-right">Net CF</th>
                      <th className="px-3 py-2 text-right">Cumulative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculations.cashFlowSchedule.map(row => (
                      <tr key={row.year} className="border-b">
                        <td className="px-3 py-2 font-bold">{row.year}</td>
                        <td className="px-3 py-2 text-right text-green-600">{row.upfrontMargin > 0 ? fmtUSD(row.upfrontMargin) : '-'}</td>
                        <td className="px-3 py-2 text-right text-blue-600">{row.serviceRevenue > 0 ? fmtUSD(row.serviceRevenue) : '-'}</td>
                        <td className="px-3 py-2 text-right text-emerald-600">{row.carbonRevenue > 0 ? fmtUSD(row.carbonRevenue) : '-'}</td>
                        <td className="px-3 py-2 text-right text-orange-600">{row.opex < 0 ? `(${fmtUSD(Math.abs(row.opex))})` : '-'}</td>
                        <td className="px-3 py-2 text-right text-red-600">{row.financing < 0 ? `(${fmtUSD(Math.abs(row.financing))})` : '-'}</td>
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
      <Card className="mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Building size={24} className="text-blue-600" /> Portfolio Projection: {inputs.portfolioUnits} Units
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">${(calculations.portfolioInvestment / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-gray-300">Utility Investment</div>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-800 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">${(calculations.portfolioUpfrontMargin / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-green-200">Upfront Margin</div>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">${(calculations.portfolioAnnualRevenue / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-blue-200">Annual Revenue</div>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">${(calculations.portfolioNetProfit5Year / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-purple-200">5-Year Net Profit</div>
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
          <div className="bg-purple-50 p-4 rounded-lg text-center border border-purple-200">
            <DollarSign className="mx-auto text-purple-600 mb-2" size={24} />
            <div className="text-2xl font-bold text-purple-700">${(calculations.portfolioElectricityProfit / 1000).toFixed(0)}K</div>
            <div className="text-xs text-gray-600">Annual Electricity Profit</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg text-center border border-orange-200">
            <Users className="mx-auto text-orange-600 mb-2" size={24} />
            <div className="text-2xl font-bold text-orange-700">{inputs.portfolioUnits}</div>
            <div className="text-xs text-gray-600">Customer Deployments</div>
          </div>
        </div>

        {/* Solviva Cross-Sell */}
        <div className="mt-6 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-4">
          <h4 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
            <Zap size={18} /> Solviva Solar Cross-Sell Opportunity
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-800">{Math.round(calculations.solvivaCustomers)}</div>
              <div className="text-xs text-gray-600">Customers ({inputs.solvivaConversionRate}% conversion)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-800">${fmt(calculations.solvivaReferralRevenue)}</div>
              <div className="text-xs text-gray-600">Referral Revenue (5%)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-800">Group Synergy</div>
              <div className="text-xs text-gray-600">AboitizPower Portfolio</div>
            </div>
          </div>
        </div>
      </Card>

      {/* === INVESTMENT THESIS === */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Briefcase size={24} /> Investment Thesis for 1882 Energy / AboitizPower
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-bold text-blue-300 mb-3">The Opportunity</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span>1882 buys heat pumps from Karnot at full price, marks up {inputs.equipmentMarginPercent}% to customer</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span>Customer finances equipment over {inputs.customerFinancingTerm} months @ {inputs.customerAPR}% (still saves money vs LPG)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong>NEW electricity demand:</strong> Customer now uses heat pump instead of LPG</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span>1882 earns {inputs.electricityNetMargin}% net margin on new electricity sales (based on AboitizPower margins)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span>Recurring service + carbon revenue for {inputs.contractYears} years</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong>Cross-sell Solviva solar</strong> to {inputs.solvivaConversionRate}% of customers (group synergy)</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-green-300 mb-3">Revenue Streams</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <TrendingUp size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong>Equipment margin:</strong> {fmtUSD(calculations.upfrontEquipmentMargin)} upfront</span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUp size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong>Electricity profit:</strong> {fmtUSD(calculations.annualElectricityProfitUSD)}/year ({inputs.electricityNetMargin}% margin)</span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUp size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong>Service revenue:</strong> {fmtUSD(calculations.annualServiceRevenue)}/year</span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUp size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong>Carbon credits:</strong> {fmtUSD(calculations.annualCarbonRevenueUSD)}/year</span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUp size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong>{calculations.irrPercent.toFixed(0)}% IRR</strong> | <strong>{Math.round(calculations.paybackMonths)} month</strong> payback</span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUp size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span>Peak demand reduction defers grid infrastructure capex</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">Portfolio Target</div>
              <div className="text-2xl font-bold">${(calculations.portfolioInvestment / 1000000).toFixed(1)}M for {inputs.portfolioUnits} units</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">5-Year Return</div>
              <div className="text-2xl font-bold text-green-400">${(calculations.portfolioNetProfit5Year / 1000000).toFixed(1)}M ({calculations.roi5Year.toFixed(0)}% ROI)</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InvestorFinancialModel;
