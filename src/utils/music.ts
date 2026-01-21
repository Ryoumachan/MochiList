// Basic parser for Karaoke pitch notation (e.g., lowG, mid2C, hiA)
// We assign rough integer values for sorting.

const NOTE_VALUES: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

const OCTAVE_OFFSET: Record<string, number> = {
    'lowlow': -24,
    'low': -12,
    'mid1': 0,
    'mid2': 12,
    'hi': 24,
    'hihi': 36
};

// Heuristic parser
export function getNoteValue(noteStr: string | null): number {
    if (!noteStr) return -999;

    const clean = noteStr.trim();

    // Try to find prefix
    let prefix = '';
    let note = '';

    // Check prefixes from longest to shortest
    for (const pre of ['lowlow', 'mid2', 'mid1', 'hihi', 'low', 'hi']) {
        if (clean.startsWith(pre)) {
            prefix = pre;
            note = clean.slice(pre.length);
            break;
        }
    }

    if (!prefix) {
        // Maybe standard C4, A3 notation?
        // For now, treat as mid1 if just "C" or "A"
        // Or if it matches [A-G][0-9]
        const scientific = clean.match(/^([A-G][#b]?)([0-9])$/);
        if (scientific) {
            const n = scientific[1];
            const oct = parseInt(scientific[2]);
            const base = NOTE_VALUES[n] || 0;
            // C4 = Middle C ~ mid2C usually in varying definitions, 
            // but let's say C4 is our 0 point (mid1)
            // Actually standard: C4 = Middle C. 
            // Karaoke: mid2C is often C5? Or C4?
            // Let's assume C4 = 0 for simplicity of relative sort.
            return (oct - 4) * 12 + base;
        }

        // Fallback: If just "A", "C", assume mid2 (common key)
        note = clean;
        prefix = 'mid2';
    }

    const baseVal = NOTE_VALUES[note.toUpperCase()] ?? 0;
    const octaveVal = OCTAVE_OFFSET[prefix] ?? 0;

    return octaveVal + baseVal;
}
