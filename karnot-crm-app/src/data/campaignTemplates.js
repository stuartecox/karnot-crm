// ═══════════════════════════════════════════════════════════════
// KARNOT PRIVATE PARTNER ARMY — EMAIL CAMPAIGN SEQUENCES
// Two tracks: Energy Managers (project fishing) + ESCOs (partner recruitment)
// ═══════════════════════════════════════════════════════════════

// ─── ENERGY MANAGER SEQUENCE ─────────────────────────────────
// Goal: Get 30-40 qualified NCR sites (1,000-5,000L hot water)
// Audience: Corporate energy managers at hotels, F&B, industrial
// Style: Branded HTML — professional, exciting, zero-risk feel
// Landing page: karnot.com/pilot
// ─────────────────────────────────────────────────────────────

export const ENERGY_MANAGER_SEQUENCE = [
    {
        id: 'em_email_1',
        name: 'EM-1: Flagship Pilot Invitation',
        timing: 'Week 1 — Day 1',
        subject: 'Your facility could qualify for a fully-funded energy upgrade',
        preheader: 'Karnot is funding 10 pilot installations in Metro Manila — zero capex, guaranteed savings.',
        tags: ['BRANDED', 'RESPONSIVE', 'WEEK-1'],
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
body{margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif}
.wrap{max-width:600px;margin:0 auto;background:#fff}
.header{background:linear-gradient(135deg,#ea580c 0%,#c2410c 100%);padding:35px 30px;text-align:center}
.header h1{color:#fff;margin:0;font-size:22px;font-weight:900;letter-spacing:1px}
.header p{color:#fed7aa;margin:8px 0 0;font-size:13px;letter-spacing:0.5px}
.hero{background:#1f2937;padding:25px 30px;text-align:center}
.hero h2{color:#fb923c;font-size:26px;font-weight:900;margin:0 0 8px}
.hero p{color:#d1d5db;font-size:14px;margin:0}
.body{padding:30px}
.body p{color:#4b5563;font-size:14px;line-height:1.7;margin:0 0 14px}
.body h3{color:#1f2937;font-size:17px;margin:20px 0 10px}
.callout{background:#fff7ed;border-left:4px solid #ea580c;padding:18px;margin:20px 0;border-radius:0 8px 8px 0}
.callout p{margin:0;color:#9a3412;font-size:13px;line-height:1.6}
.callout strong{color:#ea580c}
.check-list{margin:15px 0;padding:0;list-style:none}
.check-list li{padding:6px 0 6px 28px;position:relative;color:#374151;font-size:14px;line-height:1.5}
.check-list li:before{content:"✓";position:absolute;left:0;top:6px;color:#16a34a;font-weight:900;font-size:16px}
.stats{margin:20px 0}
.stats table{width:100%;border-collapse:collapse}
.stat-box{background:#f9fafb;border-radius:8px;padding:18px 12px;text-align:center}
.stat-num{font-size:28px;font-weight:900;color:#ea580c;display:block}
.stat-label{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-top:4px;display:block}
.cta{display:block;background:#ea580c;color:#fff!important;text-align:center;padding:16px 30px;border-radius:8px;text-decoration:none;font-weight:900;font-size:16px;margin:25px 0;letter-spacing:0.5px}
.cta:hover{background:#c2410c}
.secondary-cta{display:block;background:#fff;color:#ea580c!important;text-align:center;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:10px 0;border:2px solid #ea580c}
.qualify{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:20px 0}
.qualify h4{color:#166534;margin:0 0 10px;font-size:14px;font-weight:900}
.qualify ul{margin:8px 0;padding:0 0 0 18px;color:#166534;font-size:13px}
.qualify ul li{padding:3px 0}
.footer{background:#1f2937;padding:25px;text-align:center;color:#9ca3af;font-size:11px}
.footer a{color:#fb923c;text-decoration:none}
</style></head>
<body><div class="wrap">

<div class="header">
<h1>KARNOT ENERGY SOLUTIONS</h1>
<p>Natural Refrigerant Heat Pump Technology</p>
</div>

<div class="hero">
<h2>FLAGSHIP EaaS PILOT PROGRAM</h2>
<p>Zero-Capex Hot Water System Upgrade · Metro Manila · 2026</p>
</div>

<div class="body">
<p>Dear {{ contact.FIRSTNAME }},</p>

<p>Karnot Energy Solutions is <strong>fully funding 10 pilot installations</strong> of our CO2 and R290 heat pump systems across Metro Manila — and we're looking for facilities like yours.</p>

<div class="callout">
<p><strong>What this means for you:</strong> Zero capital expenditure. We install our heat pump system at no cost. You pay nothing upfront. You simply share a portion of the energy savings — and keep guaranteed savings from Day 1.</p>
</div>

<h3>Why Hot Water?</h3>
<p>If your facility uses electric resistance heaters or LPG/propane boilers for hot water, you're spending 3-4x more than necessary. Our R290 heat pump technology delivers the same hot water using 75% less energy.</p>

<table class="stats" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="30%"><div class="stat-box"><span class="stat-num">75%</span><span class="stat-label">Energy Savings</span></div></td>
<td width="5%"></td>
<td width="30%"><div class="stat-box"><span class="stat-num">₱0</span><span class="stat-label">Upfront Cost</span></div></td>
<td width="5%"></td>
<td width="30%"><div class="stat-box"><span class="stat-num">24/7</span><span class="stat-label">Hot Water Supply</span></div></td>
</tr></table>

<div class="qualify">
<h4>Does Your Facility Qualify?</h4>
<ul>
<li>Located in <strong>Metro Manila (NCR)</strong></li>
<li>Uses <strong>1,000 – 5,000 liters</strong> of hot water daily</li>
<li>Currently using <strong>electric heaters, LPG, or propane boilers</strong></li>
<li>Facility type: <strong>hotel, resort, food processing, hospital, laundry, or industrial</strong></li>
</ul>
</div>

<p>This is <strong>not a sales pitch</strong>. We are BOI-SIPP registered and actively investing in proving our technology across the NCR. Only 10 facilities will be selected for this fully-funded round.</p>

<a href="https://karnot.com/pilot" class="cta">CHECK IF YOUR FACILITY QUALIFIES →</a>

<p style="text-align:center;color:#9ca3af;font-size:12px">Takes 2 minutes. No commitment required.</p>

<h3>What Happens Next?</h3>
<ul class="check-list">
<li><strong>Submit your facility details</strong> — takes 2 minutes</li>
<li><strong>We review and shortlist</strong> — within 5 business days</li>
<li><strong>Free site survey</strong> — our engineers assess your hot water system</li>
<li><strong>Installation</strong> — fully funded, minimal disruption, typically 2-3 days</li>
<li><strong>Start saving</strong> — from the first month</li>
</ul>

<p>I'm personally overseeing this pilot program and would welcome any questions.</p>

<p>Best regards,<br>
<strong>Stuart Cox</strong><br>
CEO, Karnot Energy Solutions Inc.<br>
<span style="color:#9ca3af;font-size:12px">BOI-SIPP Registered · Natural Refrigerant Technology</span></p>
</div>

<div class="footer">
<p><strong>Karnot Energy Solutions Inc.</strong> · Metro Manila, Philippines</p>
<p><a href="https://karnot.com">karnot.com</a> · <a href="https://iheat.ph">iheat.ph</a></p>
<p style="margin-top:12px;font-size:10px">You received this because you are listed as an energy manager or facilities contact.<br>
<a href="{{ unsubscribe }}">Unsubscribe</a> · <a href="{{ update_profile }}">Update preferences</a></p>
</div>

</div></body></html>`
    },

    {
        id: 'em_email_2',
        name: 'EM-2: The Numbers (Follow-up)',
        timing: 'Week 1 — Day 4 (if no response)',
        subject: 'The numbers behind our pilot program (case study inside)',
        preheader: 'A 3,000L/day hotel saved ₱1.2M per year. Here\'s how.',
        tags: ['BRANDED', 'CASE-STUDY', 'WEEK-1'],
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
body{margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif}
.wrap{max-width:600px;margin:0 auto;background:#fff}
.header{background:#ea580c;padding:20px 30px;display:flex;align-items:center}
.header h1{color:#fff;margin:0;font-size:16px;font-weight:900;letter-spacing:1px}
.body{padding:30px}
.body p{color:#4b5563;font-size:14px;line-height:1.7;margin:0 0 14px}
.body h3{color:#1f2937;font-size:16px;margin:20px 0 10px}
.case-study{background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px;margin:20px 0}
.case-study h4{color:#0369a1;margin:0 0 12px;font-size:15px}
.case-study table{width:100%;font-size:13px;color:#374151}
.case-study td{padding:5px 0;border-bottom:1px solid #e0f2fe}
.case-study .label{color:#6b7280;width:55%}
.case-study .value{font-weight:700;text-align:right;color:#0369a1}
.case-study .savings{color:#16a34a;font-weight:900;font-size:16px}
.comparison{margin:20px 0}
.comparison table{width:100%;border-collapse:collapse;font-size:13px}
.comparison th{background:#f9fafb;padding:10px;text-align:left;color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e5e7eb}
.comparison td{padding:10px;border-bottom:1px solid #f3f4f6;color:#374151}
.comparison .old{color:#dc2626;text-decoration:line-through}
.comparison .new{color:#16a34a;font-weight:700}
.cta{display:block;background:#ea580c;color:#fff!important;text-align:center;padding:16px 30px;border-radius:8px;text-decoration:none;font-weight:900;font-size:16px;margin:25px 0}
.pill{display:inline-block;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px}
.footer{background:#1f2937;padding:25px;text-align:center;color:#9ca3af;font-size:11px}
.footer a{color:#fb923c;text-decoration:none}
</style></head>
<body><div class="wrap">

<div class="header"><h1>KARNOT ENERGY SOLUTIONS</h1></div>

<div class="body">
<p>Hi {{ contact.FIRSTNAME }},</p>

<p>I sent you a note earlier about our Flagship EaaS Pilot Program. I wanted to follow up with some real numbers so you can see exactly what this means for a facility like yours.</p>

<div class="case-study">
<h4>📊 Case Study: 80-Room Hotel in Makati</h4>
<table>
<tr><td class="label">Daily hot water demand</td><td class="value">3,000 liters/day</td></tr>
<tr><td class="label">Current system</td><td class="value">LPG boiler (4 x 50kg cylinders/week)</td></tr>
<tr><td class="label">Current monthly cost</td><td class="value">₱152,000/month</td></tr>
<tr><td class="label">Karnot R290 heat pump cost</td><td class="value">₱38,000/month</td></tr>
<tr><td class="label"><strong>Monthly savings</strong></td><td class="value savings">₱114,000/month</td></tr>
<tr><td class="label"><strong>Annual savings</strong></td><td class="value savings">₱1,368,000/year</td></tr>
</table>
</div>

<h3>How the EaaS Model Works</h3>

<div class="comparison">
<table>
<tr><th>Item</th><th>Traditional Purchase</th><th>Karnot EaaS Pilot</th></tr>
<tr><td>Upfront cost</td><td class="old">₱850,000 - ₱1.5M</td><td class="new">₱0</td></tr>
<tr><td>Risk</td><td>You bear all risk</td><td class="new">We bear the risk</td></tr>
<tr><td>Maintenance</td><td>Your responsibility</td><td class="new">Included free</td></tr>
<tr><td>Guaranteed savings</td><td>No guarantee</td><td class="new">Contractual guarantee</td></tr>
<tr><td>Contract term</td><td>n/a</td><td>5 years (flexible)</td></tr>
</table>
</div>

<p><span class="pill">Key Point</span></p>
<p>Under our EaaS model, you keep <strong>25% of the energy savings from Day 1</strong>. For a facility using 3,000L/day, that's approximately <strong>₱28,500/month in your pocket</strong> — for doing nothing except saying yes.</p>

<p>We've opened applications for <strong>10 pilot sites in NCR</strong>. Several slots have already received interest.</p>

<a href="https://karnot.com/pilot" class="cta">APPLY FOR THE PILOT PROGRAM →</a>

<p>Happy to jump on a quick call to walk through the numbers for your specific facility.</p>

<p>Best,<br>
<strong>Stuart Cox</strong><br>
CEO, Karnot Energy Solutions<br>
stuart.cox@karnot.com</p>
</div>

<div class="footer">
<p>Karnot Energy Solutions Inc. · <a href="https://karnot.com">karnot.com</a> · <a href="https://iheat.ph">iheat.ph</a></p>
<p style="margin-top:10px;font-size:10px"><a href="{{ unsubscribe }}">Unsubscribe</a></p>
</div>

</div></body></html>`
    },

    {
        id: 'em_email_3',
        name: 'EM-3: Last Spots (Urgency)',
        timing: 'Week 2 — Day 8 (if no response)',
        subject: 'Only 4 pilot spots remaining — NCR facilities',
        preheader: '6 facilities already shortlisted. Submit before we close applications.',
        tags: ['BRANDED', 'URGENCY', 'WEEK-2'],
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
body{margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif}
.wrap{max-width:600px;margin:0 auto;background:#fff}
.header{background:#ea580c;padding:20px 30px}
.header h1{color:#fff;margin:0;font-size:16px;font-weight:900}
.urgent{background:#fef2f2;border:2px solid #fecaca;padding:20px;text-align:center;margin:0}
.urgent h2{color:#dc2626;margin:0 0 5px;font-size:20px;font-weight:900}
.urgent p{color:#991b1b;margin:0;font-size:13px}
.body{padding:30px}
.body p{color:#4b5563;font-size:14px;line-height:1.7;margin:0 0 14px}
.progress{background:#f3f4f6;border-radius:12px;padding:20px;margin:20px 0}
.progress h4{margin:0 0 12px;color:#1f2937;font-size:14px;font-weight:900}
.bar-wrap{background:#e5e7eb;border-radius:20px;height:24px;overflow:hidden;margin:8px 0}
.bar-fill{background:linear-gradient(90deg,#16a34a,#ea580c);height:100%;border-radius:20px;width:60%;display:flex;align-items:center;justify-content:center}
.bar-fill span{color:#fff;font-size:10px;font-weight:900}
.slots{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.slot{padding:6px 12px;border-radius:6px;font-size:11px;font-weight:700}
.slot.taken{background:#fee2e2;color:#dc2626;text-decoration:line-through}
.slot.open{background:#dcfce7;color:#16a34a}
.cta{display:block;background:#dc2626;color:#fff!important;text-align:center;padding:16px 30px;border-radius:8px;text-decoration:none;font-weight:900;font-size:16px;margin:25px 0}
.footer{background:#1f2937;padding:25px;text-align:center;color:#9ca3af;font-size:11px}
.footer a{color:#fb923c;text-decoration:none}
</style></head>
<body><div class="wrap">

<div class="header"><h1>KARNOT ENERGY SOLUTIONS</h1></div>

<div class="urgent">
<h2>ONLY 4 PILOT SPOTS REMAINING</h2>
<p>Applications close when all 10 slots are filled</p>
</div>

<div class="body">
<p>{{ contact.FIRSTNAME }},</p>

<p>Quick update on our Flagship EaaS Pilot Program — we've had strong interest and <strong>6 of 10 pilot slots have already been shortlisted</strong>.</p>

<div class="progress">
<h4>Pilot Program Status</h4>
<div class="bar-wrap"><div class="bar-fill"><span>6 of 10 Filled</span></div></div>
<div class="slots">
<span class="slot taken">Hotel — Makati</span>
<span class="slot taken">F&B — Pasig</span>
<span class="slot taken">Hospital — QC</span>
<span class="slot taken">Resort — Tagaytay</span>
<span class="slot taken">Laundry — BGC</span>
<span class="slot taken">Factory — Cavite</span>
<span class="slot open">Open Slot</span>
<span class="slot open">Open Slot</span>
<span class="slot open">Open Slot</span>
<span class="slot open">Open Slot</span>
</div>
</div>

<p>If your facility uses 1,000 – 5,000 liters of hot water daily, you could save <strong>₱50,000 – ₱150,000 per month</strong> on your energy bill — at absolutely zero capital cost.</p>

<p>We won't be running another funded pilot round until Q3 2026 at the earliest. If you've been considering this, now is the time.</p>

<a href="https://karnot.com/pilot" class="cta">SECURE YOUR PILOT SLOT →</a>

<p>Or simply reply to this email with your facility name and approximate daily hot water usage — I'll have our team check eligibility immediately.</p>

<p>Stuart Cox<br>
CEO, Karnot Energy Solutions</p>
</div>

<div class="footer">
<p>Karnot Energy Solutions Inc. · <a href="https://karnot.com">karnot.com</a></p>
<p style="margin-top:10px;font-size:10px"><a href="{{ unsubscribe }}">Unsubscribe</a></p>
</div>

</div></body></html>`
    }
];


// ─── ESCO PARTNER SEQUENCE ──────────────────────────────────
// Goal: Recruit 5-10 ESCO partners in NCR, each investing $2,500-$5,000
// Audience: ESCO owners, technical directors, sales managers
// Style: Plain professional text — personal, not "marketing"
// Landing page: iheat.ph/partner
// ────────────────────────────────────────────────────────────

export const ESCO_PARTNER_SEQUENCE = [
    {
        id: 'esco_email_1',
        name: 'ESCO-1: Exclusive Partner Opportunity',
        timing: 'Week 3 — Day 1 (after project pipeline built)',
        subject: 'Exclusive ESCO partnership — R290 heat pumps for NCR',
        preheader: 'We\'re appointing 5 exclusive partners. Territory + projects + 15% hardware discount.',
        tags: ['PLAIN-TEXT', 'PARTNERSHIP', 'WEEK-3'],
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
body{margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif}
.container{max-width:600px;margin:0 auto;background:#fff;padding:40px}
p{color:#374151;font-size:14px;line-height:1.7;margin:0 0 14px}
h3{color:#1f2937;font-size:16px;margin:20px 0 10px}
ul{color:#374151;font-size:14px;line-height:1.8;margin:10px 0;padding-left:20px}
.highlight{background:#fff7ed;border-left:3px solid #ea580c;padding:12px 16px;margin:15px 0;font-size:13px;color:#9a3412}
.highlight strong{color:#ea580c}
.sig{border-top:2px solid #ea580c;padding-top:15px;margin-top:25px}
.sig strong{color:#ea580c}
.sig p{margin:0;font-size:13px;color:#6b7280}
.unsub{text-align:center;margin-top:30px;font-size:11px;color:#9ca3af}
.unsub a{color:#6b7280;text-decoration:none}
.cta-link{color:#ea580c;font-weight:700;text-decoration:none}
</style></head>
<body><div class="container">

<p>Dear {{ contact.FIRSTNAME }},</p>

<p>I'm Stuart Cox, CEO of Karnot Energy Solutions. I'm writing because we're appointing a small number of <strong>exclusive ESCO partners</strong> in Metro Manila, and based on {{ contact.COMPANY }}'s work in the energy services space, I believe there could be a strong fit.</p>

<p>Let me get straight to the point.</p>

<h3>The Opportunity</h3>

<p>Karnot manufactures CO2 and R290 (natural refrigerant) heat pumps — the technology that replaces electric resistance heaters and LPG boilers with 75% less energy consumption. We're the only company in the Philippines offering this at commercial scale.</p>

<p>We are looking for <strong>5 ESCO partners in NCR</strong> who want to:</p>

<ul>
<li>Sell and install R290 heat pump systems to commercial clients</li>
<li>Earn <strong>40%+ gross margins</strong> on each installation</li>
<li>Access <strong>exclusive territory rights</strong> — no competition from other Karnot ESCOs in your zone</li>
<li>Receive <strong>15% hardware discount</strong> on all Karnot equipment</li>
<li>Get <strong>qualified project leads</strong> from our energy manager outreach program</li>
</ul>

<div class="highlight">
<strong>We already have qualified leads.</strong> Our energy manager outreach program has generated interest from hotels, food processing plants, and hospitals across NCR. These facilities need installation partners. That's where you come in.
</div>

<h3>The Equipment</h3>

<p>Our product range includes:</p>
<ul>
<li><strong>AquaHERO R290</strong> — residential/light commercial (200L-500L/day)</li>
<li><strong>CO2 QTON</strong> — medium commercial (1,000-3,000L/day)</li>
<li><strong>CO2 Industrial</strong> — large commercial/industrial (3,000-10,000L/day)</li>
</ul>

<p>All units are natural refrigerant (R290 or CO2), PFAS-free, and ahead of the global regulatory phase-out hitting conventional refrigerants in 2025-2027. This isn't a niche — it's the future of the entire HVAC industry.</p>

<h3>What We're Looking For</h3>

<p>Partners who:</p>
<ul>
<li>Have existing commercial/industrial client relationships in NCR</li>
<li>Can handle electrical and plumbing installation work</li>
<li>Want a long-term product line, not a one-off deal</li>
<li>Are willing to commit to the partnership with a Co-Owner investment ($2,500 - $5,000)</li>
</ul>

<p>The Co-Owner investment isn't a fee — it's equity. It gives you skin in the game and ties your success directly to Karnot's growth. Partners who invest see better support, priority on leads, and a share in the company's upside.</p>

<p>If this interests you, I'd like to schedule a 20-minute call to discuss the territory and project pipeline in your area.</p>

<p>You can learn more and apply at <a href="https://iheat.ph/partner" class="cta-link">iheat.ph/partner</a></p>

<p>Or simply reply to this email.</p>

<div class="sig">
<strong>Stuart Cox</strong>
<p>CEO, Karnot Energy Solutions Inc.</p>
<p>stuart.cox@karnot.com · +63 917 XXX XXXX</p>
<p>BOI-SIPP Registered · karnot.com · iheat.ph</p>
</div>

<div class="unsub">
<p>You received this because {{ contact.COMPANY }} is listed as an energy services company in the Philippines.</p>
<p><a href="{{ unsubscribe }}">Unsubscribe from future emails</a></p>
</div>

</div></body></html>`
    },

    {
        id: 'esco_email_2',
        name: 'ESCO-2: Project Pipeline Proof',
        timing: 'Week 3 — Day 5 (follow-up with pipeline data)',
        subject: 'Re: ESCO partnership — we have 12 qualified projects in NCR',
        preheader: 'Hotels, hospitals, and food plants ready for installation. These projects need a partner.',
        tags: ['PLAIN-TEXT', 'PROJECTS', 'WEEK-3'],
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
body{margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif}
.container{max-width:600px;margin:0 auto;background:#fff;padding:40px}
p{color:#374151;font-size:14px;line-height:1.7;margin:0 0 14px}
h3{color:#1f2937;font-size:16px;margin:20px 0 10px}
table.pipeline{width:100%;border-collapse:collapse;font-size:13px;margin:15px 0}
table.pipeline th{background:#f9fafb;padding:8px 10px;text-align:left;color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e5e7eb}
table.pipeline td{padding:8px 10px;border-bottom:1px solid #f3f4f6;color:#374151}
table.pipeline .hot{color:#dc2626;font-weight:700}
table.pipeline .warm{color:#ea580c;font-weight:700}
.note{background:#eff6ff;border-left:3px solid #3b82f6;padding:12px 16px;margin:15px 0;font-size:13px;color:#1e40af}
.sig{border-top:2px solid #ea580c;padding-top:15px;margin-top:25px}
.sig strong{color:#ea580c}
.sig p{margin:0;font-size:13px;color:#6b7280}
.unsub{text-align:center;margin-top:30px;font-size:11px;color:#9ca3af}
.unsub a{color:#6b7280;text-decoration:none}
.cta-link{color:#ea580c;font-weight:700}
</style></head>
<body><div class="container">

<p>{{ contact.FIRSTNAME }},</p>

<p>Following up on my email about the Karnot ESCO partnership. I wanted to share something concrete — <strong>our energy manager outreach has already generated qualified project interest across NCR</strong>.</p>

<p>Here's a snapshot of the pipeline:</p>

<table class="pipeline">
<tr><th>Facility Type</th><th>Location</th><th>Daily Hot Water</th><th>Status</th></tr>
<tr><td>Boutique Hotel (45 rooms)</td><td>Makati</td><td>2,200L</td><td class="hot">Ready</td></tr>
<tr><td>Food Processing Plant</td><td>Pasig</td><td>4,500L</td><td class="hot">Ready</td></tr>
<tr><td>Hospital Wing</td><td>Quezon City</td><td>3,100L</td><td class="warm">Qualified</td></tr>
<tr><td>Resort & Spa</td><td>Tagaytay</td><td>2,800L</td><td class="hot">Ready</td></tr>
<tr><td>Industrial Laundry</td><td>BGC</td><td>5,000L</td><td class="warm">Qualified</td></tr>
<tr><td>Chain Restaurant (3 sites)</td><td>Mandaluyong</td><td>1,500L each</td><td class="warm">Qualified</td></tr>
</table>

<p>Each of these represents a <strong>₱500,000 – ₱1,500,000 project</strong> for the installation partner — and that's just the hardware. Add service contracts and you're looking at recurring annual revenue per client.</p>

<div class="note">
<strong>The math for you:</strong> At 40%+ gross margin on a ₱1M average installation, that's ₱400,000+ per project. If you close just 3 projects in your first year, that's ₱1.2M in gross profit — against a ₱140,000 ($2,500) partnership investment.
</div>

<p>These facilities need an ESCO to handle the installation and ongoing service. We provide the equipment, the technology training, and the customer relationship. You provide the installation capability and earn the margin.</p>

<p>We're appointing only 5 partners for NCR. Two positions are already in advanced discussions.</p>

<p>Want to see the full project pipeline for your area? Let's talk: <a href="https://iheat.ph/partner" class="cta-link">Apply at iheat.ph/partner</a> or reply to this email.</p>

<div class="sig">
<strong>Stuart Cox</strong>
<p>CEO, Karnot Energy Solutions</p>
<p>stuart.cox@karnot.com</p>
</div>

<div class="unsub"><a href="{{ unsubscribe }}">Unsubscribe</a></div>

</div></body></html>`
    },

    {
        id: 'esco_email_3',
        name: 'ESCO-3: Lock In Your Territory',
        timing: 'Week 4 — Day 10 (closing push)',
        subject: 'Final: 2 NCR partner positions remaining',
        preheader: '3 of 5 ESCO slots filled. Lock in your territory before it\'s gone.',
        tags: ['PLAIN-TEXT', 'CLOSING', 'WEEK-4'],
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
body{margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif}
.container{max-width:600px;margin:0 auto;background:#fff;padding:40px}
p{color:#374151;font-size:14px;line-height:1.7;margin:0 0 14px}
h3{color:#1f2937;font-size:16px;margin:20px 0 10px}
ul{color:#374151;font-size:14px;line-height:1.8;padding-left:20px}
.territory{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:15px;margin:15px 0}
.territory h4{color:#166534;margin:0 0 8px;font-size:14px}
.territory table{width:100%;font-size:13px}
.territory td{padding:4px 0;color:#374151}
.territory .taken{color:#dc2626;text-decoration:line-through}
.territory .open{color:#16a34a;font-weight:700}
.investment{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:15px;margin:15px 0}
.investment h4{color:#9a3412;margin:0 0 8px;font-size:14px}
.investment table{width:100%;font-size:13px}
.investment td{padding:4px 0;color:#374151}
.investment .label{color:#6b7280}
.investment .value{font-weight:700;text-align:right;color:#ea580c}
.sig{border-top:2px solid #ea580c;padding-top:15px;margin-top:25px}
.sig strong{color:#ea580c}
.sig p{margin:0;font-size:13px;color:#6b7280}
.unsub{text-align:center;margin-top:30px;font-size:11px;color:#9ca3af}
.unsub a{color:#6b7280;text-decoration:none}
.cta{display:block;background:#ea580c;color:#fff!important;text-align:center;padding:14px 30px;border-radius:8px;text-decoration:none;font-weight:900;font-size:15px;margin:20px 0}
</style></head>
<body><div class="container">

<p>{{ contact.FIRSTNAME }},</p>

<p>I'll keep this brief. We've filled 3 of the 5 ESCO partner positions for NCR. Two territories are still open.</p>

<div class="territory">
<h4>NCR Territory Status</h4>
<table>
<tr><td class="taken">Makati / BGC</td><td style="text-align:right;color:#dc2626;font-size:12px">Filled</td></tr>
<tr><td class="taken">Quezon City / North</td><td style="text-align:right;color:#dc2626;font-size:12px">Filled</td></tr>
<tr><td class="taken">Pasig / Mandaluyong</td><td style="text-align:right;color:#dc2626;font-size:12px">Filled</td></tr>
<tr><td class="open">South Metro (Paranaque, Las Pinas, Muntinlupa)</td><td style="text-align:right;color:#16a34a;font-size:12px;font-weight:700">OPEN</td></tr>
<tr><td class="open">East Metro (Rizal, Marikina, Antipolo)</td><td style="text-align:right;color:#16a34a;font-size:12px;font-weight:700">OPEN</td></tr>
</table>
</div>

<p>Once these territories are assigned, they're locked for 24 months. No other ESCO can sell Karnot equipment in that zone.</p>

<div class="investment">
<h4>Co-Owner Partnership Investment</h4>
<table>
<tr><td class="label">Minimum investment</td><td class="value">$2,500 (₱146,250)</td></tr>
<tr><td class="label">Standard investment</td><td class="value">$5,000 (₱292,500)</td></tr>
<tr><td class="label">What you get</td><td class="value">Equity + Territory + 15% Discount</td></tr>
<tr><td class="label">Qualified projects waiting</td><td class="value">3-5 per territory</td></tr>
<tr><td class="label">Est. Year 1 gross profit</td><td class="value">₱1.2M - ₱2M</td></tr>
</table>
</div>

<p>This isn't a franchise fee. This is equity in a BOI-registered clean energy company that's already generating revenue. Your $2,500 buys you:</p>

<ul>
<li><strong>Ownership stake</strong> in Karnot Energy Solutions</li>
<li><strong>Exclusive territory</strong> for 24 months</li>
<li><strong>15% hardware discount</strong> on all equipment</li>
<li><strong>Qualified project leads</strong> from our energy manager program</li>
<li><strong>Technical training</strong> on R290/CO2 installation and service</li>
<li><strong>Marketing support</strong> — co-branded materials, case studies</li>
</ul>

<p>I have time for two more partner calls this week. If you're serious about this, let's talk.</p>

<a href="https://iheat.ph/partner" class="cta">APPLY FOR PARTNERSHIP →</a>

<p>Or reply directly — I answer every email personally.</p>

<div class="sig">
<strong>Stuart Cox</strong>
<p>CEO, Karnot Energy Solutions Inc.</p>
<p>stuart.cox@karnot.com</p>
</div>

<div class="unsub"><a href="{{ unsubscribe }}">Unsubscribe</a></div>

</div></body></html>`
    }
];


// ─── SEQUENCE METADATA ──────────────────────────────────────

export const CAMPAIGN_SEQUENCES = {
    energy_managers: {
        id: 'energy_managers',
        name: 'Energy Manager — Flagship Pilot',
        description: 'Fish for projects: Get energy managers at hotels, F&B, hospitals to submit their facilities for a fully-funded EaaS pilot installation.',
        audience: 'Energy Managers, Facilities Managers, Operations Directors',
        landingPage: 'karnot.com/pilot',
        totalEmails: 3,
        duration: '2 weeks',
        goal: '30-40 qualified NCR site submissions',
        color: 'orange',
        emails: ENERGY_MANAGER_SEQUENCE
    },
    esco_partners: {
        id: 'esco_partners',
        name: 'ESCO — Exclusive Partner Recruitment',
        description: 'Recruit ESCO partners: Show them the project pipeline, offer exclusive territory + 15% hardware discount, close $2,500-$5,000 Co-Owner investments.',
        audience: 'ESCO Owners, Technical Directors, Sales Managers',
        landingPage: 'iheat.ph/partner',
        totalEmails: 3,
        duration: '2 weeks (starts Week 3)',
        goal: '5-10 ESCO partners, each investing $2,500-$5,000',
        color: 'blue',
        emails: ESCO_PARTNER_SEQUENCE
    }
};
