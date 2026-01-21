import { useState, useMemo, useEffect } from 'react';
import { Plus, ArrowUpDown, LogOut, Loader2, Search, Wand2, Music2, Play } from 'lucide-react';
import { useSongs } from './hooks/useSongs';
import { SongList } from './components/SongList';
import { SongSearchModal } from './components/SongSearchModal';
import { SongDetailModal } from './components/SongDetailModal';
import { AuthPage } from './components/AuthPage';
import { useAuth } from './context/AuthContext';
import { calculateBestShift } from './utils/musicTheory';
import type { Song, SortOption } from './types';

function App() {
  const { user, loading, signOut } = useAuth();
  const { songs, addSong, updateSong, updateSongs, deleteSong, getSortedSongs, isLoading: isDataLoading } = useSongs();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Partial<Song> | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('addedDesc');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  // Batch & User Settings
  const [userHighestNote, setUserHighestNote] = useState(() => localStorage.getItem('userHighestNote') || '');
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);

  // getSortedSongs returns a new array, so we memorize it to avoid re-sort on every render if not needed
  const visibleSongs = useMemo(() => getSortedSongs(sortOption), [songs, sortOption, getSortedSongs]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // --- Handlers ---

  const handleSearchResultSelect = (songData: Partial<Song>) => {
    setEditingSong(songData);
  };

  const handleSaveSong = (data: Partial<Song>) => {
    if (data.id) {
      updateSong(data.id, data);
    } else {
      addSong(data as Song);
    }
    setEditingSong(null);
  };

  const handleDeleteSong = (id: string) => {
    deleteSong(id);
    setEditingSong(null);
  };

  const handleSongClick = (song: Song) => {
    setEditingSong(song);
  };

  const handleManualAdd = () => {
    setEditingSong({ myKeyShift: 0 });
  };

  const handleRandomPickup = () => {
    if (visibleSongs.length === 0) return;
    const random = visibleSongs[Math.floor(Math.random() * visibleSongs.length)];
    setEditingSong(random);
  };

  // --- Batch Operations ---

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedSongIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSongIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedSongIds.size === visibleSongs.length) {
      setSelectedSongIds(new Set());
    } else {
      setSelectedSongIds(new Set(visibleSongs.map(s => s.id)));
    }
  };

  const handleBatchAutoFetch = async () => {
    const targets = songs.filter(s => !s.highestNote);
    if (targets.length === 0) {
      alert('音域情報の自動取得が必要な曲は見つかりませんでした。\n(すべての曲に情報が設定済みです)');
      return;
    }

    if (!window.confirm(`${targets.length}件の曲について自動取得を行いますか？\n(時間がかかる場合があります)`)) return;

    setIsBatchAnalyzing(true);
    const updates: { id: string, data: Partial<Song> }[] = [];

    // Process sequentially to be gentle to the API
    for (const song of targets) {
      try {
        const query = `${song.title} ${song.artist}`;
        // Use analyze mode
        const res = await fetch(`/api/proxy?mode=analyze&q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.highestNote || data.lowestNote) {
            updates.push({
              id: song.id,
              data: {
                highestNote: data.highestNote,
                highestChestNote: data.highestChestNote,
                lowestNote: data.lowestNote
              }
            });
          }
        }
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.error(`Failed to fetch for ${song.title}`, e);
      }
    }

    if (updates.length > 0) {
      await updateSongs(updates);
      alert(`${updates.length}件の情報を更新しました！`);
    } else {
      alert('新しい情報は取得できませんでした。');
    }
    setIsBatchAnalyzing(false);
  };

  const handleBatchAdjustKey = async () => {
    if (!userHighestNote) {
      alert("設定から「自分声域(最高音)」を入力してください (例: hiA)");
      return;
    }

    const targets = songs.filter(s => selectedSongIds.has(s.id));
    if (targets.length === 0) return;

    if (!window.confirm(`${targets.length}件の曲について、最高音が「${userHighestNote}」に合うようにキーを自動調整しますか？`)) return;

    const updates: { id: string, data: Partial<Song> }[] = [];
    let successCount = 0;

    for (const song of targets) {
      if (!song.highestNote) continue;

      const shift = calculateBestShift(song.highestNote, userHighestNote);
      if (shift !== null) {
        updates.push({
          id: song.id,
          data: { myKeyShift: shift }
        });
        successCount++;
      }
    }

    if (updates.length > 0) {
      await updateSongs(updates);
      alert(`${successCount}件のキーを調整しました！`);
      setSelectedSongIds(new Set()); // Clear Selection
    } else {
      alert('調整可能な曲がありませんでした。(音域情報が不足している可能性があります)');
    }
  };

  return (
    <div className="container">
      <header className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', marginTop: '1rem', position: 'relative' }}>
        <div style={{ paddingRight: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.2rem' }}>MochiList</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            最高のパフォーマンスを。音域管理ツール
          </p>
        </div>

        <button
          onClick={() => signOut()}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'var(--text-secondary)', padding: '0.5rem' }}
        >
          <LogOut size={20} />
        </button>

        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Main Actions Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.8rem',
            marginBottom: '0.5rem'
          }}>
            <button onClick={handleManualAdd}
              className="btn-glass" style={{ justifyContent: 'center' }}>
              <Plus size={18} /> 手動登録
            </button>

            <button onClick={() => setIsSearchOpen(true)}
              className="btn-glass" style={{ justifyContent: 'center' }}>
              <Search size={18} /> 楽曲追加
            </button>

            {/* Batch Fetch (All Missing) */}
            <button onClick={handleBatchAutoFetch}
              disabled={isBatchAnalyzing}
              className="btn-glass"
              style={{
                justifyContent: 'center',
                background: isBatchAnalyzing ? 'rgba(56, 189, 248, 0.3)' : 'rgba(56, 189, 248, 0.15)',
                color: isBatchAnalyzing ? 'white' : '#38bdf8'
              }}>
              {isBatchAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
              未取得自動入力
            </button>

            {/* Sort */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                className="btn-glass"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <ArrowUpDown size={18} />
                {sortConfigLabel(sortOption)}
              </button>
              {isSortMenuOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                  background: '#1e293b', border: '1px solid var(--glass-border)',
                  borderRadius: '8px', overflow: 'hidden', zIndex: 100, minWidth: '160px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                }}>
                  {[
                    { k: 'addedDesc', l: '登録日 (新しい)' },
                    { k: 'addedAsc', l: '登録日 (古い)' },
                    { k: 'keyShiftDesc', l: 'Myキー (変化大)' },
                    { k: 'highestNoteDesc', l: '最高音 (高い順)' },
                    { k: 'artistAsc', l: '歌手名' },
                    { k: 'titleAsc', l: '曲名' },
                  ].map(opt => (
                    <div key={opt.k}
                      onClick={() => { setSortOption(opt.k as any); setIsSortMenuOpen(false); }}
                      style={{ padding: '10px 16px', color: 'white', cursor: 'pointer', fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {opt.l}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* User Settings & Tools Row */}
          <div className="glass-panel" style={{
            padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
            background: 'rgba(15, 23, 42, 0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>自分の最高音:</span>
              <input
                className="input-premium"
                style={{ width: '60px', padding: '4px 8px', textAlign: 'center', fontSize: '0.9rem' }}
                placeholder="hiA"
                value={userHighestNote}
                onChange={(e) => setUserHighestNote(e.target.value)}
                onBlur={() => localStorage.setItem('userHighestNote', userHighestNote)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {selectedSongIds.size > 0 && (
                <button
                  onClick={handleBatchAdjustKey}
                  className="btn-glass"
                  style={{
                    background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.3)',
                    padding: '0.5rem 1rem', fontSize: '0.85rem'
                  }}
                >
                  <Music2 size={16} /> キー自動調整 ({selectedSongIds.size})
                </button>
              )}

              <button
                onClick={handleRandomPickup}
                style={{
                  background: 'var(--error-color)',
                  color: 'white',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '30px',
                  fontWeight: 'bold',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                  border: 'none', cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                <Play size={16} fill="currentColor" />
                ランダム選曲
              </button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {isDataLoading && visibleSongs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            <Loader2 className="animate-spin" style={{ display: 'inline-block' }} /> 読み込み中...
          </div>
        ) : (
          visibleSongs.length === 0 ? (
            <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={32} opacity={0.5} />
              </div>
              <p style={{ fontSize: '1.1rem' }}>まだ持ち歌が登録されていません</p>
              <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>楽曲追加ボタンから、あなたのレパートリーを追加しましょう。</p>
            </div>
          ) : (
            <SongList
              songs={visibleSongs}
              onSongClick={handleSongClick}
              selectedIds={selectedSongIds}
              onToggleSelect={handleToggleSelect}
            />
          )
        )}
      </main>

      <SongSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelect={handleSearchResultSelect}
      />

      <SongDetailModal
        isOpen={!!editingSong}
        song={editingSong}
        onClose={() => setEditingSong(null)}
        onSave={handleSaveSong}
        onDelete={handleDeleteSong}
      />
    </div>
  );
}

function sortConfigLabel(key: string) {
  if (key.includes('added')) return '登録順';
  if (key.includes('key')) return 'Myキー';
  if (key.includes('note')) return '最高音';
  if (key.includes('artist')) return '歌手名';
  if (key.includes('title')) return '曲名';
  return 'ソート';
}

export default App;
