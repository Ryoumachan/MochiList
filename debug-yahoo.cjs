const https = require('https');

const QUERY = 'Pretender Official髭男dism 音域 最高音 地声 最低音';
const URL = `https://search.yahoo.co.jp/search?p=${encodeURIComponent(QUERY)}`;

console.log(`Fetching: ${URL}`);

https.get(URL, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
    }
}, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log(`[DEBUG] Status: ${res.statusCode}`);
        console.log(`[DEBUG] HTML Length: ${data.length}`);

        console.log("--- START EXTRACTION ---");
        // Yahoo Snippet Extraction
        // Target: <div class="sw-CardBase">...</div> 

        // Simple strategy: Split by sw-CardBase and clean text
        const parts = data.split(/class="sw-CardBase/);
        const snippets = [];

        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            // Limit length to avoid huge processing
            const raw = part.slice(0, 5000);

            // Strip tags
            const text = raw.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#\d+;/g, ' ');
            const clean = text.replace(/\s+/g, ' ').trim();
            snippets.push(clean.slice(0, 500));
        }

        const combined = snippets.join(' || ');
        console.log(`[DEBUG] Extracted Text (First 1000ch): ${combined.slice(0, 1000)}`);

        // Run Regex
        const parseVocalRange = (text) => {
            const t = (text || '').replace(/\s+/g, ' ');
            let highest = null, chest = null, lowest = null;

            const notePattern = "([a-zA-Z0-9#+-]+)";

            const m1 = t.match(new RegExp(`最高音[：:\\s]*${notePattern}`));
            if (m1) highest = m1[1].trim();

            const m2 = t.match(new RegExp(`地声(?:の)?最高(?:音)?[：:\\s]*${notePattern}`));
            if (m2) chest = m2[1].trim();

            const m3 = t.match(new RegExp(`最低音[：:\\s]*${notePattern}`));
            if (m3) lowest = m3[1].trim();

            return { highestNote: highest || null, highestChestNote: chest || null, lowestNote: lowest || null };
        };

        console.log('[RESULT]', parseVocalRange(combined));
        console.log("--- END EXTRACTION ---");
    });
}).on('error', (e) => {
    console.error(e);
});
