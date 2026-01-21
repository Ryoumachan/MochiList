const https = require('https');
const fs = require('fs');

const url = 'https://vocal-range.com/archives/15453226.html';

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        // Save raw HTML for inspection
        fs.writeFileSync('debug-html.txt', data.slice(0, 50000));

        // Remove scripts and styles
        const clean = data
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ');

        fs.writeFileSync('debug-text.txt', clean);
        console.log('Saved to debug-html.txt and debug-text.txt');
        console.log('Text length:', clean.length);
    });
}).on('error', console.error);
