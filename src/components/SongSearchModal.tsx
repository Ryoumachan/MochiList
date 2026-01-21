import { useState } from 'react';
import { Search, Loader2, Music, X } from 'lucide-react';
import { searchSongs, type ItunesSong } from '../utils/itunes';
import type { Song } from '../types';

interface SongSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (songData: Partial<Song>) => void;
}

export function SongSearchModal({ isOpen, onClose, onSelect }: SongSearchModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ItunesSong[]>([]);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const hits = await searchSongs(query);
            setResults(hits);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (itunesSong: ItunesSong) => {
        // Convert ItunesSong to partial Song
        const newSong: Partial<Song> = {
            title: itunesSong.trackName,
            artist: itunesSong.artistName,
            album: itunesSong.collectionName,
            artworkUrl: itunesSong.artworkUrl100,
            originalKey: '', // Unknown
            myKeyShift: 0,
            memo: '',
            highestNote: '',
            highestChestNote: '',
            lowestNote: ''
        };
        onSelect(newSong);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)'
        }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '600px', height: '80vh', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>

                {/* Header */}
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>楽曲検索</h2>
                    <button onClick={onClose}><X size={24} color={'var(--text-secondary)'} /></button>
                </div>

                {/* Search Input */}
                <form onSubmit={handleSearch} style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="曲名・アーティスト名"
                        style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '0.75rem',
                            color: 'white',
                            outline: 'none'
                        }}
                    />
                    <button type="submit" style={{ background: 'var(--primary-color)', padding: '0 1rem', borderRadius: 'var(--radius-md)', color: 'white' }}>
                        {loading ? <Loader2 className="animate-spin" /> : <Search />}
                    </button>
                </form>

                {/* Results */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 1rem' }}>
                    {results.length === 0 && !loading && (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                            検索してください
                        </div>
                    )}

                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {results.map(item => (
                            <button
                                key={item.trackId}
                                onClick={() => handleSelect(item)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    width: '100%', textAlign: 'left',
                                    background: 'rgba(255,255,255,0.03)',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                            >
                                {item.artworkUrl100 ? (
                                    <img src={item.artworkUrl100} alt="" style={{ width: 48, height: 48, borderRadius: 4 }} />
                                ) : (
                                    <div style={{ width: 48, height: 48, background: '#333', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Music size={24} />
                                    </div>
                                )}
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.trackName}</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{item.artistName}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
