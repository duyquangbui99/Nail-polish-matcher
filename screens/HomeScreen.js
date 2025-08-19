// HomeScreen.js
import React, { useState } from 'react';
import { SafeAreaView, Text, StyleSheet, FlatList, View, Image, Pressable } from 'react-native';
import ImagePickerComponent from '../components/ImagePickerComponent';
import { matchTopN } from '../services/matchingService';
import db from '../assets/db/dnd-401-500.json'; // adjust if your file name differs

export default function HomeScreen() {
    const [results, setResults] = useState([]);

    const handleImagePicked = (uri) => {
        console.log('Picked image URI:', uri);
    };

    const handleTapFeatures = (feat) => {
        console.log('Extracted features:', feat);
        const top = matchTopN(feat, db, 8);
        setResults(top);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Nail Color Finder</Text>

            <ImagePickerComponent
                onImagePicked={handleImagePicked}
                onTapFeatures={handleTapFeatures}
            />

            {!!results.length && (
                <>
                    <Text style={styles.subtitle}>Top matches</Text>
                    <FlatList
                        data={results}
                        keyExtractor={(row, idx) => (row.item?.id ?? `${row.item?.name || 'shade'}-${idx}`)}
                        renderItem={({ item }) => <MatchRow row={item} />}
                        style={{ width: 340, marginTop: 12 }}
                        ItemSeparatorComponent={() => <View style={styles.sep} />}
                    />
                </>
            )}
        </SafeAreaView>
    );
}

function MatchRow({ row }) {
    const p = row.item || {};
    const score = row.score ?? 0;

    const hex = (p.hex || p.base_hex || '#cccccc').toLowerCase();
    const finish = (p.finish || 'cream').toLowerCase();

    // choose image: thumbnail → swatch → bottle → none
    const img =
        p.images?.thumbnail ||
        p.images?.swatch ||
        p.images?.bottle ||
        null;

    // local “saved” state (pure UI toggle; wire to storage later)
    const [saved, setSaved] = useState(Boolean(p.saved));

    return (
        <View style={styles.row}>
            {/* Left image */}
            <View style={styles.thumbWrap}>
                {img ? (
                    <Image source={{ uri: img }} style={styles.thumb} resizeMode="cover" />
                ) : (
                    <View style={[styles.thumb, { backgroundColor: '#eee' }]} />
                )}
            </View>

            {/* Main info */}
            <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.name}>
                    {p.name || 'Unnamed'}
                </Text>
                <View style={styles.metaRow}>
                    <Text style={styles.brandText}>{(p.brand || '').trim()}</Text>
                    <View style={[styles.finishBadge, badgeByFinish(finish)]}>
                        <Text style={styles.finishText}>{finish}</Text>
                    </View>
                    <Text style={styles.scoreText}>score {score.toFixed(2)}</Text>
                </View>

                {/* bottom: product link hint (optional) */}
                {!!p.product_link && (
                    <Text numberOfLines={1} style={styles.linkText}>
                        {p.product_link.replace(/^https?:\/\//, '')}
                    </Text>
                )}
            </View>

            {/* Right side: swatch + Save */}
            <View style={styles.rightCol}>
                <View style={[styles.swatch, { backgroundColor: hex }]} />
                <Pressable
                    onPress={() => setSaved(s => !s)}
                    hitSlop={10}
                    style={[styles.saveBtn, saved && styles.saveBtnOn]}
                >
                    <Text style={[styles.saveTxt, saved && styles.saveTxtOn]}>{saved ? 'Saved' : 'Save'}</Text>
                </Pressable>
            </View>
        </View>
    );
}

// small helper for finish badge color
function badgeByFinish(finish) {
    switch (finish) {
        case 'glitter': return { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }; // amber
        case 'shimmer': return { backgroundColor: '#e0f2fe', borderColor: '#38bdf8' }; // sky
        case 'jelly': return { backgroundColor: '#fee2e2', borderColor: '#ef4444' }; // rose
        case 'cream':
        default: return { backgroundColor: '#e5e7eb', borderColor: '#9ca3af' }; // gray
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    subtitle: { marginTop: 16, fontWeight: '700', alignSelf: 'flex-start', marginLeft: 20 },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#eee' },

    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
    thumbWrap: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#00000020' },
    thumb: { width: '100%', height: '100%' },

    name: { fontWeight: '600', fontSize: 14, maxWidth: 180 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' },
    brandText: { color: '#6b7280', fontSize: 12 },
    finishBadge: {
        borderWidth: 1,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    finishText: { fontSize: 11, fontWeight: '600', color: '#111827' },
    scoreText: { marginLeft: 'auto', fontSize: 12, color: '#6b7280' },

    rightCol: { alignItems: 'center', justifyContent: 'center', gap: 6, marginLeft: 8 },
    swatch: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: '#00000020' },

    saveBtn: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    saveBtnOn: { borderColor: '#111827', backgroundColor: '#111827' },
    saveTxt: { fontSize: 12, color: '#111827' },
    saveTxtOn: { color: '#fff' },
});
