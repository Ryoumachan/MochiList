import { useState, useMemo } from 'react';
import { Plus, ArrowUpDown, LogOut, Loader2 } from 'lucide-react';
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
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        marginTop: '1rem',
        padding: '1.5rem',
      }} className="glass-panel">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>MochiList</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            最高のパフォーマンスを。音域管理ツール
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ marginRight: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowUpDown size={16} color="var(--text-secondary)" />
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value as SortOption)}
              style={{
                background: 'transparent',
                color: 'var(--text-primary)',
                border: 'none',
                fontSize: '0.9rem',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none', // Hide default arrow
                textAlign: 'right'
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
            className="glass-panel"
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}
            onClick={handleManualAdd}
          >
            手動登録
          </button>

          <button
            className="glass-panel"
            title="ログアウト"
            style={{ padding: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}
            onClick={() => signOut()}
          >
            <LogOut size={16} />
          </button>

          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
              color: '#fff',
              padding: '0.6rem 1.2rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              boxShadow: '0 4px 6px rgba(56, 189, 248, 0.2)'
            }}
            onClick={() => setIsSearchOpen(true)}
          >
            <Plus size={18} />
            <span>楽曲追加</span>
          </button>
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
