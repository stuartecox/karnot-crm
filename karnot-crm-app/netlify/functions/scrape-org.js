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
    return [...new Set(matches)].slice(0, 10);
};

// Extract phone numbers (PH format)
const extractPhones = (text) => {
    const phoneRegex = /(?:\+63|0)[\s-]?(?:\d[\s-]?){9,11}|\(\d{2,3}\)\s*\d{3,4}[\s-]?\d{4}/g;
    const matches = text.match(phoneRegex) || [];
    return [...new Set(matches.map(p => p.trim()))].slice(0, 10);
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

    // Deduplicate by title
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

        const response = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
        });

        const html = response.data;
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

        const results = {
            success: true,
            url,
            orgName: orgName || title,
            orgAcronym: orgAcronym || '',
            scrapedAt: new Date().toISOString(),
            title: title.substring(0, 200),
            description: metaDescription.substring(0, 500),
            image: ogImage,
            emails,
            phones,
            addresses,
            news,
            events,
            people,
            relevantKeywords,
            textPreview: cleanedText.substring(0, 3000),
        };

        console.log(`Scraped ${orgAcronym}: ${emails.length} emails, ${phones.length} phones, ${news.length} news, ${people.length} people`);

        return { statusCode: 200, headers, body: JSON.stringify(results) };

    } catch (error) {
        console.error('Org scraping error:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message,
                details: error.code || 'Could not reach website'
            })
        };
    }
};
