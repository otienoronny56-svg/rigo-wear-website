const https = require('https');
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyZWR2c2Z2aHh1dmhrd3BzeGNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3NzQ3NywiZXhwIjoyMDgzODUzNDc3fQ.fUyDf5KDC183qHvxy-mgqFenIFlOb7k8JEHr6xpOGyw';

const options = {
    hostname: 'credvsfvhxuvhkwpsxck.supabase.co',
    path: '/rest/v1/insights',
    method: 'OPTIONS', // OPTIONS shows columns
    headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
    }
};

const req = https.request(options, (res) => {
    console.log('Headers:', res.headers);
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        console.log('Body:', d);
    });
});
req.end();
