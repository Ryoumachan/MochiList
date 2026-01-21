
// Map for note names to semitone offsets (C = 0)
const NOTE_OFFSETS: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11
};

// Base octave for "mid2" (usually C4)
// Let's define C4 = 60 (MIDI standard)
// "mid2C" is C4. "hiC" is C5. "mid1C" is C3.
const OCTAVE_OFFSET = 12;

export function noteToMidi(noteStr: string): number | null {
    if (!noteStr) return null;

    // Normalize: remove whitespace, generic full-width
    let s = noteStr.trim().replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));

    // Standardize sharps/flats
    s = s.replace('♯', '#').replace('♭', 'b');

    // Patterns
    // 1. "hiA", "mid2C#", "lowG" (Japanese Karaoke Style)
    // 2. "C5", "A#4" (Scientific)

    // Check Japanese prefixes
    let octave = 4; // Default to mid2 (4) if ambiguous? Or maybe process prefix.
    let noteName = '';

    if (s.startsWith('hihi')) {
        octave = 6;
        noteName = s.slice(4);
    } else if (s.startsWith('hi')) {
        octave = 5;
        noteName = s.slice(2);
    } else if (s.startsWith('mid2')) {
        octave = 4;
        noteName = s.slice(4);
    } else if (s.startsWith('mid1')) {
        octave = 3;
        noteName = s.slice(4);
    } else if (s.startsWith('low')) {
        octave = 2; // lowC is C2
        noteName = s.slice(3);
    } else {
        // Scientific notation? C4, A#3
        const m = s.match(/^([A-G][#b]?)(-?\d+)$/);
        if (m) {
            noteName = m[1];
            octave = parseInt(m[2]);
        } else {
            // Assume just Note Name? But vocal range without octave is useless.
            // Maybe user just typed "A". Assume mid2A (A4) or hiA? 
            // Usually "A" -> A4 in casual conversation?
            // Let's strict fail or default to 4.
            const m2 = s.match(/^([A-G][#b]?)$/);
            if (m2) {
                noteName = m2[1];
                octave = 4;
            } else {
                return null;
            }
        }
    }

    const offset = NOTE_OFFSETS[noteName.toUpperCase()];
    if (offset === undefined) return null;

    return (octave + 1) * 12 + offset; // MIDI: C4 is 60. (4+1)*12 = 60. Correct.
}

export function midiToNote(midi: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const note = noteNames[midi % 12];
    const octave = Math.floor(midi / 12) - 1;

    // Convert back to hi/mid style?
    if (octave >= 6) return `hihi${note}`;
    if (octave === 5) return `hi${note}`;
    if (octave === 4) return `mid2${note}`;
    if (octave === 3) return `mid1${note}`;
    if (octave <= 2) return `low${note}`;
    return `${note}${octave}`;
}

export function calculateBestShift(songHighest: string, userHighest: string): number | null {
    const sMidi = noteToMidi(songHighest);
    const uMidi = noteToMidi(userHighest);

    if (sMidi === null || uMidi === null) return null;

    // We want (sMidi + shift) % 12 === uMidi % 12 (Same pitch class)?
    // NO. We want the song's highest note to literally BECOME the user's highest note.

    let shift = uMidi - sMidi;

    // Formula:
    // let k = (shift % 12);
    // if (k > 6) k -= 12;
    // if (k < -6) k += 12;

    let diff = (shift % 12 + 12) % 12; // 0 to 11
    if (diff > 6) diff -= 12; // -5 to +6

    // Now diff is between -5 and +6.
    // User rule: "If absolute value is 6, at that time adjust to become around mid2".

    if (Math.abs(diff) === 6) {
        // Tie breaker.
        // Option 1: +6. Resulting Song Max = sMidi + 6.
        // Option 2: -6. Resulting Song Max = sMidi - 6.

        // We want the resulting Max to be "around mid2".
        // mid2 range roughly C4(60) to B4(71).
        // Let's check distance of both options to center of mid2 (say, F#4 = 66).

        const center = 66; // F#4
        const res1 = sMidi + 6;
        const res2 = sMidi - 6;

        const d1 = Math.abs(res1 - center);
        const d2 = Math.abs(res2 - center);

        return d1 < d2 ? 6 : -6;
    }

    return diff;
}

const NOTE_NAMES_BASE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function generateNoteOptions(): string[] {
    const options: string[] = [];

    // mid1: A, A#, B
    ['A', 'A#', 'B'].forEach(n => options.push(`mid1${n}`));

    // mid2: All
    NOTE_NAMES_BASE.forEach(n => options.push(`mid2${n}`));

    // hi: All
    NOTE_NAMES_BASE.forEach(n => options.push(`hi${n}`));

    // hihi: Up to A
    const hihiNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A'];
    hihiNotes.forEach(n => options.push(`hihi${n}`));

    return options;
}
