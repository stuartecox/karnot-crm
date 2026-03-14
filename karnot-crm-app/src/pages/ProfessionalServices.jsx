import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input } from '../data/constants.jsx';
import {
    Scale, Calculator, FileText, Calendar, CheckCircle, AlertCircle,
    DollarSign, Clock, Users, Shield, Building, ChevronDown, ChevronUp,
    Plus, Trash2, Save, Target, Briefcase, AlertTriangle, BookOpen
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

// ─── Monthly Task Templates ────────────────────────────────────────────

const LAWYER_MONTHLY_TASKS = [
    { category: 'Corporate Compliance', tasks: [
        { task: 'Review and update GIS (General Information Sheet) for SEC', frequency: 'Annual (due within 30 days of annual meeting)', estHours: 2, importance: 'CRITICAL' },
        { task: 'File SEC Annual Report / Audited Financial Statements', frequency: 'Annual (April 15)', estHours: 4, importance: 'CRITICAL' },
        { task: 'Review Board Resolutions and Secretary Certificate', frequency: 'As needed', estHours: 1, importance: 'HIGH' },
        { task: 'Monitor SEC Memorandum Circulars for new compliance requirements', frequency: 'Monthly', estHours: 0.5, importance: 'MEDIUM' },
    ]},
    { category: 'Employment & Labor', tasks: [
        { task: 'Review employment contracts for new hires (probationary terms, NDA)', frequency: 'Per hire', estHours: 1, importance: 'HIGH' },
        { task: 'Draft/review NTE (Notice to Explain) if disciplinary action needed', frequency: 'As needed', estHours: 2, importance: 'CRITICAL' },
        { task: 'Review separation/termination documents (Two-Notice Rule compliance)', frequency: 'As needed', estHours: 3, importance: 'CRITICAL' },
        { task: 'DOLE compliance check (workplace postings, safety standards)', frequency: 'Quarterly', estHours: 1, importance: 'MEDIUM' },
        { task: 'Review employee handbook/company policy updates', frequency: 'Annual', estHours: 4, importance: 'MEDIUM' },
        { task: 'Advise on regularization decisions (5th month review)', frequency: 'As needed', estHours: 1, importance: 'HIGH' },
    ]},
    { category: 'BOI / PEZA / Investment Incentives', tasks: [
        { task: 'Monitor BOI-SIPP registration compliance & reporting deadlines', frequency: 'Quarterly', estHours: 2, importance: 'CRITICAL' },
        { task: 'Review BOI Annual Report submission requirements', frequency: 'Annual', estHours: 4, importance: 'CRITICAL' },
        { task: 'Advise on 70% export requirement compliance', frequency: 'Quarterly', estHours: 1, importance: 'HIGH' },
        { task: 'Monitor changes to CREATE MORE Act / tax incentive rules', frequency: 'Monthly', estHours: 0.5, importance: 'HIGH' },
        { task: 'Review import documentation for duty-free equipment (if applicable)', frequency: 'As needed', estHours: 2, importance: 'MEDIUM' },
    ]},
    { category: 'Contracts & Commercial', tasks: [
        { task: 'Review client contracts / service agreements', frequency: 'Per deal', estHours: 2, importance: 'HIGH' },
        { task: 'Review supplier/vendor agreements', frequency: 'Per vendor', estHours: 1.5, importance: 'MEDIUM' },
        { task: 'Draft/review NDA for partners, investors, employees', frequency: 'As needed', estHours: 1, importance: 'MEDIUM' },
        { task: 'Review lease agreements (office, warehouse)', frequency: 'As needed', estHours: 2, importance: 'MEDIUM' },
        { task: 'Advise on EaaS (Energy-as-a-Service) contract structures', frequency: 'Per deal', estHours: 3, importance: 'HIGH' },
    ]},
    { category: 'Intellectual Property', tasks: [
        { task: 'File/maintain trademark registrations with IPOPHL', frequency: 'Annual', estHours: 2, importance: 'MEDIUM' },
        { task: 'Review IP ownership in employment contracts', frequency: 'Per hire', estHours: 0.5, importance: 'MEDIUM' },
    ]},
    { category: 'Data Privacy (RA 10173)', tasks: [
        { task: 'Review Data Privacy compliance (NPC registration if applicable)', frequency: 'Annual', estHours: 2, importance: 'HIGH' },
        { task: 'Review privacy notices, consent forms, 201 file handling', frequency: 'Annual', estHours: 1, importance: 'MEDIUM' },
        { task: 'Advise on data breach notification procedures', frequency: 'As needed', estHours: 1, importance: 'CRITICAL' },
    ]},
];

const ACCOUNTANT_MONTHLY_TASKS = [
    { category: 'Monthly BIR Filing', tasks: [
        { task: 'Prepare and file BIR 1601-C (Monthly Withholding Tax on Compensation)', frequency: 'Monthly (10th)', estHours: 2, importance: 'CRITICAL' },
        { task: 'Prepare and file BIR 0619-E (Monthly Expanded Withholding Tax)', frequency: 'Monthly (10th)', estHours: 1.5, importance: 'CRITICAL' },
        { task: 'Prepare and file BIR 2550M (Monthly VAT Declaration)', frequency: 'Monthly (20th)', estHours: 2, importance: 'CRITICAL' },
        { task: 'Prepare Summary List of Sales (SLS) & Purchases (SLP)', frequency: 'Monthly', estHours: 3, importance: 'HIGH' },
        { task: 'Reconcile BIR Alpha List data with payroll', frequency: 'Monthly', estHours: 1, importance: 'HIGH' },
    ]},
    { category: 'Quarterly BIR Filing', tasks: [
        { task: 'Prepare and file BIR 1601-EQ (Quarterly Expanded WT Remittance)', frequency: 'Quarterly', estHours: 3, importance: 'CRITICAL' },
        { task: 'Prepare and file BIR 2550Q (Quarterly VAT Return)', frequency: 'Quarterly', estHours: 3, importance: 'CRITICAL' },
        { task: 'Prepare and file BIR 1702Q (Quarterly Income Tax Return)', frequency: 'Quarterly', estHours: 4, importance: 'CRITICAL' },
        { task: 'Submit QAP (Quarterly Alphalist of Payees)', frequency: 'Quarterly', estHours: 2, importance: 'HIGH' },
        { task: 'Reconcile VAT input/output credits', frequency: 'Quarterly', estHours: 2, importance: 'HIGH' },
    ]},
    { category: 'Annual BIR Filing', tasks: [
        { task: 'Prepare and file BIR 1604-C (Annual Info Return — Compensation)', frequency: 'Annual (Jan 31)', estHours: 6, importance: 'CRITICAL' },
        { task: 'Prepare and file BIR 1604-E (Annual Info Return — Expanded WT)', frequency: 'Annual (Mar 1)', estHours: 4, importance: 'CRITICAL' },
        { task: 'Prepare BIR 2316 certificates for all employees', frequency: 'Annual (Jan 31)', estHours: 4, importance: 'CRITICAL' },
        { task: 'Prepare and file BIR 1702 (Annual Income Tax Return)', frequency: 'Annual (Apr 15)', estHours: 8, importance: 'CRITICAL' },
        { task: 'File BIR 0605 (Annual Registration Fee — PHP 500)', frequency: 'Annual (Jan 31)', estHours: 0.5, importance: 'HIGH' },
        { task: 'Prepare Audited Financial Statements (AFS) for BIR', frequency: 'Annual (Apr 15)', estHours: 20, importance: 'CRITICAL' },
    ]},
    { category: 'Government Contributions', tasks: [
        { task: 'Compute and remit SSS contributions (employer + employee)', frequency: 'Monthly', estHours: 1, importance: 'CRITICAL' },
        { task: 'Compute and remit PhilHealth premiums', frequency: 'Monthly', estHours: 0.5, importance: 'CRITICAL' },
        { task: 'Compute and remit Pag-IBIG contributions', frequency: 'Monthly', estHours: 0.5, importance: 'CRITICAL' },
        { task: 'File SSS R-3 (Monthly Collection List)', frequency: 'Monthly', estHours: 1, importance: 'HIGH' },
        { task: 'File PhilHealth RF-1 (Monthly Remittance Report)', frequency: 'Monthly', estHours: 0.5, importance: 'HIGH' },
        { task: 'Register new employees with SSS/PhilHealth/Pag-IBIG', frequency: 'Per hire', estHours: 1, importance: 'HIGH' },
    ]},
    { category: 'Bookkeeping & Financial Management', tasks: [
        { task: 'Record daily transactions in Books of Accounts', frequency: 'Daily/Weekly', estHours: 8, importance: 'HIGH' },
        { task: 'Reconcile bank statements', frequency: 'Monthly', estHours: 2, importance: 'HIGH' },
        { task: 'Prepare monthly financial statements (P&L, Balance Sheet)', frequency: 'Monthly', estHours: 4, importance: 'HIGH' },
        { task: 'Manage accounts receivable (invoice follow-up)', frequency: 'Weekly', estHours: 2, importance: 'MEDIUM' },
        { task: 'Manage accounts payable (supplier payments)', frequency: 'Weekly', estHours: 2, importance: 'MEDIUM' },
        { task: 'Compute and pay 13th month (on or before Dec 24)', frequency: 'Annual', estHours: 3, importance: 'CRITICAL' },
    ]},
    { category: 'BOI / Special Compliance', tasks: [
        { task: 'Prepare BOI Annual Report (financial data, export ratios)', frequency: 'Annual', estHours: 8, importance: 'CRITICAL' },
        { task: 'Track 70% export revenue ratio for BOI-SIPP compliance', frequency: 'Monthly', estHours: 1, importance: 'HIGH' },
        { task: 'Prepare documentation for duty-free import claims', frequency: 'As needed', estHours: 3, importance: 'MEDIUM' },
        { task: 'Maintain BOI-compliant financial records (separate BOI vs non-BOI)', frequency: 'Ongoing', estHours: 2, importance: 'HIGH' },
    ]},
    { category: 'SEC Filing Support', tasks: [
        { task: 'Prepare Audited Financial Statements for SEC filing', frequency: 'Annual', estHours: 20, importance: 'CRITICAL' },
        { task: 'Support GIS preparation with financial data', frequency: 'Annual', estHours: 2, importance: 'HIGH' },
    ]},
];

// ─── Retainer Calculator Helper ─────────────────────────────────────────
const calculateRetainer = (tasks, hourlyRate) => {
    let monthlyHours = 0;
    let quarterlyHours = 0;
    let annualHours = 0;
    let asNeededHours = 0;

    tasks.forEach(cat => {
        cat.tasks.forEach(t => {
            const freq = t.frequency.toLowerCase();
            if (freq.includes('monthly') || freq.includes('daily') || freq.includes('weekly') || freq.includes('ongoing')) {
                monthlyHours += t.estHours;
            } else if (freq.includes('quarterly')) {
                quarterlyHours += t.estHours;
            } else if (freq.includes('annual')) {
                annualHours += t.estHours;
            } else {
                asNeededHours += t.estHours;
            }
        });
    });

    const avgMonthly = monthlyHours + (quarterlyHours / 3) + (annualHours / 12) + (asNeededHours / 6);
    return { monthlyHours, quarterlyHours, annualHours, asNeededHours, avgMonthly, monthlyRetainer: avgMonthly * hourlyRate };
};

// ─── Priority Badge Component ───────────────────────────────────────────
const PriorityBadge = ({ level }) => {
    const colors = {
        CRITICAL: 'bg-red-100 text-red-700',
        HIGH: 'bg-orange-100 text-orange-700',
        MEDIUM: 'bg-blue-100 text-blue-700',
    };
    return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${colors[level] || colors.MEDIUM}`}>{level}</span>;
};

export default function ProfessionalServices({ user }) {
    const [activeTab, setActiveTab] = useState('lawyer');
    const [lawyerRate, setLawyerRate] = useState(3000); // PHP per hour
    const [accountantRate, setAccountantRate] = useState(1500); // PHP per hour
    const [checkedTasks, setCheckedTasks] = useState({});
    const [customTasks, setCustomTasks] = useState([]);
    const [newTask, setNewTask] = useState({ category: '', task: '', frequency: 'Monthly', estHours: 1 });

    // Load saved check states
    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(
            query(collection(db, "users", user.uid, "professional_tasks")),
            snap => {
                const data = {};
                snap.docs.forEach(d => { data[d.id] = d.data(); });
                setCheckedTasks(data);
            }
        );
        const unsub2 = onSnapshot(
            query(collection(db, "users", user.uid, "custom_professional_tasks"), orderBy("createdAt", "desc")),
            snap => setCustomTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        return () => { unsub(); unsub2(); };
    }, [user?.uid]);

    const toggleTask = async (taskKey, month) => {
        const key = `${taskKey}-${month}`;
        const ref = doc(db, "users", user.uid, "professional_tasks", key);
        if (checkedTasks[key]?.done) {
            await updateDoc(ref, { done: false, updatedAt: serverTimestamp() });
        } else {
            await setDoc(ref, { done: true, taskKey, month, updatedAt: serverTimestamp() });
        }
    };

    const addCustomTask = async () => {
        if (!newTask.task) return;
        await addDoc(collection(db, "users", user.uid, "custom_professional_tasks"), {
            ...newTask,
            type: activeTab,
            importance: 'MEDIUM',
            createdAt: serverTimestamp()
        });
        setNewTask({ category: '', task: '', frequency: 'Monthly', estHours: 1 });
    };

    const deleteCustomTask = async (id) => {
        await deleteDoc(doc(db, "users", user.uid, "custom_professional_tasks", id));
    };

    const currentMonth = new Date().toLocaleString('default', { month: 'short', year: 'numeric' });
    const lawyerCalc = calculateRetainer(LAWYER_MONTHLY_TASKS, lawyerRate);
    const accountantCalc = calculateRetainer(ACCOUNTANT_MONTHLY_TASKS, accountantRate);

    const activeTasks = activeTab === 'lawyer' ? LAWYER_MONTHLY_TASKS : ACCOUNTANT_MONTHLY_TASKS;
    const activeCalc = activeTab === 'lawyer' ? lawyerCalc : accountantCalc;
    const activeRate = activeTab === 'lawyer' ? lawyerRate : accountantRate;
    const setActiveRate = activeTab === 'lawyer' ? setLawyerRate : setAccountantRate;

    const relevantCustomTasks = customTasks.filter(t => t.type === activeTab);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-2xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Scale size={28} />
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tight">Professional Services Manager</h1>
                            <p className="text-sm text-slate-300 font-bold">Lawyer & Accountant Retainer Tasks — Know Exactly What You're Paying For</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Toggle */}
            <div className="flex gap-2">
                <button onClick={() => setActiveTab('lawyer')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'lawyer' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>
                    <Scale size={16} /> Lawyer / Legal Counsel
                </button>
                <button onClick={() => setActiveTab('accountant')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'accountant' ? 'bg-green-700 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>
                    <Calculator size={16} /> Accountant / Tax
                </button>
            </div>

            {/* Retainer Calculator */}
            <Card className={`border-t-4 ${activeTab === 'lawyer' ? 'border-slate-600' : 'border-green-600'}`}>
                <div className="flex items-center gap-2 mb-4">
                    <Calculator size={18} className={activeTab === 'lawyer' ? 'text-slate-600' : 'text-green-600'} />
                    <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Retainer Calculator</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Hourly Rate</div>
                        <div className="flex items-center justify-center gap-1 mt-1">
                            <span className="text-xs text-gray-500">PHP</span>
                            <input type="number" value={activeRate} onChange={e => setActiveRate(parseInt(e.target.value) || 0)}
                                className="w-20 text-center border rounded px-2 py-1 text-sm font-bold" />
                        </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Monthly Tasks</div>
                        <div className="text-lg font-black text-blue-600">{activeCalc.monthlyHours.toFixed(1)}h</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Quarterly</div>
                        <div className="text-lg font-black text-purple-600">{activeCalc.quarterlyHours.toFixed(1)}h</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Annual</div>
                        <div className="text-lg font-black text-orange-600">{activeCalc.annualHours.toFixed(1)}h</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Avg Monthly</div>
                        <div className="text-lg font-black text-gray-700">{activeCalc.avgMonthly.toFixed(1)}h</div>
                    </div>
                    <div className={`rounded-lg p-3 text-center ${activeTab === 'lawyer' ? 'bg-slate-100' : 'bg-green-100'}`}>
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Monthly Retainer</div>
                        <div className={`text-lg font-black ${activeTab === 'lawyer' ? 'text-slate-700' : 'text-green-700'}`}>
                            PHP {activeCalc.monthlyRetainer.toLocaleString()}
                        </div>
                    </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
                    <strong>Negotiation Tip:</strong> Present this task list to your {activeTab}. A fixed monthly retainer based on {activeCalc.avgMonthly.toFixed(0)} hours/month at PHP {activeRate.toLocaleString()}/hr = <strong>PHP {activeCalc.monthlyRetainer.toLocaleString()}/month</strong>. Any work beyond these listed tasks should be billed separately with prior approval.
                </div>
            </Card>

            {/* Task Categories */}
            {activeTasks.map((cat, catIdx) => (
                <TaskCategory
                    key={catIdx}
                    category={cat}
                    activeTab={activeTab}
                    currentMonth={currentMonth}
                    checkedTasks={checkedTasks}
                    toggleTask={toggleTask}
                    catIdx={catIdx}
                />
            ))}

            {/* Custom Tasks */}
            {relevantCustomTasks.length > 0 && (
                <Card>
                    <h4 className="text-xs font-bold text-gray-600 uppercase mb-3">Custom Tasks You Added</h4>
                    <div className="space-y-1">
                        {relevantCustomTasks.map(t => (
                            <div key={t.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                                <div>
                                    <span className="font-bold text-gray-700">{t.task}</span>
                                    <span className="text-xs text-gray-400 ml-2">({t.frequency}, ~{t.estHours}h)</span>
                                </div>
                                <button onClick={() => deleteCustomTask(t.id)} className="text-red-300 hover:text-red-500"><Trash2 size={14} /></button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Add Custom Task */}
            <Card className="bg-gray-50">
                <h4 className="text-xs font-bold text-gray-600 uppercase mb-3">Add Custom Task for {activeTab === 'lawyer' ? 'Lawyer' : 'Accountant'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Task description" value={newTask.task} onChange={e => setNewTask(p => ({ ...p, task: e.target.value }))} />
                    <select className="border rounded-lg px-3 py-2 text-sm" value={newTask.frequency} onChange={e => setNewTask(p => ({ ...p, frequency: e.target.value }))}>
                        <option>Monthly</option><option>Quarterly</option><option>Annual</option><option>As needed</option><option>Per hire</option><option>Per deal</option>
                    </select>
                    <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Est. hours" value={newTask.estHours} onChange={e => setNewTask(p => ({ ...p, estHours: parseFloat(e.target.value) || 0 }))} />
                    <Button onClick={addCustomTask} variant="primary" className="text-xs"><Plus size={12} className="mr-1" /> Add Task</Button>
                </div>
            </Card>

            {/* Engagement Tips */}
            <Card className="bg-blue-50 border-blue-200">
                <h3 className="font-black text-blue-800 uppercase text-xs tracking-widest mb-3 flex items-center gap-2"><BookOpen size={14} /> Tips for Engaging Professional Services in the Philippines</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-700">
                    {[
                        { tip: 'Always get a written engagement letter', detail: 'Specify scope, fees, billing method (hourly/retainer), and what is NOT included.' },
                        { tip: 'Ask for itemised billing', detail: 'Request monthly invoices showing hours per task. Never accept "professional fees" as a single line item.' },
                        { tip: 'Set a monthly cap', detail: 'Agree on a maximum monthly spend. Any work above requires your written approval first.' },
                        { tip: 'Use this task list as your scope', detail: 'Present these tasks as the basis for the retainer. Anything outside this list is extra.' },
                        { tip: 'Compare rates', detail: 'Manila lawyer rates: PHP 2,500-5,000/hr (junior-senior). Accountant: PHP 1,000-3,000/hr. Provincial rates are 30-50% lower.' },
                        { tip: 'Consider shared bookkeeper + CPA model', detail: 'Monthly bookkeeping (PHP 8,000-15,000/mo) + CPA for quarterly/annual filings (PHP 3,000-8,000/mo) is often cheaper than a full accountant.' },
                        { tip: 'Right of first refusal', detail: 'For litigation or major transactions, your retainer lawyer should get first shot but at agreed rates.' },
                        { tip: 'Annual review', detail: 'Review scope and rates every January. Add/remove tasks based on the past year.' },
                    ].map((t, i) => (
                        <div key={i} className="bg-white rounded-lg p-3 border border-blue-100">
                            <span className="font-bold text-blue-700">{t.tip}</span>
                            <p className="text-gray-600 mt-1">{t.detail}</p>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

// ─── Task Category Collapsible Component ────────────────────────────────
function TaskCategory({ category, activeTab, currentMonth, checkedTasks, toggleTask, catIdx }) {
    const [open, setOpen] = useState(true);
    const totalHours = category.tasks.reduce((s, t) => s + t.estHours, 0);
    const criticalCount = category.tasks.filter(t => t.importance === 'CRITICAL').length;

    return (
        <Card>
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-left">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-gray-800">{category.category}</h3>
                    {criticalCount > 0 && (
                        <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">{criticalCount} CRITICAL</span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-bold">{totalHours}h total</span>
                    {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
            </button>
            {open && (
                <div className="mt-3">
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                            <tr>
                                <th className="p-2 text-left w-8">{currentMonth}</th>
                                <th className="p-2 text-left">Task</th>
                                <th className="p-2 text-left">Frequency</th>
                                <th className="p-2 text-right">Est. Hours</th>
                                <th className="p-2 text-center">Priority</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {category.tasks.map((task, idx) => {
                                const taskKey = `${activeTab}-${catIdx}-${idx}`;
                                const isChecked = checkedTasks[`${taskKey}-${currentMonth}`]?.done;
                                return (
                                    <tr key={idx} className={`hover:bg-gray-50 ${isChecked ? 'opacity-50' : ''}`}>
                                        <td className="p-2">
                                            <button onClick={() => toggleTask(taskKey, currentMonth)} className="focus:outline-none">
                                                {isChecked ? (
                                                    <CheckCircle size={16} className="text-green-500" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 hover:border-green-500" />
                                                )}
                                            </button>
                                        </td>
                                        <td className={`p-2 ${isChecked ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.task}</td>
                                        <td className="p-2 text-gray-500">{task.frequency}</td>
                                        <td className="p-2 text-right font-bold">{task.estHours}h</td>
                                        <td className="p-2 text-center"><PriorityBadge level={task.importance} /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}
