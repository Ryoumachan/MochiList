import { useState, useEffect } from 'react';
import type { Song, SortOption } from '../types';
import { getNoteValue } from '../utils/music';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useSongs() {
    const { user } = useAuth();
    const [songs, setSongs] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load from Supabase
    useEffect(() => {
        if (!user) {
            setSongs([]);
            setIsLoading(false);
            return;
        }

        const fetchSongs = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('songs')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching songs:', error);
            } else if (data) {
                // Map snake_case to camelCase manually or keep consistent?
                // Supabase returns what is in DB (snake_case columns).
                // My types are camelCase. I need to map them or update DB columns to camelCase.
                // For simplicity, let's map them here.
                const mappedSongs: Song[] = data.map((d: any) => ({
                    id: d.id,
                    title: d.title,
                    artist: d.artist,
                    album: d.album,
                    artworkUrl: d.artwork_url,
                    lyricsSnippet: d.lyrics_snippet,
                    originalKey: d.original_key,
                    highestNote: d.highest_note,
                    highestChestNote: d.highest_chest_note,
                    lowestNote: d.lowest_note,
                    myKeyShift: d.my_key_shift,
                    memo: d.memo,
                    createdAt: d.created_at,
                    updatedAt: d.updated_at
                }));
                setSongs(mappedSongs);
            }
            setIsLoading(false);
        };

        fetchSongs();
    }, [user]);

    const addSong = async (song: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (!user) return;

        const dbSong = {
            user_id: user.id,
            title: song.title,
            artist: song.artist,
            album: song.album,
            artwork_url: song.artworkUrl,
            lyrics_snippet: song.lyricsSnippet,
            original_key: song.originalKey,
            highest_note: song.highestNote,
            highest_chest_note: song.highestChestNote,
            lowest_note: song.lowestNote,
            my_key_shift: song.myKeyShift,
            memo: song.memo,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('songs')
            .insert([dbSong])
            .select()
            .single();

        if (error) {
            console.error('Error adding song:', error);
            // alert('Failed to add');
            return;
        }

        if (data) {
            const newSong: Song = {
                id: data.id,
                title: data.title,
                artist: data.artist,
                album: data.album,
                artworkUrl: data.artwork_url,
                lyricsSnippet: data.lyrics_snippet,
                originalKey: data.original_key,
                highestNote: data.highest_note,
                highestChestNote: data.highest_chest_note,
                lowestNote: data.lowest_note,
                myKeyShift: data.my_key_shift,
                memo: data.memo,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
            setSongs(prev => [newSong, ...prev]);
        }
    };

    const updateSong = async (id: string, updates: Partial<Omit<Song, 'id' | 'createdAt'>>) => {
        if (!user) return;

        // Map updates to snake_case
        const dbUpdates: any = {
            updated_at: new Date().toISOString()
        };
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.artist !== undefined) dbUpdates.artist = updates.artist;
        if (updates.album !== undefined) dbUpdates.album = updates.album;
        if (updates.artworkUrl !== undefined) dbUpdates.artwork_url = updates.artworkUrl;
        if (updates.originalKey !== undefined) dbUpdates.original_key = updates.originalKey;
        if (updates.highestNote !== undefined) dbUpdates.highest_note = updates.highestNote;
        if (updates.highestChestNote !== undefined) dbUpdates.highest_chest_note = updates.highestChestNote;
        if (updates.lowestNote !== undefined) dbUpdates.lowest_note = updates.lowestNote;
        if (updates.myKeyShift !== undefined) dbUpdates.my_key_shift = updates.myKeyShift;
        if (updates.memo !== undefined) dbUpdates.memo = updates.memo;

        const { error } = await supabase
            .from('songs')
            .update(dbUpdates)
            .eq('id', id);

        if (error) {
            console.error('Error updating song:', error);
            return;
        }

        setSongs(prev => prev.map(s =>
            s.id === id
                ? { ...s, ...updates, updatedAt: new Date().toISOString() }
                : s
        ));
    };

    const deleteSong = async (id: string) => {
        if (!user) return;

        const { error } = await supabase
            .from('songs')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting song:', error);
            return;
        }

        setSongs(prev => prev.filter(s => s.id !== id));
    };

    // Basic sorting
    const getSortedSongs = (option: SortOption): Song[] => {
        const sorted = [...songs];

        sorted.sort((a, b) => {
            switch (option) {
                case 'addedDesc':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'addedAsc':
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'keyShiftDesc':
                    return Math.abs(b.myKeyShift) - Math.abs(a.myKeyShift);
                case 'keyShiftAsc':
                    return Math.abs(a.myKeyShift) - Math.abs(b.myKeyShift);
                case 'artistAsc':
                    return a.artist.localeCompare(b.artist, 'ja');
                case 'titleAsc':
                    return a.title.localeCompare(b.title, 'ja');
                case 'highestNoteDesc':
                    return (getNoteValue(b.highestNote) - getNoteValue(a.highestNote));
                case 'highestNoteAsc':
                    return (getNoteValue(a.highestNote) - getNoteValue(b.highestNote));
                default:
                    return 0;
            }
        });

        return sorted;
    };

    return {
        songs,
        addSong,
        updateSong,
        deleteSong,
        isLoading,
        getSortedSongs
    };
}
