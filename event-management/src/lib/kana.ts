
export function toKatakana(str: string): string {
    return str.replace(/[\u3041-\u3096]/g, function (match) {
        var chr = match.charCodeAt(0) + 0x60;
        return String.fromCharCode(chr);
    });
}

const ROMAN_MAP: Record<string, string> = {
    'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
    'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
    'sa': 'さ', 'shi': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
    'ta': 'た', 'chi': 'ち', 'tsu': 'つ', 'te': 'て', 'to': 'と',
    'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
    'ha': 'は', 'hi': 'ひ', 'fu': 'ふ', 'he': 'へ', 'ho': 'ほ',
    'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
    'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
    'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
    'wa': 'わ', 'wo': 'を', 'n': 'ん',
    'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
    'za': 'ざ', 'ji': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
    'da': 'だ', 'de': 'で', 'do': 'ど',
    'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
    'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
    'kya': 'きゃ', 'kyu': 'きゅ', 'kyo': 'きょ',
    'sha': 'しゃ', 'shu': 'しゅ', 'sho': 'しょ',
    'cha': 'ちゃ', 'chu': 'ちゅ', 'cho': 'ちょ',
    'nya': 'にゃ', 'nyu': 'にゅ', 'nyo': 'にょ',
    'hya': 'ひゃ', 'hyu': 'ひゅ', 'hyo': 'ひょ',
    'mya': 'みゃ', 'myu': 'みゅ', 'myo': 'みょ',
    'rya': 'りゃ', 'ryu': 'りゅ', 'ryo': 'りょ',
    'gya': 'ぎゃ', 'gyu': 'ぎゅ', 'gyo': 'ぎょ',
    'ja': 'じゃ', 'ju': 'じゅ', 'jo': 'じょ',
    'bya': 'びゃ', 'byu': 'びゅ', 'byo': 'びょ',
    'pya': 'ぴゃ', 'pyu': 'ぴゅ', 'pyo': 'ぴょ',
    'si': 'し', 'ti': 'ち', 'tu': 'つ', 'hu': 'ふ', 'zi': 'じ', // Alternate spellings
    '-': 'ー'
};

export function romajiToHiragana(str: string): string {
    let result = str.toLowerCase();

    // Convert logic: simple greedy match from longest keys?
    // Sort keys by length descending to ensure 'shi' matches before 'si' if 'si' -> 'し'
    // But map above handles exact keys.
    // Ideally we iterate string.
    // For simplicity in this demo, let's use a sorted regex or iterative replacement.

    // Creating a sorted list of keys
    const keys = Object.keys(ROMAN_MAP).sort((a, b) => b.length - a.length);

    // Using reduce to replace. Note: this might be slow for long text but fine for names.
    // Also need to handle small tsu (double consonants like 'kk', 'tt') -> 'っ'

    // Handle double consonants (expect 'n', handled by map)
    result = result.replace(/([kstnhmyrwgzbpd])\1/g, 'っ$1');
    // Special 'tc' -> 'tt' -> 'っc' (match->tcha?) No, 'tchi' -> 'っち'
    // 'tchi' -> t + chi -> っ + ち matches regex? 'tc' not double.
    // 'match' -> 'matchi' -> 'まっち'? 
    // Manual replace for 'tch' -> 'っち' ?
    result = result.replace(/tch/g, 'っち');

    for (const key of keys) {
        // Regex escape? Keys are alpha.
        const regex = new RegExp(key, 'g');
        result = result.replace(regex, ROMAN_MAP[key]);
    }

    return result;
}

/**
 * Check if query has at least minChars consecutive characters matching in target
 * @param query Search query (normalized)
 * @param target Target string to match against (normalized)
 * @param minChars Minimum consecutive characters required (default: 3)
 */
export function hasMinOverlap(query: string, target: string, minChars: number = 3): boolean {
    if (query.length < minChars || target.length < minChars) {
        // If query is shorter than minChars, require exact inclusion
        return query.length > 0 && target.includes(query);
    }

    // Check if any consecutive substring of query exists in target
    for (let i = 0; i <= query.length - minChars; i++) {
        const sub = query.substring(i, i + minChars);
        if (target.includes(sub)) return true;
    }
    return false;
}

/**
 * Calculate match score for ranking search results
 * Higher score = better match
 */
export function calculateMatchScore(query: string, name: string, furigana: string): number {
    const normQuery = query.toLowerCase().replace(/\s+/g, '');
    const normName = name.toLowerCase().replace(/\s+/g, '');
    const normFurigana = furigana.toLowerCase().replace(/\s+/g, '');

    let score = 0;

    // Exact match (highest priority)
    if (normName === normQuery || normFurigana === normQuery) {
        score += 100;
    }
    // Starts with query (high priority)
    else if (normName.startsWith(normQuery) || normFurigana.startsWith(normQuery)) {
        score += 80;
    }
    // Contains query as substring (medium priority)
    else if (normName.includes(normQuery) || normFurigana.includes(normQuery)) {
        score += 60;
    }
    // Partial overlap (lower priority)
    else {
        // Count overlapping characters
        const minChars = 3;
        let maxOverlap = 0;
        for (let len = Math.min(normQuery.length, normName.length); len >= minChars; len--) {
            for (let i = 0; i <= normQuery.length - len; i++) {
                const sub = normQuery.substring(i, i + len);
                if (normName.includes(sub) || normFurigana.includes(sub)) {
                    maxOverlap = Math.max(maxOverlap, len);
                    break;
                }
            }
            if (maxOverlap > 0) break;
        }
        score += maxOverlap * 10;
    }

    return score;
}
