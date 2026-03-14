// netlify/functions/scrape-org.js
// Scrapes government department and industry organization websites
// for contact details, news, events, and key information
const axios = require('axios');
const cheerio = require('cheerio');

const cleanText = (text) => {
    return text.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
};

// Extract emails from text
const extractEmails = (text) => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex) || [];
    // Filter out common false positives
    return [...new Set(matches)]
        .filter(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.gif') && !e.endsWith('.css') && !e.endsWith('.js'))
        .slice(0, 10);
};

// Extract phone numbers (PH format)
const extractPhones = (text) => {
    const phoneRegex = /(?:\+63|0)[\s-]?(?:\d[\s-]?){9,11}|\(\d{2,3}\)\s*\d{3,4}[\s-]?\d{4}|\d{3,4}[-\s]\d{4}/g;
    const matches = text.match(phoneRegex) || [];
    return [...new Set(matches.map(p => p.trim()))].filter(p => p.length >= 7).slice(0, 10);
};

// Extract addresses
const extractAddresses = (text) => {
    const addressPatterns = [
        /\d+[\w\s]+(?:street|st\.|avenue|ave\.|road|rd\.|drive|dr\.|boulevard|blvd\.)[\w\s,]+(?:city|municipality|province|metro manila|makati|quezon|taguig|pasig|mandaluyong|manila)/gi,
        /(?:floor|flr\.?|level|rm\.?|room|unit|bldg\.?|building)\s*[\w\s#]+,[\w\s,]+(?:city|metro manila|makati|quezon)/gi,
    ];
    const addresses = [];
    addressPatterns.forEach(regex => {
        const matches = text.match(regex) || [];
        matches.forEach(m => addresses.push(cleanText(m)));
    });
    return [...new Set(addresses)].slice(0, 5);
};

// Extract news/announcements
const extractNews = ($) => {
    const news = [];
    const newsSelectors = [
        'article', '.news-item', '.announcement', '.post', '.entry',
        '.news', '.update', '.press-release', '.media-item'
    ];

    newsSelectors.forEach(selector => {
        $(selector).each((i, elem) => {
            const $elem = $(elem);
            const title = $elem.find('h1, h2, h3, h4, .title, .entry-title, a').first().text().trim();
            const date = $elem.find('time, .date, .posted-on, .entry-date').first().text().trim();
            const excerpt = $elem.find('p, .excerpt, .summary, .entry-content').first().text().trim();
            const link = $elem.find('a').first().attr('href') || '';

            if (title && title.length > 10 && title.length < 300) {
                news.push({
                    title: cleanText(title).substring(0, 200),
                    date: cleanText(date).substring(0, 50),
                    excerpt: cleanText(excerpt).substring(0, 300),
                    link: link.startsWith('http') ? link : ''
                });
            }
        });
    });

    const seen = new Set();
    return news.filter(n => {
        const key = n.title.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).slice(0, 10);
};

// Extract events
const extractEvents = ($, fullText) => {
    const events = [];
    const eventSelectors = [
        '.event', '.calendar-item', '.event-item', '.upcoming',
        '[class*="event"]', '[class*="calendar"]'
    ];

    eventSelectors.forEach(selector => {
        $(selector).each((i, elem) => {
            const $elem = $(elem);
            const title = $elem.find('h1, h2, h3, h4, .title').first().text().trim();
            const date = $elem.find('time, .date, .event-date').first().text().trim();
            const location = $elem.find('.location, .venue').first().text().trim();

            if (title && title.length > 5) {
                events.push({
                    title: cleanText(title).substring(0, 200),
                    date: cleanText(date).substring(0, 50),
                    location: cleanText(location).substring(0, 200),
                });
            }
        });
    });

    return events.slice(0, 10);
};

// Extract key people / leadership
const extractPeople = ($, fullText) => {
    const people = [];
    const peopleSelectors = [
        '.staff', '.team-member', '.leadership', '.official',
        '.officer', '.director', '.board-member', '[class*="team"]',
        '[class*="leadership"]', '[class*="officer"]'
    ];

    peopleSelectors.forEach(selector => {
        $(selector).each((i, elem) => {
            const $elem = $(elem);
            const name = $elem.find('h2, h3, h4, .name, .title, strong').first().text().trim();
            const position = $elem.find('.position, .designation, .role, p, span').first().text().trim();

            if (name && name.length > 3 && name.length < 100) {
                people.push({
                    name: cleanText(name),
                    position: cleanText(position).substring(0, 150),
                });
            }
        });
    });

    return people.slice(0, 15);
};

// Detect relevant keywords for energy/HVAC industry
const detectRelevantKeywords = (text) => {
    const lowerText = text.toLowerCase();
    const keywords = {
        energy_efficiency: ['energy efficiency', 'energy conservation', 'energy saving', 'meps', 'energy label'],
        hvac: ['hvac', 'air conditioning', 'refrigeration', 'ventilation', 'cooling', 'heating'],
        renewable: ['renewable energy', 'solar', 'wind power', 'geothermal', 'biomass'],
        cold_chain: ['cold chain', 'cold storage', 'refrigerated', 'frozen', 'temperature control'],
        green_building: ['green building', 'berde', 'leed', 'sustainable building', 'energy efficient building'],
        compliance: ['compliance', 'regulation', 'standard', 'certification', 'accreditation'],
        investment: ['investment', 'incentive', 'tax holiday', 'boi', 'peza', 'sipp'],
        infrastructure: ['infrastructure', 'construction', 'building code', 'building permit'],
    };

    const found = {};
    Object.entries(keywords).forEach(([category, terms]) => {
        const matches = terms.filter(t => lowerText.includes(t));
        if (matches.length > 0) found[category] = matches;
    });
    return found;
};

// ═══════════════════════════════════════════════════════════════════════
// Multiple browser-like User-Agent profiles to rotate through
// ═══════════════════════════════════════════════════════════════════════
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

// ═══════════════════════════════════════════════════════════════════════
// Fetch with retries and rotating headers
// ═══════════════════════════════════════════════════════════════════════
async function fetchWithRetry(url, maxRetries = 3) {
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const userAgent = USER_AGENTS[attempt % USER_AGENTS.length];

        const headerSets = [
            // Attempt 1: Full browser-like headers
            {
                'User-Agent': userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
                'Connection': 'keep-alive',
            },
            // Attempt 2: Minimal headers (some servers are strict about unexpected headers)
            {
                'User-Agent': userAgent,
                'Accept': '*/*',
            },
            // Attempt 3: Googlebot-compatible (many PH govt sites allow Googlebot)
            {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                'Accept': 'text/html,application/xhtml+xml',
            },
        ];

        const headers = headerSets[attempt % headerSets.length];

        try {
            console.log(`Attempt ${attempt + 1}/${maxRetries} for ${url} with UA: ${headers['User-Agent'].substring(0, 40)}...`);

            const response = await axios.get(url, {
                timeout: 20000,
                headers,
                maxRedirects: 5,
                validateStatus: (status) => status < 500, // Accept 2xx, 3xx, 4xx
            });

            // If we got a 403 or 401, try next attempt
            if (response.status === 403 || response.status === 401) {
                console.log(`Got ${response.status}, trying different headers...`);
                lastError = new Error(`HTTP ${response.status}`);
                // Small delay before retry
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            if (response.status >= 400) {
                lastError = new Error(`HTTP ${response.status}`);
                continue;
            }

            return { html: response.data, status: response.status, method: 'direct' };
        } catch (err) {
            lastError = err;
            console.log(`Attempt ${attempt + 1} failed: ${err.message}`);
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    // ─── Fallback: Try Google webcache ─────────────────────────
    try {
        console.log(`Trying Google webcache for ${url}...`);
        const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}&num=1`;
        const cacheResponse = await axios.get(cacheUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': USER_AGENTS[0],
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            maxRedirects: 5,
            validateStatus: (status) => status < 500,
        });

        if (cacheResponse.status === 200 && cacheResponse.data) {
            console.log('Google webcache succeeded!');
            return { html: cacheResponse.data, status: 200, method: 'google-cache' };
        }
    } catch (cacheErr) {
        console.log(`Google cache fallback failed: ${cacheErr.message}`);
    }

    // ─── Fallback: Try with www prefix or without ──────────────
    try {
        const urlObj = new URL(url);
        const altUrl = urlObj.hostname.startsWith('www.')
            ? url.replace('www.', '')
            : url.replace('://', '://www.');

        console.log(`Trying alternate URL: ${altUrl}`);
        const altResponse = await axios.get(altUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': USER_AGENTS[0],
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            maxRedirects: 5,
        });

        if (altResponse.data) {
            console.log('Alternate URL succeeded!');
            return { html: altResponse.data, status: altResponse.status, method: 'alternate-url' };
        }
    } catch (altErr) {
        console.log(`Alternate URL failed: ${altErr.message}`);
    }

    throw lastError || new Error('All fetch attempts failed');
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { url, orgName, orgAcronym } = JSON.parse(event.body);

        if (!url) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'URL is required' }) };
        }

        console.log(`Scraping organization: ${orgAcronym || orgName} at ${url}`);

        const fetchResult = await fetchWithRetry(url);
        const html = fetchResult.html;

        const $ = cheerio.load(html);
        $('script, style, noscript, iframe').remove();

        const fullText = $('body').text();
        const cleanedText = cleanText(fullText);

        // Extract all data
        const emails = extractEmails(cleanedText);
        const phones = extractPhones(cleanedText);
        const addresses = extractAddresses(cleanedText);
        const news = extractNews($);
        const events = extractEvents($, cleanedText);
        const people = extractPeople($, cleanedText);
        const relevantKeywords = detectRelevantKeywords(cleanedText);

        const title = $('title').text().trim() || orgName || '';
        const metaDescription = $('meta[name="description"]').attr('content') || '';
        const ogImage = $('meta[property="og:image"]').attr('content') || '';

        // Extract social media links
        const socialLinks = {};
        $('a[href*="facebook.com"]').first().each((_, el) => { socialLinks.facebook = $(el).attr('href'); });
        $('a[href*="twitter.com"], a[href*="x.com"]').first().each((_, el) => { socialLinks.twitter = $(el).attr('href'); });
        $('a[href*="linkedin.com"]').first().each((_, el) => { socialLinks.linkedin = $(el).attr('href'); });
        $('a[href*="youtube.com"]').first().each((_, el) => { socialLinks.youtube = $(el).attr('href'); });
        $('a[href*="instagram.com"]').first().each((_, el) => { socialLinks.instagram = $(el).attr('href'); });

        // Extract important links (about, contact, membership pages)
        const importantLinks = [];
        $('a').each((_, el) => {
            const href = $(el).attr('href') || '';
            const text = $(el).text().trim().toLowerCase();
            if (text && href && (
                text.includes('contact') || text.includes('about') || text.includes('member') ||
                text.includes('event') || text.includes('seminar') || text.includes('convention') ||
                text.includes('officer') || text.includes('board') || text.includes('leadership')
            )) {
                importantLinks.push({
                    text: $(el).text().trim().substring(0, 100),
                    url: href.startsWith('http') ? href : (href.startsWith('/') ? new URL(href, url).toString() : '')
                });
            }
        });

        const results = {
            success: true,
            url,
            orgName: orgName || title,
            orgAcronym: orgAcronym || '',
            scrapedAt: new Date().toISOString(),
            fetchMethod: fetchResult.method,
            title: title.substring(0, 200),
            description: metaDescription.substring(0, 500),
            image: ogImage,
            emails,
            phones,
            addresses,
            news,
            events,
            people,
            socialLinks,
            importantLinks: importantLinks.filter(l => l.url).slice(0, 15),
            relevantKeywords,
            textPreview: cleanedText.substring(0, 3000),
        };

        console.log(`Scraped ${orgAcronym} via ${fetchResult.method}: ${emails.length} emails, ${phones.length} phones, ${news.length} news, ${people.length} people`);

        return { statusCode: 200, headers, body: JSON.stringify(results) };

    } catch (error) {
        console.error('Org scraping error:', error.message);

        // Return helpful error with suggestion
        const isBlocked = error.message && (error.message.includes('403') || error.message.includes('401') || error.message.includes('blocked'));
        const isTimeout = error.message && (error.message.includes('timeout') || error.message.includes('ETIMEDOUT'));
        const isDNS = error.message && (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo'));

        let suggestion = '';
        if (isBlocked) suggestion = 'Website blocks automated requests. Try visiting manually and using the LinkedIn parser for contacts instead.';
        else if (isTimeout) suggestion = 'Website took too long to respond. It may be temporarily down.';
        else if (isDNS) suggestion = 'Domain not found. The website URL may have changed.';
        else suggestion = 'Could not reach website. Try again later or visit manually.';

        return {
            statusCode: 200, // Return 200 so frontend gets the JSON properly
            headers,
            body: JSON.stringify({
                success: false,
                error: `${error.message}. ${suggestion}`,
                errorType: isBlocked ? 'blocked' : isTimeout ? 'timeout' : isDNS ? 'dns' : 'unknown',
                suggestion,
            })
        };
    }
};
