import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../data/constants.jsx';
import {
    Ship, Package, FileText, Shield, AlertCircle, CheckCircle, Calendar, Clock,
    DollarSign, Building, Globe, ChevronDown, ChevronUp, Plus, Trash2, Search,
    Truck, Anchor, AlertTriangle, BookOpen, Users, Target, MapPin, Phone,
    Mail, ExternalLink, Save, Briefcase, ClipboardList, Archive, Scale,
    Loader, Check, X, Hash, Tag, Box, Warehouse
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, getDocs, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

// ═══════════════════════════════════════════════════════════════════════
// PHILIPPINE IMPORT/EXPORT COMPLIANCE & LOGISTICS
// Complete guide for BOI-SIPP registered enterprise (Karnot)
// ═══════════════════════════════════════════════════════════════════════

// ─── CUSTOMS BROKER MONTHLY TASKS ─────────────────────────────────────
const BROKER_TASKS = [
    { category: 'Import Documentation & Clearance', icon: FileText, tasks: [
        { task: 'Prepare and file Import Entry/Internal Revenue Declaration (IEIRD)', frequency: 'Per shipment', estHours: 3, importance: 'CRITICAL', details: 'Required for every import. Must be filed within 30 days of vessel discharge. Late filing = surcharges + potential seizure.' },
        { task: 'Obtain Import Commodity Clearance (ICC) from DTI-BPS for regulated products', frequency: 'Per product type', estHours: 4, importance: 'CRITICAL', details: 'HVAC/R equipment requires ICC before customs release. Karnot products (heat pumps, chillers, AC) are regulated.' },
        { task: 'Secure DOE energy labeling clearance / PELP registration for imported units', frequency: 'Per model', estHours: 6, importance: 'CRITICAL', details: 'No DOE energy label = no customs release. Must be secured BEFORE first shipment of each model.' },
        { task: 'File Single Administrative Document (SAD) with BOC', frequency: 'Per shipment', estHours: 2, importance: 'CRITICAL', details: 'Electronic filing through E2M system. Contains all shipment details, HS codes, declared values.' },
        { task: 'Coordinate pre-arrival processing with BOC (advance lodgment)', frequency: 'Per shipment', estHours: 1, importance: 'HIGH', details: 'Advance lodgment can cut clearance time from 5-7 days to 1-2 days.' },
        { task: 'Obtain Bureau of Customs Assessment Notice and pay duties/taxes', frequency: 'Per shipment', estHours: 1, importance: 'CRITICAL', details: 'Must be paid within clearance period. Delayed payment = storage charges + surcharges.' },
        { task: 'Coordinate physical examination if flagged (Green/Yellow/Red lane)', frequency: 'As needed', estHours: 4, importance: 'HIGH', details: 'Red lane = physical inspection. Yellow = document review. Green = automatic release. BOI-registered may get preferential lane.' },
        { task: 'Obtain Delivery Permit / Gate Pass from port', frequency: 'Per shipment', estHours: 0.5, importance: 'HIGH', details: 'Final document needed to physically release cargo from port/warehouse.' },
    ]},
    { category: 'BOI-SIPP Import Privileges', icon: Shield, tasks: [
        { task: 'Process duty-free importation of capital equipment under BOI-SIPP', frequency: 'Per shipment', estHours: 4, importance: 'CRITICAL', details: 'BOI registration grants duty exemption on capital equipment. Must file BOI Authority to Import (ATI) first.' },
        { task: 'Obtain BOI Authority to Import (ATI) for each duty-free shipment', frequency: 'Per shipment', estHours: 3, importance: 'CRITICAL', details: 'ATI must be secured from BOI BEFORE the shipment arrives. No ATI = full duties apply.' },
        { task: 'File BOI Indorsement for duty-free raw materials / spare parts', frequency: 'Per shipment', estHours: 2, importance: 'HIGH', details: 'Raw materials and spare parts for registered activity may qualify for tax credits or duty exemption.' },
        { task: 'Monitor BOI export obligation compliance (70% export requirement)', frequency: 'Monthly', estHours: 2, importance: 'CRITICAL', details: 'SIPP requires minimum 70% of production for export. Track actual vs required export ratio monthly.' },
        { task: 'Prepare BOI Annual Report of import/export activities', frequency: 'Annual (Q1)', estHours: 8, importance: 'CRITICAL', details: 'Comprehensive report of all imports (duty-free + dutiable), exports, and local sales. Due within 90 days of fiscal year end.' },
        { task: 'Track and report on disposal/transfer of duty-free equipment', frequency: 'As needed', estHours: 2, importance: 'HIGH', details: 'Duty-free equipment cannot be sold/transferred without BOI approval. Violation = payment of original duties + penalties.' },
    ]},
    { category: 'Export Documentation', icon: Ship, tasks: [
        { task: 'Prepare Export Declaration (ED) via BOC E2M system', frequency: 'Per shipment', estHours: 2, importance: 'CRITICAL', details: 'All exports must be declared. Required for BOI export compliance tracking and VAT zero-rating.' },
        { task: 'Obtain Certificate of Origin (CO) from DTI or Philippine Chamber', frequency: 'Per shipment', estHours: 1, importance: 'HIGH', details: 'Required for preferential tariff treatment in destination country. ASEAN = Form D, RCEP = Form RCEP.' },
        { task: 'Prepare Commercial Invoice, Packing List, Bill of Lading/Airway Bill', frequency: 'Per shipment', estHours: 1, importance: 'CRITICAL', details: 'Core shipping documents. Must match ED exactly. Discrepancies = customs holds at both ends.' },
        { task: 'Coordinate export inspection if required (DA, DENR, etc.)', frequency: 'As needed', estHours: 2, importance: 'MEDIUM', details: 'Some products require export clearance from regulatory agencies. HVAC/R generally exempt unless containing regulated refrigerants.' },
        { task: 'File BIR VAT zero-rating documentation for exports', frequency: 'Per shipment', estHours: 1, importance: 'HIGH', details: 'Export sales are VAT zero-rated. Must file proper documentation to claim zero-rating and avoid BIR issues.' },
        { task: 'Prepare proforma invoice / quotation for international customers', frequency: 'As needed', estHours: 1, importance: 'MEDIUM', details: 'Must comply with Incoterms 2020. Include HS code, country of origin, weight/dimensions.' },
    ]},
    { category: 'HS Code & Tariff Management', icon: Hash, tasks: [
        { task: 'Classify products under correct HS Code (Section XVI, Chapter 84/85)', frequency: 'Per new product', estHours: 3, importance: 'CRITICAL', details: 'Wrong HS code = wrong duty rate + potential penalties + seizure. HVAC/R typically under 8415 (AC), 8418 (refrigeration), 8419 (heat exchange).' },
        { task: 'Verify duty rates under ATIGA (ASEAN), RCEP, or other FTAs', frequency: 'Per shipment', estHours: 1, importance: 'HIGH', details: 'FTA rates can be 0-5% vs MFN rates of 10-30%. Massive cost savings. Need Certificate of Origin.' },
        { task: 'Monitor tariff changes and new rulings from Tariff Commission', frequency: 'Monthly', estHours: 1, importance: 'MEDIUM', details: 'Tariff Commission issues rulings that can reclassify products. Stay updated to avoid surprise duties.' },
        { task: 'File advance ruling request with BOC for complex classifications', frequency: 'As needed', estHours: 4, importance: 'MEDIUM', details: 'For new/complex products, get advance ruling to lock in HS classification before importing.' },
        { task: 'Maintain HS code database for all Karnot product lines', frequency: 'Ongoing', estHours: 1, importance: 'HIGH', details: 'Document HS code, duty rate, FTA eligibility for every product model. Critical reference for all shipments.' },
    ]},
    { category: 'Compliance & Regulatory Permits', icon: Scale, tasks: [
        { task: 'Maintain valid Import Clearance Certificate from DENR-EMB for HFC refrigerants', frequency: 'Annual', estHours: 4, importance: 'CRITICAL', details: 'Philippines is Kigali Amendment signatory. HFC imports require DENR clearance. Phase-down schedule applies.' },
        { task: 'Renew Customs Broker License (for in-house broker)', frequency: 'Annual (March)', estHours: 2, importance: 'CRITICAL', details: 'PRC-licensed customs broker must maintain active license. CPD units required for renewal.' },
        { task: 'File monthly Summary of Importation/Exportation with BOI', frequency: 'Monthly', estHours: 2, importance: 'HIGH', details: 'BOI monitors import/export activity of registered enterprises. Must be filed within 15 days of month-end.' },
        { task: 'Maintain updated accreditation with BOC (Importer Accreditation)', frequency: 'Annual', estHours: 2, importance: 'CRITICAL', details: 'BOC requires importer accreditation. Without it, shipments will be held. Renewal required annually.' },
        { task: 'Monitor and comply with CMTA (Customs Modernization and Tariff Act)', frequency: 'Ongoing', estHours: 1, importance: 'HIGH', details: 'RA 10863 (CMTA) governs all customs activities. Recent amendments may affect procedures.' },
        { task: 'File FDA clearance for water treatment equipment (if applicable)', frequency: 'Per product', estHours: 3, importance: 'MEDIUM', details: 'Water treatment/purification equipment may require FDA-Philippines clearance.' },
    ]},
    { category: 'Freight & Logistics Coordination', icon: Truck, tasks: [
        { task: 'Negotiate freight rates with shipping lines / forwarders (FCL vs LCL)', frequency: 'Quarterly', estHours: 3, importance: 'HIGH', details: 'HVAC/R equipment is heavy. FCL usually more cost-effective for large orders. Get quotes from 3+ forwarders.' },
        { task: 'Arrange marine cargo insurance for each shipment', frequency: 'Per shipment', estHours: 0.5, importance: 'HIGH', details: 'CIF/CIP terms require seller to insure. Even FOB/FCA — insure anyway. HVAC equipment is high-value.' },
        { task: 'Coordinate inland transport from port to warehouse/customer site', frequency: 'Per shipment', estHours: 1, importance: 'MEDIUM', details: 'Arrange trucking from Manila/Cebu port to final destination. Heavy equipment may need flatbed/crane.' },
        { task: 'Track shipments and manage ETA updates', frequency: 'Per shipment', estHours: 0.5, importance: 'MEDIUM', details: 'Monitor vessel schedules, port congestion, weather delays. Communicate ETAs to sales team.' },
        { task: 'Manage bonded warehouse if needed (for duty-free storage)', frequency: 'As needed', estHours: 2, importance: 'MEDIUM', details: 'BOI goods can be stored in bonded warehouse before duty-free release. Saves duties on unsold inventory.' },
    ]},
];

// ─── KEY HS CODES FOR KARNOT PRODUCTS ──────────────────────────────────
const KARNOT_HS_CODES = [
    { hsCode: '8415.10', description: 'Window/wall type AC units, self-contained', mfnRate: '15%', atigaRate: '0%', rcepRate: '5%', products: 'Split-type AC, window-type AC' },
    { hsCode: '8415.20', description: 'AC units for motor vehicles', mfnRate: '15%', atigaRate: '0%', rcepRate: '5%', products: 'Vehicle AC systems' },
    { hsCode: '8415.81', description: 'AC incorporating refrigerating unit and valve (heat pumps)', mfnRate: '10%', atigaRate: '0%', rcepRate: '5%', products: 'Heat pumps, VRF systems, chillers' },
    { hsCode: '8415.82', description: 'AC incorporating refrigerating unit, other', mfnRate: '10%', atigaRate: '0%', rcepRate: '5%', products: 'Packaged AC, rooftop units' },
    { hsCode: '8415.83', description: 'AC not incorporating refrigerating unit', mfnRate: '10%', atigaRate: '0%', rcepRate: '5%', products: 'Fan coil units, AHUs' },
    { hsCode: '8418.10', description: 'Combined refrigerator-freezers', mfnRate: '15%', atigaRate: '0%', rcepRate: '5%', products: 'Commercial refrigerator-freezers' },
    { hsCode: '8418.40', description: 'Freezers, upright type', mfnRate: '15%', atigaRate: '0%', rcepRate: '5%', products: 'Industrial freezers' },
    { hsCode: '8418.50', description: 'Refrigerating/freezing display counters, cabinets', mfnRate: '15%', atigaRate: '0%', rcepRate: '5%', products: 'Display coolers, cold rooms' },
    { hsCode: '8418.61', description: 'Heat pumps (other than AC of 8415)', mfnRate: '3%', atigaRate: '0%', rcepRate: '0%', products: 'Water-source heat pumps, geothermal HP' },
    { hsCode: '8418.69', description: 'Other refrigerating/freezing equipment', mfnRate: '3%', atigaRate: '0%', rcepRate: '0%', products: 'Industrial chillers, condensing units' },
    { hsCode: '8419.50', description: 'Heat exchange units', mfnRate: '3%', atigaRate: '0%', rcepRate: '0%', products: 'Heat exchangers, plate HX, shell & tube' },
    { hsCode: '8419.89', description: 'Other machinery for treatment of materials by temperature change', mfnRate: '3%', atigaRate: '0%', rcepRate: '0%', products: 'Industrial process heating, waste heat recovery' },
    { hsCode: '8414.30', description: 'Compressors for refrigerating equipment', mfnRate: '3%', atigaRate: '0%', rcepRate: '0%', products: 'Scroll, screw, reciprocating compressors' },
    { hsCode: '8414.80', description: 'Air pumps, fans, ventilation hoods', mfnRate: '3%', atigaRate: '0%', rcepRate: '0%', products: 'Blowers, exhaust fans, ventilation' },
    { hsCode: '9032.10', description: 'Thermostats', mfnRate: '1%', atigaRate: '0%', rcepRate: '0%', products: 'Smart thermostats, controllers' },
    { hsCode: '9032.89', description: 'Other automatic regulating instruments', mfnRate: '1%', atigaRate: '0%', rcepRate: '0%', products: 'BMS controllers, IoT sensors, smart controls' },
    { hsCode: '2903.39', description: 'Fluorinated hydrocarbons (HFCs)', mfnRate: '3%', atigaRate: '0%', rcepRate: '0%', products: 'R-410A, R-32, R-134a refrigerants' },
    { hsCode: '2903.71', description: 'Chlorodifluoromethane (R-22)', mfnRate: '10%', atigaRate: '0%', rcepRate: '5%', products: 'R-22 (HCFC, being phased out)' },
];

// ─── KEY LAWS & REGULATIONS ────────────────────────────────────────────
const KEY_REGULATIONS = [
    { law: 'RA 10863 (CMTA)', name: 'Customs Modernization and Tariff Act', relevance: 'Core customs law. Governs all import/export procedures, penalties, valuation methods.' },
    { law: 'RA 11534 (CREATE MORE)', name: 'Corporate Recovery and Tax Incentives for Enterprises to Maximize Opportunities for Reinvigorating the Economy', relevance: 'Tax incentives framework. BOI-SIPP benefits including duty-free imports of capital equipment.' },
    { law: 'RA 11285', name: 'Energy Efficiency and Conservation Act', relevance: 'Mandates energy labeling (PELP) for HVAC/R imports. No label = no customs release.' },
    { law: 'EO 226', name: 'Omnibus Investments Code', relevance: 'BOI registration framework. Defines import privileges, export requirements, reporting obligations.' },
    { law: 'RA 7394', name: 'Consumer Act of the Philippines', relevance: 'DTI product standards. ICC (Import Commodity Clearance) requirement for regulated products.' },
    { law: 'Montreal Protocol / Kigali Amendment', name: 'Ozone Depletion / HFC Phase-Down', relevance: 'Controls import of refrigerants (HCFCs phased out, HFCs being phased down). DENR-EMB clearance needed.' },
    { law: 'RA 9513', name: 'Renewable Energy Act', relevance: 'Tax incentives for renewable energy equipment imports. Heat pumps may qualify.' },
    { law: 'CAO 02-2016', name: 'BOC Rules on Customs Valuation', relevance: 'How BOC determines dutiable value. Transaction value method primary, fallback methods apply.' },
];

// ─── REQUIRED PROFESSIONAL LICENSES ────────────────────────────────────
const REQUIRED_PROFESSIONALS = [
    {
        role: 'Licensed Customs Broker (LCB)',
        requirement: 'MANDATORY — Only PRC-licensed customs brokers can sign and file import/export entries',
        license: 'Professional Regulation Commission (PRC) — Customs Broker License',
        scope: 'File IEIRD, SAD, Export Declarations. Represent company at BOC. Sign all customs documents.',
        estimatedRetainer: '₱25,000-50,000/month for regular imports, or ₱3,000-8,000 per shipment',
        findWhere: 'Chamber of Customs Brokers (CCBI), PHILCABOA (Philippine Association of Customs Brokers)',
        criticalNote: 'Filing customs entries without a licensed broker is ILLEGAL under RA 9280 (Customs Brokers Act).',
        fbSearchTerms: ['customs broker Philippines', 'licensed customs broker Manila', 'CCBI customs broker', 'customs brokerage services Philippines', 'BOC accredited broker'],
        fbPages: [
            { name: 'Chamber of Customs Brokers Inc (CCBI)', type: 'Association', note: 'Main professional body — message for member directory' },
            { name: 'Philippine Association of Customs Brokers (PHILCABOA)', type: 'Association', note: 'Ask for brokers experienced with BOI-registered importers' },
            { name: 'Bureau of Customs Philippines', type: 'Government', note: 'Official BOC page — posts updates on regulations, CAOs, advisories' },
            { name: 'PRC - Professional Regulation Commission', type: 'Government', note: 'Verify broker license numbers here' },
        ],
        verifyHow: 'ALWAYS verify PRC license at prc.gov.ph before engaging. Ask for: PRC ID number, BOC accreditation, years of experience with BOI enterprises.',
    },
    {
        role: 'Freight Forwarder / Logistics Partner',
        requirement: 'RECOMMENDED — Handles physical logistics, warehousing, and inland transport',
        license: 'MARINA accreditation for sea freight; CAB accreditation for air freight',
        scope: 'Book cargo space, arrange container loading, manage port operations, coordinate trucking.',
        estimatedRetainer: 'Project-based. Sea freight Manila-SG: $600-1,200/20ft. Air freight: $3-8/kg.',
        findWhere: 'Supply Chain Management Association of the Philippines (SCMAP), PhilExport',
        criticalNote: 'Choose forwarder with experience in heavy industrial equipment (HVAC systems are oversized/heavy).',
        fbSearchTerms: ['freight forwarder Philippines', 'logistics company Manila', 'SCMAP Philippines', 'cargo shipping Philippines', 'international freight Manila Cebu'],
        fbPages: [
            { name: 'SCMAP - Supply Chain Management Association of the Philippines', type: 'Association', note: 'Industry body — can recommend vetted forwarders' },
            { name: 'PhilExport', type: 'Association', note: 'Philippine Exporters Confederation — members include logistics providers' },
            { name: 'MARINA Philippines', type: 'Government', note: 'Verify sea freight accreditation' },
            { name: 'Asian Terminals Inc', type: 'Port Operator', note: 'Manila South Harbor — for port operations contacts' },
        ],
        verifyHow: 'Ask for: MARINA/CAB accreditation, cargo insurance coverage, references from similar-sized importers, experience with oversized industrial equipment.',
    },
    {
        role: 'Import/Export Compliance Officer (In-house)',
        requirement: 'STRONGLY RECOMMENDED — Full-time staff to manage daily compliance',
        license: 'No specific license required, but customs broker license preferred',
        scope: 'Manage BOI reporting, track shipments, maintain HS code database, coordinate with broker and forwarder.',
        estimatedRetainer: '₱30,000-60,000/month salary (depending on experience)',
        findWhere: 'LinkedIn, Jobstreet, Indeed PH — search "Import Export Coordinator" or "Customs Compliance Officer"',
        criticalNote: 'As volume grows, in-house capability is essential. One mistake at customs can cost more than a year of salary.',
        fbSearchTerms: ['import export jobs Philippines', 'customs compliance officer hiring', 'logistics coordinator Manila'],
        fbPages: [
            { name: 'Jobstreet Philippines', type: 'Job Board', note: 'Post job ad — most PH applicants still use Jobstreet + FB groups' },
            { name: 'Indeed Philippines Jobs', type: 'Job Board', note: 'Secondary job board' },
            { name: 'Import Export Philippines (FB Groups)', type: 'FB Group', note: 'Multiple groups with 50K+ members — post "hiring" to find candidates' },
            { name: 'Customs Brokers Philippines (FB Groups)', type: 'FB Group', note: 'Licensed brokers looking for employment — great talent pool' },
        ],
        verifyHow: 'Look for: Previous experience at BOI/PEZA-registered company, knowledge of E2M system, familiarity with HS classification. Licensed customs broker is ideal.',
    },
    {
        role: 'Trade Lawyer (Tariff & Customs Specialist)',
        requirement: 'RECOMMENDED — For complex rulings, disputes, and BOI compliance',
        license: 'Philippine Bar (IBP member) with specialization in trade law',
        scope: 'Advance rulings, customs disputes, BOI compliance issues, FTA certificate disputes.',
        estimatedRetainer: '₱15,000-30,000/month retainer or ₱5,000-15,000/hour for specialized work',
        findWhere: 'Integrated Bar of the Philippines (IBP), referrals from customs brokers',
        criticalNote: 'Only needed when you face disputes, audits, or complex classifications. Not needed day-to-day initially.',
        fbSearchTerms: ['trade lawyer Philippines', 'customs law firm Manila', 'BOI legal consultant', 'tariff specialist lawyer Philippines'],
        fbPages: [
            { name: 'Integrated Bar of the Philippines (IBP)', type: 'Association', note: 'Official bar — can verify membership and recommend specialists' },
            { name: 'Philippine Chamber of Commerce and Industry (PCCI)', type: 'Association', note: 'Has legal committee — can recommend trade lawyers' },
            { name: 'DTI Philippines', type: 'Government', note: 'Dept of Trade & Industry — for trade regulation queries' },
        ],
        verifyHow: 'Verify IBP membership. Ask for: Case history with customs disputes, BOI compliance experience, familiarity with CREATE MORE Act.',
    },
];

// ─── KEY ASSOCIATIONS & BODIES (FACEBOOK-BASED) ──────────────────────
const PH_ASSOCIATIONS = [
    { name: 'Bureau of Customs (BOC)', type: 'Government', platform: 'Facebook + Website', fbSearch: 'Bureau of Customs Philippines', website: 'customs.gov.ph', purpose: 'All customs clearance, import/export entries, regulations, CAOs', priority: 'CRITICAL' },
    { name: 'Board of Investments (BOI)', type: 'Government', platform: 'Facebook + Website', fbSearch: 'Board of Investments Philippines', website: 'boi.gov.ph', purpose: 'SIPP registration, ATI applications, annual reporting, tax incentives', priority: 'CRITICAL' },
    { name: 'DTI - Bureau of Philippine Standards', type: 'Government', platform: 'Website', fbSearch: 'DTI Philippines', website: 'bps.dti.gov.ph', purpose: 'Import Commodity Clearance (ICC) for HVAC/R products', priority: 'CRITICAL' },
    { name: 'DOE - Department of Energy', type: 'Government', platform: 'Facebook + Website', fbSearch: 'Department of Energy Philippines', website: 'doe.gov.ph', purpose: 'Energy labeling (PELP) for AC/refrigeration equipment', priority: 'CRITICAL' },
    { name: 'DENR-EMB', type: 'Government', platform: 'Facebook + Website', fbSearch: 'DENR EMB Philippines', website: 'emb.gov.ph', purpose: 'Refrigerant import clearance (HCFCs, HFCs), Kigali compliance', priority: 'HIGH' },
    { name: 'PRC - Professional Regulation Commission', type: 'Government', platform: 'Website', fbSearch: 'PRC Philippines', website: 'prc.gov.ph', purpose: 'Verify customs broker license numbers', priority: 'HIGH' },
    { name: 'CCBI - Chamber of Customs Brokers', type: 'Association', platform: 'Facebook Only', fbSearch: 'Chamber of Customs Brokers Inc', website: 'N/A — Facebook page only', purpose: 'Find licensed customs brokers, industry updates, member directory', priority: 'HIGH' },
    { name: 'PHILCABOA', type: 'Association', platform: 'Facebook Only', fbSearch: 'PHILCABOA customs brokers', website: 'N/A — Facebook page only', purpose: 'Philippine Association of Customs Brokers — alternative to CCBI', priority: 'HIGH' },
    { name: 'SCMAP', type: 'Association', platform: 'Facebook + Website', fbSearch: 'SCMAP Philippines', website: 'scmap.org', purpose: 'Supply chain/logistics professionals, forwarder recommendations', priority: 'MEDIUM' },
    { name: 'PhilExport', type: 'Association', platform: 'Facebook + Website', fbSearch: 'PhilExport', website: 'philexport.ph', purpose: 'Exporter community, trade fairs, logistics partner recommendations', priority: 'MEDIUM' },
    { name: 'PCCI - PH Chamber of Commerce', type: 'Association', platform: 'Facebook + Website', fbSearch: 'Philippine Chamber of Commerce', website: 'philippinechamber.com', purpose: 'Broad business network, trade events, legal referrals', priority: 'MEDIUM' },
    { name: 'Tariff Commission', type: 'Government', platform: 'Website', fbSearch: 'Tariff Commission Philippines', website: 'tariffcommission.gov.ph', purpose: 'HS code rulings, tariff rate inquiries, safeguard investigations', priority: 'MEDIUM' },
    { name: 'MARINA', type: 'Government', platform: 'Facebook + Website', fbSearch: 'MARINA Philippines', website: 'marina.gov.ph', purpose: 'Maritime industry, verify freight forwarder accreditation', priority: 'LOW' },
];

// ─── IMPORT PROCESS FLOWCHART DATA ─────────────────────────────────────
const IMPORT_PROCESS_STEPS = [
    { step: 1, title: 'Purchase Order & Proforma Invoice', duration: '1-3 days', who: 'Procurement', details: 'Issue PO to supplier. Agree on Incoterms (FOB/CIF/DDP), payment terms (LC/TT/DA), delivery schedule.' },
    { step: 2, title: 'BOI Authority to Import (ATI)', duration: '5-15 days', who: 'Compliance Officer / Broker', details: 'If duty-free under BOI-SIPP: file ATI application with BOI BEFORE shipment. Attach PO, product specs, BOI registration.' },
    { step: 3, title: 'Supplier Ships Goods', duration: '7-30 days', who: 'Supplier / Forwarder', details: 'Supplier ships. Forwarder provides tracking. Obtain shipping docs: BL/AWB, commercial invoice, packing list, CO.' },
    { step: 4, title: 'Advance Lodgment', duration: '1-3 days before arrival', who: 'Customs Broker', details: 'File SAD electronically before vessel arrival. Speeds up clearance significantly.' },
    { step: 5, title: 'Vessel Arrival & BOC Assessment', duration: '1-5 days', who: 'Customs Broker', details: 'BOC processes entry. Assessment of duties/taxes (or duty-free verification for BOI). Lane assignment: Green/Yellow/Red.' },
    { step: 6, title: 'ICC / DOE Clearance Check', duration: '1-3 days (if pre-secured)', who: 'Compliance Officer', details: 'Present ICC certificate and DOE energy label clearance. Without these, cargo WILL NOT be released.' },
    { step: 7, title: 'Payment of Duties & Taxes', duration: '1 day', who: 'Finance / Broker', details: 'Pay assessed duties, VAT (12%), and other charges via authorized agent bank.' },
    { step: 8, title: 'Physical Exam (if flagged)', duration: '1-3 days', who: 'Broker + BOC Examiner', details: 'If Yellow/Red lane: BOC examiner inspects cargo. Broker must be present. Discrepancies = holds/penalties.' },
    { step: 9, title: 'Release & Gate Pass', duration: '1 day', who: 'Broker', details: 'BOC issues release order. Port authority issues gate pass. Cargo physically released.' },
    { step: 10, title: 'Inland Delivery', duration: '1-3 days', who: 'Forwarder / Trucking', details: 'Transport from port to warehouse/customer site. Arrange crane/equipment for heavy HVAC units.' },
];

const IMPORTANCE_COLORS = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-200',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
    MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
    LOW: 'bg-gray-100 text-gray-600 border-gray-200',
};

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function ImportExportCompliancePage({ user }) {
    const [activeTab, setActiveTab] = useState('broker');
    const [expandedCategories, setExpandedCategories] = useState(new Set(['Import Documentation & Clearance']));
    const [completedTasks, setCompletedTasks] = useState({});
    const [customTasks, setCustomTasks] = useState([]);
    const [expandedPro, setExpandedPro] = useState(null);
    const [shipments, setShipments] = useState([]);
    const [showAddShipment, setShowAddShipment] = useState(false);
    const [newShipment, setNewShipment] = useState({ reference: '', supplier: '', description: '', hsCode: '', incoterm: 'FOB', status: 'ordered', etd: '', eta: '', value: '', dutyFree: false, notes: '' });
    const [hsSearch, setHsSearch] = useState('');
    const [brokerContacts, setBrokerContacts] = useState([]);
    const [showAddContact, setShowAddContact] = useState(false);
    const [newContact, setNewContact] = useState({ name: '', company: '', role: 'customs_broker', phone: '', email: '', fbPage: '', prcLicense: '', notes: '', status: 'prospect', rating: 0 });
    const [contactSearch, setContactSearch] = useState('');

    // Load data from Firestore
    useEffect(() => {
        if (!user?.uid) return;
        const unsubs = [];

        unsubs.push(onSnapshot(
            query(collection(db, "users", user.uid, "import_export_tasks")),
            snap => {
                const data = {};
                snap.docs.forEach(d => { data[d.id] = d.data(); });
                setCompletedTasks(data);
            }
        ));

        unsubs.push(onSnapshot(
            query(collection(db, "users", user.uid, "shipments"), orderBy("createdAt", "desc")),
            snap => {
                setShipments(snap.docs.map(d => ({ _id: d.id, ...d.data() })));
            }
        ));

        unsubs.push(onSnapshot(
            query(collection(db, "users", user.uid, "custom_import_tasks")),
            snap => {
                setCustomTasks(snap.docs.map(d => ({ _id: d.id, ...d.data() })));
            }
        ));

        unsubs.push(onSnapshot(
            query(collection(db, "users", user.uid, "broker_contacts"), orderBy("createdAt", "desc")),
            snap => {
                setBrokerContacts(snap.docs.map(d => ({ _id: d.id, ...d.data() })));
            }
        ));

        return () => unsubs.forEach(u => u());
    }, [user?.uid]);

    // Toggle task completion
    const toggleTask = async (taskId) => {
        if (!user?.uid) return;
        const ref = doc(db, "users", user.uid, "import_export_tasks", taskId);
        if (completedTasks[taskId]) {
            await deleteDoc(ref);
        } else {
            await setDoc(ref, { completed: true, completedAt: serverTimestamp() });
        }
    };

    // Add shipment
    const addShipment = async () => {
        if (!user?.uid || !newShipment.reference) return;
        await addDoc(collection(db, "users", user.uid, "shipments"), {
            ...newShipment,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        setNewShipment({ reference: '', supplier: '', description: '', hsCode: '', incoterm: 'FOB', status: 'ordered', etd: '', eta: '', value: '', dutyFree: false, notes: '' });
        setShowAddShipment(false);
    };

    // Update shipment status
    const updateShipmentStatus = async (id, status) => {
        if (!user?.uid) return;
        await updateDoc(doc(db, "users", user.uid, "shipments", id), { status, updatedAt: serverTimestamp() });
    };

    // Delete shipment
    const deleteShipment = async (id) => {
        if (!user?.uid) return;
        if (confirm('Delete this shipment record?')) {
            await deleteDoc(doc(db, "users", user.uid, "shipments", id));
        }
    };

    // Add custom task
    const addCustomTask = async (category) => {
        if (!user?.uid) return;
        const taskName = prompt('Enter task name:');
        if (!taskName) return;
        await addDoc(collection(db, "users", user.uid, "custom_import_tasks"), {
            task: taskName, category, frequency: 'As needed', estHours: 1, importance: 'MEDIUM',
            createdAt: serverTimestamp()
        });
    };

    // Add broker/forwarder contact
    const addBrokerContact = async () => {
        if (!user?.uid || !newContact.name) return;
        await addDoc(collection(db, "users", user.uid, "broker_contacts"), {
            ...newContact,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        setNewContact({ name: '', company: '', role: 'customs_broker', phone: '', email: '', fbPage: '', prcLicense: '', notes: '', status: 'prospect', rating: 0 });
        setShowAddContact(false);
    };

    // Update contact
    const updateContactStatus = async (id, status) => {
        if (!user?.uid) return;
        await updateDoc(doc(db, "users", user.uid, "broker_contacts", id), { status, updatedAt: serverTimestamp() });
    };

    // Delete contact
    const deleteBrokerContact = async (id) => {
        if (!user?.uid) return;
        if (confirm('Delete this contact?')) {
            await deleteDoc(doc(db, "users", user.uid, "broker_contacts", id));
        }
    };

    // Update contact rating
    const updateContactRating = async (id, rating) => {
        if (!user?.uid) return;
        await updateDoc(doc(db, "users", user.uid, "broker_contacts", id), { rating, updatedAt: serverTimestamp() });
    };

    // Filtered contacts
    const filteredContacts = contactSearch
        ? brokerContacts.filter(c => c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || c.company?.toLowerCase().includes(contactSearch.toLowerCase()) || c.role?.includes(contactSearch.toLowerCase()))
        : brokerContacts;

    // Filtered HS codes
    const filteredHS = hsSearch
        ? KARNOT_HS_CODES.filter(h => h.hsCode.includes(hsSearch) || h.description.toLowerCase().includes(hsSearch.toLowerCase()) || h.products.toLowerCase().includes(hsSearch.toLowerCase()))
        : KARNOT_HS_CODES;

    const totalTasks = BROKER_TASKS.reduce((sum, cat) => sum + cat.tasks.length, 0);
    const completedCount = Object.keys(completedTasks).length;
    const criticalTasks = BROKER_TASKS.reduce((sum, cat) => sum + cat.tasks.filter(t => t.importance === 'CRITICAL').length, 0);

    const TABS = [
        { id: 'broker', label: 'Customs Broker Tasks', icon: FileText },
        { id: 'process', label: 'Import Process Flow', icon: Ship },
        { id: 'hscodes', label: 'HS Codes & Tariffs', icon: Hash },
        { id: 'shipments', label: `Shipment Tracker (${shipments.length})`, icon: Package },
        { id: 'directory', label: `Contacts Directory (${brokerContacts.length})`, icon: ClipboardList },
        { id: 'professionals', label: 'Find Professionals', icon: Users },
        { id: 'regulations', label: 'Key Laws', icon: Scale },
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-800 to-indigo-700 text-white rounded-2xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Ship size={28} />
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tight">Import / Export Compliance & Logistics</h1>
                            <p className="text-sm text-blue-200 font-bold">Bureau of Customs, BOI-SIPP Privileges, Licensed Broker Tasks, Shipment Tracking</p>
                        </div>
                    </div>
                    <div className="flex gap-4 text-center">
                        <div><div className="text-3xl font-black">{totalTasks}</div><div className="text-[10px] text-blue-200 font-bold uppercase">Tasks</div></div>
                        <div><div className="text-3xl font-black text-red-300">{criticalTasks}</div><div className="text-[10px] text-blue-200 font-bold uppercase">Critical</div></div>
                        <div><div className="text-3xl font-black text-green-300">{completedCount}</div><div className="text-[10px] text-blue-200 font-bold uppercase">Done</div></div>
                        <div><div className="text-3xl font-black text-yellow-300">{shipments.length}</div><div className="text-[10px] text-blue-200 font-bold uppercase">Shipments</div></div>
                    </div>
                </div>
            </div>

            {/* Critical Warning */}
            <Card className="bg-red-50 border-red-200">
                <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-black text-red-800 text-sm mb-1">Compliance is Non-Negotiable in the Philippines</h3>
                        <p className="text-xs text-red-700 mb-2">Under RA 10863 (CMTA): Mis-declaration of goods, wrong HS codes, or undervaluation can result in <strong>seizure of goods, criminal charges, and fines up to 600% of duty</strong>. Only PRC-licensed customs brokers can file entries.</p>
                        <div className="flex gap-4 text-[10px] text-red-600 font-bold">
                            <span>No Licensed Broker = ILLEGAL</span>
                            <span>|</span>
                            <span>Wrong HS Code = Seizure Risk</span>
                            <span>|</span>
                            <span>No BOI ATI = Pay Full Duties</span>
                            <span>|</span>
                            <span>No Energy Label = No Release</span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Tab Navigation */}
            <div className="flex gap-1 flex-wrap">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}>
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══════ BROKER TASKS TAB ═══════ */}
            {activeTab === 'broker' && (
                <div className="space-y-3">
                    {BROKER_TASKS.map(category => {
                        const isExpanded = expandedCategories.has(category.category);
                        const catCompleted = category.tasks.filter(t => completedTasks[`${category.category}-${t.task}`.replace(/\s/g, '_')]).length;
                        const CatIcon = category.icon;

                        return (
                            <Card key={category.category}>
                                <button onClick={() => {
                                    setExpandedCategories(prev => {
                                        const next = new Set(prev);
                                        next.has(category.category) ? next.delete(category.category) : next.add(category.category);
                                        return next;
                                    });
                                }} className="w-full text-left">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <CatIcon size={18} className="text-blue-600" />
                                            <div>
                                                <h3 className="font-black text-sm text-gray-800">{category.category}</h3>
                                                <p className="text-[10px] text-gray-400">{catCompleted}/{category.tasks.length} tasks completed · {category.tasks.reduce((s, t) => s + t.estHours, 0)} est. hours total</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${category.tasks.length > 0 ? (catCompleted / category.tasks.length * 100) : 0}%` }} />
                                            </div>
                                            {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                        </div>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="mt-3 space-y-2">
                                        {category.tasks.map(task => {
                                            const taskId = `${category.category}-${task.task}`.replace(/\s/g, '_');
                                            const isDone = !!completedTasks[taskId];

                                            return (
                                                <div key={task.task} className={`flex items-start gap-3 p-3 rounded-lg border ${isDone ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
                                                    <button onClick={() => toggleTask(taskId)} className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-blue-400'}`}>
                                                        {isDone && <Check size={12} />}
                                                    </button>
                                                    <div className="flex-1">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <span className={`text-xs font-bold ${isDone ? 'text-green-700 line-through' : 'text-gray-800'}`}>{task.task}</span>
                                                            <div className="flex gap-1 flex-shrink-0">
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${IMPORTANCE_COLORS[task.importance]}`}>{task.importance}</span>
                                                                <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{task.estHours}h</span>
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-gray-400 mt-0.5">{task.frequency}</p>
                                                        {task.details && <p className="text-[10px] text-gray-500 mt-1 bg-gray-50 p-2 rounded">{task.details}</p>}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Custom tasks */}
                                        {customTasks.filter(ct => ct.category === category.category).map(ct => (
                                            <div key={ct._id} className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
                                                <span className="text-xs text-purple-700 font-bold flex-1">{ct.task}</span>
                                                <button onClick={() => deleteDoc(doc(db, "users", user.uid, "custom_import_tasks", ct._id))} className="text-purple-300 hover:text-red-500"><Trash2 size={12} /></button>
                                            </div>
                                        ))}

                                        <button onClick={() => addCustomTask(category.category)} className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1 pl-8">
                                            <Plus size={10} /> Add custom task
                                        </button>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ═══════ IMPORT PROCESS FLOW ═══════ */}
            {activeTab === 'process' && (
                <div className="space-y-3">
                    <Card className="bg-blue-50 border-blue-200">
                        <h3 className="font-black text-blue-800 text-sm mb-2">Standard Import Process — Philippines (BOI-SIPP Registered)</h3>
                        <p className="text-xs text-blue-700">Typical clearance: <strong>3-7 working days</strong> (Green lane) to <strong>10-15 days</strong> (Red lane with physical exam). Advance lodgment and complete documentation can cut this significantly.</p>
                    </Card>

                    <div className="relative">
                        {IMPORT_PROCESS_STEPS.map((step, i) => (
                            <div key={step.step} className="flex gap-4 mb-3">
                                {/* Timeline */}
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs flex-shrink-0">
                                        {step.step}
                                    </div>
                                    {i < IMPORT_PROCESS_STEPS.length - 1 && <div className="w-0.5 flex-1 bg-blue-200 mt-1" />}
                                </div>
                                {/* Content */}
                                <Card className="flex-1 mb-0">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-black text-sm text-gray-800">{step.title}</h4>
                                            <p className="text-xs text-gray-600 mt-1">{step.details}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-3">
                                            <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{step.duration}</div>
                                            <div className="text-[9px] text-gray-400 mt-1">{step.who}</div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══════ HS CODES & TARIFFS ═══════ */}
            {activeTab === 'hscodes' && (
                <div className="space-y-3">
                    <Card className="bg-yellow-50 border-yellow-200">
                        <h3 className="font-black text-yellow-800 text-sm mb-1 flex items-center gap-2"><AlertTriangle size={14} /> HS Code Classification is CRITICAL</h3>
                        <p className="text-xs text-yellow-700">Wrong HS code = wrong duty rate = potential seizure + 600% penalty. Always verify with your licensed customs broker. ATIGA (ASEAN) and RCEP rates require valid Certificate of Origin.</p>
                    </Card>

                    <div className="relative max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Search HS codes, products..."
                            value={hsSearch} onChange={e => setHsSearch(e.target.value)} />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left p-3 font-black text-gray-600">HS Code</th>
                                    <th className="text-left p-3 font-black text-gray-600">Description</th>
                                    <th className="text-center p-3 font-black text-gray-600">MFN Rate</th>
                                    <th className="text-center p-3 font-black text-green-600">ATIGA (ASEAN)</th>
                                    <th className="text-center p-3 font-black text-blue-600">RCEP</th>
                                    <th className="text-left p-3 font-black text-gray-600">Karnot Products</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredHS.map(hs => (
                                    <tr key={hs.hsCode} className="border-b border-gray-100 hover:bg-blue-50">
                                        <td className="p-3 font-mono font-bold text-blue-700">{hs.hsCode}</td>
                                        <td className="p-3 text-gray-700">{hs.description}</td>
                                        <td className="p-3 text-center font-bold text-red-600">{hs.mfnRate}</td>
                                        <td className="p-3 text-center font-bold text-green-600">{hs.atigaRate}</td>
                                        <td className="p-3 text-center font-bold text-blue-600">{hs.rcepRate}</td>
                                        <td className="p-3 text-gray-500">{hs.products}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Card className="bg-green-50 border-green-200">
                        <h4 className="font-black text-green-800 text-xs mb-2">FTA Savings Calculator</h4>
                        <p className="text-xs text-green-700">Example: Importing ₱5M worth of heat pumps (8418.61)</p>
                        <div className="grid grid-cols-3 gap-3 mt-2">
                            <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                                <div className="text-red-600 font-black text-lg">₱150,000</div>
                                <div className="text-[10px] text-gray-500">MFN Duty (3%)</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                                <div className="text-green-600 font-black text-lg">₱0</div>
                                <div className="text-[10px] text-gray-500">ATIGA Duty (0%)</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                                <div className="text-green-600 font-black text-lg">₱150,000</div>
                                <div className="text-[10px] text-gray-500 font-bold">YOU SAVE with CO</div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* ═══════ SHIPMENT TRACKER ═══════ */}
            {activeTab === 'shipments' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-gray-800 text-sm uppercase">Active Shipments</h3>
                        <Button onClick={() => setShowAddShipment(!showAddShipment)} variant="primary" className="text-xs">
                            <Plus size={12} className="mr-1" /> New Shipment
                        </Button>
                    </div>

                    {showAddShipment && (
                        <Card className="border-2 border-blue-300 bg-blue-50">
                            <h4 className="font-black text-sm text-blue-800 mb-3">Add Shipment</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Reference / PO Number *</label>
                                    <Input value={newShipment.reference} onChange={e => setNewShipment(p => ({ ...p, reference: e.target.value }))} placeholder="PO-2026-001" className="text-xs" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Supplier</label>
                                    <Input value={newShipment.supplier} onChange={e => setNewShipment(p => ({ ...p, supplier: e.target.value }))} placeholder="Supplier name" className="text-xs" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Description</label>
                                    <Input value={newShipment.description} onChange={e => setNewShipment(p => ({ ...p, description: e.target.value }))} placeholder="20x Heat Pump Units" className="text-xs" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">HS Code</label>
                                    <Input value={newShipment.hsCode} onChange={e => setNewShipment(p => ({ ...p, hsCode: e.target.value }))} placeholder="8418.61" className="text-xs" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Incoterm</label>
                                    <select value={newShipment.incoterm} onChange={e => setNewShipment(p => ({ ...p, incoterm: e.target.value }))} className="w-full border border-gray-200 rounded-lg p-2 text-xs">
                                        {['EXW', 'FOB', 'FCA', 'CFR', 'CIF', 'CIP', 'DAP', 'DDP'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Declared Value (₱)</label>
                                    <Input type="number" value={newShipment.value} onChange={e => setNewShipment(p => ({ ...p, value: e.target.value }))} placeholder="0" className="text-xs" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">ETD (Departure)</label>
                                    <Input type="date" value={newShipment.etd} onChange={e => setNewShipment(p => ({ ...p, etd: e.target.value }))} className="text-xs" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">ETA (Arrival)</label>
                                    <Input type="date" value={newShipment.eta} onChange={e => setNewShipment(p => ({ ...p, eta: e.target.value }))} className="text-xs" />
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-2 text-xs">
                                        <input type="checkbox" checked={newShipment.dutyFree} onChange={e => setNewShipment(p => ({ ...p, dutyFree: e.target.checked }))} />
                                        <span className="font-bold text-green-700">BOI Duty-Free</span>
                                    </label>
                                </div>
                            </div>
                            <div className="mt-3">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Notes</label>
                                <textarea className="w-full border border-gray-200 rounded-lg p-2 text-xs h-16" value={newShipment.notes} onChange={e => setNewShipment(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." />
                            </div>
                            <div className="flex gap-2 mt-3">
                                <Button onClick={addShipment} variant="primary" className="text-xs" disabled={!newShipment.reference}><Save size={12} className="mr-1" /> Save Shipment</Button>
                                <Button onClick={() => setShowAddShipment(false)} variant="secondary" className="text-xs">Cancel</Button>
                            </div>
                        </Card>
                    )}

                    {shipments.length > 0 ? (
                        <div className="space-y-2">
                            {shipments.map(s => {
                                const statusColors = {
                                    ordered: 'bg-gray-100 text-gray-600',
                                    shipped: 'bg-blue-100 text-blue-700',
                                    in_transit: 'bg-cyan-100 text-cyan-700',
                                    at_port: 'bg-yellow-100 text-yellow-700',
                                    customs_clearance: 'bg-orange-100 text-orange-700',
                                    released: 'bg-green-100 text-green-700',
                                    delivered: 'bg-emerald-100 text-emerald-700',
                                    held: 'bg-red-100 text-red-700',
                                };

                                return (
                                    <Card key={s._id} className="hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-black text-sm text-gray-800">{s.reference}</span>
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusColors[s.status] || 'bg-gray-100 text-gray-600'}`}>
                                                        {s.status?.replace(/_/g, ' ').toUpperCase()}
                                                    </span>
                                                    {s.dutyFree && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">BOI DUTY-FREE</span>}
                                                    {s.hsCode && <span className="text-[9px] font-mono bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">HS: {s.hsCode}</span>}
                                                </div>
                                                {s.description && <p className="text-xs text-gray-600 mt-1">{s.description}</p>}
                                                <div className="flex gap-4 mt-1 text-[10px] text-gray-400">
                                                    {s.supplier && <span>Supplier: {s.supplier}</span>}
                                                    {s.incoterm && <span>Incoterm: {s.incoterm}</span>}
                                                    {s.value && <span>Value: ₱{Number(s.value).toLocaleString()}</span>}
                                                    {s.etd && <span>ETD: {s.etd}</span>}
                                                    {s.eta && <span>ETA: {s.eta}</span>}
                                                </div>
                                                {s.notes && <p className="text-[10px] text-gray-500 mt-1 bg-gray-50 p-2 rounded">{s.notes}</p>}
                                            </div>
                                            <div className="flex items-center gap-1 ml-3">
                                                <select value={s.status} onChange={e => updateShipmentStatus(s._id, e.target.value)}
                                                    className="text-[10px] border border-gray-200 rounded px-1 py-0.5">
                                                    {['ordered', 'shipped', 'in_transit', 'at_port', 'customs_clearance', 'released', 'delivered', 'held'].map(st => (
                                                        <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
                                                    ))}
                                                </select>
                                                <button onClick={() => deleteShipment(s._id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={12} /></button>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <Card className="text-center py-8 text-gray-400">
                            <Package size={40} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-bold">No shipments tracked yet</p>
                            <p className="text-xs">Click "New Shipment" to start tracking imports and exports</p>
                        </Card>
                    )}
                </div>
            )}

            {/* ═══════ CONTACTS DIRECTORY ═══════ */}
            {activeTab === 'directory' && (
                <div className="space-y-3">
                    <Card className="bg-blue-50 border-blue-200">
                        <div className="flex items-start gap-2">
                            <ClipboardList size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-black text-blue-800 text-sm mb-1">Broker, Forwarder & Compliance Contacts Directory</h3>
                                <p className="text-xs text-blue-700">Save contacts you find from Facebook pages, referrals, and associations. Track their status from prospect to engaged. Always verify PRC licenses before engaging customs brokers.</p>
                            </div>
                        </div>
                    </Card>

                    <div className="flex items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Search contacts..."
                                value={contactSearch} onChange={e => setContactSearch(e.target.value)} />
                        </div>
                        <Button onClick={() => setShowAddContact(!showAddContact)} variant="primary" className="text-xs">
                            <Plus size={12} className="mr-1" /> Add Contact
                        </Button>
                    </div>

                    {showAddContact && (
                        <Card className="border-2 border-blue-300 bg-blue-50">
                            <h4 className="font-black text-sm text-blue-800 mb-3">Add Broker / Forwarder / Professional Contact</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Contact Name *</label>
                                    <Input value={newContact.name} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))} placeholder="Juan Dela Cruz" className="text-xs" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Company / Firm</label>
                                    <Input value={newContact.company} onChange={e => setNewContact(p => ({ ...p, company: e.target.value }))} placeholder="ABC Brokerage Services" className="text-xs" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Role / Type</label>
                                    <select value={newContact.role} onChange={e => setNewContact(p => ({ ...p, role: e.target.value }))} className="w-full border border-gray-200 rounded-lg p-2 text-xs">
                                        <option value="customs_broker">Licensed Customs Broker</option>
                                        <option value="freight_forwarder">Freight Forwarder</option>
                                        <option value="compliance_officer">Compliance Officer (Hire)</option>
                                        <option value="trade_lawyer">Trade Lawyer</option>
                                        <option value="shipping_line">Shipping Line Agent</option>
                                        <option value="trucking">Trucking / Inland Transport</option>
                                        <option value="warehouse">Warehouse / Storage</option>
                                        <option value="insurance">Cargo Insurance</option>
                                        <option value="government">Government Contact (BOC/BOI/DTI)</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Phone / Mobile</label>
                                    <Input value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))} placeholder="+63 917 123 4567" className="text-xs" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Email</label>
                                    <Input value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} placeholder="juan@broker.ph" className="text-xs" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Facebook Page / Messenger</label>
                                    <Input value={newContact.fbPage} onChange={e => setNewContact(p => ({ ...p, fbPage: e.target.value }))} placeholder="fb.com/abcbrokerage or Messenger name" className="text-xs" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">PRC License # (Brokers)</label>
                                    <Input value={newContact.prcLicense} onChange={e => setNewContact(p => ({ ...p, prcLicense: e.target.value }))} placeholder="PRC-XXXX" className="text-xs" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Status</label>
                                    <select value={newContact.status} onChange={e => setNewContact(p => ({ ...p, status: e.target.value }))} className="w-full border border-gray-200 rounded-lg p-2 text-xs">
                                        <option value="prospect">Prospect — Found, not contacted</option>
                                        <option value="contacted">Contacted — Awaiting response</option>
                                        <option value="meeting">Meeting Scheduled</option>
                                        <option value="quoting">Quoting — Getting rates</option>
                                        <option value="engaged">Engaged — Active working relationship</option>
                                        <option value="rejected">Rejected — Not suitable</option>
                                        <option value="backup">Backup — Keep on file</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Found Via</label>
                                    <select value={newContact.foundVia || ''} onChange={e => setNewContact(p => ({ ...p, foundVia: e.target.value }))} className="w-full border border-gray-200 rounded-lg p-2 text-xs">
                                        <option value="">Select source...</option>
                                        <option value="facebook_page">Facebook Page</option>
                                        <option value="facebook_group">Facebook Group</option>
                                        <option value="fb_messenger">FB Messenger</option>
                                        <option value="referral">Referral / Word of Mouth</option>
                                        <option value="linkedin">LinkedIn</option>
                                        <option value="website">Website / Google</option>
                                        <option value="association">Association (CCBI/SCMAP/etc)</option>
                                        <option value="jobstreet">Jobstreet / Indeed</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-3">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Notes (rates, experience, specialization, red flags)</label>
                                <textarea className="w-full border border-gray-200 rounded-lg p-2 text-xs h-16" value={newContact.notes} onChange={e => setNewContact(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. Specializes in BOI importers. Quoted ₱5,000/entry. 15 years experience. Found via CCBI Facebook page..." />
                            </div>
                            <div className="flex gap-2 mt-3">
                                <Button onClick={addBrokerContact} variant="primary" className="text-xs" disabled={!newContact.name}><Save size={12} className="mr-1" /> Save Contact</Button>
                                <Button onClick={() => setShowAddContact(false)} variant="secondary" className="text-xs">Cancel</Button>
                            </div>
                        </Card>
                    )}

                    {/* Contact Stats */}
                    {brokerContacts.length > 0 && (
                        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                            {[
                                { label: 'Total', count: brokerContacts.length, color: 'bg-gray-100 text-gray-700' },
                                { label: 'Prospects', count: brokerContacts.filter(c => c.status === 'prospect').length, color: 'bg-blue-50 text-blue-700' },
                                { label: 'Contacted', count: brokerContacts.filter(c => c.status === 'contacted').length, color: 'bg-yellow-50 text-yellow-700' },
                                { label: 'Quoting', count: brokerContacts.filter(c => c.status === 'quoting').length, color: 'bg-orange-50 text-orange-700' },
                                { label: 'Engaged', count: brokerContacts.filter(c => c.status === 'engaged').length, color: 'bg-green-50 text-green-700' },
                                { label: 'Brokers', count: brokerContacts.filter(c => c.role === 'customs_broker').length, color: 'bg-purple-50 text-purple-700' },
                                { label: 'Forwarders', count: brokerContacts.filter(c => c.role === 'freight_forwarder').length, color: 'bg-cyan-50 text-cyan-700' },
                            ].map(s => (
                                <div key={s.label} className={`${s.color} rounded-lg p-2 text-center`}>
                                    <div className="text-sm font-black">{s.count}</div>
                                    <div className="text-[9px] font-bold uppercase">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Contact List */}
                    {filteredContacts.length > 0 ? (
                        <div className="space-y-2">
                            {filteredContacts.map(c => {
                                const roleLabels = {
                                    customs_broker: { label: 'CUSTOMS BROKER', color: 'bg-purple-100 text-purple-700' },
                                    freight_forwarder: { label: 'FREIGHT FORWARDER', color: 'bg-cyan-100 text-cyan-700' },
                                    compliance_officer: { label: 'COMPLIANCE OFFICER', color: 'bg-blue-100 text-blue-700' },
                                    trade_lawyer: { label: 'TRADE LAWYER', color: 'bg-indigo-100 text-indigo-700' },
                                    shipping_line: { label: 'SHIPPING LINE', color: 'bg-teal-100 text-teal-700' },
                                    trucking: { label: 'TRUCKING', color: 'bg-amber-100 text-amber-700' },
                                    warehouse: { label: 'WAREHOUSE', color: 'bg-gray-100 text-gray-700' },
                                    insurance: { label: 'INSURANCE', color: 'bg-emerald-100 text-emerald-700' },
                                    government: { label: 'GOVERNMENT', color: 'bg-red-100 text-red-700' },
                                    other: { label: 'OTHER', color: 'bg-gray-100 text-gray-600' },
                                };
                                const statusColors = {
                                    prospect: 'bg-blue-100 text-blue-600',
                                    contacted: 'bg-yellow-100 text-yellow-700',
                                    meeting: 'bg-orange-100 text-orange-700',
                                    quoting: 'bg-amber-100 text-amber-700',
                                    engaged: 'bg-green-100 text-green-700',
                                    rejected: 'bg-red-100 text-red-600',
                                    backup: 'bg-gray-100 text-gray-500',
                                };
                                const roleInfo = roleLabels[c.role] || roleLabels.other;

                                return (
                                    <Card key={c._id} className="hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-black text-sm text-gray-800">{c.name}</span>
                                                    {c.company && <span className="text-xs text-gray-500">@ {c.company}</span>}
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${roleInfo.color}`}>{roleInfo.label}</span>
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusColors[c.status] || statusColors.prospect}`}>{c.status?.toUpperCase()}</span>
                                                    {c.prcLicense && <span className="text-[9px] font-mono bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-200">PRC: {c.prcLicense}</span>}
                                                </div>
                                                <div className="flex gap-3 mt-1.5 flex-wrap">
                                                    {c.phone && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Phone size={10} /> {c.phone}</span>}
                                                    {c.email && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Mail size={10} /> {c.email}</span>}
                                                    {c.fbPage && <span className="text-[10px] text-blue-500 flex items-center gap-1 font-bold">FB: {c.fbPage}</span>}
                                                    {c.foundVia && <span className="text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">Found via: {c.foundVia.replace(/_/g, ' ')}</span>}
                                                </div>
                                                {/* Star rating */}
                                                <div className="flex items-center gap-1 mt-1">
                                                    {[1,2,3,4,5].map(star => (
                                                        <button key={star} onClick={() => updateContactRating(c._id, star)}
                                                            className={`text-sm ${star <= (c.rating || 0) ? 'text-yellow-400' : 'text-gray-200'} hover:text-yellow-400 transition-colors`}>
                                                            ★
                                                        </button>
                                                    ))}
                                                    {c.rating > 0 && <span className="text-[9px] text-gray-400 ml-1">{c.rating}/5</span>}
                                                </div>
                                                {c.notes && <p className="text-[10px] text-gray-500 mt-1 bg-gray-50 p-2 rounded">{c.notes}</p>}
                                            </div>
                                            <div className="flex items-center gap-1 ml-3">
                                                <select value={c.status} onChange={e => updateContactStatus(c._id, e.target.value)}
                                                    className="text-[10px] border border-gray-200 rounded px-1 py-0.5">
                                                    {['prospect','contacted','meeting','quoting','engaged','rejected','backup'].map(st => (
                                                        <option key={st} value={st}>{st}</option>
                                                    ))}
                                                </select>
                                                <button onClick={() => deleteBrokerContact(c._id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={12} /></button>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <Card className="text-center py-8 text-gray-400">
                            <Users size={40} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-bold">No contacts saved yet</p>
                            <p className="text-xs">Use the "Find Professionals" tab to search Facebook pages, then save contacts here</p>
                        </Card>
                    )}
                </div>
            )}

            {/* ═══════ FIND PROFESSIONALS (FACEBOOK REALITY) ═══════ */}
            {activeTab === 'professionals' && (
                <div className="space-y-3">
                    {/* Facebook Reality Warning */}
                    <Card className="bg-blue-900 text-white border-0">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl flex-shrink-0">f</div>
                            <div>
                                <h3 className="font-black text-sm mb-1">The Philippines Facebook Reality</h3>
                                <p className="text-xs text-blue-200 mb-2">Most Philippine trade associations, customs brokerages, and freight forwarders operate primarily through <strong className="text-white">Facebook Pages and Messenger</strong> — not traditional websites. This is normal. Facebook IS the business internet in PH.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                    <div className="bg-blue-800 rounded-lg p-2">
                                        <span className="font-bold text-blue-200">How to find professionals:</span>
                                        <ul className="mt-1 space-y-0.5 text-blue-300">
                                            <li>1. Search Facebook for the terms below</li>
                                            <li>2. Message the Facebook Page directly</li>
                                            <li>3. Ask for member directories / referrals</li>
                                            <li>4. Join FB Groups for import/export community</li>
                                            <li>5. Save contacts in the Directory tab</li>
                                        </ul>
                                    </div>
                                    <div className="bg-blue-800 rounded-lg p-2">
                                        <span className="font-bold text-blue-200">Due diligence (stay squeaky clean):</span>
                                        <ul className="mt-1 space-y-0.5 text-blue-300">
                                            <li>1. ALWAYS verify PRC license at prc.gov.ph</li>
                                            <li>2. Ask for BOC accreditation certificate</li>
                                            <li>3. Request 3 client references</li>
                                            <li>4. Check if they handle BOI-registered imports</li>
                                            <li>5. Get written quotes — no verbal-only deals</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Government & Association Directory */}
                    <Card>
                        <h3 className="font-black text-sm text-gray-800 mb-3 flex items-center gap-2">
                            <Building size={16} className="text-blue-600" />
                            Key Government Agencies & Associations
                        </h3>
                        <div className="space-y-1.5">
                            {PH_ASSOCIATIONS.map((assoc, i) => (
                                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${assoc.priority === 'CRITICAL' ? 'bg-red-500' : assoc.priority === 'HIGH' ? 'bg-orange-500' : assoc.priority === 'MEDIUM' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-black text-xs text-gray-800">{assoc.name}</span>
                                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${assoc.type === 'Government' ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-purple-600'}`}>{assoc.type}</span>
                                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${assoc.platform.includes('Facebook Only') ? 'bg-blue-100 text-blue-700' : 'bg-green-50 text-green-600'}`}>{assoc.platform}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-0.5">{assoc.purpose}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 space-y-0.5">
                                        <div className="text-[9px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">FB: {assoc.fbSearch}</div>
                                        {assoc.website !== 'N/A — Facebook page only' && (
                                            <div className="text-[9px] text-green-600 font-mono">{assoc.website}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Professional Roles with Facebook Search Terms */}
                    <h3 className="font-black text-sm text-gray-800 uppercase mt-4">Required Professionals & How to Find Them</h3>

                    {REQUIRED_PROFESSIONALS.map((pro, i) => (
                        <Card key={i} className={`cursor-pointer transition-all ${expandedPro === i ? 'ring-2 ring-purple-300' : ''}`}>
                            <button onClick={() => setExpandedPro(expandedPro === i ? null : i)} className="w-full text-left">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                            <Briefcase size={18} className="text-purple-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-sm text-gray-800">{pro.role}</h4>
                                            <p className="text-[10px] text-gray-500">{pro.requirement}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">{pro.estimatedRetainer}</span>
                                        {expandedPro === i ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                    </div>
                                </div>
                            </button>

                            {expandedPro === i && (
                                <div className="mt-3 space-y-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-1">License Required</h5>
                                            <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded">{pro.license}</p>
                                        </div>
                                        <div>
                                            <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-1">Scope of Work</h5>
                                            <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded">{pro.scope}</p>
                                        </div>
                                    </div>

                                    {/* Facebook Search Terms */}
                                    <div>
                                        <h5 className="text-[10px] font-bold text-blue-500 uppercase mb-1 flex items-center gap-1">Facebook Search Terms (copy & paste into FB search)</h5>
                                        <div className="flex flex-wrap gap-1.5">
                                            {pro.fbSearchTerms?.map((term, j) => (
                                                <button key={j} onClick={() => navigator.clipboard?.writeText(term)}
                                                    className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors font-bold cursor-pointer"
                                                    title="Click to copy">
                                                    "{term}"
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Key Facebook Pages */}
                                    <div>
                                        <h5 className="text-[10px] font-bold text-blue-500 uppercase mb-1">Key Facebook Pages & Groups to Contact</h5>
                                        <div className="space-y-1">
                                            {pro.fbPages?.map((fb, j) => (
                                                <div key={j} className="flex items-center gap-2 bg-blue-50 rounded-lg p-2">
                                                    <div className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">f</div>
                                                    <div className="flex-1">
                                                        <span className="text-xs font-bold text-blue-800">{fb.name}</span>
                                                        <span className={`text-[8px] font-bold ml-1 px-1 py-0.5 rounded ${fb.type === 'Government' ? 'bg-red-100 text-red-600' : fb.type === 'FB Group' ? 'bg-green-100 text-green-600' : fb.type === 'Job Board' ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}`}>{fb.type}</span>
                                                        <p className="text-[10px] text-blue-600 mt-0.5">{fb.note}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Verification */}
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                                        <h5 className="text-[10px] font-bold text-green-700 uppercase mb-1">How to Verify (Stay Clean)</h5>
                                        <p className="text-xs text-green-700">{pro.verifyHow}</p>
                                    </div>

                                    <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                                        <p className="text-xs text-red-700 font-bold flex items-center gap-1"><AlertCircle size={12} /> {pro.criticalNote}</p>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}

                    {/* Retainer Budget Summary */}
                    <Card className="bg-green-50 border-green-200">
                        <h3 className="font-black text-green-800 text-xs uppercase mb-2">Estimated Monthly Professional Budget</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                                <div className="text-sm font-black text-gray-800">₱37,500</div>
                                <div className="text-[10px] text-gray-500">Customs Broker</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                                <div className="text-sm font-black text-gray-800">₱45,000</div>
                                <div className="text-[10px] text-gray-500">Compliance Officer</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                                <div className="text-sm font-black text-gray-800">₱22,500</div>
                                <div className="text-[10px] text-gray-500">Trade Lawyer</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                                <div className="text-sm font-black text-green-700 text-lg">₱105,000</div>
                                <div className="text-[10px] text-green-600 font-bold">TOTAL / MONTH</div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* ═══════ KEY LAWS ═══════ */}
            {activeTab === 'regulations' && (
                <div className="space-y-2">
                    <Card className="bg-indigo-50 border-indigo-200">
                        <h3 className="font-black text-indigo-800 text-sm mb-1">Key Philippine Import/Export Laws & Regulations</h3>
                        <p className="text-xs text-indigo-700">Every Karnot employee involved in import/export should know these laws. Ignorance is not a defense.</p>
                    </Card>

                    {KEY_REGULATIONS.map((reg, i) => (
                        <Card key={i}>
                            <div className="flex items-start gap-3">
                                <Scale size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-sm text-indigo-700">{reg.law}</span>
                                        <span className="text-xs text-gray-500">{reg.name}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">{reg.relevance}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
