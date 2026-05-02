import { useState, useRef } from 'react';
import { X, Upload, Loader2, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';
import { searchSongs } from '../utils/itunes';
import type { Song } from '../types';

interface CsvImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    playlists: string[];
    onImportSong: (song: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

interface CsvRow {
    title: string;
    artist: string;
    memo: string;
}

type RowStatus = 'pending' | 'processing' | 'success' | 'failed' | 'waiting';

interface ImportRow extends CsvRow {
    status: RowStatus;
    artworkUrl?: string;
    highestNote?: string;
    errorMsg?: string;
}

function parseCsv(text: string): CsvRow[] {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const rows: CsvRow[] = [];

    for (const line of lines) {
        // Handle CSV with potential quoted fields
        const parts: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
                parts.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        parts.push(current.trim());

        if (parts.length >= 2) {
            rows.push({
                title: parts[0] || '',
                artist: parts[1] || '',
                memo: parts[2] || ''
            });
        }
    }
    return rows;
}

async function fetchHighestNote(title: string, artist: string): Promise<string | null> {
    try {
        const query = `${title} ${artist}`;
        const res = await fetch(`/api/proxy?mode=analyze2&q=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (data.notFound) return null;
        return data.highestNote || null;
    } catch {
        return null;
    }
}

async function fetchThumbnail(title: string, artist: string): Promise<string | null> {
    try {
        const query = `${title} ${artist}`;
        const hits = await searchSongs(query);
        if (hits.length > 0 && hits[0].artworkUrl100) {
            return hits[0].artworkUrl100;
        }
        return null;
    } catch {
        return null;
    }
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export function CsvImportModal({ isOpen, onClose, playlists, onImportSong }: CsvImportModalProps) {
    const [rows, setRows] = useState<ImportRow[]>([]);
    const [targetPlaylist, setTargetPlaylist] = useState('');
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [doneCount, setDoneCount] = useState(0);
    const [failCount, setFailCount] = useState(0);
    const fileRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef(false);

    if (!isOpen) return null;

    const effectivePlaylist = targetPlaylist === '__new__' ? newPlaylistName.trim() : targetPlaylist;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const text = reader.result as string;
            const parsed = parseCsv(text);
            setRows(parsed.map(r => ({ ...r, status: 'pending' as RowStatus })));
            setDoneCount(0);
            setFailCount(0);
            setCurrentIndex(-1);
        };
        reader.readAsText(file, 'UTF-8');
    };

    const handleStartImport = async () => {
        if (rows.length === 0) return;
        if (!effectivePlaylist) {
            alert('プレイリストを選択または入力してください');
            return;
        }

        setIsImporting(true);
        abortRef.current = false;
        let done = 0;
        let fail = 0;

        for (let i = 0; i < rows.length; i++) {
            if (abortRef.current) break;

            setCurrentIndex(i);
            setRows(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'processing' } : r));

            const row = rows[i];
            let artworkUrl: string | null = null;
            let highestNote: string | null = null;
            let fetchFailed = false;

            // Fetch thumbnail
            try {
                artworkUrl = await fetchThumbnail(row.title, row.artist);
            } catch {
                artworkUrl = null;
            }

            // Fetch highest note
            try {
                highestNote = await fetchHighestNote(row.title, row.artist);
            } catch {
                highestNote = null;
            }

            if (!artworkUrl || !highestNote) {
                fetchFailed = true;
            }

            // Always import (even with empty data)
            try {
                await onImportSong({
                    title: row.title,
                    artist: row.artist,
                    album: '',
                    artworkUrl: artworkUrl || '',
                    lyricsSnippet: '',
                    originalKey: '',
                    highestNote: highestNote || '',
                    highestChestNote: '',
                    lowestNote: '',
                    myKeyShift: 0,
                    memo: row.memo,
                    playlist: effectivePlaylist
                });

                if (fetchFailed) {
                    // imported but with missing data
                    setRows(prev => prev.map((r, idx) =>
                        idx === i ? {
                            ...r, status: 'failed',
                            artworkUrl: artworkUrl || undefined,
                            highestNote: highestNote || undefined,
                            errorMsg: `インポート済み（${!artworkUrl ? 'サムネ' : ''}${!artworkUrl && !highestNote ? '・' : ''}${!highestNote ? '最高音' : ''} 取得失敗）`
                        } : r
                    ));
                    fail++;
                    setFailCount(fail);

                    // Wait 10 seconds before the next song
                    setRows(prev => prev.map((r, idx) =>
                        idx === i ? { ...r, status: 'waiting' } : r
                    ));
                    await delay(10000);
                    setRows(prev => prev.map((r, idx) =>
                        idx === i ? { ...r, status: 'failed' } : r
                    ));
                } else {
                    setRows(prev => prev.map((r, idx) =>
                        idx === i ? {
                            ...r, status: 'success',
                            artworkUrl: artworkUrl || undefined,
                            highestNote: highestNote || undefined
                        } : r
                    ));
                    done++;
                    setDoneCount(done);
                }
            } catch {
                setRows(prev => prev.map((r, idx) =>
                    idx === i ? { ...r, status: 'failed', errorMsg: 'DB保存エラー' } : r
                ));
                fail++;
                setFailCount(fail);
                await delay(10000);
            }
        }

        setIsImporting(false);
        setCurrentIndex(-1);
    };

    const handleAbort = () => {
        abortRef.current = true;
    };

    const handleClose = () => {
        if (isImporting) {
            if (!window.confirm('インポートを中断してもよろしいですか？')) return;
            abortRef.current = true;
        }
        setRows([]);
        setTargetPlaylist('');
        setNewPlaylistName('');
        setCurrentIndex(-1);
        setDoneCount(0);
        setFailCount(0);
        onClose();
    };

    const statusIcon = (status: RowStatus) => {
        switch (status) {
            case 'pending': return <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />;
            case 'processing': return <Loader2 size={20} className="animate-spin" color="#6366f1" />;
            case 'success': return <CheckCircle size={20} color="#22c55e" />;
            case 'failed': return <AlertCircle size={20} color="#f59e0b" />;
            case 'waiting': return <Clock size={20} color="#f59e0b" />;
        }
    };

    const progress = rows.length > 0 ? ((doneCount + failCount) / rows.length * 100) : 0;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)'
        }}>
            <div className="glass-panel" style={{
                width: '94%', maxWidth: '600px', height: '85vh',
                display: 'flex', flexDirection: 'column',
                background: '#0f172a', borderRadius: '24px', overflow: 'hidden'
            }}>

                {/* Header */}
                <div style={{
                    padding: '1.2rem',
                    borderBottom: '1px solid var(--glass-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={22} /> CSV インポート
                    </h2>
                    <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={24} color={'var(--text-secondary)'} />
                    </button>
                </div>

                {/* Controls */}
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--glass-border)' }}>

                    {/* Playlist selector */}
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block' }}>
                            インポート先プレイリスト
                        </label>
                        <select
                            value={targetPlaylist}
                            onChange={e => { setTargetPlaylist(e.target.value); }}
                            disabled={isImporting}
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '12px',
                                padding: '0.7rem 1rem',
                                color: 'white',
                                fontSize: '16px',
                                outline: 'none',
                                appearance: 'none'
                            }}
                        >
                            <option value="" style={{ background: '#1e293b' }}>-- 選択してください --</option>
                            {playlists.map(p => (
                                <option key={p} value={p} style={{ background: '#1e293b' }}>{p}</option>
                            ))}
                            <option value="__new__" style={{ background: '#1e293b' }}>＋ 新規プレイリスト作成</option>
                        </select>
                        {targetPlaylist === '__new__' && (
                            <input
                                autoFocus
                                placeholder="新規プレイリスト名"
                                value={newPlaylistName}
                                onChange={e => setNewPlaylistName(e.target.value)}
                                disabled={isImporting}
                                style={{
                                    width: '100%',
                                    marginTop: '0.5rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '12px',
                                    padding: '0.7rem 1rem',
                                    color: 'white',
                                    fontSize: '16px',
                                    outline: 'none'
                                }}
                            />
                        )}
                    </div>

                    {/* File input */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".csv,.txt"
                            onChange={handleFileSelect}
                            disabled={isImporting}
                            style={{ display: 'none' }}
                        />
                        <button
                            onClick={() => fileRef.current?.click()}
                            disabled={isImporting}
                            style={{
                                flex: 1,
                                background: 'rgba(99, 102, 241, 0.15)',
                                border: '1px dashed rgba(99, 102, 241, 0.5)',
                                borderRadius: '12px',
                                padding: '0.8rem',
                                color: '#818cf8',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                cursor: 'pointer', fontWeight: 600,
                                opacity: isImporting ? 0.5 : 1
                            }}
                        >
                            <Upload size={18} />
                            {rows.length > 0 ? `${rows.length}曲 読み込み済み` : 'CSVファイルを選択'}
                        </button>

                        {rows.length > 0 && !isImporting && (
                            <button
                                onClick={handleStartImport}
                                style={{
                                    background: '#22c55e', color: 'white',
                                    padding: '0.8rem 1.5rem', borderRadius: '12px',
                                    fontWeight: 'bold', border: 'none', cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                開始
                            </button>
                        )}
                        {isImporting && (
                            <button
                                onClick={handleAbort}
                                style={{
                                    background: '#ef4444', color: 'white',
                                    padding: '0.8rem 1.5rem', borderRadius: '12px',
                                    fontWeight: 'bold', border: 'none', cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                中断
                            </button>
                        )}
                    </div>

                    {/* Format hint */}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                        形式: <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>曲名, アーティスト名, メモ</code>
                    </div>

                    {/* Progress bar */}
                    {rows.length > 0 && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                                <span>進捗: {doneCount + failCount}/{rows.length}</span>
                                <span>
                                    <span style={{ color: '#22c55e' }}>✓ {doneCount}</span>
                                    {failCount > 0 && <span style={{ color: '#f59e0b', marginLeft: '0.5rem' }}>⚠ {failCount}</span>}
                                </span>
                            </div>
                            <div style={{
                                height: '6px', borderRadius: '3px',
                                background: 'rgba(255,255,255,0.1)', overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${progress}%`,
                                    borderRadius: '3px',
                                    background: 'linear-gradient(to right, #6366f1, #22c55e)',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Rows list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1rem' }}>
                    {rows.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                            CSVファイルを選択してください
                        </div>
                    ) : (
                        rows.map((row, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.6rem 0.5rem',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                background: row.status === 'processing' ? 'rgba(99, 102, 241, 0.08)' :
                                    row.status === 'waiting' ? 'rgba(245, 158, 11, 0.08)' :
                                        'transparent',
                                transition: 'background 0.3s'
                            }}>
                                <div style={{ flexShrink: 0 }}>
                                    {statusIcon(row.status)}
                                </div>
                                {row.artworkUrl ? (
                                    <img src={row.artworkUrl} alt="" style={{ width: 36, height: 36, borderRadius: 4, flexShrink: 0 }} />
                                ) : (
                                    <div style={{
                                        width: 36, height: 36, borderRadius: 4, flexShrink: 0,
                                        background: 'rgba(255,255,255,0.05)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.7rem', color: 'var(--text-secondary)'
                                    }}>
                                        🎵
                                    </div>
                                )}
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{
                                        fontWeight: 600, fontSize: '0.9rem',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                    }}>
                                        {row.title}
                                    </div>
                                    <div style={{
                                        fontSize: '0.75rem', color: 'var(--text-secondary)',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                    }}>
                                        {row.artist}
                                        {row.highestNote && <span style={{ marginLeft: '0.5rem', color: '#818cf8' }}>♪ {row.highestNote}</span>}
                                    </div>
                                    {row.errorMsg && (
                                        <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '0.1rem' }}>
                                            {row.errorMsg}
                                        </div>
                                    )}
                                    {row.status === 'waiting' && (
                                        <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '0.1rem' }}>
                                            10秒待機中...
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
