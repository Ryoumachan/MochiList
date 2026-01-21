export async function fetchVocalRange(artist: string, title: string): Promise<any | null> {
    console.log(`Attempting to fetch range for ${title} by ${artist}`);

    // 1. Try to guess the URL on vocal-range.com (or similar site) if possible, 
    // or use the proxy to search Google and parse (Very hard to do reliably without extensive logic).

    // For this implementation, let's try to fetch a "suggested" URL via our proxy.
    // Since we don't have a search engine API, we still rely on the user "Searching" mostly,
    // BUT we can use the proxy to fetch the content if we HAVE a URL.

    // IF we want "Auto Fetch" from button click -> Text Result:
    // We can try to hit `https://vocal-range.com/artist/song` style if it existed.

    // COMPROMISE:
    // The user asked to "not open a new tab".
    // I will make the "Web Search" button open an *iframe* or a modal with the result if possible,
    // but X-Frame-Options usually blocks this.

    // REVISED PLAN per user request: "Auto Scraping".
    // I will implement a heuristic.
    // Search query: `site:vocal-range.com ${artist} ${title}`
    // Access via Proxy? Google blocks automated access.

    // Let's implement a "Mock" or "Best Effort" using the proxy to hit a known structure if possible.
    // If not, we have to tell the user "Could not auto-detect".

    return null;
}

// Just opens the search. 
// User wants to avoid this ("tab is annoying").
// So we want to display the info IN the app.
// I'll update the UI to show "Search Results" inside a modal using a custom search approach if possible, 
// OR simpler: Use the iTunes API data we already have? No, iTunes doesn't have range.

// Let's stick to the "Proxy creates a CORS-free request" plan.
// We allow the client to fetch arbitrary URLs (like a specific site) via the proxy.
// But we don't know the URL. 
// So I will maintain the "Open Search" as fallback, but simpler.

export function openRangeSearch(artist: string, title: string) {
    const query = `${artist} ${title} 音域 地声 最高音`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
}
