const https = require('https');

// Config
const QUERY = 'Pretender Official髭男dism 音域 最高音 地声 最低音';
const URL = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(QUERY)}`;

console.log(`Fetching: ${URL}`);

https.get(URL, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://lite.duckduckgo.com/'
    }
}, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log(`[DEBUG] Status: ${res.statusCode}`);
        console.log(`[DEBUG] HTML Length: ${data.length}`);

        // Log extracted clear text to see what we can parse
        // Lite DDG usually implies table structures.
        console.log("--- START PREVIEW ---");
        // Print relevant part (after header)
        const bodyStart = data.indexOf('<body');
        console.log(data.slice(bodyStart, bodyStart + 10000));
        console.log("--- END PREVIEW ---");
    });
}).on('error', (e) => {
    console.error(e);
});
