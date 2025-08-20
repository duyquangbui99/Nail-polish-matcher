// ImagePickerComponent.js
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    Pressable,
    Image,
    Platform,
    Dimensions
} from 'react-native';
import { pickImageFromLibrary, handleTakePhoto } from '../services/imageService';
import { extractTapFeatures } from '../services/colorFeatureService';

const { width: screenWidth } = Dimensions.get('window');

export default function ImagePickerComponent({ onImagePicked, onTapFeatures }) {
    const [image, setImage] = useState(null);
    const [picked, setPicked] = useState(null);
    const [box, setBox] = useState({ w: 300, h: 300 });
    const [natural, setNatural] = useState({ w: 0, h: 0 });
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePickImage = async () => {
        try {
            setIsProcessing(true);
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
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTakePhotoWrapper = async () => {
        try {
            setIsProcessing(true);
            const uri = await handleTakePhoto();
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
        } finally {
            setIsProcessing(false);
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
            setIsProcessing(true);
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
        } finally {
            setIsProcessing(false);
        }
    };

    // Sparkle Icon Component
    const SparkleIcon = () => (
        <View style={styles.sparkleIcon}>
            <View style={styles.sparkleOuter}>
                <View style={styles.sparkleInner} />
                <View style={styles.sparkleCenter} />
            </View>
        </View>
    );

    if (image) {
        return (
            <View style={styles.imageContainer}>
                <View style={styles.imageWrapper}>
                    <View style={styles.imageBox} onLayout={handleLayout}>
                        <Pressable
                            onPress={(e) => handleImageTouch(e.nativeEvent)}
                            style={styles.imagePress}
                            disabled={isProcessing}
                        >
                            <Image
                                source={{ uri: image }}
                                style={styles.image}
                                resizeMode="contain"
                            />
                            {isProcessing && (
                                <View style={styles.processingOverlay}>
                                    <Text style={styles.processingText}>Processing...</Text>
                                </View>
                            )}
                        </Pressable>
                    </View>
                    <Text style={styles.tapInstruction}>
                        Tap on the image to find matching nail polish colors
                    </Text>
                </View>

                {picked && (
                    <View style={styles.colorResult}>
                        <View style={styles.colorSwatch}>
                            <View
                                style={[
                                    styles.swatchColor,
                                    { backgroundColor: picked.hex }
                                ]}
                            />
                        </View>
                        <View style={styles.colorInfo}>
                            <Text style={styles.hexText}>{picked.hex}</Text>
                            <Text style={styles.finishText}>
                                {picked.features.finish} • {(picked.features.sparkle.density * 100).toFixed(1)}% sparkle
                            </Text>
                        </View>
                    </View>
                )}

                <Pressable style={styles.newPhotoButton} onPress={() => setImage(null)}>
                    <Text style={styles.newPhotoText}>Choose Different Photo</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.uploadContainer}>
                <SparkleIcon />

                <Text style={styles.mainTitle}>Find Your Perfect Match</Text>
                <Text style={styles.description}>
                    Upload a photo of your nails or any color{'\n'}inspiration
                </Text>

                <View style={styles.buttonContainer}>
                    <Pressable
                        style={[styles.button, styles.primaryButton]}
                        onPress={handlePickImage}
                        disabled={isProcessing}
                    >
                        <View style={styles.buttonContent}>
                            <Text style={styles.uploadIcon}>⬆</Text>
                            <Text style={styles.primaryButtonText}>
                                {isProcessing ? 'Loading...' : 'Choose Photo'}
                            </Text>
                        </View>
                    </Pressable>

                    <Pressable
                        style={[styles.button, styles.secondaryButton]}
                        onPress={handleTakePhotoWrapper}
                        disabled={isProcessing}
                    >
                        <View style={styles.buttonContent}>
                            <Text style={styles.cameraIcon}>📷</Text>
                            <Text style={styles.secondaryButtonText}>Use Camera</Text>
                        </View>
                    </Pressable>
                </View>

                <Text style={styles.supportText}>
                    Supports JPG, PNG, HEIC formats
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    uploadContainer: {
        borderWidth: 2,
        borderColor: '#ec4899',
        borderStyle: 'dashed',
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        paddingVertical: 40,
        paddingHorizontal: 24,
        alignItems: 'center',
        width: screenWidth - 40,
        maxWidth: 400,
    },
    sparkleIcon: {
        marginBottom: 24,
    },
    sparkleOuter: {
        width: 48,
        height: 48,
        backgroundColor: '#ec4899',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    sparkleInner: {
        width: 24,
        height: 24,
        backgroundColor: '#ffffff',
        borderRadius: 6,
        position: 'absolute',
    },
    sparkleCenter: {
        width: 12,
        height: 12,
        backgroundColor: '#ec4899',
        borderRadius: 3,
        position: 'absolute',
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
        marginBottom: 20,
    },
    button: {
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        width: '100%',
    },
    primaryButton: {
        backgroundColor: '#ec4899',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#ec4899',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    uploadIcon: {
        fontSize: 18,
        color: '#ffffff',
    },
    cameraIcon: {
        fontSize: 18,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ec4899',
    },
    supportText: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
    },
    // Image display styles
    imageContainer: {
        width: '100%',
        alignItems: 'center',
    },
    imageWrapper: {
        alignItems: 'center',
        marginBottom: 20,
    },
    imageBox: {
        width: screenWidth - 40,
        height: 300,
        maxWidth: 400,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    imagePress: {
        flex: 1,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    processingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    processingText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    tapInstruction: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
    },
    colorResult: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        gap: 12,
    },
    colorSwatch: {
        width: 48,
        height: 48,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    swatchColor: {
        width: '100%',
        height: '100%',
    },
    colorInfo: {
        flex: 1,
    },
    hexText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 4,
    },
    finishText: {
        fontSize: 14,
        color: '#64748b',
    },
    newPhotoButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    newPhotoText: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
});
