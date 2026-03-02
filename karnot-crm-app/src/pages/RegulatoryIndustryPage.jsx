import React, { useState, useEffect } from 'react';
import { Card, Button } from '../data/constants.jsx';
import {
    Building, Globe, Users, Shield, Zap, FileText, Target, ChevronDown, ChevronUp,
    ExternalLink, Phone, Mail, Calendar, AlertCircle, Search, BookOpen,
    Thermometer, Leaf, DollarSign, Award, Wrench, Database, RefreshCw
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, doc, setDoc, query, onSnapshot, serverTimestamp } from 'firebase/firestore';

// ═══════════════════════════════════════════════════════════════════════
// COMPLETE PHILIPPINE REGULATORY & INDUSTRY DATABASE FOR KARNOT
// ═══════════════════════════════════════════════════════════════════════

const CATEGORIES = {
    GOVT_ENERGY: {
        label: 'Energy Policy & Efficiency',
        icon: Zap,
        color: 'orange',
        description: 'Central authorities for energy policy, MEPS, and labeling'
    },
    GOVT_TRADE: {
        label: 'Product Standards & Trade',
        icon: Shield,
        color: 'blue',
        description: 'Product standards, energy labeling enforcement, consumer protection'
    },
    GOVT_BUILDING: {
        label: 'Green Building & Construction',
        icon: Building,
        color: 'green',
        description: 'Public infrastructure, building codes, environmental compliance'
    },
    GOVT_AGRICULTURE: {
        label: 'Agriculture & Cold Chain',
        icon: Thermometer,
        color: 'cyan',
        description: 'Cold chain modernization, postharvest processing'
    },
    GOVT_INVESTMENT: {
        label: 'Industry & Investment',
        icon: DollarSign,
        color: 'purple',
        description: 'Tax incentives, R&D partnerships, investment promotion'
    },
    ENG_HVACR: {
        label: 'HVAC/R Engineering',
        icon: Wrench,
        color: 'red',
        description: 'Core HVAC/R and mechanical engineering professional organizations'
    },
    ENG_ELECTRICAL: {
        label: 'Electrical & Chemical Engineering',
        icon: Zap,
        color: 'yellow',
        description: 'Electrical, chemical, and plumbing engineering bodies'
    },
    COLD_CHAIN: {
        label: 'Cold Chain & Food',
        icon: Thermometer,
        color: 'blue',
        description: 'Refrigeration, cold chain, food processing industry'
    },
    GREEN_FINANCE: {
        label: 'Green Building & Finance',
        icon: Leaf,
        color: 'green',
        description: 'Green building councils, ESG investment, sustainable finance'
    },
};

const ORGANIZATIONS = [
    // ═══════ GOVERNMENT — ENERGY ═══════
    {
        name: 'Department of Energy (DOE)',
        acronym: 'DOE',
        category: 'GOVT_ENERGY',
        website: 'https://doe.gov.ph',
        description: 'Central authority for energy policy. Manages PELP (Philippine Energy Labeling Program) and MEPS. Oversees RA 11285 (Energy Efficiency and Conservation Act).',
        relevance: 'CRITICAL — Mandatory for registering energy-consuming products. DOE mandates energy labeling for AC units, chillers, refrigeration. No label = no market access.',
        contacts: 'Energy Secretary Sharon S. Garin (Chair of IAEECC); Director of EUMB',
        keyLaws: 'RA 11285 (Energy Efficiency), PELP, MEPS',
        strategic: 'MUST ENGAGE — Core regulatory relationship for all Karnot products',
        priority: 'CRITICAL',
    },
    {
        name: 'Energy Utilization Management Bureau (EUMB)',
        acronym: 'EUMB',
        category: 'GOVT_ENERGY',
        website: 'https://doe.gov.ph',
        description: 'DOE bureau directly responsible for energy efficiency programs, compliance testing, and labeling enforcement.',
        relevance: 'CRITICAL — The specific bureau that handles MEPS compliance testing and energy label issuance for HVAC/R equipment.',
        contacts: 'Director of EUMB (under DOE)',
        keyLaws: 'PELP implementation, MEPS testing protocols',
        strategic: 'Direct contact needed for product registration and compliance',
        priority: 'CRITICAL',
    },
    {
        name: 'Energy Regulatory Commission (ERC)',
        acronym: 'ERC',
        category: 'GOVT_ENERGY',
        website: 'https://erc.gov.ph',
        description: 'Regulates electricity pricing and grid matters. Important for demand-side management, distributed energy, and VPP systems.',
        relevance: 'HIGH — If Karnot systems touch demand response, Virtual Power Plant, or grid integration.',
        contacts: 'ERC Commissioners',
        keyLaws: 'RA 9136 (EPIRA), Demand Response regulations',
        strategic: 'Important for EaaS and grid-connected systems',
        priority: 'HIGH',
    },
    // ═══════ GOVERNMENT — TRADE & STANDARDS ═══════
    {
        name: 'Department of Trade and Industry (DTI)',
        acronym: 'DTI',
        category: 'GOVT_TRADE',
        website: 'https://dti.gov.ph',
        description: 'Enforces product standards and consumer protection. Partners with DOE on energy labeling enforcement.',
        relevance: 'CRITICAL — DTI compliance is non-negotiable for AC units, chillers, and refrigeration systems sold in PH market.',
        contacts: 'DTI Regional Offices, Bureau of Philippine Standards',
        keyLaws: 'RA 7394 (Consumer Act), Product Standards',
        strategic: 'Core compliance partner alongside DOE',
        priority: 'CRITICAL',
    },
    {
        name: 'Bureau of Philippine Standards (BPS)',
        acronym: 'BPS',
        category: 'GOVT_TRADE',
        website: 'https://dti.gov.ph/bps',
        description: 'Issues Philippine National Standards (PNS). Coordinates testing and certification for regulated products.',
        relevance: 'HIGH — PNS certification needed for products. Coordinates with international standards (ISO, IEC).',
        contacts: 'BPS Director',
        keyLaws: 'PNS standards, testing protocols',
        strategic: 'Standards compliance and product certification',
        priority: 'HIGH',
    },
    {
        name: 'Philippine Accreditation Bureau (PAB)',
        acronym: 'PAB',
        category: 'GOVT_TRADE',
        website: 'https://dti.gov.ph/pab',
        description: 'Accredits testing laboratories for compliance validation of regulated products.',
        relevance: 'MEDIUM — Needed to identify accredited labs for product testing.',
        contacts: 'PAB Director',
        strategic: 'Lab accreditation for product testing',
        priority: 'MEDIUM',
    },
    {
        name: 'Securities and Exchange Commission (SEC)',
        acronym: 'SEC',
        category: 'GOVT_TRADE',
        website: 'https://sec.gov.ph',
        description: 'Corporate registration and compliance. Annual GIS filing, financial statement submission.',
        relevance: 'HIGH — Annual SEC compliance is mandatory. Important for investor relations.',
        contacts: 'SEC Company Registration and Monitoring Department',
        keyLaws: 'Revised Corporation Code (RA 11232)',
        strategic: 'Corporate compliance and investor confidence',
        priority: 'HIGH',
    },
    // ═══════ GOVERNMENT — BUILDING & ENVIRONMENT ═══════
    {
        name: 'Department of Public Works and Highways (DPWH)',
        acronym: 'DPWH',
        category: 'GOVT_BUILDING',
        website: 'https://dpwh.gov.ph',
        description: 'Public infrastructure standards and large-scale government buildings. Oversees National Building Code implementation.',
        relevance: 'HIGH — Government building projects require DPWH compliance. Source of large HVAC contracts.',
        contacts: 'DPWH Regional Engineering Offices',
        keyLaws: 'National Building Code (PD 1096)',
        strategic: 'Government project access',
        priority: 'HIGH',
    },
    {
        name: 'Department of Interior and Local Government (DILG)',
        acronym: 'DILG',
        category: 'GOVT_BUILDING',
        website: 'https://dilg.gov.ph',
        description: 'Influences LGUs and building code enforcement at city/municipal level.',
        relevance: 'MEDIUM — LGU partnerships for local government building retrofits.',
        contacts: 'DILG Regional Directors',
        strategic: 'LGU engagement for local projects',
        priority: 'MEDIUM',
    },
    {
        name: 'Department of Environment and Natural Resources (DENR)',
        acronym: 'DENR',
        category: 'GOVT_BUILDING',
        website: 'https://denr.gov.ph',
        description: 'Environmental compliance certificates (ECC), refrigerant policy, Kigali Amendment implementation.',
        relevance: 'HIGH — Refrigerant policy alignment (HFC phase-down). ECC needed for certain installations.',
        contacts: 'Environmental Management Bureau (EMB)',
        keyLaws: 'RA 9003, Kigali Amendment (HFC phase-down)',
        strategic: 'Refrigerant compliance and green positioning',
        priority: 'HIGH',
    },
    // ═══════ GOVERNMENT — AGRICULTURE & COLD CHAIN ═══════
    {
        name: 'Department of Agriculture (DA)',
        acronym: 'DA',
        category: 'GOVT_AGRICULTURE',
        website: 'https://da.gov.ph',
        description: 'Oversees cold chain modernization programs. Major funding source for agricultural refrigeration.',
        relevance: 'HIGH — Cold chain modernization is a DA priority. Funding programs for post-harvest facilities.',
        contacts: 'DA Undersecretary for Agri-Industrialization',
        strategic: 'Cold chain funding and government contracts',
        priority: 'HIGH',
    },
    {
        name: 'Philippine Center for Postharvest Development (PhilMech)',
        acronym: 'PhilMech',
        category: 'GOVT_AGRICULTURE',
        website: 'https://philmech.gov.ph',
        description: 'DA agency leading cold storage and agri-processing funding programs. Implements PIPP (Philippine Industrial Promotion Program).',
        relevance: 'HIGH — Key partner for cold storage R&D, technology licensing, and pilot project funding.',
        contacts: 'PIPP (Industrial Promotion Program) office',
        strategic: 'Cold storage R&D partnerships and funding',
        priority: 'HIGH',
    },
    {
        name: 'National Meat Inspection Service (NMIS)',
        acronym: 'NMIS',
        category: 'GOVT_AGRICULTURE',
        website: 'https://nmis.gov.ph',
        description: 'Meat cold chain stakeholders. Sets temperature control standards for meat processing and distribution.',
        relevance: 'MEDIUM — Cold chain compliance for meat industry customers.',
        contacts: 'NMIS Technical Services Division',
        strategic: 'Meat industry cold chain standards',
        priority: 'MEDIUM',
    },
    // ═══════ GOVERNMENT — INVESTMENT ═══════
    {
        name: 'Board of Investments (BOI)',
        acronym: 'BOI',
        category: 'GOVT_INVESTMENT',
        website: 'https://boi.gov.ph',
        description: 'Tax incentives for energy-efficient manufacturing and green technologies. Administers SIPP (Strategic Investment Priority Plan).',
        relevance: 'CRITICAL — Karnot is BOI-SIPP registered. Tax holidays, duty-free imports, export requirements.',
        contacts: 'BOI Investment Promotion Division',
        keyLaws: 'CREATE MORE Act, SIPP, RA 11534',
        strategic: 'EXISTING RELATIONSHIP — Maintain compliance and maximize incentives',
        priority: 'CRITICAL',
    },
    {
        name: 'Department of Science and Technology (DOST)',
        acronym: 'DOST',
        category: 'GOVT_INVESTMENT',
        website: 'https://dost.gov.ph',
        description: 'R&D partnerships, technology validation, testing facilities. PCIEERD division handles industrial energy research.',
        relevance: 'MEDIUM — Potential R&D grants, testing partnerships, technology validation.',
        contacts: 'PCIEERD (Philippine Council for Industry, Energy and Emerging Technology Research)',
        strategic: 'R&D funding and technology partnerships',
        priority: 'MEDIUM',
    },
    // ═══════ ENGINEERING GUILDS — HVAC/R ═══════
    {
        name: 'Philippine Society of Ventilating, Air-Conditioning and Refrigerating Engineers (PSVARE)',
        acronym: 'PSVARE',
        category: 'ENG_HVACR',
        website: 'https://psvare.org.ph',
        description: 'Primary HVACR authority in the Philippines. Authored the PSVARE Standard for Energy Efficient Buildings. Definitive guild for HVAC/R professionals.',
        relevance: 'CRITICAL — Direct access to AC, refrigeration, and ventilation engineers. Sets baseline standards for commercial building HVAC.',
        contacts: 'Past Presidents and Technical Committee Chairs (e.g., Engr. Cesar Luis Guevara)',
        strategic: 'PRIMARY TARGET — Membership, events, standards influence',
        priority: 'CRITICAL',
    },
    {
        name: 'Philippine Society of Mechanical Engineers (PSME)',
        acronym: 'PSME',
        category: 'ENG_HVACR',
        website: 'https://psmeinc.org.ph',
        description: '52,000+ members. Covers power plants, industrial systems, HVAC, manufacturing. National mechanical engineering body.',
        relevance: 'CRITICAL — Largest engineering network for industrial boilers, chillers, and complex mechanical integrations.',
        contacts: 'info@psmeinc.org.ph, national@psmeinc.org.ph',
        strategic: 'KEY PARTNER — Membership, sponsorship of events, technical presentations',
        priority: 'CRITICAL',
    },
    // ═══════ ENGINEERING GUILDS — ELECTRICAL & CHEMICAL ═══════
    {
        name: 'Institute of Integrated Electrical Engineers of the Philippines (IIEE)',
        acronym: 'IIEE',
        category: 'ENG_ELECTRICAL',
        website: 'https://iiee.org.ph',
        description: 'Electrical engineers. Critical for energy systems, controls, motor drives, grid integration, VPP/DR systems.',
        relevance: 'HIGH — Essential for power integration partnerships and demand response systems.',
        contacts: 'Ms. Venus D. Gaton, Head of National Secretariat (hos@iiee.org.ph)',
        strategic: 'Partnership for electrical integration and smart controls',
        priority: 'HIGH',
    },
    {
        name: 'Philippine Institute of Chemical Engineers (PIChE)',
        acronym: 'PIChE',
        category: 'ENG_ELECTRICAL',
        website: 'https://pichenet.org',
        description: 'Process engineering, industrial refrigeration, food manufacturing, chemical plants. Core for process heating and natural refrigerants.',
        relevance: 'MEDIUM — Vital for process efficiency, thermodynamics, and industrial refrigerant applications.',
        contacts: 'General Secretariat, PIChE College of Fellows',
        strategic: 'Industrial process heating partnerships',
        priority: 'MEDIUM',
    },
    {
        name: 'Philippine Society of Plumbing Engineers (PSPE)',
        acronym: 'PSPE',
        category: 'ENG_ELECTRICAL',
        website: 'https://pspe.org.ph',
        description: 'Water systems, hydronics, district cooling support infrastructure. Critical for high-temperature water distribution.',
        relevance: 'MEDIUM — Hydronic systems and district cooling infrastructure partnerships.',
        contacts: 'Past Presidents Engr. Abet Cabael and Engr. Reynald Ilagan',
        strategic: 'Hydronic and district cooling partnerships',
        priority: 'MEDIUM',
    },
    {
        name: 'Philippine Society of Master Plumbers (PSMP) / NAMPAP',
        acronym: 'NAMPAP',
        category: 'ENG_ELECTRICAL',
        website: 'https://nampap.com',
        description: 'Licensed plumbing professionals. Oversees National Plumbing Code governing large-scale water heating installations.',
        relevance: 'LOW-MEDIUM — Plumbing code compliance for water heating systems.',
        contacts: 'nampapinc@gmail.com, RMP Jonathan De Jesus Cabardo',
        strategic: 'Plumbing code compliance',
        priority: 'LOW',
    },
    // ═══════ COLD CHAIN & FOOD ═══════
    {
        name: 'Cold Chain Association of the Philippines (CCAP)',
        acronym: 'CCAP',
        category: 'COLD_CHAIN',
        website: 'https://ccaphils.org',
        description: 'Primary target market. Organizes supply chain for chilled/frozen food products. Sets standards for temperature-controlled storage.',
        relevance: 'HIGH — Major draw for high-efficiency refrigeration and heat recovery systems.',
        contacts: 'Anthony Dizon (President), info@ccaphils.org',
        strategic: 'PRIMARY MARKET — Sponsorship, presentations, customer network',
        priority: 'HIGH',
    },
    // ═══════ GREEN BUILDING & FINANCE ═══════
    {
        name: 'Philippine Green Building Council (PHILGBC)',
        acronym: 'PHILGBC',
        category: 'GREEN_FINANCE',
        website: 'https://philgbc.net',
        description: 'Administers BERDE Green Building Rating System. Technology deployments translate into green certification points.',
        relevance: 'HIGH — BERDE certification points for energy-efficient HVAC installations boost marketability to developers.',
        contacts: 'BERDE@philgbc.org, BERDE Committee',
        strategic: 'Green certification integration for customer proposals',
        priority: 'HIGH',
    },
    {
        name: 'Philippine Green Building Initiative (PGBI)',
        acronym: 'PGBI',
        category: 'GREEN_FINANCE',
        website: 'https://greenbuilding.ph',
        description: 'Coalition of professional organizations (includes PSVARE, PSME) promoting energy-efficient building standards.',
        relevance: 'MEDIUM — Developer-driven sustainability platform. Parallel to PHILGBC.',
        contacts: 'PGBI Secretariat',
        strategic: 'Developer engagement for green building projects',
        priority: 'MEDIUM',
    },
    {
        name: 'Financial Executives Institute of the Philippines (FINEX)',
        acronym: 'FINEX',
        category: 'GREEN_FINANCE',
        website: 'https://finex.org.ph',
        description: 'Premier organization of CFOs and finance professionals. Critical for pitching EaaS models and ESG investments.',
        relevance: 'HIGH — CFO-level access for Energy-as-a-Service pitches, sustainable financing, CapEx/OpEx discussions.',
        contacts: 'EJ A. Qua Hiansen (2025 FINEX President), FINEX Academy (Atty. Benedicta Du-Baladad)',
        strategic: 'CFO access for large corporate EaaS deals',
        priority: 'HIGH',
    },
];

// ─── Priority Color Map ─────────────────────────────────────────────────
const PRIORITY_COLORS = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-200',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
    MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
    LOW: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function RegulatoryIndustryPage({ user }) {
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedOrg, setExpandedOrg] = useState(null);
    const [savedNotes, setSavedNotes] = useState({});

    // Load saved notes
    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(
            query(collection(db, "users", user.uid, "regulatory_notes")),
            snap => {
                const data = {};
                snap.docs.forEach(d => { data[d.id] = d.data(); });
                setSavedNotes(data);
            }
        );
        return () => unsub();
    }, [user?.uid]);

    const saveNote = async (orgAcronym, note) => {
        await setDoc(doc(db, "users", user.uid, "regulatory_notes", orgAcronym), {
            note,
            orgAcronym,
            updatedAt: serverTimestamp()
        });
    };

    // Add org contact to business tasks
    const addToTasks = async (org) => {
        if (!user?.uid) return;
        await addDoc(collection(db, "users", user.uid, "business_tasks"), {
            title: `Engage ${org.acronym} — ${org.name}`,
            description: `${org.relevance}\n\nContacts: ${org.contacts || 'See website'}\nWebsite: ${org.website}`,
            category: 'STRATEGY',
            status: 'PENDING',
            priority: org.priority === 'CRITICAL' ? 'CRITICAL' : org.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
            dueDate: '',
            recurring: 'none',
            owner: '',
            notes: org.strategic || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        alert(`Added "${org.acronym}" engagement task to Business Tasks!`);
    };

    // Filtered orgs
    const filteredOrgs = ORGANIZATIONS.filter(org => {
        const matchesCategory = activeCategory === 'ALL' || org.category === activeCategory;
        const matchesSearch = !searchTerm ||
            org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            org.acronym.toLowerCase().includes(searchTerm.toLowerCase()) ||
            org.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Stats
    const criticalCount = ORGANIZATIONS.filter(o => o.priority === 'CRITICAL').length;
    const highCount = ORGANIZATIONS.filter(o => o.priority === 'HIGH').length;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Building size={28} />
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tight">Philippine Regulatory & Industry Directory</h1>
                            <p className="text-sm text-orange-200 font-bold">Government Departments, Engineering Guilds, Industry Bodies — Complete Karnot Stakeholder Map</p>
                        </div>
                    </div>
                    <div className="flex gap-3 text-center">
                        <div>
                            <div className="text-3xl font-black">{ORGANIZATIONS.length}</div>
                            <div className="text-[10px] text-orange-200 font-bold uppercase">Organizations</div>
                        </div>
                        <div>
                            <div className="text-3xl font-black text-red-300">{criticalCount}</div>
                            <div className="text-[10px] text-orange-200 font-bold uppercase">Critical</div>
                        </div>
                        <div>
                            <div className="text-3xl font-black text-yellow-300">{highCount}</div>
                            <div className="text-[10px] text-orange-200 font-bold uppercase">High Priority</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Strategic Assessment */}
            <Card className="bg-yellow-50 border-yellow-200">
                <h3 className="font-black text-yellow-800 uppercase text-xs tracking-widest mb-3 flex items-center gap-2"><Target size={14} /> Strategic Assessment for Karnot</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-yellow-200">
                        <h4 className="font-bold text-sm text-orange-700 mb-1">Market Penetration</h4>
                        <p className="text-xs text-gray-600">Focus on: <strong>DOE + DTI + PSVARE + PSME</strong></p>
                        <p className="text-[10px] text-gray-400 mt-1">Energy labeling + engineering guild relationships = market access</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-yellow-200">
                        <h4 className="font-bold text-sm text-blue-700 mb-1">Government Projects</h4>
                        <p className="text-xs text-gray-600">Add: <strong>DPWH + BOI + DA + PhilMech</strong></p>
                        <p className="text-[10px] text-gray-400 mt-1">Public infrastructure + agriculture cold chain = government contracts</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-yellow-200">
                        <h4 className="font-bold text-sm text-green-700 mb-1">ESG / Green Positioning</h4>
                        <p className="text-xs text-gray-600">Add: <strong>DENR + PHILGBC + FINEX</strong></p>
                        <p className="text-[10px] text-gray-400 mt-1">Green certification + CFO access = premium positioning & ESG investment</p>
                    </div>
                </div>
            </Card>

            {/* Energy Labeling Warning */}
            <Card className="bg-red-50 border-red-200">
                <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-black text-red-800 text-sm mb-1">Energy Labeling & MEPS — Non-Negotiable Compliance</h3>
                        <p className="text-xs text-red-700 mb-2">Under RA 11285 (Energy Efficiency and Conservation Act): DOE mandates energy labeling. DTI-BPS sets testing protocols. Products must comply with MEPS before market entry.</p>
                        <p className="text-xs text-red-600 font-bold">If you are importing, manufacturing, claiming energy savings, or selling into government projects: NO LABEL = NO SERIOUS MARKET ACCESS.</p>
                    </div>
                </div>
            </Card>

            {/* Search & Filters */}
            <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Search organizations..."
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <button onClick={() => setActiveCategory('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeCategory === 'ALL' ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                    All ({ORGANIZATIONS.length})
                </button>
                {Object.entries(CATEGORIES).map(([key, cat]) => {
                    const count = ORGANIZATIONS.filter(o => o.category === key).length;
                    return (
                        <button key={key} onClick={() => setActiveCategory(key)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeCategory === key ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}>
                            <cat.icon size={12} /> {cat.label} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Organizations List */}
            <div className="space-y-2">
                {filteredOrgs.map(org => {
                    const cat = CATEGORIES[org.category];
                    const isExpanded = expandedOrg === org.acronym;
                    const note = savedNotes[org.acronym]?.note || '';

                    return (
                        <Card key={org.acronym} className={`transition-all ${isExpanded ? 'ring-2 ring-orange-300' : ''}`}>
                            <button onClick={() => setExpandedOrg(isExpanded ? null : org.acronym)} className="w-full text-left">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg bg-${cat.color}-50`}>
                                            <cat.icon size={16} className={`text-${cat.color}-600`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-sm text-gray-800">{org.acronym}</span>
                                                <span className="text-xs text-gray-500">{org.name}</span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[org.priority]}`}>{org.priority}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{org.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {org.website && (
                                            <a href={org.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600">
                                                <ExternalLink size={14} />
                                            </a>
                                        )}
                                        {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                    </div>
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="mt-4 pl-12 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-1">Why This Matters for Karnot</h4>
                                            <p className="text-xs text-gray-700 bg-orange-50 p-2 rounded border border-orange-100">{org.relevance}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-1">Strategic Action</h4>
                                            <p className="text-xs text-gray-700 bg-blue-50 p-2 rounded border border-blue-100">{org.strategic}</p>
                                        </div>
                                    </div>
                                    {org.contacts && (
                                        <div>
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-1">Key Contacts</h4>
                                            <p className="text-xs text-gray-700">{org.contacts}</p>
                                        </div>
                                    )}
                                    {org.keyLaws && (
                                        <div>
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-1">Key Laws / Standards</h4>
                                            <p className="text-xs text-purple-700 font-bold">{org.keyLaws}</p>
                                        </div>
                                    )}
                                    {/* Notes */}
                                    <div>
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-1">Your Notes</h4>
                                        <textarea className="w-full border border-gray-200 rounded-lg p-2 text-xs h-16"
                                            placeholder="Add your notes about engagement, contacts made, status..."
                                            defaultValue={note}
                                            onBlur={e => saveNote(org.acronym, e.target.value)} />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={() => addToTasks(org)} variant="primary" className="text-xs">
                                            <Target size={12} className="mr-1" /> Add to Business Tasks
                                        </Button>
                                        {org.website && (
                                            <a href={org.website} target="_blank" rel="noopener noreferrer">
                                                <Button variant="secondary" className="text-xs">
                                                    <Globe size={12} className="mr-1" /> Visit Website
                                                </Button>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {filteredOrgs.length === 0 && (
                <Card className="text-center py-12">
                    <Search size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-bold">No organizations match your search</p>
                </Card>
            )}
        </div>
    );
}
