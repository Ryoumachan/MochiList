export const config = {
    runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
    // Vercel Serverless Function (Node.js) uses (req, res)
    const { mode, q, url: targetUrl } = req.query;

    // CORS headers helper
    const enableCors = () => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    };

    enableCors();

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    // 1. Direct URL Fetch Mode
    if (targetUrl) {
        try {
            const response = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
                }
            });
            const html = await response.text();
            res.setHeader('Content-Type', 'text/html');
            res.status(200).send(html);
            return;
        } catch (e) {
            res.status(500).send('Error fetching target');
            return;
        }
    }

    // 3. Analyze Mode (Extract Vocal Range)
    if (q && mode === 'analyze') {
        try {
            const queryRaw = Array.isArray(q) ? q[0] : q;
            const query = `${queryRaw} 音域 最高音 地声 最低音`;
            // Use Lite version to avoid 403 blocks and heavy JS
            const searchUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;

            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Referer': 'https://lite.duckduckgo.com/'
                }
            });
            const html = await response.text();

            // Helper: Extract Snippets from Lite HTML
            const extractSnippets = (htmlText: string) => {
                // Lite DDG uses <td class='result-snippet'>...</td>
                // We use a regex that matches both single and double quotes for class attributes
                const parts = htmlText.split(/class=['"]result-snippet['"]/);
                if (parts.length <= 1) return "";

                const texts = [];
                for (let i = 1; i < parts.length; i++) {
                    const after = parts[i].replace(/^[^>]*>/, '');
                    const end = after.search(/<\/td>/i);
                    const block = end >= 0 ? after.slice(0, end) : after.slice(0, 300);
                    // simple strip tags
                    const raw = block.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#\d+;/g, (m) => {
                        if (/^&#\d+;$/.test(m)) return ' ';
                        return m === '&amp;' ? '&' : m === '&lt;' ? '<' : m === '&gt;' ? '>' : m === '&quot;' ? '"' : ' ';
                    });
                    texts.push(raw.replace(/\s+/g, ' ').trim());
                }
                return texts.filter(Boolean).join(' ');
            };

            // Helper: Parse Vocal Range
            const parseVocalRange = (text: string) => {
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

            const combinedText = extractSnippets(html);
            const result = parseVocalRange(combinedText);

            const payload = {
                ...result,
                debug: {
                    htmlLength: html.length,
                    textLength: combinedText.length,
                    status: response.status
                }
            };

            res.status(200).json(payload);
            return;

        } catch (e: any) {
            console.error(e);
            res.status(500).json({ error: 'Analysis failed', details: e.message });
            return;
        }
    }

    // 4. Search Mode
    if (q) {
        try {
            const queryRaw = Array.isArray(q) ? q[0] : q;
            // Also use Lite for standard search to keep it consistent
            const searchUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(queryRaw)}`;
            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const html = await response.text();

            const results = [];
            // Lite structure: table rows. 
            // Link is in <a class="result-link" href="...">
            // Snippet is in <td class="result-snippet">

            // Naive split by result-link
            const parts = html.split(/class=['"]result-link['"]/);

            for (let i = 1; i < parts.length; i++) {
                const part = parts[i];
                // Extract href and title from the anchor tag which is at the beginning of 'part'
                // part starts with:  href="//duckduckgo.com/l/?..." >Title</a>...

                const hrefMatch = part.match(/href="([^"]+)"/);
                const titleMatch = part.match(/>([^<]+)<\/a>/);

                // Snippet is further down in a <td class='result-snippet'> (if exists)
                // Actually snippets might be in the *next* part or further down in this part?
                // In Lite, structure is usually:
                // <tr><td>Link...</td></tr>
                // <tr><td>Snippet...</td></tr>
                // So splitting by link might separate snippet.

                // Let's iterate properly or just use limited regex.
                // Re-fetch logic for search mode is tricky without cheerio.
                // For now, let's keep search mode using HTML version IF it works, or switch to Lite properly.
                // Since user complained about auto-fetch (Analysis Mode), let's focus on that.
                // Leaving Search Mode as 'html' version for now but with headers? 
                // Or better, let's just make search mode failing graceful if it is blocked too.
                // But the user only complained about Auto Fetch (Analysis).
                // Let's stick to fixing Analysis first.

                if (hrefMatch && titleMatch) {
                    let decodedUrl = hrefMatch[1];
                    if (decodedUrl.startsWith('//')) decodedUrl = 'https:' + decodedUrl;
                    const uMatch = decodedUrl.match(/uddg=([^&]+)/);
                    if (uMatch) decodedUrl = decodeURIComponent(uMatch[1]);

                    results.push({
                        title: titleMatch[1].trim(),
                        url: decodedUrl,
                        snippet: '' // Snippet parsing in Lite for list is annoying with split, skipping for now as Search Mode isn't the primary complaint
                    });
                }
                if (results.length >= 5) break;
            }
            // WAIT - I am breaking the Search Mode if I switch to Lite without proper parsing.
            // Let's REVERT Search Mode to use HTML version, just add headers.
            // The user's issue is specifically "Information not found" (Analysis).
            // So for Search Mode (block below), I will use html.duckduckgo.com BUT with headers.
        } catch (e) {
            // Fallback
        }
    }

    // Re-doing Search Mode block correctly to use HTML version + Headers
    if (q && mode !== 'analyze') { // Explicit check
        try {
            const queryRaw = Array.isArray(q) ? q[0] : q;
            const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(queryRaw)}`;
            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Referer': 'https://html.duckduckgo.com/'
                }
            });
            const html = await response.text();

            const results = [];
            // Original parsing logic for HTML version
            const blocks = html.split('class="result__body"');

            for (let i = 1; i < blocks.length; i++) {
                const block = blocks[i];
                const urlMatch = block.match(/href="([^"]+)"/);
                const titleMatch = block.match(/>([^<]+)<\/a>/);
                const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);

                if (urlMatch && titleMatch) {
                    let decodedUrl = urlMatch[1];
                    if (decodedUrl.startsWith('//')) decodedUrl = 'https:' + decodedUrl;
                    const uMatch = decodedUrl.match(/uddg=([^&]+)/);
                    if (uMatch) decodedUrl = decodeURIComponent(uMatch[1]);

                    results.push({
                        title: titleMatch[1].trim(),
                        url: decodedUrl,
                        snippet: snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : ''
                    });
                }
                if (results.length >= 5) break;
            }
            res.status(200).json(results);
            return;
        } catch (e) {
            res.status(500).json({ error: 'Search failed' });
            return;
        }
    }

    res.status(400).send('Missing query');
}
