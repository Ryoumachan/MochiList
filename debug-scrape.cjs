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

    // Strict Mode: Only match ASCII notes (hiA, mid2G#, etc.)
    // Excludes Matches containing Japanese/Hiragana/Kanji
    const notePattern = "([a-zA-Z0-9#+-]+)";

    const m1 = t.match(new RegExp(`最高音[：:\\s]*${notePattern}`));
    if (m1) highest = m1[1].trim();

    // For chest voice, sometimes "地声最高音" or "地声の最高音"
    const m2 = t.match(new RegExp(`地声(?:の)?最高(?:音)?[：:\\s]*${notePattern}`));
    if (m2) chest = m2[1].trim(); // note is group 1 here because (?:...) is non-capturing

    const m3 = t.match(new RegExp(`最低音[：:\\s]*${notePattern}`));
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

        // Debug: Log a snippet of HTML to check structure - BE CAREFUL OF LENGTH
        // console.log(data.slice(0, 1000)); 

        const combined = extractSnippets(data);
        console.log(`[DEBUG] Extracted Text Length: ${combined.length}`);
        console.log(`[DEBUG] Extracted Text Preview: ${combined.slice(0, 200)}...`);

        const result = parseVocalRange(combined);
        console.log('[RESULT]', JSON.stringify(result, null, 2));
    });
}).on('error', (e) => {
    console.error(e);
});
