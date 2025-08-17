// services/colorFeatureService.js
import * as ImageManipulator from 'expo-image-manipulator';
import jpeg from 'jpeg-js';
import { toByteArray } from 'base64-js';

// --- Color helpers ---
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
const rgbToLab = (rgb) => xyzToLab(rgbToXyz(rgb));
const rgbToHex = ([r, g, b]) => `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toLowerCase();
const median = a => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;

// Map view tap -> intrinsic image coordinates (for resizeMode="contain")
export function mapViewToImageCoords(tapX, tapY, boxW, boxH, imgW, imgH) {
    const scale = Math.min(boxW / imgW, boxH / imgH);
    const drawW = imgW * scale, drawH = imgH * scale;
    const offX = (boxW - drawW) / 2, offY = (boxH - drawH) / 2;
    const xIn = Math.max(0, Math.min(drawW - 1, tapX - offX));
    const yIn = Math.max(0, Math.min(drawH - 1, tapY - offY));
    return { ix: Math.round(xIn / scale), iy: Math.round(yIn / scale) };
}

/**
 * Expo-friendly extractor: crops a small patch via ImageManipulator, decodes with jpeg-js,
 * and returns finish-aware features. No canvas needed.
 */
export async function extractTapFeatures({ uri, tapX, tapY, boxW, boxH, imgW, imgH, patchRadiusPx = 24 }) {
    if (!imgW || !imgH) throw new Error('Intrinsic image size unknown');
    const { ix, iy } = mapViewToImageCoords(tapX, tapY, boxW, boxH, imgW, imgH);

    // Crop a small square around the tap, clamped within image
    const rx = Math.max(0, ix - patchRadiusPx);
    const ry = Math.max(0, iy - patchRadiusPx);
    const rw = Math.min(imgW - rx, patchRadiusPx * 2 + 1);
    const rh = Math.min(imgH - ry, patchRadiusPx * 2 + 1);

    // Manipulate to base64 JPEG (fast & small); we only need pixels
    const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ crop: { originX: rx, originY: ry, width: rw, height: rh } }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (!result.base64) throw new Error('No base64 from ImageManipulator');

    // Decode JPEG -> RGBA
    const u8 = toByteArray(result.base64);
    const decoded = jpeg.decode(u8, { useTArray: true }); // {width, height, data: Uint8Array RGBA}
    const { data } = decoded;

    // Build arrays
    const pixels = [];
    const vList = [];
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a === 0) continue;
        const v = Math.max(r, g, b);
        vList.push(v);
        pixels.push([r, g, b]);
    }
    if (!pixels.length) throw new Error('Empty patch');

    // Exclude top highlights (top 10% V)
    const sortedV = [...vList].sort((a, b) => a - b);
    const cutV = sortedV[Math.floor(sortedV.length * 0.9)];
    const basePool = [], sparklePool = [];
    for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i];
        const v = vList[i];
        (v >= cutV ? sparklePool : basePool).push(p);
    }

    const baseRGB = [
        median(basePool.map(p => p[0])),
        median(basePool.map(p => p[1])),
        median(basePool.map(p => p[2])),
    ];
    const hex = rgbToHex(baseRGB);
    const lab = rgbToLab(baseRGB);

    const sparkleRatio = sparklePool.length / (pixels.length || 1);
    const size_mode = sparkleRatio > 0.12 ? 'chunky' : (sparkleRatio > 0.04 ? 'mixed' : (sparkleRatio > 0.02 ? 'fine' : 'none'));
    const vBase = mean(basePool.map(p => Math.max(...p)));
    const vSpark = mean(sparklePool.map(p => Math.max(...p)));
    const luma_contrast = Math.max(0, Math.min(1, (vSpark - vBase) / 255));

    let finish = 'cream';
    if (sparkleRatio >= 0.03 && sparkleRatio <= 0.10) finish = 'shimmer';
    if (sparkleRatio > 0.10) finish = 'glitter';

    return {
        hex,
        lab,
        previewUri: '', // optional later
        features: {
            finish,
            sparkle: {
                density: Number(sparkleRatio.toFixed(3)),
                size_mode,
                colors_hex: [],        // (optional) palette via tiny k-means later
                luma_contrast: Number(luma_contrast.toFixed(3)),
                hue_shift: 0,
            }
        }
    };
}
