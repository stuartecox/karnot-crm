import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import {
    Calendar, Clock, BarChart2, Image, Target, BookOpen, Plus, Edit, Trash2,
    CheckCircle, AlertTriangle, X, ChevronDown, ChevronUp, Search, Filter,
    Linkedin, Facebook, Instagram, Globe, Send, Eye, TrendingUp, Users,
    FileText, Printer, Download, Copy, ExternalLink, HelpCircle, Star,
    Award, Lightbulb, ArrowRight, Hash, Heart, MessageCircle, Share2,
    Repeat, ThumbsUp, MousePointer, Link, Play, Pause, CheckSquare, Square,
    MapPin, Zap, Layout, PieChart, Activity
} from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx';

// ==========================================
// CONSTANTS & CONFIGURATION
// ==========================================
const TEAM_MEMBERS = [
    { id: 'stuart', name: 'Stuart', role: 'CEO / Strategy', color: 'orange' },
    { id: 'azia', name: 'Azia', role: 'Social Media & Marketing', color: 'pink' },
    { id: 'zaldy', name: 'Zaldy', role: 'Sales & Installations', color: 'blue' }
];

const PLATFORMS = {
    linkedin: { name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', primary: true },
    facebook: { name: 'Facebook', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', primary: false },
    instagram: { name: 'Instagram', icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', primary: false },
    website: { name: 'Website/Blog', icon: Globe, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', primary: true }
};

const CONTENT_PILLAR_TEMPLATES = [
    { name: 'Industry Expertise', description: 'Share knowledge about heat pump technology, energy efficiency, and cold chain solutions', color: 'orange', icon: '🔥', examples: ['How heat pumps reduce energy costs by 60%', 'Cold room vs traditional refrigeration comparison', 'Philippine energy efficiency regulations explained'] },
    { name: 'Customer Success', description: 'Showcase completed projects, testimonials, and case studies from satisfied clients', color: 'green', icon: '⭐', examples: ['Before/after installation photos', 'Client testimonial video clips', 'Energy savings report from recent project'] },
    { name: 'Behind the Scenes', description: 'Show the team at work, company culture, and day-to-day operations', color: 'blue', icon: '🏗️', examples: ['Team installation day photos', 'Office life and team celebrations', 'Equipment testing and quality checks'] },
    { name: 'Education & Tips', description: 'Help your audience understand energy solutions and make informed decisions', color: 'purple', icon: '📚', examples: ['5 signs you need a heat pump upgrade', 'Understanding your electricity bill', 'Maintenance tips for HVAC systems'] },
    { name: 'Company News', description: 'Announcements, partnerships, events, and milestones', color: 'pink', icon: '📢', examples: ['New partnership announcement', 'BOI certification milestone', 'Upcoming trade show participation'] }
];

const BEST_POSTING_TIMES = {
    linkedin: { days: ['Tuesday', 'Wednesday', 'Thursday'], times: ['7:30 AM', '12:00 PM', '5:00 PM'], note: 'B2B audience most active during work hours. Tuesday-Thursday get highest engagement.' },
    facebook: { days: ['Wednesday', 'Thursday', 'Friday'], times: ['9:00 AM', '1:00 PM', '3:00 PM'], note: 'Philippine audience peaks mid-morning and early afternoon.' },
    instagram: { days: ['Monday', 'Wednesday', 'Friday'], times: ['11:00 AM', '2:00 PM', '7:00 PM'], note: 'Visual content performs best. Use Stories daily, Reels 2-3x per week.' },
    website: { days: ['Monday', 'Tuesday'], times: ['10:00 AM'], note: 'Publish blog posts early in the week for maximum SEO indexing time.' }
};

const POST_STATUS = {
    IDEA: { label: 'Idea', color: 'bg-gray-100 text-gray-700 border-gray-300' },
    DRAFT: { label: 'Draft', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    REVIEW: { label: 'Ready for Review', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    SCHEDULED: { label: 'Scheduled', color: 'bg-purple-100 text-purple-700 border-purple-300' },
    PUBLISHED: { label: 'Published', color: 'bg-green-100 text-green-700 border-green-300' }
};

const TRAINING_MODULES = [
    {
        id: 'linkedin-basics',
        title: 'LinkedIn for Business - Getting Started',
        platform: 'linkedin',
        difficulty: 'Beginner',
        duration: '30 min',
        steps: [
            { title: 'Optimize Your Company Page', content: 'Go to linkedin.com/company/karnot > Edit Page. Add: professional banner image (1128x191px), company description with keywords like "heat pump", "energy efficiency", "Philippines". Add your website URL, industry, and company size.', done: false },
            { title: 'Complete Your Personal Profile', content: 'Both Stuart and Azia should have professional profiles. Use a professional photo, write a headline like "CEO at Karnot | Heat Pump & Energy Solutions | Philippines". Write an About section explaining your expertise.', done: false },
            { title: 'Connect with Industry People', content: 'Search for: HVAC professionals, facility managers, hotel/resort operators, cold storage companies in the Philippines. Send personalized connection requests mentioning shared interests.', done: false },
            { title: 'Post Your First Content', content: 'Share a photo of a recent installation with 3-4 paragraphs explaining the project. Use hashtags: #HeatPump #EnergyEfficiency #Philippines #HVAC #Sustainability. Tag the client company if appropriate.', done: false },
            { title: 'Engage Daily', content: 'Spend 15 minutes each morning: Like and comment on 5 industry posts. Share relevant industry articles with your opinion. Respond to all comments on your posts within 2 hours.', done: false }
        ]
    },
    {
        id: 'content-creation',
        title: 'Creating Professional Content',
        platform: 'all',
        difficulty: 'Beginner',
        duration: '45 min',
        steps: [
            { title: 'Photo Best Practices', content: 'Take photos in good lighting (natural light is best). For installations: before/after shots, team at work, finished product. Use your phone camera in landscape mode. Clean the lens! Frame the subject with the rule of thirds.', done: false },
            { title: 'Writing Engaging Captions', content: 'Start with a hook question or bold statement. Tell a mini-story about the project or topic. Include a call-to-action (visit website, comment, share). Keep LinkedIn posts 150-300 words. Use line breaks for readability.', done: false },
            { title: 'Hashtag Strategy', content: 'Use 3-5 hashtags per LinkedIn post, 5-10 for Instagram. Core hashtags: #Karnot #HeatPump #EnergyEfficiency #Philippines #HVAC. Project-specific: #ColdRoom #HotWater #HotelHVAC #ColdChain. Mix popular and niche tags.', done: false },
            { title: 'Creating Simple Graphics', content: 'Use Canva (free) for social media graphics. Use Karnot brand colors: Orange (#ea580c), White, Dark Gray. Create templates for: quotes, tips, announcements. Save templates to reuse - consistency builds brand recognition.', done: false },
            { title: 'Video Content Tips', content: 'Short videos (30-60 seconds) perform best. Show installations in progress, equipment demos, or client testimonials. Add captions (80% of video is watched on mute). Use LinkedIn native video for 5x more reach than YouTube links.', done: false }
        ]
    },
    {
        id: 'google-analytics',
        title: 'Understanding Google Analytics for karnot.com',
        platform: 'website',
        difficulty: 'Beginner',
        duration: '60 min',
        steps: [
            { title: 'Accessing Google Analytics', content: 'Go to analytics.google.com and sign in with your Google account. If GA4 is set up for karnot.com, you will see your property. The main dashboard shows: Users (unique visitors), Sessions (total visits), Page Views, and Bounce Rate.', done: false },
            { title: 'Understanding Key Metrics', content: 'USERS = unique people visiting your site. SESSIONS = total visits (one person can have multiple). BOUNCE RATE = percentage who leave after one page (lower is better, aim for under 60%). SESSION DURATION = how long people stay (longer = more engaged).', done: false },
            { title: 'Traffic Sources', content: 'Go to Acquisition > Traffic Acquisition. This shows WHERE visitors come from: Organic Search (Google), Direct (typed URL), Social (LinkedIn/Facebook), Referral (other websites). Focus on growing Organic and Social traffic.', done: false },
            { title: 'Page Performance', content: 'Go to Engagement > Pages and Screens. See which pages get most views. Your homepage, products page, and contact page should be top 3. If they are not, you need better navigation or content on those pages.', done: false },
            { title: 'Setting Up Goals', content: 'Go to Admin > Events > Create Event. Track: Contact form submissions, Quote requests, Phone number clicks, Email clicks. These are your "conversions" - the actions you want visitors to take. Review weekly.', done: false },
            { title: 'Weekly Reporting Routine', content: 'Every Monday morning, check: Total users this week vs last week. Top 5 pages visited. Traffic sources breakdown. Any conversions (form fills, quote requests). Record these numbers in the Analytics Tracker tab here in the CRM.', done: false }
        ]
    },
    {
        id: 'email-campaigns',
        title: 'Building Email Campaigns',
        platform: 'all',
        difficulty: 'Intermediate',
        duration: '45 min',
        steps: [
            { title: 'Building Your Email List', content: 'Add a newsletter signup form to karnot.com. Offer value: "Download our Energy Savings Guide" or "Get Monthly HVAC Tips". Import existing customer contacts from the CRM (Contacts page). Always get permission before adding someone.', done: false },
            { title: 'Choosing an Email Platform', content: 'Recommended: Mailchimp (free for first 500 contacts). Alternative: Brevo (formerly Sendinblue) - good for Philippines. Connect to your CRM contact list. Set up your sending domain (noreply@karnot.com).', done: false },
            { title: 'Creating Your First Campaign', content: 'Start with a monthly newsletter template. Include: 1 project showcase, 1 tip/educational piece, 1 company update, 1 call-to-action (request a quote). Use Karnot branding - orange headers, clean layout.', done: false },
            { title: 'Measuring Email Success', content: 'Open Rate: aim for 20-30% (how many opened your email). Click Rate: aim for 2-5% (how many clicked a link). Unsubscribe Rate: should be under 0.5%. Track these in the Analytics tab after each send.', done: false },
            { title: 'Follow-Up Strategy', content: 'If someone opens but does not click - send a different version in 3 days. If someone clicks - add them to your "hot leads" list in the CRM. If someone fills a form - assign to Zaldy for follow-up call within 24 hours.', done: false }
        ]
    },
    {
        id: 'website-seo',
        title: 'Website & SEO Basics for karnot.com',
        platform: 'website',
        difficulty: 'Intermediate',
        duration: '60 min',
        steps: [
            { title: 'What is SEO?', content: 'SEO = Search Engine Optimization. It means making your website appear higher in Google search results. When someone in the Philippines searches "heat pump supplier Philippines", you want karnot.com to appear on page 1.', done: false },
            { title: 'Keyword Research', content: 'Your target keywords: "heat pump Philippines", "cold room supplier Philippines", "HVAC solutions Manila", "energy efficient cooling Philippines", "commercial heat pump". Use these naturally in your page titles, headings, and content.', done: false },
            { title: 'On-Page SEO Checklist', content: 'Each page on karnot.com should have: A clear title tag (under 60 characters) with your keyword. A meta description (under 155 characters) describing the page. H1 heading with main keyword. Alt text on all images describing what they show.', done: false },
            { title: 'Content is King', content: 'Google rewards fresh, useful content. Publish a blog post on karnot.com at least twice a month. Topics: case studies, how-to guides, industry news. Each post should be 500-1000 words with images.', done: false },
            { title: 'Google Business Profile', content: 'Claim and optimize your Google Business Profile (business.google.com). Add photos, business hours, services list, and respond to reviews. This helps you appear in local searches and Google Maps.', done: false }
        ]
    }
];

// ==========================================
// SUB-COMPONENTS
// ==========================================

// --- Printable Task List ---
const PrintableTaskList = ({ tasks, teamMember, onClose }) => {
    const printRef = useRef();
    const filteredTasks = teamMember === 'all' ? tasks : tasks.filter(t => t.assignedTo === teamMember);
    
    const handlePrint = () => {
        const printContent = printRef.current;
        const win = window.open('', '', 'width=800,height=600');
        win.document.write('<html><head><title>Karnot - Task List</title>');
        win.document.write('<style>body{font-family:Arial,sans-serif;padding:20px;color:#333}h1{color:#ea580c;font-size:20px;border-bottom:3px solid #ea580c;padding-bottom:8px}h2{color:#555;font-size:14px;margin-top:16px}.task{padding:8px 0;border-bottom:1px solid #eee;display:flex;align-items:flex-start;gap:8px}.checkbox{width:14px;height:14px;border:2px solid #ccc;border-radius:3px;flex-shrink:0;margin-top:2px}.done .checkbox{background:#22c55e;border-color:#22c55e}.meta{font-size:11px;color:#888;margin-top:2px}.priority-high{color:#dc2626;font-weight:bold}.priority-medium{color:#f59e0b}.priority-low{color:#22c55e}.header{display:flex;justify-content:space-between;align-items:center}.date{font-size:12px;color:#888}</style>');
        win.document.write('</head><body>');
        win.document.write(printContent.innerHTML);
        win.document.write('</body></html>');
        win.document.close();
        win.print();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
                    <h2 className="font-black text-lg uppercase tracking-tight">Print Task List</h2>
                    <div className="flex gap-2">
                        <Button onClick={handlePrint} variant="primary" className="text-xs">
                            <Printer size={14} className="mr-1" /> Print
                        </Button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                    </div>
                </div>
                <div ref={printRef} className="p-6">
                    <div className="header">
                        <h1>Karnot Social Media Tasks</h1>
                        <span className="date">{new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <h2>{teamMember === 'all' ? 'All Team Members' : TEAM_MEMBERS.find(t => t.id === teamMember)?.name || teamMember}</h2>
                    {filteredTasks.length === 0 ? (
                        <p style={{color: '#888', fontStyle: 'italic'}}>No tasks assigned</p>
                    ) : (
                        filteredTasks.map((task, i) => (
                            <div key={i} className={`task ${task.status === 'done' ? 'done' : ''}`}>
                                <div className="checkbox"></div>
                                <div>
                                    <div style={{fontWeight: 'bold', fontSize: '13px'}}>{task.title}</div>
                                    <div className="meta">
                                        {task.platform && <span>Platform: {PLATFORMS[task.platform]?.name || task.platform} | </span>}
                                        <span>Due: {task.dueDate || 'Not set'} | </span>
                                        <span className={`priority-${task.priority || 'medium'}`}>Priority: {task.priority || 'Medium'}</span>
                                        {task.assignedTo && <span> | Assigned: {TEAM_MEMBERS.find(t => t.id === task.assignedTo)?.name || task.assignedTo}</span>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Post Editor Modal ---
const PostEditorModal = ({ post, onSave, onClose, pillars }) => {
    const [formData, setFormData] = useState(post || {
        title: '', content: '', platform: 'linkedin', pillar: '', status: 'IDEA',
        scheduledDate: '', scheduledTime: '', assignedTo: 'azia', hashtags: '',
        imageUrl: '', notes: '', priority: 'medium'
    });

    const handleSave = () => {
        if (!formData.title.trim()) return alert('Please enter a post title');
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
                    <h2 className="font-black text-lg uppercase tracking-tight">{post ? 'Edit Post' : 'Create New Post'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <Input label="Post Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g., Heat pump installation at Manila Hotel" />
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Post Content / Caption</label>
                        <textarea className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none min-h-[120px]" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="Write your post content here..." />
                        <p className="text-[10px] text-gray-400 mt-1">{formData.content.length} characters {formData.platform === 'linkedin' && formData.content.length > 3000 ? '(LinkedIn limit: 3,000)' : ''}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Platform</label>
                            <select className="w-full border-2 border-gray-200 rounded-xl p-2.5 text-sm focus:border-orange-400 outline-none" value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})}>
                                {Object.entries(PLATFORMS).map(([key, p]) => (
                                    <option key={key} value={key}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Content Pillar</label>
                            <select className="w-full border-2 border-gray-200 rounded-xl p-2.5 text-sm focus:border-orange-400 outline-none" value={formData.pillar} onChange={e => setFormData({...formData, pillar: e.target.value})}>
                                <option value="">Select pillar...</option>
                                {pillars.map((p, i) => (
                                    <option key={i} value={p.name}>{p.icon} {p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Status</label>
                            <select className="w-full border-2 border-gray-200 rounded-xl p-2.5 text-sm focus:border-orange-400 outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                {Object.entries(POST_STATUS).map(([key, s]) => (
                                    <option key={key} value={key}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Assign To</label>
                            <select className="w-full border-2 border-gray-200 rounded-xl p-2.5 text-sm focus:border-orange-400 outline-none" value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})}>
                                {TEAM_MEMBERS.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} - {m.role}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Priority</label>
                            <select className="w-full border-2 border-gray-200 rounded-xl p-2.5 text-sm focus:border-orange-400 outline-none" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Scheduled Date" type="date" value={formData.scheduledDate} onChange={e => setFormData({...formData, scheduledDate: e.target.value})} />
                        <Input label="Scheduled Time" type="time" value={formData.scheduledTime} onChange={e => setFormData({...formData, scheduledTime: e.target.value})} />
                    </div>

                    <Input label="Hashtags" value={formData.hashtags} onChange={e => setFormData({...formData, hashtags: e.target.value})} placeholder="#HeatPump #EnergyEfficiency #Philippines" />

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Notes / Instructions for Team</label>
                        <textarea className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none min-h-[60px]" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Any notes for the person creating/posting this..." />
                    </div>
                </div>
                <div className="sticky bottom-0 bg-gray-50 border-t p-4 flex justify-end gap-2 rounded-b-2xl">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleSave} variant="primary"><CheckCircle size={14} className="mr-1" /> Save Post</Button>
                </div>
            </div>
        </div>
    );
};

// --- Analytics Entry Modal ---
const AnalyticsModal = ({ entry, onSave, onClose }) => {
    const [formData, setFormData] = useState(entry || {
        date: new Date().toISOString().split('T')[0],
        platform: 'linkedin',
        metric: 'followers',
        value: '',
        previousValue: '',
        notes: '',
        postUrl: ''
    });

    const METRICS = [
        { value: 'followers', label: 'Followers / Connections' },
        { value: 'impressions', label: 'Post Impressions' },
        { value: 'engagement_rate', label: 'Engagement Rate (%)' },
        { value: 'profile_views', label: 'Profile Views' },
        { value: 'website_clicks', label: 'Website Clicks' },
        { value: 'post_likes', label: 'Post Likes' },
        { value: 'post_comments', label: 'Post Comments' },
        { value: 'post_shares', label: 'Post Shares' },
        { value: 'page_views', label: 'Website Page Views' },
        { value: 'bounce_rate', label: 'Website Bounce Rate (%)' },
        { value: 'session_duration', label: 'Avg Session Duration (sec)' },
        { value: 'email_open_rate', label: 'Email Open Rate (%)' },
        { value: 'email_click_rate', label: 'Email Click Rate (%)' }
    ];

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="font-black text-lg uppercase tracking-tight">{entry ? 'Edit Metric' : 'Record Metric'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <Input label="Date" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Platform</label>
                            <select className="w-full border-2 border-gray-200 rounded-xl p-2.5 text-sm focus:border-orange-400 outline-none" value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})}>
                                {Object.entries(PLATFORMS).map(([key, p]) => (
                                    <option key={key} value={key}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Metric</label>
                            <select className="w-full border-2 border-gray-200 rounded-xl p-2.5 text-sm focus:border-orange-400 outline-none" value={formData.metric} onChange={e => setFormData({...formData, metric: e.target.value})}>
                                {METRICS.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Current Value" type="number" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} placeholder="e.g., 150" />
                        <Input label="Previous Value (optional)" type="number" value={formData.previousValue} onChange={e => setFormData({...formData, previousValue: e.target.value})} placeholder="Last recorded" />
                    </div>
                    <Input label="Related Post URL (optional)" value={formData.postUrl} onChange={e => setFormData({...formData, postUrl: e.target.value})} placeholder="https://..." />
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Notes</label>
                        <textarea className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-orange-400 outline-none min-h-[60px]" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="What happened? Why did this metric change?" />
                    </div>
                </div>
                <div className="bg-gray-50 border-t p-4 flex justify-end gap-2 rounded-b-2xl">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={() => { if (!formData.value) return alert('Enter a value'); onSave(formData); }} variant="primary">
                        <CheckCircle size={14} className="mr-1" /> Save Metric
                    </Button>
                </div>
            </div>
        </div>
    );
};

// --- Campaign Modal ---
const CampaignModal = ({ campaign, onSave, onClose }) => {
    const [formData, setFormData] = useState(campaign || {
        name: '', objective: '', platforms: ['linkedin'], startDate: '', endDate: '',
        budget: '', targetAudience: '', keyMessages: '', status: 'planning',
        assignedTo: 'azia', tasks: '', successMetrics: '', notes: ''
    });

    const togglePlatform = (p) => {
        const platforms = formData.platforms.includes(p) ? formData.platforms.filter(x => x !== p) : [...formData.platforms, p];
        setFormData({...formData, platforms});
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
                    <h2 className="font-black text-lg uppercase tracking-tight">{campaign ? 'Edit Campaign' : 'New Campaign'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <Input label="Campaign Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g., Q1 2026 Energy Savings Campaign" />
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Objective</label>
                        <select className="w-full border-2 border-gray-200 rounded-xl p-2.5 text-sm focus:border-orange-400 outline-none" value={formData.objective} onChange={e => setFormData({...formData, objective: e.target.value})}>
                            <option value="">Select objective...</option>
                            <option value="brand_awareness">Brand Awareness - Get our name out there</option>
                            <option value="lead_generation">Lead Generation - Get quote requests</option>
                            <option value="engagement">Engagement - Build community & trust</option>
                            <option value="website_traffic">Website Traffic - Drive visits to karnot.com</option>
                            <option value="product_launch">Product Launch - Promote new offering</option>
                            <option value="event">Event Promotion - Trade show or seminar</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Platforms</label>
                        <div className="flex gap-2">
                            {Object.entries(PLATFORMS).map(([key, p]) => (
                                <button key={key} onClick={() => togglePlatform(key)} className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all ${formData.platforms.includes(key) ? `${p.bg} ${p.color} ${p.border}` : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                    <p.icon size={14} /> {p.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Start Date" type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                        <Input label="End Date" type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Budget (PHP)" type="number" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} placeholder="0 for organic only" />
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Assign To</label>
                            <select className="w-full border-2 border-gray-200 rounded-xl p-2.5 text-sm focus:border-orange-400 outline-none" value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})}>
                                {TEAM_MEMBERS.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Target Audience</label>
                        <textarea className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-orange-400 outline-none min-h-[60px]" value={formData.targetAudience} onChange={e => setFormData({...formData, targetAudience: e.target.value})} placeholder="e.g., Hotel & resort facility managers in Metro Manila and Cebu..." />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Key Messages</label>
                        <textarea className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-orange-400 outline-none min-h-[60px]" value={formData.keyMessages} onChange={e => setFormData({...formData, keyMessages: e.target.value})} placeholder="What are the main points we want to communicate?" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Success Metrics</label>
                        <textarea className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-orange-400 outline-none min-h-[60px]" value={formData.successMetrics} onChange={e => setFormData({...formData, successMetrics: e.target.value})} placeholder="How will we measure if this campaign was successful?" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Campaign Status</label>
                        <select className="w-full border-2 border-gray-200 rounded-xl p-2.5 text-sm focus:border-orange-400 outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                            <option value="planning">Planning</option>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>
                <div className="sticky bottom-0 bg-gray-50 border-t p-4 flex justify-end gap-2 rounded-b-2xl">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={() => { if (!formData.name.trim()) return alert('Enter a campaign name'); onSave(formData); }} variant="primary">
                        <CheckCircle size={14} className="mr-1" /> Save Campaign
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function SocialMediaPlanner({ user, initialTab = 'overview' }) {
    // --- State ---
    const [activeTab, setActiveTab] = useState(initialTab);
    const [posts, setPosts] = useState([]);
    const [analytics, setAnalytics] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [pillars, setPillars] = useState([]);
    const [trainingProgress, setTrainingProgress] = useState({});
    
    // --- Modal State ---
    const [showPostEditor, setShowPostEditor] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [editingAnalytics, setEditingAnalytics] = useState(null);
    const [showCampaignModal, setShowCampaignModal] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState(null);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printTeamFilter, setPrintTeamFilter] = useState('all');
    
    // --- Filters ---
    const [filterPlatform, setFilterPlatform] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterAssignee, setFilterAssignee] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // --- Firebase Real-time Listeners ---
    useEffect(() => {
        if (!user) return;
        
        const unsubPosts = onSnapshot(
            query(collection(db, "users", user.uid, "social_posts"), orderBy("createdAt", "desc")),
            (snap) => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
            (err) => { console.warn("Social Posts Error:", err); setPosts([]); }
        );

        const unsubAnalytics = onSnapshot(
            query(collection(db, "users", user.uid, "social_analytics"), orderBy("date", "desc")),
            (snap) => setAnalytics(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
            (err) => { console.warn("Analytics Error:", err); setAnalytics([]); }
        );

        const unsubCampaigns = onSnapshot(
            query(collection(db, "users", user.uid, "social_campaigns"), orderBy("createdAt", "desc")),
            (snap) => setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
            (err) => { console.warn("Campaigns Error:", err); setCampaigns([]); }
        );

        const unsubPillars = onSnapshot(
            query(collection(db, "users", user.uid, "content_pillars"), orderBy("createdAt", "desc")),
            (snap) => {
                const savedPillars = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setPillars(savedPillars.length > 0 ? savedPillars : CONTENT_PILLAR_TEMPLATES);
            },
            (err) => { console.warn("Pillars Error:", err); setPillars(CONTENT_PILLAR_TEMPLATES); }
        );

        const unsubTraining = onSnapshot(
            query(collection(db, "users", user.uid, "training_progress")),
            (snap) => {
                const progress = {};
                snap.docs.forEach(d => { progress[d.id] = d.data(); });
                setTrainingProgress(progress);
            },
            (err) => { console.warn("Training Error:", err); setTrainingProgress({}); }
        );

        return () => { unsubPosts(); unsubAnalytics(); unsubCampaigns(); unsubPillars(); unsubTraining(); };
    }, [user]);

    // --- CRUD Handlers ---
    const handleSavePost = async (postData) => {
        try {
            if (editingPost?.id) {
                await updateDoc(doc(db, "users", user.uid, "social_posts", editingPost.id), {
                    ...postData, lastModified: serverTimestamp()
                });
            } else {
                await addDoc(collection(db, "users", user.uid, "social_posts"), {
                    ...postData, createdAt: serverTimestamp(), lastModified: serverTimestamp()
                });
            }
            setShowPostEditor(false);
            setEditingPost(null);
        } catch (e) { console.error("Save Post Error:", e); alert("Error saving post"); }
    };

    const handleDeletePost = async (id) => {
        if (window.confirm("Delete this post?")) {
            await deleteDoc(doc(db, "users", user.uid, "social_posts", id));
        }
    };

    const handleSaveAnalytics = async (data) => {
        try {
            if (editingAnalytics?.id) {
                await updateDoc(doc(db, "users", user.uid, "social_analytics", editingAnalytics.id), {
                    ...data, lastModified: serverTimestamp()
                });
            } else {
                await addDoc(collection(db, "users", user.uid, "social_analytics"), {
                    ...data, createdAt: serverTimestamp()
                });
            }
            setShowAnalyticsModal(false);
            setEditingAnalytics(null);
        } catch (e) { console.error("Save Analytics Error:", e); }
    };

    const handleDeleteAnalytics = async (id) => {
        if (window.confirm("Delete this metric entry?")) {
            await deleteDoc(doc(db, "users", user.uid, "social_analytics", id));
        }
    };

    const handleSaveCampaign = async (data) => {
        try {
            if (editingCampaign?.id) {
                await updateDoc(doc(db, "users", user.uid, "social_campaigns", editingCampaign.id), {
                    ...data, lastModified: serverTimestamp()
                });
            } else {
                await addDoc(collection(db, "users", user.uid, "social_campaigns"), {
                    ...data, createdAt: serverTimestamp()
                });
            }
            setShowCampaignModal(false);
            setEditingCampaign(null);
        } catch (e) { console.error("Save Campaign Error:", e); }
    };

    const handleDeleteCampaign = async (id) => {
        if (window.confirm("Delete this campaign?")) {
            await deleteDoc(doc(db, "users", user.uid, "social_campaigns", id));
        }
    };

    const handleSavePillar = async (pillar) => {
        try {
            await addDoc(collection(db, "users", user.uid, "content_pillars"), {
                ...pillar, createdAt: serverTimestamp()
            });
        } catch (e) { console.error("Save Pillar Error:", e); }
    };

    const handleDeletePillar = async (id) => {
        if (window.confirm("Delete this content pillar?")) {
            await deleteDoc(doc(db, "users", user.uid, "content_pillars", id));
        }
    };

    const handleTrainingToggle = async (moduleId, stepIndex) => {
        const current = trainingProgress[moduleId] || { completedSteps: [] };
        const completedSteps = current.completedSteps || [];
        const updated = completedSteps.includes(stepIndex) 
            ? completedSteps.filter(s => s !== stepIndex)
            : [...completedSteps, stepIndex];
        
        try {
            const ref = doc(db, "users", user.uid, "training_progress", moduleId);
            await setDoc(ref, { completedSteps: updated, lastUpdated: serverTimestamp() }, { merge: true });
        } catch (e) { console.error("Training Progress Error:", e); }
    };

    const initializePillars = async () => {
        if (pillars.length > 0 && pillars[0]?.id) return;
        for (const pillar of CONTENT_PILLAR_TEMPLATES) {
            await addDoc(collection(db, "users", user.uid, "content_pillars"), {
                ...pillar, createdAt: serverTimestamp()
            });
        }
    };

    // --- Computed Values ---
    const filteredPosts = useMemo(() => {
        return posts.filter(p => {
            if (filterPlatform !== 'all' && p.platform !== filterPlatform) return false;
            if (filterStatus !== 'all' && p.status !== filterStatus) return false;
            if (filterAssignee !== 'all' && p.assignedTo !== filterAssignee) return false;
            if (searchTerm && !p.title?.toLowerCase().includes(searchTerm.toLowerCase()) && !p.content?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return true;
        });
    }, [posts, filterPlatform, filterStatus, filterAssignee, searchTerm]);

    const stats = useMemo(() => ({
        totalPosts: posts.length,
        published: posts.filter(p => p.status === 'PUBLISHED').length,
        scheduled: posts.filter(p => p.status === 'SCHEDULED').length,
        drafts: posts.filter(p => p.status === 'DRAFT' || p.status === 'IDEA').length,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        totalMetrics: analytics.length
    }), [posts, campaigns, analytics]);

    // --- Tab Config ---
    const TABS = [
        { id: 'overview', label: 'Overview', icon: Layout },
        { id: 'content', label: 'Content Planner', icon: Calendar },
        { id: 'pillars', label: 'Content Pillars', icon: Target },
        { id: 'schedule', label: 'Best Times', icon: Clock },
        { id: 'analytics', label: 'Analytics Tracker', icon: BarChart2 },
        { id: 'campaigns', label: 'Campaigns', icon: Zap },
        { id: 'training', label: 'Training Hub', icon: BookOpen }
    ];

    // ==========================================
    // RENDER
    // ==========================================
    return (
        <div className="space-y-6 pb-20">
            {/* HEADER */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 tracking-tight uppercase leading-none mb-1">
                        Social Media <span className="text-orange-600">Planner</span>
                    </h1>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                        Content Planning | Analytics | Training | karnot.com
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => { setEditingPost(null); setShowPostEditor(true); }} variant="primary" className="text-xs font-black uppercase tracking-wide">
                        <Plus size={14} className="mr-1" /> New Post
                    </Button>
                    <Button onClick={() => { setShowPrintModal(true); }} variant="secondary" className="text-xs font-bold">
                        <Printer size={14} className="mr-1" /> Print Tasks
                    </Button>
                </div>
            </div>

            {/* STATS BAR */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Total Posts', value: stats.totalPosts, icon: FileText, color: 'orange' },
                    { label: 'Published', value: stats.published, icon: CheckCircle, color: 'green' },
                    { label: 'Scheduled', value: stats.scheduled, icon: Clock, color: 'purple' },
                    { label: 'Drafts & Ideas', value: stats.drafts, icon: Edit, color: 'yellow' },
                    { label: 'Active Campaigns', value: stats.activeCampaigns, icon: Zap, color: 'blue' },
                    { label: 'Metrics Tracked', value: stats.totalMetrics, icon: BarChart2, color: 'pink' }
                ].map((s, i) => (
                    <div key={i} className={`bg-white rounded-xl border-2 border-${s.color}-100 p-3 text-center shadow-sm`}>
                        <s.icon size={18} className={`mx-auto mb-1 text-${s.color}-500`} />
                        <p className="text-2xl font-black text-gray-800">{s.value}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                            activeTab === tab.id 
                                ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* ====== TAB: OVERVIEW ====== */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Welcome / Getting Started */}
                    <Card className="border-2 border-orange-100">
                        <div className="flex items-start gap-4">
                            <div className="bg-orange-100 rounded-xl p-3">
                                <Lightbulb size={24} className="text-orange-600" />
                            </div>
                            <div>
                                <h2 className="font-black text-lg uppercase tracking-tight text-gray-800 mb-2">Welcome to Your Social Media Command Centre</h2>
                                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                                    This is where Stuart, Azia, and Zaldy can plan, create, and track all social media content for Karnot. 
                                    LinkedIn is your primary platform for B2B engagement. Use this planner to stay consistent, track what works, and grow your online presence.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Linkedin size={16} className="text-blue-700" />
                                            <span className="font-bold text-xs text-blue-800 uppercase">LinkedIn (Primary)</span>
                                        </div>
                                        <p className="text-[11px] text-blue-600">Your main B2B platform. Post 3-4 times per week. Focus on industry expertise and project showcases.</p>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Facebook size={16} className="text-blue-600" />
                                            <span className="font-bold text-xs text-blue-800 uppercase">Facebook</span>
                                        </div>
                                        <p className="text-[11px] text-blue-600">Good for local Philippine audience. Share company updates, behind-the-scenes, and community content.</p>
                                    </div>
                                    <div className="bg-pink-50 border border-pink-200 rounded-xl p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Instagram size={16} className="text-pink-600" />
                                            <span className="font-bold text-xs text-pink-800 uppercase">Instagram</span>
                                        </div>
                                        <p className="text-[11px] text-pink-600">Visual platform. Installation photos, project videos, team culture. Use Stories and Reels.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <button onClick={() => { setEditingPost(null); setShowPostEditor(true); }} className="bg-white rounded-xl border-2 border-gray-100 p-4 hover:border-orange-300 hover:shadow-lg transition-all text-left group">
                            <Plus size={20} className="text-orange-500 mb-2 group-hover:scale-110 transition-transform" />
                            <h3 className="font-bold text-sm text-gray-800">Create New Post</h3>
                            <p className="text-[10px] text-gray-500 mt-1">Plan content for LinkedIn, Facebook, or Instagram</p>
                        </button>
                        <button onClick={() => { setShowAnalyticsModal(true); setEditingAnalytics(null); }} className="bg-white rounded-xl border-2 border-gray-100 p-4 hover:border-blue-300 hover:shadow-lg transition-all text-left group">
                            <BarChart2 size={20} className="text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                            <h3 className="font-bold text-sm text-gray-800">Record Metrics</h3>
                            <p className="text-[10px] text-gray-500 mt-1">Log follower counts, engagement rates, website stats</p>
                        </button>
                        <button onClick={() => { setShowCampaignModal(true); setEditingCampaign(null); }} className="bg-white rounded-xl border-2 border-gray-100 p-4 hover:border-purple-300 hover:shadow-lg transition-all text-left group">
                            <Zap size={20} className="text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
                            <h3 className="font-bold text-sm text-gray-800">Start Campaign</h3>
                            <p className="text-[10px] text-gray-500 mt-1">Plan a multi-post initiative around a theme</p>
                        </button>
                        <button onClick={() => setActiveTab('training')} className="bg-white rounded-xl border-2 border-gray-100 p-4 hover:border-green-300 hover:shadow-lg transition-all text-left group">
                            <BookOpen size={20} className="text-green-500 mb-2 group-hover:scale-110 transition-transform" />
                            <h3 className="font-bold text-sm text-gray-800">Training Hub</h3>
                            <p className="text-[10px] text-gray-500 mt-1">Step-by-step guides for LinkedIn, SEO, and more</p>
                        </button>
                    </div>

                    {/* Team Overview */}
                    <Card>
                        <h3 className="font-black text-sm uppercase tracking-wide text-gray-700 mb-4 flex items-center gap-2">
                            <Users size={16} className="text-orange-500" /> Team Members
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {TEAM_MEMBERS.map(member => {
                                const memberPosts = posts.filter(p => p.assignedTo === member.id);
                                const memberPublished = memberPosts.filter(p => p.status === 'PUBLISHED').length;
                                const memberPending = memberPosts.filter(p => p.status !== 'PUBLISHED').length;
                                return (
                                    <div key={member.id} className={`border-2 border-${member.color}-100 bg-${member.color}-50/30 rounded-xl p-4`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`w-10 h-10 rounded-full bg-${member.color}-500 flex items-center justify-center text-white font-black text-lg`}>
                                                {member.name[0]}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-gray-800">{member.name}</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">{member.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 text-center">
                                            <div className="flex-1 bg-white rounded-lg p-2">
                                                <p className="text-lg font-black text-gray-800">{memberPosts.length}</p>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase">Assigned</p>
                                            </div>
                                            <div className="flex-1 bg-white rounded-lg p-2">
                                                <p className="text-lg font-black text-green-600">{memberPublished}</p>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase">Published</p>
                                            </div>
                                            <div className="flex-1 bg-white rounded-lg p-2">
                                                <p className="text-lg font-black text-yellow-600">{memberPending}</p>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase">Pending</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Recent Posts */}
                    {posts.length > 0 && (
                        <Card>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-black text-sm uppercase tracking-wide text-gray-700 flex items-center gap-2">
                                    <Clock size={16} className="text-orange-500" /> Recent Posts
                                </h3>
                                <Button onClick={() => setActiveTab('content')} variant="secondary" className="text-xs">
                                    View All <ArrowRight size={12} className="ml-1" />
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {posts.slice(0, 5).map(post => {
                                    const platform = PLATFORMS[post.platform] || PLATFORMS.linkedin;
                                    const status = POST_STATUS[post.status] || POST_STATUS.IDEA;
                                    return (
                                        <div key={post.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                            <platform.icon size={18} className={platform.color} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-gray-800 truncate">{post.title}</p>
                                                <p className="text-[10px] text-gray-500">
                                                    {post.scheduledDate || 'No date set'} | {TEAM_MEMBERS.find(t => t.id === post.assignedTo)?.name || 'Unassigned'}
                                                </p>
                                            </div>
                                            <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-full border ${status.color}`}>{status.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* ====== TAB: CONTENT PLANNER ====== */}
            {activeTab === 'content' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <Card className="!p-4">
                        <div className="flex flex-wrap gap-3 items-center">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input className="w-full pl-9 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-orange-400 outline-none" placeholder="Search posts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                            <select className="border-2 border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-orange-400 outline-none" value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
                                <option value="all">All Platforms</option>
                                {Object.entries(PLATFORMS).map(([key, p]) => <option key={key} value={key}>{p.name}</option>)}
                            </select>
                            <select className="border-2 border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-orange-400 outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="all">All Statuses</option>
                                {Object.entries(POST_STATUS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
                            </select>
                            <select className="border-2 border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-orange-400 outline-none" value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
                                <option value="all">All Team</option>
                                {TEAM_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <Button onClick={() => { setEditingPost(null); setShowPostEditor(true); }} variant="primary" className="text-xs">
                                <Plus size={14} className="mr-1" /> New Post
                            </Button>
                        </div>
                    </Card>

                    {/* Posts List */}
                    {filteredPosts.length === 0 ? (
                        <Card className="text-center py-12">
                            <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                            <h3 className="font-black text-lg text-gray-400 uppercase">No Posts Yet</h3>
                            <p className="text-sm text-gray-400 mt-2">Click "New Post" to start planning your social media content!</p>
                            <Button onClick={() => { setEditingPost(null); setShowPostEditor(true); }} variant="primary" className="mt-4 text-xs mx-auto">
                                <Plus size={14} className="mr-1" /> Create Your First Post
                            </Button>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredPosts.map(post => {
                                const platform = PLATFORMS[post.platform] || PLATFORMS.linkedin;
                                const status = POST_STATUS[post.status] || POST_STATUS.IDEA;
                                const assignee = TEAM_MEMBERS.find(t => t.id === post.assignedTo);
                                return (
                                    <Card key={post.id} className="!p-4 hover:shadow-xl transition-shadow border-l-4" style={{ borderLeftColor: post.priority === 'high' ? '#dc2626' : post.priority === 'medium' ? '#f59e0b' : '#22c55e' }}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <platform.icon size={16} className={platform.color} />
                                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => { setEditingPost(post); setShowPostEditor(true); }} className="text-gray-400 hover:text-blue-500 transition-colors"><Edit size={14} /></button>
                                                <button onClick={() => handleDeletePost(post.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-sm text-gray-800 mb-1">{post.title}</h4>
                                        {post.content && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{post.content}</p>}
                                        {post.pillar && (
                                            <span className="inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 mb-2">{post.pillar}</span>
                                        )}
                                        {post.hashtags && <p className="text-[10px] text-blue-500 mb-2 truncate">{post.hashtags}</p>}
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
                                            <div className="flex items-center gap-1.5">
                                                {assignee && (
                                                    <div className={`w-5 h-5 rounded-full bg-${assignee.color}-500 flex items-center justify-center text-white font-bold text-[8px]`}>
                                                        {assignee.name[0]}
                                                    </div>
                                                )}
                                                <span className="text-[10px] text-gray-500">{assignee?.name || 'Unassigned'}</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                <Calendar size={10} /> {post.scheduledDate || 'No date'}
                                            </span>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ====== TAB: CONTENT PILLARS ====== */}
            {activeTab === 'pillars' && (
                <div className="space-y-4">
                    <Card className="border-2 border-blue-100 !p-4">
                        <div className="flex items-start gap-3">
                            <HelpCircle size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-sm text-gray-800 mb-1">What are Content Pillars?</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Content pillars are the 3-5 main topics your brand talks about regularly. They keep your content focused and consistent.
                                    For Karnot, these are the categories that define your expertise. Every post you create should fit into one of these pillars.
                                    <strong> Think of them as the "chapters" of your brand story.</strong>
                                </p>
                            </div>
                        </div>
                    </Card>

                    {(!pillars[0]?.id) && (
                        <Card className="text-center py-8">
                            <Target size={48} className="mx-auto mb-4 text-gray-300" />
                            <h3 className="font-bold text-lg text-gray-600 mb-2">Set Up Your Content Pillars</h3>
                            <p className="text-sm text-gray-400 mb-4">We have prepared 5 recommended pillars for Karnot. Click below to save them to your account.</p>
                            <Button onClick={initializePillars} variant="primary" className="mx-auto text-xs">
                                <Plus size={14} className="mr-1" /> Initialize Recommended Pillars
                            </Button>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(pillars[0]?.id ? pillars : CONTENT_PILLAR_TEMPLATES).map((pillar, i) => (
                            <Card key={pillar.id || i} className={`!p-5 border-2 border-${pillar.color}-100 hover:shadow-lg transition-shadow`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{pillar.icon}</span>
                                        <h3 className={`font-black text-sm uppercase tracking-tight text-${pillar.color}-700`}>{pillar.name}</h3>
                                    </div>
                                    {pillar.id && (
                                        <button onClick={() => handleDeletePillar(pillar.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-600 mb-3 leading-relaxed">{pillar.description}</p>
                                <div className="space-y-1.5">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Example Posts:</p>
                                    {pillar.examples?.map((ex, j) => (
                                        <div key={j} className="flex items-start gap-2 text-[11px] text-gray-500">
                                            <ArrowRight size={10} className={`text-${pillar.color}-400 flex-shrink-0 mt-0.5`} />
                                            <span>{ex}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <p className="text-[10px] text-gray-400">
                                        <strong>{posts.filter(p => p.pillar === pillar.name).length}</strong> posts using this pillar
                                    </p>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* ====== TAB: BEST POSTING TIMES ====== */}
            {activeTab === 'schedule' && (
                <div className="space-y-4">
                    <Card className="border-2 border-green-100 !p-4">
                        <div className="flex items-start gap-3">
                            <Clock size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-sm text-gray-800 mb-1">When to Post for Maximum Engagement</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    These are recommended posting times based on industry research for Philippine B2B audiences. 
                                    As you track your own analytics, you will learn what works best specifically for Karnot's audience. 
                                    <strong> Start with these times and adjust based on your own data.</strong>
                                </p>
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(BEST_POSTING_TIMES).map(([key, data]) => {
                            const platform = PLATFORMS[key];
                            return (
                                <Card key={key} className={`!p-5 border-2 ${platform.border}`}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <platform.icon size={20} className={platform.color} />
                                        <h3 className="font-black text-sm uppercase tracking-tight text-gray-800">{platform.name}</h3>
                                        {PLATFORMS[key].primary && (
                                            <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">Primary</span>
                                        )}
                                    </div>
                                    
                                    <div className="mb-3">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Best Days</p>
                                        <div className="flex gap-2">
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                                                const fullDay = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }[day];
                                                const isRecommended = data.days.includes(fullDay);
                                                return (
                                                    <div key={day} className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                                        isRecommended ? `${platform.bg} ${platform.color} border-2 ${platform.border}` : 'bg-gray-50 text-gray-400'
                                                    }`}>
                                                        {day}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Best Times</p>
                                        <div className="flex gap-2 flex-wrap">
                                            {data.times.map((time, i) => (
                                                <span key={i} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${platform.bg} ${platform.color} border ${platform.border}`}>
                                                    <Clock size={10} className="inline mr-1" />{time}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className={`${platform.bg} rounded-lg p-3 mt-3`}>
                                        <p className="text-[11px] text-gray-600 leading-relaxed">
                                            <Lightbulb size={12} className="inline mr-1 text-orange-500" />
                                            <strong>Tip:</strong> {data.note}
                                        </p>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Weekly Posting Template */}
                    <Card>
                        <h3 className="font-black text-sm uppercase tracking-wide text-gray-700 mb-4 flex items-center gap-2">
                            <Calendar size={16} className="text-orange-500" /> Suggested Weekly Posting Schedule
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-gray-500">Day</th>
                                        <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-blue-600"><Linkedin size={12} className="inline mr-1" />LinkedIn</th>
                                        <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-blue-500"><Facebook size={12} className="inline mr-1" />Facebook</th>
                                        <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-pink-500"><Instagram size={12} className="inline mr-1" />Instagram</th>
                                        <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-green-600"><Globe size={12} className="inline mr-1" />Website</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { day: 'Monday', linkedin: 'Industry tip or insight', facebook: '-', instagram: 'Story: Monday motivation', website: 'Publish blog post' },
                                        { day: 'Tuesday', linkedin: 'Project showcase / case study', facebook: 'Share blog post', instagram: '-', website: '-' },
                                        { day: 'Wednesday', linkedin: 'Educational content', facebook: 'Behind-the-scenes photo', instagram: 'Reel: Quick tip or demo', website: '-' },
                                        { day: 'Thursday', linkedin: 'Company news or milestone', facebook: '-', instagram: 'Story: Team day', website: '-' },
                                        { day: 'Friday', linkedin: '-', facebook: 'Community or fun post', instagram: 'Post: Installation gallery', website: '-' },
                                    ].map((row, i) => (
                                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                                            <td className="px-3 py-2.5 font-bold text-gray-700">{row.day}</td>
                                            <td className="px-3 py-2.5 text-gray-600">{row.linkedin}</td>
                                            <td className="px-3 py-2.5 text-gray-600">{row.facebook}</td>
                                            <td className="px-3 py-2.5 text-gray-600">{row.instagram}</td>
                                            <td className="px-3 py-2.5 text-gray-600">{row.website}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <p className="text-[11px] text-orange-700">
                                <strong>Azia's Daily Routine:</strong> Spend 15 min each morning engaging with posts on LinkedIn (like, comment, share). 
                                Then check the planner for today's scheduled content. Prepare tomorrow's post in the afternoon.
                            </p>
                        </div>
                    </Card>
                </div>
            )}

            {/* ====== TAB: ANALYTICS TRACKER ====== */}
            {activeTab === 'analytics' && (
                <div className="space-y-4">
                    <Card className="border-2 border-purple-100 !p-4">
                        <div className="flex items-start gap-3">
                            <BarChart2 size={20} className="text-purple-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-sm text-gray-800 mb-1">Track Your Growth</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Record your social media metrics here weekly. Track follower growth, engagement rates, website traffic from Google Analytics, 
                                    and email campaign performance. <strong>Azia: Record numbers every Monday morning as part of your weekly routine.</strong>
                                </p>
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-between items-center">
                        <h3 className="font-black text-sm uppercase tracking-wide text-gray-700">Recorded Metrics</h3>
                        <Button onClick={() => { setEditingAnalytics(null); setShowAnalyticsModal(true); }} variant="primary" className="text-xs">
                            <Plus size={14} className="mr-1" /> Record Metric
                        </Button>
                    </div>

                    {analytics.length === 0 ? (
                        <Card className="text-center py-12">
                            <BarChart2 size={48} className="mx-auto mb-4 text-gray-300" />
                            <h3 className="font-black text-lg text-gray-400 uppercase">No Metrics Recorded Yet</h3>
                            <p className="text-sm text-gray-400 mt-2 mb-4">Start tracking your social media and website performance!</p>
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-md mx-auto text-left">
                                <p className="text-xs font-bold text-blue-800 uppercase mb-2">What to Track Weekly:</p>
                                <ul className="text-[11px] text-blue-600 space-y-1">
                                    <li>- LinkedIn: Followers, Post impressions, Profile views</li>
                                    <li>- Website: Page views, Bounce rate (from Google Analytics)</li>
                                    <li>- Facebook: Page likes, Post reach</li>
                                    <li>- Email: Open rate, Click rate (when you send campaigns)</li>
                                </ul>
                            </div>
                        </Card>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(PLATFORMS).map(([key, platform]) => {
                                    const platformMetrics = analytics.filter(a => a.platform === key);
                                    const latestFollowers = platformMetrics.find(a => a.metric === 'followers');
                                    return (
                                        <div key={key} className={`bg-white rounded-xl border-2 ${platform.border} p-3`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <platform.icon size={16} className={platform.color} />
                                                <span className="font-bold text-xs text-gray-700">{platform.name}</span>
                                            </div>
                                            <p className="text-xl font-black text-gray-800">
                                                {latestFollowers ? Number(latestFollowers.value).toLocaleString() : '-'}
                                            </p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Followers</p>
                                            {latestFollowers?.previousValue && (
                                                <p className={`text-[10px] font-bold mt-1 ${Number(latestFollowers.value) >= Number(latestFollowers.previousValue) ? 'text-green-600' : 'text-red-600'}`}>
                                                    {Number(latestFollowers.value) >= Number(latestFollowers.previousValue) ? '+' : ''}
                                                    {Number(latestFollowers.value) - Number(latestFollowers.previousValue)} from last
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Metrics Table */}
                            <Card className="!p-0 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-gray-50 border-b">
                                                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-gray-500">Date</th>
                                                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-gray-500">Platform</th>
                                                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-gray-500">Metric</th>
                                                <th className="px-4 py-3 text-right font-bold uppercase tracking-wider text-gray-500">Value</th>
                                                <th className="px-4 py-3 text-right font-bold uppercase tracking-wider text-gray-500">Change</th>
                                                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-gray-500">Notes</th>
                                                <th className="px-4 py-3 text-center font-bold uppercase tracking-wider text-gray-500">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analytics.map(entry => {
                                                const platform = PLATFORMS[entry.platform] || PLATFORMS.linkedin;
                                                const change = entry.previousValue ? Number(entry.value) - Number(entry.previousValue) : null;
                                                return (
                                                    <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                                                        <td className="px-4 py-3 font-bold text-gray-700">{entry.date}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`flex items-center gap-1 ${platform.color}`}>
                                                                <platform.icon size={12} /> {platform.name}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600 capitalize">{entry.metric?.replace(/_/g, ' ')}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-gray-800">{Number(entry.value).toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            {change !== null && (
                                                                <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {change >= 0 ? '+' : ''}{change.toLocaleString()}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{entry.notes || '-'}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex justify-center gap-1">
                                                                <button onClick={() => { setEditingAnalytics(entry); setShowAnalyticsModal(true); }} className="text-gray-400 hover:text-blue-500"><Edit size={14} /></button>
                                                                <button onClick={() => handleDeleteAnalytics(entry.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </>
                    )}

                    {/* Google Analytics Quick Guide */}
                    <Card className="border-2 border-green-100">
                        <h3 className="font-black text-sm uppercase tracking-wide text-gray-700 mb-3 flex items-center gap-2">
                            <Globe size={16} className="text-green-500" /> Google Analytics Quick Reference for karnot.com
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Where to Find Key Numbers</p>
                                {[
                                    { metric: 'Total Users', where: 'Home Dashboard > Users card', icon: Users },
                                    { metric: 'Page Views', where: 'Engagement > Pages and Screens', icon: Eye },
                                    { metric: 'Traffic Sources', where: 'Acquisition > Traffic Acquisition', icon: TrendingUp },
                                    { metric: 'Bounce Rate', where: 'Engagement > Overview', icon: Activity },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-green-50 rounded-lg p-2">
                                        <item.icon size={14} className="text-green-600 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-gray-700">{item.metric}</p>
                                            <p className="text-[10px] text-gray-500">{item.where}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs font-bold text-gray-700 mb-2">Azia's Weekly Analytics Checklist:</p>
                                <div className="space-y-1.5">
                                    {[
                                        'Log into analytics.google.com',
                                        'Note total users for the week',
                                        'Check top 5 pages visited',
                                        'Record traffic sources breakdown',
                                        'Check if any contact forms were submitted',
                                        'Record all numbers in Analytics Tracker above',
                                        'Compare with last week - what grew? What dropped?'
                                    ].map((step, i) => (
                                        <div key={i} className="flex items-start gap-2 text-[11px] text-gray-600">
                                            <span className="font-black text-orange-500 text-[10px] mt-0.5">{i + 1}.</span>
                                            <span>{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* ====== TAB: CAMPAIGNS ====== */}
            {activeTab === 'campaigns' && (
                <div className="space-y-4">
                    <Card className="border-2 border-purple-100 !p-4">
                        <div className="flex items-start gap-3">
                            <Zap size={20} className="text-purple-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-sm text-gray-800 mb-1">Campaign Manager</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Campaigns are coordinated efforts around a specific theme or goal. For example: "Q1 Hotel Energy Savings Campaign" 
                                    might include 8 LinkedIn posts, 4 Facebook posts, 2 blog articles, and an email newsletter - all about energy savings in hotels.
                                </p>
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-between items-center">
                        <h3 className="font-black text-sm uppercase tracking-wide text-gray-700">Your Campaigns</h3>
                        <Button onClick={() => { setEditingCampaign(null); setShowCampaignModal(true); }} variant="primary" className="text-xs">
                            <Plus size={14} className="mr-1" /> New Campaign
                        </Button>
                    </div>

                    {campaigns.length === 0 ? (
                        <Card className="text-center py-12">
                            <Zap size={48} className="mx-auto mb-4 text-gray-300" />
                            <h3 className="font-black text-lg text-gray-400 uppercase">No Campaigns Yet</h3>
                            <p className="text-sm text-gray-400 mt-2 mb-4">Create your first marketing campaign to coordinate your social media efforts!</p>
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 max-w-md mx-auto text-left">
                                <p className="text-xs font-bold text-purple-800 uppercase mb-2">Campaign Ideas for Karnot:</p>
                                <ul className="text-[11px] text-purple-600 space-y-1">
                                    <li>- "Energy Savings Month" - showcase ROI for different industries</li>
                                    <li>- "Meet the Team" series - introduce Stuart, Azia, and Zaldy</li>
                                    <li>- "Philippine Heat Pump Guide" - educational content series</li>
                                    <li>- "Customer Spotlight" - monthly client success stories</li>
                                </ul>
                            </div>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {campaigns.map(campaign => {
                                const statusColors = {
                                    planning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
                                    active: 'bg-green-100 text-green-700 border-green-300',
                                    paused: 'bg-orange-100 text-orange-700 border-orange-300',
                                    completed: 'bg-gray-100 text-gray-600 border-gray-300'
                                };
                                const assignee = TEAM_MEMBERS.find(t => t.id === campaign.assignedTo);
                                return (
                                    <Card key={campaign.id} className="!p-5 hover:shadow-lg transition-shadow">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-full border ${statusColors[campaign.status] || statusColors.planning}`}>
                                                {campaign.status}
                                            </span>
                                            <div className="flex gap-1">
                                                <button onClick={() => { setEditingCampaign(campaign); setShowCampaignModal(true); }} className="text-gray-400 hover:text-blue-500"><Edit size={14} /></button>
                                                <button onClick={() => handleDeleteCampaign(campaign.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        <h3 className="font-black text-sm text-gray-800 uppercase tracking-tight mb-2">{campaign.name}</h3>
                                        {campaign.objective && (
                                            <p className="text-[10px] text-gray-500 mb-2">
                                                <Target size={10} className="inline mr-1" />
                                                {campaign.objective.replace(/_/g, ' ')}
                                            </p>
                                        )}
                                        {campaign.targetAudience && <p className="text-xs text-gray-600 mb-2 line-clamp-2">{campaign.targetAudience}</p>}
                                        
                                        <div className="flex gap-1.5 mb-3">
                                            {campaign.platforms?.map(p => {
                                                const platform = PLATFORMS[p];
                                                return platform ? <platform.icon key={p} size={14} className={platform.color} /> : null;
                                            })}
                                        </div>

                                        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                            <div className="flex items-center gap-1.5">
                                                {assignee && (
                                                    <div className={`w-5 h-5 rounded-full bg-${assignee.color}-500 flex items-center justify-center text-white font-bold text-[8px]`}>
                                                        {assignee.name[0]}
                                                    </div>
                                                )}
                                                <span className="text-[10px] text-gray-500">{assignee?.name}</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400">
                                                {campaign.startDate && campaign.endDate ? `${campaign.startDate} to ${campaign.endDate}` : 'No dates set'}
                                            </span>
                                        </div>
                                        {campaign.budget && Number(campaign.budget) > 0 && (
                                            <p className="text-[10px] text-orange-600 font-bold mt-2">Budget: PHP {Number(campaign.budget).toLocaleString()}</p>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ====== TAB: TRAINING HUB ====== */}
            {activeTab === 'training' && (
                <div className="space-y-4">
                    <Card className="border-2 border-green-100 !p-4">
                        <div className="flex items-start gap-3">
                            <Award size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-sm text-gray-800 mb-1">Training Hub - Learn Step by Step</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    These training modules will walk you through everything you need to know about social media marketing, Google Analytics, SEO, and email campaigns.
                                    <strong> Azia: Work through these modules one at a time. Check off each step as you complete it. Ask Stuart if you need help!</strong>
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Progress Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        {TRAINING_MODULES.map(module => {
                            const progress = trainingProgress[module.id]?.completedSteps || [];
                            const total = module.steps.length;
                            const completed = progress.length;
                            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                            const platform = module.platform !== 'all' ? PLATFORMS[module.platform] : null;
                            return (
                                <div key={module.id} className="bg-white rounded-xl border-2 border-gray-100 p-3 text-center">
                                    {platform ? <platform.icon size={18} className={`mx-auto mb-1 ${platform.color}`} /> : <BookOpen size={18} className="mx-auto mb-1 text-green-500" />}
                                    <p className="font-bold text-[10px] text-gray-700 mb-1 line-clamp-1">{module.title.split(' - ')[0]}</p>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                        <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${percent}%` }}></div>
                                    </div>
                                    <p className="text-[9px] text-gray-400 font-bold">{completed}/{total} steps</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Module Cards */}
                    {TRAINING_MODULES.map(module => {
                        const progress = trainingProgress[module.id]?.completedSteps || [];
                        const total = module.steps.length;
                        const completed = progress.length;
                        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                        const platform = module.platform !== 'all' ? PLATFORMS[module.platform] : null;

                        return (
                            <Card key={module.id} className="!p-0 overflow-hidden">
                                <div className={`p-4 ${platform ? platform.bg : 'bg-green-50'} border-b`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {platform ? <platform.icon size={20} className={platform.color} /> : <BookOpen size={20} className="text-green-600" />}
                                            <div>
                                                <h3 className="font-black text-sm uppercase tracking-tight text-gray-800">{module.title}</h3>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-white text-gray-600 border">{module.difficulty}</span>
                                                    <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock size={10} /> {module.duration}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-gray-800">{percent}%</p>
                                            <p className="text-[9px] text-gray-500 font-bold">{completed}/{total} done</p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-white/50 rounded-full h-2 mt-3">
                                        <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${percent}%` }}></div>
                                    </div>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {module.steps.map((step, stepIdx) => {
                                        const isDone = progress.includes(stepIdx);
                                        return (
                                            <div key={stepIdx} className={`p-4 ${isDone ? 'bg-green-50/30' : 'hover:bg-gray-50'} transition-colors`}>
                                                <div className="flex items-start gap-3">
                                                    <button onClick={() => handleTrainingToggle(module.id, stepIdx)} className="flex-shrink-0 mt-0.5">
                                                        {isDone ? (
                                                            <CheckSquare size={18} className="text-green-500" />
                                                        ) : (
                                                            <Square size={18} className="text-gray-300 hover:text-orange-400 transition-colors" />
                                                        )}
                                                    </button>
                                                    <div className="flex-1">
                                                        <h4 className={`font-bold text-sm mb-1 ${isDone ? 'text-green-700 line-through' : 'text-gray-800'}`}>
                                                            Step {stepIdx + 1}: {step.title}
                                                        </h4>
                                                        <p className="text-xs text-gray-600 leading-relaxed">{step.content}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ====== MODALS ====== */}
            {showPostEditor && (
                <PostEditorModal 
                    post={editingPost} 
                    onSave={handleSavePost} 
                    onClose={() => { setShowPostEditor(false); setEditingPost(null); }}
                    pillars={pillars[0]?.id ? pillars : CONTENT_PILLAR_TEMPLATES}
                />
            )}

            {showAnalyticsModal && (
                <AnalyticsModal 
                    entry={editingAnalytics} 
                    onSave={handleSaveAnalytics} 
                    onClose={() => { setShowAnalyticsModal(false); setEditingAnalytics(null); }}
                />
            )}

            {showCampaignModal && (
                <CampaignModal 
                    campaign={editingCampaign} 
                    onSave={handleSaveCampaign} 
                    onClose={() => { setShowCampaignModal(false); setEditingCampaign(null); }}
                />
            )}

            {showPrintModal && (
                <PrintableTaskList 
                    tasks={posts.map(p => ({
                        title: p.title,
                        platform: p.platform,
                        dueDate: p.scheduledDate,
                        priority: p.priority,
                        status: p.status === 'PUBLISHED' ? 'done' : 'pending',
                        assignedTo: p.assignedTo
                    }))}
                    teamMember={printTeamFilter}
                    onClose={() => setShowPrintModal(false)}
                />
            )}
        </div>
    );
}
