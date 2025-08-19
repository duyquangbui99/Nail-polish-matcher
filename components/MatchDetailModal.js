// components/MatchDetailModal.js
import React, { useMemo, useRef, useState } from 'react';
import {
    Modal, View, Text, StyleSheet, Pressable, Image, FlatList, Dimensions, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';

const { width: SCREEN_W } = Dimensions.get('window');

export default function MatchDetailModal({
    visible,
    onClose,
    polish,          // row.item (your DB object)
    onToggleSave,    // (id) => void
}) {
    const id = polish?.id ?? `${polish?.brand || ''}-${polish?.name || ''}`.toLowerCase();
    const finish = (polish?.finish || 'cream').toLowerCase();
    const saved = Boolean(polish?.saved);

    // Build a small gallery; de-dupe and fallback to hex swatch
    const gallery = useMemo(() => {
        const imgs = [
            polish?.images?.thumbnail,
            polish?.images?.swatch,
            polish?.images?.bottle,
        ].filter(Boolean);
        if (!imgs.length) {
            // no remote image: render a pseudo slide from hex
            return [{ type: 'swatch', hex: (polish?.hex || '#cccccc').toLowerCase(), key: 'swatch-hex' }];
        }
        return imgs.map((u, i) => ({ type: 'img', uri: u, key: `img-${i}` }));
    }, [polish]);

    const [index, setIndex] = useState(0);
    const listRef = useRef(null);

    const copyHex = async () => {
        const hex = (polish?.hex || polish?.base_hex || '').toLowerCase();
        if (hex) await Clipboard.setStringAsync(hex);
    };
    const openProduct = async () => {
        if (polish?.product_link) {
            try { await Linking.openURL(polish.product_link); } catch { }
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            {/* Backdrop */}
            <Pressable style={styles.backdrop} onPress={onClose} />

            {/* Card */}
            <View style={styles.card}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={styles.title}>{polish?.name || 'Unnamed'}</Text>
                        <View style={styles.headerRow}>
                            <Text style={styles.brand}>{(polish?.brand || '').trim()}</Text>
                            <View style={[styles.badge, badgeByFinish(finish)]}>
                                <Text style={styles.badgeTxt}>{finish}</Text>
                            </View>
                        </View>
                    </View>
                    <Pressable onPress={() => onToggleSave?.(id)} hitSlop={10} style={[styles.saveBtn, saved && styles.saveBtnOn]}>
                        <Text style={[styles.saveTxt, saved && styles.saveTxtOn]}>{saved ? '♥' : '♡'}</Text>
                    </Pressable>
                </View>

                {/* Carousel */}
                <View style={styles.carouselContainer}>
                    <FlatList
                        ref={listRef}
                        data={gallery}
                        keyExtractor={(it) => it.key}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => {
                            const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                            setIndex(i);
                        }}
                        renderItem={({ item }) => (
                            <View style={styles.carouselSlide}>
                                {item.type === 'img' ? (
                                    <View style={styles.imageContainer}>
                                        <Image source={{ uri: item.uri }} style={styles.hero} resizeMode="contain" />
                                    </View>
                                ) : (
                                    <View style={styles.swatchSlide}>
                                        <View style={[styles.heroSwatch, { backgroundColor: item.hex }]} />
                                    </View>
                                )}
                            </View>
                        )}
                    />
                    {/* dots */}
                    {gallery.length > 1 && (
                        <View style={styles.dots}>
                            {gallery.map((_, i) => (
                                <View key={i} style={[styles.dot, i === index && styles.dotOn]} />
                            ))}
                        </View>
                    )}
                </View>

                {/* Specs */}
                <View style={styles.specs}>
                    {/* left: hex + LAB */}
                    <View style={styles.specColumn}>
                        <Text style={styles.specLabel}>🎨 Color</Text>
                        <View style={styles.rowA}>
                            <View style={[styles.swatch, { backgroundColor: (polish?.hex || '#ccc').toLowerCase() }]} />
                            <Text style={styles.hexTxt}>{(polish?.hex || '').toLowerCase()}</Text>
                        </View>
                        {!!polish?.lab && Array.isArray(polish.lab) && (
                            <Text style={styles.labTxt}>
                                L {polish.lab[0].toFixed?.(1)} · a {polish.lab[1].toFixed?.(1)} · b {polish.lab[2].toFixed?.(1)}
                            </Text>
                        )}
                    </View>

                    {/* right: sparkle */}
                    <View style={styles.specColumn}>
                        <Text style={styles.specLabel}>✨ Sparkle</Text>
                        <View style={styles.rowB}>
                            <Chip label={`${((polish?.glitter?.density ?? 0) * 100).toFixed(0)}% density`} />
                            {!!polish?.glitter?.size_mode && <Chip label={polish.glitter.size_mode} />}
                            {(polish?.glitter?.luma_contrast ?? null) !== null && (
                                <Chip label={`${(polish.glitter.luma_contrast).toFixed(1)} pop`} />
                            )}
                        </View>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <Pressable style={styles.actionBtn} onPress={copyHex}>
                        <Text style={styles.actionTxt}>📋 Copy HEX</Text>
                    </Pressable>
                    {!!polish?.product_link && (
                        <Pressable style={styles.actionPrimary} onPress={openProduct}>
                            <LinearGradient
                                colors={['#667eea', '#764ba2']}
                                style={styles.actionGradient}
                            >
                                <Text style={styles.actionTxtPrimary}>🛒 Buy Now</Text>
                            </LinearGradient>
                        </Pressable>
                    )}
                </View>
            </View>
        </Modal>
    );
}

function Chip({ label }) {
    return (
        <View style={styles.chip}>
            <Text style={styles.chipTxt}>{label}</Text>
        </View>
    );
}

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
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    card: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        paddingBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1e293b',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 6,
    },
    brand: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '600',
    },
    badge: {
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    badgeTxt: {
        fontSize: 11,
        fontWeight: '700',
        color: '#111827',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    saveBtn: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    saveBtnOn: {
        backgroundColor: '#e53e3e',
        borderColor: '#e53e3e',
    },
    saveTxt: {
        fontSize: 20,
        color: '#cbd5e0',
    },
    saveTxtOn: {
        color: '#ffffff',
    },

    carouselContainer: {
        position: 'relative',
    },
    carouselSlide: {
        width: SCREEN_W,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    imageContainer: {
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        padding: 20,
        margin: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    hero: {
        width: SCREEN_W * 0.7,
        height: SCREEN_W * 0.5,
    },
    swatchSlide: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    heroSwatch: {
        width: SCREEN_W * 0.6,
        height: SCREEN_W * 0.6,
        borderRadius: 30,
        borderWidth: 4,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 15,
    },
    dots: {
        flexDirection: 'row',
        alignSelf: 'center',
        gap: 8,
        marginBottom: 10,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#cbd5e0',
    },
    dotOn: {
        backgroundColor: '#667eea',
        transform: [{ scale: 1.2 }],
    },

    specs: {
        flexDirection: 'row',
        gap: 20,
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    specColumn: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    rowA: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
    },
    rowB: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    swatch: {
        width: 28,
        height: 28,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    specLabel: {
        fontWeight: '800',
        fontSize: 14,
        color: '#374151',
    },
    hexTxt: {
        fontWeight: '700',
        fontFamily: 'monospace',
        fontSize: 16,
        color: '#1e293b',
    },
    labTxt: {
        color: '#64748b',
        fontSize: 12,
        marginTop: 6,
        fontFamily: 'monospace',
    },

    actions: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 16,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderRadius: 16,
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
    actionTxt: {
        fontWeight: '700',
        fontSize: 16,
        color: '#475569',
    },
    actionPrimary: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
    },
    actionGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionTxtPrimary: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 16,
    },

    chip: {
        backgroundColor: '#e0f2fe',
        borderColor: '#0ea5e9',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    chipTxt: {
        fontSize: 11,
        color: '#0369a1',
        fontWeight: '600',
    },
});
