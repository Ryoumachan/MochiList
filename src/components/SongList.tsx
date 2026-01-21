import { Music, Mic2 } from 'lucide-react';
import type { Song } from '../types';

interface SongListProps {
    songs: Song[];
    onSongClick: (song: Song) => void;
}

export function SongList({ songs, onSongClick }: SongListProps) {
    return (
        <>
            <div className="song-table-container pc-view">
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                    <thead>
                        <tr style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'left' }}>
                            <th style={{ padding: '0 1rem' }}>Artwork</th>
                            <th style={{ padding: '0 1rem' }}>Title / Artist</th>
                            <th style={{ padding: '0 1rem' }}>My Key</th>
                            <th style={{ padding: '0 1rem' }}>Range</th>
                            <th style={{ padding: '0 1rem' }}>Memo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {songs.map(song => (
                            <tr
                                key={song.id}
                                className="glass-panel"
                                style={{ cursor: 'pointer', transition: 'transform 0.1s' }}
                                onClick={() => onSongClick(song)}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <td style={{ padding: '0.75rem', borderTopLeftRadius: 'var(--radius-lg)', borderBottomLeftRadius: 'var(--radius-lg)' }}>
                                    <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {song.artworkUrl ? (
                                            <img src={song.artworkUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <Music size={24} color="#94a3b8" />
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{song.title}</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{song.artist}</div>
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: 4,
                                        background: song.myKeyShift === 0 ? 'rgba(255,255,255,0.1)' : (song.myKeyShift > 0 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(244, 63, 94, 0.2)'),
                                        color: song.myKeyShift === 0 ? 'inherit' : (song.myKeyShift > 0 ? '#38bdf8' : '#f43f5e'),
                                        fontWeight: 'bold',
                                        fontSize: '0.9rem'
                                    }}>
                                        {song.myKeyShift > 0 ? '+' : ''}{song.myKeyShift}
                                    </span>
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                    {(song.highestNote || song.lowestNote) && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                                            <Mic2 size={14} color="var(--primary-color)" />
                                            <span>{song.lowestNote || '?'} ~ {song.highestNote || '?'}</span>
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '0.75rem', width: '30%', borderTopRightRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' }}>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        color: 'var(--text-secondary)',
                                        opacity: 0.8,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                    }}>
                                        {song.memo}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="song-grid-mobile mobile-view">
                {songs.map(song => (
                    <div
                        key={song.id}
                        className="glass-panel"
                        onClick={() => onSongClick(song)}
                        style={{
                            padding: '1rem',
                            display: 'flex',
                            gap: '1rem',
                            marginBottom: '1rem',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#334155', flexShrink: 0 }}>
                            {song.artworkUrl ? (
                                <img src={song.artworkUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Music size={24} color="#94a3b8" />
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{song.artist}</div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{
                                    display: 'inline-block',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: 4,
                                    background: song.myKeyShift === 0 ? 'rgba(255,255,255,0.1)' : (song.myKeyShift > 0 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(244, 63, 94, 0.2)'),
                                    color: song.myKeyShift === 0 ? 'inherit' : (song.myKeyShift > 0 ? '#38bdf8' : '#f43f5e'),
                                    fontWeight: 'bold',
                                    fontSize: '0.8rem'
                                }}>
                                    Key: {song.myKeyShift > 0 ? '+' : ''}{song.myKeyShift}
                                </span>

                                {(song.highestNote) && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        <span style={{ color: 'var(--primary-color)' }}>Top:</span> {song.highestNote}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
        .mobile-view { display: none; }
        @media (max-width: 768px) {
          .pc-view { display: none; }
          .mobile-view { display: block; }
        }
      `}</style>
        </>
    );
}
