export const config = {
    runtime: 'edge',
};

export default async function handler(request: Request) {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');

    if (!query) {
        return new Response('Missing query', { status: 400 });
    }

    // We'll search vocal-range.com via Google strictly to get a direct link if possible,
    // or just return the search result page content if we want to scrape.
    // However, scraping Google is blocked often.
    // A better approach for "Serverless Proxy" to avoid CORS is to actually fetch the target site if we knew it.
    // Since we don't know the exact URL, let's try to fetch a specific site if the user provides a URL, 
    // OR we can implement a custom small scraper that tries `vocal-range.com` search.

    // For this task, the user wants "Auto Fetch" without opening a new tab.
    // Let's try to fetch the search results from a permissive engine or use a custom Google Search JSON API if available (but that requires keys).

    // ALTERNATIVE: Use DuckDuckGo HTML (easier to scrape) or Bing.
    // But wait, "vocal-range.com" has a search feature? 
    // URL pattern: https://vocal-range.com/search?q=... (Example)

    // Since we don't have a reliable API, I will implement a "CORS Proxy" mode.
    // The client will determine the URL, and this function just fetches it.

    const targetUrl = url.searchParams.get('url');
    if (targetUrl) {
        try {
            const response = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; MochiList/1.0)'
                }
            });
            const html = await response.text();
            return new Response(html, {
                headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' }
            });
        } catch (e) {
            return new Response('Error fetching target', { status: 500 });
        }
    }

    return new Response('Please provide ?url=...', { status: 400 });
}
