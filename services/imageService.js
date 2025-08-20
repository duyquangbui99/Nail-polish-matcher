// services/imageService.js
import * as ImagePicker from 'expo-image-picker';

export async function pickImageFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error('Permission to access camera roll is required!');

    // Try the new enum first; gracefully fall back if running older SDKs.
    const mediaType =
        ImagePicker?.MediaType?.image ??
        ImagePicker?.MediaType?.Images ??
        ImagePicker?.MediaType?.Image ??
        ImagePicker?.MediaTypeOptions?.Images; // legacy fallback

    const result = await ImagePicker.launchImageLibraryAsync({
        // You can also just delete `mediaTypes:` entirely to use the default (images).
        ...(mediaType ? { mediaTypes: mediaType } : {}),
        allowsEditing: true,
        quality: 1,
        selectionLimit: 1, // ignored on some platforms but harmless
    });

    if (!result.canceled) return result.assets?.[0]?.uri || null;
    return null;
}

export async function handleTakePhoto() {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
        throw new Error('Permission to access camera is required!');
    }

    const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
        return result.assets[0].uri;
    }

    return null;
}
