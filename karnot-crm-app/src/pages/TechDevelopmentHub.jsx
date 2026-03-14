import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../data/constants.jsx';
import {
    Cpu, Zap, Thermometer, Snowflake, FileText, Shield, CheckCircle,
    ChevronDown, ChevronUp, Plus, Trash2, Save, ClipboardList, Check,
    Layers, GitBranch, MessageSquare, Download, FolderOpen, Activity,
    Package, DollarSign, Target, BookOpen, Lock, Globe
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

const PRODUCT_LINES = [
    {
        id: 'iflx', name: 'iFLX', subtitle: 'CO2 Heat Pump Platform',
        description: 'Transcritical CO2 (R-744) heat pump platform. The core modular chassis powering both iHEAT and iCOOL product families. Natural refrigerant, zero ODP, GWP of 1.',
        icon: Cpu, color: 'blue', bgGradient: 'from-blue-600 to-cyan-500', status: 'active_development', timeline: '18 months',
        keySpecs: [
            { label: 'Refrigerant', value: 'R-744 (CO2)', note: 'GWP = 1' },
            { label: 'Cycle', value: 'Transcritical', note: 'COP 3.5-5.0' },
            { label: 'Capacity Range', value: '5kW - 500kW', note: 'Modular scaling' },
            { label: 'Operating Pressure', value: '45-130 bar', note: 'High-side transcritical' },
            { label: 'Gas Cooler Approach', value: '<3K target', note: 'Critical for COP' },
            { label: 'Compressor', value: 'Semi-hermetic scroll/reciprocating', note: 'CO2 rated' },
        ],
        phases: [
            { phase: 'P1: Concept & Simulation', status: 'completed', duration: '3 months', tasks: ['Thermodynamic cycle modeling', 'Component selection matrix', 'COP optimization simulations', 'Refrigerant charge calculations'] },
            { phase: 'P2: Prototype Design', status: 'in_progress', duration: '4 months', tasks: ['CAD design - chassis & piping', 'PCB design - controller board', 'BOM finalization', 'Safety analysis (PED/ASME)'] },
            { phase: 'P3: Build & Lab Test', status: 'pending', duration: '4 months', tasks: ['Prototype assembly', 'Pressure testing (150 bar)', 'Performance mapping', 'Endurance testing (5000 hrs)'] },
            { phase: 'P4: Certification', status: 'pending', duration: '4 months', tasks: ['CE marking', 'IEC 60335-2-40', 'EN 378 (refrigeration safety)', 'Philippine BPS/ICC certification'] },
            { phase: 'P5: Production Prep', status: 'pending', duration: '3 months', tasks: ['Manufacturing partner selection', 'Assembly procedures', 'QC protocols', 'First article inspection'] },
        ],
        challenges: [
            { challenge: 'High-pressure CO2 system design (130 bar)', priority: 'CRITICAL', status: 'active' },
            { challenge: 'Gas cooler optimization for tropical ambient (35-42C)', priority: 'CRITICAL', status: 'active' },
            { challenge: 'Oil management in transcritical cycle', priority: 'HIGH', status: 'research' },
            { challenge: 'Controller logic for transcritical/subcritical switchover', priority: 'HIGH', status: 'research' },
            { challenge: 'Cost reduction vs HFC equivalent systems', priority: 'MEDIUM', status: 'pending' },
        ],
    },
    {
        id: 'iheat', name: 'iHEAT + iFLX', subtitle: 'CO2 Heat Pumps (Arctic Series)',
        description: 'Hot water and space heating using CO2 transcritical cycle. Ideal for DHW at 60-90C without backup heater. Arctic branding for cold-climate variants.',
        icon: Thermometer, color: 'orange', bgGradient: 'from-orange-500 to-red-500', status: 'concept', timeline: '18 months (after iFLX)',
        keySpecs: [
            { label: 'DHW Output', value: '60-90C', note: 'No backup heater needed' },
            { label: 'Heating COP', value: '3.5-4.5', note: 'At 35C ambient / 65C water' },
            { label: 'Hot Water Flow', value: '500-5000 L/hr', note: 'Commercial scale' },
            { label: 'Ambient Range', value: '-25C to +43C', note: 'Arctic rated' },
            { label: 'Applications', value: 'Hotels, hospitals, process heat', note: 'High-temp DHW' },
            { label: 'CO2 Advantage', value: 'Temperature glide matching', note: 'Perfect for DHW' },
        ],
        phases: [
            { phase: 'P1: Product Definition', status: 'in_progress', duration: '2 months', tasks: ['Market sizing (ASEAN hotel DHW)', 'Competitor analysis (Sanden, MHI)', 'Target cost/performance specs', 'Application engineering guide'] },
            { phase: 'P2: iFLX Integration', status: 'pending', duration: '3 months', tasks: ['Adapt iFLX platform for heating mode', 'DHW-specific gas cooler design', 'Storage tank interface design', 'Legionella prevention (>60C)'] },
            { phase: 'P3: Prototype & Test', status: 'pending', duration: '4 months', tasks: ['Build heating prototype', 'DHW performance mapping', 'COP verification at operating points', 'Tropical + cold climate testing'] },
            { phase: 'P4: Arctic Variant', status: 'pending', duration: '3 months', tasks: ['Low-ambient modifications (-25C)', 'Defrost strategy optimization', 'Cold-start performance', 'Arctic branding & packaging'] },
            { phase: 'P5: Certification & Launch', status: 'pending', duration: '3 months', tasks: ['EN 16147 (DHW heat pumps)', 'ErP/ELD compliance', 'Installer training program', 'Launch in PH/ASEAN/UK markets'] },
        ],
        challenges: [
            { challenge: 'Optimize gas cooler for DHW temperature glide (10C to 65C)', priority: 'CRITICAL', status: 'research' },
            { challenge: 'Maintain COP >3.5 at tropical ambient (40C+)', priority: 'HIGH', status: 'pending' },
            { challenge: 'Legionella-safe DHW without electric backup', priority: 'HIGH', status: 'research' },
            { challenge: 'Arctic variant defrost at -25C without COP collapse', priority: 'MEDIUM', status: 'pending' },
        ],
    },
    {
        id: 'icool', name: 'iCOOL + iFLX', subtitle: 'CO2 Condenser Units (ColdChain Series)',
        description: 'Refrigeration and cold chain using CO2 as primary refrigerant. Cascade and transcritical systems for cold rooms, blast freezers, and commercial refrigeration.',
        icon: Snowflake, color: 'cyan', bgGradient: 'from-cyan-500 to-blue-600', status: 'concept', timeline: '18 months (parallel with iHEAT)',
        keySpecs: [
            { label: 'Evaporating Temp', value: '-40C to +5C', note: 'Cold rooms to freezers' },
            { label: 'Cooling COP', value: '2.5-4.0', note: 'Depending on evap temp' },
            { label: 'System Types', value: 'Transcritical / Cascade', note: 'CO2/CO2 or CO2/HFC' },
            { label: 'Applications', value: 'Cold rooms, blast freeze, display', note: 'Full cold chain' },
            { label: 'Capacity', value: '10kW - 200kW', note: 'Commercial scale' },
            { label: 'Advantage', value: 'No HFC phase-down risk', note: 'Future-proof' },
        ],
        phases: [
            { phase: 'P1: Market & Architecture', status: 'in_progress', duration: '2 months', tasks: ['PH cold chain market analysis', 'Supermarket/cold storage sizing', 'Cascade vs booster architecture', 'Target cost vs Bitzer/Carrier'] },
            { phase: 'P2: iFLX Cooling Adaptation', status: 'pending', duration: '4 months', tasks: ['Low-temp evaporator design', 'Cascade heat exchanger (if CO2/HFC)', 'Defrost system design', 'Oil return at low evap temps'] },
            { phase: 'P3: Prototype & Test', status: 'pending', duration: '4 months', tasks: ['Build cold room test rig', 'Performance at -35C evaporating', 'Pull-down time verification', 'Energy consumption vs HFC baseline'] },
            { phase: 'P4: Cold Chain Packaging', status: 'pending', duration: '3 months', tasks: ['Condensing unit packaging', 'Pre-charged line sets', 'Controller with remote monitoring', 'ColdChain branding'] },
            { phase: 'P5: Certification & Launch', status: 'pending', duration: '3 months', tasks: ['EN 13215 (condensing units)', 'ASHRAE 15 compliance', 'Philippine cold chain standards', 'Distributor/installer network'] },
        ],
        challenges: [
            { challenge: 'Oil return management at -35C evaporating temperature', priority: 'CRITICAL', status: 'pending' },
            { challenge: 'Cascade vs booster architecture cost/performance trade-off', priority: 'CRITICAL', status: 'research' },
            { challenge: 'Defrost strategy without product temperature excursion', priority: 'HIGH', status: 'pending' },
            { challenge: 'Tropical ambient (42C) + low evap (-35C) = extreme pressure ratio', priority: 'HIGH', status: 'pending' },
            { challenge: 'Cost parity with R-404A/R-448A systems', priority: 'MEDIUM', status: 'pending' },
        ],
    },
    {
        id: 'isave', name: 'iSAVE', subtitle: 'Smart Energy Management & DR Platform',
        description: 'Full-stack intelligent energy management: iSAVE Gateway Controller (on-site SCADA node), Utterberry wireless sensor mesh, GUDE DR relays, Rubidex blockchain verification, Karnot Control Centre cloud, and Octopus Kraken FLEX API integration. Designed for Philippines 220V/60Hz grid with tropical resilience (IP65, 45°C, 95% RH). From sensor to blockchain to grid.',
        icon: Zap, color: 'green', bgGradient: 'from-green-500 to-emerald-600', status: 'active_development', timeline: '12 months',
        keySpecs: [
            { label: 'Gateway Core', value: 'RPi CM4 + Custom IO', note: 'ARM Cortex-A72, 4GB RAM, 32GB eMMC' },
            { label: 'Field Bus', value: 'Modbus TCP/IP + RTU', note: 'RS485 + Ethernet + SG-Ready relay' },
            { label: 'DR Protocol', value: 'OpenADR 2.0b VEN/VTN', note: 'Meralco RDSP + Kraken FLEX API' },
            { label: 'IoT Comms', value: 'MQTT over TLS 1.3', note: 'EMQX broker, LTE-M primary, WiFi backup' },
            { label: 'Blockchain', value: 'Rubidex 15-min hashes', note: 'SHA-256 signed via ATECC608B' },
            { label: 'Sensors', value: 'Utterberry Sub-GHz Mesh', note: 'Temp, humidity, vibration, CT clamps' },
            { label: 'Metering', value: 'MID Class 1 (±1%)', note: 'Revenue-grade 3-phase CT clamp' },
            { label: 'DR Relays', value: 'GUDE 2314-1 + 2302-1', note: 'HTTP REST, <100ms, per-channel kWh' },
            { label: 'AI/ML', value: 'Prophet + TFLite on-edge', note: 'Demand forecast + anomaly detection' },
            { label: 'Local Resilience', value: '30-day data buffer', note: '128GB SD + 4hr LiFePO4 UPS' },
            { label: 'SG-Ready', value: '4-mode relay interface', note: 'Universal heat pump compatibility' },
            { label: 'Target BOM', value: '<$280 at 200+ units', note: '$60/mo SaaS, 5-year payback' },
        ],
        phases: [
            { phase: 'P1: System Architecture & Design Decisions', status: 'completed', duration: '2 months', tasks: [
                'Define 5-layer architecture (Physical → Gateway → Rubidex → Karnot Cloud → External)',
                'Decision: Work WITH Kraken — asset control layer, not full VPP dispatch',
                'Decision: Modbus TCP/IP as universal field bus, SG-Ready relay fallback',
                'Decision: iSAVE Gateway = on-site SCADA node with 30-day local buffer',
                'Decision: Rubidex = data notary, Karnot = operational DB (TimescaleDB)',
                'Decision: Design for Philippines first (220V 60Hz, brownouts, tropical, cooling)',
                'DR deferral algorithm design with thermal storage capacity modeling',
                'OpenADR 2.0b integration spec (VEN on Gateway, VTN on Cloud)',
                'Equipment compatibility matrix (Daikin, Mitsubishi, Panasonic, Sungrow, BYD)',
            ]},
            { phase: 'P2: Gateway Hardware & Firmware', status: 'in_progress', duration: '4 months', tasks: [
                'RPi CM4 carrier board: 2× isolated RS485, 4-port managed Ethernet switch',
                '4× SG-Ready relay outputs (24VDC/230VAC, 5A potential-free)',
                '8× digital inputs (3.3-24V) + 4× relay outputs (230VAC 10A)',
                '4× analog inputs (4-20mA / 0-10V, 12-bit ADC)',
                'Built-in 3-phase MID energy meter with CT clamp inputs',
                'LTE-M modem (Sierra HL7800 / Quectel EC21) dual-SIM (Globe + Smart)',
                'ATECC608B secure element — Rubidex key pair + TLS certs',
                'IP65 polycarbonate DIN-rail enclosure (12-module, UV-stabilised, SS hardware)',
                '85-264VAC PSU + 10Ah LiFePO4 UPS (4hr brownout resilience)',
                '2.4" colour TFT touchscreen + 4× RGB LEDs + buzzer for on-site HMI',
                'Utterberry Base Station integration via onboard Ethernet LAN',
                'GUDE Expert Net Control integration via LAN (HTTP REST + SNMP)',
            ]},
            { phase: 'P3: Gateway Software & Local Control', status: 'in_progress', duration: '3 months', tasks: [
                'Node-RED: Modbus TCP master + RS485 RTU driver for all field devices',
                'BACnet/IP stack for premium HVAC controllers',
                'SG-Ready 4-mode relay logic (block / normal / solar boost / active on)',
                'GUDE HTTP REST control driver (<100ms relay switching)',
                'Utterberry sensor data ingestion into local MQTT + buffer',
                'Local MQTT broker for inter-process communication',
                'DR Agent: OpenADR VEN client — receive + execute DR signals locally',
                'Solar optimiser logic (PV surplus → thermal battery / BESS charging)',
                'Battery dispatch logic (SoC management, peak shaving, export)',
                'TinyML inference engine for on-edge load prediction',
                'OTA firmware update agent with secure rollback',
                '30-day data buffer with store-and-forward to cloud (QoS 1/2)',
            ]},
            { phase: 'P4: Cloud Platform & Dashboard', status: 'pending', duration: '3 months', tasks: [
                'EMQX MQTT broker (topic: karnot/{site_id}/{device_type}/{device_id}/{datapoint})',
                'TimescaleDB time-series database for energy data',
                'Apache Kafka for high-throughput fleet event streaming',
                'FastAPI + NGINX REST/WebSocket API gateway with OpenAPI docs',
                'React + Recharts + Mapbox GL fleet management dashboard',
                'React Native iOS/Android app via Expo EAS',
                'OpenADR 2.0b VTN server — fleet-wide DR dispatch to Gateways',
                'Rubidex microservice: 15-min read → hash → submit cycle',
                'Grafana + Prometheus + Alertmanager ops monitoring → PagerDuty',
                'Docker + K8s on AWS ap-southeast-1 (Singapore region)',
            ]},
            { phase: 'P5: AI/ML & Carbon Credit Engine', status: 'pending', duration: '3 months', tasks: [
                'Prophet demand forecasting model (24hr load + weather prediction)',
                'scikit-learn anomaly detection for predictive maintenance',
                'TFLite on-device inference (edge AI on Gateway)',
                'Carbon credit pipeline: 30-day baseline → measure → Rubidex hash → Gold Standard',
                'PH Grid Emission Factor (0.6 kgCO2/kWh) — DOE verified',
                'Smart contract: revenue auto-distribute (70% owner / 15% Karnot / 15% ops)',
                'Kraken FLEX API integration (push DR capacity every 30 min, receive webhooks)',
                'Apache Airflow batch workflows (carbon calcs, monthly ISO 50001 reports)',
                'Xpansiv / AirCarbon voluntary market integration for credit trading',
                'Occupancy pattern learning for optimal pre-conditioning schedules',
            ]},
            { phase: 'P6: Pilot Deployment & Certification', status: 'pending', duration: '3 months', tasks: [
                'Identify PH pilot site — commercial building Manila/Cebu, >50kW, willing reference',
                'Contact Meralco RDSP for DR program enrolment',
                '3-site pilot installation with full iSAVE stack',
                'Performance verification vs weather-normalised 30-day baseline',
                'NTC Type Approval for LTE modem (engage Bureau Veritas PH)',
                'CE + FCC + IEC 62368-1 + NTC certification',
                'Partner MOUs: Utterberry + Rubidex (integration, co-marketing, revenue share)',
                'Contact Octopus Kraken re FLEX licensing for PH/SE Asia',
                'Philippine ERC grid operator coordination',
                'Installer training program + field service documentation',
            ]},
        ],
        challenges: [
            { challenge: 'Utterberry Base Station: confirm local MQTT/HTTP output to Gateway LAN — critical for brownout resilience', priority: 'CRITICAL', status: 'active' },
            { challenge: 'DR deferral without comfort compromise — temperature drift limits during 2-4hr utility block events', priority: 'CRITICAL', status: 'active' },
            { challenge: 'Rubidex API: get partner access, confirm REST endpoint for third-party energy data hashes', priority: 'HIGH', status: 'active' },
            { challenge: 'Reliable LTE-M edge-to-cloud in PH infrastructure (dual-SIM Globe + Smart failover)', priority: 'HIGH', status: 'active' },
            { challenge: 'NTC Philippines type approval for LTE modem (3-6 month timeline)', priority: 'HIGH', status: 'pending' },
            { challenge: 'Gas cooler optimisation for tropical ambient (35-42°C) with SG-Ready mode switching', priority: 'HIGH', status: 'research' },
            { challenge: 'Integration with multiple HVAC OEM protocols (Daikin D3NET, Mitsubishi MELCloud, Panasonic CZ-CAPRA1)', priority: 'MEDIUM', status: 'research' },
            { challenge: 'ML model accuracy with limited training data for PH commercial cooling patterns', priority: 'MEDIUM', status: 'research' },
            { challenge: 'Gateway BOM cost reduction below $280 at 200+ units/yr', priority: 'MEDIUM', status: 'pending' },
            { challenge: 'Octopus Kraken FLEX API licensing/registration for PH/SE Asia market', priority: 'MEDIUM', status: 'pending' },
        ],
    },
];

const PATENT_CATEGORIES = [
    { id: 'utility', label: 'Utility Patent', description: 'New process, machine, manufacture, or composition of matter', duration: '20 years from filing' },
    { id: 'design', label: 'Design Patent', description: 'New ornamental design for an article of manufacture', duration: '15 years from grant' },
    { id: 'provisional', label: 'Provisional Application', description: '12-month placeholder to establish priority date', duration: '12 months (must convert)' },
    { id: 'pct', label: 'PCT International', description: 'International patent application via WIPO', duration: '30/31 months to enter national phase' },
    { id: 'trade_secret', label: 'Trade Secret', description: 'Confidential business information (no filing)', duration: 'Indefinite (if kept secret)' },
    { id: 'trademark', label: 'Trademark', description: 'Brand names, logos, slogans', duration: '10 years (renewable)' },
];

const PHASE_COLORS = { completed: 'bg-green-100 text-green-700', in_progress: 'bg-blue-100 text-blue-700', pending: 'bg-gray-100 text-gray-500', blocked: 'bg-red-100 text-red-700' };
const PRIO_COLORS = { CRITICAL: 'bg-red-100 text-red-700', HIGH: 'bg-orange-100 text-orange-700', MEDIUM: 'bg-blue-100 text-blue-700', LOW: 'bg-gray-100 text-gray-500' };
const TASK_STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done'];

const VIEW_TO_TAB = { techHub: 'overview', techRoadmap: 'roadmap', techTasks: 'tasks', techNotes: 'notes', techDocs: 'documents', techPatents: 'patents' };

export default function TechDevelopmentHub({ user, initialView }) {
    const [activeTab, setActiveTab] = useState(VIEW_TO_TAB[initialView] || 'overview');
    const [selectedProduct, setSelectedProduct] = useState('iflx');
    const [expandedPhases, setExpandedPhases] = useState(new Set());
    const [notes, setNotes] = useState([]);
    const [showAddNote, setShowAddNote] = useState(false);
    const [newNote, setNewNote] = useState({ title: '', content: '', product: 'iflx', category: 'general' });
    const [tasks, setTasks] = useState([]);
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '', product: 'iflx', priority: 'MEDIUM', status: 'backlog', assignee: '', dueDate: '' });
    const [documents, setDocuments] = useState([]);
    const [showAddDoc, setShowAddDoc] = useState(false);
    const [newDoc, setNewDoc] = useState({ title: '', description: '', product: 'all', category: 'spec', url: '', visibility: 'owner' });
    const [patents, setPatents] = useState([]);
    const [showAddPatent, setShowAddPatent] = useState(false);
    const [newPatent, setNewPatent] = useState({ title: '', description: '', product: 'iflx', type: 'utility', status: 'idea', priorityDate: '', applicationNumber: '', inventors: '' });

    useEffect(() => {
        if (!user?.uid) return;
        const unsubs = [];
        const listen = (col, setter) => unsubs.push(onSnapshot(query(collection(db, "users", user.uid, col), orderBy("createdAt", "desc")), snap => setter(snap.docs.map(d => ({ _id: d.id, ...d.data() })))));
        listen("tech_notes", setNotes);
        listen("tech_tasks", setTasks);
        listen("tech_documents", setDocuments);
        listen("tech_patents", setPatents);
        return () => unsubs.forEach(u => u());
    }, [user?.uid]);

    const save = async (col, data, reset, close) => { if (!user?.uid) return; await addDoc(collection(db, "users", user.uid, col), { ...data, createdBy: user.displayName || user.email, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); reset(); close(); };
    const del = async (col, id, msg) => { if (!user?.uid) return; if (confirm(msg || 'Delete?')) await deleteDoc(doc(db, "users", user.uid, col, id)); };
    const upd = async (col, id, data) => { if (!user?.uid) return; await updateDoc(doc(db, "users", user.uid, col, id), { ...data, updatedAt: serverTimestamp() }); };

    const cur = PRODUCT_LINES.find(p => p.id === selectedProduct) || PRODUCT_LINES[0];
    const filt = (arr, key) => arr.filter(a => a[key || 'product'] === selectedProduct || selectedProduct === 'all' || a[key || 'product'] === 'all');
    const totalPhases = PRODUCT_LINES.reduce((s, p) => s + p.phases.length, 0);
    const donePhases = PRODUCT_LINES.reduce((s, p) => s + p.phases.filter(ph => ph.status === 'completed').length, 0);
    const activePhases = PRODUCT_LINES.reduce((s, p) => s + p.phases.filter(ph => ph.status === 'in_progress').length, 0);

    const TABS = [
        { id: 'overview', label: 'Product Overview', icon: Layers },
        { id: 'roadmap', label: 'Development Roadmap', icon: GitBranch },
        { id: 'tasks', label: 'Engineering Tasks (' + tasks.length + ')', icon: ClipboardList },
        { id: 'notes', label: 'Tech Notes (' + notes.length + ')', icon: MessageSquare },
        { id: 'documents', label: 'Document Vault (' + documents.length + ')', icon: FolderOpen },
        { id: 'patents', label: 'IP & Patents (' + patents.length + ')', icon: Shield },
    ];

    const ProductSelect = ({value, onChange, includeAll}) => (
        <select value={value} onChange={onChange} className="w-full border border-gray-200 rounded-lg p-2 text-xs">
            {includeAll && <option value="all">All Products</option>}
            {PRODUCT_LINES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
    );

    return (
        <div className="space-y-4">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-gray-900 to-blue-900 text-white rounded-2xl p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <Cpu size={28} />
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tight">Karnot Tech Development Hub</h1>
                            <p className="text-sm text-blue-300 font-bold">iFLX | iHEAT (Arctic) | iCOOL (ColdChain) | iSAVE - CO2 Natural Refrigerant Platform</p>
                        </div>
                    </div>
                    <div className="flex gap-4 text-center">
                        <div><div className="text-3xl font-black">{PRODUCT_LINES.length}</div><div className="text-[10px] text-blue-300 font-bold uppercase">Products</div></div>
                        <div><div className="text-3xl font-black text-green-400">{donePhases}/{totalPhases}</div><div className="text-[10px] text-blue-300 font-bold uppercase">Phases</div></div>
                        <div><div className="text-3xl font-black text-yellow-400">{activePhases}</div><div className="text-[10px] text-blue-300 font-bold uppercase">Active</div></div>
                        <div><div className="text-3xl font-black text-purple-400">{patents.length}</div><div className="text-[10px] text-blue-300 font-bold uppercase">IP Records</div></div>
                    </div>
                </div>
            </div>

            {/* PRODUCT SELECTOR */}
            <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSelectedProduct('all')} className={'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold ' + (selectedProduct === 'all' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50')}>
                    <Layers size={14} /> All Products
                </button>
                {PRODUCT_LINES.map(p => {
                    const I = p.icon;
                    return (<button key={p.id} onClick={() => setSelectedProduct(p.id)} className={'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold ' + (selectedProduct === p.id ? 'bg-gradient-to-r ' + p.bgGradient + ' text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50')}>
                        <I size={14} /> {p.name}
                        <span className={'text-[8px] px-1.5 py-0.5 rounded-full ' + (p.status === 'active_development' ? 'bg-white/20' : 'bg-gray-200 text-gray-500')}>{p.status === 'active_development' ? 'ACTIVE' : 'CONCEPT'}</span>
                    </button>);
                })}
            </div>

            {/* TABS */}
            <div className="flex gap-1 flex-wrap">
                {TABS.map(t => (<button key={t.id} onClick={() => setActiveTab(t.id)} className={'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold ' + (activeTab === t.id ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50')}><t.icon size={14} /> {t.label}</button>))}
            </div>

            {/* ====== OVERVIEW ====== */}
            {activeTab === 'overview' && (selectedProduct === 'all' ? PRODUCT_LINES : [cur]).map(product => {
                const I = product.icon;
                const prog = Math.round((product.phases.filter(p => p.status === 'completed').length / product.phases.length) * 100);
                return (
                    <Card key={product.id} className="overflow-hidden">
                        <div className={'bg-gradient-to-r ' + product.bgGradient + ' text-white p-4 -m-4 mb-4'}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3"><I size={24} /><div><h2 className="text-xl font-black">{product.name}</h2><p className="text-sm opacity-80">{product.subtitle}</p></div></div>
                                <div className="text-right">
                                    <div className="text-sm font-bold opacity-80">{product.timeline}</div>
                                    <div className="flex items-center gap-2 mt-1"><div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full" style={{width: prog+'%'}} /></div><span className="text-sm font-black">{prog}%</span></div>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-4">{product.description}</p>
                        <h4 className="font-black text-xs text-gray-500 uppercase mb-2">Key Specifications</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                            {product.keySpecs.map((s, j) => (<div key={j} className="bg-gray-50 rounded-lg p-2"><div className="text-[10px] text-gray-400 font-bold uppercase">{s.label}</div><div className="text-sm font-black text-gray-800">{s.value}</div><div className="text-[10px] text-gray-400">{s.note}</div></div>))}
                        </div>
                        <h4 className="font-black text-xs text-gray-500 uppercase mb-2">Engineering Challenges</h4>
                        <div className="space-y-1.5">
                            {product.challenges.map((c, j) => (<div key={j} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                                <span className={'text-[8px] font-bold px-1.5 py-0.5 rounded-full ' + PRIO_COLORS[c.priority]}>{c.priority}</span>
                                <span className="text-xs text-gray-700 flex-1">{c.challenge}</span>
                                <span className={'text-[8px] font-bold px-1.5 py-0.5 rounded-full ' + (c.status === 'active' ? 'bg-blue-100 text-blue-700' : c.status === 'research' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500')}>{c.status.toUpperCase()}</span>
                            </div>))}
                        </div>
                    </Card>
                );
            })}

            {/* ====== ROADMAP ====== */}
            {activeTab === 'roadmap' && (selectedProduct === 'all' ? PRODUCT_LINES : [cur]).map(product => {
                const I = product.icon;
                return (
                    <Card key={product.id}>
                        <div className="flex items-center gap-2 mb-4"><I size={18} className="text-blue-600" /><h3 className="font-black text-sm text-gray-800">{product.name} - {product.subtitle}</h3></div>
                        <div className="relative">
                            {product.phases.map((phase, i) => {
                                const exp = expandedPhases.has(product.id + '-' + i);
                                return (
                                    <div key={i} className="flex gap-4 mb-3">
                                        <div className="flex flex-col items-center">
                                            <div className={'w-8 h-8 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 border-2 ' + (phase.status === 'completed' ? 'bg-green-500 text-white border-green-500' : phase.status === 'in_progress' ? 'bg-blue-500 text-white border-blue-500 animate-pulse' : 'bg-white text-gray-400 border-gray-300')}>
                                                {phase.status === 'completed' ? <Check size={14} /> : i + 1}
                                            </div>
                                            {i < product.phases.length - 1 && <div className={'w-0.5 flex-1 mt-1 ' + (phase.status === 'completed' ? 'bg-green-300' : 'bg-gray-200')} />}
                                        </div>
                                        <div className="flex-1 mb-2">
                                            <button onClick={() => setExpandedPhases(prev => { const n = new Set(prev); const k = product.id+'-'+i; n.has(k)?n.delete(k):n.add(k); return n; })} className="w-full text-left">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2"><span className="font-black text-sm text-gray-800">{phase.phase}</span><span className={'text-[8px] font-bold px-1.5 py-0.5 rounded-full ' + PHASE_COLORS[phase.status]}>{phase.status.replace('_',' ').toUpperCase()}</span></div>
                                                    <div className="flex items-center gap-2"><span className="text-[10px] text-gray-400">{phase.duration}</span>{exp ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}</div>
                                                </div>
                                            </button>
                                            {exp && <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-100">{phase.tasks.map((t, j) => (<div key={j} className="flex items-center gap-2 text-xs text-gray-600 py-1"><div className={'w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0 ' + (phase.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300')}>{phase.status === 'completed' && <Check size={8} />}</div>{t}</div>))}</div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                );
            })}

            {/* ====== TASKS (KANBAN) ====== */}
            {activeTab === 'tasks' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-sm text-gray-800 uppercase">Engineering Tasks {selectedProduct !== 'all' && ('- ' + cur.name)}</h3>
                        <Button onClick={() => setShowAddTask(!showAddTask)} variant="primary" className="text-xs"><Plus size={12} className="mr-1" /> New Task</Button>
                    </div>
                    {showAddTask && (
                        <Card className="border-2 border-blue-300 bg-blue-50">
                            <h4 className="font-black text-sm text-blue-800 mb-3">New Engineering Task</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Title *</label><Input value={newTask.title} onChange={e => setNewTask(p => ({...p, title: e.target.value}))} placeholder="Design gas cooler" className="text-xs" /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Product</label><ProductSelect value={newTask.product} onChange={e => setNewTask(p => ({...p, product: e.target.value}))} /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Priority</label><select value={newTask.priority} onChange={e => setNewTask(p => ({...p, priority: e.target.value}))} className="w-full border border-gray-200 rounded-lg p-2 text-xs">{['CRITICAL','HIGH','MEDIUM','LOW'].map(p => <option key={p}>{p}</option>)}</select></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Assignee</label><Input value={newTask.assignee} onChange={e => setNewTask(p => ({...p, assignee: e.target.value}))} placeholder="Engineer name" className="text-xs" /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Due Date</label><Input type="date" value={newTask.dueDate} onChange={e => setNewTask(p => ({...p, dueDate: e.target.value}))} className="text-xs" /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Status</label><select value={newTask.status} onChange={e => setNewTask(p => ({...p, status: e.target.value}))} className="w-full border border-gray-200 rounded-lg p-2 text-xs">{TASK_STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ').toUpperCase()}</option>)}</select></div>
                            </div>
                            <div className="mt-3"><label className="text-[10px] font-bold text-gray-500 uppercase">Description</label><textarea className="w-full border border-gray-200 rounded-lg p-2 text-xs h-16" value={newTask.description} onChange={e => setNewTask(p => ({...p, description: e.target.value}))} /></div>
                            <div className="flex gap-2 mt-3">
                                <Button onClick={() => save("tech_tasks", newTask, () => setNewTask({title:'',description:'',product:'iflx',priority:'MEDIUM',status:'backlog',assignee:'',dueDate:''}), () => setShowAddTask(false))} variant="primary" className="text-xs" disabled={!newTask.title}><Save size={12} className="mr-1" /> Save</Button>
                                <Button onClick={() => setShowAddTask(false)} variant="secondary" className="text-xs">Cancel</Button>
                            </div>
                        </Card>
                    )}
                    <div className="grid grid-cols-5 gap-2">
                        {TASK_STATUSES.map(status => {
                            const st = filt(tasks).filter(t => t.status === status);
                            const labels = {backlog:'Backlog',todo:'To Do',in_progress:'In Progress',review:'Review',done:'Done'};
                            const borders = {backlog:'border-gray-300',todo:'border-blue-300',in_progress:'border-yellow-300',review:'border-purple-300',done:'border-green-300'};
                            return (
                                <div key={status} className={'bg-gray-50 rounded-lg p-2 border-t-2 min-h-[200px] ' + borders[status]}>
                                    <div className="flex items-center justify-between mb-2"><h4 className="text-[10px] font-black text-gray-500 uppercase">{labels[status]}</h4><span className="text-[10px] font-bold bg-white rounded-full w-5 h-5 flex items-center justify-center text-gray-500">{st.length}</span></div>
                                    <div className="space-y-1.5">{st.map(task => {
                                        const pl = PRODUCT_LINES.find(p => p.id === task.product);
                                        return (<div key={task._id} className="bg-white rounded-lg p-2 shadow-sm border border-gray-100 hover:shadow-md">
                                            <div className="flex items-start justify-between gap-1"><span className="text-[10px] font-bold text-gray-800 leading-tight">{task.title}</span><button onClick={() => del("tech_tasks",task._id)} className="text-gray-300 hover:text-red-500 flex-shrink-0"><Trash2 size={10} /></button></div>
                                            {task.description && <p className="text-[9px] text-gray-400 mt-1 line-clamp-2">{task.description}</p>}
                                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                                <span className={'text-[7px] font-bold px-1 py-0.5 rounded ' + PRIO_COLORS[task.priority]}>{task.priority}</span>
                                                {pl && <span className="text-[7px] font-bold px-1 py-0.5 rounded bg-blue-50 text-blue-700">{pl.name}</span>}
                                                {task.assignee && <span className="text-[7px] text-gray-400">{task.assignee}</span>}
                                            </div>
                                            <select value={task.status} onChange={e => upd("tech_tasks",task._id,{status:e.target.value})} className="w-full mt-1.5 text-[9px] border border-gray-100 rounded px-1 py-0.5 bg-gray-50">{TASK_STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}</select>
                                        </div>);
                                    })}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ====== TECH NOTES ====== */}
            {activeTab === 'notes' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-sm text-gray-800 uppercase">Engineering Notes {selectedProduct !== 'all' && ('- ' + cur.name)}</h3>
                        <Button onClick={() => setShowAddNote(!showAddNote)} variant="primary" className="text-xs"><Plus size={12} className="mr-1" /> New Note</Button>
                    </div>
                    {showAddNote && (
                        <Card className="border-2 border-purple-300 bg-purple-50">
                            <h4 className="font-black text-sm text-purple-800 mb-3">New Technical Note</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div className="col-span-2 md:col-span-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Title *</label><Input value={newNote.title} onChange={e => setNewNote(p => ({...p, title: e.target.value}))} className="text-xs" /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Product</label><ProductSelect value={newNote.product} onChange={e => setNewNote(p => ({...p, product: e.target.value}))} /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Category</label>
                                    <select value={newNote.category} onChange={e => setNewNote(p => ({...p, category: e.target.value}))} className="w-full border border-gray-200 rounded-lg p-2 text-xs">
                                        <option value="general">General</option><option value="design_decision">Design Decision</option><option value="test_result">Test Result</option>
                                        <option value="problem">Problem</option><option value="solution">Solution</option><option value="research">Research</option>
                                        <option value="meeting">Meeting Notes</option><option value="spec_change">Spec Change</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-3"><label className="text-[10px] font-bold text-gray-500 uppercase">Content</label><textarea className="w-full border border-gray-200 rounded-lg p-2 text-xs h-32 font-mono" value={newNote.content} onChange={e => setNewNote(p => ({...p, content: e.target.value}))} /></div>
                            <div className="flex gap-2 mt-3">
                                <Button onClick={() => save("tech_notes", {...newNote, author: user?.displayName||user?.email}, () => setNewNote({title:'',content:'',product:'iflx',category:'general'}), () => setShowAddNote(false))} variant="primary" className="text-xs" disabled={!newNote.title}><Save size={12} className="mr-1" /> Save</Button>
                                <Button onClick={() => setShowAddNote(false)} variant="secondary" className="text-xs">Cancel</Button>
                            </div>
                        </Card>
                    )}
                    {filt(notes).length > 0 ? filt(notes).map(note => {
                        const cc = {general:'bg-gray-100 text-gray-600',design_decision:'bg-blue-100 text-blue-700',test_result:'bg-green-100 text-green-700',problem:'bg-red-100 text-red-700',solution:'bg-emerald-100 text-emerald-700',research:'bg-purple-100 text-purple-700',meeting:'bg-yellow-100 text-yellow-700',spec_change:'bg-orange-100 text-orange-700'};
                        const pl = PRODUCT_LINES.find(p => p.id === note.product);
                        return (<Card key={note._id}><div className="flex items-start justify-between"><div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap"><span className="font-black text-sm text-gray-800">{note.title}</span><span className={'text-[8px] font-bold px-1.5 py-0.5 rounded-full ' + (cc[note.category]||cc.general)}>{(note.category||'general').replace('_',' ').toUpperCase()}</span>{pl && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{pl.name}</span>}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">By {note.author || note.createdBy} {note.createdAt?.toDate ? ('on ' + note.createdAt.toDate().toLocaleDateString()) : ''}</div>
                            {note.content && <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap font-mono leading-relaxed">{note.content}</div>}
                        </div><button onClick={() => del("tech_notes",note._id)} className="text-gray-300 hover:text-red-500 ml-2"><Trash2 size={12} /></button></div></Card>);
                    }) : <Card className="text-center py-8 text-gray-400"><MessageSquare size={40} className="mx-auto mb-2 opacity-50" /><p className="text-sm font-bold">No technical notes yet</p><p className="text-xs">Add design decisions, test results, research findings</p></Card>}
                </div>
            )}

            {/* ====== DOCUMENT VAULT ====== */}
            {activeTab === 'documents' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-sm text-gray-800 uppercase">Document Vault</h3>
                        <Button onClick={() => setShowAddDoc(!showAddDoc)} variant="primary" className="text-xs"><Plus size={12} className="mr-1" /> Add Document</Button>
                    </div>
                    <Card className="bg-blue-50 border-blue-200"><div className="flex items-start gap-2"><Shield size={14} className="text-blue-600 flex-shrink-0 mt-0.5" /><p className="text-xs text-blue-700"><strong>Visibility Control:</strong> "Owner Only" docs are never shown to external engineers or investors. Use "Engineer" for specs they need, "Investor" for pitch materials.</p></div></Card>
                    {showAddDoc && (
                        <Card className="border-2 border-green-300 bg-green-50">
                            <h4 className="font-black text-sm text-green-800 mb-3">Add Document</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Title *</label><Input value={newDoc.title} onChange={e => setNewDoc(p => ({...p, title: e.target.value}))} className="text-xs" /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Product</label><ProductSelect value={newDoc.product} onChange={e => setNewDoc(p => ({...p, product: e.target.value}))} includeAll /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Category</label>
                                    <select value={newDoc.category} onChange={e => setNewDoc(p => ({...p, category: e.target.value}))} className="w-full border border-gray-200 rounded-lg p-2 text-xs">
                                        <option value="spec">Technical Spec</option><option value="cad">CAD / Drawing</option><option value="datasheet">Datasheet</option>
                                        <option value="test_report">Test Report</option><option value="certification">Certification</option><option value="patent">Patent Doc</option>
                                        <option value="investor">Investor Doc</option><option value="pitch">Pitch Deck</option><option value="whitepaper">Whitepaper / HTML</option>
                                        <option value="bom">Bill of Materials</option><option value="procedure">Procedure / SOP</option><option value="manual">Manual</option><option value="other">Other</option>
                                    </select>
                                </div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">URL / Link</label><Input value={newDoc.url} onChange={e => setNewDoc(p => ({...p, url: e.target.value}))} placeholder="https://drive.google.com/..." className="text-xs" /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Visibility</label>
                                    <select value={newDoc.visibility} onChange={e => setNewDoc(p => ({...p, visibility: e.target.value}))} className="w-full border border-gray-200 rounded-lg p-2 text-xs">
                                        <option value="owner">Owner Only (Private)</option><option value="engineer">Engineers Can View</option><option value="investor">Investors Can View</option><option value="public">All Users</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-3"><label className="text-[10px] font-bold text-gray-500 uppercase">Description</label><textarea className="w-full border border-gray-200 rounded-lg p-2 text-xs h-12" value={newDoc.description} onChange={e => setNewDoc(p => ({...p, description: e.target.value}))} /></div>
                            <div className="flex gap-2 mt-3">
                                <Button onClick={() => save("tech_documents", {...newDoc, uploadedBy: user?.displayName||user?.email}, () => setNewDoc({title:'',description:'',product:'all',category:'spec',url:'',visibility:'owner'}), () => setShowAddDoc(false))} variant="primary" className="text-xs" disabled={!newDoc.title}><Save size={12} className="mr-1" /> Save</Button>
                                <Button onClick={() => setShowAddDoc(false)} variant="secondary" className="text-xs">Cancel</Button>
                            </div>
                        </Card>
                    )}
                    {filt(documents).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {filt(documents).map(d => {
                                const icons = {spec:FileText,cad:Layers,datasheet:BookOpen,test_report:Activity,certification:Shield,patent:Lock,investor:DollarSign,pitch:Target,whitepaper:Globe,bom:Package,procedure:ClipboardList,manual:BookOpen,other:FileText};
                                const DI = icons[d.category] || FileText;
                                const vc = {owner:'bg-red-50 text-red-600 border-red-200',engineer:'bg-blue-50 text-blue-600 border-blue-200',investor:'bg-green-50 text-green-600 border-green-200',public:'bg-gray-50 text-gray-600 border-gray-200'};
                                const pl = PRODUCT_LINES.find(p => p.id === d.product);
                                return (<Card key={d._id} className="hover:shadow-md"><div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"><DI size={18} className="text-gray-500" /></div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap"><span className="font-black text-xs text-gray-800">{d.title}</span><span className={'text-[7px] font-bold px-1.5 py-0.5 rounded-full border ' + (vc[d.visibility]||vc.owner)}>{d.visibility === 'owner' ? 'OWNER ONLY' : d.visibility.toUpperCase()}</span></div>
                                        <div className="flex items-center gap-2 mt-0.5"><span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{(d.category||'other').replace('_',' ')}</span>{pl && <span className="text-[9px] text-gray-400">{pl.name}</span>}</div>
                                        {d.description && <p className="text-[10px] text-gray-500 mt-1">{d.description}</p>}
                                        {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline mt-1 inline-flex items-center gap-1">Open <Download size={10} /></a>}
                                    </div>
                                    <button onClick={() => del("tech_documents",d._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>
                                </div></Card>);
                            })}
                        </div>
                    ) : <Card className="text-center py-8 text-gray-400"><FolderOpen size={40} className="mx-auto mb-2 opacity-50" /><p className="text-sm font-bold">No documents yet</p><p className="text-xs">Add specs, CAD files, datasheets, investor docs, HTML whitepapers</p></Card>}
                </div>
            )}

            {/* ====== IP & PATENTS ====== */}
            {activeTab === 'patents' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-sm text-gray-800 uppercase">IP & Patent Tracker</h3>
                        <Button onClick={() => setShowAddPatent(!showAddPatent)} variant="primary" className="text-xs"><Plus size={12} className="mr-1" /> New IP Record</Button>
                    </div>

                    <Card className="bg-indigo-50 border-indigo-200">
                        <h4 className="font-black text-indigo-800 text-xs mb-2 flex items-center gap-1"><Shield size={14} /> Patent Strategy - CO2 Heat Pump Technology</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-indigo-700">
                            <div><p className="font-bold mb-1">What to Patent:</p><ul className="space-y-0.5 text-[10px]"><li>- Novel gas cooler designs for tropical ambient</li><li>- Controller algorithms: transcritical/subcritical switchover</li><li>- iSAVE DR deferral logic + thermal storage</li><li>- Modular iFLX chassis (utility + design patent)</li><li>- IoT edge controller hardware + firmware</li><li>- Novel defrost strategies for CO2 systems</li></ul></div>
                            <div><p className="font-bold mb-1">Filing Strategy:</p><ul className="space-y-0.5 text-[10px]"><li>1. File <strong>provisional</strong> in PH/UK (12-month priority)</li><li>2. Convert to <strong>PCT</strong> before 12 months</li><li>3. Enter <strong>national phase</strong> PH, UK, ASEAN at 30 months</li><li>4. File <strong>design patents</strong> for unit appearance</li><li>5. Register <strong>trademarks</strong>: iFLX, iSAVE, iHEAT, iCOOL, Arctic, ColdChain</li><li>6. Keep <strong>trade secrets</strong> for manufacturing know-how</li></ul></div>
                        </div>
                        <div className="mt-2 bg-white rounded-lg p-2 border border-indigo-200"><p className="text-[10px] text-indigo-600 font-bold">Costs: Provisional (P50-100K) | Full Utility via PCT (P500K-1.5M) | Trademarks (P15-30K each PH) | Design (P100-200K)</p></div>
                    </Card>

                    <Card><h4 className="font-black text-xs text-gray-600 uppercase mb-2">Trademarks to Register (IPOPHL + UK IPO)</h4>
                        <div className="flex flex-wrap gap-2">{['Karnot','iFLX','iSAVE','iHEAT','iCOOL','iSPA','iMESH','iZONE','iSTOR','iVOLT','Arctic','ColdChain','AquaHero'].map(t => <div key={t} className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-black border border-purple-200">{t}</div>)}</div>
                    </Card>

                    {showAddPatent && (
                        <Card className="border-2 border-indigo-300 bg-indigo-50">
                            <h4 className="font-black text-sm text-indigo-800 mb-3">New IP / Patent Record</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div className="col-span-2 md:col-span-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Title *</label><Input value={newPatent.title} onChange={e => setNewPatent(p => ({...p, title: e.target.value}))} placeholder="Tropical CO2 gas cooler design" className="text-xs" /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Product</label><ProductSelect value={newPatent.product} onChange={e => setNewPatent(p => ({...p, product: e.target.value}))} includeAll /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">IP Type</label><select value={newPatent.type} onChange={e => setNewPatent(p => ({...p, type: e.target.value}))} className="w-full border border-gray-200 rounded-lg p-2 text-xs">{PATENT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Status</label>
                                    <select value={newPatent.status} onChange={e => setNewPatent(p => ({...p, status: e.target.value}))} className="w-full border border-gray-200 rounded-lg p-2 text-xs">
                                        <option value="idea">Idea</option><option value="drafting">Drafting</option><option value="provisional_filed">Provisional Filed</option>
                                        <option value="pct_filed">PCT Filed</option><option value="national_phase">National Phase</option><option value="examination">Examination</option>
                                        <option value="granted">Granted</option><option value="registered">Registered</option><option value="abandoned">Abandoned</option>
                                    </select>
                                </div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Priority Date</label><Input type="date" value={newPatent.priorityDate} onChange={e => setNewPatent(p => ({...p, priorityDate: e.target.value}))} className="text-xs" /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Application #</label><Input value={newPatent.applicationNumber} onChange={e => setNewPatent(p => ({...p, applicationNumber: e.target.value}))} placeholder="PCT/PH/2026/..." className="text-xs" /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Inventors</label><Input value={newPatent.inventors} onChange={e => setNewPatent(p => ({...p, inventors: e.target.value}))} placeholder="Stuart Cox, ..." className="text-xs" /></div>
                            </div>
                            <div className="mt-3"><label className="text-[10px] font-bold text-gray-500 uppercase">Description / Claims</label><textarea className="w-full border border-gray-200 rounded-lg p-2 text-xs h-20" value={newPatent.description} onChange={e => setNewPatent(p => ({...p, description: e.target.value}))} /></div>
                            <div className="flex gap-2 mt-3">
                                <Button onClick={() => save("tech_patents", newPatent, () => setNewPatent({title:'',description:'',product:'iflx',type:'utility',status:'idea',priorityDate:'',applicationNumber:'',inventors:''}), () => setShowAddPatent(false))} variant="primary" className="text-xs" disabled={!newPatent.title}><Save size={12} className="mr-1" /> Save</Button>
                                <Button onClick={() => setShowAddPatent(false)} variant="secondary" className="text-xs">Cancel</Button>
                            </div>
                        </Card>
                    )}

                    {filt(patents).length > 0 ? filt(patents).map(patent => {
                        const ti = PATENT_CATEGORIES.find(c => c.id === patent.type) || PATENT_CATEGORIES[0];
                        const sc = {idea:'bg-gray-100 text-gray-600',drafting:'bg-yellow-100 text-yellow-700',provisional_filed:'bg-blue-100 text-blue-700',pct_filed:'bg-cyan-100 text-cyan-700',national_phase:'bg-purple-100 text-purple-700',examination:'bg-orange-100 text-orange-700',granted:'bg-green-100 text-green-700',registered:'bg-emerald-100 text-emerald-700',abandoned:'bg-red-100 text-red-600'};
                        const pl = PRODUCT_LINES.find(p => p.id === patent.product);
                        return (<Card key={patent._id}><div className="flex items-start justify-between"><div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap"><Shield size={14} className="text-indigo-600" /><span className="font-black text-sm text-gray-800">{patent.title}</span><span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{ti.label}</span><span className={'text-[8px] font-bold px-1.5 py-0.5 rounded-full ' + (sc[patent.status]||sc.idea)}>{(patent.status||'idea').replace('_',' ').toUpperCase()}</span>{pl && <span className="text-[8px] text-gray-400">{pl.name}</span>}</div>
                            <div className="flex gap-3 mt-1 text-[10px] text-gray-400 flex-wrap">{patent.applicationNumber && <span>App#: {patent.applicationNumber}</span>}{patent.priorityDate && <span>Priority: {patent.priorityDate}</span>}{patent.inventors && <span>Inventors: {patent.inventors}</span>}</div>
                            {patent.description && <p className="text-[10px] text-gray-600 mt-1 bg-gray-50 p-2 rounded">{patent.description}</p>}
                            <div className="text-[9px] text-gray-300 mt-1">{ti.duration}</div>
                        </div><div className="flex items-center gap-1 ml-3">
                            <select value={patent.status} onChange={e => upd("tech_patents",patent._id,{status:e.target.value})} className="text-[10px] border border-gray-200 rounded px-1 py-0.5">{['idea','drafting','provisional_filed','pct_filed','national_phase','examination','granted','registered','abandoned'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}</select>
                            <button onClick={() => del("tech_patents",patent._id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={12} /></button>
                        </div></div></Card>);
                    }) : <Card className="text-center py-8 text-gray-400"><Shield size={40} className="mx-auto mb-2 opacity-50" /><p className="text-sm font-bold">No IP records yet</p><p className="text-xs">Track patent ideas, provisionals, trademarks, trade secrets</p></Card>}

                    <Card><h4 className="font-black text-xs text-gray-600 uppercase mb-2">IP Types Reference</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">{PATENT_CATEGORIES.map(c => (<div key={c.id} className="bg-gray-50 rounded-lg p-2"><div className="font-bold text-xs text-gray-800">{c.label}</div><div className="text-[10px] text-gray-500">{c.description}</div><div className="text-[9px] text-gray-400 mt-0.5">{c.duration}</div></div>))}</div>
                    </Card>
                </div>
            )}
        </div>
    );
}
