import React, { useState } from 'react';
import { Card, Button } from '../data/constants.jsx';
import {
    Cpu, Zap, Thermometer, Snowflake, FileText, Shield, CheckCircle,
    ChevronDown, ChevronUp, Globe, Wifi, Radio, Server, Database,
    Lock, Box, Activity, Target, AlertTriangle, BookOpen, Settings,
    Layers, Package, Monitor, Smartphone, Cloud, Link, Hash
} from 'lucide-react';

// =====================================================================
// iSAVE FULL SYSTEM TECHNICAL SPECIFICATION v2.0
// Converted from isave-technical-spec.html — Feb 2026
// =====================================================================

const DESIGN_DECISIONS = [
    {
        icon: '🤝', title: 'Decision 1: Work WITH Kraken, Not Against It',
        description: 'Building a full VPP dispatch platform like Kraken would take 3+ years and tens of millions. Octopus Energy already built it. Karnot\'s advantage is the asset layer, not the grid dispatch layer.',
        plan: 'Build the best asset control and data platform in SE Asia. Feed that data to Kraken via their published FLEX API. Kraken does the grid dispatch. Karnot earns from the assets.',
    },
    {
        icon: '🏗️', title: 'Decision 2: Modbus TCP/IP as the Field Bus',
        description: 'Every heat pump, inverter, battery, fan coil, and energy meter made in the last 20 years supports Modbus. BACnet/IP is added for newer HVAC controllers. Maximum compatibility with minimum custom integration work.',
        plan: 'Modbus TCP/IP over Ethernet first. RS485/Modbus RTU via gateway for older equipment. BACnet/IP for premium HVAC. SG-Ready 4-mode relay as the universal fallback for any heat pump.',
    },
    {
        icon: '📡', title: 'Decision 3: iSAVE Gateway is the SCADA Node',
        description: 'Every site has one iSAVE Gateway Controller — a Linux-based DIN-rail computer that runs local control logic, collects all field data, executes DR commands, and buffers 30 days of data locally. The site works even when the internet is down.',
        plan: 'The iSAVE Gateway is the brain on-site. Utterberry Base Station plugs into it. GUDE relay boxes connect via LAN. All field devices connect via RS485 or Ethernet.',
    },
    {
        icon: '🔗', title: 'Decision 4: Rubidex is the Data Notary, Not the Database',
        description: 'Karnot owns its own time-series database (TimescaleDB). Rubidex provides the immutable proof layer — every 15-minute energy hash is committed to their blockchain.',
        plan: 'Rubidex = audit trail + carbon credit verification. Karnot = operational platform + fleet management. These are two different things and both are needed.',
    },
    {
        icon: '🇵🇭', title: 'Decision 5: Design for Philippines First, Scale to the World',
        description: 'Every specification is made for the Philippines reality: 220V 60Hz grid, frequent brownouts, tropical climate (45°C, 95% RH, IP65 minimum), and commercial cooling as the primary application.',
        envSpecs: [
            { label: 'Grid', value: '220V 60Hz, Brownout-prone', color: 'bg-red-50 text-red-700' },
            { label: 'Climate', value: 'Tropical 45°C, 95% RH', color: 'bg-yellow-50 text-yellow-700' },
            { label: 'Connectivity', value: 'LTE-M primary, WiFi secondary', color: 'bg-green-50 text-green-700' },
            { label: 'Application', value: 'Cooling + DHW, DR + Solar', color: 'bg-blue-50 text-blue-700' },
        ],
    },
];

const ARCHITECTURE_LAYERS = [
    {
        id: 0, name: 'Layer 0 — Physical Assets', subtitle: 'What iSAVE Controls', color: 'border-teal-400', labelBg: 'bg-teal-500',
        components: ['Heat Pump (Karnot iHEAT)', 'Fan Coil Units (iZONE)', 'Solar PV Inverter', 'Thermal Battery Tank', 'Electric Battery (BESS)', 'Main Energy Meter', 'Sub-meters', 'DR Relay Contactors'],
    },
    {
        id: '0b', name: 'Layer 0b — Utterberry Wireless Sensor Mesh', color: 'border-teal-400 border-dashed', labelBg: 'bg-teal-500',
        components: ['Temperature Motes ×N', 'Humidity Motes ×N', 'Vibration Motes ×N', 'Defrost Sensors', 'CT Clamp Motes', 'Pressure Motes', 'Sub-GHz Mesh → Utterberry Base Station'],
        connector: 'RS485 Modbus RTU / Modbus TCP/IP / BACnet/IP / SG-Ready Relay / CAN + Utterberry Sub-GHz Wireless',
    },
    {
        id: 1, name: 'Layer 1 — iSAVE Gateway Controller', subtitle: 'On-Site SCADA Node', color: 'border-orange-400', labelBg: 'bg-orange-500',
        components: ['Modbus TCP/IP Master', 'RS485 RTU Driver', 'BACnet/IP Stack', 'SG-Ready Relay Control', 'Utterberry Base Station (LAN)', 'GUDE Relay Controller (LAN)', 'Local AI Engine (TinyML)', 'DR Agent (OpenADR VEN)', 'Solar Optimiser Logic', 'Battery Dispatch Logic', 'Local MQTT Broker', '30-Day Data Buffer', 'LTE-M Modem', 'OTA Update Agent'],
        connector: 'MQTT over TLS via LTE-M (primary) / Wi-Fi (secondary) + Rubidex data hashes every 15 min',
    },
    {
        id: 2, name: 'Layer 2 — Rubidex Blockchain', subtitle: 'Data Integrity & Carbon Credit Notary', color: 'border-purple-400', labelBg: 'bg-purple-500',
        components: ['Device Identity Ledger', 'Energy Data Hashes (15-min)', 'DR Event Records', 'Carbon Credit MRV', 'Smart Contract: Revenue Split', 'Audit Trail API', 'BMSIntel Integration'],
        connector: 'REST API / WebSocket — Authenticated per-tenant',
    },
    {
        id: 3, name: 'Layer 3 — Karnot Control Centre', subtitle: 'Fleet Management & Control', color: 'border-blue-400', labelBg: 'bg-blue-500',
        components: ['EMQX MQTT Broker', 'TimescaleDB (time-series)', 'Node-RED / Python Control', 'OpenADR 2.0b VTN Server', 'AI Forecasting (Python/ML)', 'Carbon Credit Engine', 'Predictive Maintenance AI', 'REST + WebSocket API', 'React Web Dashboard', 'iOS / Android App', 'Utility Portal', 'Rubidex Verification API'],
        connector: 'Kraken FLEX API (REST) + OpenADR 2.0 VTN signals + Gold Standard Carbon Registry API',
    },
    {
        id: 4, name: 'Layer 4 — External Platforms', subtitle: 'We Feed, They Dispatch', color: 'border-green-400', labelBg: 'bg-green-500',
        components: ['Octopus Kraken FLEX API', 'Meralco RDSP Portal', 'Gold Standard Registry', 'Philippine ERC DR System', 'AutoGrid / AutoDR (future)', 'SCADA / BMS of building (read-only)'],
    },
];

const GATEWAY_SPECS = [
    { cat: 'Core Processor', spec: 'Raspberry Pi CM4 — ARM Cortex-A72 quad-core 1.5GHz, 4GB RAM, 32GB eMMC', notes: 'Linux OS (Debian), runs Node-RED + Python + MQTT broker locally' },
    { cat: 'RS485 / Modbus RTU', spec: '2× isolated RS485 ports (DIN rail terminal), 9600-115200 baud', notes: 'Heat pump, older inverters, fan coils, energy meters' },
    { cat: 'Modbus TCP / BACnet/IP', spec: 'Via onboard Ethernet switch (4-port, managed, 100Mbps)', notes: 'Modern inverters (SunSpec), BACnet HVAC, GUDE relay boxes' },
    { cat: 'SG-Ready Interface', spec: '4× potential-free relay outputs (24VDC/230VAC, 5A)', notes: 'All 4 SG-Ready modes. Universal heat pump compatibility' },
    { cat: 'Digital I/O', spec: '8× isolated digital inputs (3.3-24V), 4× relay outputs (230VAC 10A)', notes: 'External events, motor contacts, alarms' },
    { cat: 'Analog Inputs', spec: '4× 4-20mA / 0-10V (12-bit ADC)', notes: 'Pressure transducers, flow meters, temp sensors' },
    { cat: 'Energy Meter', spec: 'Built-in 3-phase MID-certified (Class 1, ±1%) — CT clamp inputs', notes: 'Revenue-grade for DR verification and carbon credits' },
    { cat: 'LTE-M / 4G Modem', spec: 'Sierra Wireless HL7800 or Quectel EC21 — dual-SIM failover', notes: 'Philippines primary. Two SIMs (Globe + Smart)' },
    { cat: 'Wi-Fi', spec: 'Wi-Fi 5 (802.11ac) dual-band 2.4/5GHz', notes: 'Secondary fallback to LTE-M' },
    { cat: 'Utterberry Integration', spec: 'Utterberry Base Station via onboard Ethernet', notes: 'All sensor data ingested into Gateway buffer' },
    { cat: 'GUDE Integration', spec: 'GUDE Expert Net Control via LAN Ethernet (HTTP/REST + SNMP)', notes: 'GUDE 2314-1 preferred (3ch + energy metering)' },
    { cat: 'Secure Element', spec: 'Microchip ATECC608B — stores Rubidex key pair, TLS certs', notes: 'Cryptographic root of trust. Factory-provisioned.' },
    { cat: 'Local Storage', spec: '32GB eMMC + 128GB industrial SD card', notes: '30 days full-resolution data buffered locally' },
    { cat: 'Display / HMI', spec: '2.4" colour TFT touchscreen + 4× RGB LEDs + buzzer', notes: 'On-site diagnostics without app' },
    { cat: 'Power Supply', spec: '85-264VAC / 12-48VDC, 25W max. Built-in UPS: 10Ah LiFePO4 = 4hr backup', notes: 'Philippine 220V 60Hz. 4-hour brownout resilience' },
    { cat: 'Enclosure', spec: 'IP65 polycarbonate DIN-rail, 12-module wide', notes: 'Tropical rated. UV-stabilised. SS hardware' },
    { cat: 'Operating Temp', spec: '-10°C to +70°C (storage: -40°C to +85°C)', notes: 'PH ambient 25-45°C well within range' },
    { cat: 'Target BOM', spec: '<$280 USD at 200+ units/yr (ex assembly)', notes: '$60/mo SaaS fee. 5-year payback' },
    { cat: 'Certifications', spec: 'CE, FCC, NTC Philippines (LTE), IEC 62368-1', notes: 'NTC approval needed for LTE modem' },
];

const EQUIPMENT = {
    heatPumps: [
        { product: 'Karnot iHEAT (own)', protocol: 'RS485 Modbus RTU (custom register map)', connection: 'Direct RS485 port', notes: 'Primary product. Full control. SG-Ready built-in.' },
        { product: 'Daikin Altherma 3/4', protocol: 'BACnet/IP or Daikin Open Protocol (RS485)', connection: 'Ethernet or RS485 via D3NET', notes: 'Market-leading in PH. Modbus adapter available.' },
        { product: 'Mitsubishi Ecodan', protocol: 'Modbus RTU (MELCloud) or BACnet', connection: 'RS485 or Ethernet via MA561', notes: 'Large installed base SE Asia. SG-Ready.' },
        { product: 'Panasonic Aquarea', protocol: 'Modbus RTU via CZ-CAPRA1', connection: 'RS485 port', notes: 'Cost-effective for PH mass market.' },
        { product: 'Any SG-Ready HP', protocol: 'SG-Ready 4-mode relay contact', connection: '4× relay outputs on Gateway', notes: 'Universal fallback. ANY modern heat pump.' },
    ],
    solarInverters: [
        { product: 'Sungrow SG/SH Series', protocol: 'SunSpec Modbus TCP/IP (built-in)', connection: 'Ethernet — direct', notes: 'Best value PH. SunSpec = plug-and-play.' },
        { product: 'Huawei SUN2000', protocol: 'Modbus TCP/IP via SDongle', connection: 'Ethernet via SDongle', notes: 'Market leader Asia. Low cost.' },
        { product: 'Fronius Symo/Primo', protocol: 'SunSpec Modbus TCP/IP', connection: 'Ethernet — direct', notes: 'High quality. Excellent API.' },
        { product: 'SolarEdge', protocol: 'SolarEdge Modbus TCP / REST API', connection: 'Ethernet or cloud API', notes: 'Optimizer-based. Complex roofs.' },
    ],
    batteries: [
        { product: 'BYD Battery-Box Premium HV', protocol: 'Modbus TCP/IP (SunSpec)', connection: 'Ethernet', notes: 'Best $/kWh Asia. LFP. Very safe.' },
        { product: 'Pylontech US5000 / FORCE H2', protocol: 'RS485 Modbus RTU (CAN optional)', connection: 'RS485 port', notes: 'Popular, excellent support, good BMS docs.' },
        { product: 'CATL TENER (commercial)', protocol: 'CAN 2.0B + Modbus TCP', connection: 'Ethernet or CAN adapter', notes: 'Best for >100kWh. Dominant in PH.' },
        { product: 'Alpha ESS Smile/Storion', protocol: 'Modbus TCP/IP + cloud API', connection: 'Ethernet', notes: 'Good PH availability.' },
    ],
    metersRelays: [
        { product: 'Eastron SDM630 Modbus', protocol: 'RS485 Modbus RTU', connection: 'Sub-metering circuits', notes: 'Best value 3-phase. ±0.5%. ~$35.' },
        { product: 'Carlo Gavazzi EM340', protocol: 'Modbus RTU + TCP', connection: 'Revenue-grade sub-metering', notes: 'MID certified. ~$80.' },
        { product: 'GUDE Expert Net Control 2314-1', protocol: 'HTTP REST + SNMP (LAN)', connection: '3ch DR relay + energy meter per channel', notes: 'PREFERRED for verified DR switching.' },
        { product: 'GUDE Expert Net Control 2302-1', protocol: 'HTTP REST + SNMP (LAN)', connection: '4ch 230VAC relay switching', notes: 'High-current loads (compressors, pumps).' },
        { product: 'GUDE Expert Sensor Box 7214', protocol: 'HTTP REST + SNMP (LAN)', connection: 'Temp/humidity sensing + relay', notes: 'Remote plant rooms.' },
    ],
};

const PROTOCOLS = [
    { from: 'Utterberry Sensors', to: 'iSAVE Gateway', protocols: ['Sub-GHz Wireless Mesh', 'Utterberry Proprietary'], detail: 'Motes form self-healing mesh → Base Station via Ethernet to Gateway LAN. Action: confirm if Base Station outputs local MQTT or only cloud API.' },
    { from: 'Karnot iHEAT', to: 'iSAVE Gateway', protocols: ['RS485 Modbus RTU', 'SG-Ready Relay (backup)'], detail: 'Primary: RS485 at 9600 baud. 30+ registers: compressor status, setpoint, temps, flow, power, faults. Backup: 4 SG-Ready relay outputs.' },
    { from: 'Solar Inverter', to: 'iSAVE Gateway', protocols: ['SunSpec Modbus TCP/IP', 'Modbus RTU (fallback)'], detail: 'Reads: AC power (W), generation (kWh), DC V/I per string, grid freq, inverter temp, faults. Ethernet — no adapter needed.' },
    { from: 'Battery (BESS)', to: 'iSAVE Gateway', protocols: ['Modbus TCP/IP', 'RS485 Modbus RTU', 'CAN 2.0B'], detail: 'Reads: SoC (%), SoH (%), cell voltages, pack temp, charge/discharge current. Writes: power limits, operating mode.' },
    { from: 'GUDE DR Relays', to: 'iSAVE Gateway', protocols: ['HTTP REST (LAN)', 'SNMP (LAN)'], detail: 'Ethernet on local LAN. HTTP GET/POST to switch relays. Response <100ms. GUDE 2314-1 reports kWh per channel for DR verification.' },
    { from: 'Fan Coil Units', to: 'iSAVE Gateway', protocols: ['RS485 Modbus RTU', 'BACnet MS/TP', 'BACnet/IP'], detail: 'iZONE: RS485 bus, up to 32 units. Reads/writes: setpoint, actual temp, fan speed, valve position, occupancy, filter alarm.' },
    { from: 'Energy Meters', to: 'iSAVE Gateway', protocols: ['RS485 Modbus RTU'], detail: 'SDM630/EM340 at 9600 baud. Reads: kW, kVAr, kWh import/export, PF, freq, V, I. Polled every 10s. Hashed to Rubidex every 15 min.' },
    { from: 'iSAVE Gateway', to: 'Rubidex Blockchain', protocols: ['HTTPS REST API', 'Rubidex SDK'], detail: 'Every 15 min: bundle timestamp, site ID, energy readings, DR events, sensor snapshots. SHA-256 hash signed with ATECC608B device key. Queued if offline.' },
    { from: 'iSAVE Gateway', to: 'Karnot Cloud', protocols: ['MQTT over TLS 1.3', 'LTE-M / Wi-Fi'], detail: 'Topic: karnot/{site_id}/{device_type}/{device_id}/{datapoint}. QoS 1 for energy, QoS 2 for DR commands. 30s heartbeat. 30-day local buffer.' },
    { from: 'Karnot Cloud', to: 'Octopus Kraken', protocols: ['Kraken FLEX REST API', 'HTTPS'], detail: 'Every 30 min push: available DR capacity (kW), 24hr forecast, response time. Kraken dispatches via webhook. Karnot translates to OpenADR for Gateways.' },
];

const SG_READY_MODES = [
    { mode: 1, name: 'Utility Block', icon: '🚫', color: 'border-red-500', relay1: 'CLOSED', relay2: 'OPEN', description: 'Heat pump locked off. Max 2 hours, up to 3×/day. Thermal battery supplies heating/cooling. Electric backup enabled. Triggered by: utility DR signal or frequency event.' },
    { mode: 2, name: 'Normal Operation', icon: '✅', color: 'border-green-500', relay1: 'OPEN', relay2: 'OPEN', description: 'Standard efficient operation. iSAVE optimises scheduling, pre-charges thermal battery before expected block, adjusts for off-peak tariff. Default running state.' },
    { mode: 3, name: 'Solar Surplus Boost', icon: '☀️', color: 'border-yellow-500', relay1: 'OPEN', relay2: 'CLOSED', description: 'PV surplus detected. Heat pump increases to intensified heating/DHW mode — using excess solar to charge thermal battery. Recommended start command.' },
    { mode: 4, name: 'Active Command On', icon: '⚡', color: 'border-blue-500', relay1: 'CLOSED', relay2: 'CLOSED', description: 'Definitive command to actively switch HP on with temp boost in storage. Triggered by: cheap off-peak tariff, grid oversupply, pre-DR pre-conditioning.' },
];

const IEEE_STANDARDS = [
    { std: 'IEEE 2030.5 (SEP 2.0)', title: 'Smart Energy Profile 2.0', relevance: 'DER device ↔ utility communication. Karnot CC = SEP 2.0 server; Gateway = SEP 2.0 client.', status: 'Required for US/AUS' },
    { std: 'OpenADR 2.0b', title: 'Open Automated Demand Response', relevance: 'Primary DR standard for Philippines ERC. Gateway = OpenADR VEN. CC = OpenADR VTN. Meralco RDSP uses OpenADR.', status: 'Required — Philippines' },
    { std: 'IEEE 1547-2018', title: 'Interconnection of DERs', relevance: 'How solar + batteries connect to grid. Ride-through requirements, anti-islanding.', status: 'Required — solar + BESS' },
    { std: 'IEC 61850', title: 'Power Utility Automation', relevance: 'Utility-grade substation comms. Phase 2 CC needs GOOSE/MMS gateway.', status: 'Phase 2' },
    { std: 'IEC 61968/61970', title: 'Common Information Model (CIM)', relevance: 'Standard data model for utility assets. Required for PH DU API integration.', status: 'Phase 2 API' },
    { std: 'SunSpec Alliance', title: 'SunSpec Modbus Models', relevance: 'Solar inverter standard. Models 1, 101/111, 120, 122, 160. Plug-and-play with major brands.', status: 'Implemented' },
    { std: 'IEC 62056 / DLMS', title: 'Smart Metering', relevance: 'Smart meter protocol used by Meralco. Critical for baseline measurement.', status: 'Required — PH metering' },
    { std: 'ISO 50001', title: 'Energy Management Systems', relevance: 'iSAVE data supports ISO 50001 energy auditing. Auto-generate Section 4.6 reports.', status: 'Commercial customers' },
    { std: 'IEC 62443', title: 'Industrial Cybersecurity', relevance: 'ICS security. Gateway targets SL2: secure element, encryption, RBAC, firmware signing, audit logging.', status: 'Required — utility' },
    { std: 'BWP SG-Ready', title: 'Smart Grid Ready HP Interface', relevance: '4-mode relay interface. Implemented via hardware relay outputs. Universal HP compatibility.', status: 'Implemented' },
    { std: 'MQTT 5.0', title: 'ISO/IEC 20922', relevance: 'Primary IoT messaging. TLS 1.3 mandatory. Session expiry, subscription IDs, enhanced errors.', status: 'Core protocol' },
];

const CLOUD_STACK = [
    { component: 'MQTT Broker', tech: 'EMQX Enterprise', why: '10M+ connections. Built-in Modbus bridge. Free up to 10k connections.' },
    { component: 'Time-Series DB', tech: 'TimescaleDB (PostgreSQL)', why: 'Best for energy time-series. Full SQL. 100× faster than Postgres for time-series.' },
    { component: 'Workflow', tech: 'Node-RED (Gateway) + Apache Airflow (cloud)', why: 'Node-RED for on-site control. Airflow for cloud batch (carbon calcs, reports).' },
    { component: 'AI / ML', tech: 'Python: scikit-learn, Prophet, TFLite', why: 'Prophet for demand forecasting. scikit-learn for anomaly detection. TFLite on-device.' },
    { component: 'API Gateway', tech: 'FastAPI + NGINX', why: 'Auto OpenAPI docs, async, excellent performance. NGINX for TLS + rate limiting.' },
    { component: 'Web Dashboard', tech: 'React + Recharts + Mapbox GL', why: 'React components. Recharts for energy graphs. Mapbox for fleet map.' },
    { component: 'Mobile App', tech: 'React Native (iOS + Android)', why: 'One codebase, two platforms. OTA updates via Expo EAS.' },
    { component: 'DR Engine', tech: 'Python + openleadr', why: 'openleadr = Python OpenADR. Karnot wraps with fleet logic + Kraken/RDSP.' },
    { component: 'Message Queue', tech: 'Apache Kafka', why: 'High-throughput fleet events. Decouples ingestion from processing. Replay for debugging.' },
    { component: 'Infrastructure', tech: 'Docker + K8s on AWS (ap-southeast-1)', why: 'Singapore region = closest to PH. K8s scales with fleet.' },
    { component: 'Monitoring', tech: 'Grafana + Prometheus + Alertmanager', why: 'Grafana for ops dashboards. Prometheus metrics. Alertmanager → PagerDuty.' },
    { component: 'Rubidex', tech: 'Python microservice (scheduled)', why: 'Every 15 min: reads TimescaleDB, hashes, submits to Rubidex API.' },
];

const BOM = [
    { item: 'Heat Pump', product: 'Karnot iHEAT 25kW ×2', qty: '1-2', unit: '$6,000-12,000', total: '$12,000' },
    { item: 'Solar Inverter', product: 'Sungrow SH30RT hybrid 30kW', qty: '1', unit: '$2,800', total: '$2,800' },
    { item: 'Electric Battery', product: 'BYD Battery-Box Premium HV 50kWh', qty: '1', unit: '$18,000', total: '$18,000' },
    { item: 'Thermal Storage', product: 'Karnot iSTORE 3,000L insulated', qty: '1', unit: '$4,500', total: '$4,500' },
    { item: 'Solar Panels', product: 'Jinko/LONGi 400W mono (75 panels)', qty: '75', unit: '$120', total: '$9,000' },
    { item: 'Fan Coil Units', product: 'Karnot iZONE 2kW ×10 zones', qty: '10', unit: '$350', total: '$3,500' },
    { item: 'iSAVE Gateway', product: 'Karnot iSAVE GW-1', qty: '1', unit: '$380', total: '$380' },
    { item: 'Utterberry Kit', product: 'Base Station + 8 motes', qty: '1', unit: '$800', total: '$800' },
    { item: 'GUDE 2314-1', product: '3ch + energy meter', qty: '2', unit: '$220', total: '$440' },
    { item: 'GUDE 2302-1', product: '4ch relay', qty: '1', unit: '$160', total: '$160' },
    { item: 'Energy Meters', product: 'Eastron SDM630 ×4', qty: '4', unit: '$38', total: '$152' },
    { item: 'Networking', product: 'Industrial Ethernet switch 8-port', qty: '1', unit: '$120', total: '$120' },
    { item: 'Cabling', product: 'RS485 cable, DIN-rail, terminals', qty: '-', unit: '-', total: '$350' },
    { item: 'Installation', product: '3 days (PH ESCO rates)', qty: '-', unit: '-', total: '$600' },
];

const NEXT_STEPS = [
    { num: 1, title: 'Call Heba (Utterberry)', timing: 'This Week', color: 'border-blue-500', detail: 'Can the Base Station output data locally (MQTT/HTTP) to the iSAVE Gateway on the same LAN? This decides brownout resilience.' },
    { num: 2, title: 'Call Rubidex', timing: 'This Week', color: 'border-purple-500', detail: 'Get partner API access. Does Rubidex have REST endpoint for third-party data hashes? Propose iSAVE as energy asset layer of BMSIntel.' },
    { num: 3, title: 'Contact Octopus Kraken', timing: 'This Month', color: 'border-green-500', detail: 'Discuss FLEX technology licensing for PH/SE Asia, or registering as FLEX asset aggregator for UK/EU platform.' },
    { num: 4, title: 'Order Prototype Hardware', timing: 'This Month', color: 'border-yellow-500', detail: 'RPi CM4 + IO board, 2× GUDE 2314-1, 4× Eastron SDM630, DIN-rail enclosure + switch. ~$800 total for 3 prototypes.' },
    { num: 5, title: 'Build Gateway Software v0.1', timing: '4 Weeks', color: 'border-orange-500', detail: 'Node-RED: Modbus TCP driver, GUDE HTTP control, MQTT to EMQX, SG-Ready relay logic, basic web status page.' },
    { num: 6, title: 'Identify Philippines Pilot Site', timing: 'Q2 2026', color: 'border-teal-500', detail: 'Commercial building Manila/Cebu with existing HP/chiller, >50kW grid, willing reference customer. Contact Meralco RDSP.' },
    { num: 7, title: 'NTC Type Approval', timing: 'Start Now (3-6 months)', color: 'border-red-500', detail: 'LTE modem requires NTC approval. Engage Bureau Veritas Philippines or local compliance agent in parallel.' },
    { num: 8, title: 'Draft Partner MOUs', timing: 'Q2 2026', color: 'border-purple-500', detail: 'Utterberry + Rubidex MOUs: integration intent, co-marketing PH, data sharing, revenue share on carbon + DR.' },
];

// =====================================================================
// COMPONENT
// =====================================================================
export default function ISAVETechSpec() {
    const [activeSection, setActiveSection] = useState('design');
    const [expandedItems, setExpandedItems] = useState(new Set());

    const toggle = (key) => setExpandedItems(prev => { const n = new Set(prev); n.has(key)?n.delete(key):n.add(key); return n; });

    const SECTIONS = [
        { id: 'design', label: 'Design Decisions', icon: Target },
        { id: 'architecture', label: 'System Architecture', icon: Layers },
        { id: 'gateway', label: 'Gateway Hardware', icon: Cpu },
        { id: 'equipment', label: 'Equipment Selection', icon: Package },
        { id: 'protocols', label: 'Protocols', icon: Link },
        { id: 'sgready', label: 'SG-Ready', icon: Zap },
        { id: 'standards', label: 'IEEE Standards', icon: Shield },
        { id: 'cloud', label: 'Cloud Stack', icon: Cloud },
        { id: 'carbon', label: 'Carbon Credits', icon: Globe },
        { id: 'bom', label: 'Bill of Materials', icon: Hash },
        { id: 'nextsteps', label: 'Next Steps', icon: CheckCircle },
    ];

    const SpecTable = ({ headers, rows }) => (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead><tr className="bg-blue-600 text-white">{headers.map((h,i) => <th key={i} className="text-left p-3 font-bold">{h}</th>)}</tr></thead>
                <tbody>{rows.map((row, i) => <tr key={i} className="border-b border-gray-100 hover:bg-blue-50">{row.map((cell, j) => <td key={j} className={"p-3 " + (j===0 ? "font-bold text-gray-800" : "text-gray-600")}>{cell}</td>)}</tr>)}</tbody>
            </table>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-900 via-blue-900 to-orange-700 text-white rounded-2xl p-6">
                <div className="text-center">
                    <div className="inline-block px-4 py-1 bg-white/15 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3">Technical Specification v2.0 — Feb 2026</div>
                    <h1 className="text-3xl font-black mb-2">iSAVE — Full System Technical Design</h1>
                    <p className="text-blue-200 text-sm mb-1">From sensor to blockchain to grid — the complete architecture</p>
                    <p className="text-blue-300/70 text-xs">Heat Pumps · Solar PV · Thermal & Electric Batteries · Fan Coils · Utterberry Sensors · Rubidex Blockchain · Karnot Cloud · Kraken Integration</p>
                    <div className="flex justify-center gap-2 mt-4 flex-wrap">
                        {['IEEE 2030.5', 'SG-Ready', 'Rubidex Blockchain', 'Utterberry Sensors', 'Octopus Kraken API', 'Philippines First'].map(t => (
                            <span key={t} className="text-[10px] font-bold px-3 py-1 bg-white/15 rounded-full">{t}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Section Nav */}
            <div className="flex gap-1 flex-wrap">
                {SECTIONS.map(s => (
                    <button key={s.id} onClick={() => setActiveSection(s.id)}
                        className={"flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all " + (activeSection === s.id ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50")}>
                        <s.icon size={12} /> {s.label}
                    </button>
                ))}
            </div>

            {/* ====== DESIGN DECISIONS ====== */}
            {activeSection === 'design' && (
                <div className="space-y-3">
                    <div className="text-center mb-4"><h2 className="text-xl font-black text-gray-800">Five Core Design Decisions</h2><p className="text-xs text-gray-500">Strategic choices that shape the whole system</p></div>
                    {DESIGN_DECISIONS.map((d, i) => (
                        <Card key={i} className="border-t-4 border-orange-400">
                            <div className="text-2xl mb-2">{d.icon}</div>
                            <h3 className="font-black text-sm text-gray-800 mb-2">{d.title}</h3>
                            <p className="text-xs text-gray-600 mb-3">{d.description}</p>
                            {d.plan && <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs text-blue-700 font-bold">{d.plan}</p></div>}
                            {d.envSpecs && <div className="grid grid-cols-4 gap-2 mt-3">{d.envSpecs.map((e, j) => <div key={j} className={e.color + " rounded-lg p-2 text-center"}><div className="text-[10px] font-bold">{e.label}</div><div className="text-[10px] mt-1">{e.value}</div></div>)}</div>}
                        </Card>
                    ))}
                </div>
            )}

            {/* ====== ARCHITECTURE ====== */}
            {activeSection === 'architecture' && (
                <div className="space-y-2">
                    <div className="text-center mb-4"><h2 className="text-xl font-black text-gray-800">Complete iSAVE Architecture</h2><p className="text-xs text-gray-500">Five layers from physical sensors to grid markets</p></div>
                    <Card>
                        {ARCHITECTURE_LAYERS.map((layer, i) => (
                            <div key={i}>
                                <div className={"border-2 rounded-lg p-3 mb-2 relative " + layer.color}>
                                    <div className={"absolute -top-2.5 left-3 px-2 py-0.5 rounded text-[9px] font-bold text-white " + layer.labelBg}>{layer.name}</div>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {layer.components.map((c, j) => <span key={j} className="text-[10px] bg-gray-100 text-gray-700 px-2 py-1 rounded font-bold">{c}</span>)}
                                    </div>
                                </div>
                                {layer.connector && <div className="text-center text-[10px] text-gray-400 font-bold py-1">↕ {layer.connector}</div>}
                            </div>
                        ))}
                    </Card>
                </div>
            )}

            {/* ====== GATEWAY HARDWARE ====== */}
            {activeSection === 'gateway' && (
                <div className="space-y-3">
                    <div className="text-center mb-4"><h2 className="text-xl font-black text-gray-800">iSAVE Gateway Controller</h2><p className="text-xs text-gray-500">The on-site SCADA node. One device, every connection, 10-year life</p></div>
                    <SpecTable headers={['Category', 'Specification', 'Notes']} rows={GATEWAY_SPECS.map(s => [s.cat, s.spec, s.notes])} />
                </div>
            )}

            {/* ====== EQUIPMENT ====== */}
            {activeSection === 'equipment' && (
                <div className="space-y-4">
                    <div className="text-center mb-4"><h2 className="text-xl font-black text-gray-800">Recommended Equipment</h2><p className="text-xs text-gray-500">Confirmed compatible with iSAVE Gateway</p></div>
                    {[
                        { title: 'Heat Pumps', data: EQUIPMENT.heatPumps, color: 'border-blue-500' },
                        { title: 'Solar PV Inverters', data: EQUIPMENT.solarInverters, color: 'border-yellow-500' },
                        { title: 'Electric Batteries (BESS)', data: EQUIPMENT.batteries, color: 'border-green-500' },
                        { title: 'Energy Meters & DR Relays', data: EQUIPMENT.metersRelays, color: 'border-purple-500' },
                    ].map((section, i) => (
                        <div key={i}>
                            <h3 className={"font-black text-sm text-gray-800 mb-2 pl-2 border-l-4 " + section.color}>{section.title}</h3>
                            <SpecTable headers={['Product', 'Protocol', 'iSAVE Connection', 'Notes']} rows={section.data.map(d => [d.product, d.protocol, d.connection, d.notes])} />
                        </div>
                    ))}
                    <Card className="bg-yellow-50 border-yellow-200"><p className="text-xs text-yellow-800 font-bold">GUDE units are exactly right for iSAVE DR relay control. They connect via Ethernet, respond to HTTP commands in &lt;100ms, and the 2314-1 measures actual energy per channel — giving utility-grade proof of load shed for DR payment claims.</p></Card>
                </div>
            )}

            {/* ====== PROTOCOLS ====== */}
            {activeSection === 'protocols' && (
                <div className="space-y-2">
                    <div className="text-center mb-4"><h2 className="text-xl font-black text-gray-800">Communication Protocols</h2><p className="text-xs text-gray-500">Every connection, with exact protocol and why</p></div>
                    {PROTOCOLS.map((p, i) => (
                        <Card key={i} className="border-l-4 border-blue-400">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-black text-xs text-gray-800">{p.from} → {p.to}</span>
                                {p.protocols.map((pr, j) => <span key={j} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{pr}</span>)}
                            </div>
                            <p className="text-[10px] text-gray-600">{p.detail}</p>
                        </Card>
                    ))}
                </div>
            )}

            {/* ====== SG-READY ====== */}
            {activeSection === 'sgready' && (
                <div className="space-y-3">
                    <div className="text-center mb-4"><h2 className="text-xl font-black text-gray-800">SG-Ready Implementation</h2><p className="text-xs text-gray-500">All 4 modes per German BWP standard — the de-facto smart grid heat pump interface</p></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {SG_READY_MODES.map(m => (
                            <Card key={m.mode} className={"border-t-4 " + m.color}>
                                <div className="text-2xl mb-2">{m.icon}</div>
                                <h3 className="font-black text-xs text-gray-800 mb-1">Mode {m.mode} — {m.name}</h3>
                                <p className="text-[10px] text-gray-600 mb-2">{m.description}</p>
                                <div className="bg-gray-100 rounded p-2 font-mono text-[10px] text-gray-600">Relay 1: {m.relay1} | Relay 2: {m.relay2}</div>
                            </Card>
                        ))}
                    </div>
                    <Card className="bg-gray-50"><h4 className="font-black text-xs text-gray-800 mb-1">Universal Wiring</h4><p className="text-[10px] text-gray-600">4 potential-free relay outputs (SG1+/SG1-, SG2+/SG2-) wire directly to any SG-Ready or EVU terminals. Works with Daikin, Mitsubishi, Panasonic, Vaillant, Viessmann, Worcester Bosch — any BWP-compliant heat pump. No HP-side programming required.</p></Card>
                </div>
            )}

            {/* ====== IEEE STANDARDS ====== */}
            {activeSection === 'standards' && (
                <div className="space-y-3">
                    <div className="text-center mb-4"><h2 className="text-xl font-black text-gray-800">IEEE & IEC Standards Compliance</h2></div>
                    <SpecTable headers={['Standard', 'Title', 'Relevance to iSAVE', 'Status']} rows={IEEE_STANDARDS.map(s => [s.std, s.title, s.relevance, s.status])} />
                </div>
            )}

            {/* ====== CLOUD STACK ====== */}
            {activeSection === 'cloud' && (
                <div className="space-y-3">
                    <div className="text-center mb-4"><h2 className="text-xl font-black text-gray-800">Karnot Control Centre — Software Stack</h2><p className="text-xs text-gray-500">Open-source proven tech — no vendor lock-in</p></div>
                    <SpecTable headers={['Component', 'Technology', 'Why']} rows={CLOUD_STACK.map(s => [s.component, s.tech, s.why])} />
                </div>
            )}

            {/* ====== CARBON CREDITS ====== */}
            {activeSection === 'carbon' && (
                <div className="space-y-3">
                    <div className="text-center mb-4"><h2 className="text-xl font-black text-gray-800">Rubidex Blockchain & Carbon Credit Pipeline</h2><p className="text-xs text-gray-500">Every kWh saved becomes a verified, tradeable carbon credit</p></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            { step: 1, title: 'Establish Baseline', items: ['30-day pre-install energy baseline from utility meter', 'Weather-normalised baseline using local temp data', 'Committed to Rubidex blockchain (tamper-proof)', 'Rubidex issues unique Device Credential NFT'] },
                            { step: 2, title: 'Continuous Measurement (Every 15 min)', items: ['Read energy meter: actual kWh consumed', 'Calculate: Baseline kWh - Actual kWh = Saved kWh', 'Apply PH Grid Emission Factor (kgCO2/kWh from DOE)', 'Bundle signed with device key → Rubidex API'] },
                            { step: 3, title: 'Monthly Credit Batch', items: ['Aggregate Rubidex-verified avoided CO2 per site', 'Submit to Gold Standard registry API', 'Blockchain proof = no site visit required', 'Credits: 1 VER = 1 tonne CO2 avoided'] },
                            { step: 4, title: 'Revenue Distribution (Smart Contract)', items: ['Sell on voluntary market (Xpansiv, AirCarbon)', 'PH price: ~$8-15/tonne CO2 (growing)', 'Auto-distribute: 70% site owner, 15% Karnot, 15% ops', 'Full audit trail on Rubidex ledger'] },
                        ].map(s => (
                            <Card key={s.step} className="bg-purple-50 border-purple-200">
                                <h3 className="font-black text-sm text-purple-800 mb-2">Step {s.step}: {s.title}</h3>
                                <ul className="space-y-1">{s.items.map((item, j) => <li key={j} className="text-[10px] text-purple-700 pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-purple-400">{item}</li>)}</ul>
                            </Card>
                        ))}
                    </div>
                    <Card className="bg-purple-900 text-white">
                        <h4 className="font-black text-xs mb-1">Philippines Carbon Market</h4>
                        <p className="text-[10px] text-purple-200">CCC launched Philippine Carbon Market under RA 11285. Karnot iSAVE with Rubidex verification generates credits under: (a) Gold Standard Efficient HVAC methodology, (b) CDM/SD-VISta demand-side efficiency, (c) Future PH voluntary carbon exchange. Luzon grid emission factor: ~0.6 kgCO2/kWh (2024, DOE).</p>
                    </Card>
                </div>
            )}

            {/* ====== BOM ====== */}
            {activeSection === 'bom' && (
                <div className="space-y-3">
                    <div className="text-center mb-4"><h2 className="text-xl font-black text-gray-800">Bill of Materials — Philippines Commercial Site</h2><p className="text-xs text-gray-500">50kW cooling, 30kWp solar, 50kWh BESS, 3,000L thermal storage</p></div>
                    <SpecTable headers={['Item', 'Product', 'Qty', 'Unit Cost', 'Total']} rows={BOM.map(b => [b.item, b.product, b.qty, b.unit, b.total])} />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Card className="bg-blue-50 text-center"><div className="text-lg font-black text-blue-700">~$52,802</div><div className="text-[10px] text-blue-600">Total Hardware + Install</div></Card>
                        <Card className="bg-green-50 text-center"><div className="text-lg font-black text-green-700">$1,200/yr</div><div className="text-[10px] text-green-600">iSAVE SaaS Subscription</div></Card>
                        <Card className="bg-orange-50 text-center"><div className="text-lg font-black text-orange-700">~$4,200/yr</div><div className="text-[10px] text-orange-600">DR Revenue (50kW × 2000hrs)</div></Card>
                        <Card className="bg-purple-50 text-center"><div className="text-lg font-black text-purple-700">~$600/yr</div><div className="text-[10px] text-purple-600">Carbon Credits (50t CO2)</div></Card>
                    </div>
                </div>
            )}

            {/* ====== NEXT STEPS ====== */}
            {activeSection === 'nextsteps' && (
                <div className="space-y-3">
                    <div className="text-center mb-4"><h2 className="text-xl font-black text-gray-800">Immediate Next Steps</h2><p className="text-xs text-gray-500">8 actions that turn this design into a real product</p></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {NEXT_STEPS.map(s => (
                            <Card key={s.num} className={"border-t-4 " + s.color}>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-black text-xs text-gray-800">{s.num}. {s.title}</h3>
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{s.timing}</span>
                                </div>
                                <p className="text-[10px] text-gray-600">{s.detail}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
