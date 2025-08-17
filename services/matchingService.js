// services/matchingService.js
// Finish-aware matching: ΔE2000 for base color + shimmer/glitter terms.

////////////////////
// Color math
////////////////////
function deg2rad(d) { return (Math.PI / 180) * d; }
function rad2deg(r) { return (180 / Math.PI) * r; }
function hypot2(a, b) { return Math.sqrt(a * a + b * b); }

// ΔE2000 implementation (expects LAB arrays: [L,a,b])
export function deltaE2000(lab1, lab2) {
    // Implementation adapted to JS; numerically stable for typical image LAB ranges
    const [L1, a1, b1] = lab1, [L2, a2, b2] = lab2;
    const kL = 1, kC = 1, kH = 1;

    const C1 = Math.sqrt(a1 * a1 + b1 * b1);
    const C2 = Math.sqrt(a2 * a2 + b2 * b2);
    const Cbar = (C1 + C2) * 0.5;

    const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))));
    const a1p = (1 + G) * a1;
    const a2p = (1 + G) * a2;

    const C1p = Math.sqrt(a1p * a1p + b1 * b1);
    const C2p = Math.sqrt(a2p * a2p + b2 * b2);

    const h1p = Math.atan2(b1, a1p) >= 0 ? rad2deg(Math.atan2(b1, a1p)) : rad2deg(Math.atan2(b1, a1p)) + 360;
    const h2p = Math.atan2(b2, a2p) >= 0 ? rad2deg(Math.atan2(b2, a2p)) : rad2deg(Math.atan2(b2, a2p)) + 360;

    const dLp = L2 - L1;
    const dCp = C2p - C1p;

    let dhp = 0;
    if (C1p * C2p === 0) {
        dhp = 0;
    } else if (Math.abs(h2p - h1p) <= 180) {
        dhp = h2p - h1p;
    } else if (h2p - h1p > 180) {
        dhp = h2p - h1p - 360;
    } else {
        dhp = h2p - h1p + 360;
    }
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deg2rad(dhp / 2));

    const Lbarp = (L1 + L2) / 2;
    const Cbarp = (C1p + C2p) / 2;

    let hbarp = 0;
    if (C1p * C2p === 0) {
        hbarp = h1p + h2p;
    } else if (Math.abs(h1p - h2p) <= 180) {
        hbarp = (h1p + h2p) / 2;
    } else if (h1p + h2p < 360) {
        hbarp = (h1p + h2p + 360) / 2;
    } else {
        hbarp = (h1p + h2p - 360) / 2;
    }

    const T =
        1 - 0.17 * Math.cos(deg2rad(hbarp - 30)) +
        0.24 * Math.cos(deg2rad(2 * hbarp)) +
        0.32 * Math.cos(deg2rad(3 * hbarp + 6)) -
        0.20 * Math.cos(deg2rad(4 * hbarp - 63));

    const dRo = 30 * Math.exp(-((hbarp - 275) / 25) * ((hbarp - 275) / 25));
    const Rc = 2 * Math.sqrt(Math.pow(Cbarp, 7) / (Math.pow(Cbarp, 7) + Math.pow(25, 7)));
    const Sl = 1 + (0.015 * ((Lbarp - 50) * (Lbarp - 50))) / Math.sqrt(20 + ((Lbarp - 50) * (Lbarp - 50)));
    const Sc = 1 + 0.045 * Cbarp;
    const Sh = 1 + 0.015 * Cbarp * T;
    const Rt = -Math.sin(deg2rad(2 * dRo)) * Rc;

    return Math.sqrt(
        Math.pow(dLp / (kL * Sl), 2) +
        Math.pow(dCp / (kC * Sc), 2) +
        Math.pow(dHp / (kH * Sh), 2) +
        Rt * (dCp / (kC * Sc)) * (dHp / (kH * Sh))
    );
}

////////////////////
// Matching helpers
////////////////////
const SIZE_MODE_ORDER = ['none', 'fine', 'mixed', 'chunky'];
function sizeModeMismatchPenalty(q, item) {
    if (!q || !item) return 0;
    if (q === item) return 0;
    // adjacent categories lighter penalty than far ones
    const di = Math.abs(SIZE_MODE_ORDER.indexOf(q) - SIZE_MODE_ORDER.indexOf(item));
    return di <= 0 ? 0 : di === 1 ? 0.3 : di === 2 ? 0.6 : 1.0;
}
function angularDiffDeg(a, b) {
    if (a == null || b == null) return 0;
    let d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
}

function paletteDistance(qHexes = [], itemHexes = []) {
    // optional: compare sets of sparkle colors using ΔE in LAB; hex->LAB converter
    if (!qHexes?.length || !itemHexes?.length) return 0;
    const toRGB = hex => [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16)
    ];
    const toLab = hex => {
        const [r, g, b] = toRGB(hex);
        return rgbToLab([r, g, b]); // local helper
    };
    const qLabs = qHexes.map(toLab);
    const iLabs = itemHexes.map(toLab);
    // best-pair average
    let sum = 0, n = 0;
    for (const ql of qLabs) {
        let best = Infinity;
        for (const il of iLabs) {
            const d = deltaE2000(ql, il);
            if (d < best) best = d;
        }
        sum += best; n++;
    }
    return n ? sum / n : 0;
}

// minimal rgb->lab for paletteDistance
function rgbToXyz([r, g, b]) {
    const srgb = [r, g, b].map(v => v / 255);
    const lin = srgb.map(v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    const [R, G, B] = lin;
    const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
    const Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
    const Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
    return [X, Y, Z];
}
function xyzToLab([X, Y, Z]) {
    const [Xn, Yn, Zn] = [0.95047, 1.0, 1.08883];
    const f = t => (t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + 16 / 116);
    const fx = f(X / Xn), fy = f(Y / Yn), fz = f(Z / Zn);
    return [(116 * fy) - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function rgbToLab(rgb) { return xyzToLab(rgbToXyz(rgb)); }

////////////////////
// Scoring
////////////////////
export function finishAwareScore(query, item) {
    // query: { lab:[L,a,b], features:{ finish, sparkle:{density, size_mode, colors_hex, luma_contrast, hue_shift} } }
    // item:  { lab:[L,a,b] or {L,a,b}, finish, glitter:{density, size_mode, colors_hex, luma_contrast, hue_shift}, base_hex }

    const qLab = Array.isArray(query.lab) ? query.lab : [query.lab?.L, query.lab?.a, query.lab?.b];
    let iLab = null;

    if (Array.isArray(item.lab)) {
        iLab = item.lab;
    } else if (item.lab && typeof item.lab === 'object') {
        iLab = [item.lab.L, item.lab.a, item.lab.b];
    } else if (item.base_hex || item.hex) {
        // fallback compute LAB from hex if db lacks lab field
        const hex = (item.base_hex || item.hex).toLowerCase();
        const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        iLab = rgbToLab([r, g, b]);
    } else {
        return Infinity;
    }

    const ΔE = deltaE2000(qLab, iLab);

    const qFin = query.features?.finish || 'cream';
    const iFin = (item.finish || 'cream').toLowerCase();

    // finish penalty: prefer same finish, small penalty if different
    const D_finish = qFin === iFin ? 0 : (qFin === 'cream' && iFin !== 'cream') ? 1.0 : 0.6;

    // sparkle metrics (gracefully handle missing)
    const qS = query.features?.sparkle || {};
    const iS = (item.glitter || {});
    const D_density = Math.abs((qS.density ?? 0) - (iS.density ?? 0)); // 0..1-ish
    const D_size = sizeModeMismatchPenalty(qS.size_mode ?? 'none', iS.size_mode ?? 'none');
    const D_palette = paletteDistance(qS.colors_hex ?? [], iS.colors_hex ?? []);
    const D_pop = Math.abs((qS.luma_contrast ?? 0) - (iS.luma_contrast ?? 0));
    const D_shift = (angularDiffDeg(qS.hue_shift ?? 0, iS.hue_shift ?? 0)) / 180; // normalize 0..1

    // weights (tune as you like)
    const score =
        1.0 * ΔE +
        0.6 * D_finish +
        0.5 * D_density +
        0.4 * D_size +
        0.5 * D_palette +
        0.3 * D_pop +
        0.2 * D_shift;

    return score;
}

export function matchTopN(query, dbArray, topN = 10) {
    const scored = [];
    for (const item of dbArray) {
        const s = finishAwareScore(query, item);
        if (isFinite(s)) scored.push({ item, score: s });
    }
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, topN);
}
