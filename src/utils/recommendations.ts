import { type ItunesSong } from './itunes';

const RSS_TOP_SONGS = 'https://itunes.apple.com/jp/rss/topsongs/limit=200/json';

export async function getRecommendations() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const res = await fetch(RSS_TOP_SONGS, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error('Failed to fetch RSS');
        const data = await res.json();
        const entries = data.feed?.entry || [];

        const allSongs: (ItunesSong & { releaseDate: string })[] = entries
            .map((entry: any) => {
                try {
                    const trackIdStr = entry.id?.attributes?.['im:id'];
                    if (!trackIdStr) return null;

                    return {
                        trackId: parseInt(trackIdStr),
                        trackName: entry['im:name']?.label || 'Unknown',
                        artistName: entry['im:artist']?.label || 'Unknown',
                        collectionName: entry['im:collection']?.['im:name']?.label || '',
                        artworkUrl100: entry['im:image']?.[2]?.label || entry['im:image']?.[0]?.label || '',
                        releaseDate: entry['im:releaseDate']?.label || '',
                    };
                } catch (e) {
                    return null;
                }
            })
            .filter((s: any): s is ItunesSong & { releaseDate: string } => s !== null && !isNaN(s.trackId));

        if (allSongs.length === 0) {
            throw new Error('No entries found after mapping');
        }

        const getRandom = (list: any[], count: number) => {
            const shuffled = [...list].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, count);
        };

        // Sort by release date for "Recent"
        const sortedByDate = [...allSongs].sort((a, b) => {
            const timeA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
            const timeB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
            return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
        });

        // Recent: Top 50 by date, then pick 10 random from those
        const recentSubset = sortedByDate.slice(0, 50);

        return {
            classic: getRandom(allSongs, 10),
            recent: getRandom(recentSubset, 10),
            allClassic: allSongs,
            allRecent: recentSubset
        };
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Recommendation Fetch Error:', error);
        return {
            classic: [],
            recent: [],
            allClassic: [],
            allRecent: []
        };
    }
}
