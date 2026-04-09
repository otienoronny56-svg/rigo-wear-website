const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'credvsfvhxuvhkwpsxck.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyZWR2c2Z2aHh1dmhrd3BzeGNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3NzQ3NywiZXhwIjoyMDgzODUzNDc3fQ.fUyDf5KDC183qHvxy-mgqFenIFlOb7k8JEHr6xpOGyw';

const RITUAL_IMG_PATH = 'C:/Users/ronny/.gemini/antigravity/brain/22f73a4c-f25d-4533-a2de-6c85d109fd26/blog_signature_ritual_1775739036710.png';
const EXECUTIVE_IMG_PATH = 'C:/Users/ronny/.gemini/antigravity/brain/22f73a4c-f25d-4533-a2de-6c85d109fd26/blog_modern_executive_1775739066808.png';

async function uploadFile(localPath, remoteName) {
    const fileContent = fs.readFileSync(localPath);
    const options = {
        hostname: SUPABASE_URL,
        path: `/storage/v1/object/product-images/blogs/${remoteName}`,
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
            res.on('end', () => resolve(`https://${SUPABASE_URL}/storage/v1/object/public/product-images/blogs/${remoteName}`));
        });
        req.on('error', reject);
        req.write(fileContent);
        req.end();
    });
}

async function updateDB(method, path, body) {
    const options = {
        hostname: SUPABASE_URL,
        path: path,
        method: method,
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    try {
        console.log('--- Starting Editorial Migration ---');
        
        console.log('Uploading Images...');
        const ritualUrl = await uploadFile(RITUAL_IMG_PATH, 'ritual.png');
        const executiveUrl = await uploadFile(EXECUTIVE_IMG_PATH, 'executive.png');
        console.log('Images Uploaded successfully.');

        console.log('Updating Blog 1 (Ronny Winstone)...');
        await updateDB('PATCH', '/rest/v1/insights?id=eq.62e6f3d9-5d61-42d4-a732-30861d42453a', {
            title: 'The Signature Ritual: Why a RIGO Fitting is an Experience, Not a Chore',
            author_name: 'Ronny Winstone',
            excerpt: 'Stepping into a RIGO atelier is the beginning of a transformation. Discover why the "Bespoke Fitting" is the most exclusive hour in a gentleman\'s calendar.',
            content: `Bespoke tailoring is more than just fabric and thread; it is a ritual of self-discovery. When Ronny Winstone speaks of the "Signature Ritual," he refers to the moment a client steps into the RIGO atelier and the world outside fades away.

It begins with the consultation—not a survey of sizes, but a conversation about lifestyle, ambition, and legacy. We don't just measure your chest; we measure your movement. The pattern creation is where the magic starts—a unique blueprint hand-cut specifically for your anatomy.

But the true heart of the ritual is the "Baste Fitting." This is where you see the half-finished garment, pinned and chalked to perfection. It’s a moment of collaboration where you, the client, become the architect of your own elegance. At RIGO WEAR, we don't just dress you; we craft your story.`,
            image_url: ritualUrl,
            created_at: new Date().toISOString()
        });

        console.log('Inserting Blog 2 (Rigobert Song)...');
        await updateDB('POST', '/rest/v1/insights', {
            title: 'The Modern Executive: Redefining African Excellence in the Boardroom',
            author_name: 'Rigobert Song',
            excerpt: 'Leadership requires more than just vision; it requires a presence that speaks before you do. Here is how the modern RIGO bespoke suit is crafting corporate identity.',
            content: `In the heart of Nairobi’s corporate landscape, a new standard of excellence is emerging. Rigobert Song explores the intersection of power and style for the modern African executive.

A RIGO bespoke suit isn't just clothing; it’s a boardroom armor. In an era where first impressions are formed in seconds, your silhouette speaks louder than your slides. We have moved past the era of generic, oversized off-the-rack attire. Today’s leader demands precision.

The "Modern RIGO Man" is someone who values the architectural integrity of a sharp shoulder and the subtle confidence of a hand-rolled lapel. Whether you are closing a multi-million shilling deal or mentoring the next generation of pioneers, your attire should reflect your trajectory. RIGO WEAR is proud to be the sartorial partner for Kenya's most visionary leaders.`,
            image_url: executiveUrl,
            created_at: new Date(Date.now() - 86400000).toISOString() // Yesterday
        });

        console.log('--- Migration Complete! ---');
    } catch (err) {
        console.error('Migration Failed:', err);
    }
}

main();
