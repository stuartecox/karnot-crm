import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { fetchSolarPotential } from '../utils/googleSolar';
import { calculateFixtureDemand } from '../utils/heatPumpLogic'; 
import html2pdf from 'html2pdf.js';
import { APIProvider, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Card, Input, Button } from '../data/constants.jsx';
import {
  Zap, MapPin, CheckCircle, AlertTriangle, ArrowRight, 
  Battery, Moon, Sun, DollarSign, Search, FileText, Download,
  Layers, Edit3, RefreshCw, Save, MousePointer2, Locate, Calculator, 
  Info, X, TrendingUp, Droplets, ThermometerSun, PiggyBank, Target,
  Award, BarChart3, Flame, CreditCard, Wallet
} from 'lucide-react';

// --- HELPER: ADDRESS SEARCH ---
const GeocoderControl = ({ address, onLocationFound }) => {
  const map = useMap();
  const geocodingLib = useMapsLibrary('geocoding');
  const [geocoder, setGeocoder] = useState(null);

  useEffect(() => {
    if (geocodingLib) {
      setGeocoder(new geocodingLib.Geocoder());
    }
  }, [geocodingLib]);

  const handleSearch = () => {
    if (!geocoder || !map || !address) return;
    geocoder.geocode({ address: address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        const newLat = location.lat();
        const newLng = location.lng();
        map.panTo({ lat: newLat, lng: newLng });
        map.setZoom(19);
        onLocationFound(newLat, newLng);
      } else {
        alert("Location not found. Try a different address format.");
      }
    });
  };

  return (
    <Button onClick={handleSearch} className="absolute right-1 top-1 h-8 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow-md z-10 flex items-center gap-1">
      <Search size={14}/> Find
    </Button>
  );
};

const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo({ lat, lng });
    }
  }, [map, lat, lng]);
  return null;
};

const MapEvents = ({ onDragEnd }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('idle', () => {
      const center = map.getCenter();
      if (center) {
        onDragEnd(center.lat(), center.lng());
      }
    });
    return () => google.maps.event.removeListener(listener);
  }, [map, onDragEnd]);
  return null;
};

const SolvivaPartnerCalculator = () => {
  // === STATE ===
  const [solvivaProducts, setSolvivaProducts] = useState([]);
  const [karnotProducts, setKarnotProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMath, setShowMath] = useState(false);
  
  // Google Solar Data
  const [coordinates, setCoordinates] = useState({ lat: 16.023497, lng: 120.430082 }); 
  const [addressSearch, setAddressSearch] = useState("Cosmos Farm, Pangasinan"); 
  const [solarData, setSolarData] = useState(null);
  const [fetchingSolar, setFetchingSolar] = useState(false);
  
  // Inputs
  const [inputs, setInputs] = useState({
    // Customer Profile
    monthlyElectricBill: 8000, // PHP - This is how Solviva sizes systems
    people: 4,
    showers: 3,
    
    // Loads
    acCount: 3,
    acHorsePower: 1.5,
    showerPowerKW: 3.5,
    baseLoadKW: 0.5,
    
    // Current Heating
    currentHeating: 'electric',
    
    // Financials
    electricityRate: 12.50, // PHP per kWh
    lpgPrice: 1100,
    lpgSize: 11,
    dieselPrice: 60,
    
    // Financing Terms (Solviva's model)
    financingTerm: 60, // 12, 36, or 60 months
    
    // Solar
    manualRoofArea: 100, 
    manualSunHours: 5.5,
    
    // Engineering
    inletTemp: 25,
    targetTemp: 55,
    panelWattage: 550,
    recoveryHours: 10,
    
    // Karnot Costs
    installationCostPerUnit: 600,
    annualServicePerUnit: 172,
  });

  // === 1. LOAD DATA ===
  useEffect(() => {
    const loadData = async () => {
      const user = getAuth().currentUser;
      if (!user) return;
      
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'products'));
        const allProds = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const competitors = allProds
          .filter(p => p.category === 'Competitor Solar')
          .sort((a, b) => (a.kW_Cooling_Nominal || 0) - (b.kW_Cooling_Nominal || 0));
          
        const heatPumps = allProds
          .filter(p => {
             const cat = (p.category || '').toLowerCase();
             const name = (p.name || '').toLowerCase();
             return (cat.includes('heat pump') || cat.includes('heater') || name.includes('aquahero')) && !name.includes('ivolt');
          })
          .sort((a, b) => (a.kW_DHW_Nominal || 0) - (b.kW_DHW_Nominal || 0));

        setSolvivaProducts(competitors);
        setKarnotProducts(heatPumps);
      } catch (err) {
        console.error("Error loading products:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // === 2. SOLAR API ===
  const handleSolarLookup = async () => {
    setFetchingSolar(true);
    const data = await fetchSolarPotential(coordinates.lat, coordinates.lng);
    if (data) {
      setSolarData(data);
      let newArea = inputs.manualRoofArea;
      let newSun = inputs.manualSunHours;
      if (data.source === 'GOOGLE') {
          newArea = Math.floor(data.maxArrayAreaSqM);
          newSun = parseFloat(data.sunshineHours.toFixed(1));
      } else if (data.source === 'OPEN_METEO') {
          newSun = parseFloat(data.peakSunHoursPerDay.toFixed(2));
      }
      setInputs(prev => ({ ...prev, manualRoofArea: newArea, manualSunHours: newSun }));
    }
    setFetchingSolar(false);
  };

  const getStaticMapUrl = () => {
    const key = import.meta.env.VITE_GOOGLE_SOLAR_KEY;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${coordinates.lat},${coordinates.lng}&zoom=20&size=600x400&maptype=satellite&key=${key}`;
  };

  const handleMapIdle = useCallback((lat, lng) => {
    setCoordinates({ lat, lng });
  }, []);

  const handleAddressFound = useCallback((lat, lng) => {
    setCoordinates({ lat, lng });
  }, []);

  // === 3. CORE ANALYSIS LOGIC ===
  const analysis = useMemo(() => {
    // STEP A: THERMAL LOAD SIZING
    const dailyLiters = (inputs.people * 50) + (inputs.showers * 60);
    const deltaT = inputs.targetTemp - inputs.inletTemp;
    const dailyThermalKWh = (dailyLiters * deltaT * 1.163) / 1000;
    const requiredRecoveryKW = dailyThermalKWh / inputs.recoveryHours;

    // STEP B: SELECT KARNOT HEAT PUMP
    let selectedKarnot = karnotProducts.find(p => (p.kW_DHW_Nominal || p.kW || 0) >= requiredRecoveryKW);
    if (!selectedKarnot && karnotProducts.length > 0) {
      selectedKarnot = karnotProducts[karnotProducts.length - 1];
    }
    if (!selectedKarnot) {
      return {
        error: true,
        message: "No Karnot heat pump products found. Add AquaHERO products to database.",
      };
    }

    // STEP C: TANK SIZING
    const requiredTotalVolume = Math.ceil(dailyLiters / 100) * 100;
    let integratedTankVolume = selectedKarnot.tankVolume || 0;
    if (!integratedTankVolume) {
        if (selectedKarnot.name?.includes("200")) integratedTankVolume = 200;
        else if (selectedKarnot.name?.includes("300")) integratedTankVolume = 300;
    }
    const externalTankNeeded = Math.max(0, requiredTotalVolume - integratedTankVolume);

    // STEP D: ELECTRICAL LOADS
    const kwPerHP = 0.85;
    const acTotalKW = inputs.acCount * inputs.acHorsePower * kwPerHP;
    const showerPeakKW = inputs.showers * inputs.showerPowerKW;
    const hpInputKW = (selectedKarnot.kW_DHW_Nominal || 3.5) / (selectedKarnot.cop || 4.2);
    
    const peakLoad_SolarOnly = inputs.baseLoadKW + acTotalKW + showerPeakKW;
    const peakLoad_Partner = inputs.baseLoadKW + acTotalKW + hpInputKW;

    // STEP E: SELECT SOLVIVA SYSTEMS
    const targetInverter_SolarOnly = peakLoad_SolarOnly * 1.2;
    const targetInverter_Partner = peakLoad_Partner * 1.2;

    let planSolarOnly = solvivaProducts.find(p => (p.kW_Cooling_Nominal || 0) >= targetInverter_SolarOnly);
    if (!planSolarOnly && solvivaProducts.length > 0) {
      planSolarOnly = solvivaProducts[solvivaProducts.length - 1];
    }
    if (!planSolarOnly) {
      return { error: true, message: "No Solviva products found. Add Competitor Solar products." };
    }

    let planPartner = solvivaProducts.find(p => (p.kW_Cooling_Nominal || 0) >= targetInverter_Partner);
    if (!planPartner && solvivaProducts.length > 0) {
      planPartner = solvivaProducts[0];
    }
    if (!planPartner) {
      planPartner = planSolarOnly;
    }

    // STEP F: PANEL COUNTS
    const panelsSolarOnly = Math.ceil((planSolarOnly?.kW_Cooling_Nominal || 0) * 1000 / inputs.panelWattage);
    const panelsPartner = Math.ceil((planPartner?.kW_Cooling_Nominal || 0) * 1000 / inputs.panelWattage);
    const panelsSaved = Math.max(0, panelsSolarOnly - panelsPartner);

    // STEP G: SOLVIVA MONTHLY PAYMENTS (Their pricing model)
    // They have 12mo, 36mo, 60mo terms with different monthly rates
    // We'll calculate based on their published rates
    const solvivaPriceSolarOnly = planSolarOnly?.salesPriceUSD || 0;
    const solvivaPricePartner = planPartner?.salesPriceUSD || 0;
    
    // Solviva financing calculation (approximate their rates)
    const getMonthlyPayment = (principal, months) => {
      // Their rates suggest ~8-10% annual interest built in
      const rate = 0.09 / 12; // 9% annual
      if (months === 12) return principal * 1.05 / 12; // Higher effective rate for 12mo
      if (months === 36) return principal * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
      if (months === 60) return principal * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
      return principal / months;
    };

    const monthlyPayment_SolarOnly = getMonthlyPayment(solvivaPriceSolarOnly, inputs.financingTerm);
    const monthlyPayment_Partner_SolarPortion = getMonthlyPayment(solvivaPricePartner, inputs.financingTerm);
    
    // Karnot portion (added to monthly)
    const karnotPrice = selectedKarnot.salesPriceUSD || 2235;
    const monthlyPayment_KarnotPortion = getMonthlyPayment(karnotPrice + inputs.installationCostPerUnit, inputs.financingTerm);
    
    const monthlyPayment_Partner_Total = monthlyPayment_Partner_SolarPortion + monthlyPayment_KarnotPortion;

    // STEP H: MONTHLY SAVINGS CALCULATION
    // Current monthly electric bill
    const currentMonthlyBill = inputs.monthlyElectricBill;
    
    // Estimated new bill WITH solar-only (still paying for hot water via electric showers)
    const showerEnergyPerUse = inputs.showerPowerKW * 0.167; // 10 min
    const dailyShowerKWh = showerEnergyPerUse * inputs.showers;
    const monthlyShowerCost = dailyShowerKWh * 30 * inputs.electricityRate;
    const residualBill_SolarOnly = monthlyShowerCost + (currentMonthlyBill * 0.15); // 15% residual grid use
    
    // Estimated new bill WITH partner model (heat pump + solar)
    const hpDailyKWh = dailyThermalKWh / (selectedKarnot.cop || 4.2);
    const hpMonthlyCost = hpDailyKWh * 30 * inputs.electricityRate * 0.30; // 30% from grid, 70% from solar
    const residualBill_Partner = hpMonthlyCost + (currentMonthlyBill * 0.10); // 10% residual grid use

    // Net monthly cost to customer
    const netMonthlyCost_SolarOnly = monthlyPayment_SolarOnly + residualBill_SolarOnly;
    const netMonthlyCost_Partner = monthlyPayment_Partner_Total + residualBill_Partner;
    
    // Monthly advantage
    const monthlyAdvantage_Customer = netMonthlyCost_SolarOnly - netMonthlyCost_Partner;

    // STEP I: SOLVIVA REVENUE ANALYSIS
    // Solar margin
    const solvivaMargin_SolarOnly = solvivaPriceSolarOnly * 0.35;
    const solvivaMargin_Partner = solvivaPricePartner * 0.35;
    
    // Karnot commission (15% referral fee)
    const karnotCommission = karnotPrice * 0.15;
    
    // Installation coordination (20% margin)
    const installationRevenue = inputs.installationCostPerUnit * 0.20;
    
    // Service revenue
    const annualServiceRevenue = inputs.annualServicePerUnit;
    const fiveYearServiceRevenue = annualServiceRevenue * 5;
    
    // Total revenue comparison
    const totalRevenue_SolarOnly = solvivaMargin_SolarOnly;
    const totalRevenue_Partner_Upfront = solvivaMargin_Partner + karnotCommission + installationRevenue;
    const totalRevenue_Partner_5Year = totalRevenue_Partner_Upfront + fiveYearServiceRevenue;
    
    // Revenue lift
    const revenueLift = totalRevenue_Partner_Upfront - totalRevenue_SolarOnly;
    const revenueLiftPercent = (revenueLift / totalRevenue_SolarOnly) * 100;

    // STEP J: CUSTOMER LIFETIME VALUE
    // Total savings over financing term
    const totalSavings_FinancingPeriod = monthlyAdvantage_Customer * inputs.financingTerm;
    
    // After financing paid off, pure savings
    const monthlySavings_PostFinancing = currentMonthlyBill - residualBill_Partner - (inputs.annualServicePerUnit / 12);
    const fiveYearSavings_PostFinancing = monthlySavings_PostFinancing * (60 - inputs.financingTerm);
    
    const totalCustomerBenefit = totalSavings_FinancingPeriod + fiveYearSavings_PostFinancing;

    return {
      // Thermal
      dailyLiters,
      dailyThermalKWh,
      requiredRecoveryKW,
      // Machine
      selectedKarnot,
      hpInputKW,
      // Tank
      requiredTotalVolume,
      integratedTankVolume,
      externalTankNeeded,
      // Electrical
      peakLoad_SolarOnly,
      peakLoad_Partner,
      showerPeakKW,
      // Solar
      planSolarOnly,
      planPartner,
      panelsSolarOnly,
      panelsPartner,
      panelsSaved,
      // Monthly Payments (USD)
      monthlyPayment_SolarOnly,
      monthlyPayment_Partner_Total,
      monthlyPayment_Partner_SolarPortion,
      monthlyPayment_KarnotPortion,
      // Monthly Bills (PHP)
      residualBill_SolarOnly,
      residualBill_Partner,
      netMonthlyCost_SolarOnly,
      netMonthlyCost_Partner,
      monthlyAdvantage_Customer,
      // Customer Value (PHP)
      totalSavings_FinancingPeriod,
      monthlySavings_PostFinancing,
      fiveYearSavings_PostFinancing,
      totalCustomerBenefit,
      // Solviva Revenue (USD)
      solvivaMargin_SolarOnly,
      solvivaMargin_Partner,
      karnotCommission,
      installationRevenue,
      annualServiceRevenue,
      fiveYearServiceRevenue,
      totalRevenue_SolarOnly,
      totalRevenue_Partner_Upfront,
      totalRevenue_Partner_5Year,
      revenueLift,
      revenueLiftPercent,
    };
  }, [inputs, solvivaProducts, karnotProducts]);

  // === 4. PDF GENERATOR ===
  const generatePDFReport = () => {
    const element = document.createElement('div');
    element.style.padding = '20px';
    element.style.fontFamily = 'Helvetica, Arial, sans-serif';
    element.style.fontSize = '11px';
    
    element.innerHTML = `
      <div style="border-bottom: 4px solid #F56600; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="margin: 0; color: #131B28; font-size: 24px;">Solviva + Karnot Partnership Analysis</h1>
        <h2 style="margin: 5px 0 0; color: #666; font-size: 14px; font-weight: normal;">${new Date().toLocaleDateString()}</h2>
      </div>

      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">Customer Monthly Payment Comparison</h3>
        <table style="width: 100%; font-size: 12px;">
          <tr>
            <td><strong>Solar Only:</strong></td>
            <td>$${analysis.monthlyPayment_SolarOnly.toLocaleString()}/mo</td>
            <td>+ ₱${analysis.residualBill_SolarOnly.toLocaleString()} grid</td>
            <td>= <strong>₱${analysis.netMonthlyCost_SolarOnly.toLocaleString()}/mo</strong></td>
          </tr>
          <tr style="background: #d1fae5;">
            <td><strong>Partner Model:</strong></td>
            <td>$${analysis.monthlyPayment_Partner_Total.toLocaleString()}/mo</td>
            <td>+ ₱${analysis.residualBill_Partner.toLocaleString()} grid</td>
            <td>= <strong>₱${analysis.netMonthlyCost_Partner.toLocaleString()}/mo</strong></td>
          </tr>
          <tr style="background: #fef3c7;">
            <td colspan="3"><strong>Customer Saves:</strong></td>
            <td><strong>₱${analysis.monthlyAdvantage_Customer.toLocaleString()}/mo</strong></td>
          </tr>
        </table>
      </div>

      <div style="background: #fffbeb; padding: 15px; border-radius: 8px; border: 2px solid #f59e0b;">
        <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">Solviva Revenue Analysis</h3>
        <table style="width: 100%; font-size: 11px;">
          <tr>
            <td><strong>Solar Only:</strong></td>
            <td>Margin: $${analysis.solvivaMargin_SolarOnly.toLocaleString()}</td>
            <td><strong>Total: $${analysis.totalRevenue_SolarOnly.toLocaleString()}</strong></td>
          </tr>
          <tr style="background: #d1fae5;">
            <td><strong>Partner Model:</strong></td>
            <td>Solar: $${analysis.solvivaMargin_Partner.toLocaleString()} + Karnot: $${analysis.karnotCommission.toLocaleString()}</td>
            <td><strong>Total: $${analysis.totalRevenue_Partner_Upfront.toLocaleString()}</strong></td>
          </tr>
          <tr style="background: #fef3c7; font-weight: bold;">
            <td colspan="2">Revenue Lift:</td>
            <td>+$${analysis.revenueLift.toLocaleString()} (+${analysis.revenueLiftPercent.toFixed(0)}%)</td>
          </tr>
        </table>
      </div>
    `;

    const opt = {
      margin: 0.5,
      filename: `Solviva_Partnership_Analysis_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (analysis.error) return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-8 text-center">
        <AlertTriangle size={48} className="text-red-600 mx-auto mb-4"/>
        <h2 className="text-2xl font-bold text-red-900">{analysis.message}</h2>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Zap size={32}/> Solviva + Karnot Partnership Calculator
        </h1>
        <p className="text-orange-100 mt-2">Monthly Payment Comparison & Revenue Analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: INPUTS */}
        <div className="space-y-6">
          <Card className="bg-white p-5 rounded-xl border shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Wallet size={18} className="text-blue-500"/> Customer Profile
            </h3>
            <div className="space-y-3">
              <Input 
                label="Monthly Electric Bill (₱)" 
                type="number" 
                value={inputs.monthlyElectricBill} 
                onChange={(e) => setInputs({...inputs, monthlyElectricBill: +e.target.value})} 
              />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Occupants" type="number" value={inputs.people} onChange={(e) => setInputs({...inputs, people: +e.target.value})} />
                <Input label="Showers" type="number" value={inputs.showers} onChange={(e) => setInputs({...inputs, showers: +e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-2">Financing Term</label>
                <select 
                  value={inputs.financingTerm}
                  onChange={(e) => setInputs({...inputs, financingTerm: +e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded text-sm"
                >
                  <option value={12}>12 months</option>
                  <option value={36}>36 months</option>
                  <option value={60}>60 months</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT: RESULTS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* CUSTOMER COMPARISON */}
          <div className="bg-white rounded-xl border-2 border-blue-200 p-6">
            <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
              <CreditCard size={20}/> Customer Monthly Payment
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* SOLAR ONLY */}
              <div className="p-4 rounded-lg border-2 border-red-300 bg-red-50">
                <div className="text-xs text-red-700 font-bold mb-2">SOLAR ONLY</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>System Payment:</span>
                    <span className="font-bold">${analysis.monthlyPayment_SolarOnly.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Grid Bill:</span>
                    <span className="font-bold">₱{analysis.residualBill_SolarOnly.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-lg">
                    <span className="font-bold">Total/Month:</span>
                    <span className="font-bold text-red-700">₱{analysis.netMonthlyCost_SolarOnly.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* PARTNER MODEL */}
              <div className="p-4 rounded-lg border-2 border-green-500 bg-green-50">
                <div className="text-xs text-green-700 font-bold mb-2">PARTNER MODEL</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>System Payment:</span>
                    <span className="font-bold">${analysis.monthlyPayment_Partner_Total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Grid Bill:</span>
                    <span className="font-bold">₱{analysis.residualBill_Partner.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-lg">
                    <span className="font-bold">Total/Month:</span>
                    <span className="font-bold text-green-700">₱{analysis.netMonthlyCost_Partner.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 text-center">
              <div className="text-sm text-yellow-800 font-bold mb-1">Customer Saves</div>
              <div className="text-3xl font-bold text-yellow-900">
                ₱{analysis.monthlyAdvantage_Customer.toLocaleString()}/month
              </div>
              <div className="text-xs text-yellow-700 mt-1">
                = ₱{analysis.totalCustomerBenefit.toLocaleString()} total over 5 years
              </div>
            </div>
          </div>

          {/* SOLVIVA REVENUE */}
          <div className="bg-white rounded-xl border-2 border-orange-200 p-6">
            <h3 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">
              <Award size={20}/> 1882 Ventures (Solviva) Revenue Analysis
            </h3>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-700 mb-1">Solar Margin</div>
                <div className="text-xl font-bold text-blue-900">${analysis.solvivaMargin_Partner.toLocaleString()}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="text-xs text-purple-700 mb-1">Karnot Commission</div>
                <div className="text-xl font-bold text-purple-900">${analysis.karnotCommission.toLocaleString()}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-xs text-green-700 mb-1">Install + Service</div>
                <div className="text-xl font-bold text-green-900">${(analysis.installationRevenue + analysis.annualServiceRevenue).toLocaleString()}</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-100 to-yellow-100 p-4 rounded-lg border-2 border-orange-300">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-xs text-orange-700 mb-1">Revenue per Deal</div>
                  <div className="text-2xl font-bold text-orange-900">${analysis.totalRevenue_Partner_Upfront.toLocaleString()}</div>
                  <div className="text-xs text-orange-600">vs ${analysis.totalRevenue_SolarOnly.toLocaleString()} solar-only</div>
                </div>
                <div>
                  <div className="text-xs text-yellow-700 mb-1">Revenue Lift</div>
                  <div className="text-2xl font-bold text-yellow-900">+${analysis.revenueLift.toLocaleString()}</div>
                  <div className="text-xs text-yellow-600">+{analysis.revenueLiftPercent.toFixed(0)}% increase</div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-xl flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold mb-1">Generate Partnership Proposal</h3>
              <p className="text-sm text-slate-300">Complete financial analysis for 1882 Ventures</p>
            </div>
            <Button onClick={generatePDFReport} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3">
              <Download className="mr-2" size={18}/> PDF Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolvivaPartnerCalculator;
