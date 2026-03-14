import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button } from '../data/constants.jsx';
import {
    CheckCircle, Clock, AlertTriangle, Calendar, Users, FileText,
    DollarSign, Building, Target, Briefcase, ChevronRight, Bell,
    Filter, Eye, EyeOff, Star, Zap
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';

const PRIORITY_COLORS = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-200',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
    MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
    LOW: 'bg-gray-100 text-gray-600 border-gray-200',
    High: 'bg-orange-100 text-orange-700 border-orange-200',
    Medium: 'bg-blue-100 text-blue-700 border-blue-200',
    Low: 'bg-gray-100 text-gray-600 border-gray-200',
    Critical: 'bg-red-100 text-red-700 border-red-200',
};

const SOURCE_CONFIG = {
    business_task: { label: 'Business Task', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    calendar: { label: 'Calendar', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
    hr_appraisal: { label: 'HR Appraisal', icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
    hr_document: { label: 'HR Document', icon: FileText, color: 'text-red-600', bg: 'bg-red-50' },
    payroll: { label: 'Payroll', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    bir: { label: 'BIR Filing', icon: FileText, color: 'text-red-600', bg: 'bg-red-50' },
    appointment: { label: 'Appointment', icon: Calendar, color: 'text-cyan-600', bg: 'bg-cyan-50' },
};

const DailyTasksDashboard = ({ user, appointments = [], opportunities = [], onNavigate }) => {
    const [businessTasks, setBusinessTasks] = useState([]);
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [payrollEntries, setPayrollEntries] = useState([]);
    const [showCompleted, setShowCompleted] = useState(false);
    const [filterSource, setFilterSource] = useState('ALL');

    const today = new Date().toISOString().split('T')[0];
    const todayObj = new Date();

    // Load all data sources
    useEffect(() => {
        if (!user?.uid) return;
        const unsubs = [];

        // Business Tasks
        unsubs.push(onSnapshot(
            query(collection(db, "users", user.uid, "business_tasks"), orderBy("dueDate", "asc")),
            snap => setBusinessTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        ));

        // Calendar Events
        unsubs.push(onSnapshot(
            query(collection(db, "users", user.uid, "calendar_events"), orderBy("start", "asc")),
            snap => setCalendarEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        ));

        // Employees
        unsubs.push(onSnapshot(
            query(collection(db, "users", user.uid, "employees"), orderBy("lastName", "asc")),
            snap => setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        ));

        // Payroll
        unsubs.push(onSnapshot(
            query(collection(db, "users", user.uid, "payroll_log"), orderBy("createdAt", "desc")),
            snap => setPayrollEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        ));

        return () => unsubs.forEach(u => u());
    }, [user?.uid]);

    // Aggregate all tasks into a unified list
    const allTasks = useMemo(() => {
        const tasks = [];
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

        // 1. Business Tasks (pending/in-progress, due within 7 days or overdue)
        businessTasks.forEach(t => {
            if (t.status === 'COMPLETED' && !showCompleted) return;
            if (t.dueDate && t.dueDate <= sevenDaysStr) {
                tasks.push({
                    id: `bt-${t.id}`,
                    docId: t.id,
                    title: t.title,
                    description: t.description || '',
                    dueDate: t.dueDate,
                    priority: t.priority || 'MEDIUM',
                    status: t.status || 'PENDING',
                    source: 'business_task',
                    category: t.category,
                    owner: t.owner || '',
                    isOverdue: t.dueDate < today && t.status !== 'COMPLETED',
                    isToday: t.dueDate === today,
                    completable: true,
                    collection: 'business_tasks'
                });
            }
        });

        // 2. Calendar Events (today and next 7 days)
        calendarEvents.forEach(e => {
            const eventDate = e.start ? e.start.split('T')[0] : '';
            if (eventDate && eventDate >= today && eventDate <= sevenDaysStr) {
                if (e.type === 'CONSTRAINT') return; // Skip holidays
                tasks.push({
                    id: `cal-${e.id}`,
                    docId: e.id,
                    title: e.title,
                    description: e.description || '',
                    dueDate: eventDate,
                    priority: e.priority || 'Medium',
                    status: 'EVENT',
                    source: 'calendar',
                    category: e.category || e.type,
                    owner: e.assignedTo || '',
                    isOverdue: false,
                    isToday: eventDate === today,
                    completable: false,
                    location: e.location,
                    time: e.start ? e.start.split('T')[1]?.substring(0, 5) : ''
                });
            }
        });

        // 3. HR Appraisal Reminders (upcoming appraisals within 14 days)
        const fourteenDays = new Date();
        fourteenDays.setDate(fourteenDays.getDate() + 14);
        const fourteenDaysStr = fourteenDays.toISOString().split('T')[0];

        employees.forEach(emp => {
            if (!emp.dateHired || !['Active', 'Probationary'].includes(emp.status)) return;
            const hired = new Date(emp.dateHired);
            const empName = `${emp.firstName} ${emp.lastName}`;

            // 3-month appraisal
            const threeMonth = new Date(hired);
            threeMonth.setMonth(threeMonth.getMonth() + 3);
            const threeStr = threeMonth.toISOString().split('T')[0];

            if (threeStr >= today && threeStr <= fourteenDaysStr) {
                const existingReview = (emp.performanceReviews || []).find(r => r.period?.includes('3') || r.period?.includes('three'));
                if (!existingReview) {
                    tasks.push({
                        id: `hr3-${emp.id}`,
                        title: `3-Month Appraisal Due — ${empName}`,
                        description: `Probationary review for ${empName}. Set KPIs and evaluate performance. Hired: ${emp.dateHired}`,
                        dueDate: threeStr,
                        priority: 'HIGH',
                        status: 'PENDING',
                        source: 'hr_appraisal',
                        owner: '',
                        isOverdue: threeStr < today,
                        isToday: threeStr === today,
                        completable: false,
                        navigateTo: 'hrOnboarding'
                    });
                }
            }

            // 6-month appraisal
            const sixMonth = new Date(hired);
            sixMonth.setMonth(sixMonth.getMonth() + 6);
            const sixStr = sixMonth.toISOString().split('T')[0];

            if (sixStr >= today && sixStr <= fourteenDaysStr) {
                const existingReview = (emp.performanceReviews || []).find(r => r.period?.includes('6') || r.period?.includes('six'));
                if (!existingReview) {
                    tasks.push({
                        id: `hr6-${emp.id}`,
                        title: `6-Month Appraisal / Regularization — ${empName}`,
                        description: `Final probation review. Decide regularization. Hired: ${emp.dateHired}`,
                        dueDate: sixStr,
                        priority: 'CRITICAL',
                        status: 'PENDING',
                        source: 'hr_appraisal',
                        owner: '',
                        isOverdue: sixStr < today,
                        isToday: sixStr === today,
                        completable: false,
                        navigateTo: 'hrOnboarding'
                    });
                }
            }

            // Missing document reminders
            const docs = emp.documents || {};
            const govIds = [
                { key: 'tinNumber', label: 'TIN Number' },
                { key: 'sssNumber', label: 'SSS Number' },
                { key: 'philhealthNumber', label: 'PhilHealth Number' },
                { key: 'pagibigNumber', label: 'Pag-IBIG Number' },
            ];
            govIds.forEach(g => {
                if (!emp[g.key]) {
                    tasks.push({
                        id: `hrdoc-${emp.id}-${g.key}`,
                        title: `Missing ${g.label} — ${empName}`,
                        description: `${empName} is missing their ${g.label}. This is required for payroll and government compliance.`,
                        dueDate: today, // always urgent
                        priority: 'HIGH',
                        status: 'PENDING',
                        source: 'hr_document',
                        owner: '',
                        isOverdue: true,
                        isToday: true,
                        completable: false,
                        navigateTo: 'hrOnboarding'
                    });
                }
            });
        });

        // 4. BIR Filing Reminders (auto-generated monthly)
        const dayOfMonth = todayObj.getDate();
        const currentMonth = todayObj.toLocaleString('default', { month: 'long' });

        if (dayOfMonth <= 10) {
            tasks.push({
                id: `bir-1601c-${today.substring(0, 7)}`,
                title: `BIR 1601-C Due — ${currentMonth}`,
                description: 'Monthly Remittance Return of Income Taxes Withheld on Compensation. File via eBIRForms or eFPS.',
                dueDate: `${today.substring(0, 8)}10`,
                priority: dayOfMonth >= 7 ? 'CRITICAL' : 'HIGH',
                status: 'PENDING',
                source: 'bir',
                owner: '',
                isOverdue: dayOfMonth > 10,
                isToday: dayOfMonth === 10,
                completable: false,
                navigateTo: 'accounts'
            });
        }

        // 5. Appointments (today and upcoming)
        (appointments || []).forEach(apt => {
            if (apt.appointmentDate && apt.appointmentDate >= today && apt.appointmentDate <= sevenDaysStr) {
                tasks.push({
                    id: `apt-${apt.id || apt.appointmentDate}`,
                    title: `Appointment: ${apt.companyName || 'Client'}`,
                    description: `${apt.purpose || ''} — ${apt.contactPerson || ''}`,
                    dueDate: apt.appointmentDate,
                    priority: apt.priority || 'Medium',
                    status: 'EVENT',
                    source: 'appointment',
                    owner: apt.assignedTo || '',
                    isOverdue: false,
                    isToday: apt.appointmentDate === today,
                    completable: false,
                    time: apt.appointmentTime || ''
                });
            }
        });

        // Sort: overdue first, then today, then by date, then by priority
        const priorityOrder = { CRITICAL: 0, Critical: 0, HIGH: 1, High: 1, MEDIUM: 2, Medium: 2, LOW: 3, Low: 3 };
        tasks.sort((a, b) => {
            if (a.isOverdue && !b.isOverdue) return -1;
            if (!a.isOverdue && b.isOverdue) return 1;
            if (a.isToday && !b.isToday) return -1;
            if (!a.isToday && b.isToday) return 1;
            if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
            return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
        });

        return tasks;
    }, [businessTasks, calendarEvents, employees, payrollEntries, appointments, opportunities, today, showCompleted]);

    // Filter by source
    const filteredTasks = filterSource === 'ALL' ? allTasks : allTasks.filter(t => t.source === filterSource);

    // Stats
    const stats = useMemo(() => ({
        total: allTasks.length,
        overdue: allTasks.filter(t => t.isOverdue).length,
        today: allTasks.filter(t => t.isToday && !t.isOverdue).length,
        upcoming: allTasks.filter(t => !t.isToday && !t.isOverdue).length,
        bySource: Object.entries(
            allTasks.reduce((acc, t) => { acc[t.source] = (acc[t.source] || 0) + 1; return acc; }, {})
        )
    }), [allTasks]);

    // Mark business task as completed
    const completeTask = async (task) => {
        if (!task.completable || !task.docId) return;
        try {
            await updateDoc(doc(db, "users", user.uid, task.collection, task.docId), {
                status: 'COMPLETED',
                completedDate: today,
                updatedAt: new Date()
            });
        } catch (err) {
            console.error('Error completing task:', err);
        }
    };

    const getDaysLabel = (dueDate) => {
        const due = new Date(dueDate);
        const diff = Math.ceil((due - todayObj) / (1000 * 60 * 60 * 24));
        if (diff < 0) return `${Math.abs(diff)}d overdue`;
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Tomorrow';
        return `In ${diff} days`;
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                            <Bell size={24} /> Good {todayObj.getHours() < 12 ? 'Morning' : todayObj.getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.displayName?.split(' ')[0] || 'Team'}
                        </h1>
                        <p className="text-sm text-indigo-200 font-bold mt-1">
                            {todayObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <div className="text-center">
                            <div className="text-3xl font-black">{stats.overdue}</div>
                            <div className="text-[10px] text-red-300 font-bold uppercase">Overdue</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-black">{stats.today}</div>
                            <div className="text-[10px] text-yellow-300 font-bold uppercase">Today</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-black">{stats.upcoming}</div>
                            <div className="text-[10px] text-indigo-200 font-bold uppercase">Upcoming</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Source Filters */}
            <div className="flex flex-wrap gap-2">
                <button onClick={() => setFilterSource('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterSource === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                    All ({stats.total})
                </button>
                {stats.bySource.map(([source, count]) => {
                    const cfg = SOURCE_CONFIG[source];
                    if (!cfg) return null;
                    return (
                        <button key={source} onClick={() => setFilterSource(source)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterSource === source ? 'bg-indigo-600 text-white' : `bg-white ${cfg.color} border border-gray-200 hover:bg-gray-50`}`}>
                            <cfg.icon size={12} /> {cfg.label} ({count})
                        </button>
                    );
                })}
                <button onClick={() => setShowCompleted(!showCompleted)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 ml-auto">
                    {showCompleted ? <EyeOff size={12} /> : <Eye size={12} />}
                    {showCompleted ? 'Hide' : 'Show'} Completed
                </button>
            </div>

            {/* Task List */}
            {filteredTasks.length === 0 ? (
                <Card className="text-center py-12">
                    <CheckCircle size={48} className="mx-auto mb-3 text-green-400 opacity-50" />
                    <h3 className="text-lg font-bold text-gray-600">All caught up!</h3>
                    <p className="text-sm text-gray-400">No pending tasks for the next 7 days.</p>
                </Card>
            ) : (
                <div className="space-y-2">
                    {/* Overdue Section */}
                    {filteredTasks.filter(t => t.isOverdue).length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-xs font-black text-red-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <AlertTriangle size={14} /> Overdue ({filteredTasks.filter(t => t.isOverdue).length})
                            </h3>
                            <div className="space-y-1">
                                {filteredTasks.filter(t => t.isOverdue).map(task => (
                                    <TaskRow key={task.id} task={task} onComplete={completeTask} onNavigate={onNavigate} getDaysLabel={getDaysLabel} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Today Section */}
                    {filteredTasks.filter(t => t.isToday && !t.isOverdue).length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-xs font-black text-orange-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <Zap size={14} /> Today ({filteredTasks.filter(t => t.isToday && !t.isOverdue).length})
                            </h3>
                            <div className="space-y-1">
                                {filteredTasks.filter(t => t.isToday && !t.isOverdue).map(task => (
                                    <TaskRow key={task.id} task={task} onComplete={completeTask} onNavigate={onNavigate} getDaysLabel={getDaysLabel} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upcoming Section */}
                    {filteredTasks.filter(t => !t.isToday && !t.isOverdue).length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <Clock size={14} /> Upcoming ({filteredTasks.filter(t => !t.isToday && !t.isOverdue).length})
                            </h3>
                            <div className="space-y-1">
                                {filteredTasks.filter(t => !t.isToday && !t.isOverdue).map(task => (
                                    <TaskRow key={task.id} task={task} onComplete={completeTask} onNavigate={onNavigate} getDaysLabel={getDaysLabel} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Task Row Component
const TaskRow = ({ task, onComplete, onNavigate, getDaysLabel }) => {
    const cfg = SOURCE_CONFIG[task.source] || SOURCE_CONFIG.business_task;
    const Icon = cfg.icon;

    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm ${
            task.isOverdue ? 'bg-red-50 border-red-200' :
            task.isToday ? 'bg-orange-50 border-orange-200' :
            task.status === 'COMPLETED' ? 'bg-green-50 border-green-200 opacity-60' :
            'bg-white border-gray-200'
        }`}>
            {/* Complete Button */}
            {task.completable ? (
                <button onClick={() => onComplete(task)} className="flex-shrink-0">
                    {task.status === 'COMPLETED' ? (
                        <CheckCircle size={20} className="text-green-500" />
                    ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 transition-all" />
                    )}
                </button>
            ) : (
                <div className={`p-1.5 rounded-lg ${cfg.bg} flex-shrink-0`}>
                    <Icon size={14} className={cfg.color} />
                </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {task.title}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.MEDIUM}`}>
                        {task.priority}
                    </span>
                </div>
                {task.description && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{task.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                    <span className={`font-bold ${cfg.color}`}>{cfg.label}</span>
                    {task.time && <span><Clock size={9} className="inline mr-0.5" />{task.time}</span>}
                    {task.location && <span>{task.location}</span>}
                    {task.owner && <span>Assigned: {task.owner}</span>}
                </div>
            </div>

            {/* Due date / Navigate */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs font-bold ${
                    task.isOverdue ? 'text-red-600' : task.isToday ? 'text-orange-600' : 'text-gray-500'
                }`}>
                    {getDaysLabel(task.dueDate)}
                </span>
                {task.navigateTo && onNavigate && (
                    <button onClick={() => onNavigate(task.navigateTo)} className="p-1 hover:bg-gray-100 rounded">
                        <ChevronRight size={14} className="text-gray-400" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default DailyTasksDashboard;
