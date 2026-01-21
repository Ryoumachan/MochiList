import { useState, useMemo, useEffect } from 'react';
import { Plus, ArrowUpDown, LogOut, Loader2, Search, Wand2, Music2, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { useSongs } from './hooks/useSongs';
import { SongList } from './components/SongList';
import { SongSearchModal } from './components/SongSearchModal';
import { SongDetailModal } from './components/SongDetailModal';
import { AuthPage } from './components/AuthPage';
import { useAuth } from './context/AuthContext';
import { calculateBestShift, generateNoteOptions } from './utils/musicTheory';
import type { Song, SortOption } from './types';

function App() {
  const { user, loading, signOut } = useAuth();
  const { songs, addSong, updateSong, updateSongs, deleteSong, getSortedSongs, isLoading: isDataLoading } = useSongs();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Partial<Song> | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('addedDesc');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  // Batch & User Settings
  // Default to mid2A if not set, or hiA
  const [userHighestNote, setUserHighestNote] = useState(() => localStorage.getItem('userHighestNote') || 'hiA');
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);

  const noteOptions = useMemo(() => generateNoteOptions(), []);

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

  const handleUserNoteChange = (note: string) => {
    setUserHighestNote(note);
    localStorage.setItem('userHighestNote', note);
  };

  // --- Batch Operations ---

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedSongIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSongIds(newSet);
  };

  // handleSelectAll is unused in UI currently but good to keep or remove if lint cares.
  // const handleSelectAll = () => { ... }

  const handleBatchAutoFetch = async () => {
    const targets = songs.filter(s => !s.highestNote);
    if (targets.length === 0) {
      alert('音域情報の自動取得が必要な曲は見つかりませんでした。\n(すべての曲に情報が設定済みです)');
      return;
    }

    if (!window.confirm(`${targets.length}件の曲について自動取得を行いますか？\n(時間がかかる場合があります)`)) return;

    setIsBatchAnalyzing(true);
    const updates: { id: string, data: Partial<Song> }[] = [];

    for (const song of targets) {
      try {
        const query = `${song.title} ${song.artist}`;
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
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.error(`Failed to fetch for ${song.title}`, e);
      }
    }

    if (updates.length > 0) {
      await updateSongs(updates);
      alert(`${updates.length}件の情報を更新しました！(Source: Yahoo)`);
    } else {
      alert('新しい情報は取得できませんでした。');
    }
    setIsBatchAnalyzing(false);
  };

  const handleBatchAdjustKey = async () => {
    if (!userHighestNote) {
      alert("my声域を設定してください");
      return;
    }

    const targets = songs.filter(s => selectedSongIds.has(s.id));
    if (targets.length === 0) {
      alert("曲を選択してください");
      return;
    }

    // Confirmation
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
      setSelectedSongIds(new Set());
    } else {
      alert('調整可能な曲がありませんでした。(音域情報が不足している可能性があります)');
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      <header className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', marginTop: '1rem', position: 'relative' }}>
        <div style={{ paddingRight: '2rem', marginBottom: '1.5rem' }}>
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

        {/* Dashboard Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

          {/* Top Left: My Vocal Range */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>my声域</div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: '#e2e8f0', borderRadius: '8px', padding: '0.4rem 0.8rem',
              width: '100%', justifyContent: 'center'
            }}>
              <select
                value={userHighestNote}
                onChange={(e) => handleUserNoteChange(e.target.value)}
                style={{
                  background: 'transparent', border: 'none',
                  fontSize: '1.3rem', fontWeight: 'bold', color: '#1e293b',
                  appearance: 'none', cursor: 'pointer', textAlign: 'center',
                  outline: 'none', width: '100%'
                }}
              >
                {noteOptions.map(note => (
                  <option key={note} value={note}>{note}</option>
                ))}
              </select>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <ChevronUp size={10} color="#1e293b" />
                <ChevronDown size={10} color="#1e293b" />
              </div>
            </div>
          </div>

          {/* Top Right: Manual Add */}
          <button
            onClick={handleManualAdd}
            style={{
              background: '#c2410c', color: 'white', borderRadius: '30px', fontWeight: 'bold',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: '0 4px 10px rgba(194, 65, 12, 0.3)',
              fontSize: '1rem',
              border: 'none', cursor: 'pointer'
            }}
          >
            <Plus size={20} /> <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>手動登録</span>
          </button>

          {/* Middle Left: Batch Actions Stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button
              onClick={handleBatchAutoFetch}
              disabled={isBatchAnalyzing}
              style={{
                background: '#c2410c', color: 'white', borderRadius: '30px', fontWeight: 'bold',
                padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                fontSize: '0.9rem', width: '100%',
                opacity: isBatchAnalyzing ? 0.7 : 1,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(194, 65, 12, 0.3)'
              }}
            >
              {isBatchAnalyzing ? <Loader2 size={16} className="animate-spin" /> : null}
              一括音域設定
            </button>
            <button
              onClick={handleBatchAdjustKey}
              style={{
                background: '#c2410c', color: 'white', borderRadius: '30px', fontWeight: 'bold',
                padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                fontSize: '0.8rem', width: '100%',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(194, 65, 12, 0.3)'
              }}
            >
              一括my声域マッチ
            </button>
          </div>

          {/* Middle Right: Search (Big Circle) */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <button
              onClick={() => setIsSearchOpen(true)}
              style={{
                width: '120px', height: '120px',
                borderRadius: '50%',
                background: '#6366f1', color: 'white',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 25px rgba(99, 102, 241, 0.5)',
                gap: '0.3rem',
                border: '4px solid rgba(255,255,255,0.2)', cursor: 'pointer'
              }}
            >
              <Search size={36} strokeWidth={2.5} />
              <span style={{ fontSize: '1.1rem', fontWeight: '900', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>楽曲検索</span>
            </button>
          </div>

          {/* Bottom Right: Random (Floating-ish) */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              onClick={handleRandomPickup}
              style={{
                background: '#b91c1c', color: 'white',
                padding: '0.6rem 1.2rem', borderRadius: '30px',
                fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(185, 28, 28, 0.4)',
                border: 'none', cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '1.2rem' }}>🎲</div>
              ランダム選曲
            </button>
          </div>

        </div>
      </header>

      {/* Sort Tools (Minimal) */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white' }}>
          <ArrowUpDown size={28} />
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
            <span>{sortOption === 'addedDesc' ? '順' : sortConfigLabel(sortOption).replace(/.*\((.*)\)/, '$1')}</span>
            <button
              onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
              style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '4px' }}
            >
              {sortConfigLabel(sortOption)}
            </button>
          </div>
        </div>
        {isSortMenuOpen && (
          <div style={{
            position: 'absolute', background: '#1e293b', border: '1px solid var(--glass-border)',
            borderRadius: '12px', padding: '0.5rem', zIndex: 100,
            marginTop: '40px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            {[
              { k: 'addedDesc', l: '登録日 (新しい)' },
              { k: 'addedAsc', l: '登録日 (古い)' },
              { k: 'keyShiftDesc', l: 'Myキー (変化大)' },
              { k: 'highestNoteDesc', l: '最高音 (高い)' },
              { k: 'artistAsc', l: '歌手名' },
              { k: 'titleAsc', l: '曲名' },
            ].map(opt => (
              <div key={opt.k}
                onClick={() => { setSortOption(opt.k as any); setIsSortMenuOpen(false); }}
                style={{ padding: '12px 20px', color: 'white', cursor: 'pointer', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                {opt.l}
              </div>
            ))}
          </div>
        )}
      </div>

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
