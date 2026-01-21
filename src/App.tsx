import { useState, useMemo } from 'react';
import { Plus, ArrowUpDown, LogOut, Loader2, Search, ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react';
import { useSongs } from './hooks/useSongs';
import { SongList } from './components/SongList';
import { SongSearchModal } from './components/SongSearchModal';
import { SongDetailModal } from './components/SongDetailModal';
import { AuthPage } from './components/AuthPage';
import { useAuth } from './context/AuthContext';
import { calculateBestShift, generateNoteOptions } from './utils/musicTheory';
import type { Song, SortOption } from './types';

// Sort category (without direction)
type SortCategory = 'added' | 'keyShift' | 'highestNote' | 'artist' | 'title';

function App() {
  const { user, loading, signOut } = useAuth();
  const { songs, addSong, updateSong, updateSongs, deleteSong, getSortedSongs, isLoading: isDataLoading } = useSongs();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Partial<Song> | null>(null);

  // New Sort State: category + direction
  const [sortCategory, setSortCategory] = useState<SortCategory>('added');
  const [sortAsc, setSortAsc] = useState(false); // false = descending, true = ascending
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  // Batch & User Settings
  const [userHighestNote, setUserHighestNote] = useState(() => localStorage.getItem('userHighestNote') || 'hiA');
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState('');

  const noteOptions = useMemo(() => generateNoteOptions(), []);

  // Convert category + direction to SortOption
  const sortOption: SortOption = useMemo(() => {
    switch (sortCategory) {
      case 'added': return sortAsc ? 'addedAsc' : 'addedDesc';
      case 'keyShift': return sortAsc ? 'keyShiftAsc' : 'keyShiftDesc';
      case 'highestNote': return sortAsc ? 'highestNoteAsc' : 'highestNoteDesc';
      case 'artist': return 'artistAsc'; // Artist is always ascending (A-Z)
      case 'title': return 'titleAsc';   // Title is always ascending (A-Z)
      default: return 'addedDesc';
    }
  }, [sortCategory, sortAsc]);

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

  const handleSortCategoryChange = (cat: SortCategory) => {
    if (cat === sortCategory) {
      // Toggle direction if same category
      setSortAsc(!sortAsc);
    } else {
      setSortCategory(cat);
      // Default direction for new category
      setSortAsc(cat === 'artist' || cat === 'title'); // A-Z for text, newest first for others
    }
    setIsSortMenuOpen(false);
  };

  const handleToggleSortDirection = () => {
    setSortAsc(!sortAsc);
  };

  // --- Selection Operations ---

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

  // --- Batch Operations ---

  const handleBatchAutoFetch = async () => {
    const targets = songs.filter(s => !s.highestNote);
    if (targets.length === 0) {
      alert('音域情報の自動取得が必要な曲は見つかりませんでした。\n(すべての曲に情報が設定済みです)');
      return;
    }

    if (!window.confirm(`${targets.length}件の曲について自動取得を行いますか？\n(時間がかかる場合があります)`)) return;

    setIsBatchAnalyzing(true);
    const updates: { id: string, data: Partial<Song> }[] = [];
    let notFoundCount = 0;

    for (let i = 0; i < targets.length; i++) {
      const song = targets[i];
      setBatchProgress(`処理中: ${song.title} (${i + 1}/${targets.length})`);

      try {
        const query = `${song.title} ${song.artist}`;
        // Use analyze2 mode for targeted site scraping
        const res = await fetch(`/api/proxy?mode=analyze2&q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.notFound) {
            notFoundCount++;
          } else if (data.highestNote || data.lowestNote) {
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
        await new Promise(resolve => setTimeout(resolve, 700));
      } catch (e) {
        console.error(`Failed to fetch for ${song.title}`, e);
      }
    }

    setBatchProgress('');

    if (updates.length > 0) {
      await updateSongs(updates);
    }

    let msg = '';
    if (updates.length > 0) msg += `${updates.length}件の情報を更新しました。`;
    if (notFoundCount > 0) msg += `\n${notFoundCount}件は該当データが見つかりませんでした。手動で入力してください。`;
    if (updates.length === 0 && notFoundCount === 0) msg = '新しい情報は取得できませんでした。';

    alert(msg);
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

  // --- Sort Label ---
  const sortCategoryLabel = (cat: SortCategory) => {
    switch (cat) {
      case 'added': return '追加日';
      case 'keyShift': return 'キー変化量';
      case 'highestNote': return '最高音';
      case 'artist': return '歌手名';
      case 'title': return '曲名';
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
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>my最高音</div>
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

        {/* Batch Progress */}
        {batchProgress && (
          <div style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'rgba(56, 189, 248, 0.2)', borderRadius: '8px', textAlign: 'center', fontSize: '0.9rem' }}>
            {batchProgress}
          </div>
        )}
      </header>

      {/* Sort Tools & Select All */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.5rem', padding: '0 0.5rem', flexWrap: 'wrap', gap: '0.5rem'
      }}>
        {/* Select All */}
        <button
          onClick={handleSelectAll}
          style={{
            background: 'transparent', border: 'none', color: 'white',
            display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          {selectedSongIds.size === visibleSongs.length && visibleSongs.length > 0
            ? <CheckSquare size={20} />
            : <Square size={20} />
          }
          全選択
        </button>

        {/* Sort Display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', position: 'relative' }}>
          <ArrowUpDown size={20} />
          <button
            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
            style={{ background: 'none', border: 'none', color: 'white', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {sortCategoryLabel(sortCategory)}順
          </button>
          <button
            onClick={handleToggleSortDirection}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px', padding: '4px 10px', color: 'white', fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            {sortAsc ? '昇順' : '降順'}
          </button>

          {isSortMenuOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '8px',
              background: '#1e293b', border: '1px solid var(--glass-border)',
              borderRadius: '12px', padding: '0.5rem', zIndex: 100, minWidth: '140px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
              {(['added', 'keyShift', 'highestNote', 'artist', 'title'] as SortCategory[]).map(cat => (
                <div key={cat}
                  onClick={() => handleSortCategoryChange(cat)}
                  style={{
                    padding: '12px 16px', color: cat === sortCategory ? '#38bdf8' : 'white',
                    cursor: 'pointer', fontSize: '1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    fontWeight: cat === sortCategory ? 'bold' : 'normal'
                  }}
                >
                  {sortCategoryLabel(cat)}
                </div>
              ))}
            </div>
          )}
        </div>
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

export default App;
