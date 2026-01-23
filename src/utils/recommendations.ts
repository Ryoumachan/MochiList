import { type ItunesSong } from './itunes';

const RSS_TOP_SONGS = 'https://itunes.apple.com/jp/rss/topsongs/limit=100/json';
const RSS_RECENT_SONGS = 'https://itunes.apple.com/jp/rss/topnewsongs/limit=100/json';

async function fetchFromRss(url: string): Promise<ItunesSong[]> {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch RSS');
        const data = await res.json();
        const entries = data.feed.entry || [];

        return entries.map((entry: any) => ({
            trackId: parseInt(entry.id.attributes['im:id']),
            trackName: entry['im:name'].label,
            artistName: entry['im:artist'].label,
            collectionName: entry['im:collection']['im:name'].label,
            artworkUrl100: entry['im:image'][2].label, // Use the largest image
        }));
    } catch (error) {
        console.error('RSS Fetch Error:', error);
        return [];
    }
}

export async function getRecommendations() {
    const [classicList, recentList] = await Promise.all([
        fetchFromRss(RSS_TOP_SONGS),
        fetchFromRss(RSS_RECENT_SONGS)
    ]);

    const getRandom = (list: ItunesSong[], count: number) => {
        const shuffled = [...list].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    };

    return {
        classic: getRandom(classicList, 10),
        recent: getRandom(recentList, 10),
        allClassic: classicList,
        allRecent: recentList
    };
}
