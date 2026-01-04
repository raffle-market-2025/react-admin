/**
 * PromoRaffle country utilities:
 * - Alpha2 <-> Alpha3 mapping (single source of truth: alpha2ToAlpha3)
 * - Build alpha3ToAlpha2 automatically (inversion with collision detection)
 * - Decode subgraph bytes3 hex (e.g. 0x554b520000) -> "UKR"
 * - Convert alpha2 -> flag emoji
 * - Convert bytes3 hex -> { flag, a3, a2 }
 */

// ---------- Source of truth: Alpha-2 -> Alpha-3 ----------
export const alpha2ToAlpha3: Record<string, string> = {
    UA: 'UKR',
    US: 'USA',
    GB: 'GBR',
    CA: 'CAN',
    AU: 'AUS',
    DE: 'DEU',
    FR: 'FRA',
    ES: 'ESP',
    IT: 'ITA',
    PL: 'POL',
    NL: 'NLD',
    SE: 'SWE',
    NO: 'NOR',
    DK: 'DNK',
    FI: 'FIN',
    IE: 'IRL',
    CH: 'CHE',
    AT: 'AUT',
    BE: 'BEL',
    CZ: 'CZE',
    SK: 'SVK',
    HU: 'HUN',
    RO: 'ROU',
    BG: 'BGR',
    GR: 'GRC',
    TR: 'TUR',
    IL: 'ISR',
    AE: 'ARE',
    SA: 'SAU',
    IN: 'IND',
    CN: 'CHN',
    JP: 'JPN',
    KR: 'KOR',
    BR: 'BRA',
    MX: 'MEX',
    AR: 'ARG',
    CL: 'CHL',
    CO: 'COL',
    PE: 'PER',
    ZA: 'ZAF',
    EG: 'EGY',
    NG: 'NGA',
    KE: 'KEN',
    SG: 'SGP',
    HK: 'HKG',
    TW: 'TWN',
    TH: 'THA',
    VN: 'VNM',
    MY: 'MYS',
    ID: 'IDN',
    PH: 'PHL',
    NZ: 'NZL',
};

export function alpha2ToAlpha3Code(alpha2: string): string {
    const a2 = (alpha2 ?? '').toUpperCase().trim();
    return alpha2ToAlpha3[a2] ?? 'UNK';
}

// ---------- Inversion: Alpha-3 -> Alpha-2 ----------
export function invertAlpha2ToAlpha3(
    a2to3: Record<string, string>
): Record<string, string> {
    const a3to2: Record<string, string> = {};
    const collisions: Array<{
        alpha3: string;
        alpha2a: string;
        alpha2b: string;
    }> = [];

    for (const [a2raw, a3raw] of Object.entries(a2to3)) {
        const a2 = a2raw.toUpperCase().trim();
        const a3 = (a3raw ?? '').toUpperCase().trim();

        if (!a2 || !a3 || a3 === 'UNK') continue;

        const existing = a3to2[a3];
        if (existing && existing !== a2) {
            collisions.push({ alpha3: a3, alpha2a: existing, alpha2b: a2 });
            continue; // keep first deterministically
        }
        a3to2[a3] = a2;
    }

    if (collisions.length) {
        throw new Error(
            `alpha3ToAlpha2 collisions: ${collisions
                .map(c => `${c.alpha3} <= ${c.alpha2a},${c.alpha2b}`)
                .join('; ')}`
        );
    }

    return a3to2;
}

export const alpha3ToAlpha2: Record<string, string> =
    invertAlpha2ToAlpha3(alpha2ToAlpha3);

export function alpha3ToAlpha2Code(alpha3: string): string {
    const a3 = (alpha3 ?? '').toUpperCase().trim();
    return alpha3ToAlpha2[a3] ?? '';
}

// ---------- Subgraph bytes3 (hex) -> Alpha-3 string ----------
// Subgraph typically returns Bytes as 0x... hex string.
// For bytes3, it can look like:
// - "0x554b52" (UKR)
// - "0x554b520000" (UKR + padding)
// - sometimes longer; we take first 3 bytes only.
export function bytes3HexToAlpha3(value?: string): string {
    if (!value) return 'UNK';

    const s = String(value).trim();

    // If GraphQL already returns plain alpha-3 (e.g. "UKR")
    if (/^[A-Za-z]{3}$/.test(s)) return s.toUpperCase();

    // Expect hex like 0x554b52... (bytes3 padded or not)
    const hex = s.startsWith('0x') ? s.slice(2) : s;

    // If not hex at all -> unknown
    if (!/^[0-9a-fA-F]+$/.test(hex)) return 'UNK';

    // Need at least 3 bytes (6 hex chars). If shorter, right-pad with zeros.
    const first6 = hex.padEnd(6, '0').slice(0, 6);

    const b0 = parseInt(first6.slice(0, 2), 16);
    const b1 = parseInt(first6.slice(2, 4), 16);
    const b2 = parseInt(first6.slice(4, 6), 16);

    // Convert to ASCII and strip nulls
    const a3 = String.fromCharCode(b0, b1, b2).replace(/\0/g, '').toUpperCase();

    // Basic sanity: alpha-3 is usually letters; if garbage -> UNK
    if (!/^[A-Z]{2,3}$/.test(a3)) return 'UNK';

    return a3;
}

// ---------- Alpha-2 -> flag emoji ----------
export function alpha2ToFlagEmoji(alpha2?: string): string {
    const a2 = (alpha2 ?? '').toUpperCase().trim();
    if (a2.length !== 2) return '🏳️';
    const A = 0x1f1e6; // regional indicator 'A'
    const c1 = a2.charCodeAt(0) - 65;
    const c2 = a2.charCodeAt(1) - 65;
    if (c1 < 0 || c1 > 25 || c2 < 0 || c2 > 25) return '🏳️';
    return String.fromCodePoint(A + c1, A + c2);
}

// ---------- Convenience: bytes3 hex -> flag + codes ----------
export function countryHexToFlag(hex?: string): {
    flag: string;
    a3: string;
    a2: string;
} {
    const a3 = bytes3HexToAlpha3(hex);
    const a2 = alpha3ToAlpha2Code(a3);
    const flag = a2 ? alpha2ToFlagEmoji(a2) : '🏳️';
    return { flag, a3, a2 };
}
