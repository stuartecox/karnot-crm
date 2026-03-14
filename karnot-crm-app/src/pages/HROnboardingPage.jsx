import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input } from '../data/constants.jsx';
import {
    Users, UserCheck, UserPlus, Briefcase, FileText, Target, Calendar, CheckCircle,
    AlertCircle, Search, Filter, Plus, Trash2, Save, XCircle, Shield, BookOpen,
    Award, ClipboardList, Clock, Heart, Star, ChevronDown, ChevronUp, Edit3, X,
    Download, AlertTriangle, Building, Phone, Mail
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

// ─── Philippines HR Constants ────────────────────────────────────────────
const DEPARTMENTS = ['Operations', 'Engineering', 'Sales', 'Finance', 'HR', 'Admin', 'IT', 'Marketing'];
const EMPLOYMENT_TYPES = ['Probationary', 'Regular', 'Project-Based', 'Fixed-Term', 'Casual'];
const EMPLOYEE_STATUSES = ['Active', 'Probationary', 'On Leave', 'Resigned', 'Terminated'];
const GENDERS = ['Male', 'Female', 'Other'];
const CIVIL_STATUSES = ['Single', 'Married', 'Widowed', 'Separated', 'Divorced'];
const LEAVE_TYPES = [
    { key: 'sil', label: 'Service Incentive Leave', days: 5, law: 'Art. 95, Labor Code' },
    { key: 'vacation', label: 'Vacation Leave', days: 0, law: 'Company Policy' },
    { key: 'sick', label: 'Sick Leave', days: 0, law: 'Company Policy' },
    { key: 'maternity', label: 'Maternity Leave', days: 105, law: 'RA 11210' },
    { key: 'paternity', label: 'Paternity Leave', days: 7, law: 'RA 8187' },
    { key: 'soloParent', label: 'Solo Parent Leave', days: 7, law: 'RA 8972' },
    { key: 'vawc', label: 'VAWC Leave', days: 10, law: 'RA 9262' },
    { key: 'bereavement', label: 'Bereavement Leave', days: 3, law: 'Company Policy' },
];
const TRAINING_TYPES = ['Technical', 'Safety/OSH', 'Compliance', 'Soft Skills', 'Leadership', 'Product', 'Certification'];
const DISCIPLINE_TYPES = ['Verbal Warning', 'Written Warning (NTE)', 'Suspension', 'Final Warning', 'Termination'];

// ─── KPI Categories for Appraisals ──────────────────────────────────────
const KPI_CATEGORIES = [
    { key: 'quality', label: 'Quality of Work', description: 'Accuracy, thoroughness, standards' },
    { key: 'productivity', label: 'Productivity', description: 'Output volume, efficiency, deadlines' },
    { key: 'attendance', label: 'Attendance & Punctuality', description: 'Reliability, timeliness' },
    { key: 'teamwork', label: 'Teamwork & Collaboration', description: 'Communication, cooperation' },
    { key: 'initiative', label: 'Initiative & Problem Solving', description: 'Proactivity, creativity' },
    { key: 'technical', label: 'Technical Skills', description: 'Job-specific competencies' },
    { key: 'customer', label: 'Customer Focus', description: 'Client satisfaction, responsiveness' },
    { key: 'safety', label: 'Safety & Compliance', description: 'OSH adherence, policy compliance' },
];

// ─── Nearest Tuesday Calculator ─────────────────────────────────────────
const getNearestTuesday = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon, 2=Tue, ...
    const diff = (2 - day + 7) % 7 || 7; // days until next Tuesday (if already Tue, go to next)
    if (day === 2) return d.toISOString().split('T')[0]; // already Tuesday
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
};

const getAppraisalDates = (dateHired) => {
    if (!dateHired) return { threeMonth: null, sixMonth: null };
    const hired = new Date(dateHired);

    const threeMonthRaw = new Date(hired);
    threeMonthRaw.setMonth(threeMonthRaw.getMonth() + 3);

    const sixMonthRaw = new Date(hired);
    sixMonthRaw.setMonth(sixMonthRaw.getMonth() + 6);

    return {
        threeMonth: getNearestTuesday(threeMonthRaw),
        sixMonth: getNearestTuesday(sixMonthRaw)
    };
};

const DOCUMENT_CHECKLIST = {
    'Government IDs': [
        { key: 'tinCard', label: 'TIN Card / Number' },
        { key: 'sssId', label: 'SSS ID / Number' },
        { key: 'philhealthId', label: 'PhilHealth ID / Number' },
        { key: 'pagibigId', label: 'Pag-IBIG MID / Number' },
        { key: 'validGovernmentId', label: 'Valid Government ID (UMID/Passport/Drivers)' },
    ],
    'Pre-Employment': [
        { key: 'nbiClearance', label: 'NBI Clearance' },
        { key: 'policeClearance', label: 'Police Clearance' },
        { key: 'barangayClearance', label: 'Barangay Clearance' },
        { key: 'medicalCertificate', label: 'Pre-Employment Medical Certificate' },
        { key: 'drugTest', label: 'Drug Test Results' },
        { key: 'birthCertificatePSA', label: 'PSA Birth Certificate' },
        { key: 'idPhotos', label: '2x2 / 1x1 ID Photos' },
    ],
    'Education': [
        { key: 'diploma', label: 'Diploma' },
        { key: 'transcript', label: 'Transcript of Records' },
    ],
    'Employment History': [
        { key: 'previousCOE', label: 'Certificate of Employment (Previous)' },
        { key: 'bir2316Previous', label: 'BIR Form 2316 (Previous Employer)' },
    ],
    'Family (if applicable)': [
        { key: 'marriageCert', label: 'Marriage Certificate' },
        { key: 'dependentBirthCerts', label: 'Birth Certificates of Dependents' },
    ],
    'Company Documents': [
        { key: 'signedContract', label: 'Signed Employment Contract' },
        { key: 'offerLetter', label: 'Offer / Appointment Letter' },
        { key: 'ndaAgreement', label: 'NDA / Confidentiality Agreement' },
        { key: 'companyPolicyAck', label: 'Company Policy Acknowledgment' },
        { key: 'bankAccountDetails', label: 'Bank Account Details (Payroll)' },
    ],
};

const ALL_DOC_KEYS = Object.values(DOCUMENT_CHECKLIST).flat().map(d => d.key);

const EMPTY_EMPLOYEE = {
    firstName: '', lastName: '', middleName: '', suffix: '',
    dateOfBirth: '', gender: 'Male', civilStatus: 'Single', nationality: 'Filipino',
    address: '', city: '', province: '', zipCode: '',
    email: '', phone: '', emergencyContactName: '', emergencyContactPhone: '', emergencyRelation: '',
    tinNumber: '', sssNumber: '', philhealthNumber: '', pagibigNumber: '',
    passportNumber: '', passportExpiry: '', driversLicense: '', driversLicenseExpiry: '',
    position: '', department: 'Operations', employmentType: 'Probationary',
    dateHired: new Date().toISOString().split('T')[0], probationEndDate: '', regularizationDate: '',
    basicSalary: '', currency: 'PHP',
    status: 'Probationary',
    documents: Object.fromEntries(ALL_DOC_KEYS.map(k => [k, false])),
    leaveBalances: { sil: 5, vacation: 0, sick: 0 },
    performanceReviews: [], trainingLog: [], disciplinaryRecords: [], leaveRequests: [],
    notes: ''
};

// ─── Sub-Components ──────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const colors = {
        'Active': 'bg-green-100 text-green-700', 'Probationary': 'bg-yellow-100 text-yellow-700',
        'On Leave': 'bg-blue-100 text-blue-700', 'Resigned': 'bg-gray-100 text-gray-500',
        'Terminated': 'bg-red-100 text-red-700'
    };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>;
};

const RatingStars = ({ rating, size = 14 }) => (
    <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} size={size} className={i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
        ))}
    </div>
);

const TabBtn = ({ active, onClick, icon: Icon, label, badge }) => (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${active ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-orange-50 border border-gray-200'}`}>
        <Icon size={14} /> {label}
        {badge && <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${active ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{badge}</span>}
    </button>
);

const SectionHeader = ({ icon: Icon, title, sub, color = 'orange' }) => (
    <div className="mb-3">
        <h3 className="font-bold text-gray-800 flex items-center gap-2"><Icon size={16} className={`text-${color}-500`} /> {title}</h3>
        {sub && <p className="text-xs text-gray-400 mt-0.5 ml-6">{sub}</p>}
    </div>
);

const FormField = ({ label, children, required, span = 1 }) => (
    <div className={span === 2 ? 'md:col-span-2' : span === 3 ? 'md:col-span-3' : ''}>
        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
            {label} {required && <span className="text-red-400">*</span>}
        </label>
        {children}
    </div>
);

const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none";
const selectClass = inputClass;

// ─── Main Component ──────────────────────────────────────────────────────
export default function HROnboardingPage({ user }) {
    const [activeTab, setActiveTab] = useState('directory');
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_EMPLOYEE });
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    // Sub-forms
    const [leaveForm, setLeaveForm] = useState({ type: 'sil', startDate: '', endDate: '', days: 1, notes: '' });
    const [perfForm, setPerfForm] = useState({ period: '', rating: 3, reviewer: '', strengths: '', improvements: '', goals: '', notes: '', kpis: KPI_CATEGORIES.map(k => ({ key: k.key, label: k.label, target: '', actual: '', score: 3 })) });
    const [trainingForm, setTrainingForm] = useState({ title: '', date: '', provider: '', hours: '', type: 'Technical', notes: '' });
    const [disciplineForm, setDisciplineForm] = useState({ type: 'Verbal Warning', offense: '', action: '', notes: '' });

    // ─── Firebase Sync ───────────────────────────────────────────────────
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(collection(db, "users", user.uid, "employees"), orderBy("lastName", "asc"));
        const unsub = onSnapshot(q, snap => {
            setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, err => { console.error('HR load error:', err); setLoading(false); });
        return () => unsub();
    }, [user?.uid]);

    // ─── Stats ───────────────────────────────────────────────────────────
    const stats = useMemo(() => ({
        total: employees.length,
        active: employees.filter(e => e.status === 'Active').length,
        probationary: employees.filter(e => e.status === 'Probationary').length,
        onLeave: employees.filter(e => e.status === 'On Leave').length,
        departments: new Set(employees.map(e => e.department).filter(Boolean)).size
    }), [employees]);

    // ─── Filtered Employees ──────────────────────────────────────────────
    const filtered = useMemo(() => {
        if (!searchTerm) return employees;
        const q = searchTerm.toLowerCase();
        return employees.filter(e =>
            (e.firstName || '').toLowerCase().includes(q) ||
            (e.lastName || '').toLowerCase().includes(q) ||
            (e.position || '').toLowerCase().includes(q) ||
            (e.department || '').toLowerCase().includes(q) ||
            (e.email || '').toLowerCase().includes(q)
        );
    }, [employees, searchTerm]);

    // ─── Handlers ────────────────────────────────────────────────────────
    const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    const calcProbationEnd = (dateHired) => {
        if (!dateHired) return '';
        const d = new Date(dateHired);
        d.setMonth(d.getMonth() + 6);
        return d.toISOString().split('T')[0];
    };

    const handleSave = async () => {
        if (!form.firstName || !form.lastName) { setError('First name and last name are required.'); return; }
        setSaving(true); setError('');
        try {
            const data = {
                ...form,
                basicSalary: parseFloat(form.basicSalary) || 0,
                probationEndDate: form.probationEndDate || calcProbationEnd(form.dateHired),
            };
            if (editingId) {
                await updateDoc(doc(db, "users", user.uid, "employees", editingId), data);
                setSuccess(`Updated ${form.firstName} ${form.lastName}`);
                if (selectedEmployee?.id === editingId) setSelectedEmployee({ ...selectedEmployee, ...data });
            } else {
                data.createdAt = serverTimestamp();
                const ref = await addDoc(collection(db, "users", user.uid, "employees"), data);
                // Auto-schedule 3-month and 6-month appraisals
                const empName = `${form.firstName} ${form.lastName}`;
                if (data.dateHired && ['Probationary'].includes(data.status || data.employmentType)) {
                    const count = await scheduleAppraisals(empName, data.dateHired, ref.id);
                    if (count > 0) {
                        setSuccess(`Added ${empName} to the team! ${count} appraisal(s) scheduled on nearest Tuesdays in Calendar & Tasks.`);
                    } else {
                        setSuccess(`Added ${empName} to the team!`);
                    }
                } else {
                    setSuccess(`Added ${empName} to the team!`);
                }
                setSelectedEmployee({ id: ref.id, ...data });
            }
            setShowForm(false); setEditingId(null); setForm({ ...EMPTY_EMPLOYEE });
            setTimeout(() => setSuccess(''), 4000);
        } catch (err) { setError('Save failed: ' + err.message); }
        setSaving(false);
    };

    const handleEdit = (emp) => {
        setForm({ ...EMPTY_EMPLOYEE, ...emp });
        setEditingId(emp.id);
        setShowForm(true);
        setActiveTab('onboarding');
    };

    const handleDelete = async (emp) => {
        if (!window.confirm(`Delete ${emp.firstName} ${emp.lastName}? This cannot be undone.`)) return;
        try {
            await deleteDoc(doc(db, "users", user.uid, "employees", emp.id));
            if (selectedEmployee?.id === emp.id) setSelectedEmployee(null);
            setSuccess('Employee removed.');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) { setError('Delete failed: ' + err.message); }
    };

    const toggleDocument = async (empId, docKey, currentVal) => {
        try {
            const emp = employees.find(e => e.id === empId);
            const docs = { ...(emp.documents || {}), [docKey]: !currentVal };
            await updateDoc(doc(db, "users", user.uid, "employees", empId), { documents: docs });
            if (selectedEmployee?.id === empId) setSelectedEmployee(prev => ({ ...prev, documents: docs }));
        } catch (err) { setError('Update failed: ' + err.message); }
    };

    const addArrayItem = async (empId, field, item) => {
        try {
            const emp = employees.find(e => e.id === empId);
            const arr = [...(emp[field] || []), { ...item, id: Date.now(), date: item.date || new Date().toISOString().split('T')[0] }];
            await updateDoc(doc(db, "users", user.uid, "employees", empId), { [field]: arr });
            if (selectedEmployee?.id === empId) setSelectedEmployee(prev => ({ ...prev, [field]: arr }));
            setSuccess('Record added.');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) { setError('Failed to add record: ' + err.message); }
    };

    const removeArrayItem = async (empId, field, itemId) => {
        try {
            const emp = employees.find(e => e.id === empId);
            const arr = (emp[field] || []).filter(i => i.id !== itemId);
            await updateDoc(doc(db, "users", user.uid, "employees", empId), { [field]: arr });
            if (selectedEmployee?.id === empId) setSelectedEmployee(prev => ({ ...prev, [field]: arr }));
        } catch (err) { setError('Failed to remove record: ' + err.message); }
    };

    const updateLeaveBalances = async (empId, balances) => {
        try {
            await updateDoc(doc(db, "users", user.uid, "employees", empId), { leaveBalances: balances });
            if (selectedEmployee?.id === empId) setSelectedEmployee(prev => ({ ...prev, leaveBalances: balances }));
        } catch (err) { setError('Failed to update: ' + err.message); }
    };

    // ─── Schedule Appraisals to Calendar & Tasks ─────────────────────────
    const scheduleAppraisals = async (empName, dateHired, empId) => {
        if (!dateHired || !user?.uid) return;
        const dates = getAppraisalDates(dateHired);
        const today = new Date().toISOString().split('T')[0];

        const appraisals = [
            { label: '3-Month Probationary Appraisal', date: dates.threeMonth, period: '3-Month' },
            { label: '6-Month Probationary Appraisal', date: dates.sixMonth, period: '6-Month' },
        ];

        let scheduledCount = 0;
        for (const appraisal of appraisals) {
            if (!appraisal.date || appraisal.date < today) continue;

            // Add to Ops Calendar
            await addDoc(collection(db, "users", user.uid, "calendar_events"), {
                title: `${appraisal.label} — ${empName}`,
                type: 'OPERATION',
                category: 'Meeting',
                priority: 'High',
                start: `${appraisal.date}T09:00:00`,
                end: `${appraisal.date}T10:00:00`,
                allDay: false,
                description: `${appraisal.period} performance appraisal for ${empName}. Review KPIs, set targets for next period. Hired: ${dateHired}.`,
                location: 'Office',
                assignedTo: '',
                employeeId: empId
            });

            // Add to Business Tasks
            await addDoc(collection(db, "users", user.uid, "tasks"), {
                title: `${appraisal.label} — ${empName}`,
                category: 'ADMIN',
                status: 'NEW',
                priority: 'HIGH',
                createdDate: today,
                dueDate: appraisal.date,
                completedDate: '',
                assignedTo: '',
                owner: '',
                description: `Conduct ${appraisal.period} probationary appraisal for ${empName}. Set KPI targets, review performance, and determine regularization path. Date hired: ${dateHired}.`,
                notes: `Nearest Tuesday scheduling. Original ${appraisal.period} date adjusted to Tuesday.`,
                estimatedHours: 1,
                actualHours: 0,
                progress: 0,
                tags: ['HR', 'Appraisal', appraisal.period],
                relatedProjectId: '',
                relatedCompanyId: '',
                relatedOpportunityId: '',
                employeeId: empId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            scheduledCount++;
        }
        return scheduledCount;
    };

    // ─── Render ──────────────────────────────────────────────────────────
    if (loading) return <div className="flex items-center justify-center h-64"><Clock size={20} className="animate-spin text-orange-500 mr-2" /> Loading HR data...</div>;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-gray-800 flex items-center gap-2"><Users size={22} className="text-orange-500" /> HR & Onboarding</h2>
                    <p className="text-xs text-gray-400">Philippines Employee Management — 201 File, Compliance, Leave, Performance & Training</p>
                </div>
                <Button onClick={() => { setForm({ ...EMPTY_EMPLOYEE }); setEditingId(null); setShowForm(true); setActiveTab('onboarding'); }} variant="primary" className="text-xs">
                    <UserPlus size={14} className="mr-1" /> New Employee
                </Button>
            </div>

            {/* Messages */}
            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm"><AlertCircle size={16} /> {error} <button onClick={() => setError('')} className="ml-auto"><XCircle size={16} /></button></div>}
            {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700 text-sm"><CheckCircle size={16} /> {success} <button onClick={() => setSuccess('')} className="ml-auto"><XCircle size={16} /></button></div>}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { label: 'Total', value: stats.total, icon: Users, color: 'orange' },
                    { label: 'Active', value: stats.active, icon: UserCheck, color: 'green' },
                    { label: 'Probationary', value: stats.probationary, icon: Clock, color: 'yellow' },
                    { label: 'On Leave', value: stats.onLeave, icon: Calendar, color: 'blue' },
                    { label: 'Departments', value: stats.departments, icon: Building, color: 'purple' },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                        <s.icon size={16} className={`text-${s.color}-500 mx-auto mb-1`} />
                        <div className="text-lg font-black text-gray-800">{s.value}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Selected Employee Banner */}
            {selectedEmployee && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                            {(selectedEmployee.firstName || '?')[0]}{(selectedEmployee.lastName || '?')[0]}
                        </div>
                        <div>
                            <p className="font-bold text-gray-800">{selectedEmployee.firstName} {selectedEmployee.lastName}</p>
                            <p className="text-xs text-gray-500">{selectedEmployee.position} — {selectedEmployee.department}</p>
                        </div>
                        <StatusBadge status={selectedEmployee.status} />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleEdit(selectedEmployee)} className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"><Edit3 size={12} /> Edit</button>
                        <button onClick={() => setSelectedEmployee(null)} className="text-xs text-gray-400 hover:text-gray-600"><X size={14} /></button>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
                <TabBtn active={activeTab === 'directory'} onClick={() => setActiveTab('directory')} icon={Users} label="Directory" badge={employees.length || null} />
                <TabBtn active={activeTab === 'onboarding'} onClick={() => { setActiveTab('onboarding'); if (!showForm && !editingId) { setForm({ ...EMPTY_EMPLOYEE }); setShowForm(true); } }} icon={UserPlus} label="Onboarding" />
                <TabBtn active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} icon={FileText} label="201 File" />
                <TabBtn active={activeTab === 'leave'} onClick={() => setActiveTab('leave')} icon={Calendar} label="Leave" />
                <TabBtn active={activeTab === 'performance'} onClick={() => setActiveTab('performance')} icon={Target} label="Performance" />
                <TabBtn active={activeTab === 'training'} onClick={() => setActiveTab('training')} icon={BookOpen} label="Training" />
                <TabBtn active={activeTab === 'compliance'} onClick={() => setActiveTab('compliance')} icon={Shield} label="Compliance" />
            </div>

            {/* ═══════ DIRECTORY TAB ═══════ */}
            {activeTab === 'directory' && (
                <Card>
                    <SectionHeader icon={Users} title="Employee Directory" sub={`${filtered.length} employees`} />
                    <div className="relative mb-4">
                        <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm" placeholder="Search by name, position, department..." />
                    </div>
                    {filtered.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Users size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="font-bold">No employees yet</p>
                            <p className="text-xs mt-1">Click "New Employee" to add your first team member</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filtered.map(emp => (
                                <div key={emp.id} onClick={() => setSelectedEmployee(emp)}
                                    className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${selectedEmployee?.id === emp.id ? 'border-orange-400 bg-orange-50/30 shadow-md' : 'border-gray-100 hover:border-orange-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                                            {(emp.firstName || '?')[0]}{(emp.lastName || '?')[0]}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-sm text-gray-800 truncate">{emp.firstName} {emp.lastName}</p>
                                            <p className="text-[11px] text-gray-500 truncate">{emp.position || 'No position'}</p>
                                        </div>
                                        <StatusBadge status={emp.status} />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                                        <span>{emp.department}</span>
                                        <span>Hired: {emp.dateHired || '—'}</span>
                                    </div>
                                    {/* Document progress */}
                                    {emp.documents && (() => {
                                        const submitted = ALL_DOC_KEYS.filter(k => emp.documents[k]).length;
                                        const pct = Math.round((submitted / ALL_DOC_KEYS.length) * 100);
                                        return (
                                            <div className="mt-2">
                                                <div className="flex justify-between text-[9px] text-gray-400 mb-0.5">
                                                    <span>201 File</span><span>{pct}%</span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-1">
                                                    <div className={`h-1 rounded-full ${pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-orange-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    <div className="mt-2 flex gap-1">
                                        <button onClick={e => { e.stopPropagation(); handleEdit(emp); }} className="text-[10px] text-blue-500 hover:text-blue-700 font-bold px-2 py-1 rounded bg-blue-50">Edit</button>
                                        <button onClick={e => { e.stopPropagation(); handleDelete(emp); }} className="text-[10px] text-red-400 hover:text-red-600 font-bold px-2 py-1 rounded bg-red-50">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            {/* ═══════ ONBOARDING TAB ═══════ */}
            {activeTab === 'onboarding' && showForm && (
                <Card className="border-2 border-orange-200">
                    <SectionHeader icon={UserPlus} title={editingId ? 'Edit Employee' : 'New Employee Onboarding'} sub="Philippines employment requirements — all mandatory fields marked with *" />

                    {/* Personal Information */}
                    <div className="mb-6">
                        <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-3 flex items-center gap-1"><Heart size={12} /> Personal Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <FormField label="First Name" required><input className={inputClass} value={form.firstName} onChange={e => setField('firstName', e.target.value)} placeholder="Juan" /></FormField>
                            <FormField label="Middle Name"><input className={inputClass} value={form.middleName} onChange={e => setField('middleName', e.target.value)} placeholder="Santos" /></FormField>
                            <FormField label="Last Name" required><input className={inputClass} value={form.lastName} onChange={e => setField('lastName', e.target.value)} placeholder="Dela Cruz" /></FormField>
                            <FormField label="Suffix"><input className={inputClass} value={form.suffix} onChange={e => setField('suffix', e.target.value)} placeholder="Jr., Sr., III" /></FormField>
                            <FormField label="Date of Birth"><input type="date" className={inputClass} value={form.dateOfBirth} onChange={e => setField('dateOfBirth', e.target.value)} /></FormField>
                            <FormField label="Gender"><select className={selectClass} value={form.gender} onChange={e => setField('gender', e.target.value)}>{GENDERS.map(g => <option key={g}>{g}</option>)}</select></FormField>
                            <FormField label="Civil Status"><select className={selectClass} value={form.civilStatus} onChange={e => setField('civilStatus', e.target.value)}>{CIVIL_STATUSES.map(s => <option key={s}>{s}</option>)}</select></FormField>
                            <FormField label="Nationality"><input className={inputClass} value={form.nationality} onChange={e => setField('nationality', e.target.value)} /></FormField>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="mb-6">
                        <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-3 flex items-center gap-1"><Building size={12} /> Address</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <FormField label="Street Address" span={2}><input className={inputClass} value={form.address} onChange={e => setField('address', e.target.value)} placeholder="123 Rizal St., Brgy. San Antonio" /></FormField>
                            <FormField label="City / Municipality"><input className={inputClass} value={form.city} onChange={e => setField('city', e.target.value)} placeholder="Makati City" /></FormField>
                            <FormField label="Province"><input className={inputClass} value={form.province} onChange={e => setField('province', e.target.value)} placeholder="Metro Manila" /></FormField>
                        </div>
                    </div>

                    {/* Contact & Emergency */}
                    <div className="mb-6">
                        <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-3 flex items-center gap-1"><Phone size={12} /> Contact & Emergency</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <FormField label="Email"><input type="email" className={inputClass} value={form.email} onChange={e => setField('email', e.target.value)} placeholder="juan@email.com" /></FormField>
                            <FormField label="Phone / Mobile"><input className={inputClass} value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+63 917 123 4567" /></FormField>
                            <FormField label="Emergency Contact Name"><input className={inputClass} value={form.emergencyContactName} onChange={e => setField('emergencyContactName', e.target.value)} /></FormField>
                            <FormField label="Emergency Phone"><input className={inputClass} value={form.emergencyContactPhone} onChange={e => setField('emergencyContactPhone', e.target.value)} /></FormField>
                        </div>
                    </div>

                    {/* Government IDs */}
                    <div className="mb-6">
                        <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-3 flex items-center gap-1"><Shield size={12} /> Government IDs (Philippines)</h4>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3 text-[11px] text-blue-700">
                            <strong>Required:</strong> TIN, SSS, PhilHealth, and Pag-IBIG numbers must be registered with BIR, SSS, PhilHealth, and HDMF respectively. If the employee does not have a TIN, file BIR Form 1902 within 10 days of hire.
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <FormField label="TIN Number" required><input className={inputClass} value={form.tinNumber} onChange={e => setField('tinNumber', e.target.value)} placeholder="123-456-789-000" /></FormField>
                            <FormField label="SSS Number" required><input className={inputClass} value={form.sssNumber} onChange={e => setField('sssNumber', e.target.value)} placeholder="34-1234567-8" /></FormField>
                            <FormField label="PhilHealth Number" required><input className={inputClass} value={form.philhealthNumber} onChange={e => setField('philhealthNumber', e.target.value)} placeholder="12-123456789-0" /></FormField>
                            <FormField label="Pag-IBIG MID" required><input className={inputClass} value={form.pagibigNumber} onChange={e => setField('pagibigNumber', e.target.value)} placeholder="1234-5678-9012" /></FormField>
                            <FormField label="Passport Number"><input className={inputClass} value={form.passportNumber} onChange={e => setField('passportNumber', e.target.value)} /></FormField>
                            <FormField label="Passport Expiry"><input type="date" className={inputClass} value={form.passportExpiry} onChange={e => setField('passportExpiry', e.target.value)} /></FormField>
                            <FormField label="Driver's License"><input className={inputClass} value={form.driversLicense} onChange={e => setField('driversLicense', e.target.value)} /></FormField>
                            <FormField label="License Expiry"><input type="date" className={inputClass} value={form.driversLicenseExpiry} onChange={e => setField('driversLicenseExpiry', e.target.value)} /></FormField>
                        </div>
                    </div>

                    {/* Employment Details */}
                    <div className="mb-6">
                        <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-3 flex items-center gap-1"><Briefcase size={12} /> Employment Details</h4>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3 text-[11px] text-yellow-700">
                            <strong>Philippines Labor Code:</strong> Probationary period is max 6 months (Art. 296). Standards for regularization must be communicated at hire. Employee auto-regularizes after 6 months.
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <FormField label="Position / Job Title" required><input className={inputClass} value={form.position} onChange={e => setField('position', e.target.value)} placeholder="Energy Engineer" /></FormField>
                            <FormField label="Department"><select className={selectClass} value={form.department} onChange={e => setField('department', e.target.value)}>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></FormField>
                            <FormField label="Employment Type"><select className={selectClass} value={form.employmentType} onChange={e => setField('employmentType', e.target.value)}>{EMPLOYMENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></FormField>
                            <FormField label="Status"><select className={selectClass} value={form.status} onChange={e => setField('status', e.target.value)}>{EMPLOYEE_STATUSES.map(s => <option key={s}>{s}</option>)}</select></FormField>
                            <FormField label="Date Hired" required><input type="date" className={inputClass} value={form.dateHired} onChange={e => { setField('dateHired', e.target.value); setField('probationEndDate', calcProbationEnd(e.target.value)); }} /></FormField>
                            <FormField label="Probation End (auto 6 months)"><input type="date" className={inputClass} value={form.probationEndDate || calcProbationEnd(form.dateHired)} onChange={e => setField('probationEndDate', e.target.value)} /></FormField>
                            <FormField label="Regularization Date"><input type="date" className={inputClass} value={form.regularizationDate} onChange={e => setField('regularizationDate', e.target.value)} /></FormField>
                            <FormField label="Basic Monthly Salary (PHP)"><input type="number" className={inputClass} value={form.basicSalary} onChange={e => setField('basicSalary', e.target.value)} placeholder="25000" /></FormField>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="mb-6">
                        <FormField label="Notes">
                            <textarea className={inputClass + ' h-20'} value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Additional notes, special arrangements, etc." />
                        </FormField>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button onClick={handleSave} variant="primary" disabled={saving}>
                            {saving ? <><Clock size={14} className="mr-1.5 animate-spin" /> Saving...</> : <><Save size={14} className="mr-1.5" /> {editingId ? 'Update Employee' : 'Save & Add Employee'}</>}
                        </Button>
                        <Button onClick={() => { setShowForm(false); setEditingId(null); setForm({ ...EMPTY_EMPLOYEE }); }} variant="secondary">Cancel</Button>
                    </div>
                </Card>
            )}

            {/* ═══════ 201 FILE / DOCUMENTS TAB ═══════ */}
            {activeTab === 'documents' && (
                <Card>
                    <SectionHeader icon={FileText} title="201 File — Document Checklist" sub="Philippines employment law requires a complete 201 file for each employee" />
                    {!selectedEmployee ? (
                        <div className="text-center py-8 text-gray-400"><FileText size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm font-bold">Select an employee from the Directory tab first</p></div>
                    ) : (() => {
                        const docs = selectedEmployee.documents || {};
                        const submitted = ALL_DOC_KEYS.filter(k => docs[k]).length;
                        const pct = Math.round((submitted / ALL_DOC_KEYS.length) * 100);
                        return (
                            <>
                                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-bold text-gray-700">{selectedEmployee.firstName} {selectedEmployee.lastName} — Document Progress</span>
                                        <span className={`text-sm font-bold ${pct === 100 ? 'text-green-600' : pct > 50 ? 'text-orange-600' : 'text-red-600'}`}>{submitted}/{ALL_DOC_KEYS.length} ({pct}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div className={`h-3 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-orange-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                                {Object.entries(DOCUMENT_CHECKLIST).map(([category, items]) => (
                                    <div key={category} className="mb-4">
                                        <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 border-b border-gray-100 pb-1">{category}</h4>
                                        <div className="space-y-1">
                                            {items.map(item => (
                                                <label key={item.key} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                                    <input type="checkbox" checked={!!docs[item.key]} onChange={() => toggleDocument(selectedEmployee.id, item.key, docs[item.key])}
                                                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-400" />
                                                    <span className={`text-sm ${docs[item.key] ? 'text-green-700 font-bold' : 'text-gray-600'}`}>{item.label}</span>
                                                    {docs[item.key] ? <CheckCircle size={14} className="text-green-500 ml-auto" /> : <XCircle size={14} className="text-red-300 ml-auto" />}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </>
                        );
                    })()}
                </Card>
            )}

            {/* ═══════ LEAVE TAB ═══════ */}
            {activeTab === 'leave' && (
                <div className="space-y-4">
                    {/* Philippines Leave Info */}
                    <Card className="bg-blue-50/30 border-blue-200">
                        <SectionHeader icon={Calendar} title="Philippines Mandatory Leave Entitlements" color="blue" />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {LEAVE_TYPES.map(lt => (
                                <div key={lt.key} className="bg-white rounded-lg p-2 border border-blue-100 text-center">
                                    <div className="text-lg font-black text-blue-600">{lt.days}</div>
                                    <div className="text-[10px] font-bold text-gray-600">{lt.label}</div>
                                    <div className="text-[9px] text-gray-400">{lt.law}</div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <SectionHeader icon={Calendar} title="Leave Management" />
                        {!selectedEmployee ? (
                            <div className="text-center py-8 text-gray-400"><Calendar size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm font-bold">Select an employee from the Directory tab first</p></div>
                        ) : (
                            <>
                                {/* Leave Balances */}
                                <div className="mb-4">
                                    <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">Current Balances — {selectedEmployee.firstName} {selectedEmployee.lastName}</h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { key: 'sil', label: 'Service Incentive Leave', color: 'green' },
                                            { key: 'vacation', label: 'Vacation Leave', color: 'blue' },
                                            { key: 'sick', label: 'Sick Leave', color: 'red' },
                                        ].map(b => (
                                            <div key={b.key} className="bg-gray-50 rounded-lg p-3 text-center">
                                                <div className={`text-2xl font-black text-${b.color}-600`}>{(selectedEmployee.leaveBalances || {})[b.key] || 0}</div>
                                                <div className="text-[10px] text-gray-500 font-bold">{b.label}</div>
                                                <input type="number" min="0" className="w-16 border rounded px-2 py-1 text-xs text-center mt-1"
                                                    value={(selectedEmployee.leaveBalances || {})[b.key] || 0}
                                                    onChange={e => updateLeaveBalances(selectedEmployee.id, { ...(selectedEmployee.leaveBalances || {}), [b.key]: parseInt(e.target.value) || 0 })} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Leave Request Form */}
                                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 mb-4">
                                    <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">New Leave Request</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        <FormField label="Leave Type">
                                            <select className={selectClass} value={leaveForm.type} onChange={e => setLeaveForm(p => ({ ...p, type: e.target.value }))}>
                                                {LEAVE_TYPES.map(lt => <option key={lt.key} value={lt.key}>{lt.label}</option>)}
                                            </select>
                                        </FormField>
                                        <FormField label="Start Date"><input type="date" className={inputClass} value={leaveForm.startDate} onChange={e => setLeaveForm(p => ({ ...p, startDate: e.target.value }))} /></FormField>
                                        <FormField label="End Date"><input type="date" className={inputClass} value={leaveForm.endDate} onChange={e => setLeaveForm(p => ({ ...p, endDate: e.target.value }))} /></FormField>
                                        <FormField label="Days"><input type="number" className={inputClass} value={leaveForm.days} onChange={e => setLeaveForm(p => ({ ...p, days: parseInt(e.target.value) || 0 }))} /></FormField>
                                        <FormField label="Notes"><input className={inputClass} value={leaveForm.notes} onChange={e => setLeaveForm(p => ({ ...p, notes: e.target.value }))} placeholder="Reason" /></FormField>
                                    </div>
                                    <Button onClick={() => { addArrayItem(selectedEmployee.id, 'leaveRequests', { ...leaveForm, status: 'Pending' }); setLeaveForm({ type: 'sil', startDate: '', endDate: '', days: 1, notes: '' }); }} variant="primary" className="mt-2 text-xs">
                                        <Plus size={12} className="mr-1" /> Submit Leave
                                    </Button>
                                </div>

                                {/* Leave History */}
                                {(selectedEmployee.leaveRequests || []).length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">Leave History</h4>
                                        <div className="space-y-2">
                                            {(selectedEmployee.leaveRequests || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(lr => (
                                                <div key={lr.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                                                    <div>
                                                        <span className="font-bold text-gray-700">{LEAVE_TYPES.find(l => l.key === lr.type)?.label || lr.type}</span>
                                                        <span className="text-gray-400 mx-2">|</span>
                                                        <span className="text-gray-500">{lr.startDate} → {lr.endDate} ({lr.days} days)</span>
                                                        {lr.notes && <span className="text-gray-400 ml-2">— {lr.notes}</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lr.status === 'Approved' ? 'bg-green-100 text-green-700' : lr.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{lr.status}</span>
                                                        <button onClick={() => removeArrayItem(selectedEmployee.id, 'leaveRequests', lr.id)} className="text-red-300 hover:text-red-500"><Trash2 size={12} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </Card>
                </div>
            )}

            {/* ═══════ PERFORMANCE TAB ═══════ */}
            {activeTab === 'performance' && (
                <div className="space-y-4">
                    {/* Appraisal Schedule Info */}
                    {selectedEmployee && selectedEmployee.dateHired && (
                        <Card className="bg-blue-50/30 border-blue-200">
                            <SectionHeader icon={Calendar} title="Appraisal Schedule" sub="Auto-calculated from hire date — nearest Tuesday" color="blue" />
                            {(() => {
                                const dates = getAppraisalDates(selectedEmployee.dateHired);
                                const today = new Date().toISOString().split('T')[0];
                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase">Date Hired</div>
                                            <div className="text-sm font-black text-gray-800 mt-1">{selectedEmployee.dateHired}</div>
                                        </div>
                                        <div className={`bg-white rounded-lg p-3 border text-center ${dates.threeMonth < today ? 'border-green-200' : 'border-orange-200'}`}>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase">3-Month Appraisal</div>
                                            <div className={`text-sm font-black mt-1 ${dates.threeMonth < today ? 'text-green-600' : 'text-orange-600'}`}>{dates.threeMonth}</div>
                                            <div className="text-[9px] text-gray-400 mt-0.5">{dates.threeMonth < today ? 'Due / Overdue' : 'Upcoming'} (Tuesday)</div>
                                        </div>
                                        <div className={`bg-white rounded-lg p-3 border text-center ${dates.sixMonth < today ? 'border-green-200' : 'border-purple-200'}`}>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase">6-Month Appraisal</div>
                                            <div className={`text-sm font-black mt-1 ${dates.sixMonth < today ? 'text-green-600' : 'text-purple-600'}`}>{dates.sixMonth}</div>
                                            <div className="text-[9px] text-gray-400 mt-0.5">{dates.sixMonth < today ? 'Due / Overdue' : 'Upcoming'} (Tuesday)</div>
                                        </div>
                                    </div>
                                );
                            })()}
                            <div className="mt-3">
                                <Button onClick={async () => {
                                    const empName = `${selectedEmployee.firstName} ${selectedEmployee.lastName}`;
                                    const count = await scheduleAppraisals(empName, selectedEmployee.dateHired, selectedEmployee.id);
                                    if (count > 0) setSuccess(`${count} appraisal(s) scheduled in Calendar & Tasks for ${empName}`);
                                    else setSuccess('No future appraisals to schedule (dates already passed).');
                                    setTimeout(() => setSuccess(''), 4000);
                                }} variant="primary" className="text-xs">
                                    <Calendar size={12} className="mr-1" /> Re-schedule Appraisals to Calendar & Tasks
                                </Button>
                            </div>
                        </Card>
                    )}

                    <Card>
                        <SectionHeader icon={Target} title="Performance Appraisals with KPIs" sub="Set KPI targets at appraisal time — evaluate at 3-month and 6-month reviews" />
                        {!selectedEmployee ? (
                            <div className="text-center py-8 text-gray-400"><Target size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm font-bold">Select an employee from the Directory tab first</p></div>
                        ) : (
                            <>
                                {/* Review Form */}
                                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 mb-4">
                                    <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">Add Performance Review</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                        <FormField label="Review Period"><input className={inputClass} value={perfForm.period} onChange={e => setPerfForm(p => ({ ...p, period: e.target.value }))} placeholder="e.g. 3-Month Probation, Q1 2026" /></FormField>
                                        <FormField label="Reviewer"><input className={inputClass} value={perfForm.reviewer} onChange={e => setPerfForm(p => ({ ...p, reviewer: e.target.value }))} placeholder="Stuart Cox" /></FormField>
                                        <FormField label="Overall Rating (1-5)">
                                            <div className="flex items-center gap-2">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <button key={i} onClick={() => setPerfForm(p => ({ ...p, rating: i }))} className="focus:outline-none">
                                                        <Star size={20} className={i <= perfForm.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 hover:text-yellow-200'} />
                                                    </button>
                                                ))}
                                                <span className="text-xs text-gray-500 ml-2">{['', 'Poor', 'Below Average', 'Meets Expectations', 'Above Average', 'Outstanding'][perfForm.rating]}</span>
                                            </div>
                                        </FormField>
                                    </div>

                                    {/* KPI Targets Section */}
                                    <div className="mb-3">
                                        <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-2 flex items-center gap-1"><Target size={12} /> KPI Targets & Scores</h4>
                                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                                                    <tr>
                                                        <th className="p-2 text-left">KPI</th>
                                                        <th className="p-2 text-left">Target</th>
                                                        <th className="p-2 text-left">Actual Result</th>
                                                        <th className="p-2 text-center">Score (1-5)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(perfForm.kpis || []).map((kpi, idx) => (
                                                        <tr key={kpi.key} className="border-t border-gray-100">
                                                            <td className="p-2">
                                                                <span className="font-bold text-gray-700">{kpi.label}</span>
                                                                <span className="block text-[9px] text-gray-400">{KPI_CATEGORIES.find(k => k.key === kpi.key)?.description}</span>
                                                            </td>
                                                            <td className="p-2">
                                                                <input className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                                                                    value={kpi.target} placeholder="e.g. 95% accuracy"
                                                                    onChange={e => {
                                                                        const updated = [...perfForm.kpis];
                                                                        updated[idx] = { ...updated[idx], target: e.target.value };
                                                                        setPerfForm(p => ({ ...p, kpis: updated }));
                                                                    }} />
                                                            </td>
                                                            <td className="p-2">
                                                                <input className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                                                                    value={kpi.actual} placeholder="e.g. 92% achieved"
                                                                    onChange={e => {
                                                                        const updated = [...perfForm.kpis];
                                                                        updated[idx] = { ...updated[idx], actual: e.target.value };
                                                                        setPerfForm(p => ({ ...p, kpis: updated }));
                                                                    }} />
                                                            </td>
                                                            <td className="p-2 text-center">
                                                                <div className="flex items-center justify-center gap-0.5">
                                                                    {[1, 2, 3, 4, 5].map(s => (
                                                                        <button key={s} onClick={() => {
                                                                            const updated = [...perfForm.kpis];
                                                                            updated[idx] = { ...updated[idx], score: s };
                                                                            setPerfForm(p => ({ ...p, kpis: updated }));
                                                                        }} className="focus:outline-none">
                                                                            <Star size={12} className={s <= kpi.score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <p className="text-[9px] text-gray-400 mt-1">Set targets at appraisal time. Fill in actuals when reviewing. Avg KPI score auto-calculates overall rating.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                        <FormField label="Strengths"><textarea className={inputClass + ' h-16'} value={perfForm.strengths} onChange={e => setPerfForm(p => ({ ...p, strengths: e.target.value }))} /></FormField>
                                        <FormField label="Areas for Improvement"><textarea className={inputClass + ' h-16'} value={perfForm.improvements} onChange={e => setPerfForm(p => ({ ...p, improvements: e.target.value }))} /></FormField>
                                        <FormField label="Goals for Next Period"><textarea className={inputClass + ' h-16'} value={perfForm.goals} onChange={e => setPerfForm(p => ({ ...p, goals: e.target.value }))} /></FormField>
                                    </div>
                                    <Button onClick={() => {
                                        // Calculate average KPI score as overall rating
                                        const kpisWithData = (perfForm.kpis || []).filter(k => k.target || k.actual);
                                        const avgScore = kpisWithData.length > 0 ? Math.round(kpisWithData.reduce((sum, k) => sum + k.score, 0) / kpisWithData.length) : perfForm.rating;
                                        const reviewData = { ...perfForm, rating: avgScore };
                                        addArrayItem(selectedEmployee.id, 'performanceReviews', reviewData);
                                        setPerfForm({ period: '', rating: 3, reviewer: '', strengths: '', improvements: '', goals: '', notes: '', kpis: KPI_CATEGORIES.map(k => ({ key: k.key, label: k.label, target: '', actual: '', score: 3 })) });
                                    }} variant="primary" className="text-xs">
                                        <Plus size={12} className="mr-1" /> Save Review with KPIs
                                    </Button>
                                </div>

                                {/* Review History */}
                                {(selectedEmployee.performanceReviews || []).length > 0 && (
                                    <div className="space-y-3">
                                        {(selectedEmployee.performanceReviews || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(pr => (
                                            <div key={pr.id} className="border border-gray-100 rounded-lg p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-sm text-gray-800">{pr.period}</span>
                                                        <RatingStars rating={pr.rating} />
                                                        <span className="text-xs text-gray-400">{pr.date}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-400">by {pr.reviewer}</span>
                                                        <button onClick={() => removeArrayItem(selectedEmployee.id, 'performanceReviews', pr.id)} className="text-red-300 hover:text-red-500"><Trash2 size={12} /></button>
                                                    </div>
                                                </div>
                                                {/* KPI Summary */}
                                                {pr.kpis && pr.kpis.some(k => k.target || k.actual) && (
                                                    <div className="mb-2 bg-gray-50 rounded-lg p-2">
                                                        <h5 className="text-[10px] font-bold text-orange-600 uppercase mb-1">KPI Results</h5>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                                                            {pr.kpis.filter(k => k.target || k.actual).map(k => (
                                                                <div key={k.key} className="bg-white rounded p-1.5 border border-gray-100">
                                                                    <div className="text-[9px] font-bold text-gray-600">{k.label}</div>
                                                                    {k.target && <div className="text-[9px] text-blue-500">Target: {k.target}</div>}
                                                                    {k.actual && <div className="text-[9px] text-green-600">Actual: {k.actual}</div>}
                                                                    <div className="flex gap-0.5 mt-0.5">
                                                                        {[1,2,3,4,5].map(s => <Star key={s} size={8} className={s <= k.score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />)}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                    {pr.strengths && <div><span className="font-bold text-green-600">Strengths:</span> <span className="text-gray-600">{pr.strengths}</span></div>}
                                                    {pr.improvements && <div><span className="font-bold text-orange-600">Improve:</span> <span className="text-gray-600">{pr.improvements}</span></div>}
                                                    {pr.goals && <div><span className="font-bold text-blue-600">Goals:</span> <span className="text-gray-600">{pr.goals}</span></div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </Card>

                    {/* Disciplinary Section */}
                    <Card>
                        <SectionHeader icon={AlertTriangle} title="Disciplinary Records" sub="Philippines Two-Notice Rule: 1) NTE with 5 days to respond, 2) Hearing, 3) Notice of Decision" color="red" />
                        {!selectedEmployee ? (
                            <div className="text-center py-4 text-gray-400 text-sm">Select an employee first</div>
                        ) : (
                            <>
                                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 mb-4">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <FormField label="Action Type"><select className={selectClass} value={disciplineForm.type} onChange={e => setDisciplineForm(p => ({ ...p, type: e.target.value }))}>{DISCIPLINE_TYPES.map(t => <option key={t}>{t}</option>)}</select></FormField>
                                        <FormField label="Offense"><input className={inputClass} value={disciplineForm.offense} onChange={e => setDisciplineForm(p => ({ ...p, offense: e.target.value }))} placeholder="Description of offense" /></FormField>
                                        <FormField label="Action Taken"><input className={inputClass} value={disciplineForm.action} onChange={e => setDisciplineForm(p => ({ ...p, action: e.target.value }))} placeholder="NTE issued, hearing scheduled..." /></FormField>
                                        <FormField label="Notes"><input className={inputClass} value={disciplineForm.notes} onChange={e => setDisciplineForm(p => ({ ...p, notes: e.target.value }))} /></FormField>
                                    </div>
                                    <Button onClick={() => { addArrayItem(selectedEmployee.id, 'disciplinaryRecords', disciplineForm); setDisciplineForm({ type: 'Verbal Warning', offense: '', action: '', notes: '' }); }} variant="danger" className="mt-2 text-xs">
                                        <Plus size={12} className="mr-1" /> Record Disciplinary Action
                                    </Button>
                                </div>
                                {(selectedEmployee.disciplinaryRecords || []).map(dr => (
                                    <div key={dr.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg mb-2 text-sm">
                                        <div>
                                            <span className="font-bold text-red-700">{dr.type}</span>
                                            <span className="text-gray-400 mx-2">|</span>
                                            <span className="text-gray-600">{dr.offense}</span>
                                            {dr.action && <span className="text-gray-400 ml-2">— Action: {dr.action}</span>}
                                            <span className="text-xs text-gray-400 ml-2">{dr.date}</span>
                                        </div>
                                        <button onClick={() => removeArrayItem(selectedEmployee.id, 'disciplinaryRecords', dr.id)} className="text-red-300 hover:text-red-500"><Trash2 size={12} /></button>
                                    </div>
                                ))}
                            </>
                        )}
                    </Card>
                </div>
            )}

            {/* ═══════ TRAINING TAB ═══════ */}
            {activeTab === 'training' && (
                <Card>
                    <SectionHeader icon={BookOpen} title="Training & Development Log" sub="RA 11058 requires documented OSH training. Maintain records for DOLE compliance." />
                    {!selectedEmployee ? (
                        <div className="text-center py-8 text-gray-400"><BookOpen size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm font-bold">Select an employee from the Directory tab first</p></div>
                    ) : (
                        <>
                            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 mb-4">
                                <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">Add Training Record</h4>
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                    <FormField label="Training Title" span={2}><input className={inputClass} value={trainingForm.title} onChange={e => setTrainingForm(p => ({ ...p, title: e.target.value }))} placeholder="Fire Safety Training" /></FormField>
                                    <FormField label="Date"><input type="date" className={inputClass} value={trainingForm.date} onChange={e => setTrainingForm(p => ({ ...p, date: e.target.value }))} /></FormField>
                                    <FormField label="Provider"><input className={inputClass} value={trainingForm.provider} onChange={e => setTrainingForm(p => ({ ...p, provider: e.target.value }))} placeholder="DOLE / Provider" /></FormField>
                                    <FormField label="Hours"><input type="number" className={inputClass} value={trainingForm.hours} onChange={e => setTrainingForm(p => ({ ...p, hours: e.target.value }))} placeholder="8" /></FormField>
                                    <FormField label="Type"><select className={selectClass} value={trainingForm.type} onChange={e => setTrainingForm(p => ({ ...p, type: e.target.value }))}>{TRAINING_TYPES.map(t => <option key={t}>{t}</option>)}</select></FormField>
                                </div>
                                <Button onClick={() => { addArrayItem(selectedEmployee.id, 'trainingLog', { ...trainingForm, hours: parseFloat(trainingForm.hours) || 0 }); setTrainingForm({ title: '', date: '', provider: '', hours: '', type: 'Technical', notes: '' }); }} variant="primary" className="mt-2 text-xs">
                                    <Plus size={12} className="mr-1" /> Add Training
                                </Button>
                            </div>

                            {(selectedEmployee.trainingLog || []).length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead><tr className="border-b border-gray-200 text-[10px] uppercase text-gray-500">
                                            <th className="text-left py-2 px-2">Date</th><th className="text-left py-2 px-2">Training</th><th className="text-left py-2 px-2">Provider</th>
                                            <th className="text-left py-2 px-2">Hours</th><th className="text-left py-2 px-2">Type</th><th className="py-2 px-2"></th>
                                        </tr></thead>
                                        <tbody>
                                            {(selectedEmployee.trainingLog || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(tr => (
                                                <tr key={tr.id} className="border-b border-gray-50 hover:bg-gray-50">
                                                    <td className="py-2 px-2 text-gray-500">{tr.date}</td>
                                                    <td className="py-2 px-2 font-bold text-gray-700">{tr.title}</td>
                                                    <td className="py-2 px-2 text-gray-500">{tr.provider}</td>
                                                    <td className="py-2 px-2 text-gray-500">{tr.hours}h</td>
                                                    <td className="py-2 px-2"><span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{tr.type}</span></td>
                                                    <td className="py-2 px-2"><button onClick={() => removeArrayItem(selectedEmployee.id, 'trainingLog', tr.id)} className="text-red-300 hover:text-red-500"><Trash2 size={12} /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-center text-gray-400 text-sm py-4">No training records yet</p>
                            )}
                        </>
                    )}
                </Card>
            )}

            {/* ═══════ COMPLIANCE TAB ═══════ */}
            {activeTab === 'compliance' && (
                <div className="space-y-4">
                    {/* Contribution Rates Reference */}
                    <Card className="bg-blue-50/30 border-blue-200">
                        <SectionHeader icon={Shield} title="Philippines Government Contributions" color="blue" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-white rounded-lg p-3 border border-blue-100">
                                <h5 className="font-bold text-sm text-blue-700 mb-1">SSS</h5>
                                <p className="text-xs text-gray-600">Total: <strong>14%</strong> of Monthly Salary Credit</p>
                                <p className="text-[10px] text-gray-400">Employer: 9.5% | Employee: 4.5%</p>
                                <p className="text-[10px] text-gray-400">+ 1% EC (employer only)</p>
                                <p className="text-[10px] text-gray-400">MSC: PHP 4,000 – 30,000</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-blue-100">
                                <h5 className="font-bold text-sm text-green-700 mb-1">PhilHealth</h5>
                                <p className="text-xs text-gray-600">Total: <strong>5%</strong> of Basic Monthly Salary</p>
                                <p className="text-[10px] text-gray-400">Employer: 2.5% | Employee: 2.5%</p>
                                <p className="text-[10px] text-gray-400">Floor: PHP 10,000 | Ceiling: PHP 100,000</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-blue-100">
                                <h5 className="font-bold text-sm text-orange-700 mb-1">Pag-IBIG</h5>
                                <p className="text-xs text-gray-600">Employee: <strong>2%</strong> | Employer: <strong>2%</strong></p>
                                <p className="text-[10px] text-gray-400">(1% if salary ≤ PHP 1,500)</p>
                                <p className="text-[10px] text-gray-400">Max MSC: PHP 5,000</p>
                            </div>
                        </div>
                    </Card>

                    {/* Compliance Table */}
                    <Card>
                        <SectionHeader icon={ClipboardList} title="Employee Compliance Status" sub="Government registration numbers and 201 file status" />
                        {employees.length === 0 ? (
                            <p className="text-center text-gray-400 py-8">No employees added yet</p>
                        ) : (() => {
                            const compliant = employees.filter(e => e.tinNumber && e.sssNumber && e.philhealthNumber && e.pagibigNumber).length;
                            return (
                                <>
                                    <div className="mb-4 p-3 rounded-lg bg-gray-50 flex items-center justify-between">
                                        <span className="text-sm font-bold text-gray-700">Compliance Summary</span>
                                        <span className={`text-sm font-bold ${compliant === employees.length ? 'text-green-600' : 'text-orange-600'}`}>
                                            {compliant}/{employees.length} employees fully registered with all government agencies
                                        </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead><tr className="border-b border-gray-200 text-[10px] uppercase text-gray-500">
                                                <th className="text-left py-2 px-2">Employee</th>
                                                <th className="text-left py-2 px-2">TIN</th>
                                                <th className="text-left py-2 px-2">SSS</th>
                                                <th className="text-left py-2 px-2">PhilHealth</th>
                                                <th className="text-left py-2 px-2">Pag-IBIG</th>
                                                <th className="text-left py-2 px-2">201 File</th>
                                                <th className="text-center py-2 px-2">Status</th>
                                            </tr></thead>
                                            <tbody>
                                                {employees.map(emp => {
                                                    const hasTin = !!emp.tinNumber;
                                                    const hasSss = !!emp.sssNumber;
                                                    const hasPh = !!emp.philhealthNumber;
                                                    const hasPag = !!emp.pagibigNumber;
                                                    const allGov = hasTin && hasSss && hasPh && hasPag;
                                                    const docs = emp.documents || {};
                                                    const docPct = Math.round((ALL_DOC_KEYS.filter(k => docs[k]).length / ALL_DOC_KEYS.length) * 100);
                                                    return (
                                                        <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50">
                                                            <td className="py-2 px-2">
                                                                <span className="font-bold text-gray-700">{emp.firstName} {emp.lastName}</span>
                                                                <span className="text-xs text-gray-400 ml-2">{emp.department}</span>
                                                            </td>
                                                            <td className="py-2 px-2">{hasTin ? <span className="text-green-600 text-xs">{emp.tinNumber}</span> : <span className="text-red-500 font-bold text-xs">MISSING</span>}</td>
                                                            <td className="py-2 px-2">{hasSss ? <span className="text-green-600 text-xs">{emp.sssNumber}</span> : <span className="text-red-500 font-bold text-xs">MISSING</span>}</td>
                                                            <td className="py-2 px-2">{hasPh ? <span className="text-green-600 text-xs">{emp.philhealthNumber}</span> : <span className="text-red-500 font-bold text-xs">MISSING</span>}</td>
                                                            <td className="py-2 px-2">{hasPag ? <span className="text-green-600 text-xs">{emp.pagibigNumber}</span> : <span className="text-red-500 font-bold text-xs">MISSING</span>}</td>
                                                            <td className="py-2 px-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-16 bg-gray-100 rounded-full h-2"><div className={`h-2 rounded-full ${docPct === 100 ? 'bg-green-500' : docPct > 50 ? 'bg-orange-400' : 'bg-red-400'}`} style={{ width: `${docPct}%` }} /></div>
                                                                    <span className="text-[10px] text-gray-500">{docPct}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2 px-2 text-center">
                                                                {allGov ? <CheckCircle size={16} className="text-green-500 mx-auto" /> : <AlertTriangle size={16} className="text-red-500 mx-auto" />}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            );
                        })()}
                    </Card>

                    {/* BIR Forms Reference */}
                    <Card>
                        <SectionHeader icon={FileText} title="Key BIR Forms Reference" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {[
                                { form: 'BIR 1601-C', desc: 'Monthly Withholding Tax on Compensation', due: '10th of following month' },
                                { form: 'BIR 1604-C', desc: 'Annual Info Return — Taxes Withheld on Compensation', due: 'January 31' },
                                { form: 'BIR 2316', desc: 'Certificate of Compensation / Tax Withheld (per employee)', due: 'January 31 or on separation' },
                                { form: 'BIR 1902', desc: 'Employee TIN Registration (for new hires without TIN)', due: 'Within 10 days of hire' },
                                { form: 'SSS R-1A', desc: 'Employment Report (register new employees with SSS)', due: 'Within 30 days of hire' },
                                { form: 'PhilHealth ER2', desc: 'Report of Employee-Members', due: 'Upon hiring' },
                            ].map(f => (
                                <div key={f.form} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                    <span className="font-bold text-orange-600 w-24 flex-shrink-0">{f.form}</span>
                                    <span className="text-gray-600 flex-1">{f.desc}</span>
                                    <span className="text-[10px] text-gray-400 flex-shrink-0">Due: {f.due}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}