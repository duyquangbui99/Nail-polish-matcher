// HomeScreen.js
import React, { useState } from 'react';
import {
    SafeAreaView,
    Text,
    StyleSheet,
    FlatList,
    View,
    Image,
    Pressable,
    ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ImagePickerComponent from '../components/ImagePickerComponent';
import { matchTopN } from '../services/matchingService';
import db from '../assets/db/dnd-401-500.json';

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
            <LinearGradient
                colors={['#f8fafc', '#f1f5f9']}
                style={styles.gradient}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header Section */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Nail Polish Finder</Text>
                        <Text style={styles.subtitle}>Discover your perfect nail color</Text>
                    </View>

                    {/* Image Picker Section */}
                    <ImagePickerComponent
                        onImagePicked={handleImagePicked}
                        onTapFeatures={handleTapFeatures}
                    />

                    {/* Results Section */}
                    {!!results.length && (
                        <View style={styles.resultsContainer}>
                            <Text style={styles.resultsTitle}>Top matches</Text>
                            <FlatList
                                data={results}
                                keyExtractor={(row, idx) => (row.item?.id ?? `${row.item?.name || 'shade'}-${idx}`)}
                                renderItem={({ item }) => <MatchRow row={item} />}
                                style={styles.resultsList}
                                ItemSeparatorComponent={() => <View style={styles.separator} />}
                                scrollEnabled={false}
                            />
                        </View>
                    )}
                </ScrollView>
            </LinearGradient>
        </SafeAreaView>
    );
}

function MatchRow({ row }) {
    const p = row.item || {};
    const score = row.score ?? 0;

    const hex = (p.hex || p.base_hex || '#cccccc').toLowerCase();
    const finish = (p.finish || 'cream').toLowerCase();

    const img =
        p.images?.thumbnail ||
        p.images?.swatch ||
        p.images?.bottle ||
        null;

    const [saved, setSaved] = useState(Boolean(p.saved));

    return (
        <View style={styles.row}>
            <View style={styles.thumbWrap}>
                {img ? (
                    <Image source={{ uri: img }} style={styles.thumb} resizeMode="cover" />
                ) : (
                    <View style={[styles.thumb, { backgroundColor: '#eee' }]} />
                )}
            </View>

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

                {!!p.product_link && (
                    <Text numberOfLines={1} style={styles.linkText}>
                        {p.product_link.replace(/^https?:\/\//, '')}
                    </Text>
                )}
            </View>

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

function badgeByFinish(finish) {
    switch (finish) {
        case 'glitter': return { backgroundColor: '#fef3c7', borderColor: '#f59e0b' };
        case 'shimmer': return { backgroundColor: '#e0f2fe', borderColor: '#38bdf8' };
        case 'jelly': return { backgroundColor: '#fee2e2', borderColor: '#ef4444' };
        case 'cream':
        default: return { backgroundColor: '#e5e7eb', borderColor: '#9ca3af' };
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
    },
    header: {
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 20,
    },
    title: {
        fontSize: 36,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
        background: 'linear-gradient(135deg, #e91e63, #9c27b0)',
        color: '#e91e63',
    },
    subtitle: {
        fontSize: 18,
        color: '#64748b',
        textAlign: 'center',
        fontWeight: '400',
    },
    resultsContainer: {
        marginTop: 30,
        paddingBottom: 40,
    },
    resultsTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16,
        color: '#1e293b',
    },
    resultsList: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#e2e8f0',
        marginVertical: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        gap: 12,
    },
    thumbWrap: {
        width: 56,
        height: 56,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    thumb: {
        width: '100%',
        height: '100%',
    },
    name: {
        fontWeight: '600',
        fontSize: 14,
        maxWidth: 180,
        color: '#1e293b',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 2,
        flexWrap: 'wrap',
    },
    brandText: {
        color: '#64748b',
        fontSize: 12,
    },
    finishBadge: {
        borderWidth: 1,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    finishText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#111827',
    },
    scoreText: {
        marginLeft: 'auto',
        fontSize: 12,
        color: '#64748b',
    },
    linkText: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
    },
    rightCol: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginLeft: 8,
    },
    swatch: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    saveBtn: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#ffffff',
    },
    saveBtnOn: {
        borderColor: '#1e293b',
        backgroundColor: '#1e293b',
    },
    saveTxt: {
        fontSize: 12,
        color: '#1e293b',
        fontWeight: '500',
    },
    saveTxtOn: {
        color: '#ffffff',
    },
});
