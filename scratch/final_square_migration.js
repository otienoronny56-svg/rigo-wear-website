const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'credvsfvhxuvhkwpsxck.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyZWR2c2Z2aHh1dmhrd3BzeGNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3NzQ3NywiZXhwIjoyMDgzODUzNDc3fQ.fUyDf5KDC183qHvxy-mgqFenIFlOb7k8JEHr6xpOGyw';

const RITUAL_IMG = 'C:/Users/ronny/.gemini/antigravity/brain/22f73a4c-f25d-4533-a2de-6c85d109fd26/blog_square_ritual_1775740229315.png';
const EXEC_IMG = 'C:/Users/ronny/.gemini/antigravity/brain/22f73a4c-f25d-4533-a2de-6c85d109fd26/blog_square_executive_new_1775740259108.png';

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

async function finalMigration() {
    try {
        console.log('Uploading square images...');
        const ritualUrl = await uploadFile(RITUAL_IMG, 'square_ritual.png');
        const execUrl = await uploadFile(EXEC_IMG, 'square_exec.png');
        console.log('SQUARES Uploaded successfully.');

        console.log('Clearing old insights...');
        await apiRequest('DELETE', '/rest/v1/insights?id=neq.0'); 
        
        console.log('Injecting Square Blogs...');
        await apiRequest('POST', '/rest/v1/insights', [
            {
                title: 'The Signature Ritual: Why a Rigo Fitting is an Experience, Not a Chore',
                author_name: 'Ronny Winstone',
                excerpt: 'Stepping into a RIGO atelier is the beginning of a transformation. Discover why the "Bespoke Fitting" is the most exclusive hour in a gentleman\'s calendar.',
                content: `Bespoke tailoring is more than just fabric and thread; it is a ritual of self-discovery. When Ronny Winstone speaks of the "Signature Ritual," he refers to the moment a client steps into the RIGO atelier and the world outside fades away...`,
                image_url: ritualUrl,
                created_at: new Date().toISOString()
            },
            {
                title: 'The Modern Executive: Redefining African Excellence in the Boardroom',
                author_name: 'Rigobert Song',
                excerpt: 'Leadership requires more than just vision; it requires a presence that speaks before you do. Here is how the modern Rigo bespoke suit is crafting corporate identity.',
                content: `In the heart of Nairobi’s corporate landscape, a new standard of excellence is emerging. Rigobert Song explores the intersection of power and style for the modern African executive...`,
                image_url: execUrl,
                created_at: new Date(Date.now() - 3600000).toISOString()
            }
        ]);

        console.log('SUCCESS: SQUARE CONTENT LIVE.');
    } catch (err) {
        console.error('Migration Failed:', err);
    }
}

finalMigration();
