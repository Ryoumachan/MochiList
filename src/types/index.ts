export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  lyricsSnippet?: string;

  // Vocal Range
  originalKey: string;     // e.g. "C", "F#m", "mid1C" (if raw text needed) but usually "C"
  highestNote: string;     // e.g. "hiC", "C5"
  highestChestNote: string;// e.g. "hiA", "A4"
  lowestNote: string;      // e.g. "lowG", "G3"

  // User Settings
  myKeyShift: number; // 0, -1, +2
  memo: string;
  playlist?: string; // Playlist/folder name

  createdAt: string; // ISO Date string
  updatedAt: string;
}

export type SortOption = 
  | 'addedDesc' 
  | 'addedAsc' 
  | 'keyShiftDesc' // |MyKey| desc (High difficulty change)
  | 'keyShiftAsc'
  | 'artistAsc'
  | 'titleAsc'
  | 'highestNoteDesc'
  | 'highestNoteAsc';
