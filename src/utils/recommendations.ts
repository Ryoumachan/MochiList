import { type ItunesSong } from './itunes';

const RSS_TOP_SONGS = 'https://itunes.apple.com/jp/rss/topsongs/limit=200/json';

export async function getRecommendations() {
    try {
        const res = await fetch(RSS_TOP_SONGS);
        if (!res.ok) throw new Error('Failed to fetch RSS');
        const data = await res.json();
        const entries = data.feed.entry || [];

        const allSongs: (ItunesSong & { releaseDate: string })[] = entries.map((entry: any) => ({
            trackId: parseInt(entry.id.attributes['im:id']),
            trackName: entry['im:name'].label,
            artistName: entry['im:artist'].label,
            collectionName: entry['im:collection']['im:name'].label,
            artworkUrl100: entry['im:image'][2].label,
            releaseDate: entry['im:releaseDate'].label, // Format: 2026-01-12T04:00:00-07:00
        }));

        const getRandom = (list: any[], count: number) => {
            const shuffled = [...list].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, count);
        };

        // Sort by release date for "Recent"
        const sortedByDate = [...allSongs].sort((a, b) =>
            new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
        );

        // Recent: Top 50 by date, then pick 10 random from those
        const recentSubset = sortedByDate.slice(0, 50);

        return {
            classic: getRandom(allSongs, 10),
            recent: getRandom(recentSubset, 10),
            allClassic: allSongs,
            allRecent: recentSubset
        };
    } catch (error) {
        console.error('Recommendation Fetch Error:', error);
        return {
            classic: [],
            recent: [],
            allClassic: [],
            allRecent: []
        };
    }
}
