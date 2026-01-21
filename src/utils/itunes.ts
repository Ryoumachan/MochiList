export interface ItunesSong {
    trackId: number;
    trackName: string;
    artistName: string;
    collectionName?: string;
    artworkUrl100?: string;
    previewUrl?: string; // m4a preview
}

export async function searchSongs(query: string): Promise<ItunesSong[]> {
    if (!query) return [];

    // Use 'JP' store for Japanese songs
    const country = 'JP';
    const entity = 'song';
    const limit = 20;

    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=${country}&entity=${entity}&limit=${limit}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        return data.results || [];
    } catch (error) {
        console.error(error);
        return [];
    }
}
