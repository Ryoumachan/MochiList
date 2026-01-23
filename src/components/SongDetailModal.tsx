import { useState, useEffect } from 'react';
import { X, Save, Trash2, Search, ExternalLink, Loader2, Music2 } from 'lucide-react';
import type { Song } from '../types';
import { openRangeSearch } from '../utils/scraper';
import { calculateBestShift } from '../utils/musicTheory';

interface SongDetailModalProps {
    isOpen: boolean;
    song: Partial<Song> | Song | null;
    onClose: () => void;
    onSave: (song: Partial<Song>) => void;
    onDelete?: (id: string) => void;
}

export function SongDetailModal({ isOpen, song, onClose, onSave, onDelete }: SongDetailModalProps) {
    const [formData, setFormData] = useState<Partial<Song>>({});
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        if (song) {
            setFormData({ ...song });
        }
    }, [song]);

    if (!isOpen || !song) return null;

    const handleChange = (field: keyof Song, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAutoFetch = () => {
        // Fallback to google search as per plan
        if (formData.artist && formData.title) {
            openRangeSearch(formData.artist, formData.title);
        } else {
            alert("タイトルとアーティスト名を入力してください");
        }
    };

    const handleAnalyze = async () => {
        if (!formData.artist || !formData.title) {
            alert('アーティスト名と曲名を入力してください');
            return;
        }

        setIsAnalyzing(true);
        try {
            const query = `${formData.title} ${formData.artist}`;
            const res = await fetch(`/api/proxy?mode=analyze2&q=${encodeURIComponent(query)}`);
            const data = await res.json();

            if (data.notFound) {
                alert('情報が見つかりませんでした。\n手動で入力するか、Web検索を試してください。');
            } else if (data.highestNote || data.highestChestNote || data.lowestNote) {
                setFormData(prev => ({
                    ...prev,
                    highestNote: data.highestNote || prev.highestNote,
                    highestChestNote: data.highestChestNote || prev.highestChestNote,
                    lowestNote: data.lowestNote || prev.lowestNote
                }));
                alert(`音域情報を自動取得しました！(Source: ${data.source || 'Web'})\n誤りがある場合はWeb検索で確認してください。`);
            } else {
                alert('情報が見つかりませんでした。\nWeb検索を試してみてください。');
            }
        } catch (e: any) {
            alert(`エラーが発生しました: ${e.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRangeSearch = () => {
        if (formData.artist && formData.title) {
            openRangeSearch(formData.artist, formData.title);
        } else {
            alert('アーティスト名と曲名を入力してください');
        }
    };

    const handleMyHighestMatch = () => {
        const userHighest = localStorage.getItem('userHighestNote');
        if (!userHighest) {
            alert('先にヘッダーから「my最高音」を設定してください。');
            return;
        }
        if (!formData.highestNote) {
            alert('この曲の最高音が設定されていません。\n先に自動取得または手動入力してください。');
            return;
        }

        const shift = calculateBestShift(formData.highestNote, userHighest);
        if (shift !== null) {
            setFormData(prev => ({ ...prev, myKeyShift: shift }));
            alert(`Myキーを ${shift > 0 ? '+' : ''}${shift} に設定しました。\n(曲最高音: ${formData.highestNote} → あなたの最高音: ${userHighest})`);
        } else {
            alert('キー計算に失敗しました。音域情報を確認してください。');
        }
    };


    const isEditing = !!formData.id;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)'
        }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', background: '#0f172a', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                        {isEditing ? '楽曲詳細・編集' : '新規登録'}
                    </h2>
                    <button onClick={onClose}><X size={24} color={'var(--text-secondary)'} /></button>
                </div>

                {/* content */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Basic Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '1rem' }}>
                        {formData.artworkUrl && (
                            <img src={formData.artworkUrl} alt="Cover" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                            <label className="field-label">
                                <span>曲名</span>
                                <input
                                    className="input-premium"
                                    placeholder="曲名"
                                    value={formData.title || ''}
                                    onChange={e => handleChange('title', e.target.value)}
                                    style={{ fontSize: '1.1rem', fontWeight: 'bold' }}
                                />
                            </label>
                            <label className="field-label">
                                <span>アーティスト名</span>
                                <input
                                    className="input-premium"
                                    placeholder="アーティスト名"
                                    value={formData.artist || ''}
                                    onChange={e => handleChange('artist', e.target.value)}
                                />
                            </label>
                        </div>
                    </div>

                    <hr style={{ borderColor: 'var(--glass-border)', opacity: 0.3 }} />

                    {/* Vocal Range Section */}
                    <div style={{ margin: '0', padding: '0', background: 'transparent', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                音域・キー情報
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing}
                                    style={{
                                        fontSize: '0.75rem',
                                        padding: '0.4rem 0.7rem',
                                        background: '#ef4444',
                                        color: 'white',
                                        borderRadius: '20px',
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        opacity: isAnalyzing ? 0.7 : 1, border: 'none', cursor: 'pointer'
                                    }}
                                >
                                    {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                    自動取得
                                </button>
                                <button
                                    type="button"
                                    onClick={handleMyHighestMatch}
                                    style={{
                                        fontSize: '0.75rem',
                                        padding: '0.4rem 0.7rem',
                                        background: '#8b5cf6',
                                        color: 'white',
                                        borderRadius: '20px',
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        border: 'none', cursor: 'pointer'
                                    }}
                                >
                                    <Music2 size={14} /> my最高音マッチ
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRangeSearch}
                                    style={{
                                        fontSize: '0.75rem',
                                        padding: '0.4rem 0.7rem',
                                        background: 'rgba(56, 189, 248, 0.1)',
                                        color: '#38bdf8',
                                        borderRadius: '20px',
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        border: 'none', cursor: 'pointer'
                                    }}
                                >
                                    <ExternalLink size={14} /> Web検索
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <label className="field-label">
                                <span>最高音 (地声)</span>
                                <input
                                    className="input-premium" placeholder="例: hiA"
                                    value={formData.highestChestNote || ''}
                                    onChange={e => handleChange('highestChestNote', e.target.value)}
                                />
                            </label>
                            <label className="field-label">
                                <span>最高音 (裏声込み)</span>
                                <input
                                    className="input-premium" placeholder="例: hiC"
                                    value={formData.highestNote || ''}
                                    onChange={e => handleChange('highestNote', e.target.value)}
                                />
                            </label>
                            <label className="field-label">
                                <span>最低音</span>
                                <input
                                    className="input-premium" placeholder="例: lowG"
                                    value={formData.lowestNote || ''}
                                    onChange={e => handleChange('lowestNote', e.target.value)}
                                />
                            </label>
                            <label className="field-label">
                                <span>原曲キー</span>
                                <input
                                    className="input-premium" placeholder="例: C, +2"
                                    value={formData.originalKey || ''}
                                    onChange={e => handleChange('originalKey', e.target.value)}
                                />
                            </label>
                        </div>
                    </div>

                    {/* My Key & Memo */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                        <label className="field-label">
                            <span>Myキー設定</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button
                                    onClick={() => handleChange('myKeyShift', (formData.myKeyShift || 0) - 1)}
                                    style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}
                                >-</button>
                                <input
                                    type="number"
                                    className="input-premium"
                                    style={{ textAlign: 'center' }}
                                    value={formData.myKeyShift || 0}
                                    onChange={e => handleChange('myKeyShift', parseInt(e.target.value) || 0)}
                                />
                                <button
                                    onClick={() => handleChange('myKeyShift', (formData.myKeyShift || 0) + 1)}
                                    style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}
                                >+</button>
                            </div>
                        </label>
                        <label className="field-label">
                            <span>タグ/ジャンル (メモ)</span>
                            <input
                                className="input-premium"
                                value={formData.album || ''} // Using album field as secondary info/tag for now or just generic
                                placeholder="ロック, バラード..."
                                onChange={e => handleChange('album', e.target.value)}
                            />
                        </label>
                    </div>

                    <label className="field-label">
                        <span>メモ (200文字以内)</span>
                        <textarea
                            className="input-premium"
                            rows={3}
                            placeholder="歌唱時のポイントなど"
                            value={formData.memo || ''}
                            onChange={e => handleChange('memo', e.target.value)}
                            style={{ resize: 'none' }}
                        />
                    </label>

                </div>

                {/* Footer */}
                <div style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
                    {isEditing && onDelete ? (
                        <button
                            onClick={() => {
                                if (window.confirm('削除しますか？')) onDelete(formData.id!);
                            }}
                            style={{ color: 'var(--error-color)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                        >
                            <Trash2 size={18} />
                            削除
                        </button>
                    ) : <div />}

                    <button
                        onClick={() => onSave(formData)}
                        style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            padding: '0.75rem 2rem',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        <Save size={18} />
                        保存
                    </button>
                </div>
            </div>

            <style>{`
         .input-premium {
           width: 100%;
           background: rgba(0, 0, 0, 0.2);
           border: 1px solid var(--glass-border);
           padding: 0.6rem;
           border-radius: var(--radius-sm);
           color: white;
           outline: none;
           font-size: 16px;
         }
         .input-premium:focus {
           border-color: var(--primary-color);
           background: rgba(0, 0, 0, 0.4);
         }
         .field-label {
           display: flex;
           flex-direction: column;
           gap: 0.4rem;
         }
         .field-label span {
           font-size: 0.8rem;
           color: var(--text-secondary);
         }
       `}</style>
        </div>
    );
}
