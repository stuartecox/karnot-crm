import React, { useState } from 'react';
import { Card, Button } from '../data/constants.jsx';
import {
    BookOpen, Shield, FileText, Users, Calendar, AlertCircle, CheckCircle,
    ChevronDown, ChevronUp, Building, Clock, Target, Award, Heart, Phone,
    DollarSign, Briefcase, AlertTriangle
} from 'lucide-react';

// ─── Collapsible Section Component ──────────────────────────────────────
const Section = ({ title, icon: Icon, color = 'orange', children, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <Card className={`border-l-4 border-${color}-500`}>
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-left">
                <div className="flex items-center gap-2">
                    <Icon size={18} className={`text-${color}-500`} />
                    <h3 className="font-black text-gray-800 uppercase text-sm tracking-wide">{title}</h3>
                </div>
                {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>
            {open && <div className="mt-4">{children}</div>}
        </Card>
    );
};

const InfoRow = ({ label, value, highlight }) => (
    <div className="flex justify-between py-2 border-b border-gray-50">
        <span className="text-sm text-gray-600">{label}</span>
        <span className={`text-sm font-bold ${highlight ? 'text-red-600' : 'text-gray-800'}`}>{value}</span>
    </div>
);

const FormCard = ({ form, description, due, frequency, penalty }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between mb-1">
            <span className="font-black text-orange-700 text-sm">{form}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${frequency === 'Monthly' ? 'bg-blue-100 text-blue-700' : frequency === 'Annual' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{frequency}</span>
        </div>
        <p className="text-xs text-gray-600 mb-2">{description}</p>
        <div className="flex items-center justify-between text-[10px]">
            <span className="text-red-500 font-bold flex items-center gap-1"><Clock size={10} /> Due: {due}</span>
            {penalty && <span className="text-red-600 font-bold">Penalty: {penalty}</span>}
        </div>
    </div>
);

export default function PhilippinesHRTraining() {
    const [activeModule, setActiveModule] = useState('overview');

    const modules = [
        { key: 'overview', label: 'Overview', icon: BookOpen },
        { key: 'hiring', label: 'Hiring Process', icon: Users },
        { key: 'compensation', label: 'Compensation & Benefits', icon: DollarSign },
        { key: 'contributions', label: 'Government Contributions', icon: Shield },
        { key: 'bir', label: 'BIR Tax Filing', icon: FileText },
        { key: 'leave', label: 'Leave Entitlements', icon: Calendar },
        { key: 'discipline', label: 'Discipline & Termination', icon: AlertTriangle },
        { key: 'compliance', label: 'Compliance Calendar', icon: Target },
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2">
                    <BookOpen size={28} />
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">Philippines HR Administrator Training</h1>
                        <p className="text-sm text-orange-100 font-bold">Labor Code, DOLE, BIR, SSS, PhilHealth, Pag-IBIG — Complete Reference Guide</p>
                    </div>
                </div>
                <p className="text-xs text-orange-200 mt-2">
                    This training module covers all Philippine employment law requirements for HR administrators. Use this as a reference when onboarding employees, processing payroll, filing government returns, and managing compliance.
                </p>
            </div>

            {/* Module Navigation */}
            <div className="flex flex-wrap gap-2">
                {modules.map(m => (
                    <button key={m.key} onClick={() => setActiveModule(m.key)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeModule === m.key ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-orange-50 border border-gray-200'
                        }`}>
                        <m.icon size={14} /> {m.label}
                    </button>
                ))}
            </div>

            {/* ═══════ OVERVIEW ═══════ */}
            {activeModule === 'overview' && (
                <div className="space-y-4">
                    <Card className="bg-blue-50 border-blue-200">
                        <h3 className="font-black text-blue-800 uppercase text-sm mb-3">Key Philippine Employment Laws</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                                { law: 'Labor Code of the Philippines', ref: 'PD 442', desc: 'Primary employment law — covers hiring, wages, hours, leave, termination' },
                                { law: 'TRAIN Law (Tax Reform)', ref: 'RA 10963', desc: 'Income tax tables, withholding tax rates, de minimis benefits' },
                                { law: 'SSS Law', ref: 'RA 11199', desc: 'Social Security System — mandatory for all private employees' },
                                { law: 'PhilHealth Act', ref: 'RA 11223', desc: 'Universal Health Care — mandatory health insurance' },
                                { law: 'Pag-IBIG Fund Law', ref: 'RA 9679', desc: 'Home Development Mutual Fund — mandatory savings' },
                                { law: 'Expanded Maternity Leave', ref: 'RA 11210', desc: '105 days paid maternity leave (all female workers)' },
                                { law: 'Paternity Leave Act', ref: 'RA 8187', desc: '7 days paid paternity leave for married male employees' },
                                { law: 'Anti-Sexual Harassment', ref: 'RA 7877', desc: 'Prevention of sexual harassment in the workplace' },
                                { law: 'OSH Standards', ref: 'RA 11058', desc: 'Occupational Safety and Health — training, safety officer, reporting' },
                                { law: 'Data Privacy Act', ref: 'RA 10173', desc: 'Protection of employee personal data (201 file, records)' },
                            ].map(l => (
                                <div key={l.ref} className="bg-white rounded-lg p-3 border border-blue-100">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-sm text-gray-800">{l.law}</span>
                                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{l.ref}</span>
                                    </div>
                                    <p className="text-xs text-gray-600">{l.desc}</p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <h3 className="font-black text-gray-800 uppercase text-sm mb-3 flex items-center gap-2"><Target size={16} className="text-orange-500" /> HR Administrator Checklist</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {[
                                'Register company with BIR, SSS, PhilHealth, Pag-IBIG, DOLE',
                                'Set up payroll system with correct tax tables (TRAIN Law)',
                                'Prepare standard employment contracts (probationary & regular)',
                                'Create 201 file template with all required documents',
                                'Set up leave tracking system (SIL + company leave)',
                                'Designate Safety Officer and create OSH program (RA 11058)',
                                'Post DOLE-required workplace notices and labor standards',
                                'Create employee handbook with company policies',
                                'Set up monthly BIR 1601-C filing schedule',
                                'Register with DOLE for company establishment report',
                                'Set up 13th month pay computation (due Dec 24)',
                                'Create appraisal schedule (3-month, 6-month for probationary)',
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                                    <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-gray-700">{item}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* ═══════ HIRING PROCESS ═══════ */}
            {activeModule === 'hiring' && (
                <div className="space-y-4">
                    <Section title="Pre-Employment Requirements" icon={Users} color="blue" defaultOpen={true}>
                        <div className="space-y-3">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                                <strong>Important:</strong> Under the Labor Code, the employer must inform the employee of the standards for regularization AT THE TIME OF HIRING (Art. 296). Keep written proof.
                            </div>
                            <h4 className="text-xs font-bold text-gray-600 uppercase">Documents to Collect from New Hire</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {[
                                    { doc: 'TIN Number', note: 'If none, file BIR Form 1902 within 10 days', required: true },
                                    { doc: 'SSS Number', note: 'If none, register via SSS R-1A form within 30 days', required: true },
                                    { doc: 'PhilHealth Number', note: 'File PhilHealth ER2 upon hiring', required: true },
                                    { doc: 'Pag-IBIG MID Number', note: 'Register via HDMF enrollment form', required: true },
                                    { doc: 'NBI Clearance', note: 'Valid within 6 months', required: true },
                                    { doc: 'Police Clearance', note: 'From local police station', required: false },
                                    { doc: 'Barangay Clearance', note: 'From place of residence', required: false },
                                    { doc: 'Medical Certificate / Drug Test', note: 'DOLE requirement for some industries', required: true },
                                    { doc: 'PSA Birth Certificate', note: 'Original or certified copy', required: true },
                                    { doc: '2x2 ID Photos', note: 'White background, recent', required: true },
                                    { doc: 'Diploma / Transcript', note: 'Highest educational attainment', required: false },
                                    { doc: 'Previous COE', note: 'Certificate of Employment from previous employer', required: false },
                                    { doc: 'BIR Form 2316', note: 'From previous employer (for tax computation)', required: false },
                                    { doc: 'Valid Government ID', note: 'Any 2 valid IDs', required: true },
                                ].map(d => (
                                    <div key={d.doc} className={`p-2 rounded-lg border text-xs ${d.required ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-gray-700">{d.doc}</span>
                                            {d.required && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">REQUIRED</span>}
                                        </div>
                                        <p className="text-gray-500 mt-0.5">{d.note}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Section>

                    <Section title="Employment Contract Types" icon={Briefcase} color="purple">
                        <div className="space-y-3">
                            {[
                                { type: 'Probationary', duration: 'Max 6 months (Art. 296)', rules: 'Must state regularization standards at hiring. Employee auto-regularizes after 6 months if not terminated for just cause or failure to meet standards.' },
                                { type: 'Regular / Permanent', duration: 'Indefinite', rules: 'Full security of tenure. Can only be terminated for just or authorized causes under Art. 297-299.' },
                                { type: 'Project-Based', duration: 'Duration of specific project', rules: 'Must clearly define the project scope and expected completion. File DOLE Establishment Termination Report upon completion.' },
                                { type: 'Fixed-Term', duration: 'Specific period agreed upon', rules: 'Valid only if freely agreed by employer and employee. Cannot be used to circumvent security of tenure.' },
                                { type: 'Casual', duration: 'For work not usually necessary', rules: 'If employed for 1+ year (continuous or broken), becomes regular for that activity.' },
                            ].map(c => (
                                <div key={c.type} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-sm text-gray-800">{c.type}</span>
                                        <span className="text-xs text-purple-600 font-bold">{c.duration}</span>
                                    </div>
                                    <p className="text-xs text-gray-600">{c.rules}</p>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section title="Probationary Period Management" icon={Clock} color="orange">
                        <div className="space-y-3">
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                                <strong>Critical Rule:</strong> Probationary period CANNOT exceed 6 months from the date of hiring (Art. 296, Labor Code). If no evaluation is done within 6 months, the employee is deemed a regular employee.
                            </div>
                            <h4 className="text-xs font-bold text-gray-600 uppercase">Recommended Appraisal Schedule</h4>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                                    <div className="text-2xl font-black text-blue-600">3</div>
                                    <div className="text-xs font-bold text-gray-600">Month Review</div>
                                    <p className="text-[10px] text-gray-500 mt-1">Mid-probation check. Set KPI targets, identify training needs.</p>
                                </div>
                                <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
                                    <div className="text-2xl font-black text-orange-600">5</div>
                                    <div className="text-xs font-bold text-gray-600">Month Warning</div>
                                    <p className="text-[10px] text-gray-500 mt-1">Final evaluation. If not meeting standards, issue notice before 6 months.</p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                                    <div className="text-2xl font-black text-green-600">6</div>
                                    <div className="text-xs font-bold text-gray-600">Month Decision</div>
                                    <p className="text-[10px] text-gray-500 mt-1">Regularize or terminate. Auto-regularized if no action taken.</p>
                                </div>
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                                <strong>Warning:</strong> If you terminate a probationary employee, it must be:
                                (a) for just cause, OR (b) for failure to meet reasonable standards communicated at hiring.
                                The burden of proof is on the employer. Document everything.
                            </div>
                        </div>
                    </Section>
                </div>
            )}

            {/* ═══════ COMPENSATION & BENEFITS ═══════ */}
            {activeModule === 'compensation' && (
                <div className="space-y-4">
                    <Section title="Minimum Wage & Pay Rules" icon={DollarSign} color="green" defaultOpen={true}>
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                    <h4 className="font-bold text-green-800 text-sm mb-2">NCR (Metro Manila) Minimum Wage 2025</h4>
                                    <div className="text-2xl font-black text-green-600">PHP 645/day</div>
                                    <p className="text-[10px] text-gray-500 mt-1">Non-agriculture (Wage Order NCR-25)</p>
                                    <p className="text-[10px] text-gray-500">Monthly: ~PHP 16,770 (26 working days)</p>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                    <h4 className="font-bold text-blue-800 text-sm mb-2">Pay Frequency</h4>
                                    <p className="text-xs text-gray-600">Wages must be paid at least <strong>once every 2 weeks or twice per month</strong> at intervals not exceeding 16 days (Art. 103).</p>
                                    <p className="text-xs text-gray-600 mt-2">Payday must be within <strong>7 days</strong> after end of pay period.</p>
                                </div>
                            </div>
                            <h4 className="text-xs font-bold text-gray-600 uppercase mt-3">Overtime & Premium Pay Rates</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50 font-bold text-gray-600 uppercase">
                                        <tr>
                                            <th className="p-2 text-left">Scenario</th>
                                            <th className="p-2 text-right">Rate</th>
                                            <th className="p-2 text-left">Legal Basis</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {[
                                            { scenario: 'Regular Overtime (beyond 8 hrs)', rate: '+25% of hourly rate', basis: 'Art. 87' },
                                            { scenario: 'Rest Day / Special Holiday Work', rate: '+30% of daily rate', basis: 'Art. 93' },
                                            { scenario: 'Rest Day Overtime', rate: '+30% + 25% OT premium', basis: 'Art. 93' },
                                            { scenario: 'Regular Holiday Work', rate: '200% of daily rate', basis: 'Art. 94' },
                                            { scenario: 'Regular Holiday + OT', rate: '200% + 30% OT', basis: 'Art. 94' },
                                            { scenario: 'Special Non-Working Holiday', rate: '+30% if worked', basis: 'Art. 94' },
                                            { scenario: 'Night Shift Differential (10pm-6am)', rate: '+10% of hourly rate', basis: 'Art. 86' },
                                        ].map(r => (
                                            <tr key={r.scenario} className="hover:bg-gray-50">
                                                <td className="p-2 text-gray-700">{r.scenario}</td>
                                                <td className="p-2 text-right font-bold text-green-700">{r.rate}</td>
                                                <td className="p-2 text-gray-500">{r.basis}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Section>

                    <Section title="13th Month Pay" icon={Award} color="orange">
                        <div className="space-y-3">
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                                <strong className="text-orange-800">Mandatory for all rank-and-file employees</strong> (PD 851)
                            </div>
                            <InfoRow label="Formula" value="Total Basic Salary Earned / 12" />
                            <InfoRow label="Deadline" value="On or before December 24" highlight />
                            <InfoRow label="Taxable if exceeding" value="PHP 90,000 (combined with other benefits)" />
                            <InfoRow label="Who is covered" value="All rank-and-file, regardless of employment status" />
                            <InfoRow label="Prorated" value="Yes — for those who worked less than 12 months" />
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
                                <strong>Note:</strong> Managerial employees are NOT covered by PD 851, but many companies include them. De minimis benefits (tax-exempt up to PHP 90,000/year combined with 13th month).
                            </div>
                        </div>
                    </Section>

                    <Section title="De Minimis Benefits (Tax-Exempt)" icon={Heart} color="pink">
                        <div className="space-y-2">
                            <p className="text-xs text-gray-600 mb-2">Under RR No. 11-2018 (TRAIN Law), these benefits are TAX-EXEMPT:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {[
                                    { benefit: 'Monetized unused vacation leave', limit: '10 days/year' },
                                    { benefit: 'Medical cash allowance', limit: 'PHP 1,500/month' },
                                    { benefit: 'Rice subsidy', limit: 'PHP 2,000/month or 1 sack (50kg)' },
                                    { benefit: 'Uniform/clothing allowance', limit: 'PHP 6,000/year' },
                                    { benefit: 'Laundry allowance', limit: 'PHP 300/month' },
                                    { benefit: 'Employee achievement awards', limit: 'PHP 10,000/year' },
                                    { benefit: 'Christmas gift/major anniversary', limit: 'PHP 5,000/year' },
                                    { benefit: 'Daily meal allowance', limit: '25% above minimum wage (if OT)' },
                                ].map(b => (
                                    <div key={b.benefit} className="flex justify-between p-2 bg-gray-50 rounded text-xs border border-gray-100">
                                        <span className="text-gray-700">{b.benefit}</span>
                                        <span className="font-bold text-green-700 flex-shrink-0 ml-2">{b.limit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Section>
                </div>
            )}

            {/* ═══════ GOVERNMENT CONTRIBUTIONS ═══════ */}
            {activeModule === 'contributions' && (
                <div className="space-y-4">
                    <Section title="SSS (Social Security System)" icon={Shield} color="green" defaultOpen={true}>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                                    <div className="text-xl font-black text-green-600">14%</div>
                                    <div className="text-[10px] text-gray-500 font-bold">Total Rate</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                                    <div className="text-xl font-black text-green-600">4.5%</div>
                                    <div className="text-[10px] text-gray-500 font-bold">Employee Share</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                                    <div className="text-xl font-black text-green-600">9.5%</div>
                                    <div className="text-[10px] text-gray-500 font-bold">Employer Share</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                                    <div className="text-xl font-black text-green-600">+1%</div>
                                    <div className="text-[10px] text-gray-500 font-bold">EC (Employer)</div>
                                </div>
                            </div>
                            <InfoRow label="Monthly Salary Credit Range" value="PHP 4,000 – PHP 30,000" />
                            <InfoRow label="Registration Form" value="SSS R-1A (Employment Report)" />
                            <InfoRow label="Filing Deadline" value="Within 30 days of hiring" highlight />
                            <InfoRow label="Monthly Contribution Deadline" value="Last day of following month" />
                            <InfoRow label="Penalty for Late Payment" value="3% per month + criminal liability" highlight />
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700">
                                <strong>Benefits covered:</strong> Sickness, maternity, disability, retirement, death, funeral, unemployment (WISP).
                            </div>
                        </div>
                    </Section>

                    <Section title="PhilHealth (Universal Healthcare)" icon={Heart} color="green">
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-teal-50 rounded-lg p-3 text-center border border-teal-200">
                                    <div className="text-xl font-black text-teal-600">5%</div>
                                    <div className="text-[10px] text-gray-500 font-bold">Total Rate</div>
                                </div>
                                <div className="bg-teal-50 rounded-lg p-3 text-center border border-teal-200">
                                    <div className="text-xl font-black text-teal-600">2.5%</div>
                                    <div className="text-[10px] text-gray-500 font-bold">Employee Share</div>
                                </div>
                                <div className="bg-teal-50 rounded-lg p-3 text-center border border-teal-200">
                                    <div className="text-xl font-black text-teal-600">2.5%</div>
                                    <div className="text-[10px] text-gray-500 font-bold">Employer Share</div>
                                </div>
                                <div className="bg-teal-50 rounded-lg p-3 text-center border border-teal-200">
                                    <div className="text-sm font-black text-teal-600">PHP 100K</div>
                                    <div className="text-[10px] text-gray-500 font-bold">Salary Ceiling</div>
                                </div>
                            </div>
                            <InfoRow label="Salary Floor" value="PHP 10,000" />
                            <InfoRow label="Salary Ceiling" value="PHP 100,000" />
                            <InfoRow label="Registration Form" value="PhilHealth ER2 (Report of Employee-Members)" />
                            <InfoRow label="Filing Deadline" value="Upon hiring" highlight />
                        </div>
                    </Section>

                    <Section title="Pag-IBIG (HDMF)" icon={Building} color="blue">
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                                    <div className="text-xl font-black text-blue-600">2%</div>
                                    <div className="text-[10px] text-gray-500 font-bold">Employee Share</div>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                                    <div className="text-xl font-black text-blue-600">2%</div>
                                    <div className="text-[10px] text-gray-500 font-bold">Employer Share</div>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                                    <div className="text-sm font-black text-blue-600">PHP 5,000</div>
                                    <div className="text-[10px] text-gray-500 font-bold">Max Monthly Salary Credit</div>
                                </div>
                            </div>
                            <InfoRow label="Employee rate if salary <= PHP 1,500" value="1%" />
                            <InfoRow label="Benefits" value="Housing loans, multi-purpose loans, calamity loans" />
                            <InfoRow label="MP2 Savings" value="Optional modified savings, higher dividend rate" />
                        </div>
                    </Section>
                </div>
            )}

            {/* ═══════ BIR TAX FILING ═══════ */}
            {activeModule === 'bir' && (
                <div className="space-y-4">
                    <Section title="Withholding Tax on Compensation (TRAIN Law 2025)" icon={FileText} color="red" defaultOpen={true}>
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-600 uppercase">Annual Income Tax Table (Graduated Rates)</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-red-50 font-bold text-red-800 uppercase">
                                        <tr>
                                            <th className="p-2 text-left">Annual Taxable Income</th>
                                            <th className="p-2 text-right">Tax Rate</th>
                                            <th className="p-2 text-right">Base Tax</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        <tr className="bg-green-50"><td className="p-2 font-bold text-green-700">Up to PHP 250,000</td><td className="p-2 text-right font-bold text-green-700">0%</td><td className="p-2 text-right">PHP 0</td></tr>
                                        <tr><td className="p-2">PHP 250,001 – 400,000</td><td className="p-2 text-right font-bold">15%</td><td className="p-2 text-right">PHP 0</td></tr>
                                        <tr><td className="p-2">PHP 400,001 – 800,000</td><td className="p-2 text-right font-bold">20%</td><td className="p-2 text-right">PHP 22,500</td></tr>
                                        <tr><td className="p-2">PHP 800,001 – 2,000,000</td><td className="p-2 text-right font-bold">25%</td><td className="p-2 text-right">PHP 102,500</td></tr>
                                        <tr><td className="p-2">PHP 2,000,001 – 8,000,000</td><td className="p-2 text-right font-bold">30%</td><td className="p-2 text-right">PHP 402,500</td></tr>
                                        <tr className="bg-red-50"><td className="p-2 font-bold text-red-700">Over PHP 8,000,000</td><td className="p-2 text-right font-bold text-red-700">35%</td><td className="p-2 text-right">PHP 2,202,500</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-800">
                                <strong>TRAIN Law Key Change:</strong> Employees earning PHP 250,000/year or less are TAX EXEMPT. This was PHP 10,000/month before TRAIN Law.
                            </div>
                        </div>
                    </Section>

                    <Section title="BIR Forms Reference" icon={FileText} color="orange">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <FormCard form="BIR 1601-C" description="Monthly Remittance Return of Income Taxes Withheld on Compensation" due="10th of following month" frequency="Monthly" penalty="25% surcharge + 12% interest" />
                            <FormCard form="BIR 1604-C" description="Annual Information Return of Income Taxes Withheld on Compensation" due="January 31" frequency="Annual" penalty="PHP 1,000 per day late" />
                            <FormCard form="BIR 2316" description="Certificate of Compensation Payment/Tax Withheld (per employee)" due="January 31 or upon separation" frequency="Annual" />
                            <FormCard form="BIR 1902" description="Application for Registration of Employee (TIN application)" due="Within 10 days of hire" frequency="Per Hire" />
                            <FormCard form="BIR 0605" description="Payment of Annual Registration Fee" due="January 31" frequency="Annual" penalty="PHP 1,000" />
                            <FormCard form="BIR 1701Q" description="Quarterly Income Tax Return (if applicable)" due="Within 60 days after quarter end" frequency="Quarterly" />
                        </div>
                    </Section>
                </div>
            )}

            {/* ═══════ LEAVE ENTITLEMENTS ═══════ */}
            {activeModule === 'leave' && (
                <div className="space-y-4">
                    <Section title="Mandatory Leave Entitlements" icon={Calendar} color="blue" defaultOpen={true}>
                        <div className="space-y-3">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-blue-50 font-bold text-blue-800 uppercase">
                                        <tr>
                                            <th className="p-2 text-left">Leave Type</th>
                                            <th className="p-2 text-center">Days</th>
                                            <th className="p-2 text-left">Legal Basis</th>
                                            <th className="p-2 text-left">Who Qualifies</th>
                                            <th className="p-2 text-left">Pay Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {[
                                            { type: 'Service Incentive Leave (SIL)', days: 5, law: 'Art. 95, Labor Code', who: 'All employees with 1+ year service', pay: 'Paid' },
                                            { type: 'Maternity Leave', days: 105, law: 'RA 11210', who: 'All female employees (including solo parents +15 days)', pay: 'Paid (SSS + employer diff.)' },
                                            { type: 'Paternity Leave', days: 7, law: 'RA 8187', who: 'Married male employees (first 4 legitimate children)', pay: 'Paid' },
                                            { type: 'Solo Parent Leave', days: 7, law: 'RA 8972', who: 'Solo parents with Solo Parent ID', pay: 'Paid' },
                                            { type: 'VAWC Leave', days: 10, law: 'RA 9262', who: 'Women/children victims of violence', pay: 'Paid' },
                                            { type: 'Special Leave (Gynaecological)', days: 60, law: 'RA 9710 (Magna Carta of Women)', who: 'Female employees post-surgery', pay: 'Paid' },
                                            { type: 'Bereavement Leave', days: 3, law: 'Company Policy', who: 'All employees (immediate family)', pay: 'Company policy' },
                                        ].map(l => (
                                            <tr key={l.type} className="hover:bg-gray-50">
                                                <td className="p-2 font-bold text-gray-800">{l.type}</td>
                                                <td className="p-2 text-center font-black text-blue-600">{l.days}</td>
                                                <td className="p-2 text-gray-500">{l.law}</td>
                                                <td className="p-2 text-gray-600">{l.who}</td>
                                                <td className="p-2"><span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">{l.pay}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                                <strong>SIL Note:</strong> Service Incentive Leave may be converted to cash at year-end if unused. This applies to employees who have rendered at least 1 year of service. Companies can be more generous than the minimum (e.g., 15 days VL + 15 days SL is common for larger firms).
                            </div>
                        </div>
                    </Section>
                </div>
            )}

            {/* ═══════ DISCIPLINE & TERMINATION ═══════ */}
            {activeModule === 'discipline' && (
                <div className="space-y-4">
                    <Section title="Due Process — Two-Notice Rule" icon={AlertTriangle} color="red" defaultOpen={true}>
                        <div className="space-y-3">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                                <strong>Critical:</strong> Failure to follow the Two-Notice Rule makes any termination ILLEGAL, even if there was valid cause. The Supreme Court consistently upholds this.
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="bg-white rounded-lg p-4 border-2 border-red-200 text-center">
                                    <div className="text-3xl font-black text-red-600 mb-1">1</div>
                                    <h4 className="font-bold text-sm text-gray-800">Notice to Explain (NTE)</h4>
                                    <p className="text-xs text-gray-600 mt-2">Written notice specifying the grounds for termination. Employee must be given at least <strong>5 calendar days</strong> to submit a written explanation.</p>
                                </div>
                                <div className="bg-white rounded-lg p-4 border-2 border-orange-200 text-center">
                                    <div className="text-3xl font-black text-orange-600 mb-1">2</div>
                                    <h4 className="font-bold text-sm text-gray-800">Administrative Hearing</h4>
                                    <p className="text-xs text-gray-600 mt-2">Opportunity to be heard. Employee may present evidence, witnesses, and defend themselves. Must be documented.</p>
                                </div>
                                <div className="bg-white rounded-lg p-4 border-2 border-gray-200 text-center">
                                    <div className="text-3xl font-black text-gray-600 mb-1">3</div>
                                    <h4 className="font-bold text-sm text-gray-800">Notice of Decision</h4>
                                    <p className="text-xs text-gray-600 mt-2">Written notice stating the decision (termination or not), the grounds, and effective date. Must be served to employee.</p>
                                </div>
                            </div>
                        </div>
                    </Section>

                    <Section title="Just Causes for Termination (Art. 297)" icon={AlertCircle} color="red">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {[
                                { cause: 'Serious Misconduct', example: 'Theft, fraud, assault, harassment' },
                                { cause: 'Willful Disobedience', example: 'Repeated refusal to follow lawful orders' },
                                { cause: 'Gross & Habitual Neglect', example: 'Consistent failure to perform duties' },
                                { cause: 'Fraud / Breach of Trust', example: 'Falsifying records, embezzlement' },
                                { cause: 'Commission of a Crime', example: 'Criminal offense against employer or co-worker' },
                                { cause: 'Other Analogous Causes', example: 'Similar in nature to the above' },
                            ].map(c => (
                                <div key={c.cause} className="bg-red-50 border border-red-100 rounded-lg p-3">
                                    <span className="font-bold text-sm text-red-800">{c.cause}</span>
                                    <p className="text-xs text-gray-600 mt-1">e.g., {c.example}</p>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section title="Authorized Causes (Art. 298-299)" icon={Building} color="purple">
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {[
                                    { cause: 'Redundancy', sep: '1 month pay per year of service or 1 month pay, whichever is higher' },
                                    { cause: 'Retrenchment (to prevent losses)', sep: '1/2 month pay per year of service or 1 month pay, whichever is higher' },
                                    { cause: 'Closure / Cessation', sep: 'Same as retrenchment' },
                                    { cause: 'Disease (health reason)', sep: '1/2 month pay per year of service or 1 month pay' },
                                ].map(c => (
                                    <div key={c.cause} className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                                        <span className="font-bold text-sm text-purple-800">{c.cause}</span>
                                        <p className="text-xs text-gray-600 mt-1">Separation Pay: {c.sep}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
                                <strong>30-Day Notice Required:</strong> For authorized causes, employer must give 30 days written notice to both the employee and DOLE before the effective date of termination.
                            </div>
                        </div>
                    </Section>
                </div>
            )}

            {/* ═══════ COMPLIANCE CALENDAR ═══════ */}
            {activeModule === 'compliance' && (
                <div className="space-y-4">
                    <Section title="Monthly Compliance Tasks" icon={Calendar} color="blue" defaultOpen={true}>
                        <div className="space-y-2">
                            {[
                                { day: '10th', task: 'BIR 1601-C Filing', desc: 'Monthly withholding tax on compensation remittance', agency: 'BIR' },
                                { day: '10th', task: 'BIR 0619-E/F Filing', desc: 'Monthly expanded/final withholding tax remittance', agency: 'BIR' },
                                { day: 'Last day', task: 'SSS Contribution Payment', desc: 'Monthly SSS contributions (employer + employee shares)', agency: 'SSS' },
                                { day: 'Last day', task: 'PhilHealth Contribution Payment', desc: 'Monthly PhilHealth premiums', agency: 'PhilHealth' },
                                { day: 'Last day', task: 'Pag-IBIG Contribution Payment', desc: 'Monthly Pag-IBIG fund contributions', agency: 'Pag-IBIG' },
                            ].map((t, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="text-sm font-black text-blue-600 w-20 flex-shrink-0">{t.day}</span>
                                    <div className="flex-1">
                                        <span className="font-bold text-sm text-gray-800">{t.task}</span>
                                        <p className="text-xs text-gray-500">{t.desc}</p>
                                    </div>
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold flex-shrink-0">{t.agency}</span>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section title="Annual Compliance Calendar" icon={Target} color="orange">
                        <div className="space-y-2">
                            {[
                                { month: 'January', tasks: ['BIR 1604-C (Annual tax return)', 'BIR 2316 to all employees', 'BIR 0605 (Annual registration fee)', 'SSS R-5 Annual Report'] },
                                { month: 'March', tasks: ['BIR 1702Q (Q1 quarterly income tax)', 'Annual Medical Exam (if required by company)'] },
                                { month: 'April', tasks: ['BIR Annual Income Tax Return (if applicable)', 'Update employee 201 files'] },
                                { month: 'June', tasks: ['Mid-year performance reviews', 'BIR 1702Q (Q2 quarterly income tax)'] },
                                { month: 'September', tasks: ['BIR 1702Q (Q3 quarterly income tax)', 'Review leave balances'] },
                                { month: 'November', tasks: ['Prepare 13th month pay computation', 'Year-end performance reviews'] },
                                { month: 'December', tasks: ['Pay 13th month on or before Dec 24', 'DOLE Report on 13th Month Pay compliance', 'Prepare BIR annual returns', 'Plan next year salary adjustments'] },
                            ].map(m => (
                                <div key={m.month} className="bg-white border border-gray-200 rounded-lg p-3">
                                    <h4 className="font-bold text-sm text-orange-700 mb-2">{m.month}</h4>
                                    <div className="space-y-1">
                                        {m.tasks.map((t, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                                                <CheckCircle size={12} className="text-orange-400 flex-shrink-0" />
                                                <span>{t}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>
                </div>
            )}
        </div>
    );
}
