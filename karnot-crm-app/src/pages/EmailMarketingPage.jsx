import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Button, Input } from '../data/constants.jsx';
import {
    Mail, Send, Users, BarChart2, Plus, Trash2, RefreshCw, CheckCircle, AlertCircle,
    Eye, MousePointer, XCircle, Clock, Search, Filter, FileText, Copy, ArrowRight,
    Zap, List, Layout, ExternalLink, Target, Play, Calendar, Upload, Download, Edit3, Save, X, Code
} from 'lucide-react';
import { CAMPAIGN_SEQUENCES, ENERGY_MANAGER_SEQUENCE, ESCO_PARTNER_SEQUENCE } from '../data/campaignTemplates.js';
import emailTemplateData from '../data/emailTemplates.json';

// Map icon name strings from JSON → Lucide React components
const ICON_MAP = { Zap, FileText, ArrowRight, Target, Mail, Send, Users, Calendar, Play };
const EMAIL_TEMPLATES = Object.fromEntries(
    Object.entries(emailTemplateData.templates).map(([key, t]) => [
        key,
        { ...t, icon: ICON_MAP[t.icon] || FileText }
    ])
);

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

// ═════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════
export default function EmailMarketingPage({ user, contacts = [], companies = [] }) {
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

    // Contact Filters (for targeted sync & export)
    const [filterType, setFilterType] = useState('');       // company type: ESCO, MCS, VIP, etc.
    const [filterRegion, setFilterRegion] = useState('');    // UK, MALAYSIA, THAILAND, etc.
    const [filterSource, setFilterSource] = useState('');    // UK Trawler, Google Places, etc.

    // Build a company lookup map for fast access
    const companyMap = useMemo(() => {
        const map = {};
        companies.forEach(c => { map[c.id] = c; if (c.companyName) map[c.companyName.toLowerCase()] = c; });
        return map;
    }, [companies]);

    // Get unique filter options from companies data
    const filterOptions = useMemo(() => {
        const types = new Set();
        const regions = new Set();
        const sources = new Set();
        companies.forEach(c => {
            if (c.type) types.add(c.type);
            if (c.installerType) types.add(c.installerType);
            if (c.industry) types.add(c.industry);
            if (c.region) regions.add(c.region);
            if (c.ukRegion) regions.add(c.ukRegion);
            if (c.source) sources.add(c.source);
        });
        return {
            types: [...types].sort(),
            regions: [...regions].sort(),
            sources: [...sources].sort()
        };
    }, [companies]);

    // Enrich contacts with company data & apply filters
    const enrichedContacts = useMemo(() => {
        let result = contacts.filter(c => c.email);

        // Enrich each contact with their company data
        result = result.map(c => {
            const company = (c.companyId && companyMap[c.companyId])
                || (c.companyName && companyMap[c.companyName.toLowerCase()])
                || null;
            return { ...c, _company: company };
        });

        // Apply filters — use includes for partial matching (e.g. "ESCO" matches "MNC ESCO")
        if (filterType) {
            const ft = filterType.toLowerCase();
            result = result.filter(c => {
                const co = c._company;
                if (!co) return false;
                return (co.type || '').toLowerCase().includes(ft) ||
                       (co.installerType || '').toLowerCase().includes(ft) ||
                       (co.industry || '').toLowerCase().includes(ft) ||
                       ft === (co.type || '').toLowerCase() ||
                       ft === (co.installerType || '').toLowerCase() ||
                       ft === (co.industry || '').toLowerCase();
            });
        }
        if (filterRegion) {
            result = result.filter(c => c._company?.region === filterRegion || c._company?.ukRegion === filterRegion);
        }
        if (filterSource) {
            result = result.filter(c => c._company?.source === filterSource);
        }

        return result;
    }, [contacts, companyMap, filterType, filterRegion, filterSource]);

    const hasActiveFilters = filterType || filterRegion || filterSource;

    // CSV Export for Sales Navigator
    const exportCSVForSalesNav = () => {
        const rows = enrichedContacts.map(c => ({
            'First Name': c.firstName || '',
            'Last Name': c.lastName || '',
            'Email': c.email || '',
            'Phone': c.phone || '',
            'Job Title': c.jobTitle || '',
            'Company': c.companyName || '',
            'Company Type': c._company?.type || '',
            'Region': c._company?.region || c._company?.ukRegion || '',
            'City': c._company?.city || '',
            'Website': c._company?.website || '',
            'Source': c._company?.source || '',
            'LinkedIn': c.linkedIn || ''
        }));

        if (rows.length === 0) { setError('No contacts match your filters.'); return; }

        const headers = Object.keys(rows[0]);
        const csvContent = [
            headers.join(','),
            ...rows.map(row => headers.map(h => {
                const val = (row[h] || '').toString().replace(/"/g, '""');
                return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val}"` : val;
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filterLabel = [filterType, filterRegion, filterSource].filter(Boolean).join('_') || 'all';
        a.download = `karnot-contacts-${filterLabel}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setSuccess(`Exported ${rows.length} contacts to CSV! Upload to Sales Navigator → Account Lists.`);
        setTimeout(() => setSuccess(''), 5000);
    };

    // Template Management
    const [customTemplates, setCustomTemplates] = useState(() => {
        try { return JSON.parse(localStorage.getItem('karnot_custom_templates') || '{}'); } catch { return {}; }
    });
    const [editingTemplate, setEditingTemplate] = useState(null); // { key, label, html, isNew }
    const [templatePreviewHtml, setTemplatePreviewHtml] = useState('');
    const fileInputRef = useRef(null);

    // Persist custom templates
    useEffect(() => {
        localStorage.setItem('karnot_custom_templates', JSON.stringify(customTemplates));
    }, [customTemplates]);

    // Merge built-in + custom templates
    const allTemplates = useMemo(() => ({
        ...Object.fromEntries(
            Object.entries(EMAIL_TEMPLATES).map(([key, t]) => [key, { ...t, builtIn: true }])
        ),
        ...Object.fromEntries(
            Object.entries(customTemplates).map(([key, t]) => [key, { ...t, icon: Upload, color: 'blue', builtIn: false }])
        )
    }), [customTemplates]);

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

    // Brevo returns stats in nested shapes depending on endpoint/status:
    //   { statistics: { globalStats: { delivered: 10, ... }, campaignStats: [...] } }
    //   or { statistics: { delivered: 10, ... } }
    //   or { globalStats: { delivered: 10, ... } }
    // This helper flattens to a simple { delivered, uniqueViews, ... } object.
    const normalizeStats = (campaign) => {
        const raw = campaign.statistics || campaign.globalStats || campaign.campaignStats || {};
        // If stats has a nested globalStats object, use that
        if (raw.globalStats && typeof raw.globalStats === 'object') return raw.globalStats;
        // If stats has campaignStats array, use first entry
        if (Array.isArray(raw.campaignStats) && raw.campaignStats.length > 0) return raw.campaignStats[0];
        // If stats directly has numeric fields, it's already flat
        if (typeof raw.delivered === 'number' || typeof raw.sent === 'number') return raw;
        return {};
    };

    const loadCampaigns = async () => {
        try {
            const result = await brevoCall('/emailCampaigns', 'GET', { limit: 50, offset: 0, sort: 'desc' });
            const rawCampaigns = result.campaigns || [];
            const normalized = rawCampaigns.map(c => ({ ...c, statistics: normalizeStats(c) }));
            setCampaigns(normalized);
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
            : enrichedContacts;
        if (toSync.length === 0) { setError('No contacts match your filters. Try adjusting the filters.'); return; }

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
            setSuccess('Campaign is being sent! Stats will appear in a few minutes.');
            setTimeout(() => setSuccess(''), 5000);
            await loadCampaigns();
            // Auto-refresh stats after 30s and 60s to pick up delivery data
            setTimeout(() => loadCampaigns(), 30000);
            setTimeout(() => loadCampaigns(), 60000);
        } catch (err) { setError(err.message); }
        setLoading(false);
    };

    const handleViewStats = async (campaign) => {
        setSelectedCampaign(campaign);
        setCampaignStats(null); // Clear stale stats while loading
        try {
            const detailed = await brevoCall(`/emailCampaigns/${campaign.id}`, 'GET');
            const stats = normalizeStats(detailed);
            setCampaignStats({ ...detailed, statistics: stats });
            // Also update the campaign in the list so inline stats refresh too
            setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, statistics: stats } : c));
        } catch (err) {
            console.error('Stats fetch error:', err);
            setCampaignStats(campaign); // Fallback to what we had
            setError('Could not fetch latest stats from Brevo. Showing cached data.');
            setTimeout(() => setError(''), 5000);
        }
    };

    const applyTemplate = (key) => {
        const t = allTemplates[key];
        if (t) setCampaignForm(prev => ({ ...prev, subject: t.subject, htmlContent: t.html }));
    };

    const handleSaveTemplate = () => {
        if (!editingTemplate) return;
        const { key, label, html, subject, desc, tags } = editingTemplate;
        if (!key || !label || !html) { setError('Template needs a name and HTML content.'); return; }

        if (editingTemplate.builtIn) {
            // Save as a modified copy of the built-in template
            const copyKey = `${key}_custom`;
            setCustomTemplates(prev => ({
                ...prev,
                [copyKey]: {
                    label: `${label} (Modified)`,
                    desc: desc || '',
                    tags: tags || ['CUSTOM'],
                    subject: subject || '',
                    html
                }
            }));
            setSuccess(`Saved as "${label} (Modified)" — original kept intact.`);
        } else {
            setCustomTemplates(prev => ({
                ...prev,
                [key]: { label, desc: desc || '', tags: tags || ['CUSTOM'], subject: subject || '', html }
            }));
            setSuccess(`Template "${label}" saved!`);
        }
        setEditingTemplate(null);
        setTimeout(() => setSuccess(''), 3000);
    };

    const handleDeleteTemplate = (key) => {
        if (!window.confirm('Delete this template? This cannot be undone.')) return;
        setCustomTemplates(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        if (editingTemplate?.key === key) setEditingTemplate(null);
        setSuccess('Template deleted.');
        setTimeout(() => setSuccess(''), 3000);
    };

    const handleUploadTemplate = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
            setError('Please upload an HTML file (.html or .htm)');
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const html = ev.target.result;
            const nameBase = file.name.replace(/\.(html|htm)$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
            const key = `uploaded_${nameBase}_${Date.now()}`;
            setEditingTemplate({
                key,
                label: nameBase.replace(/_/g, ' '),
                desc: `Uploaded from ${file.name}`,
                tags: ['UPLOADED'],
                subject: '',
                html,
                isNew: true,
                builtIn: false
            });
            setActiveTab('templates');
        };
        reader.readAsText(file);
        e.target.value = ''; // reset so same file can be re-uploaded
    };

    const generateAIInstructions = () => {
        const instructions = `# Karnot Energy Solutions — Email Template Instructions
# ===================================================
# Use these instructions with ChatGPT, Claude, or any AI assistant
# to create or modify HTML email templates for the Karnot CRM.
#
# HOW TO USE:
# 1. Copy everything below and paste it into your AI chat
# 2. Then describe what you want changed or what new template you need
# 3. The AI will generate HTML you can upload directly into the CRM
# ===================================================

You are creating an HTML email template for Karnot Energy Solutions,
a clean energy company in the Philippines that installs CO2 and R290
heat pump hot water systems under an Energy-as-a-Service (EaaS) model.

## BRAND GUIDELINES

- Primary color: #ea580c (Karnot orange)
- Dark background: #1f2937
- Green accent: #059669 (for energy/savings themes)
- Purple accent: #7c3aed (for partner/B2B themes)
- Font: Arial, sans-serif
- Tone: Professional but approachable, data-driven, confident

## EMAIL TEMPLATE RULES

1. Must be a SINGLE self-contained HTML file with all CSS inline or in a <style> tag
2. Max width: 600px (standard email width)
3. Use tables for layout (email clients don't support flexbox/grid)
4. All CSS must be inline-compatible (Gmail strips <style> tags)
5. Include both <style> block AND inline styles for maximum compatibility
6. Images must use absolute URLs (no relative paths)
7. Must be mobile-responsive (use width:100% on mobile)
8. Background images are unreliable — use background colors instead

## REQUIRED PERSONALIZATION VARIABLES

Use these exactly as shown — the CRM will replace them:
- {{ contact.FIRSTNAME }} — recipient's first name
- {{ contact.LASTNAME }} — recipient's last name
- {{ contact.COMPANY }} — recipient's company name
- {{ contact.JOBTITLE }} — recipient's job title
- {{ unsubscribe }} — unsubscribe link URL (LEGALLY REQUIRED in every email)

## COMPANY INFO FOR CONTENT

- Company: Karnot Energy Solutions Inc.
- CEO: Stuart Cox (stuart.cox@karnot.com)
- Websites: karnot.com, iheat.ph
- Location: Metro Manila, Philippines
- Registration: BOI-SIPP Registered
- Technology: CO2 and R290 natural refrigerant heat pumps
- Model: Energy-as-a-Service (EaaS) — zero upfront cost, 50/50 savings split
- Key stat: 75% energy savings vs electric/LPG water heaters
- EaaS revenue: $1,100/month per site recurring
- Target: Hotels, hospitals, food processing, commercial laundry
- Fleet metrics: 30-site fleet = $396K/year recurring revenue
- Carbon impact: 1,890 tonnes CO₂ avoided per year per 30-unit fleet

## TEMPLATE STRUCTURE

Every email should follow this structure:
1. HEADER — Brand bar with logo text and tagline
2. GREETING — "Hi {{ contact.FIRSTNAME }}," or "Dear {{ contact.FIRSTNAME }},"
3. HOOK — Opening line that grabs attention (1-2 sentences)
4. VALUE — Key benefits or data points (use highlight boxes)
5. PROOF — Metrics, stats, or social proof
6. CTA — Clear call-to-action button
7. SIGN-OFF — Stuart Cox, CEO, Karnot Energy Solutions
8. FOOTER — Company info + unsubscribe link (REQUIRED)

## EXAMPLE STRUCTURE (simplified)

\`\`\`html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; }
  .header { background: #ea580c; padding: 30px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 24px; }
  .body { padding: 30px; }
  .body p { color: #4b5563; font-size: 14px; line-height: 1.6; }
  .cta { display: block; background: #ea580c; color: #fff !important;
         text-align: center; padding: 14px 30px; border-radius: 8px;
         text-decoration: none; font-weight: bold; margin: 25px 0; }
  .footer { background: #1f2937; padding: 20px; text-align: center;
            color: #9ca3af; font-size: 12px; }
  .footer a { color: #ea580c; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>KARNOT ENERGY SOLUTIONS</h1>
  </div>
  <div class="body">
    <p>Hi {{ contact.FIRSTNAME }},</p>
    <p>[Your content here]</p>
    <a href="https://iheat.ph" class="cta">Call to Action →</a>
    <p>Best regards,<br><strong>Stuart Cox</strong><br>CEO, Karnot Energy Solutions</p>
  </div>
  <div class="footer">
    <p>Karnot Energy Solutions · <a href="https://iheat.ph">iheat.ph</a></p>
    <p><a href="{{ unsubscribe }}">Unsubscribe</a></p>
  </div>
</div>
</body>
</html>
\`\`\`

## IMPORTANT NOTES

- ALWAYS include {{ unsubscribe }} — it's legally required
- Keep subject lines under 50 characters for mobile
- Use preheader text (first text in body) strategically
- Test that the email looks good without images loaded
- The output should be ONLY the HTML code, ready to paste/upload

Now, here is what I need:
[Describe your email template request here]
`;
        const blob = new Blob([instructions], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Karnot-Email-Template-AI-Instructions.txt';
        a.click();
        URL.revokeObjectURL(url);
        setSuccess('AI Instructions downloaded! Open it and paste into ChatGPT or Claude.');
        setTimeout(() => setSuccess(''), 5000);
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
                <TabBtn active={activeTab === 'sequences'} onClick={() => setActiveTab('sequences')} icon={Target} label="Sequences" badge="2" />
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
                                    {Object.entries(allTemplates).map(([key, t]) => (
                                        <button key={key} onClick={() => applyTemplate(key)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border border-${t.color}-200 bg-${t.color}-50 text-${t.color}-700 hover:bg-${t.color}-100 transition-colors`}>
                                            {t.builtIn ? <t.icon size={12} className="inline mr-1" /> : <FileText size={12} className="inline mr-1" />} {t.label}
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
                                            {c.statistics && (c.statistics.delivered > 0 || c.statistics.sent > 0) && (
                                                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1"><Send size={11} /> {c.statistics.delivered || c.statistics.sent || 0} delivered</span>
                                                    <span className="flex items-center gap-1"><Eye size={11} /> {c.statistics.uniqueViews || c.statistics.viewed || 0} opened</span>
                                                    <span className="flex items-center gap-1"><MousePointer size={11} /> {c.statistics.uniqueClicks || c.statistics.clickers || 0} clicked</span>
                                                    <span className="flex items-center gap-1"><XCircle size={11} /> {c.statistics.hardBounces || 0} bounced</span>
                                                </div>
                                            )}
                                            {c.status === 'sent' && (!c.statistics || (!c.statistics.delivered && !c.statistics.sent)) && (
                                                <p className="text-[10px] text-amber-500 mt-1">Stats loading — click "Stats" to refresh</p>
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
                    {selectedCampaign && (
                        <Card className="border-2 border-blue-200 bg-blue-50/20">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-800">Analytics: {selectedCampaign.name}</h3>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleViewStats(selectedCampaign)}
                                        className="text-blue-500 hover:text-blue-700 p-1" title="Refresh stats">
                                        <RefreshCw size={14} />
                                    </button>
                                    <button onClick={() => { setSelectedCampaign(null); setCampaignStats(null); }} className="text-gray-400 hover:text-gray-600"><XCircle size={18} /></button>
                                </div>
                            </div>
                            {!campaignStats ? (
                                <div className="text-center py-6">
                                    <RefreshCw size={20} className="animate-spin text-blue-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">Loading stats from Brevo...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        <StatCard icon={Send} label="Delivered" value={campaignStats.statistics?.delivered || 0} color="green" />
                                        <StatCard icon={Eye} label="Opened" value={campaignStats.statistics?.uniqueViews || campaignStats.statistics?.viewed || 0} color="blue"
                                            sub={campaignStats.statistics?.delivered ? `${(((campaignStats.statistics.uniqueViews || campaignStats.statistics?.viewed || 0) / campaignStats.statistics.delivered) * 100).toFixed(1)}%` : ''} />
                                        <StatCard icon={MousePointer} label="Clicked" value={campaignStats.statistics?.uniqueClicks || campaignStats.statistics?.clickers || 0} color="purple"
                                            sub={campaignStats.statistics?.delivered ? `${(((campaignStats.statistics.uniqueClicks || campaignStats.statistics?.clickers || 0) / campaignStats.statistics.delivered) * 100).toFixed(1)}%` : ''} />
                                        <StatCard icon={XCircle} label="Bounced" value={(campaignStats.statistics?.hardBounces || 0) + (campaignStats.statistics?.softBounces || 0)} color="orange" />
                                        <StatCard icon={AlertCircle} label="Unsubscribed" value={campaignStats.statistics?.unsubscriptions || 0} color="orange" />
                                    </div>
                                    {selectedCampaign.status === 'sent' && campaignStats.statistics?.delivered === 0 && (
                                        <p className="text-xs text-amber-600 mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                            Stats may take a few minutes to appear after sending. Click the refresh button to check for updates.
                                        </p>
                                    )}
                                </>
                            )}
                        </Card>
                    )}
                </div>
            )}

            {/* ═══════ SYNC CONTACTS TAB ═══════ */}
            {activeTab === 'contacts' && (
                <div className="space-y-4">
                    {/* Filter Bar */}
                    <Card className="border-2 border-orange-200 bg-orange-50/20">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Filter size={16} className="text-orange-500" /> Filter Contacts by Company
                        </h3>
                        <p className="text-sm text-gray-500 mb-3">Filter by company type (ESCO, MCS, VIP), region, or source before syncing to Brevo or exporting for Sales Navigator.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Type / MCS / ESCO</label>
                                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                                    <option value="">All Types</option>
                                    {filterOptions.types.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Region / Country</label>
                                <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                                    <option value="">All Regions</option>
                                    {filterOptions.regions.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Source</label>
                                <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                                    <option value="">All Sources</option>
                                    {filterOptions.sources.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        {/* Diagnostics */}
                        {(() => {
                            const withEmail = contacts.filter(c => c.email).length;
                            const linked = contacts.filter(c => c.email).filter(c => {
                                return (c.companyId && companyMap[c.companyId]) ||
                                       (c.companyName && companyMap[c.companyName.toLowerCase()]);
                            }).length;
                            return (
                                <div className="text-[10px] text-gray-400 mb-2 flex gap-4">
                                    <span>{companies.length} companies loaded</span>
                                    <span>{withEmail} contacts with email</span>
                                    <span className={linked < withEmail ? 'text-amber-500 font-bold' : 'text-green-500'}>
                                        {linked} linked to a company {linked < withEmail && `(${withEmail - linked} unlinked — link via Contacts page)`}
                                    </span>
                                </div>
                            );
                        })()}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-bold ${hasActiveFilters ? 'text-orange-600' : 'text-gray-500'}`}>
                                    {enrichedContacts.length} contacts {hasActiveFilters ? 'match filters' : 'with email'}
                                </span>
                                {hasActiveFilters && (
                                    <button onClick={() => { setFilterType(''); setFilterRegion(''); setFilterSource(''); }}
                                        className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1">
                                        <XCircle size={12} /> Clear Filters
                                    </button>
                                )}
                            </div>
                            <Button onClick={exportCSVForSalesNav} variant="secondary" className="text-xs" disabled={enrichedContacts.length === 0}>
                                <Download size={12} className="mr-1" /> Export CSV for Sales Navigator
                            </Button>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Users size={16} className="text-orange-500" /> Sync to Brevo
                        </h3>
                        <div className="flex items-center gap-2 mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <ArrowRight size={14} className="text-blue-500 flex-shrink-0" />
                            <p className="text-[11px] text-blue-700"><strong>One-way sync:</strong> CRM → Brevo. {hasActiveFilters ? `Only the ${enrichedContacts.length} filtered contacts will sync.` : 'All contacts with email will sync.'}</p>
                        </div>

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
                                    <Input value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="e.g. UK MCS Installers" />
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
                                        {selectedContacts.length > 0 ? `${selectedContacts.length} selected` : `${enrichedContacts.length} matching`}
                                    </span>
                                </label>
                                <button onClick={() => setShowContactPicker(!showContactPicker)} className="text-xs text-orange-600 hover:text-orange-800 font-bold flex items-center gap-1">
                                    <Filter size={12} /> {showContactPicker ? 'Hide List' : 'View & Pick'}
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
                                        <button onClick={() => setSelectedContacts(selectedContacts.length === enrichedContacts.length ? [] : enrichedContacts.map(c => c.id))}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-bold whitespace-nowrap px-3">
                                            {selectedContacts.length === enrichedContacts.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>
                                    {enrichedContacts
                                        .filter(c => {
                                            if (!contactSearch) return true;
                                            const q = contactSearch.toLowerCase();
                                            return (c.firstName || '').toLowerCase().includes(q) ||
                                                (c.lastName || '').toLowerCase().includes(q) ||
                                                (c.email || '').toLowerCase().includes(q) ||
                                                (c.companyName || '').toLowerCase().includes(q);
                                        })
                                        .map(c => (
                                        <label key={c.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer text-sm">
                                            <input type="checkbox" checked={selectedContacts.includes(c.id)}
                                                onChange={e => setSelectedContacts(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id))}
                                                className="rounded border-gray-300" />
                                            <span className="font-bold text-gray-700">{c.firstName} {c.lastName}</span>
                                            <span className="text-gray-400">·</span>
                                            <span className="text-gray-500 truncate">{c.email}</span>
                                            {c._company?.type && <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex-shrink-0">{c._company.type}</span>}
                                            {c._company?.region && <span className="text-[9px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex-shrink-0">{c._company.region}</span>}
                                            {c.companyName && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded ml-auto flex-shrink-0">{c.companyName}</span>}
                                        </label>
                                    ))}
                                    {enrichedContacts.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No contacts match filters</p>}
                                </div>
                            )}
                        </div>

                        <Button onClick={handleSyncContacts} variant="primary" disabled={syncLoading || !targetListId}>
                            {syncLoading
                                ? <><RefreshCw size={14} className="mr-1.5 animate-spin" /> Syncing...</>
                                : <><Send size={14} className="mr-1.5" /> Sync {selectedContacts.length > 0 ? `${selectedContacts.length} Contacts` : `${enrichedContacts.length} Contacts`} to Brevo</>
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
                    {/* Action Bar */}
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={() => setEditingTemplate({ key: `custom_${Date.now()}`, label: '', desc: '', tags: ['CUSTOM'], subject: '', html: '', isNew: true, builtIn: false })} variant="primary" className="text-xs">
                            <Plus size={12} className="mr-1" /> New Template
                        </Button>
                        <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="text-xs">
                            <Upload size={12} className="mr-1" /> Upload HTML
                        </Button>
                        <Button onClick={generateAIInstructions} variant="secondary" className="text-xs">
                            <Download size={12} className="mr-1" /> Download AI Instructions
                        </Button>
                        <input ref={fileInputRef} type="file" accept=".html,.htm" onChange={handleUploadTemplate} className="hidden" />
                    </div>

                    {/* Template Editor */}
                    {editingTemplate && (
                        <Card className="border-2 border-purple-200 bg-purple-50/20">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Edit3 size={16} className="text-purple-500" />
                                    {editingTemplate.isNew ? 'New Template' : `Editing: ${editingTemplate.label}`}
                                    {editingTemplate.builtIn && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold ml-2">BUILT-IN — saves as copy</span>}
                                </h3>
                                <button onClick={() => setEditingTemplate(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={18} /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Template Name *</label>
                                    <Input value={editingTemplate.label} onChange={e => setEditingTemplate(prev => ({ ...prev, label: e.target.value, key: prev.isNew ? `custom_${e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : prev.key }))} placeholder="e.g. March Newsletter" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Default Subject Line</label>
                                    <Input value={editingTemplate.subject} onChange={e => setEditingTemplate(prev => ({ ...prev, subject: e.target.value }))} placeholder="e.g. Monthly Energy Savings Update" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Description</label>
                                    <Input value={editingTemplate.desc} onChange={e => setEditingTemplate(prev => ({ ...prev, desc: e.target.value }))} placeholder="What's this template for?" />
                                </div>
                            </div>
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">HTML Content *</label>
                                    <button onClick={() => {
                                        const blob = new Blob([editingTemplate.html], { type: 'text/html' });
                                        const url = URL.createObjectURL(blob);
                                        window.open(url, '_blank');
                                    }} className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1" disabled={!editingTemplate.html}>
                                        <Eye size={12} /> Preview in new tab
                                    </button>
                                </div>
                                <textarea value={editingTemplate.html} onChange={e => setEditingTemplate(prev => ({ ...prev, html: e.target.value }))}
                                    rows={14} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
                                    placeholder="Paste your HTML email content here..." />
                            </div>
                            {/* Inline Preview */}
                            {editingTemplate.html && (
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Live Preview</label>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        <iframe
                                            srcDoc={editingTemplate.html}
                                            title="Template Preview"
                                            className="w-full border-0"
                                            style={{ height: '380px', pointerEvents: 'none' }}
                                            sandbox="allow-same-origin"
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button onClick={handleSaveTemplate} variant="primary" disabled={!editingTemplate.label || !editingTemplate.html}>
                                    <Save size={14} className="mr-1" /> {editingTemplate.builtIn ? 'Save as Copy' : 'Save Template'}
                                </Button>
                                <Button onClick={() => setEditingTemplate(null)} variant="secondary">Cancel</Button>
                            </div>
                        </Card>
                    )}

                    {/* Template Grid */}
                    <Card>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Layout size={16} className="text-purple-500" /> Email Templates</h3>
                        <p className="text-sm text-gray-500 mb-4">Click "Use" to start a campaign, or "Edit" to modify. Custom templates are saved in your browser.</p>
                        <div className="grid gap-4 md:grid-cols-3">
                            {Object.entries(allTemplates).map(([key, t]) => (
                                <div key={key} className={`border-2 border-${t.color}-200 rounded-xl p-4 bg-${t.color}-50/30 hover:shadow-md transition-shadow relative group`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        {t.builtIn ? <t.icon size={18} className={`text-${t.color}-500`} /> : <Upload size={18} className="text-blue-500" />}
                                        <h4 className="font-bold text-gray-800 flex-1 truncate">{t.label}</h4>
                                        {!t.builtIn && (
                                            <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold flex-shrink-0">CUSTOM</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">{t.desc}</p>
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {(t.tags || []).map(tag => (
                                            <span key={tag} className="text-[9px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">{tag}</span>
                                        ))}
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button onClick={() => { applyTemplate(key); setShowBuilder(true); setActiveTab('campaigns'); }}
                                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-colors">
                                            <Play size={10} className="inline mr-1" /> Use
                                        </button>
                                        <button onClick={() => setEditingTemplate({ key, ...t, isNew: false })}
                                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition-colors">
                                            <Edit3 size={10} className="inline mr-1" /> Edit
                                        </button>
                                        <button onClick={() => {
                                            const blob = new Blob([t.html], { type: 'text/html' });
                                            const url = URL.createObjectURL(blob);
                                            window.open(url, '_blank');
                                        }}
                                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors">
                                            <Eye size={10} className="inline mr-1" /> Preview
                                        </button>
                                        {!t.builtIn && (
                                            <button onClick={() => handleDeleteTemplate(key)}
                                                className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-400 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors">
                                                <Trash2 size={10} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* AI Instructions Card */}
                    <Card className="border-2 border-indigo-200 bg-indigo-50/20">
                        <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><Code size={16} className="text-indigo-500" /> Need a New Template?</h3>
                        <p className="text-sm text-gray-500 mb-3">
                            Download the AI Instructions file, paste it into ChatGPT or Claude, describe what you want, and get ready-to-upload HTML back.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={generateAIInstructions} variant="primary" className="text-xs bg-indigo-600 hover:bg-indigo-700">
                                <Download size={12} className="mr-1" /> Download AI Instructions (.txt)
                            </Button>
                            <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="text-xs">
                                <Upload size={12} className="mr-1" /> Upload AI-Generated HTML
                            </Button>
                        </div>
                        <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                            <p className="text-xs text-indigo-800">
                                <strong>Workflow:</strong> Download instructions → Paste into AI chat → Describe your email → Copy the HTML output → Upload here or paste into the editor above.
                            </p>
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

            {/* ═══════ SEQUENCES TAB ═══════ */}
            {activeTab === 'sequences' && (
                <div className="space-y-6">
                    {/* Strategy Overview */}
                    <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50/50 to-blue-50/50">
                        <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <Target size={18} className="text-orange-500" /> Private Partner Army — Campaign Strategy
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">Two-track email campaign: Fish for projects with Energy Managers, then recruit ESCO partners with a proven pipeline.</p>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="bg-white rounded-lg p-3 border text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Week 1</p>
                                <p className="text-sm font-bold text-orange-600 mt-1">Launch EM Emails</p>
                                <p className="text-[10px] text-gray-400">Fish for projects</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Week 2-3</p>
                                <p className="text-sm font-bold text-blue-600 mt-1">Qualify Sites</p>
                                <p className="text-[10px] text-gray-400">Target 10-15 solid leads</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Week 3</p>
                                <p className="text-sm font-bold text-purple-600 mt-1">Launch ESCO Emails</p>
                                <p className="text-[10px] text-gray-400">Show pipeline proof</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Week 4+</p>
                                <p className="text-sm font-bold text-green-600 mt-1">Close Partners</p>
                                <p className="text-[10px] text-gray-400">$2,500-$5,000 each</p>
                            </div>
                        </div>
                    </Card>

                    {/* Sequence Cards */}
                    {Object.values(CAMPAIGN_SEQUENCES).map(seq => (
                        <Card key={seq.id} className={`border-2 ${seq.color === 'orange' ? 'border-orange-200' : 'border-blue-200'}`}>
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        {seq.color === 'orange'
                                            ? <Mail size={18} className="text-orange-500" />
                                            : <Users size={18} className="text-blue-500" />
                                        }
                                        {seq.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">{seq.description}</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">{seq.audience}</span>
                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">Landing: {seq.landingPage}</span>
                                        <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">{seq.duration}</span>
                                        <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">Goal: {seq.goal}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Email Timeline */}
                            <div className="space-y-3">
                                {seq.emails.map((email, idx) => (
                                    <div key={email.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black text-white ${
                                            seq.color === 'orange' ? 'bg-orange-500' : 'bg-blue-500'
                                        }`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-gray-800 text-sm">{email.name}</h4>
                                                <span className="text-[9px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">{email.timing}</span>
                                            </div>
                                            <p className="text-xs text-gray-500">Subject: <strong>{email.subject}</strong></p>
                                            {email.preheader && <p className="text-[10px] text-gray-400 mt-0.5">Preview: {email.preheader}</p>}
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {email.tags.map(tag => (
                                                    <span key={tag} className="text-[8px] bg-white text-gray-500 px-1.5 py-0.5 rounded border font-bold">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5 flex-shrink-0">
                                            <button
                                                onClick={() => {
                                                    setCampaignForm(prev => ({
                                                        ...prev,
                                                        name: email.name,
                                                        subject: email.subject,
                                                        htmlContent: email.html,
                                                        tag: email.tags.join(', ')
                                                    }));
                                                    setShowBuilder(true);
                                                    setActiveTab('campaigns');
                                                }}
                                                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-colors"
                                            >
                                                <Play size={10} className="inline mr-1" /> Use
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const blob = new Blob([email.html], { type: 'text/html' });
                                                    const url = URL.createObjectURL(blob);
                                                    window.open(url, '_blank');
                                                }}
                                                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
                                            >
                                                <Eye size={10} className="inline mr-1" /> Preview
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Launch All Button */}
                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                <p className="text-xs text-gray-400">
                                    <Calendar size={12} className="inline mr-1" />
                                    {seq.totalEmails} emails over {seq.duration}
                                </p>
                                <Button
                                    onClick={() => {
                                        const firstEmail = seq.emails[0];
                                        setCampaignForm(prev => ({
                                            ...prev,
                                            name: firstEmail.name,
                                            subject: firstEmail.subject,
                                            htmlContent: firstEmail.html,
                                            tag: firstEmail.tags.join(', ')
                                        }));
                                        setShowBuilder(true);
                                        setActiveTab('campaigns');
                                    }}
                                    variant="primary"
                                    className="text-xs"
                                >
                                    <Play size={12} className="mr-1" /> Create First Campaign
                                </Button>
                            </div>
                        </Card>
                    ))}

                    {/* Landing Pages Info */}
                    <Card>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <ExternalLink size={16} className="text-green-500" /> Landing Pages
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Form submissions from these landing pages automatically create contacts in Brevo and notify Stuart via email.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border-2 border-orange-200 rounded-xl p-4 bg-orange-50/30">
                                <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                                    <Mail size={16} className="text-orange-500" /> Flagship Pilot Application
                                </h4>
                                <p className="text-xs text-gray-500 mb-3">Energy managers submit their facility for the free EaaS pilot program.</p>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-gray-400 w-16 flex-shrink-0">Deploy to:</span>
                                        <code className="bg-white px-2 py-1 rounded border text-orange-600 font-mono text-[11px]">karnot.com/pilot</code>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-gray-400 w-16 flex-shrink-0">File:</span>
                                        <code className="bg-white px-2 py-1 rounded border text-gray-600 font-mono text-[11px]">landing-pages/pilot.html</code>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-gray-400 w-16 flex-shrink-0">Form API:</span>
                                        <code className="bg-white px-2 py-1 rounded border text-gray-600 font-mono text-[11px]">/.netlify/functions/pilot-form</code>
                                    </div>
                                </div>
                            </div>
                            <div className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50/30">
                                <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                                    <Users size={16} className="text-blue-500" /> ESCO Partner Application
                                </h4>
                                <p className="text-xs text-gray-500 mb-3">ESCO companies apply for exclusive territory partnership and Co-Owner investment.</p>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-gray-400 w-16 flex-shrink-0">Deploy to:</span>
                                        <code className="bg-white px-2 py-1 rounded border text-blue-600 font-mono text-[11px]">iheat.ph/partner</code>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-gray-400 w-16 flex-shrink-0">File:</span>
                                        <code className="bg-white px-2 py-1 rounded border text-gray-600 font-mono text-[11px]">landing-pages/partner.html</code>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-gray-400 w-16 flex-shrink-0">Form API:</span>
                                        <code className="bg-white px-2 py-1 rounded border text-gray-600 font-mono text-[11px]">/.netlify/functions/pilot-form</code>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-xs text-yellow-800">
                                <strong>Deployment:</strong> The landing page HTML files are in <code className="bg-yellow-100 px-1 rounded">landing-pages/</code> in your repo. Copy <code className="bg-yellow-100 px-1 rounded">pilot.html</code> to karnot.com and <code className="bg-yellow-100 px-1 rounded">partner.html</code> to iheat.ph. Update the form endpoint URL in each file to point to your Netlify function.
                            </p>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
