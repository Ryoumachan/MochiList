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

    // 2. Analyze Mode: Search Yahoo for specific sites
    if (q && (mode === 'analyze2' || mode === 'analyze')) {
        try {
            const queryRaw = Array.isArray(q) ? q[0] : q;

            // Helper: Parse Vocal Range from text (updated patterns based on actual site format)
            const parseVocalRange = (text: string) => {
                const t = (text || '').replace(/\s+/g, ' ');
                let highest = null, chest = null, lowest = null;

                // Note pattern: mid1A, mid2G#, hiB, hihiC, lowG etc.
                const notePattern = "(mid[12][A-G]#?|hi[A-G]#?|hihi[A-G]#?|low[A-G]#?)";

                // vocal-range.com format: 【地声最低音】 mid1B(B２)
                // Also match: 地声最低音mid1B, 最低音：mid1B, 最低音 mid1B
                const lowPatterns = [
                    new RegExp(`【地声最低音】\\s*${notePattern}`, 'i'),
                    new RegExp(`地声最低音[：:\\s]*${notePattern}`, 'i'),
                    new RegExp(`最低音[：:\\s]*${notePattern}`, 'i'),
                ];
                for (const p of lowPatterns) {
                    const m = t.match(p);
                    if (m) { lowest = m[1]; break; }
                }

                // vocal-range.com format: 【地声最高音】 hiB(B4)
                const chestPatterns = [
                    new RegExp(`【地声最高音】\\s*${notePattern}`, 'i'),
                    new RegExp(`地声最高音[：:\\s]*${notePattern}`, 'i'),
                    new RegExp(`地声の最高音[：:\\s]*${notePattern}`, 'i'),
                ];
                for (const p of chestPatterns) {
                    const m = t.match(p);
                    if (m) { chest = m[1]; break; }
                }

                // vocal-range.com format: 【裏声最高音】 hiB(B4)
                const highPatterns = [
                    new RegExp(`【裏声最高音】\\s*${notePattern}`, 'i'),
                    new RegExp(`裏声最高音[：:\\s]*${notePattern}`, 'i'),
                    new RegExp(`最高音[：:\\s]*${notePattern}`, 'i'),
                ];
                for (const p of highPatterns) {
                    const m = t.match(p);
                    if (m) { highest = m[1]; break; }
                }

                // If no 裏声最高音 found, use 地声最高音 as highest
                if (!highest && chest) {
                    highest = chest;
                }

                return { highestNote: highest || null, highestChestNote: chest || null, lowestNote: lowest || null };
            };

            // --- Strategy: Search Yahoo for site:vocal-range.com OR site:w.atwiki.jp/saikouon_dokoda ---
            const yahooQuery = `${queryRaw} 音域 (site:vocal-range.com OR site:w.atwiki.jp/saikouon_dokoda)`;
            const yahooUrl = `https://search.yahoo.co.jp/search?p=${encodeURIComponent(yahooQuery)}`;

            const yahooRes = await fetch(yahooUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html',
                    'Accept-Language': 'ja'
                }
            });
            const yahooHtml = await yahooRes.text();

            // Try to find a direct link to one of our target sites
            const vocalRangeMatch = yahooHtml.match(/href="(https?:\/\/vocal-range\.com\/archives\/\d+\.html)"/);
            const atwikiMatch = yahooHtml.match(/href="(https?:\/\/w\.atwiki\.jp\/saikouon_dokoda\/pages\/\d+\.html)"/);

            let result = null;
            let source = null;

            // Try vocal-range.com first (more reliable format)
            if (vocalRangeMatch) {
                try {
                    const pageRes = await fetch(vocalRangeMatch[1], {
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    if (pageRes.ok) {
                        const pageHtml = await pageRes.text();
                        const cleanText = pageHtml
                            .replace(/<script[\s\S]*?<\/script>/gi, '')
                            .replace(/<style[\s\S]*?<\/style>/gi, '')
                            .replace(/<[^>]+>/g, ' ')
                            .replace(/\s+/g, ' ');
                        result = parseVocalRange(cleanText);
                        source = 'vocal-range.com';
                    }
                } catch (e) {
                    console.error('Failed to fetch vocal-range.com page', e);
                }
            }

            // Try atwiki if needed
            if (!result?.highestNote && !result?.lowestNote && atwikiMatch) {
                try {
                    const pageRes = await fetch(atwikiMatch[1], {
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    if (pageRes.ok) {
                        const pageHtml = await pageRes.text();
                        const cleanText = pageHtml
                            .replace(/<script[\s\S]*?<\/script>/gi, '')
                            .replace(/<style[\s\S]*?<\/style>/gi, '')
                            .replace(/<[^>]+>/g, ' ')
                            .replace(/\s+/g, ' ');
                        result = parseVocalRange(cleanText);
                        source = 'w.atwiki.jp';
                    }
                } catch (e) {
                    console.error('Failed to fetch atwiki page', e);
                }
            }

            // Fallback: Parse Yahoo search snippets directly
            if (!result?.highestNote && !result?.lowestNote) {
                const parts = yahooHtml.split(/class="sw-CardBase/);
                const texts: string[] = [];
                for (let i = 1; i < parts.length && i < 10; i++) {
                    const raw = parts[i].slice(0, 5000);
                    const text = raw.replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
                    texts.push(text);
                }
                const combinedText = texts.join(' || ');
                result = parseVocalRange(combinedText);
                source = 'yahoo-snippet';
            }

            if (result && (result.highestNote || result.lowestNote)) {
                res.status(200).json({
                    ...result,
                    source
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
