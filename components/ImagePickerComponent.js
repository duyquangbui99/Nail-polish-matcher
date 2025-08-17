// ImagePickerComponent.js
import React, { useState } from 'react';
import { View, Button, Image, StyleSheet, Alert, Text, Pressable } from 'react-native';
import { pickImageFromLibrary } from '../services/imageService';
import { extractTapFeatures } from '../services/colorFeatureService'; // expo-friendly (no canvas)

export default function ImagePickerComponent({ onImagePicked, onTapFeatures }) {
    const [image, setImage] = useState(null);
    const [picked, setPicked] = useState(null); // { hex, lab, previewUri, features:{finish, sparkle:{...}} }
    const [box, setBox] = useState({ w: 300, h: 300 });
    const [natural, setNatural] = useState({ w: 0, h: 0 });

    const handlePickImage = async () => {
        try {
            const uri = await pickImageFromLibrary();
            if (uri) {
                setImage(uri);
                Image.getSize(
                    uri,
                    (w, h) => setNatural({ w, h }),
                    () => setNatural({ w: 0, h: 0 })
                );
                onImagePicked && onImagePicked(uri);
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const handleLayout = (e) => {
        const { width, height } = e.nativeEvent.layout;
        setBox({ w: Math.round(width), h: Math.round(height) });
    };

    const handleImageTouch = async (nativeEvent) => {
        if (!image || !natural.w || !natural.h) {
            console.log('Tap ignored: image or natural size missing');
            return;
        }
        const { locationX, locationY } = nativeEvent;
        try {
            const out = await extractTapFeatures({
                uri: image,
                tapX: locationX,
                tapY: locationY,
                boxW: box.w,
                boxH: box.h,
                imgW: natural.w,
                imgH: natural.h,
                patchRadiusPx: 24,
            });
            setPicked(out);
            onTapFeatures && onTapFeatures(out);
        } catch (err) {
            console.error('Error extracting color:', err);
            Alert.alert('Extract error', String(err.message || err));
        }
    };

    return (
        <View style={styles.container}>
            <Button title="Upload a Photo" onPress={handlePickImage} />
            {image && (
                <>
                    <View style={styles.imageBox} onLayout={handleLayout}>
                        <Pressable onPress={(e) => handleImageTouch(e.nativeEvent)} style={{ flex: 1 }}>
                            <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />
                        </Pressable>
                    </View>

                    {picked && (
                        <View style={{ alignItems: 'center', marginTop: 10 }}>
                            {/* swatch */}
                            <View
                                style={{
                                    width: 50,
                                    height: 50,
                                    borderRadius: 4,
                                    borderWidth: 1,
                                    borderColor: '#000',
                                    backgroundColor: picked.hex,
                                }}
                            />
                            <Text style={{ marginTop: 6, fontWeight: '600' }}>{picked.hex}</Text>
                            <Text style={{ marginTop: 2, fontSize: 12, color: '#666' }}>
                                finish: {picked.features.finish} · sparkle:{' '}
                                {(picked.features.sparkle.density * 100).toFixed(1)}% · {picked.features.sparkle.size_mode}
                            </Text>
                        </View>
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 10, alignItems: 'center' },
    imageBox: {
        width: 300,
        height: 300,
        marginTop: 10,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f6f6f6',
    },
    image: { width: '100%', height: '100%' },
});
