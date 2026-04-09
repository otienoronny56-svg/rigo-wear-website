const https = require('https');

const SUPABASE_URL = 'credvsfvhxuvhkwpsxck.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyZWR2c2Z2aHh1dmhrd3BzeGNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3NzQ3NywiZXhwIjoyMDgzODUzNDc3fQ.fUyDf5KDC183qHvxy-mgqFenIFlOb7k8JEHr6xpOGyw';

const RITUAL_IMG = 'https://credvsfvhxuvhkwpsxck.supabase.co/storage/v1/object/public/product-images/square_ritual.png';
const EXEC_IMG = 'https://credvsfvhxuvhkwpsxck.supabase.co/storage/v1/object/public/product-images/square_exec.png';

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

async function remappedMigration() {
    try {
        console.log('Clearing ALL current insights...');
        // Standard way to delete all in PostgREST is targeting a column that is always not null
        await apiRequest('DELETE', '/rest/v1/insights?id=not.is.null'); 
        
        console.log('Injecting Remapped Square Blogs...');
        // We use link_url for the image
        // We use excerpt for BY: <Author> | <Content>
        await apiRequest('POST', '/rest/v1/insights', [
            {
                title: 'The Signature Ritual: Why a Rigo Fitting is an Experience, Not a Chore',
                excerpt: 'BY: Ronny Winstone | Stepping into a RIGO atelier is the beginning of a transformation. Discover why the "Bespoke Fitting" is the most exclusive hour in a gentleman\'s calendar.',
                link_url: RITUAL_IMG,
                created_at: new Date().toISOString()
            },
            {
                title: 'The Modern Executive: Redefining African Excellence in the Boardroom',
                excerpt: 'BY: Rigobert Song | Leadership requires more than just vision; it requires a presence that speaks before you do. Here is how the modern Rigo bespoke suit is crafting corporate identity.',
                link_url: EXEC_IMG,
                created_at: new Date(Date.now() - 3600000).toISOString()
            }
        ]);

        console.log('SUCCESS: REMAPPED CONTENT LIVE.');
    } catch (err) {
        console.error('Migration Failed:', err);
    }
}

remappedMigration();
