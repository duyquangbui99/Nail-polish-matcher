// HomeScreen.js
import React from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import ImagePickerComponent from '../components/ImagePickerComponent';

export default function HomeScreen() {
    const handleImagePicked = (uri) => {
        console.log('Picked image URI:', uri);
    };

    const handleTapFeatures = (feat) => {
        console.log('Extracted features:', feat);
        // TODO: plug in matcher here (ΔE2000 + sparkle terms) against your JSON DB
        // e.g., const results = matchTopN(feat, polishDb, 10); setResults(results);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Nail Color Finder</Text>
            <ImagePickerComponent
                onImagePicked={handleImagePicked}
                onTapFeatures={handleTapFeatures}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff'
    },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
});
