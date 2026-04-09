const https = require('https');

const SUPABASE_URL = 'credvsfvhxuvhkwpsxck.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyZWR2c2Z2aHh1dmhrd3BzeGNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3NzQ3NywiZXhwIjoyMDgzODUzNDc3fQ.fUyDf5KDC183qHvxy-mgqFenIFlOb7k8JEHr6xpOGyw';

async function apiRequest(method, path, body = null) {
    const options = {
        hostname: SUPABASE_URL,
        path: path,
        method: method,
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function forceUpdate() {
    try {
        console.log('Force clearing insights...');
        await apiRequest('DELETE', '/rest/v1/insights?id=neq.0'); // Delete all
        
        console.log('Inserting Article 1 (Ronny Winstone)...');
        await apiRequest('POST', '/rest/v1/insights', {
            title: 'The Signature Ritual: Why a RIGO Fitting is an Experience, Not a Chore',
            author_name: 'Ronny Winstone',
            excerpt: 'Stepping into a RIGO atelier is the beginning of a transformation. Discover why the "Bespoke Fitting" is the most exclusive hour in a gentleman\'s calendar.',
            content: `Bespoke tailoring is more than just fabric and thread; it is a ritual of self-discovery. When Ronny Winstone speaks of the "Signature Ritual," he refers to the moment a client steps into the RIGO atelier and the world outside fades away...`,
            image_url: 'https://credvsfvhxuvhkwpsxck.supabase.co/storage/v1/object/public/product-images/blogs/ritual.png',
            created_at: new Date().toISOString()
        });

        console.log('Inserting Article 2 (Rigobert Song)...');
        await apiRequest('POST', '/rest/v1/insights', {
            title: 'The Modern Executive: Redefining African Excellence in the Boardroom',
            author_name: 'Rigobert Song',
            excerpt: 'Leadership requires more than just vision; it requires a presence that speaks before you do. Here is how the modern Rigo bespoke suit is crafting corporate identity.',
            content: `In the heart of Nairobi’s corporate landscape, a new standard of excellence is emerging. Rigobert Song explores the intersection of power and style for the modern African executive...`,
            image_url: 'https://credvsfvhxuvhkwpsxck.supabase.co/storage/v1/object/public/product-images/blogs/executive.png',
            created_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        });

        console.log('SUCCESS: Content overwritten.');
    } catch (err) {
        console.error('FAILED:', err);
    }
}

forceUpdate();
