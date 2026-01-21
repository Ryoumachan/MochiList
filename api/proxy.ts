export const config = {
    runtime: 'edge',
};

export default async function handler(request: Request) {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const targetUrl = url.searchParams.get('url');

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    // 1. Direct URL Fetch Mode (for scraping a specific page if needed later)
    if (targetUrl) {
        try {
            const response = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
                }
            });
            const html = await response.text();
            return new Response(html, {
                headers: { 'Content-Type': 'text/html', ...corsHeaders }
            });
        } catch (e) {
            return new Response('Error fetching target', { status: 500, headers: corsHeaders });
        }
    }

    // 2. Search Mode (DuckDuckGo HTML)
    if (query) {
        try {
            // DuckDuckGo HTML version is easier to scrape than Google
            const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
                }
            });
            const html = await response.text();

            // Simple Regex Parsing for DDG HTML
            // Structure is usually: <div class="result__body"> ... <a class="result__a" href="...">Title</a> ... <a class="result__snippet" ...>Snippet</a>
            // Note: Classes might change, but let's try standard structure.

            const results = [];
            const resultRegex = /<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
            // Actually DDG HTML structure is table-based or simpler divs.
            // Let's look for link class="result__a"

            // Matches: <a class="result__a" href="(url)">(title)</a>
            const linkRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;

            // Snippet matches: <a class="result__snippet" ...>(snippet)</a>
            const snippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

            let match;
            // We will parse naively by just find all links and assume order roughly matches or just extract accessible ones.
            // Better approach: extract blocks.

            // Let's try splitting by "result__body"
            const blocks = html.split('class="result__body"');

            for (let i = 1; i < blocks.length; i++) {
                const block = blocks[i];
                const urlMatch = block.match(/href="([^"]+)"/);
                const titleMatch = block.match(/>([^<]+)<\/a>/); // First link text in body is usually title
                const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);

                if (urlMatch && titleMatch) {
                    let decodedUrl = urlMatch[1];
                    // DDG redirects: //duckduckgo.com/l/?kh=-1&uddg=...
                    if (decodedUrl.startsWith('//')) decodedUrl = 'https:' + decodedUrl;

                    // Try to extract real URL from uddg param if present
                    const uMatch = decodedUrl.match(/uddg=([^&]+)/);
                    if (uMatch) {
                        decodedUrl = decodeURIComponent(uMatch[1]);
                    }

                    results.push({
                        title: titleMatch[1].trim(),
                        url: decodedUrl,
                        snippet: snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : ''
                    });
                }
                if (results.length >= 5) break;
            }

            return new Response(JSON.stringify(results), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Search failed' }), { status: 500, headers: corsHeaders });
        }
    }

    return new Response('Missing query', { status: 400, headers: corsHeaders });
}
