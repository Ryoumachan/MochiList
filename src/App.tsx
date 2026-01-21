import { useState, useMemo } from 'react';
import { Plus, ArrowUpDown, LogOut, Loader2, Search } from 'lucide-react';
import { useSongs } from './hooks/useSongs';
import { SongList } from './components/SongList';
import { SongSearchModal } from './components/SongSearchModal';
import { SongDetailModal } from './components/SongDetailModal';
import { AuthPage } from './components/AuthPage';
import { useAuth } from './context/AuthContext';
import type { Song, SortOption } from './types';

function App() {
  const { user, loading, signOut } = useAuth();
  const { songs, addSong, updateSong, deleteSong, getSortedSongs, isLoading: isDataLoading } = useSongs();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Partial<Song> | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('addedDesc');

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

  // When adding via search
  const handleSearchResultSelect = (songData: Partial<Song>) => {
    // Open detail modal with pre-filled data
    setEditingSong(songData);
  };

  const handleSaveSong = (data: Partial<Song>) => {
    if (data.id) {
      // Update
      updateSong(data.id, data);
    } else {
      // Add new
      addSong(data as Song);
    }
    setEditingSong(null);
  };

  const handleDeleteSong = (id: string) => {
    deleteSong(id);
    setEditingSong(null);
  };

  // Open existing song
  const handleSongClick = (song: Song) => {
    setEditingSong(song);
  };

  // Open fresh manual entry
  const handleManualAdd = () => {
    setEditingSong({ myKeyShift: 0 });
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
          {/* Action Buttons Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) 2fr', gap: '1rem' }}>
            <button
              onClick={handleManualAdd}
              className="glass-panel"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem', fontWeight: 600, fontSize: '0.9rem',
                background: 'rgba(30, 41, 59, 0.5)'
              }}
            >
              手動登録
            </button>
            <button
              onClick={() => setIsSearchOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '1rem', fontWeight: 600, fontSize: '1rem',
                background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                color: 'white',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 4px 15px rgba(56, 189, 248, 0.3)'
              }}
            >
              <Search size={20} />
              楽曲追加
            </button>
          </div>

          {/* Sort & Random Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <ArrowUpDown size={16} />
              <select
                value={sortOption}
                onChange={e => setSortOption(e.target.value as SortOption)}
                style={{
                  background: 'transparent',
                  color: 'inherit',
                  border: 'none',
                  fontSize: 'inherit',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none'
                }}
              >
                <option value="addedDesc" style={{ background: '#1e293b' }}>登録順 (新しい)</option>
                <option value="addedAsc" style={{ background: '#1e293b' }}>登録順 (古い)</option>
                <option value="keyShiftDesc" style={{ background: '#1e293b' }}>変化大 (|MyKey|)</option>
                <option value="keyShiftAsc" style={{ background: '#1e293b' }}>変化小 (|MyKey|)</option>
                <option value="highestNoteDesc" style={{ background: '#1e293b' }}>最高音 (高い順)</option>
                <option value="highestNoteAsc" style={{ background: '#1e293b' }}>最高音 (低い順)</option>
                <option value="artistAsc" style={{ background: '#1e293b' }}>アーティスト名</option>
                <option value="titleAsc" style={{ background: '#1e293b' }}>曲名</option>
              </select>
            </div>

            <button
              onClick={() => {
                if (visibleSongs.length === 0) return;
                const random = visibleSongs[Math.floor(Math.random() * visibleSongs.length)];
                handleSongClick(random);
              }}
              style={{
                background: '#ef4444',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}
            >
              <div style={{ fontSize: '1.2rem' }}>🎲</div>
              ランダム選曲
            </button>
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
              <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>右上のボタンから、あなたのレパートリーを追加しましょう。</p>
            </div>
          ) : (
            <SongList songs={visibleSongs} onSongClick={handleSongClick} />
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
