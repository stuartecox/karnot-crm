/**
 * Brevo API Proxy - Netlify Function
 * Securely proxies requests to Brevo API so the API key stays server-side.
 * The API key is set as BREVO_API_KEY environment variable in Netlify Dashboard.
 */

const BREVO_API_BASE = 'https://api.brevo.com/v3';

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const API_KEY = process.env.BREVO_API_KEY;
    if (!API_KEY) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'BREVO_API_KEY not configured. Add it in Netlify Dashboard → Site Settings → Environment Variables.' })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { endpoint, method = 'GET', data } = body;

        if (!endpoint) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing endpoint parameter' }) };
        }

        const fetchOptions = {
            method: method.toUpperCase(),
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'api-key': API_KEY
            }
        };

        if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            fetchOptions.body = JSON.stringify(data);
        }

        // Build URL with query params for GET requests
        let url = `${BREVO_API_BASE}${endpoint}`;
        if (data && method.toUpperCase() === 'GET') {
            const params = new URLSearchParams(data).toString();
            if (params) url += `?${params}`;
        }

        const response = await fetch(url, fetchOptions);

        let responseBody;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            responseBody = await response.json();
        } else {
            responseBody = await response.text();
        }

        return {
            statusCode: response.status,
            headers,
            body: JSON.stringify(responseBody)
        };
    } catch (err) {
        console.error('Brevo proxy error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message })
        };
    }
};
