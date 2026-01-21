import type { Song } from '../types';
import { Music } from 'lucide-react';

interface SongListProps {
    songs: Song[];
    onSongClick: (song: Song) => void;
}

export function SongList({ songs, onSongClick }: SongListProps) {
    return (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        <th style={{ padding: '1rem' }}>Art</th>
                        <th style={{ padding: '1rem' }}>Title / Artist</th>
                        <th style={{ padding: '1rem' }}>Key</th>
                        <th style={{ padding: '1rem' }}>Range</th>
                        <th style={{ padding: '1rem' }}>Memo</th>
                    </tr>
                </thead>
                <tbody>
                    {songs.map(song => (
                        <tr
                            key={song.id}
                            onClick={() => onSongClick(song)}
                            style={{ cursor: 'pointer', transition: 'background 0.2s', borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <td style={{ padding: '0.75rem 1rem', width: '64px' }}>
                                {song.artworkUrl ? (
                                    <img src={song.artworkUrl} alt="" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: 40, height: 40, borderRadius: 4, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Music size={16} color="#666" />
                                    </div>
                                )}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{song.title}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{song.artist}</div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                                <span style={{
                                    color: song.myKeyShift === 0 ? 'var(--text-secondary)' : (song.myKeyShift > 0 ? 'var(--success-color)' : 'var(--primary-color)'),
                                    fontWeight: 'bold',
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '2px 8px',
                                    borderRadius: 4
                                }}>
                                    {song.myKeyShift > 0 ? `+${song.myKeyShift}` : song.myKeyShift}
                                </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                                {song.lowestNote || '?'} ~ {song.highestNote || '?'}
                                {(song.highestChestNote) && <span style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>({song.highestChestNote})</span>}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {song.memo}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
