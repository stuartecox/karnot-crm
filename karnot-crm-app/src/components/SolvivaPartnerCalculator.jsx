import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { fetchSolarPotential } from '../utils/googleSolar';
import html2pdf from 'html2pdf.js';
import { APIProvider, Map } from '@vis.gl/react-google-maps';
import { Card, Input, Button } from '../data/constants.jsx';
import {
  Zap, MapPin, CheckCircle, AlertTriangle, ArrowRight, 
  Battery, Moon, Sun, DollarSign, Search, FileText, Download,
  Layers, Edit3, RefreshCw, Save, MousePointer2
} from 'lucide-react';

const SolvivaPartnerCalculator = () => {
  // === STATE ===
  const [solvivaProducts, setSolvivaProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Google Solar Data
  const [coordinates, setCoordinates] = useState({ lat: 16.023497, lng: 120.430082 }); 
  const [solarData, setSolarData] = useState(null);
  const [fetchingSolar, setFetchingSolar] = useState(false);
  
  const [manualMode, setManualMode] = useState(true); 

  // Inputs
  const [inputs, setInputs] = useState({
    // Water Heating
    showers: 3,
    people: 4,
    showerPowerKW: 3.5, 
    
    // Cooling
    acCount: 3,
    acHorsePower: 1.5, 
    acHoursNight: 8,
    
    // Base Load
    baseLoadKW: 0.5,
    
    // Commercials
    eaasFee: 2000,
    electricityRate: 12.50, // PHP per kWh

    // Manual Override Defaults
    manualRoofArea: 100, 
    manualSunHours: 5.5 
  });

  // === 1. LOAD DATA ===
  useEffect(() => {
    const loadData = async () => {
      const user = getAuth().currentUser;
      if (!user) return;
      
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'products'));
        const prods = snap.docs.map(doc => doc.data());
        
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
      setManualMode(true);

    } else {
      console.warn("No Data Found.");
      setManualMode(true);
    }
    setFetchingSolar(false);
  };

  const getStaticMapUrl = () => {
    const key = import.meta.env.VITE_GOOGLE_SOLAR_KEY;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${coordinates.lat},${coordinates.lng}&zoom=20&size=600x400&maptype=satellite&key=${key}`;
  };

  // === 3. ANALYSIS LOGIC ===
  const analysis = useMemo(() => {
    // --- A. SOLAR GENERATION (SENSITIVE TO SUN HOURS) ---
    const roofMaxKwp = (inputs.manualRoofArea * 0.180); // 180W/m2
    const sunHours = inputs.manualSunHours;

    // --- B. LOAD CALCULATIONS ---
    const kwPerHP = 0.85; 
    const acTotalKW = inputs.acCount * inputs.acHorsePower * kwPerHP;
    const acNightKWh = acTotalKW * inputs.acHoursNight;
    const baseNightKWh = inputs.baseLoadKW * inputs.acHoursNight;
    const totalSteadyNightLoad = acNightKWh + baseNightKWh;

    const showerPeakKW = inputs.showers * inputs.showerPowerKW;
    const peakLoad_A = inputs.baseLoadKW + acTotalKW + showerPeakKW; 
    const peakLoad_B = inputs.baseLoadKW + acTotalKW + 0.69;         
    
    // --- C. SYSTEM SELECTION ---
    const planA = solvivaProducts.find(p => (p.kW_Cooling_Nominal || 0) >= peakLoad_A) 
               || solvivaProducts[solvivaProducts.length - 1];
               
    const planB = solvivaProducts.find(p => (p.kW_Cooling_Nominal || 0) >= peakLoad_B) 
               || solvivaProducts[0];

    const planAFits = roofMaxKwp > 0 ? (planA?.kW_Cooling_Nominal <= roofMaxKwp) : true;
    const planBFits = roofMaxKwp > 0 ? (planB?.kW_Cooling_Nominal <= roofMaxKwp) : true;

    const costA = planA?.salesPriceUSD || 0;
    const costB_Solar = planB?.salesPriceUSD || 0;
    const costB_Total = costB_Solar + inputs.eaasFee;
    
    // --- D. ROI CALCULATION (NEW LOGIC) ---
    // Calculate how much electricity the chosen system actually generates
    // Use the SMALLER of: The Plan Size OR The Roof Max Size
    const systemSizeA = Math.min(planA?.kW_Cooling_Nominal || 0, roofMaxKwp);
    const systemSizeB = Math.min(planB?.kW_Cooling_Nominal || 0, roofMaxKwp);

    const monthlyGenA_kWh = systemSizeA * sunHours * 30;
    const monthlyGenB_kWh = systemSizeB * sunHours * 30;

    const monthlyBillSavingsA = monthlyGenA_kWh * inputs.electricityRate;
    const monthlyBillSavingsB = monthlyGenB_kWh * inputs.electricityRate;

    // Net Value = (Bill Savings) - (Lease Cost)
    const netValueA = monthlyBillSavingsA - costA;
    const netValueB = monthlyBillSavingsB - costB_Total;

    // The "Difference" (Advantage of Partner Model)
    // Typically Partner Model is cheaper hardware, so net value is higher
    const monthlyAdvantage = costA - costB_Total; // Hardware savings
    
    // Total 5 Year Benefit
    // Includes Hardware Savings + The Grid Value of the Solar
    const fiveYearSavings = (monthlyAdvantage * 60) + (monthlyBillSavingsB * 60);

    return {
      acTotalKW,
      totalSteadyNightLoad,
      peakLoad_A,
      peakLoad_B,
      planA,
      planB,
      costA,
      costB_Total,
      planAFits,
      planBFits,
      inverterSaved: (peakLoad_A - peakLoad_B).toFixed(1),
      maxKwp: roofMaxKwp,
      sunHours,
      
      // New Metrics
      monthlyGenB_kWh,
      monthlyBillSavingsB,
      monthlyAdvantage,
      fiveYearSavings
    };
  }, [inputs, solvivaProducts, solarData]); 

  // === 4. PDF GENERATOR ===
  const generatePDFReport = () => {
    const mapImgUrl = getStaticMapUrl();
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
        Location: ${coordinates.lat}, ${coordinates.lng} 
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div style="background: #fff5f5; padding: 15px; border-radius: 6px; border: 2px solid #dc3545;">
          <div style="font-size: 18px; font-weight: bold; color: #dc3545; margin-bottom: 15px;">Scenario A: Solar Only</div>
          <div style="margin-bottom: 10px;">
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold;">Required Peak Load</div>
            <div style="font-size: 20px; font-weight: bold; color: #dc3545;">${analysis.peakLoad_A.toFixed(1)} kW</div>
          </div>
          <div style="margin-bottom: 10px;">
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold;">Required System</div>
            <div style="font-size: 16px; font-weight: bold;">${analysis.planA?.name || 'Custom Build'}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold;">Hardware Cost (60mo)</div>
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
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold;">Required System</div>
            <div style="font-size: 16px; font-weight: bold;">${analysis.planB?.name}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold;">Hardware Cost (w/ Karnot)</div>
            <div style="font-size: 20px; font-weight: bold; color: #28a745;">₱${analysis.costB_Total.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div style="background: #131B28; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-top: 40px;">
        <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">TOTAL VALUE (5 YEARS)</div>
        <div style="font-size: 36px; font-weight: bold; color: #F56600; margin: 10px 0;">₱${analysis.fiveYearSavings.toLocaleString()}</div>
        <div style="font-size: 12px; opacity: 0.8;">Includes hardware savings + solar electricity generation.</div>
      </div>
    `;

    const opt = {
      margin: 0.5,
      filename: `Solviva_Proposal_${new Date().toISOString().split('T')[0]}.pdf`,
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
        <div className="space-y-6">
          <Card className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Moon size={18} className="text-indigo-500"/> 1. Night Load (Battery)
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="AC Units" type="number" value={inputs.acCount} onChange={(e) => setInputs({...inputs, acCount: +e.target.value})} />
                <Input label="Size (HP)" type="number" value={inputs.acHorsePower} onChange={(e) => setInputs({...inputs, acHorsePower: +e.target.value})} step="0.5" />
              </div>
              <Input label="Night Run Hours" type="number" value={inputs.acHoursNight} onChange={(e) => setInputs({...inputs, acHoursNight: +e.target.value})} />
              <div className="p-3 bg-indigo-50 rounded text-sm text-indigo-800">
                <strong>Battery Need:</strong> {analysis.totalSteadyNightLoad.toFixed(1)} kWh
              </div>
            </div>
          </Card>

          <Card className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Zap size={18} className="text-red-500"/> 2. The Power Spike
            </h3>
            <div className="space-y-4">
              <Input label="Electric Showers" type="number" value={inputs.showers} onChange={(e) => setInputs({...inputs, showers: +e.target.value})} />
              <div className="p-3 bg-red-50 rounded text-sm text-red-800">
                <strong>Peak Spike:</strong> {(inputs.showers * inputs.showerPowerKW).toFixed(1)} kW
              </div>
            </div>
          </Card>

          <Card className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-green-500"/> 3. Roof & Solar Data
            </h3>
            <div className="space-y-3">
              
              {/* --- INTERACTIVE MAP CONTAINER --- */}
              <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden border border-gray-300 relative mb-3">
                <APIProvider apiKey={import.meta.env.VITE_GOOGLE_SOLAR_KEY}>
                  <Map
                    style={{width: '100%', height: '100%'}}
                    defaultCenter={coordinates}
                    defaultZoom={19}
                    mapTypeId="hybrid"
                    gestureHandling={'cooperative'} 
                    disableDefaultUI={false} 
                  />
                </APIProvider>
                
                <div className="absolute bottom-2 left-2 bg-white/80 text-slate-800 text-[10px] px-2 py-1 rounded font-bold flex items-center gap-1">
                  <MousePointer2 size={10}/> Interactive: Drag & Zoom
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input label="Lat" value={coordinates.lat} onChange={(e) => setCoordinates({...coordinates, lat: Number(e.target.value)})} />
                <Input label="Lng" value={coordinates.lng} onChange={(e) => setCoordinates({...coordinates, lng: Number(e.target.value)})} />
              </div>
              
              <Button onClick={handleSolarLookup} disabled={fetchingSolar} className="w-full flex items-center justify-center gap-2 shadow-lg bg-orange-600 hover:bg-orange-700">
                {fetchingSolar ? 'Fetching...' : <><RefreshCw size={16}/> UPDATE SOLAR DATA</>}
              </Button>

              <div className="mt-4 pt-4 border-t border-slate-200">
                 <div className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-700">
                    <Edit3 size={16}/> 
                    <span>Calculation Inputs:</span>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Roof Area (m²)</label>
                      <input 
                        type="number" 
                        value={inputs.manualRoofArea} 
                        onChange={(e) => setInputs({...inputs, manualRoofArea: +e.target.value})}
                        className="w-full p-2 border border-slate-300 rounded text-slate-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Sun Hours/Day</label>
                      <input 
                        type="number" 
                        value={inputs.manualSunHours} 
                        onChange={(e) => setInputs({...inputs, manualSunHours: +e.target.value})}
                        className="w-full p-2 border border-slate-300 rounded text-slate-900 font-bold bg-yellow-50"
                      />
                    </div>
                  </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-6 rounded-xl border-2 ${analysis.planAFits ? 'border-red-200 bg-red-50' : 'border-red-500 bg-red-100'}`}>
              <div className="flex justify-between mb-4">
                <h3 className="font-bold text-slate-700">Scenario A: Status Quo</h3>
                <span className="bg-white text-red-600 px-2 py-1 rounded text-xs font-bold border border-red-200">Solar Only</span>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-slate-500 font-bold">Required Peak Inverter</p>
                  <p className="text-2xl font-bold text-red-600">{analysis.peakLoad_A.toFixed(1)} kW</p>
                </div>
                <div className="pt-4 border-t border-red-200">
                  <p className="text-xs uppercase text-slate-500 font-bold">Required Solviva Plan</p>
                  <p className="text-lg font-bold text-slate-800">{analysis.planA?.name || 'N/A'}</p>
                  {!analysis.planAFits && (
                    <div className="mt-2 flex items-start gap-2 text-red-700 bg-white p-2 rounded text-xs border border-red-300">
                      <AlertTriangle size={14}/>
                      <strong>Roof Fail:</strong> Needs {analysis.planA?.kW_Cooling_Nominal}kW, roof fits {analysis.maxKwp.toFixed(1)}kW.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl border-2 border-green-500 bg-green-50">
              <div className="flex justify-between mb-4">
                <h3 className="font-bold text-green-800">Scenario B: Partner Model</h3>
                <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">Solviva + Karnot</span>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-green-700 font-bold">Optimized Peak Load</p>
                  <p className="text-2xl font-bold text-green-700">{analysis.peakLoad_B.toFixed(1)} kW</p>
                  <p className="text-xs text-green-600"><ArrowRight size={12} className="inline"/> Downsized by {analysis.inverterSaved} kW</p>
                </div>
                <div className="pt-4 border-t border-green-200">
                  <p className="text-xs uppercase text-green-700 font-bold">Required Solviva Plan</p>
                  <p className="text-lg font-bold text-green-900">{analysis.planB?.name}</p>
                  <p className="text-xs text-green-700">Fits easily on roof</p>
                </div>
              </div>
            </div>
          </div>

          {/* NEW FINANCIAL SUMMARY: Includes Solar Generation */}
          <div className="bg-slate-900 text-white p-8 rounded-xl shadow-lg">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Financial Impact Analysis</h3>
            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <p className="text-sm text-slate-400 mb-1">Hardware Savings</p>
                <p className="text-2xl font-bold text-white">₱{analysis.monthlyAdvantage.toLocaleString()} <span className="text-sm text-slate-500">/mo</span></p>
              </div>
              <div className="text-center pb-2">
                 <div className="text-sm text-slate-400 mb-1">Solar Electricity Value</div>
                 <div className="text-xl font-bold text-yellow-400">
                    ₱{analysis.monthlyBillSavingsB.toLocaleString()} /mo
                 </div>
                 <div className="text-[10px] text-slate-500">
                    ({analysis.monthlyGenB_kWh.toFixed(0)} kWh @ ₱{inputs.electricityRate})
                 </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400 mb-1">Total 5-Yr Benefit</p>
                <p className="text-3xl font-bold text-green-400">₱{analysis.fiveYearSavings.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-700 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold">Change Sun Hours to see impact</p>
              </div>
              <Button onClick={generatePDFReport} className="bg-orange-600 hover:bg-orange-700 text-white border-none">
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
