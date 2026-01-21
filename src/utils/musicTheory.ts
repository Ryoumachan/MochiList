
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
    // User Highest Note is a LIMIT.
    // So "Highest note becomes User's Highest Note".
    // Reference: "Highest note matches voice range".
    // So target = uMidi.
    // sMidi + shift = uMidi.
    // shift = uMidi - sMidi.

    // But we can shift by octaves too?
    // "Calculate both plus and minus, choose smaller absolute value".
    // This implies we are matching the *Pitch Class* of the user's highest note, but in the closest octave to the song's original key?
    // Wait. "My Voice Limit" is a physical frequency limit.
    // If my limit is A4.
    // And song max is C5.
    // I MUST lower it by 3 semitones. (-3).
    // I cannot "raise it by 9" because then max becomes A5 (way too high).
    // So usually you strictly match the specific user note.

    // HOWEVER, the user instruction: "Calculate both plus and minus... choose smaller ABS".
    // Example: +5 and -7.
    // This implies the user treats "My Highest Note" as a *Preferred Key Center Identifier* or something?
    // Or maybe "Highest Note" input is just a Note Name (e.g. "A"), not fully qualified?
    // "My Highest Note (=Voice Range)".
    // If I say "My Range is hiA". That is a specific pitch A4.
    // If current song is C5. Diff = -3.
    // If I calculate "+9", result is A5. That is impossible to sing.
    // Why would he ask to compare + and -?

    // INTERPRETATION A: He sings in multiple octaves? Unlikely.
    // INTERPRETATION B: He wants to modulate the song to a key where the highest note is *semitone-equivalent* to his highest note, chosen to keep the key change minimal.
    // Example: Song Max = C (could be C4 or C5). User Max = A.
    // C to A is -3 or +9.
    // If -3: Key becomes A.
    // If +9: Key becomes A.
    // He chooses the smaller shift (-3).
    // This makes sense if he adjusts octaves vocally (singing an octave lower).
    // YES. Karaoke users often drop an octave ("oku-shita").
    // So he wants the *Key Setting* that gives the smallest deviation from original, assuming he will sing in whatever octave fits, but the 'Key' matches his relative max.

    let shift = uMidi - sMidi;

    // Normalize shift to range (-6 to +6)?
    // Or rather find equivalent shift `k` such that `k = shift + 12n` and `abs(k)` is minimized.

    // e.g. shift = -3.
    // Alts: -3+12 = +9. -3-12 = -15.
    // Min abs is 3. Result -3.

    // e.g. shift = +8.
    // Alts: +8-12 = -4.
    // Min abs is 4. Result -4.

    // This logic effectively finds the closest target key class.

    // Formula:
    // let k = (shift % 12);
    // if (k > 6) k -= 12;
    // if (k < -6) k += 12;
    // (Be careful with JS modulo of negative numbers)

    let diff = (shift % 12 + 12) % 12; // 0 to 11
    if (diff > 6) diff -= 12; // -5 to +6

    // Now diff is between -5 and +6.
    // Wait, if diff is +6 (or -6, same thing).
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
