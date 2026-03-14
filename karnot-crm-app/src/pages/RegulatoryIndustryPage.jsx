import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button } from '../data/constants.jsx';
import {
    Building, Globe, Users, Shield, Zap, FileText, Target, ChevronDown, ChevronUp,
    ExternalLink, Phone, Mail, Calendar, AlertCircle, Search, BookOpen,
    Thermometer, Leaf, DollarSign, Award, Wrench, Database, RefreshCw,
    Plus, Upload, UserPlus, Briefcase, MapPin, Linkedin, Trash2, Check,
    Download, Loader, ClipboardPaste, X, Star, Building2
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, doc, setDoc, deleteDoc, getDocs, query, onSnapshot, serverTimestamp } from 'firebase/firestore';

// ═══════════════════════════════════════════════════════════════════════
// COMPLETE PHILIPPINE REGULATORY & INDUSTRY DATABASE FOR KARNOT
// ═══════════════════════════════════════════════════════════════════════

const CATEGORIES = {
    GOVT_ENERGY: { label: 'Energy Policy & Efficiency', icon: Zap, color: 'orange', description: 'Central authorities for energy policy, MEPS, and labeling' },
    GOVT_TRADE: { label: 'Product Standards & Trade', icon: Shield, color: 'blue', description: 'Product standards, energy labeling enforcement, consumer protection' },
    GOVT_BUILDING: { label: 'Green Building & Construction', icon: Building, color: 'green', description: 'Public infrastructure, building codes, environmental compliance' },
    GOVT_AGRICULTURE: { label: 'Agriculture & Cold Chain', icon: Thermometer, color: 'cyan', description: 'Cold chain modernization, postharvest processing' },
    GOVT_INVESTMENT: { label: 'Industry & Investment', icon: DollarSign, color: 'purple', description: 'Tax incentives, R&D partnerships, investment promotion' },
    ENG_HVACR: { label: 'HVAC/R Engineering', icon: Wrench, color: 'red', description: 'Core HVAC/R and mechanical engineering professional organizations' },
    ENG_ELECTRICAL: { label: 'Electrical & Chemical Engineering', icon: Zap, color: 'yellow', description: 'Electrical, chemical, and plumbing engineering bodies' },
    COLD_CHAIN: { label: 'Cold Chain & Food', icon: Thermometer, color: 'blue', description: 'Refrigeration, cold chain, food processing industry' },
    GREEN_FINANCE: { label: 'Green Building & Finance', icon: Leaf, color: 'green', description: 'Green building councils, ESG investment, sustainable finance' },
};

const ORGANIZATIONS = [
    // ═══════ GOVERNMENT — ENERGY ═══════
    { name: 'Department of Energy (DOE)', acronym: 'DOE', category: 'GOVT_ENERGY', website: 'https://doe.gov.ph', description: 'Central authority for energy policy. Manages PELP (Philippine Energy Labeling Program) and MEPS. Oversees RA 11285 (Energy Efficiency and Conservation Act).', relevance: 'CRITICAL — Mandatory for registering energy-consuming products. DOE mandates energy labeling for AC units, chillers, refrigeration. No label = no market access.', contacts: 'Energy Secretary Sharon S. Garin (Chair of IAEECC); Director of EUMB', keyLaws: 'RA 11285 (Energy Efficiency), PELP, MEPS', strategic: 'MUST ENGAGE — Core regulatory relationship for all Karnot products', priority: 'CRITICAL' },
    { name: 'Energy Utilization Management Bureau (EUMB)', acronym: 'EUMB', category: 'GOVT_ENERGY', website: 'https://doe.gov.ph', description: 'DOE bureau directly responsible for energy efficiency programs, compliance testing, and labeling enforcement.', relevance: 'CRITICAL — The specific bureau that handles MEPS compliance testing and energy label issuance for HVAC/R equipment.', contacts: 'Director of EUMB (under DOE)', keyLaws: 'PELP implementation, MEPS testing protocols', strategic: 'Direct contact needed for product registration and compliance', priority: 'CRITICAL' },
    { name: 'Energy Regulatory Commission (ERC)', acronym: 'ERC', category: 'GOVT_ENERGY', website: 'https://erc.gov.ph', description: 'Regulates electricity pricing and grid matters. Important for demand-side management, distributed energy, and VPP systems.', relevance: 'HIGH — If Karnot systems touch demand response, Virtual Power Plant, or grid integration.', contacts: 'ERC Commissioners', keyLaws: 'RA 9136 (EPIRA), Demand Response regulations', strategic: 'Important for EaaS and grid-connected systems', priority: 'HIGH' },
    // ═══════ GOVERNMENT — TRADE & STANDARDS ═══════
    { name: 'Department of Trade and Industry (DTI)', acronym: 'DTI', category: 'GOVT_TRADE', website: 'https://dti.gov.ph', description: 'Enforces product standards and consumer protection. Partners with DOE on energy labeling enforcement.', relevance: 'CRITICAL — DTI compliance is non-negotiable for AC units, chillers, and refrigeration systems sold in PH market.', contacts: 'DTI Regional Offices, Bureau of Philippine Standards', keyLaws: 'RA 7394 (Consumer Act), Product Standards', strategic: 'Core compliance partner alongside DOE', priority: 'CRITICAL' },
    { name: 'Bureau of Philippine Standards (BPS)', acronym: 'BPS', category: 'GOVT_TRADE', website: 'https://dti.gov.ph/bps', description: 'Issues Philippine National Standards (PNS). Coordinates testing and certification for regulated products.', relevance: 'HIGH — PNS certification needed for products. Coordinates with international standards (ISO, IEC).', contacts: 'BPS Director', keyLaws: 'PNS standards, testing protocols', strategic: 'Standards compliance and product certification', priority: 'HIGH' },
    { name: 'Philippine Accreditation Bureau (PAB)', acronym: 'PAB', category: 'GOVT_TRADE', website: 'https://dti.gov.ph/pab', description: 'Accredits testing laboratories for compliance validation of regulated products.', relevance: 'MEDIUM — Needed to identify accredited labs for product testing.', contacts: 'PAB Director', strategic: 'Lab accreditation for product testing', priority: 'MEDIUM' },
    { name: 'Securities and Exchange Commission (SEC)', acronym: 'SEC', category: 'GOVT_TRADE', website: 'https://sec.gov.ph', description: 'Corporate registration and compliance. Annual GIS filing, financial statement submission.', relevance: 'HIGH — Annual SEC compliance is mandatory. Important for investor relations.', contacts: 'SEC Company Registration and Monitoring Department', keyLaws: 'Revised Corporation Code (RA 11232)', strategic: 'Corporate compliance and investor confidence', priority: 'HIGH' },
    // ═══════ GOVERNMENT — BUILDING & ENVIRONMENT ═══════
    { name: 'Department of Public Works and Highways (DPWH)', acronym: 'DPWH', category: 'GOVT_BUILDING', website: 'https://dpwh.gov.ph', description: 'Public infrastructure standards and large-scale government buildings. Oversees National Building Code implementation.', relevance: 'HIGH — Government building projects require DPWH compliance. Source of large HVAC contracts.', contacts: 'DPWH Regional Engineering Offices', keyLaws: 'National Building Code (PD 1096)', strategic: 'Government project access', priority: 'HIGH' },
    { name: 'Department of Interior and Local Government (DILG)', acronym: 'DILG', category: 'GOVT_BUILDING', website: 'https://dilg.gov.ph', description: 'Influences LGUs and building code enforcement at city/municipal level.', relevance: 'MEDIUM — LGU partnerships for local government building retrofits.', contacts: 'DILG Regional Directors', strategic: 'LGU engagement for local projects', priority: 'MEDIUM' },
    { name: 'Department of Environment and Natural Resources (DENR)', acronym: 'DENR', category: 'GOVT_BUILDING', website: 'https://denr.gov.ph', description: 'Environmental compliance certificates (ECC), refrigerant policy, Kigali Amendment implementation.', relevance: 'HIGH — Refrigerant policy alignment (HFC phase-down). ECC needed for certain installations.', contacts: 'Environmental Management Bureau (EMB)', keyLaws: 'RA 9003, Kigali Amendment (HFC phase-down)', strategic: 'Refrigerant compliance and green positioning', priority: 'HIGH' },
    // ═══════ GOVERNMENT — AGRICULTURE & COLD CHAIN ═══════
    { name: 'Department of Agriculture (DA)', acronym: 'DA', category: 'GOVT_AGRICULTURE', website: 'https://da.gov.ph', description: 'Oversees cold chain modernization programs. Major funding source for agricultural refrigeration.', relevance: 'HIGH — Cold chain modernization is a DA priority. Funding programs for post-harvest facilities.', contacts: 'DA Undersecretary for Agri-Industrialization', strategic: 'Cold chain funding and government contracts', priority: 'HIGH' },
    { name: 'Philippine Center for Postharvest Development (PhilMech)', acronym: 'PhilMech', category: 'GOVT_AGRICULTURE', website: 'https://philmech.gov.ph', description: 'DA agency leading cold storage and agri-processing funding programs. Implements PIPP.', relevance: 'HIGH — Key partner for cold storage R&D, technology licensing, and pilot project funding.', contacts: 'PIPP (Industrial Promotion Program) office', strategic: 'Cold storage R&D partnerships and funding', priority: 'HIGH' },
    { name: 'National Meat Inspection Service (NMIS)', acronym: 'NMIS', category: 'GOVT_AGRICULTURE', website: 'https://nmis.gov.ph', description: 'Meat cold chain stakeholders. Sets temperature control standards for meat processing and distribution.', relevance: 'MEDIUM — Cold chain compliance for meat industry customers.', contacts: 'NMIS Technical Services Division', strategic: 'Meat industry cold chain standards', priority: 'MEDIUM' },
    // ═══════ GOVERNMENT — INVESTMENT ═══════
    { name: 'Board of Investments (BOI)', acronym: 'BOI', category: 'GOVT_INVESTMENT', website: 'https://boi.gov.ph', description: 'Tax incentives for energy-efficient manufacturing and green technologies. Administers SIPP.', relevance: 'CRITICAL — Karnot is BOI-SIPP registered. Tax holidays, duty-free imports, export requirements.', contacts: 'BOI Investment Promotion Division', keyLaws: 'CREATE MORE Act, SIPP, RA 11534', strategic: 'EXISTING RELATIONSHIP — Maintain compliance and maximize incentives', priority: 'CRITICAL' },
    { name: 'Department of Science and Technology (DOST)', acronym: 'DOST', category: 'GOVT_INVESTMENT', website: 'https://dost.gov.ph', description: 'R&D partnerships, technology validation, testing facilities. PCIEERD division handles industrial energy research.', relevance: 'MEDIUM — Potential R&D grants, testing partnerships, technology validation.', contacts: 'PCIEERD', strategic: 'R&D funding and technology partnerships', priority: 'MEDIUM' },
    // ═══════ ENGINEERING GUILDS — HVAC/R ═══════
    { name: 'Philippine Society of Ventilating, Air-Conditioning and Refrigerating Engineers (PSVARE)', acronym: 'PSVARE', category: 'ENG_HVACR', website: 'https://psvare.org.ph', description: 'Primary HVACR authority in the Philippines. Authored the PSVARE Standard for Energy Efficient Buildings.', relevance: 'CRITICAL — Direct access to AC, refrigeration, and ventilation engineers. Sets baseline standards for commercial building HVAC.', contacts: 'Past Presidents and Technical Committee Chairs (e.g., Engr. Cesar Luis Guevara)', strategic: 'PRIMARY TARGET — Membership, events, standards influence', priority: 'CRITICAL' },
    { name: 'Philippine Society of Mechanical Engineers (PSME)', acronym: 'PSME', category: 'ENG_HVACR', website: 'https://psmeinc.org.ph', description: '52,000+ members. Covers power plants, industrial systems, HVAC, manufacturing. National mechanical engineering body.', relevance: 'CRITICAL — Largest engineering network for industrial boilers, chillers, and complex mechanical integrations.', contacts: 'info@psmeinc.org.ph, national@psmeinc.org.ph', strategic: 'KEY PARTNER — Membership, sponsorship of events, technical presentations', priority: 'CRITICAL' },
    // ═══════ ENGINEERING GUILDS — ELECTRICAL & CHEMICAL ═══════
    { name: 'Institute of Integrated Electrical Engineers of the Philippines (IIEE)', acronym: 'IIEE', category: 'ENG_ELECTRICAL', website: 'https://iiee.org.ph', description: 'Electrical engineers. Critical for energy systems, controls, motor drives, grid integration.', relevance: 'HIGH — Essential for power integration partnerships and demand response systems.', contacts: 'Ms. Venus D. Gaton, Head of National Secretariat (hos@iiee.org.ph)', strategic: 'Partnership for electrical integration and smart controls', priority: 'HIGH' },
    { name: 'Philippine Institute of Chemical Engineers (PIChE)', acronym: 'PIChE', category: 'ENG_ELECTRICAL', website: 'https://pichenet.org', description: 'Process engineering, industrial refrigeration, food manufacturing, chemical plants.', relevance: 'MEDIUM — Vital for process efficiency, thermodynamics, and industrial refrigerant applications.', contacts: 'General Secretariat, PIChE College of Fellows', strategic: 'Industrial process heating partnerships', priority: 'MEDIUM' },
    { name: 'Philippine Society of Plumbing Engineers (PSPE)', acronym: 'PSPE', category: 'ENG_ELECTRICAL', website: 'https://pspe.org.ph', description: 'Water systems, hydronics, district cooling support infrastructure.', relevance: 'MEDIUM — Hydronic systems and district cooling infrastructure partnerships.', contacts: 'Past Presidents Engr. Abet Cabael and Engr. Reynald Ilagan', strategic: 'Hydronic and district cooling partnerships', priority: 'MEDIUM' },
    { name: 'Philippine Society of Master Plumbers (PSMP) / NAMPAP', acronym: 'NAMPAP', category: 'ENG_ELECTRICAL', website: 'https://nampap.com', description: 'Licensed plumbing professionals. Oversees National Plumbing Code.', relevance: 'LOW-MEDIUM — Plumbing code compliance for water heating systems.', contacts: 'nampapinc@gmail.com, RMP Jonathan De Jesus Cabardo', strategic: 'Plumbing code compliance', priority: 'LOW' },
    // ═══════ COLD CHAIN & FOOD ═══════
    { name: 'Cold Chain Association of the Philippines (CCAP)', acronym: 'CCAP', category: 'COLD_CHAIN', website: 'https://ccaphils.org', description: 'Primary target market. Organizes supply chain for chilled/frozen food products.', relevance: 'HIGH — Major draw for high-efficiency refrigeration and heat recovery systems.', contacts: 'Anthony Dizon (President), info@ccaphils.org', strategic: 'PRIMARY MARKET — Sponsorship, presentations, customer network', priority: 'HIGH' },
    // ═══════ GREEN BUILDING & FINANCE ═══════
    { name: 'Philippine Green Building Council (PHILGBC)', acronym: 'PHILGBC', category: 'GREEN_FINANCE', website: 'https://philgbc.net', description: 'Administers BERDE Green Building Rating System.', relevance: 'HIGH — BERDE certification points for energy-efficient HVAC installations boost marketability.', contacts: 'BERDE@philgbc.org, BERDE Committee', strategic: 'Green certification integration for customer proposals', priority: 'HIGH' },
    { name: 'Philippine Green Building Initiative (PGBI)', acronym: 'PGBI', category: 'GREEN_FINANCE', website: 'https://greenbuilding.ph', description: 'Coalition of professional organizations promoting energy-efficient building standards.', relevance: 'MEDIUM — Developer-driven sustainability platform.', contacts: 'PGBI Secretariat', strategic: 'Developer engagement for green building projects', priority: 'MEDIUM' },
    { name: 'Financial Executives Institute of the Philippines (FINEX)', acronym: 'FINEX', category: 'GREEN_FINANCE', website: 'https://finex.org.ph', description: 'Premier organization of CFOs and finance professionals. Critical for pitching EaaS models.', relevance: 'HIGH — CFO-level access for Energy-as-a-Service pitches, sustainable financing.', contacts: 'EJ A. Qua Hiansen (2025 FINEX President), FINEX Academy', strategic: 'CFO access for large corporate EaaS deals', priority: 'HIGH' },
];

const PRIORITY_COLORS = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-200',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
    MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
    LOW: 'bg-gray-100 text-gray-600 border-gray-200',
};

// ═══════════════════════════════════════════════════════════════════════
// LINKEDIN SALES NAVIGATOR TEXT PARSER
// ═══════════════════════════════════════════════════════════════════════
function parseLinkedInText(text) {
    const contacts = [];
    // Split by numbered entries or "Add ... to selection" patterns
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    let current = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detect name lines - look for patterns like "Add X to selection" or standalone names
        const addMatch = line.match(/^(?:\d+\.\s*)?(?:Add\s+)?(.+?)(?:\s+to selection)?$/);

        // Check if line looks like a connection degree
        const isConnection = /^\d+(?:st|nd|rd|th) degree connection/i.test(line);
        // Check if line is a role/title at a company
        const roleMatch = line.match(/^((?:President|Vice President|Director|Chief|National|Executive|Board|Chapter|Head|Secretary|Officer|Treasurer|Manager|Coordinator|Chair|Governor|Commissioner|Most Proactive).+?)\s{2,}(.+)/i);
        const roleMatch2 = line.match(/^(.+?)\s{2,}(.+)/);

        // Location patterns
        const isLocation = /(?:Metro Manila|Manila|Philippines|Calabarzon|National Capital|Bicol|Ilocos|Caraga|Mimaropa|Visayas|Mindanao|Pampanga|Cavite|Laguna|Batangas|Cebu|Davao|Sorsogon|Puerto Princesa|Nasugbu|Pasig|Mandaluyong|Taguig|Makati)/i.test(line);

        // About section
        const isAbout = line === 'About:';

        // Detect role line
        if (roleMatch && current) {
            current.jobTitle = roleMatch[1].trim();
            current.company = roleMatch[2].trim();
        } else if (roleMatch2 && current && !current.jobTitle && !isConnection && !isLocation && !isAbout && line !== 'Message' && line !== 'Save' && line !== '*') {
            // Check if it looks like a title + company pattern
            const parts = line.split(/\s{2,}/);
            if (parts.length >= 2 && parts[0].length > 3 && parts[1].length > 3) {
                current.jobTitle = parts[0].trim();
                current.company = parts[1].trim();
            }
        }

        // Detect location
        if (isLocation && current && !current.location) {
            current.location = line.replace(/,\s*$/, '');
        }

        // Detect about section
        if (isAbout && current) {
            // Next non-empty, non-marker line is the about text
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                const aboutLine = lines[j];
                if (aboutLine && aboutLine !== '*' && aboutLine !== 'Message' && aboutLine !== 'Save' && aboutLine.length > 20) {
                    current.about = aboutLine.substring(0, 500);
                    break;
                }
            }
        }

        // Duration in role
        const durationMatch = line.match(/^(\d+ (?:year|month|week|day)s?\s*(?:\d+ (?:year|month|week|day)s?)?)\s+in role/i);
        if (durationMatch && current) {
            current.tenure = durationMatch[1];
        }

        // Detect new person entry - a name that comes before connection degree
        if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            const nextIsConnection = /^\d+(?:st|nd|rd|th) degree connection/i.test(nextLine);

            if (nextIsConnection && addMatch && !isConnection && line !== '*' && line !== 'Message' && line !== 'Save' && line.length > 2) {
                // Save previous
                if (current && current.name) contacts.push(current);
                // Start new
                let name = addMatch[1].trim()
                    .replace(/^\d+\.\s*/, '')
                    .replace(/^Add\s+/i, '')
                    .replace(/\s+to selection$/i, '');
                current = { name, jobTitle: '', company: '', location: '', about: '', tenure: '', connectionDegree: '' };
            }
        }

        // Also try: if line is a clean name followed by connection info
        if (isConnection && current) {
            const degreeMatch = line.match(/^(\d+)(?:st|nd|rd|th)/);
            if (degreeMatch) current.connectionDegree = degreeMatch[1];
        }

        // Handle standalone name entries like "10. Jethro Jadie" that don't have "Add...to selection"
        const numberedName = line.match(/^(\d+)\.\s+(?!Add\s)([A-Z][a-zA-Z\s,.'-]+)$/);
        if (numberedName) {
            if (current && current.name) contacts.push(current);
            current = { name: numberedName[2].trim(), jobTitle: '', company: '', location: '', about: '', tenure: '', connectionDegree: '' };
        }
    }

    // Push last entry
    if (current && current.name) contacts.push(current);

    // Clean up - remove entries that are clearly not people
    return contacts.filter(c =>
        c.name.length > 2 &&
        c.name.length < 80 &&
        !c.name.match(/^(Message|Save|View|About|Show|mutual|\*|\d+$)/i) &&
        c.name !== 'Mechanical Engineer'
    );
}


// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function RegulatoryIndustryPage({ user }) {
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedOrg, setExpandedOrg] = useState(null);
    const [savedNotes, setSavedNotes] = useState({});
    const [scrapedData, setScrapedData] = useState({});
    const [scrapingOrg, setScrapingOrg] = useState(null);
    const [orgContacts, setOrgContacts] = useState({});
    const [importedOrgs, setImportedOrgs] = useState(new Set());
    const [showLinkedInParser, setShowLinkedInParser] = useState(null); // org acronym or null
    const [linkedInText, setLinkedInText] = useState('');
    const [parsedContacts, setParsedContacts] = useState([]);
    const [selectedContacts, setSelectedContacts] = useState(new Set());
    const [activeTab, setActiveTab] = useState({}); // per-org active tab

    // Load saved notes + scraped data + contacts from Firestore
    useEffect(() => {
        if (!user?.uid) return;
        const unsubs = [];

        unsubs.push(onSnapshot(
            query(collection(db, "users", user.uid, "regulatory_notes")),
            snap => {
                const data = {};
                snap.docs.forEach(d => { data[d.id] = d.data(); });
                setSavedNotes(data);
            }
        ));

        unsubs.push(onSnapshot(
            query(collection(db, "users", user.uid, "org_scraped_data")),
            snap => {
                const data = {};
                snap.docs.forEach(d => { data[d.id] = d.data(); });
                setScrapedData(data);
            }
        ));

        unsubs.push(onSnapshot(
            query(collection(db, "users", user.uid, "org_contacts")),
            snap => {
                const data = {};
                snap.docs.forEach(d => {
                    const rec = d.data();
                    const key = rec.orgAcronym;
                    if (!data[key]) data[key] = [];
                    data[key].push({ ...rec, _id: d.id });
                });
                setOrgContacts(data);
            }
        ));

        // Check which orgs are already imported as companies
        unsubs.push(onSnapshot(
            query(collection(db, "users", user.uid, "companies")),
            snap => {
                const imported = new Set();
                snap.docs.forEach(d => {
                    const src = d.data().source;
                    if (src && src.startsWith('Regulatory Directory')) {
                        const match = src.match(/\((.+)\)/);
                        if (match) imported.add(match[1]);
                    }
                });
                setImportedOrgs(imported);
            }
        ));

        return () => unsubs.forEach(u => u());
    }, [user?.uid]);

    // ─── Save note ────────────────────────────────────────────
    const saveNote = async (orgAcronym, note) => {
        await setDoc(doc(db, "users", user.uid, "regulatory_notes", orgAcronym), {
            note, orgAcronym, updatedAt: serverTimestamp()
        });
    };

    // ─── Add to business tasks ────────────────────────────────
    const addToTasks = async (org) => {
        if (!user?.uid) return;
        await addDoc(collection(db, "users", user.uid, "business_tasks"), {
            title: `Engage ${org.acronym} — ${org.name}`,
            description: `${org.relevance}\n\nContacts: ${org.contacts || 'See website'}\nWebsite: ${org.website}`,
            category: 'STRATEGY', status: 'PENDING',
            priority: org.priority === 'CRITICAL' ? 'CRITICAL' : org.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
            dueDate: '', recurring: 'none', owner: '',
            notes: org.strategic || '',
            createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        });
        alert(`Added "${org.acronym}" engagement task to Business Tasks!`);
    };

    // ─── Scrape org website ────────────────────────────────────
    const [scrapeResult, setScrapeResult] = useState(null); // {orgAcronym, success, message, suggestion}

    const scrapeOrg = async (org) => {
        setScrapingOrg(org.acronym);
        setScrapeResult(null);
        try {
            const res = await fetch('/.netlify/functions/scrape-org', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: org.website, orgName: org.name, orgAcronym: org.acronym })
            });
            const data = await res.json();
            if (data.success) {
                await setDoc(doc(db, "users", user.uid, "org_scraped_data", org.acronym), {
                    ...data, orgAcronym: org.acronym, savedAt: serverTimestamp()
                });
                setScrapeResult({
                    orgAcronym: org.acronym, success: true,
                    message: `Scraped ${org.acronym} via ${data.fetchMethod || 'direct'}! Found ${data.emails?.length || 0} emails, ${data.phones?.length || 0} phones, ${data.news?.length || 0} news, ${data.socialLinks ? Object.keys(data.socialLinks).length : 0} social links.`,
                });
            } else {
                setScrapeResult({
                    orgAcronym: org.acronym, success: false,
                    message: data.error || 'Unknown error',
                    suggestion: data.suggestion || 'Try visiting the website manually.',
                    errorType: data.errorType,
                });
            }
        } catch (err) {
            setScrapeResult({
                orgAcronym: org.acronym, success: false,
                message: err.message,
                suggestion: 'Network error. Check your connection and try again.',
            });
        } finally {
            setScrapingOrg(null);
        }
    };

    // ─── Import org as CRM company card ────────────────────────
    const importToCRM = async (org) => {
        if (!user?.uid) return;
        const contacts = orgContacts[org.acronym] || [];
        const scraped = scrapedData[org.acronym];

        await addDoc(collection(db, "users", user.uid, "companies"), {
            companyName: org.name,
            industry: CATEGORIES[org.category]?.label || 'Government/Industry',
            website: org.website || '',
            address: scraped?.addresses?.[0] || '',
            phone: scraped?.phones?.[0] || '',
            email: scraped?.emails?.[0] || '',
            isTarget: true,
            isCustomer: false,
            isVerified: false,
            source: `Regulatory Directory (${org.acronym})`,
            notes: [
                `Organization: ${org.acronym} — ${org.name}`,
                `Priority: ${org.priority}`,
                `Relevance: ${org.relevance}`,
                `Strategic: ${org.strategic}`,
                org.keyLaws ? `Key Laws: ${org.keyLaws}` : '',
                `Known Contacts: ${org.contacts}`,
                contacts.length > 0 ? `\nLinkedIn Contacts (${contacts.length}):` : '',
                ...contacts.slice(0, 10).map(c => `- ${c.name}${c.jobTitle ? `, ${c.jobTitle}` : ''}${c.location ? ` (${c.location})` : ''}`),
            ].filter(Boolean).join('\n'),
            createdAt: serverTimestamp(),
            lastModified: serverTimestamp()
        });

        // Also create contact records for LinkedIn people
        for (const contact of contacts) {
            const nameParts = contact.name.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            await addDoc(collection(db, "users", user.uid, "contacts"), {
                firstName,
                lastName,
                jobTitle: contact.jobTitle || '',
                companyName: contact.company || org.name,
                phone: '',
                email: '',
                linkedIn: '',
                location: contact.location || '',
                notes: [
                    `Source: LinkedIn via ${org.acronym}`,
                    contact.about ? `About: ${contact.about}` : '',
                    contact.tenure ? `Tenure: ${contact.tenure}` : '',
                    contact.connectionDegree ? `Connection: ${contact.connectionDegree}° degree` : '',
                ].filter(Boolean).join('\n'),
                isVerified: false,
                isEmailed: false,
                isContacted: false,
                isVisited: false,
                isPartner: false,
                createdAt: serverTimestamp(),
                lastModified: serverTimestamp()
            });
        }

        setImportedOrgs(prev => new Set(prev).add(org.acronym));
        alert(`Imported ${org.acronym} to Companies + ${contacts.length} contacts to CRM!`);
    };

    // ─── Parse LinkedIn text and show results ──────────────────
    const handleParseLinkedIn = () => {
        const parsed = parseLinkedInText(linkedInText);
        setParsedContacts(parsed);
        setSelectedContacts(new Set(parsed.map((_, i) => i)));
    };

    // ─── Save parsed LinkedIn contacts to Firestore ────────────
    const saveLinkedInContacts = async (orgAcronym) => {
        if (!user?.uid) return;
        const toSave = parsedContacts.filter((_, i) => selectedContacts.has(i));

        for (const contact of toSave) {
            await addDoc(collection(db, "users", user.uid, "org_contacts"), {
                orgAcronym,
                name: contact.name,
                jobTitle: contact.jobTitle || '',
                company: contact.company || '',
                location: contact.location || '',
                about: contact.about || '',
                tenure: contact.tenure || '',
                connectionDegree: contact.connectionDegree || '',
                source: 'LinkedIn Sales Navigator',
                addedAt: serverTimestamp()
            });
        }

        alert(`Saved ${toSave.length} contacts for ${orgAcronym}!`);
        setShowLinkedInParser(null);
        setLinkedInText('');
        setParsedContacts([]);
        setSelectedContacts(new Set());
    };

    // ─── Delete a contact ──────────────────────────────────────
    const deleteContact = async (contactId) => {
        if (!user?.uid) return;
        await deleteDoc(doc(db, "users", user.uid, "org_contacts", contactId));
    };

    // ─── Filter organizations ──────────────────────────────────
    const filteredOrgs = ORGANIZATIONS.filter(org => {
        const matchesCategory = activeCategory === 'ALL' || org.category === activeCategory;
        const matchesSearch = !searchTerm ||
            org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            org.acronym.toLowerCase().includes(searchTerm.toLowerCase()) ||
            org.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const criticalCount = ORGANIZATIONS.filter(o => o.priority === 'CRITICAL').length;
    const highCount = ORGANIZATIONS.filter(o => o.priority === 'HIGH').length;
    const totalContacts = Object.values(orgContacts).reduce((s, arr) => s + arr.length, 0);

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
                    <div className="flex gap-4 text-center">
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
                        <div>
                            <div className="text-3xl font-black text-green-300">{totalContacts}</div>
                            <div className="text-[10px] text-orange-200 font-bold uppercase">Contacts</div>
                        </div>
                        <div>
                            <div className="text-3xl font-black text-blue-300">{importedOrgs.size}</div>
                            <div className="text-[10px] text-orange-200 font-bold uppercase">In CRM</div>
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
                        <p className="text-xs text-red-700 mb-2">Under RA 11285: DOE mandates energy labeling. DTI-BPS sets testing protocols. Products must comply with MEPS before market entry.</p>
                        <p className="text-xs text-red-600 font-bold">NO LABEL = NO SERIOUS MARKET ACCESS.</p>
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
                    const scraped = scrapedData[org.acronym];
                    const contacts = orgContacts[org.acronym] || [];
                    const isImported = importedOrgs.has(org.acronym);
                    const isScraping = scrapingOrg === org.acronym;
                    const tab = activeTab[org.acronym] || 'info';

                    return (
                        <Card key={org.acronym} className={`transition-all ${isExpanded ? 'ring-2 ring-orange-300' : ''}`}>
                            {/* Collapsed Header */}
                            <button onClick={() => setExpandedOrg(isExpanded ? null : org.acronym)} className="w-full text-left">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg bg-${cat.color}-50`}>
                                            <cat.icon size={16} className={`text-${cat.color}-600`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-black text-sm text-gray-800">{org.acronym}</span>
                                                <span className="text-xs text-gray-500">{org.name}</span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[org.priority]}`}>{org.priority}</span>
                                                {contacts.length > 0 && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-0.5">
                                                        <Users size={9} /> {contacts.length}
                                                    </span>
                                                )}
                                                {isImported && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-0.5">
                                                        <Check size={9} /> IN CRM
                                                    </span>
                                                )}
                                                {scraped && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700 flex items-center gap-0.5">
                                                        <Database size={9} /> SCRAPED
                                                    </span>
                                                )}
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

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="mt-4 space-y-3">
                                    {/* Tab Navigation */}
                                    <div className="flex gap-1 border-b border-gray-200 pb-1">
                                        {['info', 'contacts', 'scraped', 'notes'].map(t => (
                                            <button key={t}
                                                onClick={() => setActiveTab(prev => ({ ...prev, [org.acronym]: t }))}
                                                className={`px-3 py-1.5 rounded-t-lg text-xs font-bold transition-all ${
                                                    tab === t ? 'bg-orange-100 text-orange-700 border border-b-0 border-orange-200' : 'text-gray-500 hover:text-gray-700'
                                                }`}>
                                                {t === 'info' && 'Info & Strategy'}
                                                {t === 'contacts' && `Contacts (${contacts.length})`}
                                                {t === 'scraped' && `Scraped Data${scraped ? ' *' : ''}`}
                                                {t === 'notes' && 'Notes'}
                                            </button>
                                        ))}
                                    </div>

                                    {/* INFO TAB */}
                                    {tab === 'info' && (
                                        <div className="space-y-3 pl-2">
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
                                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-1">Known Contacts</h4>
                                                    <p className="text-xs text-gray-700">{org.contacts}</p>
                                                </div>
                                            )}
                                            {org.keyLaws && (
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-1">Key Laws / Standards</h4>
                                                    <p className="text-xs text-purple-700 font-bold">{org.keyLaws}</p>
                                                </div>
                                            )}
                                            <div className="flex gap-2 flex-wrap">
                                                <Button onClick={() => addToTasks(org)} variant="primary" className="text-xs">
                                                    <Target size={12} className="mr-1" /> Add to Business Tasks
                                                </Button>
                                                <Button onClick={() => importToCRM(org)} variant={isImported ? 'secondary' : 'primary'} className="text-xs" disabled={isImported}>
                                                    {isImported ? <><Check size={12} className="mr-1" /> In CRM</> : <><Building2 size={12} className="mr-1" /> Import to CRM</>}
                                                </Button>
                                                <Button onClick={() => scrapeOrg(org)} variant="secondary" className="text-xs" disabled={isScraping}>
                                                    {isScraping ? <><Loader size={12} className="mr-1 animate-spin" /> Scraping...</> : <><RefreshCw size={12} className="mr-1" /> Scrape Website</>}
                                                </Button>
                                                {org.website && (
                                                    <a href={org.website} target="_blank" rel="noopener noreferrer">
                                                        <Button variant="secondary" className="text-xs"><Globe size={12} className="mr-1" /> Visit Website</Button>
                                                    </a>
                                                )}
                                            </div>
                                            {/* Scrape Result Inline Message */}
                                            {scrapeResult && scrapeResult.orgAcronym === org.acronym && (
                                                <div className={`mt-2 p-3 rounded-lg text-xs flex items-start gap-2 ${
                                                    scrapeResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'
                                                }`}>
                                                    {scrapeResult.success ? <Check size={14} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />}
                                                    <div className="flex-1">
                                                        <p className="font-bold">{scrapeResult.message}</p>
                                                        {scrapeResult.suggestion && (
                                                            <p className="mt-1 text-[10px] opacity-80">{scrapeResult.suggestion}</p>
                                                        )}
                                                        {!scrapeResult.success && scrapeResult.errorType === 'blocked' && (
                                                            <p className="mt-1 text-[10px] font-bold">
                                                                Tip: Use the LinkedIn parser on the Contacts tab to add people instead. Many PH org websites block automated access.
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button onClick={() => setScrapeResult(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* CONTACTS TAB */}
                                    {tab === 'contacts' && (
                                        <div className="space-y-3 pl-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-black text-gray-700 uppercase">LinkedIn & Scraped Contacts</h4>
                                                <Button onClick={() => { setShowLinkedInParser(org.acronym); setLinkedInText(''); setParsedContacts([]); }}
                                                    variant="primary" className="text-xs">
                                                    <Linkedin size={12} className="mr-1" /> Paste LinkedIn Data
                                                </Button>
                                            </div>

                                            {/* LinkedIn Parser Modal */}
                                            {showLinkedInParser === org.acronym && (
                                                <Card className="border-2 border-purple-300 bg-purple-50">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="font-black text-sm text-purple-800 flex items-center gap-2">
                                                            <Linkedin size={16} /> LinkedIn Sales Navigator Parser
                                                        </h4>
                                                        <button onClick={() => setShowLinkedInParser(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                                                    </div>
                                                    <p className="text-xs text-purple-700 mb-2">Paste your LinkedIn Sales Navigator search results below. The parser will extract names, titles, companies, and locations.</p>
                                                    <textarea
                                                        className="w-full border border-purple-200 rounded-lg p-3 text-xs h-40 mb-3 font-mono"
                                                        placeholder="Paste LinkedIn Sales Navigator text here...&#10;&#10;Example:&#10;1. Add John Smith to selection&#10;John Smith&#10;2nd degree connection&#10;President  Philippine Society of Mechanical Engineers&#10;Metro Manila..."
                                                        value={linkedInText}
                                                        onChange={e => setLinkedInText(e.target.value)}
                                                    />
                                                    <div className="flex gap-2 mb-3">
                                                        <Button onClick={handleParseLinkedIn} variant="primary" className="text-xs" disabled={!linkedInText.trim()}>
                                                            <ClipboardPaste size={12} className="mr-1" /> Parse Contacts
                                                        </Button>
                                                        {parsedContacts.length > 0 && (
                                                            <span className="text-xs font-bold text-green-700 flex items-center gap-1">
                                                                <Check size={12} /> Found {parsedContacts.length} contacts
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Parsed Results */}
                                                    {parsedContacts.length > 0 && (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-gray-600">
                                                                    {selectedContacts.size} of {parsedContacts.length} selected
                                                                </span>
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => setSelectedContacts(new Set(parsedContacts.map((_, i) => i)))}
                                                                        className="text-[10px] text-blue-600 font-bold hover:underline">Select All</button>
                                                                    <button onClick={() => setSelectedContacts(new Set())}
                                                                        className="text-[10px] text-gray-500 font-bold hover:underline">Deselect All</button>
                                                                </div>
                                                            </div>
                                                            <div className="max-h-60 overflow-y-auto space-y-1">
                                                                {parsedContacts.map((contact, i) => (
                                                                    <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${selectedContacts.has(i) ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-100'}`}>
                                                                        <input type="checkbox" checked={selectedContacts.has(i)}
                                                                            onChange={() => {
                                                                                setSelectedContacts(prev => {
                                                                                    const next = new Set(prev);
                                                                                    next.has(i) ? next.delete(i) : next.add(i);
                                                                                    return next;
                                                                                });
                                                                            }}
                                                                            className="mt-0.5" />
                                                                        <div className="flex-1">
                                                                            <div className="font-bold text-gray-800">{contact.name}</div>
                                                                            {contact.jobTitle && <div className="text-gray-600">{contact.jobTitle}{contact.company ? ` at ${contact.company}` : ''}</div>}
                                                                            {contact.location && <div className="text-gray-400 flex items-center gap-1"><MapPin size={10} />{contact.location}</div>}
                                                                            {contact.about && <div className="text-gray-500 mt-1 line-clamp-2">{contact.about}</div>}
                                                                        </div>
                                                                        {contact.connectionDegree && (
                                                                            <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{contact.connectionDegree}°</span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <Button onClick={() => saveLinkedInContacts(org.acronym)} variant="primary" className="text-xs w-full">
                                                                <UserPlus size={12} className="mr-1" /> Save {selectedContacts.size} Contacts to {org.acronym}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </Card>
                                            )}

                                            {/* Saved Contacts List */}
                                            {contacts.length > 0 ? (
                                                <div className="space-y-1">
                                                    {contacts.map((contact, i) => (
                                                        <div key={contact._id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-black text-xs flex-shrink-0">
                                                                {contact.name?.charAt(0) || '?'}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-bold text-sm text-gray-800">{contact.name}</div>
                                                                {contact.jobTitle && (
                                                                    <div className="text-xs text-gray-600">
                                                                        {contact.jobTitle}
                                                                        {contact.company && <span className="text-gray-400"> at {contact.company}</span>}
                                                                    </div>
                                                                )}
                                                                <div className="flex gap-3 mt-1">
                                                                    {contact.location && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><MapPin size={9} />{contact.location}</span>}
                                                                    {contact.tenure && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Calendar size={9} />{contact.tenure}</span>}
                                                                    {contact.connectionDegree && <span className="text-[10px] font-bold text-purple-500">{contact.connectionDegree}° connection</span>}
                                                                </div>
                                                                {contact.about && <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{contact.about}</p>}
                                                            </div>
                                                            <button onClick={() => deleteContact(contact._id)} className="text-gray-300 hover:text-red-500 p-1">
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 text-gray-400">
                                                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                                                    <p className="text-xs font-bold">No contacts yet for {org.acronym}</p>
                                                    <p className="text-[10px]">Use the LinkedIn parser above to add contacts</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* SCRAPED DATA TAB */}
                                    {tab === 'scraped' && (
                                        <div className="space-y-3 pl-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-black text-gray-700 uppercase">Website Scraped Data</h4>
                                                <Button onClick={() => scrapeOrg(org)} variant="primary" className="text-xs" disabled={isScraping}>
                                                    {isScraping ? <><Loader size={12} className="mr-1 animate-spin" /> Scraping...</> : <><RefreshCw size={12} className="mr-1" /> {scraped ? 'Re-scrape' : 'Scrape'} Website</>}
                                                </Button>
                                            </div>

                                            {/* Scrape Result for Scraped Data tab */}
                                            {scrapeResult && scrapeResult.orgAcronym === org.acronym && (
                                                <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                                                    scrapeResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'
                                                }`}>
                                                    {scrapeResult.success ? <Check size={14} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />}
                                                    <div className="flex-1">
                                                        <p className="font-bold">{scrapeResult.message}</p>
                                                        {scrapeResult.suggestion && <p className="mt-1 text-[10px] opacity-80">{scrapeResult.suggestion}</p>}
                                                        {!scrapeResult.success && scrapeResult.errorType === 'blocked' && (
                                                            <p className="mt-1 text-[10px] font-bold">Tip: Use the Contacts tab LinkedIn parser instead.</p>
                                                        )}
                                                    </div>
                                                    <button onClick={() => setScrapeResult(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                                                </div>
                                            )}

                                            {scraped ? (
                                                <div className="space-y-3">
                                                    <div className="text-[10px] text-gray-400">Scraped: {scraped.scrapedAt ? new Date(scraped.scrapedAt).toLocaleString() : 'Unknown'}{scraped.fetchMethod ? ` (via ${scraped.fetchMethod})` : ''}</div>

                                                    {/* Emails */}
                                                    {scraped.emails?.length > 0 && (
                                                        <div>
                                                            <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Mail size={10} /> Emails Found</h5>
                                                            <div className="flex flex-wrap gap-1">
                                                                {scraped.emails.map((email, i) => (
                                                                    <a key={i} href={`mailto:${email}`} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 font-mono">{email}</a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Phones */}
                                                    {scraped.phones?.length > 0 && (
                                                        <div>
                                                            <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Phone size={10} /> Phone Numbers</h5>
                                                            <div className="flex flex-wrap gap-1">
                                                                {scraped.phones.map((phone, i) => (
                                                                    <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded font-mono">{phone}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Addresses */}
                                                    {scraped.addresses?.length > 0 && (
                                                        <div>
                                                            <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><MapPin size={10} /> Addresses</h5>
                                                            {scraped.addresses.map((addr, i) => (
                                                                <p key={i} className="text-xs text-gray-700 bg-gray-50 p-2 rounded mb-1">{addr}</p>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* News */}
                                                    {scraped.news?.length > 0 && (
                                                        <div>
                                                            <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><FileText size={10} /> News & Announcements</h5>
                                                            <div className="space-y-1">
                                                                {scraped.news.map((item, i) => (
                                                                    <div key={i} className="bg-gray-50 p-2 rounded border border-gray-100">
                                                                        <div className="flex items-start justify-between">
                                                                            <p className="text-xs font-bold text-gray-800">{item.title}</p>
                                                                            {item.date && <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{item.date}</span>}
                                                                        </div>
                                                                        {item.excerpt && <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{item.excerpt}</p>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* People found */}
                                                    {scraped.people?.length > 0 && (
                                                        <div>
                                                            <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Users size={10} /> People Found on Website</h5>
                                                            <div className="space-y-1">
                                                                {scraped.people.map((person, i) => (
                                                                    <div key={i} className="text-xs bg-purple-50 p-2 rounded flex items-center gap-2">
                                                                        <span className="font-bold text-purple-800">{person.name}</span>
                                                                        {person.position && <span className="text-purple-600">— {person.position}</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Relevant keywords */}
                                                    {scraped.relevantKeywords && Object.keys(scraped.relevantKeywords).length > 0 && (
                                                        <div>
                                                            <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Star size={10} /> Relevant Topics Detected</h5>
                                                            <div className="flex flex-wrap gap-1">
                                                                {Object.entries(scraped.relevantKeywords).map(([cat, terms]) => (
                                                                    <span key={cat} className="text-[10px] bg-orange-50 text-orange-700 px-2 py-1 rounded font-bold">
                                                                        {cat}: {Array.isArray(terms) ? terms.join(', ') : terms}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Social Links */}
                                                    {scraped.socialLinks && Object.keys(scraped.socialLinks).length > 0 && (
                                                        <div>
                                                            <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Globe size={10} /> Social Media</h5>
                                                            <div className="flex flex-wrap gap-2">
                                                                {Object.entries(scraped.socialLinks).map(([platform, link]) => (
                                                                    <a key={platform} href={link} target="_blank" rel="noopener noreferrer"
                                                                        className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 font-bold capitalize flex items-center gap-1">
                                                                        <ExternalLink size={10} />{platform}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Important Links */}
                                                    {scraped.importantLinks?.length > 0 && (
                                                        <div>
                                                            <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><ExternalLink size={10} /> Important Pages</h5>
                                                            <div className="flex flex-wrap gap-1">
                                                                {scraped.importantLinks.map((link, i) => (
                                                                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                                                                        className="text-[10px] bg-gray-50 text-gray-700 px-2 py-1 rounded hover:bg-gray-100 border border-gray-200">
                                                                        {link.text}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* No significant data */}
                                                    {!scraped.emails?.length && !scraped.phones?.length && !scraped.news?.length && !scraped.people?.length && (
                                                        <div className="text-center py-4 text-gray-400">
                                                            <p className="text-xs font-bold">No structured data extracted from website</p>
                                                            <p className="text-[10px]">The website may block scraping or use JavaScript rendering</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 text-gray-400">
                                                    <Database size={32} className="mx-auto mb-2 opacity-50" />
                                                    <p className="text-xs font-bold">No scraped data yet for {org.acronym}</p>
                                                    <p className="text-[10px]">Click "Scrape Website" to fetch latest information</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* NOTES TAB */}
                                    {tab === 'notes' && (
                                        <div className="space-y-3 pl-2">
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-1">Your Notes for {org.acronym}</h4>
                                            <textarea className="w-full border border-gray-200 rounded-lg p-3 text-xs h-32"
                                                placeholder="Add your notes about engagement, contacts made, meeting outcomes, status of relationship..."
                                                defaultValue={note}
                                                onBlur={e => saveNote(org.acronym, e.target.value)} />
                                        </div>
                                    )}
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
