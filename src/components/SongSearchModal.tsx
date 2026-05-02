import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Music, X, RotateCcw } from 'lucide-react';
import { searchSongs, type ItunesSong } from '../utils/itunes';
import { getRecommendations } from '../utils/recommendations';
import type { Song } from '../types';

interface SongSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (songData: Partial<Song>) => void;
    existingSongs: Song[];
    activePlaylist: string | null;
}

export function SongSearchModal({ isOpen, onClose, onSelect, existingSongs, activePlaylist }: SongSearchModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ItunesSong[]>([]);
    const [loading, setLoading] = useState(false);

    // Recommendations State
    const [classicRecs, setClassicRecs] = useState<ItunesSong[]>([]);
    const [recentRecs, setRecentRecs] = useState<ItunesSong[]>([]);
    const [allClassic, setAllClassic] = useState<ItunesSong[]>([]);
    const [allRecent, setAllRecent] = useState<ItunesSong[]>([]);
    const [recsLoading, setRecsLoading] = useState(false);

    const loadRecommendations = useCallback(async () => {
        setRecsLoading(true);
        try {
            const data = await getRecommendations();
            setClassicRecs(data.classic);
            setRecentRecs(data.recent);
            setAllClassic(data.allClassic);
            setAllRecent(data.allRecent);
        } finally {
            setRecsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen && allClassic.length === 0) {
            loadRecommendations();
        }
    }, [isOpen, allClassic.length, loadRecommendations]);

    const handleReroll = (type: 'classic' | 'recent') => {
        const list = type === 'classic' ? allClassic : allRecent;
        const shuffled = [...list].sort(() => 0.5 - Math.random());
        if (type === 'classic') setClassicRecs(shuffled.slice(0, 10));
        else setRecentRecs(shuffled.slice(0, 10));
    };

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
        const isDuplicate = existingSongs.some(
            s => s.title === itunesSong.trackName &&
                 s.artist === itunesSong.artistName &&
                 s.playlist === (activePlaylist === '__unclassified__' ? undefined : (activePlaylist || undefined))
        );

        if (isDuplicate) {
            const label = activePlaylist && activePlaylist !== '__unclassified__' ? `「${activePlaylist}」` : '現在のリスト';
            if (!window.confirm(`この曲は既に${label}に登録されています。\n追加してもよろしいですか？`)) {
                return;
            }
        }

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
            lowestNote: '',
            playlist: activePlaylist === '__unclassified__' ? undefined : (activePlaylist || undefined)
        };
        onSelect(newSong);
        onClose();
    };

    const RecommendationSection = ({ title, songs, type }: { title: string, songs: ItunesSong[], type: 'classic' | 'recent' }) => (
        <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{title}</h3>
                <button
                    onClick={() => handleReroll(type)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '0.8rem', color: 'var(--text-accent)',
                        background: 'rgba(255,255,255,0.05)', padding: '4px 10px',
                        borderRadius: '12px', cursor: 'pointer', border: 'none'
                    }}
                >
                    <RotateCcw size={14} /> リロール
                </button>
            </div>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
                {songs.map(item => (
                    <SongItem key={`${type}-${item.trackId}`} item={item} />
                ))}
            </div>
        </div>
    );

    const SongItem = ({ item }: { item: ItunesSong }) => {
        const isDuplicate = existingSongs.some(
            s => s.title === item.trackName &&
                 s.artist === item.artistName &&
                 s.playlist === (activePlaylist === '__unclassified__' ? undefined : (activePlaylist || undefined))
        );

        return (
            <button
                onClick={() => handleSelect(item)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    width: '100%', textAlign: 'left',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    transition: 'background 0.2s',
                    border: 'none', cursor: 'pointer',
                    position: 'relative'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            >
                {item.artworkUrl100 ? (
                    <img src={item.artworkUrl100} alt="" style={{ width: 44, height: 44, borderRadius: 4 }} />
                ) : (
                    <div style={{ width: 44, height: 44, background: '#333', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Music size={20} />
                    </div>
                )}
                <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.trackName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.artistName}</div>
                </div>
                {isDuplicate && (
                    <div style={{
                        fontSize: '0.7rem', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.2)',
                        padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap'
                    }}>
                        登録済
                    </div>
                )}
            </button>
        );
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)'
        }}>
            <div className="glass-panel" style={{ width: '94%', maxWidth: '600px', height: '85vh', display: 'flex', flexDirection: 'column', background: '#0f172a', borderRadius: '24px', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '1.2rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>楽曲検索</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color={'var(--text-secondary)'} /></button>
                </div>

                {/* Search Input */}
                <form onSubmit={handleSearch} style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value);
                            if (!e.target.value) setResults([]);
                        }}
                        placeholder="曲名・アーティスト名"
                        style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '16px',
                            padding: '0.8rem 1rem',
                            color: 'white',
                            outline: 'none',
                            fontSize: '16px'
                        }}
                    />
                    <button type="submit" style={{ background: 'var(--primary-color)', width: '50px', height: '50px', borderRadius: '16px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                        {loading ? <Loader2 className="animate-spin" /> : <Search />}
                    </button>
                </form>

                {/* Results / Recommendations Area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 1.5rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '3rem' }}>
                            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: 'var(--primary-color)' }} />
                            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>検索中...</p>
                        </div>
                    ) : query.trim() ? (
                        // Search Results
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {results.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                                    見つかりませんでした
                                </div>
                            ) : (
                                results.map(item => <SongItem key={item.trackId} item={item} />)
                            )}
                        </div>
                    ) : (
                        // Recommendations
                        <div style={{ padding: '0.5rem 0' }}>
                            {recsLoading ? (
                                <div style={{ textAlign: 'center', padding: '3rem' }}>
                                    <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: 'var(--primary-color)' }} />
                                    <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>レコメンド取得中...</p>
                                </div>
                            ) : (
                                <>
                                    <RecommendationSection title="最近の曲" songs={recentRecs} type="recent" />
                                    <RecommendationSection title="定番の曲" songs={classicRecs} type="classic" />
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
