// ═══════════════════════════════════════════════════════
// PILOT & PARTNER FORM SUBMISSION → BREVO
// Handles form submissions from landing pages and adds
// contacts to the appropriate Brevo list
// ═══════════════════════════════════════════════════════

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const API_KEY = process.env.BREVO_API_KEY;
    if (!API_KEY) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Brevo API key not configured' }) };
    }

    try {
        const data = JSON.parse(event.body);
        const { formType } = data; // 'pilot' or 'partner'

        // Build contact attributes based on form type
        let attributes = {};
        let listIds = [];
        let email = '';

        if (formType === 'pilot') {
            // Energy Manager — Flagship Pilot Application
            email = data.email;
            attributes = {
                FIRSTNAME: data.firstName || '',
                LASTNAME: data.lastName || '',
                COMPANY: data.companyName || '',
                JOBTITLE: data.jobTitle || '',
                PHONE: data.phone || '',
                // Custom attributes for pilot qualification
                FACILITY_TYPE: data.facilityType || '',
                FACILITY_LOCATION: data.facilityLocation || '',
                DAILY_HOT_WATER_LITERS: data.dailyHotWater || '',
                CURRENT_HEATING: data.currentHeating || '',
                FACILITY_ADDRESS: data.facilityAddress || '',
                NOTES: data.notes || '',
                LEAD_SOURCE: 'Flagship Pilot Landing Page',
                SUBMISSION_DATE: new Date().toISOString().split('T')[0]
            };
            // List ID for pilot submissions — will be created in Brevo
            // Use list ID from env or default to a known list
            listIds = process.env.BREVO_PILOT_LIST_ID
                ? [parseInt(process.env.BREVO_PILOT_LIST_ID)]
                : [];
        } else if (formType === 'partner') {
            // ESCO — Partner Application
            email = data.email;
            attributes = {
                FIRSTNAME: data.firstName || '',
                LASTNAME: data.lastName || '',
                COMPANY: data.companyName || '',
                JOBTITLE: data.jobTitle || '',
                PHONE: data.phone || '',
                // Custom attributes for partner application
                ESCO_SERVICES: data.escoServices || '',
                YEARS_IN_BUSINESS: data.yearsInBusiness || '',
                TEAM_SIZE: data.teamSize || '',
                PREFERRED_TERRITORY: data.preferredTerritory || '',
                EXISTING_CLIENTS: data.existingClients || '',
                INVESTMENT_LEVEL: data.investmentLevel || '',
                WEBSITE: data.website || '',
                NOTES: data.notes || '',
                LEAD_SOURCE: 'ESCO Partner Landing Page',
                SUBMISSION_DATE: new Date().toISOString().split('T')[0]
            };
            listIds = process.env.BREVO_PARTNER_LIST_ID
                ? [parseInt(process.env.BREVO_PARTNER_LIST_ID)]
                : [];
        } else {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid form type' }) };
        }

        if (!email) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email is required' }) };
        }

        // Create or update contact in Brevo
        const contactPayload = {
            email,
            attributes,
            updateEnabled: true,
            ...(listIds.length > 0 ? { listIds } : {})
        };

        const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
            method: 'POST',
            headers: {
                'api-key': API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(contactPayload)
        });

        // 201 = created, 204 = updated (contact already existed)
        if (brevoRes.status === 201 || brevoRes.status === 204) {
            // Send notification email to Stuart
            try {
                await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: {
                        'api-key': API_KEY,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        sender: { name: 'Karnot CRM', email: 'info@karnot.com' },
                        to: [{ email: 'stuart.cox@karnot.com', name: 'Stuart Cox' }],
                        subject: formType === 'pilot'
                            ? `🔥 New Pilot Application: ${data.companyName || email}`
                            : `🤝 New Partner Application: ${data.companyName || email}`,
                        htmlContent: `<h2>${formType === 'pilot' ? 'Flagship Pilot' : 'ESCO Partner'} Application</h2>
                            <table style="font-family:Arial;font-size:14px;border-collapse:collapse;width:100%">
                            ${Object.entries(data).filter(([k]) => k !== 'formType').map(([k, v]) =>
                                `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;width:40%"><strong>${k}</strong></td><td style="padding:8px;border-bottom:1px solid #eee">${v}</td></tr>`
                            ).join('')}
                            </table>
                            <p style="margin-top:20px;color:#999;font-size:12px">Submitted: ${new Date().toLocaleString()}</p>`
                    })
                });
            } catch (notifyErr) {
                // Notification failed but contact was created — don't fail the request
                console.error('Notification email failed:', notifyErr);
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: formType === 'pilot'
                        ? 'Your facility has been submitted for review. We\'ll be in touch within 5 business days.'
                        : 'Your partner application has been received. Stuart will contact you within 48 hours.'
                })
            };
        }

        // Handle Brevo errors
        const errorBody = await brevoRes.text();
        console.error('Brevo contact creation error:', brevoRes.status, errorBody);

        // If contact already exists and update failed, try updating
        if (brevoRes.status === 400) {
            const parsed = JSON.parse(errorBody);
            if (parsed.code === 'duplicate_parameter') {
                // Contact exists — update their attributes
                const updateRes = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
                    method: 'PUT',
                    headers: {
                        'api-key': API_KEY,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ attributes, ...(listIds.length > 0 ? { listIds } : {}) })
                });

                if (updateRes.status === 204) {
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({ success: true, message: 'Application updated successfully.' })
                    };
                }
            }
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to process submission. Please try again or email stuart.cox@karnot.com directly.' })
        };

    } catch (err) {
        console.error('Form handler error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Server error. Please try again.' })
        };
    }
};
