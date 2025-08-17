// services/colorFeatureService.js
// Expo-friendly pixel extractor: crops a tiny patch with ImageManipulator,
// decodes pixels with jpeg-js, then computes base LAB, finish, and sparkle metrics.

import * as ImageManipulator from 'expo-image-manipulator';
import jpeg from 'jpeg-js';
import { toByteArray } from 'base64-js';

// ------------------ Color helpers ------------------
function rgbToXyz([r, g, b]) {
    const srgb = [r, g, b].map((v) => v / 255);
    const lin = srgb.map((v) =>
        v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    );
    const [R, G, B] = lin;
    const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
    const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
    const Z = R * 0.0193339 + G * 0.119192 + B * 0.9503041;
    return [X, Y, Z];
}
function xyzToLab([X, Y, Z]) {
    const [Xn, Yn, Zn] = [0.95047, 1.0, 1.08883]; // D65
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const fx = f(X / Xn),
        fy = f(Y / Yn),
        fz = f(Z / Zn);
    return [(116 * fy) - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const rgbToLab = (rgb) => xyzToLab(rgbToXyz(rgb));

const median = (a) => {
    if (!a || a.length === 0) return null;
    const s = [...a].sort((x, y) => x - y);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const mean = (a) => (a && a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

const rgbToHex = ([r, g, b]) => {
    const clean = (v) =>
        Number.isFinite(v) ? Math.max(0, Math.min(255, Math.round(v))) : 0;
    const h = (v) => clean(v).toString(16).padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`.toLowerCase();
};

// optional: tiny k-means for sparkle palette (k<=3)
function kmeansRGB(pixels, k = 1, iters = 8) {
    if (!pixels?.length) return [];
    k = Math.min(k, Math.max(1, pixels.length));
    const centers = [];
    const step = Math.max(1, Math.floor(pixels.length / k));
    for (let i = 0; i < k; i++) centers.push([...pixels[i * step]]);
    for (let it = 0; it < iters; it++) {
        const buckets = Array.from({ length: k }, () => []);
        for (const p of pixels) {
            let bi = 0,
                bd = Infinity;
            for (let ci = 0; ci < centers.length; ci++) {
                const c = centers[ci];
                const d =
                    (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
                if (d < bd) {
                    bd = d;
                    bi = ci;
                }
            }
            buckets[bi].push(p);
        }
        for (let ci = 0; ci < k; ci++) {
            const b = buckets[ci];
            if (!b.length) continue;
            const s = b.reduce(
                (acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]],
                [0, 0, 0]
            );
            centers[ci] = [
                Math.round(s[0] / b.length),
                Math.round(s[1] / b.length),
                Math.round(s[2] / b.length),
            ];
        }
    }
    return centers;
}

// ------------------ Tap mapping ------------------
// Map view tap -> intrinsic image coords for an <Image resizeMode="contain"/>
export function mapViewToImageCoords(
    tapX,
    tapY,
    boxW,
    boxH,
    imgW,
    imgH
) {
    const scale = Math.min(boxW / imgW, boxH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const offX = (boxW - drawW) / 2;
    const offY = (boxH - drawH) / 2;

    // clamp within drawn area, then map back to image px
    const xIn = Math.max(0, Math.min(drawW - 1, tapX - offX));
    const yIn = Math.max(0, Math.min(drawH - 1, tapY - offY));

    const ix = Math.min(imgW - 1, Math.max(0, Math.round(xIn / scale)));
    const iy = Math.min(imgH - 1, Math.max(0, Math.round(yIn / scale)));
    return { ix, iy };
}

// ------------------ Main extractor (Expo) ------------------
/**
 * Crops a small patch via ImageManipulator, decodes pixels (jpeg-js),
 * and returns base color + finish-aware sparkle metrics.
 */
export async function extractTapFeatures({
    uri,
    tapX,
    tapY,
    boxW,
    boxH,
    imgW,
    imgH,
    patchRadiusPx = 24,
}) {
    if (!imgW || !imgH) throw new Error('Intrinsic image size unknown');

    const { ix, iy } = mapViewToImageCoords(tapX, tapY, boxW, boxH, imgW, imgH);

    // Crop a small square around the tap (ensure at least 1x1)
    const rx = Math.max(0, ix - patchRadiusPx);
    const ry = Math.max(0, iy - patchRadiusPx);
    const rw = Math.max(1, Math.min(imgW - rx, patchRadiusPx * 2 + 1));
    const rh = Math.max(1, Math.min(imgH - ry, patchRadiusPx * 2 + 1));

    const manip = await ImageManipulator.manipulateAsync(
        uri,
        [{ crop: { originX: rx, originY: ry, width: rw, height: rh } }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (!manip.base64) throw new Error('No base64 from ImageManipulator');

    // Decode JPEG -> RGBA
    const u8 = toByteArray(manip.base64);
    const decoded = jpeg.decode(u8, { useTArray: true });
    if (!decoded || !decoded.data) throw new Error('Decode failed');

    const { data } = decoded; // RGBA
    const pixels = [];
    const vList = [];
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i],
            g = data[i + 1],
            b = data[i + 2],
            a = data[i + 3];
        if (a === 0) continue;
        const v = Math.max(r, g, b);
        vList.push(v);
        pixels.push([r, g, b]);
    }
    if (!pixels.length) throw new Error('Empty patch');

    // Exclude top highlights (start at 90th percentile)
    const sortedV = [...vList].sort((a, b) => a - b);
    const cut90 = sortedV[Math.floor(sortedV.length * 0.9)];

    let basePool = [];
    let sparklePool = [];
    for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i];
        const v = vList[i];
        (v >= cut90 ? sparklePool : basePool).push(p);
    }

    // Fallbacks when basePool is too small (very reflective regions)
    if (basePool.length < 10) {
        const cut85 = sortedV[Math.floor(sortedV.length * 0.85)];
        const bp2 = [];
        const sp2 = [];
        for (let i = 0; i < pixels.length; i++) {
            const p = pixels[i];
            const v = vList[i];
            (v >= cut85 ? sp2 : bp2).push(p);
        }
        if (bp2.length >= 10) {
            basePool = bp2;
            sparklePool = sp2;
        }
    }
    if (basePool.length === 0) {
        // last resort: treat all as base to avoid NaN
        basePool = pixels.slice();
        sparklePool = [];
    }

    // Base color = channel-wise median of basePool
    const mr = median(basePool.map((p) => p[0]));
    const mg = median(basePool.map((p) => p[1]));
    const mb = median(basePool.map((p) => p[2]));
    const baseRGB = [
        Number.isFinite(mr) ? mr : 0,
        Number.isFinite(mg) ? mg : 0,
        Number.isFinite(mb) ? mb : 0,
    ];
    const hex = rgbToHex(baseRGB);
    const lab = rgbToLab(baseRGB);

    // Sparkle metrics
    const sparkleRatio = sparklePool.length / (pixels.length || 1);
    const size_mode =
        sparkleRatio > 0.12
            ? 'chunky'
            : sparkleRatio > 0.04
                ? 'mixed'
                : sparkleRatio > 0.02
                    ? 'fine'
                    : 'none';
    const vBase = mean(basePool.map((p) => Math.max(...p)));
    const vSpark = mean(sparklePool.map((p) => Math.max(...p)));
    const luma_contrast = Math.max(0, Math.min(1, (vSpark - vBase) / 255));

    // Optional sparkle palette (1..3 colors) from sparklePool
    let colors_hex = [];
    if (sparklePool.length) {
        const k = Math.min(3, sparklePool.length >= 24 ? 3 : sparklePool.length >= 8 ? 2 : 1);
        const centers = kmeansRGB(sparklePool, k);
        colors_hex = centers.map(rgbToHex);
    }

    // Finish classification (simple rules)
    let finish = 'cream';
    if (sparkleRatio >= 0.03 && sparkleRatio <= 0.1) finish = 'shimmer';
    if (sparkleRatio > 0.1) finish = 'glitter';

    return {
        hex,
        lab, // [L,a,b] numeric (never NaN now)
        previewUri: '', // optional (we show a solid swatch in UI)
        features: {
            finish,
            sparkle: {
                density: Number(sparkleRatio.toFixed(3)),
                size_mode,
                colors_hex,
                luma_contrast: Number(luma_contrast.toFixed(3)),
                hue_shift: 0, // not estimated here
            },
        },
    };
}
