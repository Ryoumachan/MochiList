import { useState, useMemo } from 'react';
import { Plus, ArrowUpDown, LogOut, Loader2, Search, ChevronDown, ChevronUp, CheckSquare, Square, Trash2, FileText, FolderOpen, Download } from 'lucide-react';
import { useSongs } from './hooks/useSongs';
import { SongList } from './components/SongList';
import { SongSearchModal } from './components/SongSearchModal';
import { SongDetailModal } from './components/SongDetailModal';
import { CsvImportModal } from './components/CsvImportModal';
import { AuthPage } from './components/AuthPage';
import { useAuth } from './context/AuthContext';
import { generateNoteOptions } from './utils/musicTheory';
import type { Song, SortOption } from './types';

// Sort category (without direction)
type SortCategory = 'added' | 'keyShift' | 'highestNote' | 'artist' | 'title';

function App() {
  const { user, loading, signOut } = useAuth();
  const { songs, addSong, updateSong, deleteSong, deleteSongs, getSortedSongs, isLoading: isDataLoading, playlists, addCustomPlaylist } = useSongs();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Partial<Song> | null>(null);

  // New Sort State: category + direction
  const [sortCategory, setSortCategory] = useState<SortCategory>('added');
  const [sortAsc, setSortAsc] = useState(false); // false = descending, true = ascending
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  // Batch & User Settings
  const [userHighestNote, setUserHighestNote] = useState(() => localStorage.getItem('userHighestNote') || 'hiA');
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());

  // Playlist filter
  const [activePlaylist, setActivePlaylist] = useState<string | null>(null); // null = all songs

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

  const visibleSongs = useMemo(() => {
    const sorted = getSortedSongs(sortOption);
    if (activePlaylist === null) return sorted;
    if (activePlaylist === '__unclassified__') return sorted.filter(s => !s.playlist);
    return sorted.filter(s => s.playlist === activePlaylist);
  }, [songs, sortOption, getSortedSongs, activePlaylist]);

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
    setEditingSong({ myKeyShift: 0, playlist: activePlaylist === '__unclassified__' ? undefined : (activePlaylist || undefined) });
  };

  const handleRandomPickup = () => {
    if (visibleSongs.length === 0) return;

    // Weighted random: songs not selected recently have higher weight
    const history = JSON.parse(localStorage.getItem('randomHistory') || '[]') as string[];

    const weights = visibleSongs.map(song => {
      const idx = history.indexOf(song.id);
      if (idx === -1) return 10; // Never selected = highest weight
      return Math.max(1, 10 - idx); // More recent = lower weight
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    let selected = visibleSongs[0];

    for (let i = 0; i < visibleSongs.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        selected = visibleSongs[i];
        break;
      }
    }

    // Update history (keep last 20)
    const newHistory = [selected.id, ...history.filter(id => id !== selected.id)].slice(0, 20);
    localStorage.setItem('randomHistory', JSON.stringify(newHistory));

    setEditingSong(selected);
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

  const handleBatchDelete = async () => {
    if (selectedSongIds.size === 0) return;

    if (!window.confirm(`${selectedSongIds.size}件の曲を削除してもよろしいですか？`)) return;

    await deleteSongs(Array.from(selectedSongIds));
    setSelectedSongIds(new Set());
  };

  const handleExportCsv = () => {
    if (visibleSongs.length === 0) {
      alert('エクスポートする曲がありません');
      return;
    }
    if (!window.confirm(`${visibleSongs.length}件の曲をCSVでエクスポートしますか？`)) return;

    // Header array
    const headers = ['曲名', 'アーティスト名', 'マイキー', '裏声最高音', '地声最高音', '地声最低音', 'メモ'];
    
    // Create rows
    const csvRows = visibleSongs.map(s => {
      const row = [
        s.title || '',
        s.artist || '',
        s.myKeyShift.toString(),
        s.highestNote || '',
        s.highestChestNote || '',
        s.lowestNote || '',
        s.memo || ''
      ];
      // Escape quotes and wrap with quotes
      return row.map(str => `"${str.replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    
    // Add BOM for Excel UTF-8 support
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const defaultFileName = activePlaylist && activePlaylist !== '__unclassified__' 
      ? `playlist_${activePlaylist}.csv` 
      : 'mochilist.csv';
      
    link.download = defaultFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.2rem' }}>モチリスト</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            持ち歌管理ツール
          </p>
        </div>

        <button
          onClick={() => signOut()}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'var(--text-secondary)', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
        >
          ログアウト <LogOut size={18} />
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

          {/* CSV Import / Export row */}
          <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setIsCsvImportOpen(true)}
              style={{
                background: '#0d9488', color: 'white', borderRadius: '30px', fontWeight: 'bold',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: '0 4px 10px rgba(13, 148, 136, 0.3)',
                fontSize: '0.9rem', flex: 1,
                border: 'none', cursor: 'pointer', padding: '0.7rem 1rem'
              }}
            >
              <FileText size={18} /> インポート
            </button>
            <button
              onClick={handleExportCsv}
              style={{
                background: '#4f46e5', color: 'white', borderRadius: '30px', fontWeight: 'bold',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)',
                fontSize: '0.9rem', flex: 1,
                border: 'none', cursor: 'pointer', padding: '0.7rem 1rem'
              }}
            >
              <Download size={18} /> エクスポート
            </button>
          </div>

          {/* Middle Left: Random Pickup */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <button
              onClick={handleRandomPickup}
              style={{
                background: '#b91c1c', color: 'white',
                padding: '0.8rem 1.2rem', borderRadius: '30px',
                fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(185, 28, 28, 0.4)',
                border: 'none', cursor: 'pointer', width: '100%', height: '54px',
                fontSize: '0.95rem', justifyContent: 'center'
              }}
            >
              <div style={{ fontSize: '1.4rem' }}>🎲</div>
              ランダム選曲
            </button>
          </div>

          {/* Middle Right: Search (Big Circle) */}
          <div style={{ display: 'grid', gridRow: 'span 1', justifyContent: 'center', alignItems: 'center' }}>
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

        </div>
      </header>

      {/* Playlist Tabs */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0 0.5rem', marginBottom: '1rem',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none'
      }}>
        <button
          onClick={() => { setActivePlaylist(null); setSelectedSongIds(new Set()); }}
          style={{
            padding: '0.5rem 1rem', borderRadius: '20px',
            fontSize: '0.85rem', fontWeight: activePlaylist === null ? 'bold' : 'normal',
            background: activePlaylist === null ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.05)',
            border: activePlaylist === null ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(255,255,255,0.1)',
            color: activePlaylist === null ? '#a5b4fc' : 'var(--text-secondary)',
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            transition: 'all 0.2s'
          }}
        >
          すべて ({songs.length})
        </button>
        <button
          onClick={() => { setActivePlaylist('__unclassified__'); setSelectedSongIds(new Set()); }}
          style={{
            padding: '0.5rem 1rem', borderRadius: '20px',
            fontSize: '0.85rem', fontWeight: activePlaylist === '__unclassified__' ? 'bold' : 'normal',
            background: activePlaylist === '__unclassified__' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.05)',
            border: activePlaylist === '__unclassified__' ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(255,255,255,0.1)',
            color: activePlaylist === '__unclassified__' ? '#a5b4fc' : 'var(--text-secondary)',
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            transition: 'all 0.2s'
          }}
        >
          未分類 ({songs.filter(s => !s.playlist).length})
        </button>
        {playlists.map(pl => {
          const count = songs.filter(s => s.playlist === pl).length;
          return (
            <button
              key={pl}
              onClick={() => { setActivePlaylist(pl); setSelectedSongIds(new Set()); }}
              style={{
                padding: '0.5rem 1rem', borderRadius: '20px',
                fontSize: '0.85rem', fontWeight: activePlaylist === pl ? 'bold' : 'normal',
                background: activePlaylist === pl ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.05)',
                border: activePlaylist === pl ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                color: activePlaylist === pl ? '#a5b4fc' : 'var(--text-secondary)',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                transition: 'all 0.2s'
              }}
            >
              <FolderOpen size={14} /> {pl} ({count})
            </button>
          );
        })}
        <button
          onClick={() => { 
            const name = window.prompt("新しいプレイリスト名を入力してください:");
            if (name && name.trim()) {
              addCustomPlaylist(name.trim());
              setActivePlaylist(name.trim());
            }
          }}
          style={{
            padding: '0.5rem 1rem', borderRadius: '20px',
            fontSize: '0.85rem', fontWeight: 'bold',
            background: 'transparent',
            border: '1px dashed rgba(255,255,255,0.3)',
            color: 'var(--text-secondary)',
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            transition: 'all 0.2s'
          }}
        >
          <Plus size={14} /> 新規作成
        </button>
      </div>

      {/* Sort Tools & Select All */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.5rem', padding: '0 0.5rem', flexWrap: 'wrap', gap: '0.5rem'
      }}>
        {/* Select All */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={handleSelectAll}
            style={{
              background: 'transparent', border: 'none', color: 'white',
              display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
              fontSize: '0.9rem', padding: 0
            }}
          >
            {selectedSongIds.size === visibleSongs.length && visibleSongs.length > 0
              ? <CheckSquare size={20} />
              : <Square size={20} />
            }
            全選択
          </button>

          {selectedSongIds.size > 0 && (
            <button
              onClick={handleBatchDelete}
              style={{
                background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171', borderRadius: '6px', padding: '4px 12px',
                display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 'bold'
              }}
            >
              <Trash2 size={16} />
              選択削除 ({selectedSongIds.size})
            </button>
          )}
        </div>

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
        existingSongs={songs}
        activePlaylist={activePlaylist}
      />

      <SongDetailModal
        isOpen={!!editingSong}
        song={editingSong}
        onClose={() => setEditingSong(null)}
        onSave={handleSaveSong}
        onDelete={handleDeleteSong}
        playlists={playlists}
      />

      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        playlists={playlists}
        onImportSong={async (song) => { await addSong(song); }}
      />
    </div>
  );
}

export default App;
