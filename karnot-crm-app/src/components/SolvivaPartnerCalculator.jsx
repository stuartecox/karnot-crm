import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { fetchSolarPotential } from '../utils/googleSolar';
import html2pdf from 'html2pdf.js';
import { Card, Input, Button } from '../data/constants.jsx';
import {
  Zap, MapPin, CheckCircle, AlertTriangle, ArrowRight, 
  Battery, Moon, Sun, DollarSign, Search, FileText, Download,
  Layers
} from 'lucide-react';

const SolvivaPartnerCalculator = () => {
  // === STATE ===
  const [solvivaProducts, setSolvivaProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Google Solar Data
  // Default: Cosmos Farm (The location that works!)
  const [coordinates, setCoordinates] = useState({ lat: 16.023497, lng: 120.430082 }); 
  const [solarData, setSolarData] = useState(null);
  const [fetchingSolar, setFetchingSolar] = useState(false);

  // Inputs
  const [inputs, setInputs] = useState({
    // Water Heating (The "Spike" Load)
    showers: 3,
    people: 4,
    showerPowerKW: 3.5, 
    
    // Cooling (The "Night" Load)
    acCount: 3,
    acHorsePower: 1.5, // HP is standard in PH
    acHoursNight: 8,   // Hours running on battery
    
    // Base Load
    baseLoadKW: 0.5,   // Lights, Fridge, WiFi
    
    // Commercials
    eaasFee: 2000,     // Karnot Monthly Fee
    electricityRate: 12.50,
  });

  // === 1. LOAD DATA FROM FIREBASE ===
  useEffect(() => {
    const loadData = async () => {
      const user = getAuth().currentUser;
      if (!user) return;
      
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'products'));
        const prods = snap.docs.map(doc => doc.data());
        
        // Filter for the CSV data you uploaded
        const competitors = prods
          .filter(p => p.category === 'Competitor Solar')
          .sort((a, b) => (a.kW_Cooling_Nominal || 0) - (b.kW_Cooling_Nominal || 0));
          
        setSolvivaProducts(competitors);
      } catch (err) {
        console.error("Error loading Solviva products:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // === 2. GOOGLE SOLAR API ===
  const handleSolarLookup = async () => {
    setFetchingSolar(true);
    const data = await fetchSolarPotential(coordinates.lat, coordinates.lng);
    setSolarData(data);
    setFetchingSolar(false);
  };

  // Helper to generate the Satellite Image URL
  const getMapUrl = () => {
    const key = import.meta.env.VITE_GOOGLE_SOLAR_KEY;
    // zoom=20 is very close (house level), maptype=satellite gives the real photo
    return `https://maps.googleapis.com/maps/api/staticmap?center=${coordinates.lat},${coordinates.lng}&zoom=20&size=600x400&maptype=satellite&key=${key}`;
  };

  // === 3. THE "BATTERY SAVER" MATH ===
  const analysis = useMemo(() => {
    // --- A. NIGHT LOAD (Battery Drain) ---
    // 1 HP ≈ 0.85 kW electrical input (conservative avg for non-inverter AC)
    const kwPerHP = 0.85; 
    const acTotalKW = inputs.acCount * inputs.acHorsePower * kwPerHP;
    const acNightKWh = acTotalKW * inputs.acHoursNight;
    const baseNightKWh = inputs.baseLoadKW * inputs.acHoursNight;
    
    // Total kWh needed from battery if grid fails
    const totalSteadyNightLoad = acNightKWh + baseNightKWh;

    // --- B. PEAK LOAD (Inverter Sizing) ---
    // Scenario A: Electric Shower (Instant)
    // The inverter must handle AC + Lights + SHOWERS all at once.
    const showerPeakKW = inputs.showers * inputs.showerPowerKW; // e.g. 10.5 kW
    const peakLoad_A = inputs.baseLoadKW + acTotalKW + showerPeakKW; 
    
    // Scenario B: Karnot (Stored Thermal)
    // AquaHERO runs during the day. Night/Peak load adds 0 kW (or minimal 0.69kW if running).
    const peakLoad_B = inputs.baseLoadKW + acTotalKW + 0.69;         
    
    // --- C. FIND MATCHING SOLVIVA SYSTEM ---
    const planA = solvivaProducts.find(p => (p.kW_Cooling_Nominal || 0) >= peakLoad_A) 
               || solvivaProducts[solvivaProducts.length - 1]; // Max out if none fit
               
    const planB = solvivaProducts.find(p => (p.kW_Cooling_Nominal || 0) >= peakLoad_B) 
               || solvivaProducts[0]; // Min size

    // --- D. ROOF VALIDATION ---
    const planAFits = solarData ? (planA?.kW_Cooling_Nominal <= solarData.maxKwp) : true;
    const planBFits = solarData ? (planB?.kW_Cooling_Nominal <= solarData.maxKwp) : true;

    // --- E. FINANCIALS ---
    const costA = planA?.salesPriceUSD || 0; // PHP Monthly
    const costB_Solar = planB?.salesPriceUSD || 0;
    const costB_Total = costB_Solar + inputs.eaasFee;
    
    const monthlySavings = costA - costB_Total;
    const fiveYearSavings = monthlySavings * 60;

    return {
      acTotalKW,
      totalSteadyNightLoad,
      peakLoad_A,
      peakLoad_B,
      planA,
      planB,
      costA,
      costB_Total,
      monthlySavings,
      fiveYearSavings,
      planAFits,
      planBFits,
      inverterSaved: (peakLoad_A - peakLoad_B).toFixed(1)
    };
  }, [inputs, solvivaProducts, solarData]);

  // === 4. PDF GENERATOR ===
  const generatePDFReport = () => {
    // We get the map image to embed in PDF
    const mapImgUrl = getMapUrl();

    const element = document.createElement('div');
    element.style.padding = '20px';
    element.style.fontFamily = 'Helvetica, Arial, sans-serif';
    
    element.innerHTML = `
      <div style="border-bottom: 4px solid #F56600; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="margin: 0; color: #131B28; font-size: 28px;">Optimization Proposal</h1>
          <h2 style="margin: 5px 0 0; color: #666; font-size: 16px; font-weight: normal;">Solviva Solar + Karnot Thermal Battery</h2>
        </div>
        <div style="text-align: right;">
          <div>${new Date().toLocaleDateString()}</div>
          <div style="font-weight: bold; color: #F56600;">INTEGRATED SOLUTION</div>
        </div>
      </div>

      <div style="margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; height: 250px;">
        <img src="${mapImgUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>
      <div style="text-align: center; font-size: 10px; color: #666; margin-bottom: 30px;">
        Site Location: ${coordinates.lat}, ${coordinates.lng}
      </div>

      <div style="margin-bottom: 30px; background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #eee;">
        <div style="font-size: 18px; font-weight: bold; color: #131B28; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">The Challenge: "The Shower Spike"</div>
        <p>The customer's <strong>${inputs.showers} electric showers</strong> create a massive <strong>${(inputs.showers * inputs.showerPowerKW).toFixed(1)} kW</strong> power spike. This forces an oversized inverter and drains the battery during evening use.</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div style="background: #fff5f5; padding: 15px; border-radius: 6px; border: 2px solid #dc3545;">
          <div style="font-size: 18px; font-weight: bold; color: #dc3545; margin-bottom: 15px;">Scenario A: Solar Only</div>
          <div style="margin-bottom: 10px;">
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold;">Required Peak Load</div>
            <div style="font-size: 20px; font-weight: bold; color: #dc3545;">${analysis.peakLoad_A.toFixed(1)} kW</div>
          </div>
          <div style="margin-bottom: 10px;">
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold;">Required Solviva System</div>
            <div style="font-size: 16px; font-weight: bold;">${analysis.planA?.name || 'Custom Build'}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold;">Monthly Cost (60mo)</div>
            <div style="font-size: 20px; font-weight: bold; color: #dc3545;">₱${analysis.costA.toLocaleString()}</div>
          </div>
        </div>

        <div style="background: #f0fff4; padding: 15px; border-radius: 6px; border: 2px solid #28a745;">
          <div style="font-size: 18px; font-weight: bold; color: #28a745; margin-bottom: 15px;">Scenario B: Partner Model</div>
          <div style="margin-bottom: 10px;">
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold;">Optimized Peak Load</div>
            <div style="font-size: 20px; font-weight: bold; color: #28a745;">${analysis.peakLoad_B.toFixed(1)} kW</div>
          </div>
          <div style="margin-bottom: 10px;">
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold;">Required Solviva System</div>
            <div style="font-size: 16px; font-weight: bold;">${analysis.planB?.name}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold;">Monthly Cost (w/ Karnot)</div>
            <div style="font-size: 20px; font-weight: bold; color: #28a745;">₱${analysis.costB_Total.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div style="background: #131B28; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-top: 40px;">
        <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">TOTAL CUSTOMER SAVINGS (5 YEARS)</div>
        <div style="font-size: 36px; font-weight: bold; color: #F56600; margin: 10px 0;">₱${analysis.fiveYearSavings.toLocaleString()}</div>
        <div style="font-size: 12px; opacity: 0.8;">By right-sizing the solar asset and adding thermal storage.</div>
      </div>
    `;

    const opt = {
      margin: 0.5,
      filename: `Solviva_Proposal_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true }, // useCORS allows loading the Google Map image
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  if (loading) return <div className="p-10 text-center">Loading Solviva Pricing Database...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="text-orange-500"/> Solviva Partner Sizing Engine
          </h1>
          <p className="text-sm text-slate-500">
            Comparing Solviva "Hybrid" (Battery) vs. Karnot Optimized Model
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-slate-400 uppercase">Pricing Source</div>
          <div className="text-green-600 font-bold flex items-center gap-1 justify-end">
            <CheckCircle size={16}/> {solvivaProducts.length} CSV Records
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* === INPUTS COLUMN === */}
        <div className="space-y-6">
          
          {/* 1. AC Load */}
          <Card className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Moon size={18} className="text-indigo-500"/> 1. Night Load (Battery)
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input 
                  label="AC Units" 
                  type="number" 
                  value={inputs.acCount}
                  onChange={(e) => setInputs({...inputs, acCount: +e.target.value})}
                />
                <Input 
                  label="Size (HP)" 
                  type="number" 
                  value={inputs.acHorsePower}
                  onChange={(e) => setInputs({...inputs, acHorsePower: +e.target.value})}
                  step="0.5"
                />
              </div>
              <Input 
                label="Night Run Hours" 
                type="number" 
                value={inputs.acHoursNight}
                onChange={(e) => setInputs({...inputs, acHoursNight: +e.target.value})}
              />
              <div className="p-3 bg-indigo-50 rounded text-sm text-indigo-800">
                <strong>Battery Need:</strong> {analysis.totalSteadyNightLoad.toFixed(1)} kWh
              </div>
            </div>
          </Card>

          {/* 2. Water Heating */}
          <Card className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Zap size={18} className="text-red-500"/> 2. The Power Spike
            </h3>
            <div className="space-y-4">
              <Input 
                label="Electric Showers" 
                type="number" 
                value={inputs.showers}
                onChange={(e) => setInputs({...inputs, showers: +e.target.value})}
              />
              <Input 
                label="KW per Shower" 
                type="number" 
                value={inputs.showerPowerKW}
                onChange={(e) => setInputs({...inputs, showerPowerKW: +e.target.value})}
                step="0.5"
              />
              <div className="p-3 bg-red-50 rounded text-sm text-red-800">
                <strong>Peak Spike:</strong> {(inputs.showers * inputs.showerPowerKW).toFixed(1)} kW
              </div>
            </div>
          </Card>

          {/* 3. Roof Check - UPDATED WITH SATELLITE VIEW */}
          <Card className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-green-500"/> 3. Roof Validation
            </h3>
            <div className="space-y-3">
              
              {/* SATELLITE IMAGE CONTAINER */}
              <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-300 relative mb-3 group">
                <img 
                  src={getMapUrl()} 
                  alt="Satellite View" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded">
                  Google Satellite
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input label="Lat" value={coordinates.lat} onChange={(e) => setCoordinates({...coordinates, lat: e.target.value})} />
                <Input label="Lng" value={coordinates.lng} onChange={(e) => setCoordinates({...coordinates, lng: e.target.value})} />
              </div>
              
              <Button onClick={handleSolarLookup} disabled={fetchingSolar} className="w-full flex items-center justify-center gap-2">
                {fetchingSolar ? 'Scanning...' : <><Layers size={16}/> Analyze Roof Data</>}
              </Button>

              {solarData && (
                <div className="mt-3 p-3 bg-slate-900 text-white text-xs rounded border border-slate-700 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between mb-1">
                    <span>Max Panels:</span>
                    <span className="font-bold text-yellow-400">{solarData.maxPanels}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Max System:</span>
                    <span className="font-bold text-yellow-400">{solarData.maxKwp.toFixed(2)} kWp</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sun Hours:</span>
                    <span>{solarData.sunshineHours.toFixed(0)} hr/yr</span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* === RESULTS COLUMN === */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* SCENARIO A */}
            <div className={`p-6 rounded-xl border-2 ${analysis.planAFits ? 'border-red-200 bg-red-50' : 'border-red-500 bg-red-100'}`}>
              <div className="flex justify-between mb-4">
                <h3 className="font-bold text-slate-700">Scenario A: Status Quo</h3>
                <span className="bg-white text-red-600 px-2 py-1 rounded text-xs font-bold border border-red-200">
                  Solar Only
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-slate-500 font-bold">Required Peak Inverter</p>
                  <p className="text-2xl font-bold text-red-600">{analysis.peakLoad_A.toFixed(1)} kW</p>
                  <p className="text-xs text-red-500">Includes {inputs.showers}x Electric Showers</p>
                </div>

                <div className="pt-4 border-t border-red-200">
                  <p className="text-xs uppercase text-slate-500 font-bold">Required Solviva Plan</p>
                  <p className="text-lg font-bold text-slate-800">{analysis.planA?.name || 'N/A'}</p>
                  
                  {!analysis.planAFits && solarData && (
                    <div className="mt-2 flex items-start gap-2 text-red-700 bg-white p-2 rounded text-xs border border-red-300">
                      <AlertTriangle size={14}/>
                      <strong>Roof Fail:</strong> Needs {analysis.planA?.kW_Cooling_Nominal}kW, roof only fits {solarData.maxKwp.toFixed(1)}kW.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SCENARIO B */}
            <div className="p-6 rounded-xl border-2 border-green-500 bg-green-50">
              <div className="flex justify-between mb-4">
                <h3 className="font-bold text-green-800">Scenario B: Partner Model</h3>
                <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">
                  Solviva + Karnot
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-green-700 font-bold">Optimized Peak Load</p>
                  <p className="text-2xl font-bold text-green-700">{analysis.peakLoad_B.toFixed(1)} kW</p>
                  <p className="text-xs text-green-600">
                    <ArrowRight size={12} className="inline"/> Downsized by {analysis.inverterSaved} kW
                  </p>
                </div>

                <div className="pt-4 border-t border-green-200">
                  <p className="text-xs uppercase text-green-700 font-bold">Required Solviva Plan</p>
                  <p className="text-lg font-bold text-green-900">{analysis.planB?.name}</p>
                  <p className="text-xs text-green-700">Fits easily on roof</p>
                </div>
              </div>
            </div>
          </div>

          {/* FINANCIAL SUMMARY */}
          <div className="bg-slate-900 text-white p-8 rounded-xl shadow-lg">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">
              Monthly Bill Breakdown (60-Mo Term)
            </h3>
            
            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <p className="text-sm text-slate-400 mb-1">Status Quo</p>
                <p className="text-2xl font-bold text-red-400 line-through decoration-white decoration-2">
                  ₱{analysis.costA.toLocaleString()}
                </p>
              </div>

              <div className="text-center pb-2">
                <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold inline-block mb-2 shadow-lg animate-pulse">
                  SAVE ₱{analysis.monthlySavings.toLocaleString()} / mo
                </div>
                <ArrowRight className="mx-auto text-slate-500"/>
              </div>

              <div className="text-right">
                <p className="text-sm text-slate-400 mb-1">Partner Model</p>
                <p className="text-3xl font-bold text-green-400">
                  ₱{analysis.costB_Total.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  (Solar ₱{analysis.planB?.salesPriceUSD?.toLocaleString()} + Karnot ₱{inputs.eaasFee.toLocaleString()})
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-700 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold">5-Year Total Savings</p>
                <p className="text-2xl font-bold text-white">₱{analysis.fiveYearSavings.toLocaleString()}</p>
              </div>
              <Button 
                onClick={generatePDFReport} 
                className="bg-orange-600 hover:bg-orange-700 text-white border-none"
              >
                <Download className="mr-2" size={18}/> Generate Proposal PDF
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SolvivaPartnerCalculator;
