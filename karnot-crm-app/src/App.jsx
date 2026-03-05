import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from './firebase'; 
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { 
    collection, 
    onSnapshot, 
    query, 
    doc, 
    getDoc, 
    setDoc, 
    deleteDoc, 
    serverTimestamp, 
    addDoc, 
    updateDoc, 
    orderBy 
} from "firebase/firestore"; 

// ==========================================
// 1. PAGE IMPORTS
// ==========================================
// --- Core CRM ---
import LoginPage from './pages/LoginPage.jsx';
import FunnelPage from './pages/FunnelPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import QuotesListPage from './pages/QuotesListPage.jsx';
import OpportunityDetailPage from './pages/OpportunityDetailPage.jsx';
import CompaniesPage from './pages/CompaniesPage.jsx'; 
import ContactsPage from './pages/ContactsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import CalculatorsPage from './pages/CalculatorsPage.jsx'; 
import SupplierManager from './pages/SupplierManager.jsx';

// --- Territory & Field Sales Modules ---
import TerritoryManagement from './pages/TerritoryManagement.jsx';
import AgentManagement from './pages/AgentManagement.jsx';
import AppointmentScheduler from './pages/AppointmentScheduler.jsx';
import TerritoryLeadGenerator from './pages/TerritoryLeadGenerator.jsx';
import BOIProjectLeads from './pages/BOIProjectLeads.jsx';
import PEZAZones from './pages/PEZAZones.jsx';
import SmartTextScraper from './pages/SmartTextScraper.jsx';
import ColdRoomCalc from './components/ColdRoomCalc.jsx';

// --- Export Operations ---
import ASEANExportPage from './pages/ASEANExportPage.jsx';
import UKExportPage from './pages/UKExportPage.jsx';
import ExportCompaniesPage from './pages/ExportCompaniesPage.jsx';
import ExportContactsPage from './pages/ExportContactsPage.jsx';
import ESCOImportEnrichmentTool from './pages/ESCOImportEnrichmentTool.jsx';

// --- Service & Operations Modules ---
import InstallEstimator from './pages/InstallEstimator.jsx';
import ServiceInvoice from './pages/ServiceInvoice.jsx';
import ServiceContractsPage from './pages/ServiceContractsPage.jsx';
import MaintenanceCalendar from './pages/MaintenanceCalendar.jsx';
import TechnicianMobileView from './pages/TechnicianMobileView.jsx';
import AssetsPage from './pages/AssetsPage.jsx';
import BusinessTasksCalendar from './pages/BusinessTasksCalendar.jsx';

// --- Finance & Banking Modules ---
import BankReconciliation from './pages/BankReconciliation.jsx'; 
import ManagementAccounts from './pages/ManagementAccounts.jsx';
import PayrollManager from './pages/PayrollManager.jsx'; 

// --- NEW: Investment Modules ---
import CEOInvestmentDashboard from './components/CEOInvestmentDashboard.jsx';
import InvestorEmailManager from './components/InvestorEmailManager.jsx';
import FundraisingTaskBoard from './components/FundraisingTaskBoard.jsx';
import InvestorsPage from './pages/InvestorsPage.jsx';
import CallCentre from './pages/CallCentre.jsx';

// ==========================================
// 2. COMPONENT IMPORTS
// ==========================================
import QuoteCalculator from './components/QuoteCalculator.jsx';
import HeatPumpCalculator from './components/HeatPumpCalculator.jsx';
import WarmRoomCalc from './components/WarmRoomCalc.jsx';
import DatasheetLibrary from './components/DatasheetLibrary.jsx';
import RSRHCalculator from './components/RSRHCalculator.jsx';
// --- NEW IMPORT HERE ---
import SolvivaPartnerCalculator from './components/SolvivaPartnerCalculator.jsx';

// ==========================================
// 2B. NEW INVESTOR RESEARCH COMPONENTS
// ==========================================
import InvestorWebScraper from './components/InvestorWebScraper.jsx';
import InvestorResearchChecklist from './components/InvestorResearchChecklist.jsx';
import EmailTemplateGenerator from './components/EmailTemplateGenerator.jsx';
import DealStructureChecker from './components/DealStructureChecker.jsx';
import InvestorAutoResearch from './components/InvestorAutoResearch.jsx';
import InvestorFinancialModel from './components/InvestorFinancialModel.jsx';
import EaaSInvestorCalculator from './components/EaaSInvestorCalculator.jsx';

// --- Social Media & Marketing ---
import SocialMediaPlanner from './pages/SocialMediaPlanner.jsx';
import EmailMarketingPage from './pages/EmailMarketingPage.jsx';

// --- HR & Onboarding ---
import HROnboardingPage from './pages/HROnboardingPage.jsx';
import PhilippinesHRTraining from './pages/PhilippinesHRTraining.jsx';
import DailyTasksDashboard from './pages/DailyTasksDashboard.jsx';
import ProfessionalServices from './pages/ProfessionalServices.jsx';
import RegulatoryIndustryPage from './pages/RegulatoryIndustryPage.jsx';
import ImportExportCompliancePage from './pages/ImportExportCompliancePage.jsx';
import TechDevelopmentHub from './pages/TechDevelopmentHub.jsx';

// ==========================================
// 3. DATA & ACCOUNTING MODULES
// ==========================================
import FinancialEntryLogger from './data/FinancialEntryLogger.jsx';
import ManpowerLogger from './data/ManpowerLogger.jsx';
import ProjectOperations from './data/ProjectOperations.jsx'; 
import BIRBookPrep from './data/BIRBookPrep.jsx'; 

// ==========================================
// 4. CONSTANTS & STYLING
// ==========================================
import { KARNOT_LOGO_BASE_64, Button } from './data/constants.jsx'; 
import { 
    BarChart2, List as ListIcon, HardHat, LogOut, Building, 
    Users, Settings, Calculator, Plus, Landmark, ChevronDown,
    MapPin, Wrench, Briefcase, FileText, Target, Package, 
    UserCheck, Calendar as CalendarIcon, CheckCircle, Globe, Upload, Sparkles,
    DollarSign, Mail, TrendingUp, Phone, Grid, Printer, Map, Zap,
    Share2, Linkedin, BookOpen, Layout, Image, Scale, Shield, Ship, Anchor
} from 'lucide-react'; 

// ==========================================
// 5. DROPDOWN MENU COMPONENT
// ==========================================
const DropdownMenu = ({ label, icon: Icon, items, activeView, setActiveView, variant = 'secondary' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isActive = items.some(item => item.view === activeView);

    const getButtonClassName = () => {
        let baseClass = 'font-bold uppercase text-[10px] tracking-widest h-9';
        if (isActive) {
            return baseClass;
        }
        if (variant === 'orange') {
            return `${baseClass} !border-orange-200 !text-orange-700 !bg-orange-50 hover:!bg-orange-100`;
        }
        if (variant === 'purple') {
            return `${baseClass} !border-purple-200 !text-purple-700 !bg-purple-50 hover:!bg-purple-100`;
        }
        return baseClass;
    };

    return (
        <div className="relative" onMouseLeave={() => setIsOpen(false)}>
            <Button 
                onClick={() => setIsOpen(!isOpen)}
                onMouseEnter={() => setIsOpen(true)}
                variant={isActive ? 'primary' : variant}
                className={getButtonClassName()}
            >
                <Icon className="mr-1.5" size={14} /> {label} <ChevronDown size={12} className="ml-1"/>
            </Button>
            
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border-2 border-gray-100 rounded-xl shadow-xl min-w-[200px] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {items.map((item, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setActiveView(item.view);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-wide transition-colors flex items-center gap-2 ${
                                activeView === item.view 
                                    ? 'bg-orange-50 text-orange-700 border-l-4 border-orange-500' 
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {item.icon && <item.icon size={14} />}
                            {item.label}
                            {item.badge && (
                                <span className="ml-auto bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ==========================================
// 6. MAIN NAVIGATION HEADER
// ==========================================
const Header = ({ activeView, setActiveView, quoteCount, onLogout, onNewQuote, userRole, userPermissions = [] }) => {
    // Sales & CRM Menu
    const salesMenu = [
        { view: 'funnel', label: 'Sales Funnel', icon: HardHat },
        { view: 'list', label: 'Quotes List', icon: ListIcon, badge: quoteCount },
        { view: 'datasheets', label: 'Datasheet Library', icon: Printer, badge: 'NEW' },
        { view: 'companies', label: 'Companies', icon: Building },
        { view: 'contacts', label: 'Contacts', icon: Users },
        { view: 'suppliers', label: 'Suppliers', icon: Briefcase }
    ];

    // Field Operations Menu
    const fieldOpsMenu = [
        { view: 'territories', label: 'Territories', icon: MapPin },
        { view: 'agents', label: 'Agents', icon: Users },
        { view: 'appointments', label: 'Call Centre', icon: FileText },
        { view: 'leadGenerator', label: 'Lead Generator', icon: Target },
        { view: 'smartScraper', label: 'Text Scraper', icon: Sparkles, badge: 'AI' },
        { view: 'boiLeads', label: 'BOI Projects', icon: Building, badge: 'NEW' },
        { view: 'pezaZones', label: 'PEZA Zones', icon: HardHat, badge: 'NEW' },
        { view: 'regulatory', label: 'Regulatory & Industry', icon: Shield, badge: 'NEW' }
    ];

    // Export Operations Menu
    const exportOpsMenu = [
        { view: 'aseanExport', label: 'ASEAN Markets', icon: Globe, badge: 'BOI' },
        { view: 'ukExport', label: 'UK Operations', icon: Globe },
        { view: 'exportCompanies', label: 'Companies', icon: Building },
        { view: 'exportContacts', label: 'Contacts', icon: Users },
        { view: 'exportCallCentre', label: 'Call Centre', icon: Phone },
        { view: 'escoImport', label: 'Import ESCOs', icon: Upload, badge: 'AI' },
        { view: 'importExportCompliance', label: 'Import/Export Compliance', icon: Ship, badge: 'BOC' }
    ];

    // Operations Menu (Recurring Revenue)
    const operationsMenu = [
        { view: 'assets', label: 'Asset Registry', icon: Package, badge: 'NEW' },
        { view: 'serviceContracts', label: 'Service Contracts', icon: FileText },
        { view: 'maintenanceCalendar', label: 'Ops Calendar', icon: CalendarIcon },
        { view: 'businessTasks', label: 'Business Tasks', icon: CheckCircle, badge: 'NEW' },
        { view: 'technicianView', label: 'Technician App', icon: Wrench, badge: 'MOBILE' },
        { view: 'installEstimator', label: 'Install & QC', icon: Wrench },
        { view: 'serviceInvoice', label: 'Service Invoice', icon: FileText }
    ];

    // Tech R&D Menu
    const techRDMenu = [
        { view: 'techHub', label: 'Product Overview', icon: Zap, badge: 'CO2' },
        { view: 'techRoadmap', label: 'Dev Roadmap', icon: Target },
        { view: 'techTasks', label: 'Engineering Tasks', icon: CheckCircle },
        { view: 'techNotes', label: 'Tech Notes', icon: FileText },
        { view: 'techDocs', label: 'Document Vault', icon: Briefcase },
        { view: 'techPatents', label: 'IP & Patents', icon: Shield, badge: 'NEW' },
    ];

    // Social Media & Marketing Menu
    const socialMediaMenu = [
        { view: 'socialPlanner', label: 'Social Planner', icon: Layout, badge: 'NEW' },
        { view: 'socialContent', label: 'Content Calendar', icon: CalendarIcon },
        { view: 'socialAnalytics', label: 'Analytics Tracker', icon: BarChart2 },
        { view: 'socialCampaigns', label: 'Campaigns', icon: Zap },
        { view: 'socialTraining', label: 'Training Hub', icon: BookOpen },
        { view: 'emailMarketing', label: 'Email Marketing', icon: Mail, badge: 'BREVO' },
    ];

    // Investment Menu
    const investmentMenu = [
        { view: 'investmentPipeline', label: 'Command Center', icon: TrendingUp },
        { view: 'eaasCalc', label: 'EaaS Calculator', icon: Calculator, badge: 'NEW' },
        { view: 'investorModel', label: 'Investor Model', icon: Target },
        { view: 'fundraisingBoard', label: 'Cambridge Roadmap', icon: Map },
        { view: 'investors', label: 'Investor Companies', icon: Building, badge: '43' },
        { view: 'investmentCallCentre', label: 'Call Centre', icon: Phone },
        { view: 'investmentTasks', label: 'General Tasks', icon: CheckCircle },
        { view: 'investmentEmails', label: 'Email Templates', icon: Mail }
    ];

   // Calculators Menu
    const calculatorsMenu = [
        { view: 'calculatorsHub', label: 'Calculator Hub', icon: Calculator },
        { view: 'heatPumpCalc', label: 'Heat Pump ROI', icon: Calculator },
        { view: 'warmRoomCalc', label: 'Warm Room', icon: Calculator },
        { view: 'coldRoomCalc', label: 'Cold Room', icon: Calculator },
        { view: 'rsrhCalc', label: 'RSRH Cattle', icon: Target },
        // --- ADDED NEW SOLVIVA CALCULATOR HERE ---
        { view: 'solvivaCalc', label: 'Solviva Partner', icon: Zap, badge: 'NEW' }
    ];

    // HR & People Menu
    const hrMenu = [
        { view: 'hrOnboarding', label: 'HR & Onboarding', icon: Users, badge: 'NEW' },
        { view: 'payroll', label: 'Payroll Manager', icon: DollarSign },
        { view: 'hrTraining', label: 'PH HR Training', icon: BookOpen, badge: 'NEW' },
    ];

    return (
        <header className="bg-white shadow-md sticky top-0 z-50 border-b-2 border-orange-500">
            <div className="container mx-auto px-4 py-3">
                
                {/* TOP ROW: BRANDING + PRIMARY ACTIONS */}
                <div className="flex justify-between items-center gap-4 mb-3">
                    {/* BRANDING */}
                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setActiveView('dashboard')}>
                        <img src={KARNOT_LOGO_BASE_64} alt="Karnot Logo" style={{height: '40px'}}/>
                        <div>
                            <h1 className="text-xl font-black text-gray-800 uppercase tracking-tighter leading-none">
                                Karnot <span className="text-orange-600">CRM</span>
                            </h1>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                Pro Enterprise Edition
                            </p>
                        </div>
                    </div>

                    {/* PRIMARY ACTIONS */}
                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={onNewQuote} 
                            variant="primary" 
                            className="font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100 bg-orange-600 hover:bg-orange-700 h-9 px-6"
                        >
                            <Plus className="mr-1.5" size={14} /> New Quote
                        </Button>
                        
                        {userRole === 'ADMIN' && (
                            <Button
                                onClick={() => setActiveView('admin')}
                                variant={activeView === 'admin' ? 'primary' : 'secondary'}
                                className="!p-2 h-9 w-9"
                            >
                                <Settings size={16} />
                            </Button>
                        )}
                        
                        <Button 
                            onClick={onLogout} 
                            variant="secondary" 
                            className="!p-2 text-red-500 hover:bg-red-50 border-red-100 h-9 w-9"
                        >
                            <LogOut size={16} />
                        </Button>
                    </div>
                </div>

                {/* BOTTOM ROW: NAVIGATION MENU */}
                <nav className="flex flex-wrap gap-2 items-center border-t border-gray-100 pt-3">
                    
                    {/* Dashboard */}
                    <Button
                        onClick={() => setActiveView('dashboard')}
                        variant={activeView === 'dashboard' ? 'primary' : 'secondary'}
                        className="font-bold uppercase text-[10px] tracking-widest h-9"
                    >
                        <BarChart2 className="mr-1.5" size={14} /> Dashboard
                    </Button>
                    <Button
                        onClick={() => setActiveView('dailyTasks')}
                        variant={activeView === 'dailyTasks' ? 'primary' : 'secondary'}
                        className="font-bold uppercase text-[10px] tracking-widest h-9 border-orange-200 text-orange-700"
                    >
                        <CheckCircle className="mr-1.5" size={14} /> My Tasks
                    </Button>

                    <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

                    {/* MENUS */}
                    <DropdownMenu label="Sales & CRM" icon={Building} items={salesMenu} activeView={activeView} setActiveView={setActiveView} />
                    <DropdownMenu label="Field Ops" icon={MapPin} items={fieldOpsMenu} activeView={activeView} setActiveView={setActiveView} />
                    <DropdownMenu 
                        label="Export Ops" 
                        icon={Globe} 
                        items={exportOpsMenu} 
                        activeView={activeView} 
                        setActiveView={setActiveView}
                        variant="orange"
                    />
                    <DropdownMenu label="Operations" icon={Wrench} items={operationsMenu} activeView={activeView} setActiveView={setActiveView} />
                    <DropdownMenu label="Tech R&D" icon={Zap} items={techRDMenu} activeView={activeView} setActiveView={setActiveView} variant="purple" />

                    {/* Social Media & Marketing */}
                    <DropdownMenu
                        label="Social Media"
                        icon={Share2}
                        items={socialMediaMenu}
                        activeView={activeView}
                        setActiveView={setActiveView}
                        variant="orange"
                    />

                    {/* Investment Menu with PURPLE variant */}
                    <DropdownMenu 
                        label="Investment" 
                        icon={DollarSign} 
                        items={investmentMenu} 
                        activeView={activeView} 
                        setActiveView={setActiveView}
                        variant="purple"
                    />
                    
                    <DropdownMenu label="Calculators" icon={Calculator} items={calculatorsMenu} activeView={activeView} setActiveView={setActiveView} />
                    <DropdownMenu label="HR & People" icon={UserCheck} items={hrMenu} activeView={activeView} setActiveView={setActiveView} />

                    {/* Accounts (Admin + users with accounts permission) */}
                    {(userRole === 'ADMIN' || userPermissions.includes('accounts')) && (
                        <>
                            <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>
                            <Button
                                onClick={() => setActiveView('accounts')}
                                variant={activeView === 'accounts' ? 'primary' : 'secondary'}
                                className="font-bold uppercase text-[10px] tracking-widest border-orange-200 text-orange-700 bg-orange-50 h-9"
                            >
                                <Landmark className="mr-1.5" size={14} /> Accounts
                            </Button>
                        </>
                    )}

                    {/* Admin: Team Management */}
                    {userRole === 'ADMIN' && (
                        <>
                            <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>
                            <Button
                                onClick={() => setActiveView('admin')}
                                variant={activeView === 'admin' ? 'primary' : 'secondary'}
                                className="font-bold uppercase text-[10px] tracking-widest h-9"
                            >
                                <Settings className="mr-1.5" size={14} /> Admin
                            </Button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
};

// ==========================================
// 7. MAIN APPLICATION COMPONENT
// ==========================================
export default function App() {
    // --- Application State ---
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userPermissions, setUserPermissions] = useState([]);
    const [dataUid, setDataUid] = useState(null);
    const [activeView, setActiveView] = useState('dashboard');
    const [subView, setSubView] = useState('ledger');
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [loadingData, setLoadingData] = useState(true);

    // --- Core Data Collections ---
    const [opportunities, setOpportunities] = useState([]);
    const [quotes, setQuotes] = useState([]);
    const [companies, setCompanies] = useState([]); 
    const [contacts, setContacts] = useState([]);
    
    // --- Finance Data ---
    const [ledgerEntries, setLedgerEntries] = useState([]); 
    const [manpowerLogs, setManpowerLogs] = useState([]);
    const [serviceInvoices, setServiceInvoices] = useState([]);
    const [serviceContracts, setServiceContracts] = useState([]);
    
    // --- Territory Management Data ---
    const [territories, setTerritories] = useState([]);
    const [agents, setAgents] = useState([]);
    const [appointments, setAppointments] = useState([]);
    
    // --- Interaction State ---
    const [quoteToEdit, setQuoteToEdit] = useState(null);
    const [selectedOpportunity, setSelectedOpportunity] = useState(null); 

    // ------------------------------------------
    // AUTHENTICATION LISTENER
    // ------------------------------------------
    useEffect(() => {
        setLoadingAuth(true);
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                setUser(authUser);
                try {
                    const userRef = doc(db, "users", authUser.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        setUserRole(userData.role || 'STAFF');
                        setUserPermissions(userData.permissions || []);
                        // Use teamDataUid if set (staff), otherwise use own uid (admin/owner)
                        setDataUid(userData.teamDataUid || authUser.uid);
                        // Fix missing/placeholder name and sync Firebase displayName
                        if (!userData.name || userData.name === 'Unknown' || userData.name === 'unknown') {
                            const emailPrefix = authUser.email?.split('@')[0] || 'User';
                            // Convert "stuart.cox" → "Stuart Cox"
                            const fixedName = authUser.displayName || emailPrefix.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                            await updateDoc(userRef, { name: fixedName });
                        }
                        // Set Firebase Auth displayName from Firestore profile if missing
                        if (!authUser.displayName && userData.name) {
                            await updateProfile(authUser, { displayName: userData.name });
                        }
                    } else {
                        // First-ever login — set as admin with own data
                        await setDoc(userRef, {
                            name: authUser.displayName || authUser.email?.split('@')[0] || 'Admin',
                            email: authUser.email,
                            role: 'ADMIN',
                            permissions: ['all'],
                            teamDataUid: null,
                            createdAt: serverTimestamp()
                        });
                        setUserRole('ADMIN');
                        setUserPermissions(['all']);
                        setDataUid(authUser.uid);
                    }
                } catch (err) { console.error("Role Fetch Error:", err); }
            } else {
                setUser(null);
                setUserRole(null);
                setUserPermissions([]);
                setDataUid(null);
            }
            setLoadingAuth(false);
        });
        return () => unsubscribe();
    }, []);

    // ------------------------------------------
    // REAL-TIME DATA STREAM (ROBUST + SORTED)
    // ------------------------------------------
    // Create a user-like object with shared data UID for child components
    const dataUser = useMemo(() => {
        if (!user || !dataUid) return null;
        return { uid: dataUid, email: user.email, displayName: user.displayName };
    }, [user, dataUid]);

    useEffect(() => {
        if (user && dataUid) {
            setLoadingData(true);
            console.log("Starting Data Synchronization...");

            // Safety Timer
            const safetyTimer = setTimeout(() => {
                console.log("Safety Timer Triggered: Forcing App Load");
                setLoadingData(false);
            }, 4000);

            // 1. QUOTES
            const unsubQuotes = onSnapshot(
                query(collection(db, "users", dataUid, "quotes"), orderBy("lastModified", "desc")),
                (snap) => setQuotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => console.warn("Quotes Error:", err)
            );

            // 2. OPPORTUNITIES
            const unsubOpps = onSnapshot(
                query(collection(db, "users", dataUid, "opportunities"), orderBy("createdAt", "desc")),
                (snap) => setOpportunities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => console.warn("Opps Error:", err)
            );

            // 3. COMPANIES
            const unsubCompanies = onSnapshot(
                query(collection(db, "users", dataUid, "companies"), orderBy("companyName", "asc")),
                (snap) => setCompanies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => console.warn("Companies Error:", err)
            );

            // 4. CONTACTS
            const unsubContacts = onSnapshot(
                query(collection(db, "users", dataUid, "contacts"), orderBy("lastName", "asc")),
                (snap) => setContacts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => console.warn("Contacts Error:", err)
            );

            // 5. LEDGER
            const unsubLedger = onSnapshot(
                query(collection(db, "users", dataUid, "ledger"), orderBy("date", "desc")),
                (snap) => setLedgerEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => console.warn("Ledger Error:", err)
            );

            // 6. MANPOWER
            const unsubManpower = onSnapshot(
                query(collection(db, "users", dataUid, "manpower_logs"), orderBy("date", "desc")),
                (snap) => setManpowerLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => console.warn("Manpower Error:", err)
            );

            // 7. SERVICE INVOICES
            const unsubServices = onSnapshot(
                query(collection(db, "users", dataUid, "service_invoices"), orderBy("createdAt", "desc")),
                (snap) => setServiceInvoices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => { console.warn("Service Invoices Error:", err.code); setServiceInvoices([]); }
            );

            // 8. SERVICE CONTRACTS
            const unsubContracts = onSnapshot(
                query(collection(db, "users", dataUid, "service_contracts"), orderBy("createdAt", "desc")),
                (snap) => setServiceContracts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => { console.warn("Contracts Error:", err.code); setServiceContracts([]); }
            );

            // 9. TERRITORIES
            const unsubTerritories = onSnapshot(
                query(collection(db, "users", dataUid, "territories"), orderBy("name", "asc")),
                (snap) => setTerritories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => console.warn("Territories Error:", err)
            );

            // 10. AGENTS
            const unsubAgents = onSnapshot(
                query(collection(db, "users", dataUid, "agents"), orderBy("name", "asc")),
                (snap) => setAgents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => console.warn("Agents Error:", err)
            );

            // 11. APPOINTMENTS
            const unsubAppointments = onSnapshot(
                query(collection(db, "users", dataUid, "appointments"), orderBy("appointmentDate", "asc")),
                (snap) => {
                    setAppointments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    setLoadingData(false);
                    clearTimeout(safetyTimer);
                },
                (err) => {
                    console.warn("Appointments Error:", err);
                    setAppointments([]);
                    setLoadingData(false);
                    clearTimeout(safetyTimer);
                }
            );

            return () => {
                clearTimeout(safetyTimer);
                unsubQuotes(); unsubOpps(); unsubCompanies(); unsubContacts();
                unsubLedger(); unsubManpower(); unsubServices(); unsubContracts();
                unsubTerritories(); unsubAgents(); unsubAppointments();
            };
        } else {
            setLoadingData(false);
        }
    }, [user, dataUid]); 

    // ------------------------------------------
    // GLOBAL HANDLERS
    // ------------------------------------------
    const handleLogin = (email, password) => signInWithEmailAndPassword(auth, email, password).catch((e) => alert(e.message));
    const handleLogout = () => signOut(auth);
    
    const handleUpdateQuoteStatus = async (quoteId, newStatus) => {
        if (!dataUid) return;
        try {
            await updateDoc(doc(db, "users", dataUid, "quotes", quoteId), {
                status: newStatus,
                lastModified: serverTimestamp()
            });
        } catch (e) { console.error("Status Update Failed", e); }
    };

    const handleSaveQuote = async (quoteData) => {
        if (!dataUid) return;
        try {
            await setDoc(doc(db, "users", dataUid, "quotes", quoteData.id), {
                ...quoteData,
                lastModified: serverTimestamp()
            }, { merge: true });
            setActiveView('list');
        } catch (e) {
            console.error("Save Quote Failed", e);
            alert("Error saving quote.");
        }
    };

    const handleDeleteQuote = async (id) => {
        if(window.confirm("Are you sure you want to delete this quote?")) {
            await deleteDoc(doc(db, "users", dataUid, "quotes", id));
        }
    };

    const handleEditQuote = (quote) => { 
        setQuoteToEdit(quote); 
        setActiveView('calculator'); 
    };

    const handleNewQuote = () => { 
        setQuoteToEdit(null); 
        setActiveView('calculator'); 
    };

    const nextQuoteNumber = useMemo(() => {
        if (quotes.length === 0) return 2501;
        const lastQuoteNum = quotes
            .map(q => parseInt(q.id.split('-')[0].replace('QN', ''), 10))
            .filter(n => !isNaN(n))
            .reduce((m, n) => Math.max(m, n), 0);
        return lastQuoteNum > 0 ? lastQuoteNum + 1 : 2501;
    }, [quotes]); 

    // ------------------------------------------
    // LOADING & AUTH STATES
    // ------------------------------------------
    if (loadingAuth) return (
        <div className="flex items-center justify-center min-h-screen bg-white">
            <div className="text-center">
                <img src={KARNOT_LOGO_BASE_64} className="h-12 mx-auto mb-4 animate-bounce" alt="Loading"/>
                <p className="font-black uppercase text-orange-600 animate-pulse tracking-[0.2em]">Security Handshake...</p>
            </div>
        </div>
    );

    if (!user) return <LoginPage onLogin={handleLogin} />;
    if (!dataUid) return (
        <div className="flex items-center justify-center min-h-screen bg-white">
            <div className="text-center">
                <img src={KARNOT_LOGO_BASE_64} className="h-12 mx-auto mb-4 animate-bounce" alt="Loading"/>
                <p className="font-black uppercase text-orange-600 animate-pulse tracking-[0.2em]">Loading Profile...</p>
            </div>
        </div>
    );

    if (loadingData) return (
        <div className="flex items-center justify-center min-h-screen bg-white">
            <div className="text-center">
                <img src={KARNOT_LOGO_BASE_64} className="h-12 mx-auto mb-4 animate-spin" alt="Loading"/>
                <p className="font-black uppercase text-orange-600 animate-pulse tracking-[0.2em]">Loading Karnot Systems...</p>
                <p className="text-[10px] text-gray-400 mt-2">Syncing Databases...</p>
            </div>
        </div>
    );

    // ------------------------------------------
    // MAIN RENDER
    // ------------------------------------------
    return (
        <div className="bg-gray-100 min-h-screen font-sans text-gray-900">
            <Header
                activeView={activeView}
                setActiveView={setActiveView}
                quoteCount={quotes.length}
                onLogout={handleLogout}
                onNewQuote={handleNewQuote}
                userRole={userRole}
                userPermissions={userPermissions}
            />
            <main className="container mx-auto p-4 md:p-8">
                
                {/* 1. DASHBOARD */}
                {activeView === 'dashboard' && (
                    <DashboardPage 
                        quotes={quotes} 
                        user={dataUser} 
                        ledgerEntries={ledgerEntries}
                        serviceInvoices={serviceInvoices}
                        appointments={appointments}
                        agents={agents}
                        serviceContracts={serviceContracts}
                        companies={companies}
                    />
                )}
                
                {/* 1B. DAILY TASKS DASHBOARD */}
                {activeView === 'dailyTasks' && (
                    <DailyTasksDashboard
                        user={dataUser}
                        appointments={appointments}
                        opportunities={opportunities}
                        onNavigate={(view) => setActiveView(view)}
                    />
                )}

                {/* 2. SALES FUNNEL */}
                {activeView === 'funnel' && (
                    <FunnelPage 
                        opportunities={opportunities} 
                        user={dataUser} 
                        quotes={quotes} 
                        onOpenQuote={handleEditQuote} 
                        onOpen={(opp) => { setSelectedOpportunity(opp); setActiveView('opportunityDetail'); }} 
                        companies={companies} 
                        contacts={contacts}
                        appointments={appointments}
                        initialEditOpportunity={selectedOpportunity} 
                    />
                )}
                
                {activeView === 'opportunityDetail' && (
                    <OpportunityDetailPage 
                        opportunity={selectedOpportunity} 
                        quotes={quotes} 
                        onBack={() => setActiveView('funnel')} 
                        onOpenQuote={handleEditQuote} 
                        user={dataUser} 
                        companies={companies} 
                        contacts={contacts}
                        onAddQuote={() => { 
                            setQuoteToEdit({ customer: { name: selectedOpportunity.customerName }, opportunityId: selectedOpportunity.id }); 
                            setActiveView('calculator'); 
                        }}
                        onEdit={(opp) => {
                            setSelectedOpportunity(opp);
                            setActiveView('funnel');
                        }}
                    />
                )}

                {/* 4. OPERATIONS MODULES */}
                {activeView === 'installEstimator' && (
                    <InstallEstimator quotes={quotes} user={dataUser} />
                )}
                
                {activeView === 'serviceInvoice' && (
                    <ServiceInvoice companies={companies} user={dataUser} />
                )}
                
                {activeView === 'assets' && (
                    <AssetsPage companies={companies} user={dataUser} />
                )}
                
                {activeView === 'serviceContracts' && (
                    <ServiceContractsPage companies={companies} user={dataUser} />
                )}
                
                {activeView === 'maintenanceCalendar' && (
                    <MaintenanceCalendar 
                        companies={companies} 
                        user={dataUser}
                        appointments={appointments}
                        opportunities={opportunities}
                    />
                )}
                
                {activeView === 'technicianView' && (
                    <TechnicianMobileView companies={companies} user={dataUser} />
                )}

                {/* BUSINESS TASKS CALENDAR */}
                {activeView === 'businessTasks' && (
                    <BusinessTasksCalendar user={dataUser} />
                )}
                
                {/* 5. DATA MANAGEMENT */}
                {activeView === 'companies' && (
                    <CompaniesPage 
                        companies={companies} 
                        contacts={contacts} 
                        quotes={quotes} 
                        user={dataUser} 
                        onOpenQuote={handleEditQuote}
                        appointments={appointments}
                    />
                )}
                
                {activeView === 'contacts' && (
                    <ContactsPage contacts={contacts} companies={companies} user={dataUser} />
                )}
                
                {activeView === 'suppliers' && <SupplierManager user={dataUser} />}
                
                {/* 6. FIELD & TERRITORY */}
                {activeView === 'territories' && (
                    <TerritoryManagement 
                        territories={territories} 
                        agents={agents} 
                        companies={companies} 
                        user={dataUser}
                        appointments={appointments}
                    />
                )}
                
                {activeView === 'agents' && (
                    <AgentManagement agents={agents} territories={territories} user={dataUser} quotes={quotes} />
                )}
                
                {activeView === 'appointments' && (
                    <AppointmentScheduler appointments={appointments} companies={companies} agents={agents} user={dataUser} />
                )}
                
                {activeView === 'leadGenerator' && <TerritoryLeadGenerator territories={territories} user={dataUser} />}
                
                {activeView === 'smartScraper' && <SmartTextScraper user={dataUser} />}
                
                {activeView === 'boiLeads' && <BOIProjectLeads territories={territories} user={dataUser} />}
                
                {activeView === 'pezaZones' && <PEZAZones territories={territories} user={dataUser} />}
                {activeView === 'regulatory' && <RegulatoryIndustryPage user={dataUser} />}

                {/* 6B. EXPORT OPERATIONS */}
                {activeView === 'aseanExport' && (
                    <ASEANExportPage user={dataUser} />
                )}

                {activeView === 'ukExport' && (
                    <UKExportPage user={dataUser} />
                )}

                {activeView === 'exportCompanies' && (
                    <ExportCompaniesPage 
                        companies={companies}
                        contacts={contacts}
                        quotes={quotes}
                        user={dataUser}
                        onOpenQuote={handleEditQuote}
                        appointments={appointments}
                    />
                )}

                {activeView === 'exportContacts' && (
                    <ExportContactsPage 
                        contacts={contacts}
                        companies={companies}
                        user={dataUser}
                    />
                )}

                {activeView === 'exportCallCentre' && (
                    <CallCentre user={dataUser} mode="export" />
                )}

                {activeView === 'escoImport' && (
                    <ESCOImportEnrichmentTool user={dataUser} />
                )}

                {activeView === 'importExportCompliance' && (
                    <ImportExportCompliancePage user={dataUser} />
                )}

                {/* Tech R&D Hub - all views route to same component with tab control */}
                {['techHub','techRoadmap','techTasks','techNotes','techDocs','techPatents'].includes(activeView) && (
                    <TechDevelopmentHub user={dataUser} initialView={activeView} />
                )}

                {activeView === 'rsrhCalc' && (
                    <div className="max-w-7xl mx-auto">
                        <Button onClick={() => setActiveView('calculatorsHub')} variant="secondary" className="mb-4">
                            ← Back to Calculators
                        </Button>
                        <RSRHCalculator />
                    </div>
                )}

                {/* ====================================== */}
                {/* 6C. INVESTMENT MODULES                 */}
                {/* ====================================== */}
                {activeView === 'investors' && (
                    <InvestorsPage user={dataUser} contacts={contacts} />
                )}

                {activeView === 'investmentCallCentre' && (
                    <CallCentre user={dataUser} mode="investor" />
                )}

                {activeView === 'investmentPipeline' && (
                    <CEOInvestmentDashboard user={dataUser} />
                )}

                {activeView === 'fundraisingBoard' && (
                    <FundraisingTaskBoard user={dataUser} />
                )}

                {activeView === 'investmentTasks' && (
                    <BusinessTasksCalendar user={dataUser} />
                )}

                {activeView === 'investmentEmails' && (
                    <InvestorEmailManager user={dataUser} />
                )}

                {activeView === 'investorModel' && (
                    <InvestorFinancialModel />
                )}

                {activeView === 'eaasCalc' && (
                    <EaaSInvestorCalculator />
                )}

                {/* ====================================== */}
                {/* 6D. SOCIAL MEDIA & MARKETING           */}
                {/* ====================================== */}
                {activeView === 'socialPlanner' && (
                    <SocialMediaPlanner user={dataUser} initialTab="overview" key="social-overview" />
                )}

                {activeView === 'socialContent' && (
                    <SocialMediaPlanner user={dataUser} initialTab="content" key="social-content" />
                )}

                {activeView === 'socialAnalytics' && (
                    <SocialMediaPlanner user={dataUser} initialTab="analytics" key="social-analytics" />
                )}

                {activeView === 'socialCampaigns' && (
                    <SocialMediaPlanner user={dataUser} initialTab="campaigns" key="social-campaigns" />
                )}

                {activeView === 'socialTraining' && (
                    <SocialMediaPlanner user={dataUser} initialTab="training" key="social-training" />
                )}

                {activeView === 'emailMarketing' && (
                    <EmailMarketingPage user={dataUser} contacts={contacts} companies={companies} />
                )}

                {/* HR & ONBOARDING */}
                {activeView === 'hrOnboarding' && (
                    <HROnboardingPage user={dataUser} />
                )}
                {activeView === 'hrTraining' && (
                    <PhilippinesHRTraining />
                )}
                {activeView === 'payroll' && (
                    <PayrollManager user={dataUser} />
                )}

                {/* 7. QUOTING */}
                {activeView === 'calculator' && (
                    <QuoteCalculator 
                        onSaveQuote={handleSaveQuote} 
                        nextQuoteNumber={nextQuoteNumber} 
                        key={quoteToEdit ? quoteToEdit.id : 'new'} 
                        initialData={quoteToEdit} 
                        companies={companies} 
                        contacts={contacts} 
                        opportunities={opportunities} 
                    />
                )}
                
                {activeView === 'list' && (
                    <QuotesListPage 
                        quotes={quotes} 
                        onDeleteQuote={handleDeleteQuote} 
                        onEditQuote={handleEditQuote} 
                        onUpdateQuoteStatus={handleUpdateQuoteStatus}
                        opportunities={opportunities}
                    />
                )}

                {/* 8. DATASHEETS */}
                {activeView === 'datasheets' && (
                    <DatasheetLibrary />
                )}

                {/* 9. CALCULATORS */}
                {activeView === 'calculatorsHub' && <CalculatorsPage setActiveView={setActiveView} />}
                
                {activeView === 'heatPumpCalc' && (
                    <div className="max-w-5xl mx-auto">
                        <Button onClick={() => setActiveView('calculatorsHub')} variant="secondary" className="mb-4">← Back</Button>
                        <HeatPumpCalculator />
                    </div>
                )}
                
                {activeView === 'warmRoomCalc' && <WarmRoomCalc setActiveView={setActiveView} user={dataUser} />}
                {activeView === 'coldRoomCalc' && <ColdRoomCalc setActiveView={setActiveView} user={dataUser} />}
                
                {/* --- ADDED SOLVIVA VIEW HERE --- */}
                {activeView === 'solvivaCalc' && (
                    <div className="max-w-7xl mx-auto">
                        <Button onClick={() => setActiveView('calculatorsHub')} variant="secondary" className="mb-4">
                            ← Back to Calculators
                        </Button>
                        <SolvivaPartnerCalculator />
                    </div>
                )}
                
                {activeView === 'admin' && <AdminPage user={dataUser} currentUser={user} userRole={userRole} />}
                
                {/* ======================= */}
                {/* 10. ACCOUNTS HUB (ADMIN) */}
                {/* ======================= */}
                {activeView === 'accounts' && (
                    <div className="space-y-6 pb-20">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b pb-6 gap-4">
                            <div>
                                <h1 className="text-3xl font-black text-gray-800 tracking-tight uppercase leading-none mb-1">Accounts Hub</h1>
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">FYE: Dec 31 | BOI-SIPP Registered Enterprise</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button onClick={() => setSubView('ledger')} variant={subView === 'ledger' ? 'primary' : 'secondary'}>
                                    <Landmark size={14} className="mr-1" /> Disbursements
                                </Button>
                                <Button onClick={() => setSubView('payroll')} variant={subView === 'payroll' ? 'primary' : 'secondary'} className="border-purple-200 text-purple-700 bg-purple-50">
                                    <UserCheck size={14} className="mr-1" /> Payroll & Tax
                                </Button>
                                <Button onClick={() => setSubView('manpower')} variant={subView === 'manpower' ? 'primary' : 'secondary'}>
                                    <Wrench size={14} className="mr-1" /> Manpower (Project)
                                </Button>
                                <Button onClick={() => setSubView('services')} variant={subView === 'services' ? 'primary' : 'secondary'} className="border-orange-200 text-orange-700 bg-orange-50">
                                    <Wrench size={14} className="mr-1" /> Service Invoices
                                </Button>
                                <Button onClick={() => setSubView('projectOps')} variant={subView === 'projectOps' ? 'primary' : 'secondary'}>
                                    <Briefcase size={14} className="mr-1" /> Project ROI
                                </Button>
                                <Button onClick={() => setSubView('birBooks')} variant={subView === 'birBooks' ? 'primary' : 'secondary'} className="border-orange-500 text-orange-700">
                                    <FileText size={14} className="mr-1" /> BIR Books
                                </Button>
                                <Button onClick={() => setSubView('bankRecon')} variant={subView === 'bankRecon' ? 'primary' : 'secondary'} className="border-purple-200 text-purple-700">
                                    <Landmark size={14} className="mr-1" /> Bank Recon
                                </Button>
                                <Button onClick={() => setSubView('management')} variant={subView === 'management' ? 'primary' : 'secondary'} className="border-indigo-200 text-indigo-700 bg-indigo-50">
                                    <BarChart2 size={14} className="mr-1" /> Mgmt. Accounts
                                </Button>
                                <Button onClick={() => setSubView('profServices')} variant={subView === 'profServices' ? 'primary' : 'secondary'} className="border-slate-200 text-slate-700 bg-slate-50">
                                    <Scale size={14} className="mr-1" /> Lawyer & Accountant
                                </Button>
                            </div>
                        </div>

                        {subView === 'ledger' && (
                            <FinancialEntryLogger 
                                companies={companies} 
                                quotes={quotes} 
                                opportunities={opportunities}
                            />
                        )}
                        
                        {subView === 'payroll' && (
                            <PayrollManager user={dataUser} />
                        )}
                        
                        {subView === 'manpower' && (
                            <ManpowerLogger quotes={quotes} />
                        )}
                        
                        {subView === 'services' && (
                            <ServiceInvoice companies={companies} user={dataUser} />
                        )}
                        
                        {subView === 'projectOps' && (
                            <ProjectOperations 
                                quotes={quotes} 
                                manpowerLogs={manpowerLogs} 
                                ledgerEntries={ledgerEntries} 
                            />
                        )}
                        
                        {subView === 'birBooks' && (
                            <BIRBookPrep 
                                quotes={quotes} 
                                ledgerEntries={ledgerEntries} 
                            />
                        )}
                        
                        {subView === 'bankRecon' && (
                            <BankReconciliation 
                                user={dataUser} 
                                quotes={quotes} 
                                ledgerEntries={ledgerEntries} 
                            />
                        )}

                        {subView === 'management' && (
                            <ManagementAccounts
                                user={dataUser}
                                quotes={quotes}
                                ledgerEntries={ledgerEntries}
                                opportunities={opportunities}
                                serviceInvoices={serviceInvoices}
                            />
                        )}

                        {subView === 'profServices' && (
                            <ProfessionalServices user={dataUser} />
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
