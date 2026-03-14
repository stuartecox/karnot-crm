import React, { useState, useMemo, useEffect } from 'react';
import { Factory, MapPin, Building2, Filter, Search, Check, Users, Zap, Package, Globe, RefreshCw, Plus, X, Clock, Database, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Card, Button, Input } from '../data/constants.jsx';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, setDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';

const DEFAULT_PEZA_ZONES = [
    {
        id: 'PEZA-001',
        zoneName: 'Clark Freeport Zone',
        zoneType: 'Manufacturing & IT Park',
        region: 'Region III',
        province: 'Pampanga',
        city: 'Mabalacat City',
        established: '1993',
        area: '36,000 hectares',
        majorTenants: [
            { name: 'Texas Instruments', industry: 'Electronics Manufacturing', employees: 2500 },
            { name: 'Nestlé Clark', industry: 'Food Manufacturing', employees: 800 },
            { name: 'Hanjin Heavy Industries', industry: 'Shipbuilding', employees: 5000 },
            { name: 'Lufthansa Technik Philippines', industry: 'Aircraft Maintenance', employees: 3200 },
            { name: 'Asialink Finance Corp', industry: 'BPO', employees: 1500 }
        ],
        infrastructure: ['Power: 24/7 stable', 'Water: High capacity', 'Advanced cooling systems needed', 'Data centers'],
        contact: 'Clark Development Corporation',
        website: 'https://www.clark.com.ph'
    },
    {
        id: 'PEZA-002',
        zoneName: 'Laguna Technopark',
        zoneType: 'IT Park & Light Manufacturing',
        region: 'CALABARZON',
        province: 'Laguna',
        city: 'Biñan City',
        established: '1997',
        area: '500 hectares',
        majorTenants: [
            { name: 'IBM Philippines', industry: 'IT Services', employees: 5000 },
            { name: 'NEC Technologies', industry: 'Electronics', employees: 1200 },
            { name: 'Sanyo Electronics', industry: 'Consumer Electronics', employees: 2000 },
            { name: 'Toshiba Information Equipment', industry: 'IT Hardware', employees: 1800 },
            { name: 'Canon Business Machines', industry: 'Office Equipment', employees: 1500 }
        ],
        infrastructure: ['24/7 power', 'High-speed internet', 'Central HVAC infrastructure', 'Cold storage facilities'],
        contact: 'Laguna Technopark Inc.',
        website: 'https://www.lagunatechnopark.com'
    },
    {
        id: 'PEZA-003',
        zoneName: 'Mactan Economic Zone',
        zoneType: 'Manufacturing & Logistics',
        region: 'Region VII',
        province: 'Cebu',
        city: 'Lapu-Lapu City',
        established: '1979',
        area: '140 hectares',
        majorTenants: [
            { name: 'Taiheiyo Cement Philippines', industry: 'Cement Manufacturing', employees: 450 },
            { name: 'Amertron Inc', industry: 'Electronics', employees: 2500 },
            { name: 'Tsuneishi Heavy Industries', industry: 'Shipbuilding', employees: 3500 },
            { name: 'Cebu Export Processing Zone', industry: 'Garments', employees: 8000 },
            { name: 'Fair Electronics', industry: 'PCB Manufacturing', employees: 1200 }
        ],
        infrastructure: ['Port access', 'Airport proximity', 'Industrial cooling required', 'Cold chain logistics'],
        contact: 'Mactan Economic Zone Authority',
        website: 'https://www.mepz.gov.ph'
    },
    {
        id: 'PEZA-004',
        zoneName: 'LIMA Technology Center',
        zoneType: 'IT Park & Light Industry',
        region: 'CALABARZON',
        province: 'Batangas',
        city: 'Lipa City',
        established: '1996',
        area: '500 hectares',
        majorTenants: [
            { name: 'Intel Philippines', industry: 'Semiconductor Manufacturing', employees: 4000 },
            { name: 'First Philippine Industrial Park', industry: 'Electronics', employees: 2500 },
            { name: 'Canon Precision', industry: 'Precision Equipment', employees: 1800 },
            { name: 'Mitsumi Electronics', industry: 'Electronic Components', employees: 3200 },
            { name: 'Nidec Philippines', industry: 'Motors Manufacturing', employees: 2000 }
        ],
        infrastructure: ['High-capacity power', 'Advanced telecommunications', 'Precision cooling requirements', 'Clean rooms'],
        contact: 'LIMA Land Inc.',
        website: 'https://www.limaland.com.ph'
    },
    {
        id: 'PEZA-005',
        zoneName: 'Subic Bay Freeport Zone',
        zoneType: 'Multi-Sector Industrial Park',
        region: 'Region III',
        province: 'Zambales',
        city: 'Subic',
        established: '1992',
        area: '67,000 hectares',
        majorTenants: [
            { name: 'Hanjin Shipyard', industry: 'Shipbuilding', employees: 5000 },
            { name: 'Federal Express', industry: 'Logistics', employees: 800 },
            { name: 'Subic Bay Marine Exploratorium', industry: 'Tourism', employees: 200 },
            { name: 'Convergys Philippines', industry: 'BPO', employees: 4500 },
            { name: 'Aleson Shipping Lines', industry: 'Maritime Services', employees: 600 }
        ],
        infrastructure: ['Deep water port', 'Airport', 'Tax-free zone', 'Large-scale refrigeration needs'],
        contact: 'Subic Bay Metropolitan Authority',
        website: 'https://www.sbma.com'
    },
    {
        id: 'PEZA-006',
        zoneName: 'Cavite Economic Zone',
        zoneType: 'Export Processing Zone',
        region: 'CALABARZON',
        province: 'Cavite',
        city: 'Rosario',
        established: '1995',
        area: '275 hectares',
        majorTenants: [
            { name: 'TDK Philippines', industry: 'Electronics Components', employees: 6000 },
            { name: 'Integrated Micro-Electronics', industry: 'Electronics Manufacturing', employees: 8000 },
            { name: 'Sony Precision Engineering Center', industry: 'Precision Parts', employees: 2500 },
            { name: 'Fujitsu Computer Products', industry: 'IT Hardware', employees: 1500 },
            { name: 'Yazaki Torres Manufacturing', industry: 'Automotive Parts', employees: 3500 }
        ],
        infrastructure: ['Stable power supply', 'Water treatment plant', 'Climate-controlled facilities', 'Export logistics hub'],
        contact: 'Cavite Economic Zone Authority',
        website: 'https://www.ceza.gov.ph'
    },
    {
        id: 'PEZA-007',
        zoneName: 'Gateway Business Park',
        zoneType: 'IT Park & BPO Hub',
        region: 'Region VII',
        province: 'Cebu',
        city: 'Mandaue City',
        established: '2004',
        area: '18 hectares',
        majorTenants: [
            { name: 'JP Morgan Chase', industry: 'Financial BPO', employees: 3000 },
            { name: 'Accenture Cebu', industry: 'IT Services', employees: 5000 },
            { name: 'Teleperformance', industry: 'Call Center', employees: 4500 },
            { name: 'Concentrix', industry: 'Customer Support', employees: 6000 },
            { name: 'TTEC', industry: 'BPO', employees: 2500 }
        ],
        infrastructure: ['Redundant power systems', 'Fiber optic backbone', '24/7 HVAC systems critical', 'Data center cooling'],
        contact: 'Filinvest Land Inc.',
        website: 'https://www.gatewaypark.com.ph'
    },
    {
        id: 'PEZA-008',
        zoneName: 'Bataan Economic Zone',
        zoneType: 'Heavy Manufacturing',
        region: 'Region III',
        province: 'Bataan',
        city: 'Mariveles',
        established: '1972',
        area: '440 hectares',
        majorTenants: [
            { name: 'Petron Corporation', industry: 'Petroleum Refining', employees: 2000 },
            { name: 'Hermosa Ecozone Development Corp', industry: 'Mixed Manufacturing', employees: 3500 },
            { name: 'Taiwan Cement Corp', industry: 'Cement Production', employees: 800 },
            { name: 'JG Summit Petrochemicals', industry: 'Petrochemicals', employees: 1500 },
            { name: 'Energy Development Corporation', industry: 'Power Generation', employees: 600 }
        ],
        infrastructure: ['Deep water port', 'Heavy industrial power', 'Process cooling systems', 'Hazmat facilities'],
        contact: 'BEPZ Authority',
        website: 'https://www.bepz.gov.ph'
    }
];

const PEZAZones = ({ territories = [], user }) => {
    const [selectedRegion, setSelectedRegion] = useState('ALL');
    const [selectedZoneType, setSelectedZoneType] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [addedCompanies, setAddedCompanies] = useState(new Set());
    const [addingCompany, setAddingCompany] = useState(null);
    const [customZones, setCustomZones] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showAddZone, setShowAddZone] = useState(false);
    const [showAddCompany, setShowAddCompany] = useState(false);
    const [expandedZones, setExpandedZones] = useState(new Set());
    const [newZone, setNewZone] = useState({
        zoneName: '', zoneType: '', region: '', province: '', city: '',
        established: '', area: '', contact: '', website: '', infrastructure: ''
    });
    const [newCompany, setNewCompany] = useState({
        zoneId: '', name: '', industry: '', employees: ''
    });

    // Load custom zones from Firestore
    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(
            collection(db, 'users', user.uid, 'peza_custom_zones'),
            (snap) => {
                const zones = snap.docs.map(d => ({ ...d.data(), _firestoreId: d.id, isCustom: true }));
                setCustomZones(zones);
                if (snap.docs.length > 0) {
                    const latest = snap.docs.reduce((max, d) => {
                        const ts = d.data().updatedAt?.toDate?.() || d.data().createdAt?.toDate?.();
                        return ts && ts > max ? ts : max;
                    }, new Date(0));
                    if (latest > new Date(0)) setLastUpdated(latest);
                }
            }
        );
        return () => unsub();
    }, [user]);

    // Merge default + custom zones
    const pezaZones = useMemo(() => {
        const merged = [...DEFAULT_PEZA_ZONES];
        customZones.forEach(cz => {
            const existingIdx = merged.findIndex(z => z.id === cz.id);
            if (existingIdx >= 0) {
                // Merge custom tenants into existing zone
                if (cz.majorTenants?.length) {
                    merged[existingIdx] = {
                        ...merged[existingIdx],
                        majorTenants: [
                            ...merged[existingIdx].majorTenants,
                            ...cz.majorTenants.map(t => ({ ...t, isCustom: true, _firestoreId: cz._firestoreId }))
                        ]
                    };
                }
            } else {
                // New zone entirely
                merged.push({
                    ...cz,
                    majorTenants: (cz.majorTenants || []).map(t => ({ ...t, isCustom: true, _firestoreId: cz._firestoreId }))
                });
            }
        });
        return merged;
    }, [customZones]);

    const regions = ['ALL', 'NCR', 'CALABARZON', 'Region III', 'Region VII'];
    const zoneTypes = ['ALL', 'Manufacturing & IT Park', 'IT Park & Light Manufacturing', 'Export Processing Zone', 'Multi-Sector Industrial Park', 'IT Park & BPO Hub', 'Heavy Manufacturing', 'Manufacturing & Logistics', 'IT Park & Light Industry'];

    // Flatten companies with zone info
    const allCompanies = useMemo(() => {
        return pezaZones.flatMap(zone =>
            zone.majorTenants.map(tenant => ({
                ...tenant,
                zoneId: zone.id,
                zoneName: zone.zoneName,
                zoneType: zone.zoneType,
                region: zone.region,
                province: zone.province,
                city: zone.city,
                infrastructure: zone.infrastructure,
                zoneContact: zone.contact,
                zoneWebsite: zone.website
            }))
        );
    }, [pezaZones]);

    const filteredCompanies = useMemo(() => {
        return allCompanies.filter(company => {
            const matchesRegion = selectedRegion === 'ALL' || company.region === selectedRegion;
            const matchesZoneType = selectedZoneType === 'ALL' || company.zoneType === selectedZoneType;
            const matchesSearch = searchTerm === '' ||
                company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                company.zoneName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                company.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
                company.city.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesRegion && matchesZoneType && matchesSearch;
        });
    }, [selectedRegion, selectedZoneType, searchTerm, allCompanies]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            // Re-read from Firestore (the onSnapshot handles this automatically)
            // This also updates the timestamp display
            setLastUpdated(new Date());
            // Small delay to show the refresh animation
            await new Promise(r => setTimeout(r, 800));
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleAddZone = async () => {
        if (!user || !newZone.zoneName || !newZone.region) return;
        const zoneId = `PEZA-CUSTOM-${Date.now()}`;
        await addDoc(collection(db, 'users', user.uid, 'peza_custom_zones'), {
            id: zoneId,
            zoneName: newZone.zoneName,
            zoneType: newZone.zoneType || 'Custom Zone',
            region: newZone.region,
            province: newZone.province,
            city: newZone.city,
            established: newZone.established || 'N/A',
            area: newZone.area || 'N/A',
            contact: newZone.contact,
            website: newZone.website,
            infrastructure: newZone.infrastructure ? newZone.infrastructure.split(',').map(s => s.trim()) : [],
            majorTenants: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        setNewZone({ zoneName: '', zoneType: '', region: '', province: '', city: '', established: '', area: '', contact: '', website: '', infrastructure: '' });
        setShowAddZone(false);
    };

    const handleAddCompanyToZone = async () => {
        if (!user || !newCompany.zoneId || !newCompany.name) return;
        const zone = pezaZones.find(z => z.id === newCompany.zoneId);
        // Check if this zone already has a custom entry
        const existingCustom = customZones.find(cz => cz.id === newCompany.zoneId);
        if (existingCustom) {
            // Update existing custom zone document
            await setDoc(doc(db, 'users', user.uid, 'peza_custom_zones', existingCustom._firestoreId), {
                ...existingCustom,
                majorTenants: [
                    ...(existingCustom.majorTenants || []),
                    { name: newCompany.name, industry: newCompany.industry, employees: Number(newCompany.employees) || 0 }
                ],
                updatedAt: serverTimestamp()
            }, { merge: true });
        } else {
            // Create new custom zone entry for this zone ID
            await addDoc(collection(db, 'users', user.uid, 'peza_custom_zones'), {
                id: newCompany.zoneId,
                zoneName: zone?.zoneName || newCompany.zoneId,
                majorTenants: [
                    { name: newCompany.name, industry: newCompany.industry, employees: Number(newCompany.employees) || 0 }
                ],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }
        setNewCompany({ zoneId: '', name: '', industry: '', employees: '' });
        setShowAddCompany(false);
    };

    const handleDeleteCustomCompany = async (company) => {
        if (!user || !company._firestoreId) return;
        if (!window.confirm(`Remove ${company.name} from custom entries?`)) return;
        const customDoc = customZones.find(cz => cz._firestoreId === company._firestoreId);
        if (customDoc) {
            const updatedTenants = (customDoc.majorTenants || []).filter(t => t.name !== company.name);
            if (updatedTenants.length === 0 && !DEFAULT_PEZA_ZONES.find(z => z.id === customDoc.id)) {
                await deleteDoc(doc(db, 'users', user.uid, 'peza_custom_zones', customDoc._firestoreId));
            } else {
                await setDoc(doc(db, 'users', user.uid, 'peza_custom_zones', customDoc._firestoreId), {
                    ...customDoc,
                    majorTenants: updatedTenants,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            }
        }
    };

    const handleAddToCompanies = async (company) => {
        if (!user) {
            alert('Please log in to add companies');
            return;
        }

        setAddingCompany(company.name);

        try {
            await addDoc(collection(db, "users", user.uid, "companies"), {
                companyName: company.name,
                address: `${company.zoneName}, ${company.city}, ${company.province}`,
                city: company.city,
                phone: '',
                website: company.zoneWebsite || '',
                email: '',
                industry: company.industry,
                isTarget: true,
                isCustomer: false,
                source: 'PEZA Economic Zone',
                pezaZone: company.zoneName,
                employees: company.employees,
                zoneInfrastructure: company.infrastructure.join('; '),
                notes: `PEZA Zone: ${company.zoneName}\nIndustry: ${company.industry}\nEmployees: ${company.employees}\nInfrastructure: ${company.infrastructure.join(', ')}`,
                createdAt: serverTimestamp()
            });

            alert(`${company.name} added to Companies!`);
            setAddedCompanies(prev => new Set(prev).add(company.name));
        } catch (error) {
            console.error('Error adding to companies:', error);
            alert('Error adding company. Please try again.');
        } finally {
            setAddingCompany(null);
        }
    };

    const toggleZoneExpand = (zoneId) => {
        setExpandedZones(prev => {
            const next = new Set(prev);
            next.has(zoneId) ? next.delete(zoneId) : next.add(zoneId);
            return next;
        });
    };

    const customCompanyCount = customZones.reduce((sum, cz) => sum + (cz.majorTenants?.length || 0), 0);

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl p-8 text-white">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <Factory size={32} />
                        <h1 className="text-3xl font-black uppercase tracking-tight">PEZA Economic Zones</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {lastUpdated && (
                            <div className="flex items-center gap-1 text-blue-100 text-xs">
                                <Clock size={12} />
                                <span>Updated: {lastUpdated.toLocaleDateString()} {lastUpdated.toLocaleTimeString()}</span>
                            </div>
                        )}
                        <Button
                            onClick={handleRefresh}
                            className="bg-white/20 hover:bg-white/30 text-white border-none text-xs"
                            disabled={isRefreshing}
                        >
                            <RefreshCw size={14} className={`mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                        </Button>
                    </div>
                </div>
                <p className="text-blue-100 text-sm font-bold">
                    Track PEZA-registered companies in industrial parks and economic zones
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-500">PEZA Zones</p>
                            <p className="text-3xl font-black text-purple-700">{pezaZones.length}</p>
                        </div>
                        <Building2 size={32} className="text-purple-400" />
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-500">Companies</p>
                            <p className="text-3xl font-black text-blue-700">{allCompanies.length}</p>
                        </div>
                        <Factory size={32} className="text-blue-400" />
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-500">Filtered Results</p>
                            <p className="text-3xl font-black text-green-700">{filteredCompanies.length}</p>
                        </div>
                        <Search size={32} className="text-green-400" />
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-500">Added to CRM</p>
                            <p className="text-3xl font-black text-orange-700">{addedCompanies.size}</p>
                        </div>
                        <Check size={32} className="text-orange-400" />
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-500">Custom Added</p>
                            <p className="text-3xl font-black text-cyan-700">{customCompanyCount}</p>
                        </div>
                        <Database size={32} className="text-cyan-400" />
                    </div>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <Button
                    variant="primary"
                    className="text-xs"
                    onClick={() => { setShowAddZone(!showAddZone); setShowAddCompany(false); }}
                >
                    <Plus size={14} className="mr-1" />
                    Add New Zone
                </Button>
                <Button
                    variant="secondary"
                    className="text-xs"
                    onClick={() => { setShowAddCompany(!showAddCompany); setShowAddZone(false); }}
                >
                    <Plus size={14} className="mr-1" />
                    Add Company to Zone
                </Button>
            </div>

            {/* Add Zone Form */}
            {showAddZone && (
                <Card className="p-6 border-2 border-blue-300 bg-blue-50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-gray-800 uppercase text-sm">Add New PEZA Zone</h3>
                        <button onClick={() => setShowAddZone(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Zone Name *</label>
                            <input value={newZone.zoneName} onChange={e => setNewZone(p => ({ ...p, zoneName: e.target.value }))}
                                className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. Manila IT Park" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Zone Type</label>
                            <input value={newZone.zoneType} onChange={e => setNewZone(p => ({ ...p, zoneType: e.target.value }))}
                                className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. IT Park & BPO Hub" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Region *</label>
                            <input value={newZone.region} onChange={e => setNewZone(p => ({ ...p, region: e.target.value }))}
                                className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. NCR" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Province</label>
                            <input value={newZone.province} onChange={e => setNewZone(p => ({ ...p, province: e.target.value }))}
                                className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. Metro Manila" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">City</label>
                            <input value={newZone.city} onChange={e => setNewZone(p => ({ ...p, city: e.target.value }))}
                                className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. Makati City" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Year Established</label>
                            <input value={newZone.established} onChange={e => setNewZone(p => ({ ...p, established: e.target.value }))}
                                className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. 2005" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Area</label>
                            <input value={newZone.area} onChange={e => setNewZone(p => ({ ...p, area: e.target.value }))}
                                className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. 50 hectares" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Contact</label>
                            <input value={newZone.contact} onChange={e => setNewZone(p => ({ ...p, contact: e.target.value }))}
                                className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. Zone Admin Office" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Website</label>
                            <input value={newZone.website} onChange={e => setNewZone(p => ({ ...p, website: e.target.value }))}
                                className="w-full p-2 border rounded-lg text-sm" placeholder="https://..." />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Infrastructure (comma-separated)</label>
                        <input value={newZone.infrastructure} onChange={e => setNewZone(p => ({ ...p, infrastructure: e.target.value }))}
                            className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. 24/7 power, Fiber optic, HVAC systems" />
                    </div>
                    <Button variant="primary" className="text-xs" onClick={handleAddZone} disabled={!newZone.zoneName || !newZone.region}>
                        <Plus size={14} className="mr-1" /> Save New Zone
                    </Button>
                </Card>
            )}

            {/* Add Company to Zone Form */}
            {showAddCompany && (
                <Card className="p-6 border-2 border-green-300 bg-green-50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-gray-800 uppercase text-sm">Add Company to Existing Zone</h3>
                        <button onClick={() => setShowAddCompany(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Select Zone *</label>
                            <select value={newCompany.zoneId} onChange={e => setNewCompany(p => ({ ...p, zoneId: e.target.value }))}
                                className="w-full p-2 border rounded-lg text-sm bg-white">
                                <option value="">-- Select Zone --</option>
                                {pezaZones.map(z => <option key={z.id} value={z.id}>{z.zoneName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Company Name *</label>
                            <input value={newCompany.name} onChange={e => setNewCompany(p => ({ ...p, name: e.target.value }))}
                                className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. Accenture Manila" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Industry</label>
                            <input value={newCompany.industry} onChange={e => setNewCompany(p => ({ ...p, industry: e.target.value }))}
                                className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. IT Services" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Employees</label>
                            <input type="number" value={newCompany.employees} onChange={e => setNewCompany(p => ({ ...p, employees: e.target.value }))}
                                className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. 500" />
                        </div>
                    </div>
                    <Button variant="primary" className="text-xs" onClick={handleAddCompanyToZone} disabled={!newCompany.zoneId || !newCompany.name}>
                        <Plus size={14} className="mr-1" /> Add Company
                    </Button>
                </Card>
            )}

            {/* Filters */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={18} className="text-gray-600" />
                    <h2 className="text-lg font-black text-gray-800 uppercase">Filters</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Region</label>
                        <select
                            value={selectedRegion}
                            onChange={e => setSelectedRegion(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm"
                        >
                            {regions.map(region => (
                                <option key={region} value={region}>{region}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Zone Type</label>
                        <select
                            value={selectedZoneType}
                            onChange={e => setSelectedZoneType(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm"
                        >
                            {zoneTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Search</label>
                        <Input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Company, zone, or industry..."
                            icon={Search}
                        />
                    </div>
                </div>
            </Card>

            {/* Zone Overview Cards */}
            <Card className="p-6">
                <h2 className="text-lg font-black text-gray-800 uppercase mb-4 flex items-center gap-2">
                    <Building2 size={18} />
                    Zone Directory
                </h2>
                <div className="space-y-2">
                    {pezaZones.map(zone => (
                        <div key={zone.id} className={`border rounded-xl overflow-hidden ${zone.isCustom ? 'border-cyan-300 bg-cyan-50' : ''}`}>
                            <button
                                onClick={() => toggleZoneExpand(zone.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <Factory size={16} className="text-blue-500" />
                                    <div>
                                        <span className="font-black text-sm text-gray-800">{zone.zoneName}</span>
                                        {zone.isCustom && <span className="ml-2 text-[9px] bg-cyan-500 text-white px-2 py-0.5 rounded-full font-black">CUSTOM</span>}
                                        <span className="ml-2 text-xs text-gray-500">{zone.city}, {zone.province}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-gray-500">{zone.majorTenants.length} companies</span>
                                    {expandedZones.has(zone.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                            </button>
                            {expandedZones.has(zone.id) && (
                                <div className="border-t px-4 pb-4 bg-gray-50">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 py-3 text-xs">
                                        <div><span className="font-black text-gray-400 uppercase text-[10px]">Type:</span> <span className="font-bold">{zone.zoneType}</span></div>
                                        <div><span className="font-black text-gray-400 uppercase text-[10px]">Region:</span> <span className="font-bold">{zone.region}</span></div>
                                        <div><span className="font-black text-gray-400 uppercase text-[10px]">Area:</span> <span className="font-bold">{zone.area}</span></div>
                                        <div><span className="font-black text-gray-400 uppercase text-[10px]">Est:</span> <span className="font-bold">{zone.established}</span></div>
                                    </div>
                                    {zone.infrastructure && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {zone.infrastructure.map((inf, i) => (
                                                <span key={i} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{inf}</span>
                                            ))}
                                        </div>
                                    )}
                                    {zone.website && (
                                        <a href={zone.website} target="_blank" rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mb-2">
                                            <Globe size={12} /> {zone.website}
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </Card>

            {/* Companies List */}
            <div className="space-y-3">
                <h2 className="text-lg font-black text-gray-800 uppercase flex items-center gap-2">
                    <Users size={18} />
                    All Companies ({filteredCompanies.length})
                </h2>
                {filteredCompanies.map((company, idx) => {
                    const isAdded = addedCompanies.has(company.name);
                    const isAdding = addingCompany === company.name;

                    return (
                        <Card
                            key={idx}
                            className={`p-5 transition-all ${
                                isAdded ? 'border-2 border-green-300 bg-green-50' :
                                company.isCustom ? 'border-2 border-cyan-200 bg-cyan-50' : 'hover:shadow-lg'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-black text-gray-800">{company.name}</h3>
                                        {isAdded && (
                                            <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1">
                                                <Check size={10} /> ADDED
                                            </span>
                                        )}
                                        {company.isCustom && (
                                            <span className="bg-cyan-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black">CUSTOM</span>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-gray-600 flex items-center gap-1">
                                        <Package size={12} />
                                        {company.industry}
                                    </p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                        <MapPin size={12} />
                                        {company.zoneName}, {company.city}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-blue-600">{company.zoneType}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 justify-end mt-1">
                                        <Users size={12} />
                                        {company.employees.toLocaleString()} employees
                                    </p>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mb-3">
                                <p className="text-[10px] font-black uppercase text-gray-500 mb-2 flex items-center gap-1">
                                    <Zap size={12} />
                                    Infrastructure & Cooling Needs
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {company.infrastructure.map((infra, i) => (
                                        <span key={i} className="text-xs bg-white px-2 py-1 rounded-lg font-bold text-gray-700">
                                            {infra}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    className="flex-1 text-xs"
                                    onClick={() => window.open(company.zoneWebsite, '_blank')}
                                >
                                    <Globe size={12} className="mr-1" />
                                    Zone Website
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex-1 text-xs"
                                    onClick={() => handleAddToCompanies(company)}
                                    disabled={isAdded || isAdding}
                                >
                                    {isAdding ? (
                                        <>Adding...</>
                                    ) : isAdded ? (
                                        <>
                                            <Check size={12} className="mr-1" />
                                            Added to CRM
                                        </>
                                    ) : (
                                        <>
                                            <Building2 size={12} className="mr-1" />
                                            Add to Companies
                                        </>
                                    )}
                                </Button>
                                {company.isCustom && (
                                    <Button
                                        variant="secondary"
                                        className="text-xs text-red-500 hover:bg-red-50"
                                        onClick={() => handleDeleteCustomCompany(company)}
                                    >
                                        <Trash2 size={12} />
                                    </Button>
                                )}
                            </div>
                        </Card>
                    );
                })}

                {filteredCompanies.length === 0 && (
                    <Card className="p-12 text-center">
                        <Factory size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-400 font-bold">No companies found matching your filters</p>
                        <p className="text-gray-400 text-sm">Try adjusting your search criteria</p>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default PEZAZones;
