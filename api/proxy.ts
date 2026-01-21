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
            // Switch to Yahoo Japan as it's more permissive for Vercel IPs and has good data
            const searchUrl = `https://search.yahoo.co.jp/search?p=${encodeURIComponent(query)}`;

            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
                }
            });
            const html = await response.text();

            // Helper: Extract Snippets from Yahoo HTML
            const extractSnippets = (htmlText: string) => {
                // Yahoo text is mostly in class="sw-CardBase" blocks
                const parts = htmlText.split(/class="sw-CardBase/);
                if (parts.length <= 1) return "";

                const texts = [];
                for (let i = 1; i < parts.length; i++) {
                    // Limit text length per block for performance
                    const raw = parts[i].slice(0, 5000);
                    // Basic tag stripping
                    const text = raw.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#\d+;/g, (m) => {
                        if (/^&#\d+;$/.test(m)) return ' ';
                        return m === '&amp;' ? '&' : m === '&lt;' ? '<' : m === '&gt;' ? '>' : m === '&quot;' ? '"' : ' ';
                    });
                    texts.push(text.replace(/\s+/g, ' ').trim());
                }
                // Join with separator to prevent merging unrelated sentences
                return texts.filter(Boolean).join(' || ');
            };

            // Helper: Parse Vocal Range
            const parseVocalRange = (text: string) => {
                const t = (text || '').replace(/\s+/g, ' ');
                let highest = null, chest = null, lowest = null;

                const notePattern = "([a-zA-Z0-9#+-]+)";

                // Regex: Allow brackets 【】 and other separators for Yahoo results
                const m1 = t.match(new RegExp(`最高音[：:\\s【]*${notePattern}`));
                if (m1) highest = m1[1].trim();

                const m2 = t.match(new RegExp(`地声(?:の)?最高(?:音)?[：:\\s【]*${notePattern}`));
                if (m2) chest = m2[1].trim();

                const m3 = t.match(new RegExp(`最低音[：:\\s【]*${notePattern}`));
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

    // 4. Search Mode (Still using DuckDuckGo HTML for now, as User didn't complain about this one)
    if (q) {
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
