import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input } from '../data/constants.jsx';
import {
    Mail, Send, Users, BarChart2, Plus, Trash2, RefreshCw, CheckCircle, AlertCircle,
    Eye, MousePointer, XCircle, Clock, Search, Filter, FileText, Copy, ArrowRight,
    Zap, List, Layout, ExternalLink
} from 'lucide-react';

// Brevo API helper — calls via Netlify function proxy
const brevoCall = async (endpoint, method = 'GET', data = null) => {
    const res = await fetch('/.netlify/functions/brevo-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, method, data })
    });
    const json = await res.json();
    if (res.status >= 400) throw new Error(json.message || json.error || `Brevo API error ${res.status}`);
    return json;
};

const StatCard = ({ icon: Icon, label, value, color = 'orange', sub }) => (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
            <Icon size={16} className={`text-${color}-500`} />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
        </div>
        <p className={`text-2xl font-black text-${color}-600`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
);

const TabBtn = ({ active, onClick, icon: Icon, label, badge }) => (
    <button onClick={onClick}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
            active ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
        }`}>
        <Icon size={14} /> {label}
        {badge && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ${active ? 'bg-white/20' : 'bg-orange-100 text-orange-600'}`}>{badge}</span>}
    </button>
);

// ── Email Templates ──────────────────────────────────
const EMAIL_TEMPLATES = {
    investment_teaser: {
        label: 'Investment Teaser',
        desc: 'Full branded Karnot template with stats, highlights, and CTA to iheat.ph. Best for first contact.',
        icon: Zap, color: 'orange',
        tags: ['BRANDED', 'RESPONSIVE', 'PERSONALIZED'],
        subject: 'Opportunity: Clean Energy Investment in the Philippines',
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body{font-family:Arial,sans-serif;margin:0;padding:0;background:#f5f5f5}.container{max-width:600px;margin:0 auto;background:#fff}.header{background:#ea580c;padding:30px;text-align:center}.header h1{color:#fff;margin:0;font-size:24px}.header p{color:#fed7aa;margin:5px 0 0;font-size:14px}.body{padding:30px}.body h2{color:#1f2937;font-size:20px;margin:0 0 15px}.body p{color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 12px}.highlight{background:#fff7ed;border-left:4px solid #ea580c;padding:15px;margin:20px 0;border-radius:0 8px 8px 0}.highlight strong{color:#ea580c}.cta{display:block;background:#ea580c;color:#fff!important;text-align:center;padding:14px 30px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin:25px 0}.footer{background:#1f2937;padding:20px;text-align:center;color:#9ca3af;font-size:12px}.footer a{color:#ea580c}</style></head>
<body><div class="container">
<div class="header"><h1>KARNOT ENERGY SOLUTIONS</h1><p>Clean Energy Investment Opportunity</p></div>
<div class="body">
<h2>Dear {{ contact.FIRSTNAME }},</h2>
<p>I'm reaching out because we have an exciting clean energy investment opportunity in the Philippines that I believe aligns with your interests.</p>
<div class="highlight"><strong>The Philippines Opportunity:</strong> With electricity costs at P14/kWh — among the highest in Asia — there's a massive market for energy-efficient solutions. Karnot Energy Solutions is at the forefront with our CO2 and R290 heat pump technology delivering 75%+ energy savings.</div>
<p>We're raising investment in units of <strong>$2,500 - $5,000</strong> to scale our operations across Luzon and into the broader ASEAN market.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0"><tr>
<td width="30%" style="background:#f9fafb;border-radius:8px;padding:15px;text-align:center"><div style="font-size:24px;font-weight:900;color:#ea580c">75%+</div><div style="font-size:11px;color:#6b7280;text-transform:uppercase">Energy Savings</div></td><td width="5%"></td>
<td width="30%" style="background:#f9fafb;border-radius:8px;padding:15px;text-align:center"><div style="font-size:24px;font-weight:900;color:#ea580c">P14</div><div style="font-size:11px;color:#6b7280;text-transform:uppercase">Cost per kWh</div></td><td width="5%"></td>
<td width="30%" style="background:#f9fafb;border-radius:8px;padding:15px;text-align:center"><div style="font-size:24px;font-weight:900;color:#ea580c">3-4hr</div><div style="font-size:11px;color:#6b7280;text-transform:uppercase">iSTOR Coast Time</div></td>
</tr></table>
<p>Our iSTOR battery technology provides 3-4 hours of "coast time," creating a virtual power plant model that adds recurring revenue on top of the hardware sales.</p>
<a href="https://iheat.ph" class="cta">Request Data Room Access →</a>
<p>I'd welcome the opportunity to share our investor deck and discuss how this fits your portfolio.</p>
<p>Best regards,<br><strong>Stuart Cox</strong><br>CEO, Karnot Energy Solutions<br>stuart.cox@karnot.com</p>
</div>
<div class="footer"><p>Karnot Energy Solutions · Philippines · <a href="https://iheat.ph">iheat.ph</a></p>
<p style="margin-top:10px;font-size:10px">You're receiving this because you expressed interest in clean energy investments.<br><a href="{{ unsubscribe }}">Unsubscribe</a></p></div>
</div></body></html>`
    },
    plain_professional: {
        label: 'Plain Professional',
        desc: 'Clean, text-focused email that looks personal. Best for bypassing spam filters with financial terms.',
        icon: FileText, color: 'gray',
        tags: ['SPAM-SAFE', 'MINIMAL', 'PERSONALIZED'],
        subject: 'Clean Energy Investment — Philippines Market',
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body{font-family:Arial,sans-serif;margin:0;padding:0;background:#f5f5f5}.container{max-width:600px;margin:0 auto;background:#fff;padding:40px}p{color:#374151;font-size:14px;line-height:1.7;margin:0 0 14px}.sig{border-top:2px solid #ea580c;padding-top:15px;margin-top:25px}.sig strong{color:#ea580c}.unsub{text-align:center;margin-top:30px;font-size:11px;color:#9ca3af}.unsub a{color:#6b7280}</style></head>
<body><div class="container">
<p>Dear {{ contact.FIRSTNAME }},</p>
<p>I hope this email finds you well. I'm Stuart Cox, CEO of Karnot Energy Solutions, and I'm reaching out about an investment opportunity in clean energy technology for the Philippine market.</p>
<p>The Philippines has some of the highest electricity costs in Asia at P14/kWh, creating significant demand for energy-efficient solutions. Our CO2 and R290 heat pump systems deliver 75%+ energy savings to commercial and industrial clients.</p>
<p>We're currently offering investment units in the range of $2,500 - $5,000, making this an accessible entry point into the fast-growing ASEAN clean energy sector.</p>
<p>Key highlights:</p>
<p>• 75%+ energy savings vs conventional systems<br>• iSTOR battery technology with 3-4 hour coast time<br>• Virtual power plant recurring revenue model<br>• BOI-registered enterprise (Board of Investments, Philippines)</p>
<p>If this aligns with your investment interests, I'd welcome the opportunity to share our data room and investor deck.</p>
<p>You can learn more at <a href="https://iheat.ph" style="color:#ea580c">iheat.ph</a></p>
<div class="sig"><strong>Stuart Cox</strong><br>CEO, Karnot Energy Solutions<br>stuart.cox@karnot.com</div>
<div class="unsub"><a href="{{ unsubscribe }}">Unsubscribe from future emails</a></div>
</div></body></html>`
    },
    follow_up: {
        label: 'Follow-Up',
        desc: 'Short follow-up for contacts who didn\'t respond to the first teaser. Friendly, low-pressure.',
        icon: ArrowRight, color: 'blue',
        tags: ['FOLLOW-UP', 'SHORT', 'PERSONALIZED'],
        subject: 'Following up: Karnot Energy Solutions Investment',
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body{font-family:Arial,sans-serif;margin:0;padding:0;background:#f5f5f5}.container{max-width:600px;margin:0 auto;background:#fff}.header{background:#ea580c;padding:20px 30px}.header h1{color:#fff;margin:0;font-size:18px}.body{padding:30px}.body p{color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 12px}.cta{display:block;background:#ea580c;color:#fff!important;text-align:center;padding:14px 30px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin:25px 0}.footer{background:#1f2937;padding:20px;text-align:center;color:#9ca3af;font-size:12px}.footer a{color:#ea580c}</style></head>
<body><div class="container">
<div class="header"><h1>KARNOT ENERGY SOLUTIONS</h1></div>
<div class="body">
<p>Hi {{ contact.FIRSTNAME }},</p>
<p>I wanted to follow up on my earlier email about our clean energy investment opportunity in the Philippines.</p>
<p>Since then, we've had strong interest from investors who see the potential in our CO2 heat pump technology and the Philippine energy market.</p>
<p>With investment units starting at just <strong>$2,500</strong>, this is an accessible way to participate in the ASEAN clean energy transition.</p>
<p>Would you be open to a quick 15-minute call this week? I'd love to walk you through our latest numbers.</p>
<a href="https://iheat.ph" class="cta">View Our Latest Updates →</a>
<p>Best,<br><strong>Stuart Cox</strong><br>CEO, Karnot Energy Solutions</p>
</div>
<div class="footer"><p>Karnot Energy Solutions · <a href="https://iheat.ph">iheat.ph</a></p>
<p style="margin-top:10px;font-size:10px"><a href="{{ unsubscribe }}">Unsubscribe</a></p></div>
</div></body></html>`
    }
};

// ═════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════
export default function EmailMarketingPage({ user, contacts = [] }) {
    const [activeTab, setActiveTab] = useState('campaigns');
    const [brevoStatus, setBrevoStatus] = useState('checking');
    const [brevoAccount, setBrevoAccount] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Campaign Builder
    const [showBuilder, setShowBuilder] = useState(false);
    const [campaignForm, setCampaignForm] = useState({
        name: '', subject: '', senderName: 'Karnot Energy Solutions', senderEmail: '',
        htmlContent: '', listId: null, tag: ''
    });

    // Contact Sync
    const [syncLoading, setSyncLoading] = useState(false);
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [contactSearch, setContactSearch] = useState('');
    const [showContactPicker, setShowContactPicker] = useState(false);
    const [targetListId, setTargetListId] = useState(null);
    const [newListName, setNewListName] = useState('');

    // Campaign Stats
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [campaignStats, setCampaignStats] = useState(null);

    useEffect(() => { checkBrevoConnection(); }, []);

    const checkBrevoConnection = async () => {
        setBrevoStatus('checking');
        try {
            const account = await brevoCall('/account');
            setBrevoAccount(account);
            setBrevoStatus('connected');
            await Promise.all([loadCampaigns(), loadLists()]);
        } catch (err) {
            console.error('Brevo connection error:', err);
            setBrevoStatus('error');
        }
    };

    const loadCampaigns = async () => {
        try {
            const result = await brevoCall('/emailCampaigns', 'GET', { limit: 50, offset: 0, sort: 'desc' });
            setCampaigns(result.campaigns || []);
        } catch (err) { console.error('Load campaigns error:', err); }
    };

    const loadLists = async () => {
        try {
            const result = await brevoCall('/contacts/lists', 'GET', { limit: 50, offset: 0 });
            setLists(result.lists || []);
        } catch (err) { console.error('Load lists error:', err); }
    };

    const contactsWithEmail = useMemo(() => contacts.filter(c => c.email), [contacts]);

    const filteredContacts = useMemo(() => {
        const base = contacts.filter(c => c.email);
        if (!contactSearch) return base;
        const q = contactSearch.toLowerCase();
        return base.filter(c =>
            (c.firstName || '').toLowerCase().includes(q) ||
            (c.lastName || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.companyName || '').toLowerCase().includes(q)
        );
    }, [contacts, contactSearch]);

    const handleCreateList = async () => {
        if (!newListName.trim()) return;
        setLoading(true); setError('');
        try {
            const result = await brevoCall('/contacts/lists', 'POST', { name: newListName.trim(), folderId: 1 });
            setNewListName('');
            await loadLists();
            setTargetListId(result.id);
            setSuccess(`List "${newListName}" created!`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) { setError(err.message); }
        setLoading(false);
    };

    const handleSyncContacts = async () => {
        if (!targetListId) { setError('Please select or create a list first.'); return; }
        const toSync = selectedContacts.length > 0
            ? contacts.filter(c => selectedContacts.includes(c.id) && c.email)
            : contactsWithEmail;
        if (toSync.length === 0) { setError('No contacts with email addresses to sync.'); return; }

        setSyncLoading(true); setError('');
        let synced = 0, failed = 0;

        for (let i = 0; i < toSync.length; i += 50) {
            const batch = toSync.slice(i, i + 50);
            try {
                await brevoCall('/contacts/import', 'POST', {
                    jsonBody: batch.map(c => ({
                        email: c.email,
                        attributes: {
                            FIRSTNAME: c.firstName || '',
                            LASTNAME: c.lastName || '',
                            COMPANY: c.companyName || '',
                            JOBTITLE: c.jobTitle || '',
                            PHONE: c.phone || ''
                        },
                        listIds: [targetListId],
                        updateEnabled: true
                    })),
                    listIds: [targetListId],
                    updateEnabled: true
                });
                synced += batch.length;
            } catch (err) {
                console.error('Sync batch error:', err);
                failed += batch.length;
            }
        }

        setSyncLoading(false);
        setSelectedContacts([]);
        setSuccess(`Synced ${synced} contacts to Brevo${failed > 0 ? ` (${failed} failed)` : ''}!`);
        setTimeout(() => setSuccess(''), 5000);
        await loadLists();
    };

    const handleCreateCampaign = async () => {
        const { name, subject, senderName, senderEmail, htmlContent, listId } = campaignForm;
        if (!name || !subject || !senderEmail || !htmlContent || !listId) {
            setError('Please fill in all required fields: name, subject, sender email, content, and recipient list.');
            return;
        }
        setLoading(true); setError('');
        try {
            await brevoCall('/emailCampaigns', 'POST', {
                name, subject,
                sender: { name: senderName, email: senderEmail },
                htmlContent,
                recipients: { listIds: [parseInt(listId)] },
                ...(campaignForm.tag ? { tag: campaignForm.tag } : {})
            });
            setShowBuilder(false);
            setCampaignForm({ name: '', subject: '', senderName: 'Karnot Energy Solutions', senderEmail: '', htmlContent: '', listId: null, tag: '' });
            await loadCampaigns();
            setSuccess('Campaign created as draft! You can preview and send it.');
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) { setError(err.message); }
        setLoading(false);
    };

    const handleSendCampaign = async (campaignId) => {
        if (!window.confirm('Are you sure you want to send this campaign NOW? This cannot be undone.')) return;
        setLoading(true); setError('');
        try {
            await brevoCall(`/emailCampaigns/${campaignId}/sendNow`, 'POST');
            setSuccess('Campaign is being sent!');
            setTimeout(() => setSuccess(''), 5000);
            await loadCampaigns();
        } catch (err) { setError(err.message); }
        setLoading(false);
    };

    const handleViewStats = async (campaign) => {
        setSelectedCampaign(campaign);
        try {
            const stats = await brevoCall(`/emailCampaigns/${campaign.id}`, 'GET');
            setCampaignStats(stats);
        } catch (err) {
            setCampaignStats(campaign);
        }
    };

    const applyTemplate = (key) => {
        const t = EMAIL_TEMPLATES[key];
        if (t) setCampaignForm(prev => ({ ...prev, subject: t.subject, htmlContent: t.html }));
    };

    // ── NOT CONNECTED ────────────────────────────────
    if (brevoStatus === 'error') {
        return (
            <div className="max-w-3xl mx-auto p-6">
                <Card className="text-center py-12">
                    <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Brevo Not Connected</h2>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">Add your Brevo API key as an environment variable in Netlify to enable email marketing.</p>
                    <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto mb-6">
                        <p className="text-xs font-bold text-gray-600 uppercase mb-2">Setup Steps:</p>
                        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                            <li>Go to <strong>Netlify Dashboard → Site Settings → Environment Variables</strong></li>
                            <li>Add: <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">BREVO_API_KEY</code></li>
                            <li>Value: your Brevo API key (starts with <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">xkeysib-</code>)</li>
                            <li><strong>Redeploy</strong> your site (Deploys → Trigger deploy)</li>
                        </ol>
                    </div>
                    <Button onClick={checkBrevoConnection} variant="primary">
                        <RefreshCw size={14} className="mr-1.5" /> Retry Connection
                    </Button>
                </Card>
            </div>
        );
    }

    if (brevoStatus === 'checking') {
        return (
            <div className="max-w-3xl mx-auto p-6">
                <Card className="text-center py-12">
                    <RefreshCw size={32} className="text-orange-400 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-500">Connecting to Brevo...</p>
                </Card>
            </div>
        );
    }

    // ── MAIN RENDER ──────────────────────────────────
    return (
        <div className="max-w-7xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                        <Mail className="text-orange-500" size={24} /> Email Marketing
                    </h1>
                    <p className="text-sm text-gray-500">
                        Connected as <strong className="text-green-600">{brevoAccount?.email || 'Unknown'}</strong>
                        {brevoAccount?.plan?.[0] && <span className="ml-2 text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">{brevoAccount.plan[0].type}</span>}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => { loadCampaigns(); loadLists(); }} variant="secondary" className="text-xs">
                        <RefreshCw size={12} className="mr-1" /> Refresh
                    </Button>
                    <Button onClick={() => { setShowBuilder(true); setActiveTab('campaigns'); }} variant="primary" className="text-xs">
                        <Plus size={12} className="mr-1" /> New Campaign
                    </Button>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle size={16} /> {error}
                    <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><XCircle size={16} /></button>
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700 text-sm">
                    <CheckCircle size={16} /> {success}
                    <button onClick={() => setSuccess('')} className="ml-auto text-green-400 hover:text-green-600"><XCircle size={16} /></button>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Users} label="CRM Contacts" value={contactsWithEmail.length} sub={`${contacts.length - contactsWithEmail.length} missing email`} />
                <StatCard icon={List} label="Brevo Lists" value={lists.length} color="blue" />
                <StatCard icon={Send} label="Campaigns" value={campaigns.length} color="purple" />
                <StatCard icon={BarChart2} label="Credits" value={brevoAccount?.plan?.[0]?.credits ?? '—'} color="green" sub={brevoAccount?.plan?.[0]?.type || ''} />
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
                <TabBtn active={activeTab === 'campaigns'} onClick={() => setActiveTab('campaigns')} icon={Send} label="Campaigns" badge={campaigns.length || null} />
                <TabBtn active={activeTab === 'contacts'} onClick={() => setActiveTab('contacts')} icon={Users} label="Sync Contacts" badge={contactsWithEmail.length || null} />
                <TabBtn active={activeTab === 'lists'} onClick={() => setActiveTab('lists')} icon={List} label="Lists" badge={lists.length || null} />
                <TabBtn active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} icon={Layout} label="Templates" />
            </div>

            {/* ═══════ CAMPAIGNS TAB ═══════ */}
            {activeTab === 'campaigns' && (
                <div className="space-y-4">
                    {showBuilder && (
                        <Card className="border-2 border-orange-200 bg-orange-50/20">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Plus size={16} className="text-orange-500" /> Create New Campaign</h3>
                                <button onClick={() => setShowBuilder(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={18} /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Campaign Name *</label>
                                    <Input value={campaignForm.name} onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })} placeholder="e.g. Investment Teaser — March 2026" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Subject Line *</label>
                                    <Input value={campaignForm.subject} onChange={e => setCampaignForm({ ...campaignForm, subject: e.target.value })} placeholder="e.g. Clean Energy Investment Opportunity" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Sender Name</label>
                                    <Input value={campaignForm.senderName} onChange={e => setCampaignForm({ ...campaignForm, senderName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Sender Email * <span className="normal-case font-normal text-gray-400">(must be verified in Brevo)</span></label>
                                    <Input type="email" value={campaignForm.senderEmail} onChange={e => setCampaignForm({ ...campaignForm, senderEmail: e.target.value })} placeholder="stuart.cox@karnot.com" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Recipient List *</label>
                                    <select value={campaignForm.listId || ''} onChange={e => setCampaignForm({ ...campaignForm, listId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                                        <option value="">Select a list...</option>
                                        {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.totalSubscribers || 0} contacts)</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Tag <span className="normal-case font-normal text-gray-400">(optional)</span></label>
                                    <Input value={campaignForm.tag} onChange={e => setCampaignForm({ ...campaignForm, tag: e.target.value })} placeholder="e.g. investment, Q1-2026" />
                                </div>
                            </div>

                            {/* Quick Templates */}
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Quick Template</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(EMAIL_TEMPLATES).map(([key, t]) => (
                                        <button key={key} onClick={() => applyTemplate(key)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border border-${t.color}-200 bg-${t.color}-50 text-${t.color}-700 hover:bg-${t.color}-100 transition-colors`}>
                                            <t.icon size={12} className="inline mr-1" /> {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                                    Email HTML Content * <span className="normal-case font-normal text-gray-400 ml-1">Use {'{{ contact.FIRSTNAME }}'} for personalization</span>
                                </label>
                                <textarea value={campaignForm.htmlContent} onChange={e => setCampaignForm({ ...campaignForm, htmlContent: e.target.value })}
                                    rows={12} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
                                    placeholder="Paste your HTML email content here, or use a Quick Template above..." />
                            </div>

                            <div className="flex gap-2">
                                <Button onClick={handleCreateCampaign} variant="primary" disabled={loading}>{loading ? 'Creating...' : 'Create Campaign'}</Button>
                                <Button onClick={() => setShowBuilder(false)} variant="secondary">Cancel</Button>
                            </div>
                        </Card>
                    )}

                    {/* Campaign List */}
                    {campaigns.length === 0 && !showBuilder ? (
                        <Card className="text-center py-12">
                            <Send size={40} className="text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-400 font-bold">No campaigns yet</p>
                            <p className="text-gray-400 text-sm mb-4">Create your first email campaign to start reaching contacts.</p>
                            <Button onClick={() => setShowBuilder(true)} variant="primary"><Plus size={14} className="mr-1" /> Create Campaign</Button>
                        </Card>
                    ) : (
                        <div className="grid gap-3">
                            {campaigns.map(c => (
                                <Card key={c.id} className="hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-gray-800">{c.name}</h4>
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                    c.status === 'sent' ? 'bg-green-100 text-green-700' :
                                                    c.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                                                    c.status === 'queued' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                                }`}>{c.status}</span>
                                            </div>
                                            <p className="text-sm text-gray-500">Subject: {c.subject}</p>
                                            {c.statistics && (
                                                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1"><Send size={11} /> {c.statistics.delivered || 0} delivered</span>
                                                    <span className="flex items-center gap-1"><Eye size={11} /> {c.statistics.uniqueViews || 0} opened</span>
                                                    <span className="flex items-center gap-1"><MousePointer size={11} /> {c.statistics.uniqueClicks || 0} clicked</span>
                                                    <span className="flex items-center gap-1"><XCircle size={11} /> {c.statistics.hardBounces || 0} bounced</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            {c.status === 'draft' && (
                                                <Button onClick={() => handleSendCampaign(c.id)} variant="primary" className="text-xs">
                                                    <Send size={12} className="mr-1" /> Send Now
                                                </Button>
                                            )}
                                            <Button onClick={() => handleViewStats(c)} variant="secondary" className="text-xs">
                                                <BarChart2 size={12} className="mr-1" /> Stats
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Stats Panel */}
                    {selectedCampaign && campaignStats && (
                        <Card className="border-2 border-blue-200 bg-blue-50/20">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-800">Analytics: {selectedCampaign.name}</h3>
                                <button onClick={() => { setSelectedCampaign(null); setCampaignStats(null); }} className="text-gray-400 hover:text-gray-600"><XCircle size={18} /></button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <StatCard icon={Send} label="Delivered" value={campaignStats.statistics?.delivered || 0} color="green" />
                                <StatCard icon={Eye} label="Opened" value={campaignStats.statistics?.uniqueViews || 0} color="blue"
                                    sub={campaignStats.statistics?.delivered ? `${((campaignStats.statistics.uniqueViews / campaignStats.statistics.delivered) * 100).toFixed(1)}%` : ''} />
                                <StatCard icon={MousePointer} label="Clicked" value={campaignStats.statistics?.uniqueClicks || 0} color="purple"
                                    sub={campaignStats.statistics?.delivered ? `${((campaignStats.statistics.uniqueClicks / campaignStats.statistics.delivered) * 100).toFixed(1)}%` : ''} />
                                <StatCard icon={XCircle} label="Bounced" value={(campaignStats.statistics?.hardBounces || 0) + (campaignStats.statistics?.softBounces || 0)} color="orange" />
                                <StatCard icon={AlertCircle} label="Unsubscribed" value={campaignStats.statistics?.unsubscriptions || 0} color="orange" />
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* ═══════ SYNC CONTACTS TAB ═══════ */}
            {activeTab === 'contacts' && (
                <div className="space-y-4">
                    <Card>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Users size={16} className="text-orange-500" /> Sync CRM Contacts to Brevo
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">Push your Sales &amp; CRM contacts to a Brevo list for email campaigns. Attributes (name, company, job title) are automatically mapped.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Target List</label>
                                <select value={targetListId || ''} onChange={e => setTargetListId(parseInt(e.target.value) || null)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                                    <option value="">Select a list...</option>
                                    {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.totalSubscribers || 0} contacts)</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Or Create New List</label>
                                <div className="flex gap-2">
                                    <Input value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="e.g. Karnot CRM Contacts" />
                                    <Button onClick={handleCreateList} variant="secondary" disabled={!newListName.trim() || loading} className="text-xs whitespace-nowrap">
                                        <Plus size={12} className="mr-1" /> Create
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Contact Selection */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                                    Contacts to Sync <span className="font-normal text-gray-400 normal-case ml-2">
                                        {selectedContacts.length > 0 ? `${selectedContacts.length} selected` : `All ${contactsWithEmail.length} with email`}
                                    </span>
                                </label>
                                <button onClick={() => setShowContactPicker(!showContactPicker)} className="text-xs text-orange-600 hover:text-orange-800 font-bold flex items-center gap-1">
                                    <Filter size={12} /> {showContactPicker ? 'Hide Picker' : 'Select Specific'}
                                </button>
                            </div>

                            {showContactPicker && (
                                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-72 overflow-y-auto">
                                    <div className="flex gap-2 mb-3 sticky top-0 bg-gray-50 pb-2">
                                        <div className="relative flex-1">
                                            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                            <input value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                                                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm" placeholder="Search contacts..." />
                                        </div>
                                        <button onClick={() => setSelectedContacts(selectedContacts.length === contactsWithEmail.length ? [] : contactsWithEmail.map(c => c.id))}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-bold whitespace-nowrap px-3">
                                            {selectedContacts.length === contactsWithEmail.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>
                                    {filteredContacts.map(c => (
                                        <label key={c.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer text-sm">
                                            <input type="checkbox" checked={selectedContacts.includes(c.id)}
                                                onChange={e => setSelectedContacts(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id))}
                                                className="rounded border-gray-300" />
                                            <span className="font-bold text-gray-700">{c.firstName} {c.lastName}</span>
                                            <span className="text-gray-400">·</span>
                                            <span className="text-gray-500 truncate">{c.email}</span>
                                            {c.companyName && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded ml-auto flex-shrink-0">{c.companyName}</span>}
                                        </label>
                                    ))}
                                    {filteredContacts.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No contacts found</p>}
                                </div>
                            )}
                        </div>

                        <Button onClick={handleSyncContacts} variant="primary" disabled={syncLoading || !targetListId}>
                            {syncLoading
                                ? <><RefreshCw size={14} className="mr-1.5 animate-spin" /> Syncing...</>
                                : <><Send size={14} className="mr-1.5" /> Sync {selectedContacts.length > 0 ? `${selectedContacts.length} Contacts` : `All ${contactsWithEmail.length} Contacts`} to Brevo</>
                            }
                        </Button>
                    </Card>
                </div>
            )}

            {/* ═══════ LISTS TAB ═══════ */}
            {activeTab === 'lists' && (
                <div className="space-y-4">
                    <Card>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><List size={16} className="text-blue-500" /> Brevo Contact Lists</h3>
                        <div className="flex gap-2 mb-4">
                            <Input value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="New list name" />
                            <Button onClick={handleCreateList} variant="primary" disabled={!newListName.trim() || loading} className="text-xs whitespace-nowrap">
                                <Plus size={12} className="mr-1" /> Create List
                            </Button>
                        </div>
                        <div className="grid gap-2">
                            {lists.length === 0
                                ? <p className="text-center text-gray-400 py-4">No lists found. Create your first list above.</p>
                                : lists.map(l => (
                                    <div key={l.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div>
                                            <p className="font-bold text-gray-700 text-sm">{l.name}</p>
                                            <p className="text-xs text-gray-400">ID: {l.id}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-blue-600">{l.totalSubscribers || 0} contacts</span>
                                            <span className="text-xs text-gray-400">{l.totalBlacklisted || 0} blocked</span>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </Card>
                </div>
            )}

            {/* ═══════ TEMPLATES TAB ═══════ */}
            {activeTab === 'templates' && (
                <div className="space-y-4">
                    <Card>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Layout size={16} className="text-purple-500" /> Email Templates</h3>
                        <p className="text-sm text-gray-500 mb-4">Pre-built templates for your investment outreach. Click to use in a new campaign.</p>
                        <div className="grid gap-4 md:grid-cols-3">
                            {Object.entries(EMAIL_TEMPLATES).map(([key, t]) => (
                                <div key={key}
                                    className={`border-2 border-${t.color}-200 rounded-xl p-4 bg-${t.color}-50/30 hover:shadow-md transition-shadow cursor-pointer`}
                                    onClick={() => { applyTemplate(key); setShowBuilder(true); setActiveTab('campaigns'); }}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <t.icon size={18} className={`text-${t.color}-500`} />
                                        <h4 className="font-bold text-gray-800">{t.label}</h4>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">{t.desc}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {t.tags.map(tag => (
                                            <span key={tag} className="text-[9px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Personalization Guide */}
                    <Card>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Zap size={16} className="text-yellow-500" /> Personalization Variables</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {[
                                { v: '{{ contact.FIRSTNAME }}', d: 'First name' },
                                { v: '{{ contact.LASTNAME }}', d: 'Last name' },
                                { v: '{{ contact.COMPANY }}', d: 'Company name' },
                                { v: '{{ contact.JOBTITLE }}', d: 'Job title' },
                                { v: '{{ contact.PHONE }}', d: 'Phone number' },
                                { v: '{{ unsubscribe }}', d: 'Unsubscribe link (required)' },
                            ].map(item => (
                                <div key={item.v} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                                    <div>
                                        <code className="text-xs font-mono text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{item.v}</code>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{item.d}</p>
                                    </div>
                                    <button onClick={() => navigator.clipboard.writeText(item.v)} className="text-gray-300 hover:text-orange-500 p-1" title="Copy"><Copy size={12} /></button>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-xs text-yellow-800">
                                <strong>Pro Tip:</strong> Always include <code className="bg-yellow-100 px-1 rounded">{'{{ unsubscribe }}'}</code> in your emails — it's legally required and helps deliverability. The "Plain Professional" template is best for financial emails to avoid spam filters.
                            </p>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
