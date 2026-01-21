export const config = {
    runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
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

    // 2. Analyze2 Mode: Targeted Site Scraping (vocal-range.com)
    if (q && mode === 'analyze2') {
        try {
            const queryRaw = Array.isArray(q) ? q[0] : q;

            // Helper: Parse Vocal Range from text
            const parseVocalRange = (text: string) => {
                const t = (text || '').replace(/\s+/g, ' ');
                let highest = null, chest = null, lowest = null;

                // Common patterns across sites
                const notePattern = "([a-zA-Z0-9#]+)";

                // Pattern: 最高音：hiC, 最高音:hiC, 最高音 hiC
                const m1 = t.match(new RegExp(`最高音[：:\\s]*${notePattern}`));
                if (m1) highest = m1[1].trim();

                // Pattern: 地声最高音：hiA
                const m2 = t.match(new RegExp(`地声(?:の)?最高(?:音)?[：:\\s]*${notePattern}`));
                if (m2) chest = m2[1].trim();

                // Pattern: 最低音：low G
                const m3 = t.match(new RegExp(`最低音[：:\\s]*${notePattern}`));
                if (m3) lowest = m3[1].trim();

                return { highestNote: highest || null, highestChestNote: chest || null, lowestNote: lowest || null };
            };

            // --- Strategy 1: Try vocal-range.com via Google search ---
            // Google search: site:vocal-range.com "曲名"
            const googleQuery = `site:vocal-range.com ${queryRaw}`;
            const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(googleQuery)}`;

            const googleRes = await fetch(googleUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
                }
            });
            const googleHtml = await googleRes.text();

            // Find first vocal-range.com link
            const linkMatch = googleHtml.match(/href="(https?:\/\/vocal-range\.com\/archives\/\d+\.html)"/);

            if (linkMatch) {
                const pageUrl = linkMatch[1];

                // Fetch the actual page
                const pageRes = await fetch(pageUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html',
                        'Accept-Language': 'ja'
                    }
                });
                const pageHtml = await pageRes.text();

                // Extract text content (simple tag stripping)
                const textContent = pageHtml
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/&nbsp;|&amp;|&lt;|&gt;/g, ' ')
                    .replace(/\s+/g, ' ');

                const result = parseVocalRange(textContent);

                if (result.highestNote || result.lowestNote) {
                    res.status(200).json({
                        ...result,
                        source: 'vocal-range.com',
                        url: pageUrl
                    });
                    return;
                }
            }

            // --- Strategy 2: Fallback to Yahoo search (original method) ---
            const yahooQuery = `${queryRaw} 音域 最高音 地声 最低音`;
            const yahooUrl = `https://search.yahoo.co.jp/search?p=${encodeURIComponent(yahooQuery)}`;

            const yahooRes = await fetch(yahooUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html',
                    'Accept-Language': 'ja'
                }
            });
            const yahooHtml = await yahooRes.text();

            // Extract snippets from Yahoo
            const parts = yahooHtml.split(/class="sw-CardBase/);
            const texts: string[] = [];
            for (let i = 1; i < parts.length && i < 10; i++) {
                const raw = parts[i].slice(0, 5000);
                const text = raw.replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
                texts.push(text);
            }
            const combinedText = texts.join(' || ');
            const yahooResult = parseVocalRange(combinedText);

            if (yahooResult.highestNote || yahooResult.lowestNote) {
                res.status(200).json({
                    ...yahooResult,
                    source: 'yahoo',
                });
                return;
            }

            // --- Nothing found ---
            res.status(200).json({
                notFound: true,
                message: '該当データが見つかりませんでした。手動で入力してください。'
            });
            return;

        } catch (e: any) {
            console.error(e);
            res.status(500).json({ error: 'Analysis failed', details: e.message });
            return;
        }
    }

    // 3. Old Analyze Mode (kept for backwards compatibility)
    if (q && mode === 'analyze') {
        try {
            const queryRaw = Array.isArray(q) ? q[0] : q;
            const query = `${queryRaw} 音域 最高音 地声 最低音`;
            const searchUrl = `https://search.yahoo.co.jp/search?p=${encodeURIComponent(query)}`;

            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
                }
            });
            const html = await response.text();

            const extractSnippets = (htmlText: string) => {
                const parts = htmlText.split(/class="sw-CardBase/);
                if (parts.length <= 1) return "";
                const texts = [];
                for (let i = 1; i < parts.length; i++) {
                    const raw = parts[i].slice(0, 5000);
                    const text = raw.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#\d+;/g, (m) => {
                        if (/^&#\d+;$/.test(m)) return ' ';
                        return m === '&amp;' ? '&' : m === '&lt;' ? '<' : m === '&gt;' ? '>' : m === '&quot;' ? '"' : ' ';
                    });
                    texts.push(text.replace(/\s+/g, ' ').trim());
                }
                return texts.filter(Boolean).join(' || ');
            };

            const parseVocalRange = (text: string) => {
                const t = (text || '').replace(/\s+/g, ' ');
                let highest = null, chest = null, lowest = null;
                const notePattern = "([a-zA-Z0-9#+-]+)";
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

    // 4. Search Mode (DuckDuckGo HTML)
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
