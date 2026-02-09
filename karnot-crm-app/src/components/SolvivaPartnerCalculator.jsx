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
  Layers, Edit3, RefreshCw, Save, MousePointer2, Locate, Calculator, Info, X
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

// --- HELPER: MAP CENTER UPDATE ---
const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo({ lat, lng });
    }
  }, [map, lat, lng]);
  return null;
};

// --- HELPER: DRAG EVENT LISTENER ---
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
  const [showFixtureModal, setShowFixtureModal] = useState(false);
  
  // Google Solar Data
  const [coordinates, setCoordinates] = useState({ lat: 16.023497, lng: 120.430082 }); 
  const [addressSearch, setAddressSearch] = useState("Cosmos Farm, Pangasinan"); 
  const [solarData, setSolarData] = useState(null);
  const [fetchingSolar, setFetchingSolar] = useState(false);
  
  // Inputs
  const [inputs, setInputs] = useState({
    // Water Heating Demand
    showers: 3,
    people: 4,
    showerPowerKW: 3.5,
    
    // Cooling Load
    acCount: 3,
    acHorsePower: 1.5, 
    acHoursNight: 8,
    
    // Base Load
    baseLoadKW: 0.5,
    
    // Financials
    electricityRate: 12.50, 
    lpgPrice: 1100, 

    // Manual Override Defaults (Solar)
    manualRoofArea: 100, 
    manualSunHours: 5.5,
    
    // Engineering Physics
    inletTemp: 25,
    targetTemp: 55,
    panelWattage: 550,
    recoveryHours: 10,
  });

  const [fixtureInputs, setFixtureInputs] = useState({ 
    showers: 0, basins: 0, sinks: 0, people: 0, hours: 8 
  });

  // === 1. LOAD DATA (FETCH BOTH CATALOGS) ===
  useEffect(() => {
    const loadData = async () => {
      const user = getAuth().currentUser;
      if (!user) return;
      
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'products'));
        const allProds = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Filter 1: Solviva Solar Kits
        const competitors = allProds
          .filter(p => p.category === 'Competitor Solar')
          .sort((a, b) => (a.kW_Cooling_Nominal || 0) - (b.kW_Cooling_Nominal || 0));
          
        // Filter 2: Karnot Heat Pumps
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

  // === 2. SOLAR API HANDLER ===
  const handleSolarLookup = async () => {
    setFetchingSolar(true);
    
    const data = await fetchSolarPotential(coordinates.lat, coordinates.lng);
    
    if (data) {
      setSolarData(data);
      let newArea = inputs.manualRoofArea;
      let newSun = inputs.manualSunHours;

      if (data.source === 'GOOGLE') {
          newArea = data.maxArrayAreaSqM.toFixed(0);
          newSun = data.sunshineHours.toFixed(1);
      } else if (data.source === 'OPEN_METEO') {
          newSun = data.peakSunHoursPerDay.toFixed(2);
      }

      setInputs(prev => ({
        ...prev,
        manualRoofArea: newArea,
        manualSunHours: newSun
      }));
    } else {
      console.warn("No Data Found.");
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

  // === FIXTURE CALCULATOR HANDLERS ===
  const handleFixtureChange = (field) => (e) => {
    setFixtureInputs(prev => ({ ...prev, [field]: parseInt(e.target.value) || 0 }));
  };

  const applyFixtureCalculation = () => {
    const liters = calculateFixtureDemand(fixtureInputs);
    // Apply the calculated liters and people count back to inputs
    setInputs(prev => ({
      ...prev,
      people: fixtureInputs.people || prev.people,
      // You could also add a dailyLiters field if you want to override the calculation
    }));
    setShowFixtureModal(false);
  };

  // === 3. ANALYSIS LOGIC (THE CORE) ===
  const analysis = useMemo(() => {
    // --- STEP A: SIZE THE THERMAL LOAD ---
    const dailyLiters = (inputs.people * 50) + (inputs.showers * 60);
    
    const deltaT = inputs.targetTemp - inputs.inletTemp;
    const dailyThermalKWh = (dailyLiters * deltaT * 1.163) / 1000;
    
    const requiredRecoveryKW = dailyThermalKWh / inputs.recoveryHours;

    // --- STEP B: SELECT THE MACHINE ---
    const selectedKarnot = karnotProducts.find(p => (p.kW_DHW_Nominal || p.kW || 0) >= requiredRecoveryKW)
                        || karnotProducts[karnotProducts.length - 1]
                        || { name: "Manual Est.", salesPriceUSD: 4500, kW_DHW_Nominal: 3.5, cop: 4.2, tankVolume: 0 };

    // --- STEP C: TANK MATH ---
    const requiredTotalVolume = Math.ceil(dailyLiters / 100) * 100;
    
    let integratedTankVolume = selectedKarnot.tankVolume || 0;
    if (!integratedTankVolume) {
        if (selectedKarnot.name?.includes("200")) integratedTankVolume = 200;
        else if (selectedKarnot.name?.includes("300")) integratedTankVolume = 300;
    }
    
    const externalTankNeeded = Math.max(0, requiredTotalVolume - integratedTankVolume);

    // --- STEP D: ELECTRICAL LOADS (SCENARIO A vs B) ---
    const kwPerHP = 0.85; 
    const acTotalKW = inputs.acCount * inputs.acHorsePower * kwPerHP;
    
    // Scenario A: Solar Only (Must support Electric Showers)
    const showerPeakKW = inputs.showers * inputs.showerPowerKW;
    const peakLoad_A = inputs.baseLoadKW + acTotalKW + showerPeakKW; 
    
    // Scenario B: Partner Model (Showers replaced by Heat Pump)
    const hpInputKW = (selectedKarnot.kW_DHW_Nominal || 3.5) / (selectedKarnot.cop || 4.2);
    const peakLoad_B = inputs.baseLoadKW + acTotalKW + hpInputKW;         
    
    // --- STEP E: SELECT SOLVIVA SYSTEMS ---
    const targetInverterA = peakLoad_A * 1.2;
    const targetInverterB = peakLoad_B * 1.2;

    const planA = solvivaProducts.find(p => (p.kW_Cooling_Nominal || 0) >= targetInverterA) 
               || solvivaProducts[solvivaProducts.length - 1]
               || { name: "Solviva 10kW", kW_Cooling_Nominal: 10, salesPriceUSD: 8000 };
               
    const planB = solvivaProducts.find(p => (p.kW_Cooling_Nominal || 0) >= targetInverterB) 
               || solvivaProducts[0]
               || { name: "Solviva 5kW", kW_Cooling_Nominal: 5, salesPriceUSD: 5000 };

    // --- STEP F: PANEL COUNTS ---
    const panelsA = Math.ceil((planA?.kW_Cooling_Nominal || 0) * 1000 / inputs.panelWattage);
    const panelsB = Math.ceil((planB?.kW_Cooling_Nominal || 0) * 1000 / inputs.panelWattage);
    const panelsSaved = Math.max(0, panelsA - panelsB);

    // --- STEP G: FINANCIALS ---
    const costA = planA?.salesPriceUSD || 0;
    const costB_Solar = planB?.salesPriceUSD || 0;
    const costKarnot = selectedKarnot.salesPriceUSD || 4500;
    const costB_Total = costB_Solar + costKarnot;
    
    // Monthly Generation and Savings
    const monthlyGenB_kWh = (planB?.kW_Cooling_Nominal || 0) * inputs.manualSunHours * 30;
    const monthlyBillSavingsB = monthlyGenB_kWh * inputs.electricityRate;

    const monthlyAdvantage = (costA - costB_Total) / 60; // Spread CAPEX savings over 5 years
    const fiveYearSavings = (costA - costB_Total) + (monthlyBillSavingsB * 60);

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
      peakLoad_A, 
      peakLoad_B,
      // Solar
      planA, 
      planB, 
      panelsA, 
      panelsB, 
      panelsSaved,
      // Financials
      costA, 
      costB_Total, 
      costKarnot,
      monthlyGenB_kWh,
      monthlyBillSavingsB, 
      fiveYearSavings, 
      monthlyAdvantage
    };
  }, [inputs, solvivaProducts, karnotProducts]); 

  // === 4. PDF GENERATOR ===
  const generatePDFReport = () => {
    const mapImgUrl = getStaticMapUrl();
    const element = document.createElement('div');
    element.style.padding = '20px';
    element.style.fontFamily = 'Helvetica, Arial, sans-serif';
    
    element.innerHTML = `
      <div style="border-bottom: 4px solid #F56600; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="margin: 0; color: #131B28; font-size: 28px;">Solviva + Karnot Proposal</h1>
          <h2 style="margin: 5px 0 0; color: #666; font-size: 16px; font-weight: normal;">Optimized Engineering Solution</h2>
        </div>
        <div style="text-align: right;">
          <div>${new Date().toLocaleDateString()}</div>
          <div style="font-weight: bold; color: #F56600;">CONFIDENTIAL</div>
        </div>
      </div>

      <div style="margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; height: 250px;">
        <img src="${mapImgUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>

      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
        <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #334155;">Engineering Sizing</h3>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
            <tr>
                <td style="padding: 4px; color: #64748b;">Daily Load:</td>
                <td style="padding: 4px; font-weight: bold;">${analysis.dailyLiters.toLocaleString()} Liters</td>
                <td style="padding: 4px; color: #64748b;">Thermal Energy:</td>
                <td style="padding: 4px; font-weight: bold;">${analysis.dailyThermalKWh.toFixed(1)} kWh</td>
            </tr>
            <tr>
                <td style="padding: 4px; color: #64748b;">Selected Unit:</td>
                <td style="padding: 4px; font-weight: bold; color: #F56600;">${analysis.selectedKarnot.name}</td>
                <td style="padding: 4px; color: #64748b;">Recovery Rate:</td>
                <td style="padding: 4px; font-weight: bold;">${analysis.selectedKarnot.kW_DHW_Nominal || analysis.selectedKarnot.kW || 3.5} kW</td>
            </tr>
            <tr>
                <td style="padding: 4px; color: #64748b;">Integrated Tank:</td>
                <td style="padding: 4px; font-weight: bold;">${analysis.integratedTankVolume} Liters</td>
                <td style="padding: 4px; color: #64748b;">External Needed:</td>
                <td style="padding: 4px; font-weight: bold;">${analysis.externalTankNeeded > 0 ? analysis.externalTankNeeded + ' L' : 'None'}</td>
            </tr>
        </table>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div style="background: #fff5f5; padding: 15px; border-radius: 6px; border: 2px solid #dc3545;">
          <div style="font-size: 16px; font-weight: bold; color: #dc3545; margin-bottom: 10px;">Scenario A: Solar Only</div>
          <div style="font-size: 12px; margin-bottom: 5px;"><strong>${analysis.planA?.name}</strong></div>
          <div style="font-size: 12px; margin-bottom: 15px;">Panels: <strong>${analysis.panelsA}</strong> (@550W)</div>
          <div style="font-size: 24px; font-weight: bold; color: #dc3545;">$${analysis.costA.toLocaleString()}</div>
        </div>

        <div style="background: #f0fff4; padding: 15px; border-radius: 6px; border: 2px solid #28a745;">
          <div style="font-size: 16px; font-weight: bold; color: #28a745; margin-bottom: 10px;">Scenario B: Partner Model</div>
          <div style="font-size: 12px; margin-bottom: 5px;"><strong>${analysis.planB?.name}</strong> + ${analysis.selectedKarnot.name}</div>
          <div style="font-size: 12px; margin-bottom: 15px;">Panels: <strong>${analysis.panelsB}</strong> (Saved ${analysis.panelsSaved})</div>
          <div style="font-size: 24px; font-weight: bold; color: #28a745;">$${analysis.costB_Total.toLocaleString()}</div>
        </div>
      </div>

      <div style="background: #1e293b; color: white; padding: 20px; border-radius: 8px;">
        <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 15px; color: #94a3b8;">5-Year Financial Impact</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
          <div>
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">CAPEX Savings</div>
            <div style="font-size: 20px; font-weight: bold;">$${(analysis.costA - analysis.costB_Total).toLocaleString()}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Monthly Bill Savings</div>
            <div style="font-size: 20px; font-weight: bold; color: #fbbf24;">₱${analysis.monthlyBillSavingsB.toLocaleString()}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Total 5-Year Benefit</div>
            <div style="font-size: 24px; font-weight: bold; color: #10b981;">₱${analysis.fiveYearSavings.toLocaleString()}</div>
          </div>
        </div>
      </div>
    `;

    const opt = {
      margin: 0.5,
      filename: `Solviva_Karnot_Proposal_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  if (loading) return <div className="p-10 text-center">Loading Solviva Pricing Database...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 font-sans text-slate-800">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="text-orange-500"/> Solviva Partner Sizing Engine
          </h1>
          <p className="text-sm text-slate-500">
            Engineering-Driven System Optimization
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-slate-400 uppercase">Live Database</div>
          <div className="text-green-600 font-bold flex items-center gap-1 justify-end">
            <CheckCircle size={16}/> {karnotProducts.length} Karnot / {solvivaProducts.length} Solviva
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          
          {/* --- MAP CARD --- */}
          <Card className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-green-500"/> Site Analysis
            </h3>
            <div className="space-y-3">
              <div className="relative mb-2">
                 <input 
                   type="text"
                   value={addressSearch}
                   onChange={(e) => setAddressSearch(e.target.value)}
                   className="w-full p-2 pr-20 border border-slate-300 rounded text-sm"
                   placeholder="Enter address..."
                 />
              </div>
              <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-300 relative mb-3 shadow-inner">
                <APIProvider apiKey={import.meta.env.VITE_GOOGLE_SOLAR_KEY}>
                  <Map
                    style={{width: '100%', height: '100%'}}
                    defaultCenter={coordinates}
                    defaultZoom={19}
                    mapTypeId="hybrid"
                    gestureHandling={'cooperative'} 
                    disableDefaultUI={false} 
                  >
                     <GeocoderControl address={addressSearch} onLocationFound={handleAddressFound} />
                     <RecenterMap lat={coordinates.lat} lng={coordinates.lng} />
                     <MapEvents onDragEnd={handleMapIdle} />
                  </Map>
                </APIProvider>
                <div className="absolute bottom-2 left-2 bg-white/90 text-slate-800 text-[10px] px-2 py-1 rounded font-bold flex items-center gap-1 shadow-sm border border-gray-200">
                  <MousePointer2 size={10}/> Drag to adjust
                </div>
              </div>
              <Button onClick={handleSolarLookup} disabled={fetchingSolar} className="w-full flex items-center justify-center gap-2 shadow-sm bg-slate-800 hover:bg-slate-900">
                {fetchingSolar ? 'Scanning...' : <><RefreshCw size={16}/> Scan Solar Potential</>}
              </Button>
            </div>
          </Card>

          {/* --- INPUTS CARD --- */}
          <Card className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Edit3 size={18} className="text-blue-500"/> Design Inputs
            </h3>
            <div className="space-y-3">
               <div className="grid grid-cols-2 gap-3">
                  <Input label="Electric Showers" type="number" value={inputs.showers} onChange={(e) => setInputs({...inputs, showers: +e.target.value})} />
                  <Input label="Occupants" type="number" value={inputs.people} onChange={(e) => setInputs({...inputs, people: +e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-3">
                  <Input label="AC Units" type="number" value={inputs.acCount} onChange={(e) => setInputs({...inputs, acCount: +e.target.value})} />
                  <Input label="AC HP Each" type="number" step="0.5" value={inputs.acHorsePower} onChange={(e) => setInputs({...inputs, acHorsePower: +e.target.value})} />
               </div>
               
               <div className="flex gap-2 mt-4">
                 <Button 
                   variant="secondary"
                   onClick={() => setShowFixtureModal(true)}
                   className="flex-1 text-xs"
                 >
                   Estimate via Fixtures
                 </Button>
                 <button 
                   onClick={() => setShowMath(!showMath)}
                   className="flex-1 text-xs text-blue-600 font-bold hover:underline flex items-center justify-center gap-1 border rounded bg-blue-50"
                 >
                   {showMath ? "Hide Math" : "Show Math"}
                 </button>
               </div>
            </div>
          </Card>
        </div>

        {/* === RIGHT COLUMN: ANALYSIS & FINANCIALS === */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* --- DETAILED ENGINEERING BREAKDOWN --- */}
          {showMath && (
            <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 text-sm">
               <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                 <Calculator size={16}/> Detailed Engineering Calculations
               </h4>
               <div className="grid grid-cols-3 gap-4">
                  
                  {/* COL 1: THERMAL LOAD */}
                  <div className="bg-white p-3 rounded border border-slate-200">
                     <div className="text-xs font-bold text-slate-400 uppercase mb-2">1. Load Sizing</div>
                     <div className="flex justify-between border-b border-slate-100 py-1">
                        <span>Daily Usage:</span> <span className="font-mono">{analysis.dailyLiters.toFixed(0)} L</span>
                     </div>
                     <div className="flex justify-between border-b border-slate-100 py-1">
                        <span>Delta T:</span> <span className="font-mono">{inputs.targetTemp - inputs.inletTemp}°C</span>
                     </div>
                     <div className="flex justify-between border-b border-slate-100 py-1">
                        <span>Energy:</span> <span className="font-mono">{analysis.dailyThermalKWh.toFixed(1)} kWh</span>
                     </div>
                     <div className="flex justify-between py-1 font-bold text-blue-600">
                        <span>Req. KW:</span> <span className="font-mono">{analysis.requiredRecoveryKW.toFixed(1)} kW</span>
                     </div>
                  </div>

                  {/* COL 2: MACHINE SELECTION */}
                  <div className="bg-white p-3 rounded border border-slate-200">
                     <div className="text-xs font-bold text-slate-400 uppercase mb-2">2. Karnot Selection</div>
                     <div className="flex justify-between border-b border-slate-100 py-1">
                        <span className="text-xs">Model:</span> <span className="font-mono text-xs truncate max-w-[120px]">{analysis.selectedKarnot.name}</span>
                     </div>
                     <div className="flex justify-between border-b border-slate-100 py-1">
                        <span>Output:</span> <span className="font-mono">{analysis.selectedKarnot.kW_DHW_Nominal || analysis.selectedKarnot.kW || 3.5} kW</span>
                     </div>
                     <div className="flex justify-between border-b border-slate-100 py-1">
                        <span>Int. Tank:</span> <span className="font-mono">{analysis.integratedTankVolume} L</span>
                     </div>
                     <div className="flex justify-between py-1 font-bold text-orange-600">
                        <span>Ext. Tank:</span> <span className="font-mono">{analysis.externalTankNeeded > 0 ? analysis.externalTankNeeded + " L" : "None"}</span>
                     </div>
                  </div>

                  {/* COL 3: SOLAR MATH */}
                  <div className="bg-white p-3 rounded border border-slate-200">
                     <div className="text-xs font-bold text-slate-400 uppercase mb-2">3. Solar Sizing</div>
                     <div className="space-y-2">
                        <div>
                           <div className="text-[10px] text-red-500 font-bold">SOLAR ONLY</div>
                           <div className="flex justify-between font-mono text-xs">
                              <span>Load:</span> <span>{analysis.peakLoad_A.toFixed(1)} kW</span>
                           </div>
                           <div className="flex justify-between font-mono text-xs font-bold">
                              <span>Panels:</span> <span>{analysis.panelsA} × 550W</span>
                           </div>
                        </div>
                        <div className="border-t border-slate-100 pt-1">
                           <div className="text-[10px] text-green-600 font-bold">PARTNER MODEL</div>
                           <div className="flex justify-between font-mono text-xs">
                              <span>Load:</span> <span>{analysis.peakLoad_B.toFixed(1)} kW</span>
                           </div>
                           <div className="flex justify-between font-mono text-xs font-bold">
                              <span>Panels:</span> <span>{analysis.panelsB} × 550W</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* COMPARISON CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* SCENARIO A: SOLAR ONLY */}
            <div className="p-6 rounded-xl border-2 border-red-500 bg-red-50">
              <div className="flex justify-between mb-4">
                <h3 className="font-bold text-slate-700">Scenario A: Solar Only</h3>
                <span className="bg-white text-red-600 px-2 py-1 rounded text-xs font-bold border border-red-200">High Load</span>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-slate-500 font-bold">Required Inverter</p>
                  <p className="text-2xl font-bold text-red-600">{analysis.peakLoad_A.toFixed(1)} kW</p>
                  <p className="text-xs text-slate-500 mt-1">{analysis.panelsA}× Solar Panels</p>
                </div>
                <div className="pt-4 border-t border-red-200">
                  <p className="text-xs uppercase text-slate-500 font-bold">Solviva System Cost</p>
                  <p className="text-2xl font-bold text-slate-800">${analysis.costA.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500">{analysis.planA?.name}</p>
                </div>
              </div>
            </div>

            {/* SCENARIO B: PARTNER MODEL */}
            <div className="p-6 rounded-xl border-2 border-green-500 bg-green-50">
              <div className="flex justify-between mb-4">
                <h3 className="font-bold text-green-800">Scenario B: Partner Model</h3>
                <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">Optimized</span>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-green-700 font-bold">Optimized Inverter</p>
                  <p className="text-2xl font-bold text-green-700">{analysis.peakLoad_B.toFixed(1)} kW</p>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <ArrowRight size={12}/> Saved {analysis.panelsSaved} Solar Panels!
                  </p>
                </div>
                <div className="pt-4 border-t border-green-200">
                  <p className="text-xs uppercase text-green-700 font-bold">Total System Cost</p>
                  <p className="text-2xl font-bold text-green-900">${analysis.costB_Total.toLocaleString()}</p>
                  <p className="text-[10px] text-green-700">Includes {analysis.selectedKarnot.name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* FINANCIAL IMPACT */}
          <div className="bg-slate-900 text-white p-8 rounded-xl shadow-lg">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Financial Impact Analysis</h3>
            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <p className="text-sm text-slate-400 mb-1">CAPEX Savings</p>
                <p className="text-2xl font-bold text-white">₱{((analysis.costA - analysis.costB_Total) * 58).toLocaleString()}</p>
                <p className="text-xs text-slate-500">Upfront Difference</p>
              </div>
              <div className="text-center pb-2">
                 <div className="text-sm text-slate-400 mb-1">Solar Gen Value</div>
                 <div className="text-xl font-bold text-yellow-400">
                    ₱{analysis.monthlyBillSavingsB.toLocaleString()} /mo
                 </div>
                 <div className="text-[10px] text-slate-500">
                    ({analysis.monthlyGenB_kWh.toFixed(0)} kWh @ ₱{inputs.electricityRate})
                 </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400 mb-1">Total 5-Yr Benefit</p>
                <p className="text-3xl font-bold text-green-400">₱{(analysis.fiveYearSavings * 58).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-700 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold">Partnership Advantage</p>
                <p className="text-sm text-slate-300">Lower upfront cost + ongoing savings for customer</p>
              </div>
              <Button onClick={generatePDFReport} className="bg-orange-600 hover:bg-orange-700 text-white border-none">
                <Download className="mr-2" size={18}/> Generate Proposal PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* FIXTURE MODAL */}
      {showFixtureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Estimate via Fixtures</h3>
              <button onClick={() => setShowFixtureModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24}/>
              </button>
            </div>
            <div className="space-y-4">
              <Input label="Number of Showers" type="number" value={fixtureInputs.showers} onChange={handleFixtureChange('showers')} />
              <Input label="Number of Basins" type="number" value={fixtureInputs.basins} onChange={handleFixtureChange('basins')} />
              <Input label="Number of Sinks" type="number" value={fixtureInputs.sinks} onChange={handleFixtureChange('sinks')} />
              <Input label="Occupants" type="number" value={fixtureInputs.people} onChange={handleFixtureChange('people')} />
              <Input label="Operating Hours/Day" type="number" value={fixtureInputs.hours} onChange={handleFixtureChange('hours')} />
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowFixtureModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={applyFixtureCalculation} className="flex-1 bg-blue-600 hover:bg-blue-700">Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolvivaPartnerCalculator;
