import React from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import ImagePickerComponent from '../components/ImagePickerComponent';

export default function HomeScreen() {
    const handleImagePicked = (uri) => {
        console.log("Picked image URI:", uri);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Nail Color Finder</Text>
            <ImagePickerComponent onImagePicked={handleImagePicked} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff'
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20
    }
});
