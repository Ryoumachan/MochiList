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

    // 2. Analyze2 Mode: Targeted Site Scraping (ONLY w.atwiki.jp/saikouon_dokoda and vocal-range.com)
    if (q && (mode === 'analyze2' || mode === 'analyze')) {
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

            // Helper: Fetch and parse a page
            const fetchAndParse = async (url: string) => {
                try {
                    const pageRes = await fetch(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html',
                            'Accept-Language': 'ja'
                        }
                    });
                    if (!pageRes.ok) return null;

                    const pageHtml = await pageRes.text();

                    // Extract text content (simple tag stripping)
                    const textContent = pageHtml
                        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
                        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/&nbsp;|&amp;|&lt;|&gt;/g, ' ')
                        .replace(/\s+/g, ' ');

                    return parseVocalRange(textContent);
                } catch (e) {
                    return null;
                }
            };

            // --- Strategy 1: Try vocal-range.com via Google search ---
            const googleQuery1 = `site:vocal-range.com ${queryRaw}`;
            const googleUrl1 = `https://www.google.com/search?q=${encodeURIComponent(googleQuery1)}`;

            const googleRes1 = await fetch(googleUrl1, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html',
                    'Accept-Language': 'ja'
                }
            });
            const googleHtml1 = await googleRes1.text();

            // Find first vocal-range.com link
            const linkMatch1 = googleHtml1.match(/href="(https?:\/\/vocal-range\.com\/archives\/\d+\.html)"/);

            if (linkMatch1) {
                const result = await fetchAndParse(linkMatch1[1]);
                if (result && (result.highestNote || result.lowestNote)) {
                    res.status(200).json({
                        ...result,
                        source: 'vocal-range.com',
                        url: linkMatch1[1]
                    });
                    return;
                }
            }

            // --- Strategy 2: Try w.atwiki.jp/saikouon_dokoda via Google search ---
            const googleQuery2 = `site:w.atwiki.jp/saikouon_dokoda ${queryRaw}`;
            const googleUrl2 = `https://www.google.com/search?q=${encodeURIComponent(googleQuery2)}`;

            const googleRes2 = await fetch(googleUrl2, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html',
                    'Accept-Language': 'ja'
                }
            });
            const googleHtml2 = await googleRes2.text();

            // Find first atwiki link
            const linkMatch2 = googleHtml2.match(/href="(https?:\/\/w\.atwiki\.jp\/saikouon_dokoda\/pages\/\d+\.html)"/);

            if (linkMatch2) {
                const result = await fetchAndParse(linkMatch2[1]);
                if (result && (result.highestNote || result.lowestNote)) {
                    res.status(200).json({
                        ...result,
                        source: 'w.atwiki.jp',
                        url: linkMatch2[1]
                    });
                    return;
                }
            }

            // --- Nothing found on either site ---
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

    // 3. Search Mode (DuckDuckGo HTML for web search button)
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
