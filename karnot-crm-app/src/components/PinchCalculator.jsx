import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Button } from '../data/constants.jsx';
import {
    ArrowLeft, Flame, Snowflake, Thermometer, Download,
    TrendingUp, TrendingDown, DollarSign, Leaf, Target,
    ChevronDown, ChevronUp, Plus, Trash2, Zap, RefreshCw,
    Activity, Info, AlertCircle
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
    PINCH_CONFIG, PROCESS_TEMPLATES,
    problemTableAlgorithm, buildCompositeCurves, buildGrandCompositeCurve,
    mergeCompositeCurvesForChart, calculateHeatPumpSizing, calculatePayback,
    findMatchingProduct
} from '../utils/pinchLogic';

// ============================================
// HELPER COMPONENTS
// ============================================

const MetricCard = ({ icon: Icon, label, value, sub, color = 'gray' }) => {
    const colors = {
        red: 'border-red-200 bg-red-50',
        blue: 'border-blue-200 bg-blue-50',
        green: 'border-green-200 bg-green-50',
        orange: 'border-orange-200 bg-orange-50',
        gray: 'border-gray-200 bg-gray-50',
    };
    const iconColors = {
        red: 'text-red-500', blue: 'text-blue-500', green: 'text-green-500',
        orange: 'text-orange-500', gray: 'text-gray-500',
    };
    return (
        <div className={`rounded-xl border p-4 ${colors[color]}`}>
            <div className="flex items-center gap-2 mb-1">
                {Icon && <Icon size={16} className={iconColors[color]} />}
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-2xl font-black text-gray-800">{value}</div>
            {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
        </div>
    );
};

const SectionHeader = ({ title, icon: Icon, children }) => (
    <div className="border-b-2 border-orange-500 pb-2 mb-6 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            {Icon && <Icon size={20} className="text-orange-600" />}
            {title}
        </h3>
        {children}
    </div>
);

const fmt = (n) => {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const fmtCurrency = (n) => {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
};

// ============================================
// MAIN COMPONENT
// ============================================

const PinchCalculator = ({ setActiveView, user }) => {
    const reportRef = useRef(null);

    // Firebase products
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Template
    const [selectedTemplate, setSelectedTemplate] = useState('general_dairy');

    // Process streams
    const [streams, setStreams] = useState(
        PROCESS_TEMPLATES.general_dairy.streams.map(s => ({ ...s }))
    );

    // Operating parameters — USD defaults for US market
    const [params, setParams] = useState({
        dTmin: 10,
        operatingHours: 8000,
        boilerEfficiency: 85,
        chillerCOP: 2.5,
        elecRate: 0.10,
        gasRate: 0.04,
        hpDutyKW: 200,
        hpCOP: 3.5,
        capitalCost: 150000,
    });

    // UI toggles
    const [showGCC, setShowGCC] = useState(false);
    const [showProblemTable, setShowProblemTable] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // ==========================================
    // FIREBASE: Load product inventory
    // ==========================================
    useEffect(() => {
        if (!user) { setLoading(false); return; }
        const unsub = onSnapshot(
            collection(db, "users", user.uid, "products"),
            (snapshot) => {
                setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            () => setLoading(false)
        );
        return () => unsub();
    }, [user]);

    // ==========================================
    // CALCULATIONS (all via useMemo)
    // ==========================================
    const pinchResult = useMemo(() => {
        if (streams.length < 2) return null;
        return problemTableAlgorithm(streams, params.dTmin);
    }, [streams, params.dTmin]);

    const compositeCurves = useMemo(() => {
        if (!pinchResult) return null;
        return buildCompositeCurves(streams, params.dTmin);
    }, [streams, params.dTmin, pinchResult]);

    const chartData = useMemo(() => {
        if (!compositeCurves) return [];
        return mergeCompositeCurvesForChart(compositeCurves.hotCurve, compositeCurves.coldCurve);
    }, [compositeCurves]);

    const gccData = useMemo(() => {
        if (!pinchResult) return [];
        return buildGrandCompositeCurve(streams, params.dTmin);
    }, [streams, params.dTmin, pinchResult]);

    const hpSizing = useMemo(() => {
        if (!pinchResult) return null;
        return calculateHeatPumpSizing(pinchResult, {
            ...params,
            boilerEfficiency: params.boilerEfficiency / 100,
            hpDutyKW: params.hpDutyKW,
        });
    }, [pinchResult, params]);

    const payback = useMemo(() => {
        if (!hpSizing) return null;
        return calculatePayback(hpSizing.annualSavings, params.capitalCost);
    }, [hpSizing, params.capitalCost]);

    const recommendedProduct = useMemo(() => {
        if (!hpSizing || !products.length) return null;
        return findMatchingProduct(products, params.hpDutyKW);
    }, [hpSizing, products, params.hpDutyKW]);

    // Auto-set HP duty to 80% of QH_min when pinch result changes
    useEffect(() => {
        if (pinchResult && pinchResult.qHMin > 0) {
            setParams(prev => ({
                ...prev,
                hpDutyKW: Math.round(pinchResult.qHMin * 0.8)
            }));
        }
    }, [pinchResult?.qHMin]);

    // ==========================================
    // HANDLERS
    // ==========================================
    const handleTemplateChange = (key) => {
        setSelectedTemplate(key);
        setStreams(PROCESS_TEMPLATES[key].streams.map(s => ({ ...s })));
    };

    const addStream = () => {
        setStreams(prev => [...prev, {
            name: `Stream ${prev.length + 1}`,
            supplyTemp: 20, targetTemp: 60, load: 50, type: 'cold'
        }]);
    };

    const updateStream = (index, field, value) => {
        setStreams(prev => prev.map((s, i) =>
            i === index ? { ...s, [field]: (field === 'name' || field === 'type') ? value : parseFloat(value) || 0 } : s
        ));
    };

    const deleteStream = (index) => {
        setStreams(prev => prev.filter((_, i) => i !== index));
    };

    const updateParam = (field, value) => {
        setParams(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    };

    const downloadPDF = () => {
        const el = reportRef.current;
        if (!el || typeof html2pdf === 'undefined') return;
        window.html2pdf().set({
            margin: [8, 8, 8, 8],
            filename: `Pinch_Analysis_${selectedTemplate}_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        }).from(el).save();
    };

    // ==========================================
    // RENDER
    // ==========================================
    const maxDutySlider = pinchResult ? Math.ceil(pinchResult.qHMin * 1.2) : 500;

    return (
        <div className="max-w-7xl mx-auto" ref={reportRef}>
            {/* HEADER */}
            <div className="flex items-center justify-between mb-6">
                <Button onClick={() => setActiveView('calculatorsHub')} variant="secondary">
                    <ArrowLeft size={16} className="mr-1" /> Back to Calculators
                </Button>
                <div className="flex gap-2">
                    <Button onClick={() => setShowHelp(!showHelp)} variant="secondary" className="text-xs">
                        <Info size={14} className="mr-1" /> How It Works
                    </Button>
                    {pinchResult && (
                        <Button onClick={downloadPDF} className="text-xs">
                            <Download size={14} className="mr-1" /> Export PDF
                        </Button>
                    )}
                </div>
            </div>

            <h2 className="text-3xl font-bold text-gray-800 mb-1">Utility Pinch Analysis</h2>
            <p className="text-gray-500 mb-6">
                Cross your heating &amp; cooling utility networks. Identify where a Karnot CO2 heat pump
                eliminates boiler fuel and reduces chiller load simultaneously.
            </p>

            {/* HELP PANEL */}
            {showHelp && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-6 text-sm text-gray-700 space-y-2">
                    <p><strong>What is Utility Pinch Analysis?</strong></p>
                    <p>In a dairy plant, you have processes that need <span className="text-red-600 font-semibold">cooling</span> (raw milk reception, post-pasteurisation) and processes that need <span className="text-blue-600 font-semibold">heating</span> (pasteurisation, CIP). Today, gas boilers provide all the heat and chillers remove all the waste cold.</p>
                    <p>Pinch Analysis reveals the <strong>thermodynamic minimum</strong> utilities required. A centralized heat pump on your utility rings absorbs waste heat from the cooling network and upgrades it to supply the heating network — replacing boiler fuel with recovered energy.</p>
                    <p>The <strong>Composite Curves</strong> chart shows the overlap between your hot and cold process needs. The gap at the top is heating you must buy; the gap at the bottom is cooling you must buy. A heat pump pumps energy across the <strong>Pinch Point</strong> to shrink both gaps.</p>
                    <button onClick={() => setShowHelp(false)} className="text-orange-600 font-bold mt-2 underline">Close</button>
                </div>
            )}

            {/* ============================================ */}
            {/* SECTION 1: TEMPLATE & STREAM TABLE */}
            {/* ============================================ */}
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6">
                <SectionHeader title="1. Process Streams" icon={Activity}>
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-gray-500 uppercase">Template:</label>
                        <select
                            value={selectedTemplate}
                            onChange={(e) => handleTemplateChange(e.target.value)}
                            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                            {Object.entries(PROCESS_TEMPLATES).map(([key, tmpl]) => (
                                <option key={key} value={key}>{tmpl.name}</option>
                            ))}
                        </select>
                    </div>
                </SectionHeader>

                {selectedTemplate !== 'custom' && PROCESS_TEMPLATES[selectedTemplate] && (
                    <p className="text-sm text-gray-500 mb-4 -mt-4 italic">
                        {PROCESS_TEMPLATES[selectedTemplate].description}
                    </p>
                )}

                {/* Stream Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                <th className="text-left pb-3 pr-2">Process Name</th>
                                <th className="text-center pb-3 px-2 w-28">Type</th>
                                <th className="text-center pb-3 px-2 w-24">Supply T (°C)</th>
                                <th className="text-center pb-3 px-2 w-24">Target T (°C)</th>
                                <th className="text-center pb-3 px-2 w-24">Load (kW)</th>
                                <th className="text-center pb-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {streams.map((stream, i) => (
                                <tr key={i} className={`border-t ${stream.type === 'hot' ? 'bg-red-50/50' : 'bg-blue-50/50'}`}>
                                    <td className="py-2 pr-2">
                                        <input
                                            type="text"
                                            value={stream.name}
                                            onChange={(e) => updateStream(i, 'name', e.target.value)}
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </td>
                                    <td className="py-2 px-2">
                                        <select
                                            value={stream.type}
                                            onChange={(e) => updateStream(i, 'type', e.target.value)}
                                            className={`w-full px-2 py-1.5 border rounded-lg text-sm font-semibold ${
                                                stream.type === 'hot'
                                                    ? 'border-red-300 text-red-700 bg-red-50'
                                                    : 'border-blue-300 text-blue-700 bg-blue-50'
                                            }`}
                                        >
                                            <option value="hot">🔴 Cooling</option>
                                            <option value="cold">🔵 Heating</option>
                                        </select>
                                    </td>
                                    <td className="py-2 px-2">
                                        <input
                                            type="number"
                                            value={stream.supplyTemp}
                                            onChange={(e) => updateStream(i, 'supplyTemp', e.target.value)}
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-orange-500"
                                        />
                                    </td>
                                    <td className="py-2 px-2">
                                        <input
                                            type="number"
                                            value={stream.targetTemp}
                                            onChange={(e) => updateStream(i, 'targetTemp', e.target.value)}
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-orange-500"
                                        />
                                    </td>
                                    <td className="py-2 px-2">
                                        <input
                                            type="number"
                                            value={stream.load}
                                            onChange={(e) => updateStream(i, 'load', e.target.value)}
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-orange-500"
                                        />
                                    </td>
                                    <td className="py-2 text-center">
                                        <button
                                            onClick={() => deleteStream(i)}
                                            className="text-red-400 hover:text-red-600 transition-colors p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Button onClick={addStream} variant="secondary" className="mt-4 text-sm">
                    <Plus size={14} className="mr-1" /> Add Stream
                </Button>

                {streams.length > 0 && streams.length < 2 && (
                    <div className="mt-4 flex items-center gap-2 text-amber-600 text-sm">
                        <AlertCircle size={16} /> You need at least one hot and one cold stream.
                    </div>
                )}
            </div>

            {/* ============================================ */}
            {/* SECTION 2: OPERATING ASSUMPTIONS */}
            {/* ============================================ */}
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6">
                <SectionHeader title="2. Operating &amp; Utility Assumptions" icon={Thermometer} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">ΔT min (°C)</label>
                        <input type="number" value={params.dTmin} onChange={(e) => updateParam('dTmin', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Operating Hours/yr</label>
                        <input type="number" value={params.operatingHours} onChange={(e) => updateParam('operatingHours', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Boiler Efficiency (%)</label>
                        <input type="number" value={params.boilerEfficiency} onChange={(e) => updateParam('boilerEfficiency', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Chiller COP</label>
                        <input type="number" step="0.1" value={params.chillerCOP} onChange={(e) => updateParam('chillerCOP', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Gas Rate ($/kWh)</label>
                        <input type="number" step="0.001" value={params.gasRate} onChange={(e) => updateParam('gasRate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Electricity Rate ($/kWh)</label>
                        <input type="number" step="0.001" value={params.elecRate} onChange={(e) => updateParam('elecRate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                    </div>
                </div>
            </div>

            {/* ============================================ */}
            {/* SECTION 3: PINCH RESULTS METRICS */}
            {/* ============================================ */}
            {pinchResult && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <MetricCard
                        icon={Flame}
                        label="Min. Heating Utility (QH)"
                        value={`${fmt(pinchResult.qHMin)} kW`}
                        sub="Gas boiler must supply this"
                        color="red"
                    />
                    <MetricCard
                        icon={Snowflake}
                        label="Min. Cooling Utility (QC)"
                        value={`${fmt(pinchResult.qCMin)} kW`}
                        sub="Chiller must remove this"
                        color="blue"
                    />
                    <MetricCard
                        icon={RefreshCw}
                        label="Max Heat Recovery"
                        value={`${fmt(pinchResult.maxRecovery)} kW`}
                        sub="Energy you can reclaim"
                        color="green"
                    />
                    <MetricCard
                        icon={Target}
                        label="Pinch Point"
                        value={`${pinchResult.pinchTempHot.toFixed(0)}°C / ${pinchResult.pinchTempCold.toFixed(0)}°C`}
                        sub="Hot side / Cold side"
                        color="orange"
                    />
                </div>
            )}

            {/* ============================================ */}
            {/* SECTION 4: COMPOSITE CURVES CHART */}
            {/* ============================================ */}
            {chartData.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6">
                    <SectionHeader title="3. Composite Curves" icon={Activity}>
                        <span className="text-xs text-gray-400">Hot = Heat available | Cold = Heat required</span>
                    </SectionHeader>

                    <ResponsiveContainer width="100%" height={420}>
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="Q"
                                type="number"
                                label={{ value: 'Heat Load (kW)', position: 'insideBottom', offset: -15, style: { fontSize: 13, fill: '#6b7280' } }}
                                tick={{ fontSize: 11 }}
                            />
                            <YAxis
                                label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft', offset: 5, style: { fontSize: 13, fill: '#6b7280' } }}
                                tick={{ fontSize: 11 }}
                            />
                            <Tooltip
                                formatter={(val, name) => [val !== null ? `${val.toFixed(1)} °C` : '—', name]}
                                labelFormatter={(val) => `${val.toFixed(0)} kW`}
                                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                            <Line
                                dataKey="hotT"
                                name="Hot Composite (Heat Sources)"
                                stroke="#ef4444"
                                strokeWidth={3}
                                dot={false}
                                connectNulls={false}
                            />
                            <Line
                                dataKey="coldT"
                                name="Cold Composite (Heat Demands)"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                dot={false}
                                connectNulls={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
                        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                            <div className="font-bold text-red-700">QH min = {fmt(pinchResult?.qHMin)} kW</div>
                            <div className="text-gray-500 mt-1">Gap at top = heating utility needed</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                            <div className="font-bold text-green-700">Overlap = {fmt(pinchResult?.maxRecovery)} kW</div>
                            <div className="text-gray-500 mt-1">This heat is already being exchanged</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <div className="font-bold text-blue-700">QC min = {fmt(pinchResult?.qCMin)} kW</div>
                            <div className="text-gray-500 mt-1">Gap at bottom = cooling utility needed</div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* SECTION 5: GRAND COMPOSITE CURVE (toggle) */}
            {/* ============================================ */}
            {gccData.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6">
                    <button
                        onClick={() => setShowGCC(!showGCC)}
                        className="w-full flex items-center justify-between text-left"
                    >
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Activity size={20} className="text-orange-600" />
                            Grand Composite Curve
                        </h3>
                        {showGCC ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    {showGCC && (
                        <div className="mt-4">
                            <p className="text-sm text-gray-500 mb-4">
                                The GCC shows the <strong>net</strong> heat flow at each temperature level.
                                The &quot;pocket&quot; is where process-to-process heat exchange happens naturally.
                                The &quot;nose&quot; at the pinch shows where QH and QC are needed.
                            </p>
                            <ResponsiveContainer width="100%" height={380}>
                                <LineChart data={gccData} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="Q"
                                        type="number"
                                        label={{ value: 'Net Heat Flow (kW)', position: 'insideBottom', offset: -15, style: { fontSize: 13, fill: '#6b7280' } }}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <YAxis
                                        dataKey="T"
                                        type="number"
                                        label={{ value: 'Shifted Temperature (°C)', angle: -90, position: 'insideLeft', offset: 5, style: { fontSize: 13, fill: '#6b7280' } }}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <Tooltip
                                        formatter={(val) => [`${val.toFixed(1)}`, '']}
                                        labelFormatter={(val) => `Q = ${val.toFixed(0)} kW`}
                                        contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                    />
                                    <Line
                                        dataKey="T"
                                        stroke="#f97316"
                                        strokeWidth={3}
                                        dot={{ r: 3, fill: '#f97316' }}
                                        name="Grand Composite"
                                    />
                                    <ReferenceLine
                                        y={pinchResult?.pinchTempShifted}
                                        stroke="#ef4444"
                                        strokeDasharray="5 5"
                                        label={{ value: 'Pinch', position: 'right', fill: '#ef4444', fontSize: 12 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {/* ============================================ */}
            {/* SECTION 6: HEAT PUMP SIZING */}
            {/* ============================================ */}
            {pinchResult && (
                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6">
                    <SectionHeader title="4. Karnot CO2 Heat Pump Sizing" icon={Zap} />

                    <p className="text-sm text-gray-500 mb-6 -mt-4">
                        The heat pump evaporator sits on the <span className="text-blue-600 font-semibold">cooling network</span> and
                        the condenser supplies the <span className="text-red-600 font-semibold">heating network</span>,
                        pumping energy across the pinch point.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Heat Pump Condenser Duty: <span className="text-orange-600 text-lg">{fmt(params.hpDutyKW)} kW</span>
                            </label>
                            <input
                                type="range"
                                min={10}
                                max={maxDutySlider}
                                step={5}
                                value={params.hpDutyKW}
                                onChange={(e) => updateParam('hpDutyKW', e.target.value)}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>10 kW</span>
                                <span className="text-orange-600 font-bold">QH min = {fmt(pinchResult.qHMin)} kW</span>
                                <span>{fmt(maxDutySlider)} kW</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Heat Pump COP</label>
                                <input type="number" step="0.1" value={params.hpCOP}
                                    onChange={(e) => updateParam('hpCOP', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Capital Cost ($)</label>
                                <input type="number" step="1000" value={params.capitalCost}
                                    onChange={(e) => updateParam('capitalCost', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                            </div>
                        </div>
                    </div>

                    {/* HP Operating Envelope */}
                    {hpSizing && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                            <MetricCard icon={Snowflake} label="Source Temp (Evaporator)" value={`${hpSizing.sourceTemp.toFixed(0)}°C`} color="blue" />
                            <MetricCard icon={Flame} label="Sink Temp (Condenser)" value={`${hpSizing.sinkTemp.toFixed(0)}°C`} color="red" />
                            <MetricCard icon={Thermometer} label="Temperature Lift" value={`${hpSizing.temperatureLift.toFixed(0)}°C`} color="orange" />
                            <MetricCard icon={Zap} label="Compressor Input" value={`${fmt(hpSizing.hpElecInput)} kW`} sub={`Evaporator: ${fmt(hpSizing.evapDuty)} kW`} color="gray" />
                        </div>
                    )}
                </div>
            )}

            {/* ============================================ */}
            {/* SECTION 7: SAVINGS REPORT */}
            {/* ============================================ */}
            {hpSizing && (
                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6">
                    <SectionHeader title="5. Annual Savings Report" icon={DollarSign} />

                    {/* Big number hero metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <MetricCard
                            icon={DollarSign}
                            label="Annual Savings"
                            value={fmtCurrency(hpSizing.annualSavings)}
                            color="green"
                        />
                        <MetricCard
                            icon={TrendingDown}
                            label="Cost Reduction"
                            value={`${hpSizing.savingsPercent}%`}
                            color="green"
                        />
                        <MetricCard
                            icon={Leaf}
                            label="CO2 Reduction"
                            value={`${hpSizing.co2Reduction} t/yr`}
                            color="green"
                        />
                        <MetricCard
                            icon={TrendingUp}
                            label="Simple Payback"
                            value={payback ? `${payback} yrs` : '—'}
                            sub={params.capitalCost > 0 ? `On ${fmtCurrency(params.capitalCost)} CAPEX` : ''}
                            color="orange"
                        />
                    </div>

                    {/* Cost comparison table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b-2 border-gray-200">
                                    <th className="text-left pb-3 pr-4">Cost Item</th>
                                    <th className="text-right pb-3 px-4">Baseline (No HP)</th>
                                    <th className="text-right pb-3 px-4">With Karnot HP</th>
                                    <th className="text-right pb-3 pl-4">Saving</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 pr-4 flex items-center gap-2"><Flame size={14} className="text-red-500" /> Heating (Gas Boiler)</td>
                                    <td className="text-right py-3 px-4">{fmtCurrency(hpSizing.baseHeatingCost)}</td>
                                    <td className="text-right py-3 px-4">{fmtCurrency(hpSizing.newHeatingCost)}</td>
                                    <td className="text-right py-3 pl-4 text-green-600 font-semibold">{fmtCurrency(hpSizing.baseHeatingCost - hpSizing.newHeatingCost)}</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 pr-4 flex items-center gap-2"><Snowflake size={14} className="text-blue-500" /> Cooling (Chiller)</td>
                                    <td className="text-right py-3 px-4">{fmtCurrency(hpSizing.baseCoolingCost)}</td>
                                    <td className="text-right py-3 px-4">{fmtCurrency(hpSizing.newCoolingCost)}</td>
                                    <td className="text-right py-3 pl-4 text-green-600 font-semibold">{fmtCurrency(hpSizing.baseCoolingCost - hpSizing.newCoolingCost)}</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 pr-4 flex items-center gap-2"><Zap size={14} className="text-purple-500" /> Heat Pump Electricity</td>
                                    <td className="text-right py-3 px-4 text-gray-400">—</td>
                                    <td className="text-right py-3 px-4 text-red-600">{fmtCurrency(hpSizing.hpRunningCost)}</td>
                                    <td className="text-right py-3 pl-4 text-red-600">({fmtCurrency(hpSizing.hpRunningCost)})</td>
                                </tr>
                                <tr className="font-bold text-base border-t-2 border-gray-300">
                                    <td className="py-3 pr-4">TOTAL Annual Cost</td>
                                    <td className="text-right py-3 px-4">{fmtCurrency(hpSizing.baseTotalCost)}</td>
                                    <td className="text-right py-3 px-4">{fmtCurrency(hpSizing.newTotalCost)}</td>
                                    <td className="text-right py-3 pl-4 text-green-600">{fmtCurrency(hpSizing.annualSavings)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* CO2 comparison */}
                    <div className="mt-6 grid grid-cols-3 gap-4 bg-gray-50 rounded-xl p-4">
                        <div className="text-center">
                            <div className="text-xs font-bold text-gray-500 uppercase">Baseline CO2</div>
                            <div className="text-xl font-black text-gray-700">{hpSizing.baseCO2} t/yr</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs font-bold text-gray-500 uppercase">With Heat Pump</div>
                            <div className="text-xl font-black text-gray-700">{hpSizing.newCO2} t/yr</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs font-bold text-green-600 uppercase">CO2 Saved</div>
                            <div className="text-xl font-black text-green-600">{hpSizing.co2Reduction} t/yr</div>
                        </div>
                    </div>

                    {/* Karnot Product Recommendation */}
                    {recommendedProduct && (
                        <div className="mt-6 p-5 bg-orange-50 border-2 border-orange-200 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                                    <Zap size={16} className="text-white" />
                                </div>
                                <h4 className="font-bold text-orange-800 text-lg">Recommended Karnot Product</h4>
                            </div>
                            <p className="text-xl font-black text-gray-800">{recommendedProduct.name}</p>
                            {recommendedProduct.quantity > 1 && (
                                <p className="text-sm text-orange-700 font-semibold mt-1">
                                    Quantity: {recommendedProduct.quantity} units ({fmt(recommendedProduct.totalCapacity)} kW total)
                                </p>
                            )}
                            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                                <div className="bg-white rounded-lg p-2 text-center">
                                    <div className="text-xs text-gray-500">Refrigerant</div>
                                    <div className="font-bold">CO2 (R-744)</div>
                                </div>
                                <div className="bg-white rounded-lg p-2 text-center">
                                    <div className="text-xs text-gray-500">Source → Sink</div>
                                    <div className="font-bold">{hpSizing.sourceTemp.toFixed(0)}°C → {hpSizing.sinkTemp.toFixed(0)}°C</div>
                                </div>
                                <div className="bg-white rounded-lg p-2 text-center">
                                    <div className="text-xs text-gray-500">Temp Lift</div>
                                    <div className="font-bold">{hpSizing.temperatureLift.toFixed(0)}°C</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!recommendedProduct && products.length === 0 && !loading && (
                        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 flex items-center gap-2">
                            <AlertCircle size={16} />
                            No Karnot heat pump products found in your inventory. Add products to get automatic recommendations.
                        </div>
                    )}
                </div>
            )}

            {/* ============================================ */}
            {/* PROBLEM TABLE (advanced toggle) */}
            {/* ============================================ */}
            {pinchResult && (
                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6">
                    <button
                        onClick={() => setShowProblemTable(!showProblemTable)}
                        className="w-full flex items-center justify-between text-left"
                    >
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Info size={20} className="text-gray-400" />
                            Problem Table (Advanced)
                        </h3>
                        {showProblemTable ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    {showProblemTable && (
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b-2 border-gray-200">
                                        <th className="text-left pb-2">#</th>
                                        <th className="text-right pb-2">T High (°C)</th>
                                        <th className="text-right pb-2">T Low (°C)</th>
                                        <th className="text-right pb-2">ΔT (°C)</th>
                                        <th className="text-right pb-2">ΣCP Hot</th>
                                        <th className="text-right pb-2">ΣCP Cold</th>
                                        <th className="text-right pb-2">Net Heat (kW)</th>
                                        <th className="text-right pb-2">Cascade (kW)</th>
                                        <th className="text-right pb-2">Corrected (kW)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pinchResult.intervals.map((iv, i) => (
                                        <tr key={i} className={`border-b border-gray-100 ${
                                            Math.abs(pinchResult.correctedCascade[i + 1]) < 0.01 ? 'bg-orange-50 font-bold' : ''
                                        }`}>
                                            <td className="py-1.5">{i + 1}</td>
                                            <td className="text-right py-1.5">{iv.tHigh.toFixed(1)}</td>
                                            <td className="text-right py-1.5">{iv.tLow.toFixed(1)}</td>
                                            <td className="text-right py-1.5">{iv.dT.toFixed(1)}</td>
                                            <td className="text-right py-1.5 text-red-600">{iv.hotCP.toFixed(2)}</td>
                                            <td className="text-right py-1.5 text-blue-600">{iv.coldCP.toFixed(2)}</td>
                                            <td className={`text-right py-1.5 font-semibold ${iv.netHeat >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                                {iv.netHeat.toFixed(1)}
                                            </td>
                                            <td className="text-right py-1.5">{pinchResult.cascade[i + 1].toFixed(1)}</td>
                                            <td className="text-right py-1.5 font-semibold">{pinchResult.correctedCascade[i + 1].toFixed(1)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* FOOTER */}
            <div className="text-center text-xs text-gray-400 mt-8 mb-4">
                Calculations based on Pinch Analysis principles (Linnhoff & Hindmarsh, 1983).
                Utility integration approach for simultaneous heating &amp; cooling via CO2 heat pump.
            </div>
        </div>
    );
};

export default PinchCalculator;
