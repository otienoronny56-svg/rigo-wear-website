const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'credvsfvhxuvhkwpsxck.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyZWR2c2Z2aHh1dmhrd3BzeGNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3NzQ3NywiZXhwIjoyMDgzODUzNDc3fQ.fUyDf5KDC183qHvxy-mgqFenIFlOb7k8JEHr6xpOGyw';

const CHILD_IMG = 'C:/Users/ronny/.gemini/antigravity/brain/22f73a4c-f25d-4533-a2de-6c85d109fd26/blog_square_children_1775741324869.png';

async function uploadFile(localPath, remoteName) {
    const fileContent = fs.readFileSync(localPath);
    const options = {
        hostname: SUPABASE_URL,
        path: `/storage/v1/object/product-images/${remoteName}`,
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'image/png'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => resolve(`https://${SUPABASE_URL}/storage/v1/object/public/product-images/${remoteName}`));
        });
        req.on('error', reject);
        req.write(fileContent);
        req.end();
    });
}

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

async function tripleMigration() {
    try {
        console.log('Uploading 3rd square image...');
        const childUrl = await uploadFile(CHILD_IMG, 'square_junior.png');
        console.log('Junior Image Uploaded successfully.');

        console.log('Clearing old insights...');
        await apiRequest('DELETE', '/rest/v1/insights?id=not.is.null'); 
        
        console.log('Injecting Triple Square Blogs...');
        const ritualUrl = 'https://credvsfvhxuvhkwpsxck.supabase.co/storage/v1/object/public/product-images/square_ritual.png';
        const execUrl = 'https://credvsfvhxuvhkwpsxck.supabase.co/storage/v1/object/public/product-images/square_exec.png';

        await apiRequest('POST', '/rest/v1/insights', [
            {
                title: 'The Signature Ritual: Luxury Experience',
                excerpt: 'BY: Ronny Winstone | Stepping into a RIGO atelier is the beginning of a transformation. Discover why the "Bespoke Fitting" is the most exclusive hour.',
                link_url: ritualUrl,
                created_at: new Date().toISOString()
            },
            {
                title: 'The Modern Executive: Boardroom Presence',
                excerpt: 'BY: Rigobert Song | Leadership requires more than just vision; it requires a presence that speaks before you do. Crafting corporate identity.',
                link_url: execUrl,
                created_at: new Date(Date.now() - 3600000).toISOString()
            },
            {
                title: 'Bespoke Junior: The Next Generation',
                excerpt: 'BY: Winstone Ronny | Excellence knows no age. Introducing our new line of bespoke suits for the younger gentleman, crafted with RIGO perfection.',
                link_url: childUrl,
                created_at: new Date(Date.now() - 7200000).toISOString()
            }
        ]);

        console.log('SUCCESS: TRIPLE CONTENT LIVE.');
    } catch (err) {
        console.error('Migration Failed:', err);
    }
}

tripleMigration();
