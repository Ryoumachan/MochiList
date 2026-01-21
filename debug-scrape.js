const https = require('https');

// Config
const QUERY = 'Pretender Official髭男dism 音域 最高音 地声 最低音';
const URL = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(QUERY)}`;

// Helper: Extract Snippets (Same as proxy.ts)
const extractSnippets = (htmlText) => {
    // Debug: Check if 'result__snippet' exists
    const splitCheck = htmlText.split(/result__snippet/i);
    console.log(`[DEBUG] Split length: ${splitCheck.length}`);

    const parts = htmlText.split(/result__snippet/i);
    const texts = [];
    for (let i = 1; i < parts.length; i++) {
        const after = parts[i].replace(/^[^>]*>/, '');
        const end = after.search(/<\/div>/i);
        const block = end >= 0 ? after.slice(0, end) : after.slice(0, 300);
        const raw = block.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#\d+;/g, (m) => {
            if (/^&#\d+;$/.test(m)) return ' ';
            return m === '&amp;' ? '&' : m === '&lt;' ? '<' : m === '&gt;' ? '>' : m === '&quot;' ? '"' : ' ';
        });
        texts.push(raw.replace(/\s+/g, ' ').trim());
    }
    return texts.filter(Boolean).join(' ');
};

// Helper: Parse Vocal Range
const parseVocalRange = (text) => {
    const t = (text || '').replace(/\s+/g, ' ');
    let highest = null, chest = null, lowest = null;

    const m1 = t.match(/最高音[：:\s]*([^\s、。,、\n<>]{1,20})/);
    if (m1) highest = m1[1].trim();

    const m2 = t.match(/地声(の)?最高(音)?[：:\s]*([^\s、。,、\n<>]{1,20})/);
    if (m2) chest = m2[3].trim();

    const m3 = t.match(/最低音[：:\s]*([^\s、。,、\n<>]{1,20})/);
    if (m3) lowest = m3[1].trim();

    return { highestNote: highest || null, highestChestNote: chest || null, lowestNote: lowest || null };
};


console.log(`Fetching: ${URL}`);

https.get(URL, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
}, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log(`[DEBUG] Status: ${res.statusCode}`);
        console.log(`[DEBUG] HTML Length: ${data.length}`);

        // Debug: Log a snippet of HTML to check structure
        // console.log(data.slice(0, 2000)); 

        const combined = extractSnippets(data);
        console.log(`[DEBUG] Extracted Text Length: ${combined.length}`);
        console.log(`[DEBUG] Extracted Text Preview: ${combined.slice(0, 200)}...`);

        const result = parseVocalRange(combined);
        console.log('[RESULT]', JSON.stringify(result, null, 2));
    });
}).on('error', (e) => {
    console.error(e);
});
